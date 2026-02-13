import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Check, Sparkles, Lock,
  Home, Zap, Landmark, Car, Bus, Tv, Shield, ShoppingCart, Baby, MoreHorizontal,
  Eye, AlertTriangle, Star, PiggyBank, Clock, Target, TrendingUp
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getModuleQuestions, calculateClarityScore, BADGES, QUEST_NODES } from '@/lib/profileData';
import type { ProfileQ } from '@/lib/profileData';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';

const EXPENSE_ICONS: Record<string, LucideIcon> = {
  Home, Zap, Landmark, Car, Bus, Tv, Shield, ShoppingCart, Baby, MoreHorizontal,
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
  const { updateConfig, addCategory } = useBudget();
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
    if (currentQ.type === 'expenses' || currentQ.type === 'compound') return true; // optional fields
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

  const handleComplete = useCallback(() => {
    const node = QUEST_NODES.find(n => n.key === moduleKey);
    if (!node) return;

    // Save answers
    if (node.lsAnswers) localStorage.setItem(node.lsAnswers, JSON.stringify(answers));
    if (node.lsDone) localStorage.setItem(node.lsDone, 'true');

    // Award badge
    const earnedBadges: string[] = JSON.parse(localStorage.getItem('jfb_badges') || '[]');
    if (node.badgeKey && !earnedBadges.includes(node.badgeKey)) {
      earnedBadges.push(node.badgeKey);
      localStorage.setItem('jfb_badges', JSON.stringify(earnedBadges));
    }

    // Module-specific side effects
    if (moduleKey === 'module0' && answers.q1) {
      localStorage.setItem('jfb_userName', answers.q1);
    }

    if (moduleKey === 'clarity') {
      const score = calculateClarityScore(answers);
      localStorage.setItem('jfb_clarityScore', JSON.stringify(score));

      const income = Number(answers.step4) || 0;
      const savings = Number(answers.step7) || 0;
      updateConfig({ monthlyIncome: income, monthlySavingsTarget: savings, setupComplete: true });

      // Fixed categories
      const exp = answers.step5 || {};
      const fixedMap = [
        { key: 'rent', name: 'Rent', icon: 'Home' }, { key: 'utilities', name: 'Utilities', icon: 'Zap' },
        { key: 'tax', name: 'Tax', icon: 'Landmark' }, { key: 'car', name: 'Car', icon: 'Car' },
        { key: 'transport', name: 'Transport', icon: 'Bus' }, { key: 'subs', name: 'Subscriptions', icon: 'Tv' },
        { key: 'insurance', name: 'Insurance', icon: 'Shield' },
        { key: 'childcare', name: 'Childcare', icon: 'Baby' },
        { key: 'other', name: 'Other Fixed', icon: 'MoreHorizontal' },
      ];
      let totalFixed = 0;
      fixedMap.forEach(item => {
        const amt = Number(exp[item.key]) || 0;
        if (amt > 0) {
          addCategory({ name: item.name, icon: item.icon, monthlyBudget: amt, type: 'fixed' });
          totalFixed += amt;
        }
      });

      // Flex categories
      const flex = Math.max(0, income - totalFixed - savings);
      const groceries = Number(exp.groceries) || Math.round(flex * 0.35);
      addCategory({ name: 'Food', icon: 'UtensilsCrossed', monthlyBudget: groceries, type: 'expense' });
      addCategory({ name: 'Entertainment', icon: 'Film', monthlyBudget: Math.round(flex * 0.15), type: 'expense' });
      addCategory({ name: 'Shopping', icon: 'ShoppingBag', monthlyBudget: Math.round(flex * 0.20), type: 'expense' });
      addCategory({ name: 'Personal', icon: 'Heart', monthlyBudget: Math.round(flex * 0.15), type: 'expense' });
      addCategory({ name: 'Other', icon: 'MoreHorizontal', monthlyBudget: Math.round(flex * 0.15), type: 'expense' });

      // Goals from selected
      const goalMap: Record<string, { name: string; icon: string; target: number; mc: number }> = {
        'Grow my money': { name: 'Investment Fund', icon: 'TrendingUp', target: 5000, mc: 100 },
        'Save for a purchase': { name: 'Savings Goal', icon: 'Target', target: 2000, mc: 100 },
        'Start investing': { name: 'Start Investing', icon: 'LineChart', target: 1000, mc: 50 },
        'Save for retirement': { name: 'Retirement', icon: 'Sunset', target: 50000, mc: 200 },
      };
      (answers.step3 || []).forEach((g: string) => {
        const d = goalMap[g];
        if (d) addGoal({ name: d.name, icon: d.icon, target: d.target, saved: 0, monthlyContribution: d.mc, targetDate: '', monthIndex: -1 });
      });
    }

    setShowCompletion(true);
  }, [answers, moduleKey, updateConfig, addCategory, addGoal]);

  const handleContinue = () => {
    if (moduleKey === 'clarity') setActiveTab(1);
    onComplete();
  };

  const node = QUEST_NODES.find(n => n.key === moduleKey)!;
  const NodeIcon = node.Icon;
  const badge = BADGES.find(b => b.key === node.badgeKey);

  // ── Completion Screen ──
  if (showCompletion) {
    const particles = Array.from({ length: 25 }, (_, i) => ({
      x: 10 + Math.random() * 80, y: 10 + Math.random() * 80,
      color: ['#8B5CF6', '#FF6B9D', '#FFD700'][i % 3],
      delay: Math.random() * 0.5, size: 3 + Math.random() * 3,
    }));
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] jfb-bg flex flex-col items-center justify-center px-8">
        {particles.map((p, i) => (
          <motion.div key={i} className="absolute rounded-full" style={{ width: p.size, height: p.size, background: p.color, left: `${p.x}%` }}
            initial={{ opacity: 0, y: '80%' }}
            animate={{ opacity: [0, 1, 1, 0], y: [`${p.y + 20}%`, `${p.y}%`, `${p.y - 15}%`] }}
            transition={{ duration: 1.5, delay: p.delay }} />
        ))}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
          className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6"
          style={{ boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
          <NodeIcon className="w-12 h-12 text-white" strokeWidth={1.5} />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-white mb-2">Quest Complete!</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-sm text-white/50 mb-8">{node.name}</motion.p>
        {badge && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
            className="flex flex-col items-center gap-2 mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{ background: badge.tint + '25' }}>
              <badge.Icon className="w-7 h-7" style={{ color: badge.tint }} strokeWidth={1.5} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)', animation: 'shimmer 3s infinite' }} />
            </div>
            <span className="text-sm font-semibold text-white">{badge.name}</span>
            <span className="text-xs text-white/40">{badge.desc}</span>
          </motion.div>
        )}
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          onClick={handleContinue}
          className="w-full max-w-xs h-12 rounded-2xl gradient-primary text-white font-semibold flex items-center justify-center gap-2">
          Continue <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  }

  // ── Question Screen ──
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-[60] jfb-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <NodeIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
            <span className="text-lg font-bold text-white">{node.name}</span>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5 text-white/60" /></button>
        </div>
        <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div className="h-full gradient-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <p className="text-xs text-white/30 mt-2">Question {safeIdx + 1} of {visibleQuestions.length}</p>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-auto px-5 pb-4">
        <AnimatePresence mode="wait">
          <motion.div key={currentQ?.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }} className="space-y-6">
            <p className="text-lg text-white text-center whitespace-pre-line">{currentQ?.text}</p>
            {currentQ && <QuestionInput q={currentQ} value={value} onChange={(v) => setAnswer(currentQ.id, v)} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-5 pb-8 pt-2 space-y-3">
        {safeIdx > 0 && (
          <button onClick={() => setCurrentIdx(Math.max(0, safeIdx - 1))} className="w-full text-center text-sm text-white/40">Back</button>
        )}
        <button
          onClick={() => isLast ? handleComplete() : setCurrentIdx(safeIdx + 1)}
          disabled={!canProceed}
          className="w-full h-12 rounded-2xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none">
          {isLast ? <><Sparkles className="w-4 h-4" /> Complete</> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}

// ── Question Input Renderer ──
function QuestionInput({ q, value, onChange }: { q: ProfileQ; value: any; onChange: (v: any) => void }) {
  switch (q.type) {
    case 'text':
      return (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="Type here..." autoFocus
          className="w-full h-12 rounded-2xl bg-white/10 backdrop-blur px-4 text-white text-base outline-none border border-white/10 focus:border-white/25 placeholder:text-white/25" />
      );

    case 'number':
      return (
        <div className="flex items-center gap-2 w-full h-12 rounded-2xl bg-white/10 backdrop-blur px-4 border border-white/10">
          {q.prefix && <span className="text-white/50">{q.prefix}</span>}
          <input type="text" inputMode="decimal" value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder="0" autoFocus
            className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-white/25" />
        </div>
      );

    case 'slider': {
      const min = q.min ?? 1, max = q.max ?? 10, step = q.step ?? 1;
      const v = value ?? min;
      const pct = ((v - min) / (max - min)) * 100;
      return (
        <div className="space-y-4 pt-4">
          <div className="text-center text-3xl font-bold text-white">{v}</div>
          <input type="range" min={min} max={max} step={step} value={v}
            onChange={e => onChange(Number(e.target.value))}
            className="profile-slider w-full"
            style={{ background: `linear-gradient(to right, #8B5CF6 0%, #FF6B9D ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }} />
          <div className="flex justify-between text-xs text-white/25">
            <span>{q.minLabel}</span><span>{q.maxLabel}</span>
          </div>
        </div>
      );
    }

    case 'single':
      return (
        <div className="space-y-2">
          {(q.options || []).map((opt, i) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const selected = value === label;
            return (
              <button key={i} onClick={() => onChange(label)}
                className="w-full h-[52px] rounded-2xl px-4 flex items-center text-left text-sm transition-colors border"
                style={{
                  background: selected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.08)',
                  borderColor: selected ? 'rgba(139,92,246,0.25)' : 'transparent',
                  color: selected ? 'white' : 'rgba(255,255,255,0.7)',
                }}>
                <span className="flex-1">{label}</span>
                {selected && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            );
          })}
        </div>
      );

    case 'multi': {
      const selected: string[] = value || [];
      return (
        <div className="space-y-2">
          {(q.options || []).map((opt, i) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const isSelected = selected.includes(label);
            return (
              <button key={i} onClick={() => onChange(isSelected ? selected.filter(x => x !== label) : [...selected, label])}
                className="w-full h-[52px] rounded-2xl px-4 flex items-center text-left text-sm transition-colors border"
                style={{
                  background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.08)',
                  borderColor: isSelected ? 'rgba(139,92,246,0.25)' : 'transparent',
                  color: isSelected ? 'white' : 'rgba(255,255,255,0.7)',
                }}>
                <span className="flex-1">{label}</span>
                {isSelected && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            );
          })}
        </div>
      );
    }

    case 'quiz': {
      const answered = value !== undefined;
      return (
        <div className="space-y-2">
          {(q.options || []).map((opt, i) => {
            const o = typeof opt === 'string' ? { label: opt } : opt;
            const selected = value === o.label;
            const isCorrect = o.correct;
            let bg = 'rgba(255,255,255,0.08)';
            let border = 'transparent';
            if (answered) {
              if (isCorrect) { bg = 'rgba(34,197,94,0.15)'; border = 'rgba(34,197,94,0.3)'; }
              else if (selected) { bg = 'rgba(245,158,11,0.15)'; border = 'rgba(245,158,11,0.3)'; }
            } else if (selected) {
              bg = 'rgba(139,92,246,0.15)'; border = 'rgba(139,92,246,0.25)';
            }
            return (
              <button key={i} onClick={() => !answered && onChange(o.label)} disabled={answered}
                className="w-full h-[52px] rounded-2xl px-4 flex items-center text-left text-sm border"
                style={{ background: bg, borderColor: border, color: 'white' }}>
                <span className="flex-1">{o.label}</span>
                {answered && isCorrect && <Check className="w-4 h-4 text-green-400" />}
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
                background: value === n ? 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' : 'rgba(255,255,255,0.08)',
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
        <div className="space-y-5">
          {(q.statements || []).map((stmt, si) => (
            <div key={si} className="space-y-2">
              <p className="text-sm text-white/70">"{stmt}"</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => onChange({ ...vals, [si]: n })}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: vals[si] === n ? 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' : 'rgba(255,255,255,0.08)',
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
      const total = Object.values(vals).reduce((s, v) => s + (Number(v) || 0), 0);
      return (
        <div className="space-y-2">
          {(q.fields || []).map(f => {
            const IconComp = f.icon ? EXPENSE_ICONS[f.icon] : MoreHorizontal;
            return (
              <div key={f.key} className="flex items-center gap-3 h-11 rounded-xl bg-white/[0.08] px-3">
                {IconComp && <IconComp className="w-4 h-4 text-white/40 shrink-0" strokeWidth={1.5} />}
                <span className="text-xs text-white/50 flex-1 truncate">{f.label}</span>
                <span className="text-white/30 text-xs">€</span>
                <input type="text" inputMode="decimal" value={vals[f.key] || ''} placeholder="0"
                  onChange={e => onChange({ ...vals, [f.key]: e.target.value })}
                  className="w-16 bg-transparent text-white text-right text-sm outline-none placeholder:text-white/15" />
              </div>
            );
          })}
          <div className="text-right text-sm font-semibold text-white/60 pr-2 pt-1">Total: €{total}</div>
        </div>
      );
    }

    case 'compound': {
      const vals: Record<string, string> = value || {};
      return (
        <div className="space-y-3">
          {(q.fields || []).map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs text-white/40">{f.label}</label>
              <div className="flex items-center gap-2 h-11 rounded-xl bg-white/[0.08] px-3 border border-white/5">
                {f.prefix && <span className="text-white/30 text-sm">{f.prefix}</span>}
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
