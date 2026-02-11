import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Plus, Sliders, Lock, PiggyBank, ShieldCheck, CheckCircle, AlertTriangle, AlertCircle, FlaskConical } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isYesterday, startOfMonth, endOfMonth, isWithinInterval, getDaysInMonth, getDate } from 'date-fns';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { useApp, iconMap as goalIconMap } from '@/context/AppContext';

const budgetIconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
};

const tintMap: Record<string, string> = {
  UtensilsCrossed: '#FF9F0A',
  ShoppingBag: '#FF6B9D',
  Bus: '#007AFF',
  Film: '#8B5CF6',
  Dumbbell: '#34C759',
  CreditCard: '#5AC8FA',
  Coffee: '#C4956A',
  Smartphone: '#FF6B9D',
  MoreHorizontal: '#FFFFFF',
};

function getTint(icon: string): string {
  return tintMap[icon] || '#FFFFFF';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getFillColor(percent: number, tint: string): string {
  if (percent > 100) return hexToRgba('#FF9F0A', 0.50);
  if (percent > 90) return hexToRgba('#FF9F0A', 0.40);
  if (percent > 70) return hexToRgba('#FF9F0A', 0.35);
  return hexToRgba(tint, 0.40);
}

function formatTransactionDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function ExpandedContent({
  cat,
  tint,
  sliderValue,
  originalBudget,
  flexRemaining,
  daysRemaining,
  dailyAllowance,
  transactions,
  onSliderChange,
  onSave,
  onCancel,
}: {
  cat: { id: string; name: string; monthlyBudget: number };
  tint: string;
  sliderValue: number;
  originalBudget: number;
  flexRemaining: number;
  daysRemaining: number;
  dailyAllowance: number;
  transactions: Array<{ id: string; amount: number; description: string; date: string }>;
  onSliderChange: (val: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const max = originalBudget + flexRemaining;
  const diff = sliderValue - originalBudget;
  const hasChanged = Math.round(sliderValue) !== Math.round(originalBudget);
  const newFlexRemaining = flexRemaining - diff;
  const newDaily = daysRemaining > 0 ? newFlexRemaining / daysRemaining : 0;
  const originalDaily = dailyAllowance;
  const fillPercent = max > 0 ? (sliderValue / max) * 100 : 0;

  // Get current month transactions for this category
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const catTransactions = transactions
    .filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const displayTransactions = catTransactions.slice(0, 4);
  const moreCount = catTransactions.length - 4;

  // Custom range input styles
  const thumbSize = 28;
  const rangeStyle = `
    input[type="range"].budget-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      outline: none;
      background: linear-gradient(to right, ${hexToRgba(tint, 0.35)} ${fillPercent}%, rgba(255,255,255,0.10) ${fillPercent}%);
    }
    input[type="range"].budget-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: ${thumbSize}px;
      height: ${thumbSize}px;
      border-radius: 50%;
      background: white;
      border: 2.5px solid ${tint};
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      cursor: pointer;
    }
    input[type="range"].budget-slider::-moz-range-thumb {
      width: ${thumbSize}px;
      height: ${thumbSize}px;
      border-radius: 50%;
      background: white;
      border: 2.5px solid ${tint};
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      cursor: pointer;
    }
  `;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="relative px-3 pb-3"
      style={{ zIndex: 2 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />

      {/* Budget Slider */}
      <div className="flex flex-col gap-1">
        <div className="text-center">
          <span style={{ fontSize: 18 }} className="font-bold text-primary-white">
            €{Math.round(sliderValue)}
          </span>
        </div>
        <div className="px-0">
          <style>{rangeStyle}</style>
          <input
            type="range"
            className="budget-slider"
            min={0}
            max={Math.round(max)}
            value={Math.round(sliderValue)}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div className="flex justify-between mt-0.5">
            <span style={{ fontSize: 10 }} className="text-primary-white/15">€0</span>
            <span style={{ fontSize: 10 }} className="text-primary-white/15">€{Math.round(max)}</span>
          </div>
        </div>
      </div>

      {/* Impact Text */}
      <div style={{ fontSize: 13, marginTop: 8 }}>
        {!hasChanged ? (
          <span className="text-primary-white/25">Drag the slider to adjust this budget</span>
        ) : diff < 0 ? (
          <span className="text-primary-white/60">
            Reducing by €{Math.abs(Math.round(diff))} frees up €{Math.abs(Math.round(diff))}/month. Daily budget: €{Math.round(originalDaily)}{' '}
            <span style={{ color: hexToRgba('#34C759', 0.7) }}>→ €{Math.round(newDaily)}/day</span>
          </span>
        ) : (
          <span className="text-primary-white/60">
            Adding €{Math.round(diff)} tightens budget. Daily budget: €{Math.round(originalDaily)}{' '}
            <span style={{ color: hexToRgba('#FF9F0A', 0.7) }}>→ €{Math.round(newDaily)}/day</span>
          </span>
        )}
      </div>

      {/* Confirmation Buttons */}
      {hasChanged && (
        <div className="flex justify-center gap-3 mt-3">
          <button
            onClick={onSave}
            className="text-primary-white font-medium"
            style={{
              height: 36,
              width: 100,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)',
              fontSize: 13,
            }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="text-primary-white/40 font-medium"
            style={{
              height: 36,
              width: 100,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.10)',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Transaction List */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-2">
          <span style={{ fontSize: 12 }} className="text-primary-white/30">Recent</span>
          <span style={{ fontSize: 12, color: hexToRgba('#8B5CF6', 0.7) }}>See all</span>
        </div>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-2">
            <span style={{ fontSize: 12 }} className="text-primary-white/20">No spending yet</span>
          </div>
        ) : (
          <div>
            {displayTransactions.map((t, i) => (
              <div key={t.id}>
                {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />}
                <div className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 13 }} className="text-primary-white/60 truncate">
                      {t.description || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 10 }} className="text-primary-white/25">
                      {formatTransactionDate(t.date)}
                    </div>
                  </div>
                  <span style={{ fontSize: 13 }} className="text-primary-white/50 ml-2 flex-shrink-0">
                    -€{t.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {moreCount > 0 && (
              <div className="text-center pt-1">
                <span style={{ fontSize: 11 }} className="text-primary-white/20">and {moreCount} more</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MyMoneyContent() {
  const {
    config, expenseCategories, fixedCategories, flexBudget, flexSpent,
    flexRemaining, dailyAllowance, paceStatus, getCategorySpent,
    totalFixed, transactions, updateCategory, daysRemaining,
  } = useBudget();
  const { goals } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [animated, setAnimated] = useState(false);
  const initialAnimDone = useRef(false);
  const [flashCategoryId, setFlashCategoryId] = useState<string | null>(null);

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [originalBudget, setOriginalBudget] = useState(0);

  // "Can I Afford" state
  const [affordAmount, setAffordAmount] = useState('');
  const [affordCategoryId, setAffordCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [buyItMode, setBuyItMode] = useState(false);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  const sortedCategories = useMemo(
    () => [...expenseCategories].sort((a, b) => b.monthlyBudget - a.monthlyBudget),
    [expenseCategories]
  );

  // Default afford category: expense category with most remaining budget
  useEffect(() => {
    if (expenseCategories.length > 0 && !affordCategoryId) {
      let best = expenseCategories[0];
      let bestRemaining = best.monthlyBudget - getCategorySpent(best.id, 'month');
      for (const cat of expenseCategories) {
        const rem = cat.monthlyBudget - getCategorySpent(cat.id, 'month');
        if (rem > bestRemaining) {
          best = cat;
          bestRemaining = rem;
        }
      }
      setAffordCategoryId(best.id);
    }
  }, [expenseCategories, getCategorySpent, affordCategoryId]);

  // Close category picker on outside click
  useEffect(() => {
    if (!showCategoryPicker) return;
    const handler = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setShowCategoryPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCategoryPicker]);

  // Parse afford amount
  const affordAmountNum = useMemo(() => {
    const val = parseFloat(affordAmount);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [affordAmount]);

  // Afford answer calculation
  const affordAnswer = useMemo(() => {
    if (affordAmountNum <= 0 || !affordCategoryId) return null;
    const cat = expenseCategories.find(c => c.id === affordCategoryId);
    if (!cat) return null;

    const catSpent = getCategorySpent(cat.id, 'month');
    const categoryRemaining = cat.monthlyBudget - catSpent;
    const flexRemainingAfter = flexRemaining - affordAmountNum;
    const dailyAfter = daysRemaining > 0 ? flexRemainingAfter / daysRemaining : 0;

    const withinCategory = affordAmountNum <= categoryRemaining;

    if (flexRemainingAfter <= 0) {
      return {
        text: `€${Math.abs(Math.round(flexRemainingAfter))} over budget`,
        color: '#FF9F0A',
      };
    }
    if (withinCategory && flexRemainingAfter > flexBudget * 0.30) {
      return { text: 'Yes, comfortably', color: '#34C759' };
    }
    if (withinCategory && flexRemainingAfter > flexBudget * 0.10) {
      return { text: 'Yes, but watch it', color: '#FFFFFF' };
    }
    // Tight
    return {
      text: `Tight. €${Math.round(dailyAfter)}/day left for ${daysRemaining} days`,
      color: '#FF9F0A',
    };
  }, [affordAmountNum, affordCategoryId, expenseCategories, getCategorySpent, flexRemaining, daysRemaining, flexBudget]);

  // Goal impact from afford amount
  const activeGoals = goals.filter(g => g.monthlyContribution > 0);
  const totalContributions = activeGoals.reduce((sum, g) => sum + g.monthlyContribution, 0);
  const monthlySavingsTarget = config.monthlySavingsTarget || 0;

  const affordGoalDaysLater = useMemo(() => {
    if (affordAmountNum <= 0 || totalContributions === 0) return [];
    // Spending this amount reduces flex remaining, which could mean less savings, which delays goals
    // Approximate: the amount spent reduces monthly savings proportionally
    return activeGoals.map(g => {
      const ratio = g.monthlyContribution / totalContributions;
      // If we spend affordAmountNum extra, it reduces what's available for savings
      // Simplified: proportional impact on each goal's timeline
      const oldMonths = g.monthlyContribution > 0 ? (g.target - g.saved) / g.monthlyContribution : Infinity;
      // The extra spending reduces the effective monthly contribution proportionally
      const impactOnContribution = affordAmountNum * ratio;
      const effectiveContribution = Math.max(0, g.monthlyContribution - impactOnContribution * 0.1); // 10% monthly impact from one-time spend
      const newMonths = effectiveContribution > 0 ? (g.target - g.saved) / effectiveContribution : Infinity;
      const daysLater = Math.round((newMonths - oldMonths) * 30);
      return { ...g, daysLater };
    }).filter(g => g.daysLater > 0 && isFinite(g.daysLater));
  }, [affordAmountNum, activeGoals, totalContributions]);

  // Slider-based goal diffs (from Prompt 5)
  const sliderDiff = expandedId ? sliderValue - originalBudget : 0;
  const adjustedRemaining = flexRemaining - sliderDiff;
  const adjustedDaily = daysRemaining > 0 ? Math.max(0, adjustedRemaining / daysRemaining) : 0;

  const goalDiffs = useMemo(() => {
    if (sliderDiff === 0 || totalContributions === 0) return [];
    return activeGoals.map(g => {
      const ratio = g.monthlyContribution / totalContributions;
      const goalDiff = Math.round(sliderDiff * ratio * -1);
      const oldMonths = g.monthlyContribution > 0 ? (g.target - g.saved) / g.monthlyContribution : Infinity;
      const newContribution = g.monthlyContribution + (sliderDiff * ratio * -1);
      const newMonths = newContribution > 0 ? (g.target - g.saved) / newContribution : Infinity;
      const monthsChange = oldMonths - newMonths;
      return { ...g, goalDiff, monthsChange, ratio };
    });
  }, [sliderDiff, activeGoals, totalContributions]);

  const mostAffectedGoal = useMemo(() => {
    if (goalDiffs.length === 0) return null;
    return goalDiffs.reduce((best, g) =>
      Math.abs(g.monthsChange) > Math.abs(best.monthsChange) ? g : best
    , goalDiffs[0]);
  }, [goalDiffs]);

  // Staggered fill animation on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setAnimated(true);
      setTimeout(() => { initialAnimDone.current = true; }, 600 + sortedCategories.length * 100);
    });
  }, []);

  // Flash cleanup
  useEffect(() => {
    if (!flashCategoryId) return;
    const t = setTimeout(() => setFlashCategoryId(null), 500);
    return () => clearTimeout(t);
  }, [flashCategoryId]);

  const handleTransactionClose = useCallback(() => {
    setShowAddTransaction(false);
    if (buyItMode) {
      // After successful buy-it transaction, clear afford state
      setAffordAmount('');
      setBuyItMode(false);
    }
  }, [buyItMode]);

  const handleExpand = useCallback((catId: string, budget: number) => {
    if (expandedId === catId) {
      // Collapse - auto-cancel
      setExpandedId(null);
      setSliderValue(0);
      setOriginalBudget(0);
    } else {
      // Expand new block (auto-cancels previous since we never saved)
      setExpandedId(catId);
      setSliderValue(budget);
      setOriginalBudget(budget);
    }
  }, [expandedId]);

  const handleSliderSave = useCallback(() => {
    if (expandedId) {
      updateCategory(expandedId, { monthlyBudget: Math.round(sliderValue) });
      setOriginalBudget(Math.round(sliderValue));
    }
  }, [expandedId, sliderValue, updateCategory]);

  const handleSliderCancel = useCallback(() => {
    setSliderValue(originalBudget);
  }, [originalBudget]);

  // Afford input handler
  const handleAffordInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only digits and one decimal point
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setAffordAmount(val);
    }
  }, []);

  const handleBuyIt = useCallback(() => {
    setBuyItMode(true);
    setShowAddTransaction(true);
  }, []);

  const handleClearAfford = useCallback(() => {
    setAffordAmount('');
  }, []);

  const hasExpenses = expenseCategories.length > 0;

  // Block heights
  const FIXED_BAR = 36;
  const SAVINGS_BAR = 36;
  const GAP = 6;
  const MIN_H = 56;
  const MAX_H = 160;
  const EXPAND_EXTRA = 220;

  const totalGaps = Math.max(0, sortedCategories.length - 1) * GAP;

  function blockHeight(budget: number): number {
    if (flexBudget <= 0) return MIN_H;
    const containerPx = window.innerHeight * 0.55 - FIXED_BAR - SAVINGS_BAR - totalGaps;
    const raw = (budget / flexBudget) * containerPx;
    return Math.max(MIN_H, Math.min(MAX_H, raw));
  }

  // Container ref for SVG flow lines
  const containerWrapperRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(300);

  const fixedBarText = useMemo(() => {
    if (fixedCategories.length === 0) return null;
    const items = fixedCategories.map(c => `${c.name} €${Math.round(c.monthlyBudget)}`);
    if (items.join(' · ').length > 40) {
      return `${fixedCategories.length} expenses · Fixed: €${Math.round(totalFixed)}`;
    }
    return items.join(' · ');
  }, [fixedCategories, totalFixed]);

  const PaceIcon = paceStatus === 'on-track' ? CheckCircle : paceStatus === 'watch' ? AlertTriangle : AlertCircle;
  const paceLabel = paceStatus === 'on-track' ? 'On track' : paceStatus === 'watch' ? 'Watch it' : 'Over pace';
  const paceColor = paceStatus === 'on-track' ? '#34C759' : '#FF9F0A';

  // Selected afford category info
  const selectedAffordCat = expenseCategories.find(c => c.id === affordCategoryId);
  const SelectedAffordIcon = selectedAffordCat ? (budgetIconMap[selectedAffordCat.icon] || MoreHorizontal) : MoreHorizontal;

  if (!config.setupComplete) return <SetupWizard />;

  return (
    <div className="h-full overflow-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3" style={{ height: 48 }}>
          <h1 style={{ fontSize: 22 }} className="font-bold text-primary-white">My Money</h1>
          <button onClick={() => setShowSettings(true)} className="p-2 -mr-2">
            <Sliders size={24} className="text-primary-white/50" strokeWidth={1.5} />
          </button>
        </div>

        {/* "Can I Afford" Input Row */}
        <div
          className="flex items-center gap-2 mb-3"
          style={{
            height: 48,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '0 12px',
          }}
        >
          <FlaskConical
            size={18}
            strokeWidth={1.5}
            style={{ color: affordAnswer ? affordAnswer.color : 'rgba(255,255,255,0.35)', flexShrink: 0, transition: 'color 200ms' }}
          />
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {affordAmountNum > 0 && (
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>€</span>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={affordAmount}
              onChange={handleAffordInput}
              placeholder="Can I afford €..."
              className="bg-transparent border-none outline-none flex-1 min-w-0"
              style={{
                fontSize: affordAmountNum > 0 ? 16 : 14,
                color: affordAmountNum > 0 ? 'white' : undefined,
                caretColor: 'white',
              }}
              onBlur={() => {
                if (affordAmount === '') {
                  // Clear state on blur if empty
                }
              }}
            />
            {affordAnswer && (
              <span
                style={{
                  fontSize: 13,
                  color: affordAnswer.color,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'color 200ms',
                }}
              >
                {affordAnswer.text}
              </span>
            )}
          </div>
          {/* Category Picker Pill */}
          <div className="relative" ref={categoryPickerRef} style={{ flexShrink: 0 }}>
            <button
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="flex items-center gap-1.5"
              style={{
                height: 32,
                padding: '0 10px',
                background: 'rgba(255,255,255,0.10)',
                borderRadius: 999,
              }}
            >
              <SelectedAffordIcon size={16} className="text-primary-white/40" strokeWidth={1.5} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {selectedAffordCat ? selectedAffordCat.name.slice(0, 6) : 'Cat'}
              </span>
            </button>
            {/* Dropdown */}
            <AnimatePresence>
              {showCategoryPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1"
                  style={{
                    zIndex: 50,
                    background: 'rgba(40,30,60,0.95)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.15)',
                    minWidth: 160,
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}
                >
                  {expenseCategories.map(cat => {
                    const CatIcon = budgetIconMap[cat.icon] || MoreHorizontal;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setAffordCategoryId(cat.id);
                          setShowCategoryPicker(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
                        style={{
                          background: cat.id === affordCategoryId ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                      >
                        <CatIcon size={16} className="text-primary-white/50" strokeWidth={1.5} />
                        <span style={{ fontSize: 13 }} className="text-primary-white/70">{cat.name}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Buttons (Buy it / Clear) */}
        <AnimatePresence>
          {affordAmountNum > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 mb-3"
            >
              <button
                onClick={handleBuyIt}
                className="text-primary-white font-semibold"
                style={{
                  width: 120,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)',
                  fontSize: 13,
                }}
              >
                Buy it
              </button>
              <button
                onClick={handleClearAfford}
                style={{
                  width: 80,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.10)',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goal Cards Row */}
        {goals.length > 0 && (
          <div
            className={`flex gap-3 pb-4 ${goals.length <= 3 ? 'justify-evenly' : ''}`}
            style={{
              overflowX: goals.length > 3 ? 'auto' : 'visible',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {goals.map(goal => {
              const GoalIcon = goalIconMap[goal.icon] || goalIconMap.Target;
              const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
              const isFunded = goal.saved >= goal.target;
              const diff = goalDiffs.find(d => d.id === goal.id);
              const hasDiff = diff && diff.goalDiff !== 0;
              const isPositive = diff && diff.goalDiff > 0;

              // Afford-mode goal impact
              const affordImpact = affordGoalDaysLater.find(g => g.id === goal.id);

              return (
                <div key={goal.id} className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="relative flex flex-col items-center justify-center px-2 py-2"
                    style={{
                      width: 110,
                      height: 72,
                      background: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1px solid ${isFunded ? 'rgba(52,199,89,0.25)' : hasDiff ? (isPositive ? 'rgba(52,199,89,0.15)' : 'rgba(255,159,10,0.15)') : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: 16,
                      transition: 'border-color 300ms ease',
                    }}
                  >
                    {isFunded && (
                      <CheckCircle size={10} style={{ color: 'rgba(52,199,89,0.4)', position: 'absolute', top: 6, right: 6 }} />
                    )}
                    <GoalIcon size={18} className="text-primary-white/50" strokeWidth={1.5} />
                    <span style={{ fontSize: 11 }} className="text-primary-white/60 truncate w-full text-center mt-1">
                      {goal.name}
                    </span>
                    <span style={{ fontSize: 10 }} className="text-primary-white/35">
                      €{goal.saved} / €{goal.target}
                    </span>
                    <div style={{ width: 'calc(100% - 24px)', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.10)', marginTop: 4 }}>
                      <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', borderRadius: 2, background: 'rgba(52,199,89,0.4)', transition: 'width 300ms ease' }} />
                    </div>
                  </div>
                  {/* Floating diff label (slider) */}
                  <AnimatePresence>
                    {hasDiff && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        style={{
                          fontSize: 10,
                          marginTop: 2,
                          color: isPositive ? 'rgba(52,199,89,0.5)' : 'rgba(255,159,10,0.5)',
                        }}
                      >
                        {isPositive ? '+' : ''}€{diff!.goalDiff}/mo
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {/* Afford impact label */}
                  <AnimatePresence>
                    {affordImpact && affordAmountNum > 0 && !hasDiff && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        style={{
                          fontSize: 10,
                          marginTop: 2,
                          color: 'rgba(255,159,10,0.4)',
                        }}
                      >
                        ~{affordImpact.daysLater} days later
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Flow Lines + Container Wrapper */}
        <div ref={containerWrapperRef} className="relative">
          {/* SVG Flow Lines (behind container) */}
          {goals.length > 0 && goals.some(g => g.monthlyContribution > 0) && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {goals.filter(g => g.monthlyContribution > 0).map((goal, i, arr) => {
                const cardX = goals.length <= 3
                  ? ((goals.indexOf(goal) + 0.5) / goals.length) * 100
                  : ((goals.indexOf(goal) * 110 + 55) / (goals.length * 110)) * 100;
                const barX = ((i + 0.5) / arr.length) * 100;
                const thickness = Math.min(3.5, 1.5 + (goal.monthlyContribution / (monthlySavingsTarget || 1)) * 2);
                const hasDiff = goalDiffs.find(d => d.id === goal.id);
                const lineOpacity = hasDiff && hasDiff.goalDiff > 0 ? 0.15 : hasDiff && hasDiff.goalDiff < 0 ? 0.05 : 0.08;

                return (
                  <path
                    key={goal.id}
                    d={`M ${cardX}% 0 C ${cardX}% 30%, ${barX}% 70%, ${barX}% 100%`}
                    fill="none"
                    stroke={`rgba(255,255,255,${lineOpacity})`}
                    strokeWidth={thickness}
                    strokeDasharray="4 4"
                    style={{ transition: 'stroke 500ms ease' }}
                  />
                );
              })}
            </svg>
          )}

          {/* Container */}
          <div
            className="flex flex-col overflow-hidden relative"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(255,255,255,0.20)',
              borderRadius: 20,
              boxShadow: 'inset 0 0 30px rgba(255,255,255,0.03)',
              zIndex: 1,
            }}
          >
          {/* Fixed Expenses Bar */}
          <div
            className="flex items-center justify-between px-3 flex-shrink-0"
            style={{
              height: FIXED_BAR,
              background: 'rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Lock size={12} className="text-primary-white/20 flex-shrink-0" strokeWidth={1.5} />
              <span style={{ fontSize: 11 }} className="text-primary-white/20 truncate">
                {fixedBarText || 'No fixed expenses'}
              </span>
            </div>
            <span style={{ fontSize: 11 }} className="text-primary-white/20 flex-shrink-0 ml-2">
              Fixed: €{Math.round(totalFixed)}
            </span>
          </div>

          {/* Main Area */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '6px 8px' }}>
            {!hasExpenses ? (
              <div
                className="h-full flex flex-col items-center justify-center"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              >
                <span style={{ fontSize: 16 }} className="text-primary-white/20 mb-1">
                  Your budget blocks will appear here
                </span>
                <span style={{ fontSize: 12 }} className="text-primary-white/15">
                  Add categories in Settings to get started
                </span>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: GAP }}>
                {sortedCategories.map((cat, index) => {
                  const tint = getTint(cat.icon);
                  const Icon = budgetIconMap[cat.icon] || MoreHorizontal;
                  const spent = getCategorySpent(cat.id, 'month');
                  const isExpanded = expandedId === cat.id;
                  const effectiveBudget = isExpanded ? sliderValue : cat.monthlyBudget;
                  const collapsedH = blockHeight(isExpanded ? effectiveBudget : cat.monthlyBudget);
                  const h = isExpanded ? collapsedH + EXPAND_EXTRA : collapsedH;
                  const fillPercent = effectiveBudget > 0
                    ? Math.min((spent / effectiveBudget) * 100, 110)
                    : 0;
                  const isOver = fillPercent > 100;
                  const fillColor = getFillColor(fillPercent, tint);
                  const fillRadius = fillPercent >= 100
                    ? '16px'
                    : '0 0 16px 16px';
                  const isFlashing = flashCategoryId === cat.id;

                  // Ghost fill for "Can I Afford"
                  const isAffordTarget = affordAmountNum > 0 && cat.id === affordCategoryId;
                  const ghostFillPercent = isAffordTarget && effectiveBudget > 0
                    ? (affordAmountNum / effectiveBudget) * 100
                    : 0;
                  const combinedPercent = fillPercent + ghostFillPercent;
                  const isGhostOverflow = combinedPercent > 100;

                  // Dim other blocks when afford ghost is active
                  const shouldDim = affordAmountNum > 0 && cat.id !== affordCategoryId;

                  // Get transactions for this category
                  const catTransactions = transactions.filter(t => t.type === 'expense' && t.categoryId === cat.id);

                  return (
                    <motion.div
                      key={cat.id}
                      className="relative flex-shrink-0 overflow-hidden cursor-pointer"
                      animate={{ height: h, opacity: shouldDim ? 0.85 : 1 }}
                      transition={{ type: 'spring', duration: 0.3, damping: 25 }}
                      onClick={() => handleExpand(cat.id, cat.monthlyBudget)}
                      style={{
                        borderRadius: 16,
                        background: `linear-gradient(135deg, ${hexToRgba(tint, 0.25)}, rgba(255,255,255,0.08))`,
                        border: `1.5px solid ${isOver ? hexToRgba('#FF9F0A', 0.35) : hexToRgba(tint, 0.20)}`,
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                    >
                      {/* Fill */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          height: animated ? `${fillPercent}%` : '0%',
                          background: fillColor,
                          borderRadius: fillRadius,
                          transition: 'height 600ms ease-out',
                          transitionDelay: initialAnimDone.current ? '0ms' : `${index * 100}ms`,
                        }}
                      />

                      {/* Ghost Fill */}
                      {isAffordTarget && ghostFillPercent > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: `${Math.min(fillPercent, 100)}%`,
                            left: 0,
                            width: '100%',
                            height: `${isGhostOverflow ? Math.max(0, 100 - fillPercent) : ghostFillPercent}%`,
                            background: isGhostOverflow
                              ? 'rgba(255,159,10,0.20)'
                              : 'rgba(255,255,255,0.15)',
                            borderTop: '2px dashed rgba(255,255,255,0.20)',
                            animation: 'ghostPulse 2s ease-in-out infinite',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'bottom 200ms ease, height 200ms ease',
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                            +€{Math.round(affordAmountNum)}
                          </span>
                        </div>
                      )}

                      {/* Ghost overflow above block */}
                      {isAffordTarget && isGhostOverflow && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${Math.min(combinedPercent - 100, 15)}%`,
                            background: 'rgba(255,159,10,0.20)',
                            borderBottom: '2px dashed rgba(255,159,10,0.30)',
                            animation: 'ghostPulse 2s ease-in-out infinite',
                            borderRadius: '16px 16px 0 0',
                          }}
                        />
                      )}

                      {/* Flash overlay */}
                      {isFlashing && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(255,255,255,0.10)',
                            borderRadius: 16,
                            animation: 'fadeOut 500ms ease-out forwards',
                          }}
                        />
                      )}

                      {/* Content */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between" style={{ zIndex: 1 }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={20} className="text-primary-white/70 flex-shrink-0" strokeWidth={1.5} />
                          <span style={{ fontSize: 14 }} className="font-semibold text-primary-white truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 13 }} className="flex-shrink-0 ml-2">
                          <span className={spent === 0 ? 'text-primary-white/30' : 'text-primary-white/70'}>
                            €{Math.round(spent)}
                          </span>
                          <span className="text-primary-white/50"> / €{Math.round(effectiveBudget)}</span>
                        </span>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <div style={{ marginTop: collapsedH }}>
                            <ExpandedContent
                              cat={cat}
                              tint={tint}
                              sliderValue={sliderValue}
                              originalBudget={originalBudget}
                              flexRemaining={flexRemaining}
                              daysRemaining={daysRemaining}
                              dailyAllowance={dailyAllowance}
                              transactions={catTransactions}
                              onSliderChange={setSliderValue}
                              onSave={handleSliderSave}
                              onCancel={handleSliderCancel}
                            />
                          </div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Savings Bar */}
          <div
            className="flex items-center justify-between px-3 flex-shrink-0"
            style={{
              height: SAVINGS_BAR,
              background: 'rgba(52,199,89,0.08)',
              borderTop: '1px solid rgba(52,199,89,0.12)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <PiggyBank size={12} style={{ color: 'rgba(52,199,89,0.3)' }} strokeWidth={1.5} />
              <span style={{ fontSize: 11 }} className="text-primary-white/25">
                {config.monthlySavingsTarget > 0
                  ? `Savings €${Math.round(config.monthlySavingsTarget)}/mo`
                  : 'Savings: not set'}
              </span>
            </div>
            <ShieldCheck size={12} className="text-primary-white/15" strokeWidth={1.5} />
           </div>
          </div>
        </div>{/* End flow lines + container wrapper */}

        {/* Impact Summary Row */}
        <div
          className="mt-3 flex flex-col px-4"
          style={{
            minHeight: 40,
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '8px 16px',
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13 }} className="text-primary-white/50">
              €{Math.round(adjustedRemaining)} left
            </span>
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-primary-white font-medium"
              style={{ fontSize: 11, background: hexToRgba(paceColor, 0.7) }}
            >
              <PaceIcon size={12} strokeWidth={1.5} />
              {paceLabel}
            </span>
            <span style={{ fontSize: 13 }} className="text-primary-white/50">
              €{Math.round(adjustedDaily)}/day
            </span>
          </div>
          {/* Goal impact line during slider drag */}
          {mostAffectedGoal && sliderDiff !== 0 && (
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {mostAffectedGoal.monthsChange > 0 ? (
                <span style={{ color: 'rgba(52,199,89,0.4)' }}>
                  {mostAffectedGoal.name}: {Math.round(mostAffectedGoal.monthsChange)} months sooner
                </span>
              ) : (
                <span style={{ color: 'rgba(255,159,10,0.4)' }}>
                  {mostAffectedGoal.name}: {Math.abs(Math.round(mostAffectedGoal.monthsChange))} months later
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddTransaction(true)}
        className="fixed z-50 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          bottom: 80,
          right: 20,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)',
          boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
        }}
      >
        <Plus size={24} className="text-primary-white" strokeWidth={2} />
      </button>

      <EditBudgetSheet open={showSettings} onClose={() => setShowSettings(false)} />
      <AddTransactionSheet
        open={showAddTransaction}
        onClose={handleTransactionClose}
        prefillAmount={buyItMode ? affordAmountNum : undefined}
        prefillCategoryId={buyItMode ? (affordCategoryId || undefined) : undefined}
      />
    </div>
  );
}

export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
