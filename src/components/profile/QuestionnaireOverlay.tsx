import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Check, Sparkles, Lock,
  Home, Zap, Landmark, Car, Bus, Tv, Shield, ShoppingCart, Baby, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getModuleQuestions, calculateClarityScore, BADGES, QUEST_NODES, getPersona } from '@/lib/profileData';
import { JohnnyMessage } from '@/components/ui/JohnnyMessage';
import { getCelebration } from '@/lib/personaMessaging';
import type { ProfileQ } from '@/lib/profileData';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { BADGE_IMAGES } from '@/lib/badgeImages';
import { BankConnectionScreen } from '@/components/onboarding/BankConnectionScreen';

const EXPENSE_ICONS: Record<string, LucideIcon> = {
  Home, Zap, Landmark, Car, Bus, Tv, Shield, ShoppingCart, Baby, MoreHorizontal,
};

// Correct answers for quiz calibration
const QUIZ_CORRECT: Record<string, string> = {
  q5a: 'More than €102',
  q5b: 'Less than today',
  q5c: 'False',
};

// Auto-advance types
const AUTO_ADVANCE_TYPES = new Set(['single', 'quiz', 'scale5']);

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
  const [showBankConnection, setShowBankConnection] = useState(false);
  
  const [direction, setDirection] = useState<1 | -1>(1);
  const [expenseFreq, setExpenseFreq] = useState<Record<string, string>>({});
  const { updateConfig, addCategory, addTransaction } = useBudget();
  const { addGoal, setActiveTab } = useApp();
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clean up auto-advance timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const setAnswer = useCallback((id: string, v: any) => {
    setAnswers(prev => ({ ...prev, [id]: v }));
  }, []);

  const handleNext = useCallback(() => {
    // Clear any pending auto-advance
    if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }

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
  }, [moduleKey, currentQ, showCalibration, isLast, safeIdx]);

  // Auto-advance handler for single-select
  const handleAutoAdvanceAnswer = useCallback((id: string, v: any) => {
    setAnswers(prev => ({ ...prev, [id]: v }));
    // Schedule auto-advance
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null;
      // Use functional approach to get latest state
      setDirection(1);
      setCurrentIdx(prev => {
        // Check if this is the last question
        const visQ = allQuestions.filter(q => !q.showIf || q.showIf({ ...answers, [id]: v }));
        const idx = Math.min(prev, visQ.length - 1);
        if (idx === visQ.length - 1) {
          // It's the last question - trigger complete via a flag
          return prev; // Don't advance, handleNext will handle complete
        }
        return prev + 1;
      });
    }, 400);
  }, [allQuestions, answers]);

  const handleBack = () => {
    if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
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
        { key: 'transport', name: 'Transport', icon: 'Bus' },
        { key: 'insurance', name: 'Insurance', icon: 'Shield' },
        { key: 'childcare', name: 'Childcare', icon: 'Baby' },
        { key: 'other', name: 'Other Fixed', icon: 'MoreHorizontal' },
      ];
      let totalFixed = 0;
      fixedMap.forEach(item => {
        const amt = getMonthly(item.key);
        if (amt > 0) {
          addCategory({ name: item.name, icon: item.icon, monthlyBudget: amt, type: 'fixed' });
          totalFixed += amt;
        }
      });

      // Calculate goal contributions to subtract from flex
      const goalMap_: Record<string, { mc: number }> = {
        'Save for a home': { mc: 200 }, 'Save for a car': { mc: 150 },
        'Build emergency fund': { mc: 100 }, 'Save for a vacation': { mc: 75 },
        'Save for a purchase': { mc: 50 }, 'Start investing': { mc: 75 },
        'Save for retirement': { mc: 100 },
      };
      const goalContributions = (finalAnswers.step3 || []).reduce((s: number, g: string) => s + (goalMap_[g]?.mc || 0), 0);

      // What's actually available for variable spending:
      const flexForSpending = Math.max(0, income - totalFixed - savings - goalContributions);
      const groceries = getMonthly('groceries');
      const foodBudget = groceries > 0 ? groceries : Math.round(flexForSpending * 0.35);
      const remainingAfterFood = Math.max(0, flexForSpending - foodBudget);

      // Leave ~10% unallocated as breathing room
      const allocatable = Math.round(remainingAfterFood * 0.90);

      const entertainmentBudget = Math.round(allocatable * 0.30);
      const shoppingBudget = Math.round(allocatable * 0.38);
      const lifestyleBudget = allocatable - entertainmentBudget - shoppingBudget;

      // Only create categories with meaningful budget (> €0)
      if (foodBudget > 0) addCategory({ name: 'Food', icon: 'UtensilsCrossed', monthlyBudget: foodBudget, type: 'expense' });
      if (entertainmentBudget > 0) addCategory({ name: 'Entertainment', icon: 'Film', monthlyBudget: entertainmentBudget, type: 'expense' });
      if (shoppingBudget > 0) addCategory({ name: 'Shopping', icon: 'ShoppingBag', monthlyBudget: shoppingBudget, type: 'expense' });
      if (lifestyleBudget > 0) addCategory({ name: 'Lifestyle', icon: 'Heart', monthlyBudget: lifestyleBudget, type: 'expense' });

      // Subscriptions as recurring expense transaction
      const subsAmount = getMonthly('subs');
      if (subsAmount > 0) {
        setTimeout(() => {
          try {
            const bd = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
            const cats = bd.categories || [];
            const entCat = cats.find((c: any) => c.name === 'Entertainment');
            if (entCat) {
              const subTx = {
                id: crypto.randomUUID(),
                amount: subsAmount,
                type: 'expense',
                categoryId: entCat.id,
                description: 'Monthly Subscriptions',
                date: new Date().toISOString().split('T')[0],
                isRecurring: true,
              };
              bd.transactions = [...(bd.transactions || []), subTx];
              localStorage.setItem('jfb-budget-data', JSON.stringify(bd));
            }
          } catch {}
        }, 500);
      }

      // Create goals from Step 3 selections
      const goalMap: Record<string, { name: string; icon: string; target: number; mc: number }> = {
        'Save for a home': { name: 'Dream House', icon: 'Home', target: 40000, mc: 200 },
        'Save for a car': { name: 'New Car', icon: 'Car', target: 10000, mc: 150 },
        'Build emergency fund': { name: 'Emergency Fund', icon: 'ShieldCheck', target: 3000, mc: 100 },
        'Save for a vacation': { name: 'Vacation', icon: 'Plane', target: 2000, mc: 75 },
        'Save for a purchase': { name: 'New Laptop', icon: 'Laptop', target: 2500, mc: 50 },
        'Start investing': { name: 'Investment Fund', icon: 'TrendingUp', target: 5000, mc: 100 },
        'Save for retirement': { name: 'Retirement', icon: 'Sunset', target: 50000, mc: 200 },
      };
      // Append goals, skipping duplicates by name
      const existingGoals: Array<{ name: string }> = (() => {
        try { return JSON.parse(localStorage.getItem('jfb_goals') || '[]'); } catch { return []; }
      })();
      (finalAnswers.step3 || []).forEach((g: string) => {
        const d = goalMap[g];
        if (d && !existingGoals.some(eg => eg.name === d.name)) {
          addGoal({ name: d.name, icon: d.icon, target: d.target, saved: 0, monthlyContribution: d.mc, targetDate: '', monthIndex: -1 });
        }
      });

      // Store debt data
      if (finalAnswers.step6a === 'Yes') {
        localStorage.setItem('jfb_debt', JSON.stringify({
          creditCard: { balance: Number(finalAnswers.step6b?.cc_balance) || 0, payment: Number(finalAnswers.step6b?.cc_payment) || 0 },
          loans: { balance: Number(finalAnswers.step6c?.pl_balance) || 0, payment: Number(finalAnswers.step6c?.pl_payment) || 0 },
          other: { balance: Number(finalAnswers.step6d?.od_balance) || 0, payment: Number(finalAnswers.step6d?.od_payment) || 0 },
        }));
      }

      // Store cash reserves (now includes investments)
      localStorage.setItem('jfb_cash', JSON.stringify({
        bankAccounts: Number(finalAnswers.step8?.bank) || 0,
        savingsAccounts: Number(finalAnswers.step8?.savings) || 0,
        investments: Number(finalAnswers.step8?.investments) || 0,
      }));

      // Show combined completion screen (score + badge)
      setShowCompletion(true);
      return;
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
    if (moduleKey === 'clarity') {
      if (!localStorage.getItem('jfb_bank_connected')) {
        setShowBankConnection(true);
        return;
      }
      setActiveTab(2); // Profile tab
      onComplete();
      return;
    }
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
        style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
          className="w-full max-w-sm frosted-card p-6 space-y-4">
          <p className="text-base font-bold text-center" style={{ color: '#2D2440' }}>
            You got {actualCorrect} out of 3 correct
          </p>
          <p className="text-[13px] text-center" style={{ color: '#8A7FA0' }}>You estimated {estimated}</p>
          <p className="text-[13px] text-center" style={{ color: messageColor }}>{message}</p>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          onClick={handleNext}
          className="mt-6 px-8 h-10 rounded-full text-sm font-semibold frosted-button flex items-center gap-2">
          Continue <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  }

  // ── Bank Connection Screen ──
  if (showBankConnection) {
    return (
      <BankConnectionScreen
        onComplete={() => {
          setActiveTab(2);
          onComplete();
        }}
      />
    );
  }

  // ── Combined Completion Screen (Score + Badge) ──
  if (showCompletion) {
    const badgeKey = node.badgeKey;
    const badgeImg = BADGE_IMAGES[badgeKey];
    const isClarityModule = moduleKey === 'clarity';
    const clarityData = isClarityModule ? (() => {
      const fa = { ...answers, step5_freq: expenseFreq };
      const score = calculateClarityScore(fa);
      const pillars = [
        { label: 'Spending', score: score.spending, max: 40, color: '#F97316' },
        { label: 'Saving', score: score.saving, max: 35, color: '#3B82F6' },
        { label: 'Planning', score: score.planning, max: 25, color: '#8B5CF6' },
      ];
      const weakest = pillars.reduce((a, b) => (a.score / a.max) < (b.score / b.max) ? a : b);
      const insightMap: Record<string, string> = {
        Saving: 'Building an emergency fund would significantly boost your score.',
        Spending: 'Reviewing your expense-to-income ratio could improve your score.',
        Planning: 'Setting more financial goals would strengthen your picture.',
      };
      return { score, pillars, insight: insightMap[weakest.label] };
    })() : null;

    const ScoreCounter = ({ target }: { target: number }) => {
      const [val, setVal] = useState(0);
      const started = useRef(false);
      useEffect(() => {
        if (started.current) return; started.current = true;
        const startTime = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - startTime) / 1500, 1);
          setVal(Math.round((1 - Math.pow(1 - t, 3)) * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        setTimeout(() => requestAnimationFrame(tick), 200);
      }, [target]);
      return <>{val}</>;
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 overflow-auto"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(139,92,246,0.2) 0%, transparent 50%), linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>

        {isClarityModule && clarityData ? (
          <div className="w-full max-w-[340px] space-y-5 py-6">
            {/* Score + horizontal bar */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[56px] font-bold leading-none" style={{ color: '#2D2440' }}><ScoreCounter target={clarityData.score.total} /></span>
                <span className="text-[20px]" style={{ color: '#8A7FA0' }}>/100</span>
              </div>
              <p className="text-[14px] mt-1" style={{ color: '#5C4F6E' }}>Financial Clarity Score</p>
              <div className="flex gap-0.5 mt-3 mx-auto" style={{ height: 8, borderRadius: 4, overflow: 'hidden', maxWidth: 280 }}>
                {clarityData.pillars.map(p => (
                  <motion.div key={p.label} initial={{ flex: 0 }} animate={{ flex: p.score }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    style={{ background: p.color, minWidth: p.score > 0 ? 4 : 0 }} />
                ))}
                <div style={{ flex: Math.max(0, 100 - clarityData.score.total), background: 'rgba(0,0,0,0.08)' }} />
              </div>
            </motion.div>

            {/* Pillar chips */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center gap-2">
              {clarityData.pillars.map(p => (
                <div key={p.label} className="flex flex-col items-center px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)' }}>
                  <div className="flex items-center gap-1">
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: p.color }} />
                    <span className="text-[14px] font-bold" style={{ color: '#2D2440' }}>{p.score}/{p.max}</span>
                  </div>
                  <span className="text-[10px] mt-0.5" style={{ color: '#8A7FA0' }}>{p.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Insight */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="text-[13px] text-center italic" style={{ color: '#5C4F6E' }}>
              {clarityData.insight}
            </motion.p>




            {/* Badge + Johnny combined card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)' }}>
              {badgeImg && (
                <img src={badgeImg} alt={badge?.name} className="w-12 h-12 object-contain shrink-0" style={{ imageRendering: 'pixelated' as any }} />
              )}
              <div>
                <p className="text-[13px] font-bold" style={{ color: '#2D2440' }}>{badge?.name} badge unlocked!</p>
                <p className="text-[11px] mt-1" style={{ color: '#5C4F6E' }}>
                  {clarityData.score.total >= 70 ? 'Solid score.' : 'Good start.'}{' '}
                  Spending awareness is your strongest area.
                </p>
              </div>
            </motion.div>

            {/* Continue */}
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              onClick={handleContinue}
              className="w-full h-12 rounded-[14px] text-white font-bold text-[16px] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
              Continue →
            </motion.button>
          </div>
        ) : (
          <>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-[28px] font-bold mb-1" style={{ color: '#2D2440' }}>{(() => {
                const m0 = (() => { try { return JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null'); } catch { return null; } })();
                const p = getPersona(m0);
                return getCelebration(node.name, p?.n || null);
              })()}</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-[15px] mb-6" style={{ color: '#8A7FA0' }}>{node.name}</motion.p>

            {/* Answer Review - Module 0 (Know Yourself) only */}
            {moduleKey === 'module0' && (() => {
              const MODULE0_CORRECT: Record<string, { short: string; correct: string }> = {
                q5a: { short: 'Compound interest', correct: 'More than €102' },
                q5b: { short: 'Interest vs inflation', correct: 'Less than today' },
                q5c: { short: 'Stock vs mutual fund', correct: 'False' },
              };
              const literacyAnswers = Object.entries(MODULE0_CORRECT).map(([key, info]) => ({
                questionShort: info.short,
                userAnswer: typeof answers[key] === 'string' ? answers[key] : (answers[key]?.label || answers[key] || '—'),
                correctAnswer: info.correct,
                isCorrect: (typeof answers[key] === 'string' ? answers[key] : (answers[key]?.label || '')) === info.correct,
              }));
              const correctCount = literacyAnswers.filter(a => a.isCorrect).length;

              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="w-full max-w-[320px] mt-4 rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] font-bold" style={{ color: '#2D1F4E' }}>Financial Literacy Check</span>
                    <span className="text-[11px]" style={{ color: '#8A7FA0' }}>{correctCount}/3 correct</span>
                  </div>
                  {literacyAnswers.map((a, i) => (
                    <div key={i} className="flex items-center gap-2" style={{
                      padding: '7px 0',
                      borderBottom: i < literacyAnswers.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    }}>
                      <div className="shrink-0" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: a.isCorrect ? '#22C55E' : '#EF4444',
                      }} />
                      <span className="flex-1 text-[12px]" style={{ color: '#5C4F6E' }}>{a.questionShort}</span>
                      {a.isCorrect ? (
                        <span className="text-[11px] font-semibold" style={{ color: '#22C55E' }}>{a.userAnswer} ✓</span>
                      ) : (
                        <>
                          <span className="text-[11px] line-through" style={{ color: '#EF4444' }}>{a.userAnswer}</span>
                          <span className="text-[11px] font-semibold" style={{ color: '#22C55E' }}>→ {a.correctAnswer}</span>
                        </>
                      )}
                    </div>
                  ))}
                </motion.div>
              );
            })()}

            {badgeImg && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.3 }}
                className="flex items-center gap-4 mt-6 frosted-card"
                style={{ padding: '12px 20px', border: '1.5px solid rgba(255,215,0,0.3)' }}>
                <img src={badgeImg} alt={badge?.name || 'Badge'} className="w-12 h-12 object-contain shrink-0" style={{ imageRendering: 'pixelated' as any }} />
                <div>
                  <p className="text-[15px] font-bold" style={{ color: '#2D2440' }}>{badge?.name || 'Badge Earned'}</p>
                  <p className="text-[11px]" style={{ color: '#8A7FA0' }}>Badge unlocked!</p>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
              className="w-full max-w-[320px] mt-4">
              <JohnnyMessage variant="light" from="Johnny">
                {moduleKey === 'module0' && (
                  <>
                    {(() => {
                      try {
                        const a = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
                        const p = getPersona(a);
                        if (!p) return <>Interesting profile. I'm learning how you think about money.</>;
                        return (
                          <>
                            <strong>{p.n}</strong> types are great at sticking to plans once they have one. Your blind spot? You might delay big decisions while still "researching." I'll help you move faster.
                          </>
                        );
                      } catch { return <>Interesting. I'm building your financial profile.</>; }
                    })()}
                  </>
                )}
                {moduleKey !== 'clarity' && moduleKey !== 'module0' && (
                  <>Another piece of the puzzle. The more I know about you, the better I can help you make decisions that fit your style.</>
                )}
              </JohnnyMessage>
            </motion.div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.3 }}
              onClick={handleContinue}
              className="mt-6 w-[220px] h-12 rounded-[14px] text-white font-bold text-[16px] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
              Continue →
            </motion.button>
          </>
        )}
      </motion.div>
    );
  }

  // ── Question Screen ──
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-[60] flex flex-col"
        style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>

      {/* Header bar */}
      <div className="h-[52px] flex items-center px-4 shrink-0"
        style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <NodeIcon className="w-5 h-5 shrink-0" strokeWidth={1.5} style={{ color: '#5C4F6E' }} />
          <span className="text-base font-bold truncate" style={{ color: '#2D2440' }}>{node.name}</span>
        </div>
        <div className="flex-1 flex justify-center px-4">
          <div className="w-[200px] h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
            <motion.div className="h-full rounded-full gradient-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 shrink-0"><X className="w-5 h-5" style={{ color: '#8A7FA0' }} /></button>
      </div>

      {/* Question counter */}
      <div className="text-center pt-4 pb-4">
        <span className="text-[11px] uppercase tracking-[2px] font-medium" style={{ color: '#5C4F6E' }}>
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
            <p className="text-[22px] font-bold text-center leading-[1.4] max-w-[500px] mx-auto whitespace-pre-line" style={{ color: '#2D2440' }}>
              {currentQ?.text}
            </p>

            {/* Future Me circles animation for Know Yourself q6 */}
            {moduleKey === 'module0' && currentQ?.id === 'q6' && (() => {
              const v = value ?? 1;
              const separation = ((7 - v) / 6) * 50; // 0 = overlap, 50 = apart
              return (
                <div className="flex flex-col items-center gap-6 pt-4">
                  <div className="relative flex items-center justify-center" style={{ width: 200, height: 100 }}>
                    <motion.div
                      className="absolute rounded-full flex items-center justify-center"
                      animate={{ x: -separation }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      style={{
                        width: 80, height: 80,
                        background: 'rgba(139,92,246,0.25)',
                        border: '2px solid rgba(139,92,246,0.5)',
                      }}
                    >
                      <span className="text-[11px] font-semibold" style={{ color: '#5C4F6E' }}>Now</span>
                    </motion.div>
                    <motion.div
                      className="absolute rounded-full flex items-center justify-center"
                      animate={{ x: separation }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      style={{
                        width: 80, height: 80,
                        background: 'rgba(236,72,153,0.2)',
                        border: '2px solid rgba(236,72,153,0.4)',
                      }}
                    >
                      <span className="text-[11px] font-semibold" style={{ color: '#5C4F6E' }}>Future</span>
                    </motion.div>
                  </div>
                </div>
              );
            })()}

            {currentQ && (
              <QuestionInput
                q={currentQ}
                value={value}
                onChange={(v) => {
                  if (moduleKey === 'module0' && currentQ.id === 'q6') {
                    // For Future Me, always use setAnswer (no auto-advance for slider)
                    setAnswer(currentQ.id, v);
                  } else if (AUTO_ADVANCE_TYPES.has(currentQ.type) && !isLast) {
                    handleAutoAdvanceAnswer(currentQ.id, v);
                  } else {
                    setAnswer(currentQ.id, v);
                  }
                }}
                expenseFreq={expenseFreq}
                onFreqChange={setExpenseFreq}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-4 pt-2 space-y-3 shrink-0">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-11 rounded-[14px] text-[15px] font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: canProceed ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.3)',
            color: canProceed ? 'white' : '#8A7FA0',
            boxShadow: canProceed ? '0 4px 16px rgba(139,92,246,0.3)' : 'none',
            cursor: canProceed ? 'pointer' : 'default',
          }}>
          {isLast ? <><span>Complete</span> <Sparkles className="w-4 h-4" /></> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
        {safeIdx > 0 && (
          <button onClick={handleBack} className="w-full text-center text-[13px]" style={{ color: '#5C4F6E' }}>Back</button>
        )}
      </div>
    </motion.div>
  );
}

// ── Question Input Renderer ──
function QuestionInput({ q, value, onChange, expenseFreq, onFreqChange }: { q: ProfileQ; value: any; onChange: (v: any) => void; expenseFreq: Record<string, string>; onFreqChange: (f: Record<string, string>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const needsAutoFocus = q.type === 'number' || q.type === 'compound';

  useEffect(() => {
    if (needsAutoFocus) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [q.id, needsAutoFocus]);

  switch (q.type) {
    case 'text':
      return (
        <div className="max-w-[300px] mx-auto">
          <div className="flex items-center h-[52px] rounded-[14px] px-5 frosted-input">
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
              placeholder="Type here..." autoFocus
              className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-[#8A7FA0]" style={{ color: '#2D2440' }} />
          </div>
        </div>
      );

    case 'number':
      return (
        <div className="max-w-[300px] mx-auto">
          <div className="flex items-center h-[52px] rounded-[14px] px-5 frosted-input transition-all focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]">
            {q.prefix && <span className="text-lg mr-2" style={{ color: '#8A7FA0' }}>{q.prefix}</span>}
            <input ref={inputRef} type="text" inputMode="decimal" value={value || ''} onChange={e => onChange(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-[#8A7FA0]" style={{ color: '#2D2440' }} />
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
            <div className="absolute text-xl font-bold -translate-x-1/2"
              style={{ left: `${pct}%`, transition: 'left 100ms ease', color: '#2D2440' }}>
              {v}
            </div>
          </div>
          <div className="relative px-1">
            <input type="range" min={min} max={max} step={step} value={v}
              onChange={e => onChange(Number(e.target.value))}
              className="questionnaire-slider w-full"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #EC4899 ${pct}%, rgba(255,255,255,0.3) ${pct}%)`,
              }} />
          </div>
          <div className="flex justify-between mt-3 px-1" style={{ fontSize: 11, fontWeight: 600, color: '#5C4F6E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
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
                  background: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.45)',
                  border: `1.5px solid ${selected ? '#8B5CF6' : 'rgba(255,255,255,0.6)'}`,
                  color: '#2D2440',
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
                  background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.45)',
                  border: `1.5px solid ${isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.6)'}`,
                  color: '#2D2440',
                }}>
                <div className="w-5 h-5 rounded-md mr-3 flex items-center justify-center shrink-0"
                  style={{
                    background: isSelected ? '#8B5CF6' : 'transparent',
                    border: `1.5px solid ${isSelected ? '#8B5CF6' : '#8A7FA0'}`,
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
      return (
        <div className="space-y-2 max-w-[460px] mx-auto">
          {(q.options || []).map((opt, i) => {
            const o = typeof opt === 'string' ? { label: opt } : opt;
            const selected = value === o.label;
            return (
              <button key={i} onClick={() => onChange(o.label)}
                className="w-full h-11 rounded-xl px-4 flex items-center text-left text-[14px] transition-all"
                style={{
                  background: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.45)',
                  border: `1.5px solid ${selected ? '#8B5CF6' : 'rgba(255,255,255,0.6)'}`,
                  color: '#2D2440',
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
                background: value === n ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.45)',
                border: `1.5px solid ${value === n ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.6)'}`,
                color: value === n ? 'white' : '#2D2440',
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
              <p className="text-sm italic" style={{ color: '#5C4F6E' }}>"{stmt}"</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => onChange({ ...vals, [si]: n })}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: vals[si] === n ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.45)',
                      border: `1.5px solid ${vals[si] === n ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.6)'}`,
                      color: vals[si] === n ? 'white' : '#2D2440',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between px-1" style={{ fontSize: 11, fontWeight: 600, color: '#5C4F6E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                <span>Disagree</span><span>Agree</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'expenses': {
      const vals: Record<string, string> = value || {};
      const total = Object.entries(vals).reduce((s, [key, v]) => {
        let amt = Number(v) || 0;
        if (expenseFreq[key] === 'weekly') amt *= 4.33;
        return s + amt;
      }, 0);
      return (
        <div className="max-w-[460px] mx-auto rounded-2xl overflow-hidden frosted-card" style={{ padding: 0 }}>
          <div className="max-h-[320px] overflow-auto">
            {(q.fields || []).map((f, fi) => {
              const IconComp = f.icon ? EXPENSE_ICONS[f.icon] : MoreHorizontal;
              const isWeekly = expenseFreq[f.key] === 'weekly';
              return (
                <div key={f.key} className="flex items-center h-12 px-3"
                  style={{ borderBottom: fi < (q.fields?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none' }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center mr-2"
                    style={{ background: 'rgba(255,255,255,0.3)' }}>
                    {IconComp && <IconComp className="w-4 h-4" strokeWidth={1.5} style={{ color: '#5C4F6E' }} />}
                  </div>
                  <span className="text-[13px] flex-1 truncate" style={{ color: '#2D2440' }}>{f.label}</span>
                  <div className="flex mr-2 rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
                    <button onClick={() => onFreqChange({ ...expenseFreq, [f.key]: 'monthly' })}
                      className="px-1.5 py-0.5 text-[10px]"
                      style={{ background: !isWeekly ? 'rgba(139,92,246,0.2)' : 'transparent', color: !isWeekly ? '#2D2440' : '#8A7FA0' }}>
                      mo
                    </button>
                    <button onClick={() => onFreqChange({ ...expenseFreq, [f.key]: 'weekly' })}
                      className="px-1.5 py-0.5 text-[10px]"
                      style={{ background: isWeekly ? 'rgba(139,92,246,0.2)' : 'transparent', color: isWeekly ? '#2D2440' : '#8A7FA0' }}>
                      wk
                    </button>
                  </div>
                  <input type="text" inputMode="decimal" value={vals[f.key] || ''} placeholder="0"
                    onChange={e => onChange({ ...vals, [f.key]: e.target.value })}
                    className="w-[80px] h-9 rounded-[10px] text-sm font-medium text-right px-3 outline-none transition-all focus:border-[rgba(139,92,246,0.4)]"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.5)', color: '#2D2440' }} />
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 text-right text-sm font-bold"
            style={{ borderTop: '1px solid rgba(255,255,255,0.3)', color: '#5C4F6E' }}>
            Total: €{Math.round(total)}/mo
          </div>
        </div>
      );
    }

    case 'compound': {
      const vals: Record<string, string> = value || {};
      return (
        <div className="space-y-3 max-w-[460px] mx-auto">
          {(q.fields || []).map((f, fi) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs px-1" style={{ color: '#5C4F6E' }}>{f.label}</label>
              <div className="flex items-center h-[52px] rounded-[14px] px-5 frosted-input transition-all focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]">
                {f.prefix && <span className="text-lg mr-2" style={{ color: '#8A7FA0' }}>{f.prefix}</span>}
                <input ref={fi === 0 ? inputRef : undefined} type="text" inputMode="decimal" value={vals[f.key] || ''} placeholder="0"
                  onChange={e => onChange({ ...vals, [f.key]: e.target.value })}
                  className="flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-[#8A7FA0]" style={{ color: '#2D2440' }} />
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
