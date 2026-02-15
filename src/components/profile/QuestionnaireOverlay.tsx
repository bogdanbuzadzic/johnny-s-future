import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Check, Sparkles, Lock,
  Home, Zap, Landmark, Car, Bus, Tv, Shield, ShoppingCart, Baby, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getModuleQuestions, calculateClarityScore, BADGES, QUEST_NODES, getPersona } from '@/lib/profileData';
import { getCelebration } from '@/lib/personaMessaging';
import type { ProfileQ } from '@/lib/profileData';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';

const EXPENSE_ICONS: Record<string, LucideIcon> = {
  Home, Zap, Landmark, Car, Bus, Tv, Shield, ShoppingCart, Baby, MoreHorizontal,
};

// Correct answers for quiz calibration
const QUIZ_CORRECT: Record<string, string> = {
  q5a: 'More than €102',
  q5b: 'Less than today',
  q5c: 'False',
};

interface Props {
  moduleKey: string;
  onComplete: () => void;
  onClose: () => void;
}

export function QuestionnaireOverlay({ moduleKey, onComplete, onClose }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [expenseFreq, setExpenseFreq] = useState<Record<string, string>>({});
  const { updateConfig, addCategory, addTransaction } = useBudget();
  const { addGoal, setActiveTab } = useApp();

  const allQuestions = useMemo(() => getModuleQuestions(moduleKey), [moduleKey]);
  const visibleQuestions = useMemo(
    () => allQuestions.filter(q => !q.showIf || q.showIf(answers)),
    [allQuestions, answers]
  );

  const safeIdx = Math.min(currentIdx, visibleQuestions.length - 1);
  const currentQ = visibleQuestions[safeIdx];
  const isLast = safeIdx === visibleQuestions.length - 1;
  const progress = visibleQuestions.length > 0 ? ((safeIdx + 1) / visibleQuestions.length) * 100 : 0;
  const value = currentQ ? answers[currentQ.id] : undefined;

  const canProceed = (() => {
    if (!currentQ) return false;
    if (currentQ.type === 'expenses' || currentQ.type === 'compound') return true;
    if (currentQ.type === 'statements') {
      const v = value as Record<number, number> | undefined;
      return v && Object.keys(v).length === (currentQ.statements?.length || 0);
    }
    if (currentQ.type === 'multi') return Array.isArray(value) && value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  })();

  const setAnswer = useCallback((id: string, v: any) => {
    setAnswers(prev => ({ ...prev, [id]: v }));
  }, []);

  const handleNext = () => {
    // After Q5d (calibration estimate), show calibration result card
    if (moduleKey === 'module0' && currentQ?.id === 'q5d' && !showCalibration) {
      setShowCalibration(true);
      return;
    }
    if (showCalibration) {
      setShowCalibration(false);
    }

    if (isLast) {
      handleComplete();
    } else {
      setDirection(1);
      setCurrentIdx(safeIdx + 1);
    }
  };

  const handleBack = () => {
    if (showCalibration) {
      setShowCalibration(false);
      return;
    }
    setDirection(-1);
    setCurrentIdx(Math.max(0, safeIdx - 1));
  };

  const handleComplete = useCallback(() => {
    const node = QUEST_NODES.find(n => n.key === moduleKey);
    if (!node) return;

    // For module0: compute calibration and store with answers
    const finalAnswers = { ...answers };

    if (moduleKey === 'module0') {
      const actualCorrect = ['q5a', 'q5b', 'q5c'].filter(k => finalAnswers[k] === QUIZ_CORRECT[k]).length;
      const estimatedCorrect = Number(finalAnswers.q5d) || 0;
      finalAnswers.q5_actual = actualCorrect;
      finalAnswers.q5_estimated = estimatedCorrect;
      finalAnswers.q5_calibration = estimatedCorrect - actualCorrect;
    }

    // For clarity: store frequency data
    if (moduleKey === 'clarity') {
      finalAnswers.step5_freq = expenseFreq;
    }

    if (node.lsAnswers) localStorage.setItem(node.lsAnswers, JSON.stringify(finalAnswers));
    if (node.lsDone) localStorage.setItem(node.lsDone, 'true');

    const earnedBadges: string[] = JSON.parse(localStorage.getItem('jfb_badges') || '[]');
    if (node.badgeKey && !earnedBadges.includes(node.badgeKey)) {
      earnedBadges.push(node.badgeKey);
      localStorage.setItem('jfb_badges', JSON.stringify(earnedBadges));
    }

    if (moduleKey === 'clarity') {
      const score = calculateClarityScore(finalAnswers);
      localStorage.setItem('jfb_clarityScore', JSON.stringify(score));

      const income = Number(finalAnswers.step4) || 0;
      const savings = Number(finalAnswers.step7) || 0;
      updateConfig({ monthlyIncome: income, monthlySavingsTarget: savings, setupComplete: true });

      const exp = finalAnswers.step5 || {};
      const freq = finalAnswers.step5_freq || {};

      // Get monthly value for each expense (apply 4.33x for weekly)
      const getMonthly = (key: string) => {
        const v = Number(exp[key]) || 0;
        return freq[key] === 'weekly' ? Math.round(v * 4.33) : v;
      };

      const fixedMap = [
        { key: 'rent', name: 'Rent', icon: 'Home' }, { key: 'utilities', name: 'Utilities', icon: 'Zap' },
        { key: 'tax', name: 'Tax', icon: 'Landmark' }, { key: 'car', name: 'Car', icon: 'Car' },
        { key: 'transport', name: 'Transport', icon: 'Bus' }, { key: 'subs', name: 'Subscriptions', icon: 'Tv' },
        { key: 'insurance', name: 'Insurance', icon: 'Shield' },
        { key: 'childcare', name: 'Childcare', icon: 'Baby' },
        { key: 'other', name: 'Other Fixed', icon: 'MoreHorizontal' },
      ];
      let totalFixed = 0;
      const createdCategories: { key: string; id?: string }[] = [];
      fixedMap.forEach(item => {
        const amt = getMonthly(item.key);
        if (amt > 0) {
          addCategory({ name: item.name, icon: item.icon, monthlyBudget: amt, type: 'fixed' });
          totalFixed += amt;
          createdCategories.push({ key: item.key });
        }
      });

      const flex = Math.max(0, income - totalFixed - savings);
      const groceries = getMonthly('groceries');
      const foodBudget = groceries > 0 ? groceries : Math.round(flex * 0.35);
      const remainingFlex = flex - foodBudget;

      addCategory({ name: 'Food', icon: 'UtensilsCrossed', monthlyBudget: foodBudget, type: 'expense' });
      addCategory({ name: 'Entertainment', icon: 'Film', monthlyBudget: Math.round(remainingFlex * 0.20), type: 'expense' });
      addCategory({ name: 'Shopping', icon: 'ShoppingBag', monthlyBudget: Math.round(remainingFlex * 0.25), type: 'expense' });
      addCategory({ name: 'Personal', icon: 'Heart', monthlyBudget: Math.round(remainingFlex * 0.25), type: 'expense' });
      addCategory({ name: 'Other', icon: 'MoreHorizontal', monthlyBudget: Math.round(remainingFlex * 0.30), type: 'expense' });

      // Create goals from Step 3 selections
      const goalMap: Record<string, { name: string; icon: string; target: number; mc: number }> = {
        'Grow my money': { name: 'Investment Fund', icon: 'TrendingUp', target: 5000, mc: 100 },
        'Save for a specific purchase': { name: 'Savings Goal', icon: 'Target', target: 2000, mc: 100 },
        'Start investing': { name: 'Start Investing', icon: 'LineChart', target: 1000, mc: 50 },
        'Save for retirement': { name: 'Retirement', icon: 'Sunset', target: 50000, mc: 200 },
      };
      (finalAnswers.step3 || []).forEach((g: string) => {
        const d = goalMap[g];
        if (d) addGoal({ name: d.name, icon: d.icon, target: d.target, saved: 0, monthlyContribution: d.mc, targetDate: '', monthIndex: -1 });
      });

      // Store debt data
      if (finalAnswers.step6a === 'Yes') {
        localStorage.setItem('jfb_debt', JSON.stringify({
          creditCard: { balance: Number(finalAnswers.step6b?.cc_balance) || 0, payment: Number(finalAnswers.step6b?.cc_payment) || 0 },
          loans: { balance: Number(finalAnswers.step6c?.pl_balance) || 0, payment: Number(finalAnswers.step6c?.pl_payment) || 0 },
          other: { balance: Number(finalAnswers.step6d?.od_balance) || 0, payment: Number(finalAnswers.step6d?.od_payment) || 0 },
        }));
      }

      // Store cash reserves
      localStorage.setItem('jfb_cash', JSON.stringify({
        bankAccounts: Number(finalAnswers.step8?.bank) || 0,
        savingsAccounts: Number(finalAnswers.step8?.savings) || 0,
      }));
    }

    // Module0: persona assignment
    if (moduleKey === 'module0') {
      const persona = getPersona(finalAnswers);
      if (persona) {
        localStorage.setItem('jfb_persona', persona.n);
      }
    }

    setShowCompletion(true);
  }, [answers, moduleKey, updateConfig, addCategory, addGoal, addTransaction, expenseFreq]);

  const handleContinue = () => {
    if (moduleKey === 'clarity') setActiveTab(1);
    onComplete();
  };

  const node = QUEST_NODES.find(n => n.key === moduleKey)!;
  const NodeIcon = node.Icon;
  const badge = BADGES.find(b => b.key === node.badgeKey);

  // ── Calibration result (after Q5d) ──
  if (showCalibration) {
    const actualCorrect = ['q5a', 'q5b', 'q5c'].filter(k => answers[k] === QUIZ_CORRECT[k]).length;
    const estimated = Number(answers.q5d) || 0;
    const diff = estimated - actualCorrect;
    let message: string, messageColor: string;
    if (diff > 0) { message = "Slightly overconfident — that's normal and fixable!"; messageColor = 'rgba(245,158,11,0.5)'; }
    else if (diff < 0) { message = 'You know more than you think!'; messageColor = 'rgba(34,197,94,0.5)'; }
    else { message = 'Well calibrated! You know what you know.'; messageColor = 'rgba(34,197,94,0.5)'; }

    return (
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
        style={{ background: 'linear-gradient(to bottom, #B4A6B8, #9B80B4)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
          className="w-full max-w-sm rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
          <p className="text-base font-bold text-white text-center">
            You got {actualCorrect} out of 3 correct
          </p>
          <p className="text-[13px] text-white/40 text-center">You estimated {estimated}</p>
          <p className="text-[13px] text-center" style={{ color: messageColor }}>{message}</p>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          onClick={handleNext}
          className="mt-6 px-8 h-10 rounded-full text-sm font-semibold text-white flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          Continue <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  }

  // ── Completion Screen ──
  if (showCompletion) {
    const particles = Array.from({ length: 25 }, (_, i) => ({
      x: 10 + Math.random() * 80, y: 10 + Math.random() * 80,
      color: ['#8B5CF6', '#FF6B9D', '#FFD700'][i % 3],
      delay: Math.random() * 0.5, size: 3 + Math.random() * 3,
    }));
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
        style={{ background: 'linear-gradient(to bottom, #B4A6B8, #9B80B4)' }}>
        {particles.map((p, i) => (
          <motion.div key={i} className="absolute rounded-full" style={{ width: p.size, height: p.size, background: p.color, left: `${p.x}%` }}
            initial={{ opacity: 0, y: '80%' }}
            animate={{ opacity: [0, 1, 1, 0], y: [`${p.y + 20}%`, `${p.y}%`, `${p.y - 15}%`] }}
            transition={{ duration: 1.5, delay: p.delay }} />
        ))}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
          className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6"
          style={{ boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}>
          <NodeIcon className="w-12 h-12 text-white" strokeWidth={1.5} />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-white mb-2">{(() => {
            const m0 = (() => { try { return JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null'); } catch { return null; } })();
            const p = getPersona(m0);
            return getCelebration(node.name, p?.n || null);
          })()}</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-sm text-white/40 mb-8">{node.name}</motion.p>
        {badge && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
            className="flex flex-col items-center gap-2 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{ background: badge.tint + '25' }}>
              <badge.Icon className="w-7 h-7" style={{ color: badge.tint }} strokeWidth={1.5} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)', animation: 'shimmer 3s infinite' }} />
            </div>
            <span className="text-sm font-bold text-white">{badge.name}</span>
            <span className="text-xs text-white/30">{badge.desc}</span>
          </motion.div>
        )}
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          onClick={handleContinue}
          className="w-full max-w-xs h-11 rounded-[14px] gradient-primary text-white font-semibold text-[15px] flex items-center justify-center gap-2"
          style={{ boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
          Continue <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  }

  // ── Question Screen ──
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'linear-gradient(to bottom, #B4A6B8, #9B80B4)' }}>

      {/* Header bar */}
      <div className="h-[52px] flex items-center px-4 shrink-0"
        style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <NodeIcon className="w-5 h-5 text-white/50 shrink-0" strokeWidth={1.5} />
          <span className="text-base font-bold text-white truncate">{node.name}</span>
        </div>
        <div className="flex-1 flex justify-center px-4">
          <div className="w-[200px] h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
            <motion.div className="h-full rounded-full gradient-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 shrink-0"><X className="w-5 h-5 text-white/40" /></button>
      </div>

      {/* Question counter */}
      <div className="text-center pt-4 pb-4">
        <span className="text-[11px] text-white/30 uppercase tracking-[2px] font-medium">
          Question {safeIdx + 1} of {visibleQuestions.length}
        </span>
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-auto px-5 pb-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQ?.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-8"
          >
            <p className="text-[22px] font-bold text-white text-center leading-[1.4] max-w-[500px] mx-auto whitespace-pre-line">
              {currentQ?.text}
            </p>
            {currentQ && <QuestionInput q={currentQ} value={value} onChange={(v) => setAnswer(currentQ.id, v)} expenseFreq={expenseFreq} onFreqChange={setExpenseFreq} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-4 pt-2 space-y-3 shrink-0">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-11 rounded-[14px] text-[15px] text-white font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: canProceed ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.06)',
            color: canProceed ? 'white' : 'rgba(255,255,255,0.2)',
            boxShadow: canProceed ? '0 4px 16px rgba(139,92,246,0.3)' : 'none',
            cursor: canProceed ? 'pointer' : 'default',
          }}>
          {isLast ? <><span>Complete</span> <Sparkles className="w-4 h-4" /></> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
        {safeIdx > 0 && (
          <button onClick={handleBack} className="w-full text-center text-[13px] text-white/25">Back</button>
        )}
      </div>
    </motion.div>
  );
}

// ── Question Input Renderer ──
function QuestionInput({ q, value, onChange, expenseFreq, onFreqChange }: { q: ProfileQ; value: any; onChange: (v: any) => void; expenseFreq: Record<string, string>; onFreqChange: (f: Record<string, string>) => void }) {
  switch (q.type) {
    case 'text':
      return (
        <div className="max-w-[300px] mx-auto">
          <div className="flex items-center h-[52px] rounded-[14px] px-5"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)' }}>
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
              placeholder="Type here..." autoFocus
              className="flex-1 bg-transparent text-white text-lg font-semibold outline-none placeholder:text-white/25" />
          </div>
        </div>
      );

    case 'number':
      return (
        <div className="max-w-[300px] mx-auto">
          <div className="flex items-center h-[52px] rounded-[14px] px-5 transition-all focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)' }}>
            {q.prefix && <span className="text-white/30 text-lg mr-2">{q.prefix}</span>}
            <input type="text" inputMode="decimal" value={value || ''} onChange={e => onChange(e.target.value)}
              placeholder="0" autoFocus
              className="flex-1 bg-transparent text-white text-xl font-semibold outline-none placeholder:text-white/25" />
          </div>
        </div>
      );

    case 'slider': {
      const min = q.min ?? 1, max = q.max ?? 10, step = q.step ?? 1;
      const v = value ?? min;
      const pct = ((v - min) / (max - min)) * 100;
      return (
        <div className="max-w-[400px] mx-auto pt-6">
          <div className="relative mb-3 h-6">
            <div className="absolute text-xl font-bold text-white -translate-x-1/2"
              style={{ left: `${pct}%`, transition: 'left 100ms ease' }}>
              {v}
            </div>
          </div>
          <div className="relative px-1">
            <input type="range" min={min} max={max} step={step} value={v}
              onChange={e => onChange(Number(e.target.value))}
              className="questionnaire-slider w-full"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #EC4899 ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
              }} />
          </div>
          <div className="flex justify-between text-xs text-white/25 uppercase tracking-[1px] mt-3 px-1">
            <span>{q.minLabel}</span><span>{q.maxLabel}</span>
          </div>
        </div>
      );
    }

    case 'single':
      return (
        <div className="space-y-2 max-w-[460px] mx-auto">
          {(q.options || []).map((opt, i) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const selected = value === label;
            return (
              <button key={i} onClick={() => onChange(label)}
                className="w-full h-11 rounded-xl px-4 flex items-center text-left text-[14px] transition-all"
                style={{
                  background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${selected ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  color: selected ? 'white' : 'rgba(255,255,255,0.6)',
                }}>
                <span className="flex-1">{label}</span>
                {selected && <Check className="w-[18px] h-[18px]" style={{ color: '#8B5CF6' }} />}
              </button>
            );
          })}
        </div>
      );

    case 'multi': {
      const selected: string[] = value || [];
      return (
        <div className="space-y-2 max-w-[460px] mx-auto">
          {(q.options || []).map((opt, i) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const isSelected = selected.includes(label);
            return (
              <button key={i} onClick={() => onChange(isSelected ? selected.filter(x => x !== label) : [...selected, label])}
                className="w-full h-11 rounded-xl px-4 flex items-center text-left text-[14px] transition-all"
                style={{
                  background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${isSelected ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                }}>
                <div className="w-5 h-5 rounded-md mr-3 flex items-center justify-center shrink-0"
                  style={{
                    background: isSelected ? '#8B5CF6' : 'transparent',
                    border: `1.5px solid ${isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.15)'}`,
                  }}>
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className="flex-1">{label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'quiz': {
      // No answer reveal — just normal selected styling like single select
      return (
        <div className="space-y-2 max-w-[460px] mx-auto">
          {(q.options || []).map((opt, i) => {
            const o = typeof opt === 'string' ? { label: opt } : opt;
            const selected = value === o.label;
            return (
              <button key={i} onClick={() => onChange(o.label)}
                className="w-full h-11 rounded-xl px-4 flex items-center text-left text-[14px] transition-all"
                style={{
                  background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${selected ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  color: selected ? 'white' : 'rgba(255,255,255,0.6)',
                }}>
                <span className="flex-1">{o.label}</span>
                {selected && <Check className="w-[18px] h-[18px]" style={{ color: '#8B5CF6' }} />}
              </button>
            );
          })}
        </div>
      );
    }

    case 'scale5':
      return (
        <div className="flex gap-3 justify-center pt-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => onChange(n)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                background: value === n ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${value === n ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: value === n ? 'white' : 'rgba(255,255,255,0.5)',
                transform: value === n ? 'scale(1.1)' : 'scale(1)',
              }}>
              {n}
            </button>
          ))}
        </div>
      );

    case 'statements': {
      const vals: Record<number, number> = value || {};
      return (
        <div className="space-y-5 max-w-[460px] mx-auto">
          {(q.statements || []).map((stmt, si) => (
            <div key={si} className="space-y-2">
              <p className="text-sm text-white/60 italic">"{stmt}"</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => onChange({ ...vals, [si]: n })}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: vals[si] === n ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${vals[si] === n ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      color: vals[si] === n ? 'white' : 'rgba(255,255,255,0.4)',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-white/20 px-1">
                <span>Disagree</span><span>Agree</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'expenses': {
      const vals: Record<string, string> = value || {};
      // Calculate total with frequency adjustments
      const total = Object.entries(vals).reduce((s, [key, v]) => {
        let amt = Number(v) || 0;
        if (expenseFreq[key] === 'weekly') amt *= 4.33;
        return s + amt;
      }, 0);
      return (
        <div className="max-w-[460px] mx-auto rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="max-h-[320px] overflow-auto">
            {(q.fields || []).map((f, fi) => {
              const IconComp = f.icon ? EXPENSE_ICONS[f.icon] : MoreHorizontal;
              const isWeekly = expenseFreq[f.key] === 'weekly';
              return (
                <div key={f.key} className="flex items-center h-12 px-3"
                  style={{ borderBottom: fi < (q.fields?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center mr-2"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {IconComp && <IconComp className="w-4 h-4 text-white/40" strokeWidth={1.5} />}
                  </div>
                  <span className="text-[13px] text-white/60 flex-1 truncate">{f.label}</span>
                  {/* Frequency toggle */}
                  <div className="flex mr-2 rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={() => onFreqChange({ ...expenseFreq, [f.key]: 'monthly' })}
                      className="px-1.5 py-0.5 text-[10px]"
                      style={{ background: !isWeekly ? 'rgba(139,92,246,0.2)' : 'transparent', color: !isWeekly ? 'white' : 'rgba(255,255,255,0.3)' }}>
                      mo
                    </button>
                    <button onClick={() => onFreqChange({ ...expenseFreq, [f.key]: 'weekly' })}
                      className="px-1.5 py-0.5 text-[10px]"
                      style={{ background: isWeekly ? 'rgba(139,92,246,0.2)' : 'transparent', color: isWeekly ? 'white' : 'rgba(255,255,255,0.3)' }}>
                      wk
                    </button>
                  </div>
                  <input type="text" inputMode="decimal" value={vals[f.key] || ''} placeholder="0"
                    onChange={e => onChange({ ...vals, [f.key]: e.target.value })}
                    className="w-[80px] h-9 rounded-[10px] text-white text-sm font-medium text-right px-3 outline-none placeholder:text-white/15 transition-all focus:border-[rgba(139,92,246,0.4)]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)' }} />
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 text-right text-sm font-bold text-white/50"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            Total: €{Math.round(total)}/mo
          </div>
        </div>
      );
    }

    case 'compound': {
      const vals: Record<string, string> = value || {};
      return (
        <div className="space-y-3 max-w-[460px] mx-auto">
          {(q.fields || []).map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs text-white/40 px-1">{f.label}</label>
              <div className="flex items-center h-9 rounded-[10px] px-3 transition-all focus-within:border-[rgba(139,92,246,0.4)]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                {f.prefix && <span className="text-white/30 text-sm mr-2">{f.prefix}</span>}
                <input type="text" inputMode="decimal" value={vals[f.key] || ''} placeholder="0"
                  onChange={e => onChange({ ...vals, [f.key]: e.target.value })}
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/15" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
