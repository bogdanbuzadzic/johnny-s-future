import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Plus, Sliders, Lock, PiggyBank, ShieldCheck, CheckCircle, AlertTriangle, AlertCircle, FlaskConical, ChevronDown, Target } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
  Gift, BookOpen, Shirt, Wrench, Heart,
  Plane, Car, Home, Laptop, GraduationCap, Gamepad2,
} from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';
import { JohnnyTip } from '@/components/budget/JohnnyTip';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isYesterday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { useApp, iconMap as goalIconMap, Goal } from '@/context/AppContext';

const budgetIconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
  Gift, BookOpen, Shirt, Wrench, Heart,
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
  Gift: '#FFD700',
  BookOpen: '#007AFF',
  Shirt: '#8B5CF6',
  Wrench: '#5AC8FA',
  Heart: '#FF6B9D',
};

const goalTintMap: Record<string, string> = {
  ShieldCheck: '#34C759',
  Plane: '#5AC8FA',
  Car: '#007AFF',
  Home: '#6366F1',
  Laptop: '#8B5CF6',
  GraduationCap: '#14B8A6',
  Target: '#34C759',
  Heart: '#FF6B9D',
  Dumbbell: '#34C759',
  Gamepad2: '#5AC8FA',
};

const addCatIconOptions = [
  'UtensilsCrossed', 'ShoppingBag', 'Bus', 'Film', 'Dumbbell', 'CreditCard',
  'Coffee', 'Smartphone', 'Gift', 'BookOpen', 'Shirt', 'Wrench', 'Heart', 'MoreHorizontal',
];

const addGoalIconOptions = [
  'ShieldCheck', 'Plane', 'Car', 'Home', 'Laptop', 'GraduationCap', 'Heart', 'Target', 'Dumbbell', 'Gamepad2',
];

type TimeZoom = 'month' | 'year' | '5year';
const zoomMultiplier: Record<TimeZoom, number> = { month: 1, year: 12, '5year': 60 };
const zoomLabel: Record<TimeZoom, string> = { month: 'Month', year: 'Year', '5year': '5 Year' };
const zoomSuffix: Record<TimeZoom, string> = { month: '/mo', year: '/yr', '5year': ' / 5yr' };

function getTint(icon: string): string {
  return tintMap[icon] || '#FFFFFF';
}

function getGoalTint(icon: string): string {
  return goalTintMap[icon] || '#34C759';
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

// Expanded content for spending blocks
function ExpandedSpendingContent({
  cat, tint, sliderValue, originalBudget, flexRemaining, daysRemaining, dailyAllowance, transactions,
  onSliderChange, onSave, onCancel, goalImpactText,
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
  goalImpactText: { text: string; color: string } | null;
}) {
  const max = originalBudget + flexRemaining;
  const diff = sliderValue - originalBudget;
  const hasChanged = Math.round(sliderValue) !== Math.round(originalBudget);
  const newFlexRemaining = flexRemaining - diff;
  const newDaily = daysRemaining > 0 ? newFlexRemaining / daysRemaining : 0;
  const originalDaily = dailyAllowance;
  const fillPercent = max > 0 ? (sliderValue / max) * 100 : 0;

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

  const thumbSize = 28;
  const rangeStyle = `
    input[type="range"].budget-slider-${cat.id} {
      -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; outline: none;
      background: linear-gradient(to right, ${hexToRgba(tint, 0.35)} ${fillPercent}%, rgba(255,255,255,0.10) ${fillPercent}%);
    }
    input[type="range"].budget-slider-${cat.id}::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none; width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%;
      background: white; border: 2.5px solid ${tint}; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer;
    }
    input[type="range"].budget-slider-${cat.id}::-moz-range-thumb {
      width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%;
      background: white; border: 2.5px solid ${tint}; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer;
    }
  `;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      className="relative px-3 pb-3" style={{ zIndex: 2 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />
      <div className="flex flex-col gap-1">
        <div className="text-center">
          <span style={{ fontSize: 18 }} className="font-bold text-primary-white">€{Math.round(sliderValue)}</span>
        </div>
        <div className="px-0">
          <style>{rangeStyle}</style>
          <input type="range" className={`budget-slider-${cat.id}`} min={0} max={Math.round(max)}
            value={Math.round(sliderValue)} onChange={(e) => onSliderChange(Number(e.target.value))} style={{ width: '100%' }} />
          <div className="flex justify-between mt-0.5">
            <span style={{ fontSize: 10 }} className="text-primary-white/15">€0</span>
            <span style={{ fontSize: 10 }} className="text-primary-white/15">€{Math.round(max)}</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 8 }}>
        {!hasChanged ? (
          <span className="text-primary-white/25">Drag the slider to adjust this budget</span>
        ) : diff < 0 ? (
          <span className="text-primary-white/60">
            Reducing by €{Math.abs(Math.round(diff))} frees up €{Math.abs(Math.round(diff))}/month. Daily: €{Math.round(originalDaily)}{' '}
            <span style={{ color: hexToRgba('#34C759', 0.7) }}>→ €{Math.round(newDaily)}/day</span>
          </span>
        ) : (
          <span className="text-primary-white/60">
            Adding €{Math.round(diff)} tightens budget. Daily: €{Math.round(originalDaily)}{' '}
            <span style={{ color: hexToRgba('#FF9F0A', 0.7) }}>→ €{Math.round(newDaily)}/day</span>
          </span>
        )}
      </div>
      {/* Goal impact from spending slider */}
      {goalImpactText && hasChanged && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          <span style={{ color: goalImpactText.color }}>{goalImpactText.text}</span>
        </div>
      )}
      {hasChanged && (
        <div className="flex justify-center gap-3 mt-3">
          <button onClick={onSave} className="text-primary-white font-medium"
            style={{ height: 36, width: 100, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)', fontSize: 13 }}>Save</button>
          <button onClick={onCancel} className="text-primary-white/40 font-medium"
            style={{ height: 36, width: 100, borderRadius: 12, background: 'rgba(255,255,255,0.10)', fontSize: 13 }}>Cancel</button>
        </div>
      )}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-2">
          <span style={{ fontSize: 12 }} className="text-primary-white/30">Recent</span>
          <span style={{ fontSize: 12, color: hexToRgba('#8B5CF6', 0.7) }}>See all</span>
        </div>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-2"><span style={{ fontSize: 12 }} className="text-primary-white/20">No spending yet</span></div>
        ) : (
          <div>
            {displayTransactions.map((t, i) => (
              <div key={t.id}>
                {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />}
                <div className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 13 }} className="text-primary-white/60 truncate">{t.description || 'Untitled'}</div>
                    <div style={{ fontSize: 10 }} className="text-primary-white/25">{formatTransactionDate(t.date)}</div>
                  </div>
                  <span style={{ fontSize: 13 }} className="text-primary-white/50 ml-2 flex-shrink-0">-€{t.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {moreCount > 0 && (
              <div className="text-center pt-1"><span style={{ fontSize: 11 }} className="text-primary-white/20">and {moreCount} more</span></div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Expanded content for goal blocks
function ExpandedGoalContent({
  goal, flexRemaining, onSliderChange, onSave, onCancel, contributionValue, originalContribution,
}: {
  goal: Goal;
  flexRemaining: number;
  onSliderChange: (val: number) => void;
  onSave: () => void;
  onCancel: () => void;
  contributionValue: number;
  originalContribution: number;
}) {
  const max = originalContribution + flexRemaining;
  const hasChanged = Math.round(contributionValue) !== Math.round(originalContribution);
  const progressPercent = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
  const remaining = goal.target - goal.saved;
  const monthsToGoal = contributionValue > 0 ? Math.ceil(remaining / contributionValue) : Infinity;
  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + (isFinite(monthsToGoal) ? monthsToGoal : 0));
  const completionStr = isFinite(monthsToGoal) ? format(completionDate, 'MMM yyyy') : 'Never';

  const origMonths = originalContribution > 0 ? Math.ceil(remaining / originalContribution) : Infinity;
  const monthsDiff = isFinite(origMonths) && isFinite(monthsToGoal) ? origMonths - monthsToGoal : 0;

  const fillPercent = max > 0 ? (contributionValue / max) * 100 : 0;
  const thumbSize = 28;
  const green = '#34C759';
  const rangeStyle = `
    input[type="range"].goal-slider-${goal.id} {
      -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; outline: none;
      background: linear-gradient(to right, ${hexToRgba(green, 0.35)} ${fillPercent}%, rgba(255,255,255,0.10) ${fillPercent}%);
    }
    input[type="range"].goal-slider-${goal.id}::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none; width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%;
      background: white; border: 2.5px solid ${green}; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer;
    }
    input[type="range"].goal-slider-${goal.id}::-moz-range-thumb {
      width: ${thumbSize}px; height: ${thumbSize}px; border-radius: 50%;
      background: white; border: 2.5px solid ${green}; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer;
    }
  `;

  // Progress ring
  const ringSize = 80;
  const strokeW = 6;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercent / 100) * circumference;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      className="relative px-3 pb-3" style={{ zIndex: 2 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />

      {/* Progress Ring - purple-to-pink gradient */}
      <div className="flex flex-col items-center mb-3">
        <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`expandedGoalGrad-${goal.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={progressPercent >= 100 ? '#34C759' : '#8B5CF6'} />
              <stop offset="100%" stopColor={progressPercent >= 100 ? '#34C759' : '#FF6B9D'} />
            </linearGradient>
          </defs>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} />
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={`url(#expandedGoalGrad-${goal.id})`}
            strokeWidth={strokeW} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 16 }} className="text-primary-white mt-1">€{goal.saved} of €{goal.target}</span>
        <span style={{ fontSize: 13 }} className="text-primary-white/40">{Math.round(progressPercent)}% funded</span>
      </div>

      {/* Contribution Slider */}
      <div className="flex flex-col gap-1">
        <div className="text-center">
          <span style={{ fontSize: 18 }} className="font-bold text-primary-white">€{Math.round(contributionValue)}/month</span>
        </div>
        <div className="px-0">
          <style>{rangeStyle}</style>
          <input type="range" className={`goal-slider-${goal.id}`} min={0} max={Math.round(max)}
            value={Math.round(contributionValue)} onChange={(e) => onSliderChange(Number(e.target.value))} style={{ width: '100%' }} />
          <div className="flex justify-between mt-0.5">
            <span style={{ fontSize: 10 }} className="text-primary-white/15">€0</span>
            <span style={{ fontSize: 10 }} className="text-primary-white/15">€{Math.round(max)}</span>
          </div>
        </div>
      </div>

      {/* Impact Text */}
      <div style={{ fontSize: 13, marginTop: 8 }} className="text-primary-white/50">
        {contributionValue > 0 ? (
          <span>At €{Math.round(contributionValue)}/month, reach goal in {isFinite(monthsToGoal) ? monthsToGoal : '∞'} months ({completionStr})</span>
        ) : (
          <span className="text-primary-white/25">Set a monthly contribution to start saving</span>
        )}
      </div>
      {hasChanged && monthsDiff !== 0 && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {monthsDiff > 0 ? (
            <span style={{ color: hexToRgba('#34C759', 0.5) }}>Reaching {Math.abs(monthsDiff)} months sooner</span>
          ) : (
            <span style={{ color: hexToRgba('#FF9F0A', 0.5) }}>Reaching {Math.abs(monthsDiff)} months later</span>
          )}
        </div>
      )}

      {/* Timeline Bar */}
      <div className="mt-3">
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 10 }} className="text-primary-white/20">Now</span>
          <span style={{ fontSize: 10 }} className="text-primary-white/20">€{goal.target}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 3,
            background: progressPercent >= 100 ? 'rgba(52,199,89,0.3)' : 'linear-gradient(90deg, #8B5CF6, #FF6B9D)',
            transition: 'width 300ms ease' }} />
        </div>
        {isFinite(monthsToGoal) && (
          <div className="text-right mt-0.5">
            <span style={{ fontSize: 10 }} className="text-primary-white/30">{completionStr}</span>
          </div>
        )}
      </div>

      {/* Save/Cancel */}
      {hasChanged && (
        <div className="flex justify-center gap-3 mt-3">
          <button onClick={onSave} className="text-primary-white font-medium"
            style={{ height: 36, width: 100, borderRadius: 12, background: 'linear-gradient(135deg, #34C759, #14B8A6)', fontSize: 13 }}>Save</button>
          <button onClick={onCancel} className="text-primary-white/40 font-medium"
            style={{ height: 36, width: 100, borderRadius: 12, background: 'rgba(255,255,255,0.10)', fontSize: 13 }}>Cancel</button>
        </div>
      )}
    </motion.div>
  );
}

function MyMoneyContent() {
  const {
    config, expenseCategories, fixedCategories, flexBudget, flexSpent,
    flexRemaining, dailyAllowance, paceStatus, getCategorySpent,
    totalFixed, transactions, updateCategory, daysRemaining, addCategory,
  } = useBudget();
  const { goals, addGoal, updateGoal } = useApp();

  // Pre-compute category spent map for consistent data flow
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of expenseCategories) {
      map[cat.id] = getCategorySpent(cat.id, 'month');
    }
    return map;
  }, [expenseCategories, getCategorySpent]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [animated, setAnimated] = useState(false);
  const initialAnimDone = useRef(false);
  const [flashCategoryId, setFlashCategoryId] = useState<string | null>(null);

  // Time zoom
  const [timeZoom, setTimeZoom] = useState<TimeZoom>('month');
  const multiplier = zoomMultiplier[timeZoom];

  // Expand state (works for both spending and goal blocks)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<'spending' | 'goal' | null>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [originalBudget, setOriginalBudget] = useState(0);

  // "Can I Afford" state
  const [affordAmount, setAffordAmount] = useState('');
  const [affordCategoryId, setAffordCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [buyItMode, setBuyItMode] = useState(false);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  // Add Category form state
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [iconPickerFlash, setIconPickerFlash] = useState(false);

  // Add Goal form state
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoalIcon, setNewGoalIcon] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalContribution, setNewGoalContribution] = useState('');

  // Default afford category
  useEffect(() => {
    if (expenseCategories.length > 0 && !affordCategoryId) {
      let best = expenseCategories[0];
      let bestRemaining = best.monthlyBudget - (categorySpentMap[best.id] || 0);
      for (const cat of expenseCategories) {
        const rem = cat.monthlyBudget - (categorySpentMap[cat.id] || 0);
        if (rem > bestRemaining) { best = cat; bestRemaining = rem; }
      }
      setAffordCategoryId(best.id);
    }
  }, [expenseCategories, categorySpentMap, affordCategoryId]);

  // Close category picker on outside click
  useEffect(() => {
    if (!showCategoryPicker) return;
    const handler = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) setShowCategoryPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCategoryPicker]);

  const affordAmountNum = useMemo(() => {
    const val = parseFloat(affordAmount);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [affordAmount]);

  const affordAnswer = useMemo(() => {
    if (affordAmountNum <= 0 || !affordCategoryId) return null;
    const cat = expenseCategories.find(c => c.id === affordCategoryId);
    if (!cat) return null;
    const catSpent = categorySpentMap[cat.id] || 0;
    const categoryRemaining = cat.monthlyBudget - catSpent;
    const flexRemainingAfter = flexRemaining - affordAmountNum;
    const dailyAfter = daysRemaining > 0 ? flexRemainingAfter / daysRemaining : 0;
    const withinCategory = affordAmountNum <= categoryRemaining;
    if (flexRemainingAfter <= 0) return { text: `€${Math.abs(Math.round(flexRemainingAfter))} over budget`, color: '#FF9F0A' };
    if (withinCategory && flexRemainingAfter > flexBudget * 0.30) return { text: 'Yes, comfortably', color: '#34C759' };
    if (withinCategory && flexRemainingAfter > flexBudget * 0.10) return { text: 'Yes, but watch it', color: '#FFFFFF' };
    return { text: `Tight. €${Math.round(dailyAfter)}/day left for ${daysRemaining} days`, color: '#FF9F0A' };
  }, [affordAmountNum, affordCategoryId, expenseCategories, categorySpentMap, flexRemaining, daysRemaining, flexBudget]);

  // Goal impact calculations
  const activeGoals = goals.filter(g => g.monthlyContribution > 0);
  const totalContributions = activeGoals.reduce((sum, g) => sum + g.monthlyContribution, 0);

  // Slider-based goal diffs
  const sliderDiff = expandedId && expandedType === 'spending' ? sliderValue - originalBudget : 0;
  const adjustedRemaining = flexRemaining - sliderDiff;
  const adjustedDaily = daysRemaining > 0 ? Math.max(0, adjustedRemaining / daysRemaining) : 0;

  const mostAffectedGoal = useMemo(() => {
    if (sliderDiff === 0 || totalContributions === 0) return null;
    const diffs = activeGoals.map(g => {
      const ratio = g.monthlyContribution / totalContributions;
      const oldMonths = g.monthlyContribution > 0 ? (g.target - g.saved) / g.monthlyContribution : Infinity;
      const newContribution = g.monthlyContribution + (sliderDiff * ratio * -1);
      const newMonths = newContribution > 0 ? (g.target - g.saved) / newContribution : Infinity;
      const monthsChange = oldMonths - newMonths;
      return { ...g, monthsChange };
    });
    return diffs.reduce((best, g) => Math.abs(g.monthsChange) > Math.abs(best.monthsChange) ? g : best, diffs[0]);
  }, [sliderDiff, activeGoals, totalContributions]);

  const goalImpactText = useMemo(() => {
    if (!mostAffectedGoal || sliderDiff === 0) return null;
    if (sliderDiff < 0) {
      return {
        text: `If moved to savings: ${mostAffectedGoal.name} reaches target ${Math.abs(Math.round(mostAffectedGoal.monthsChange))} months sooner`,
        color: hexToRgba('#34C759', 0.5),
      };
    }
    return {
      text: `Savings pressure: ${mostAffectedGoal.name} may be delayed ${Math.abs(Math.round(mostAffectedGoal.monthsChange))} months`,
      color: hexToRgba('#FF9F0A', 0.5),
    };
  }, [mostAffectedGoal, sliderDiff]);

  // Staggered fill animation on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setAnimated(true);
      setTimeout(() => { initialAnimDone.current = true; }, 800);
    });
  }, []);

  useEffect(() => {
    if (!flashCategoryId) return;
    const t = setTimeout(() => setFlashCategoryId(null), 500);
    return () => clearTimeout(t);
  }, [flashCategoryId]);

  const handleTransactionClose = useCallback(() => {
    setShowAddTransaction(false);
    if (buyItMode) { setAffordAmount(''); setBuyItMode(false); }
  }, [buyItMode]);

  const handleExpand = useCallback((id: string, budget: number, type: 'spending' | 'goal') => {
    if (expandedId === id) {
      setExpandedId(null); setExpandedType(null); setSliderValue(0); setOriginalBudget(0);
    } else {
      setExpandedId(id); setExpandedType(type); setSliderValue(budget); setOriginalBudget(budget);
    }
  }, [expandedId]);

  const handleSliderSave = useCallback(() => {
    if (expandedId && expandedType === 'spending') {
      updateCategory(expandedId, { monthlyBudget: Math.round(sliderValue) });
      setOriginalBudget(Math.round(sliderValue));
    } else if (expandedId && expandedType === 'goal') {
      updateGoal(expandedId, { monthlyContribution: Math.round(sliderValue) });
      setOriginalBudget(Math.round(sliderValue));
    }
  }, [expandedId, expandedType, sliderValue, updateCategory, updateGoal]);

  const handleSliderCancel = useCallback(() => { setSliderValue(originalBudget); }, [originalBudget]);

  const handleAffordInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setAffordAmount(val);
  }, []);

  const handleBuyIt = useCallback(() => { setBuyItMode(true); setShowAddTransaction(true); }, []);
  const handleClearAfford = useCallback(() => { setAffordAmount(''); }, []);

  // Add Category handlers
  const handleCreateCategory = useCallback(() => {
    if (!newCatIcon) { setIconPickerFlash(true); setTimeout(() => setIconPickerFlash(false), 600); return; }
    if (!newCatName.trim() || !newCatBudget) return;
    const parsed = parseFloat(newCatBudget);
    if (isNaN(parsed) || parsed <= 0) return;
    addCategory({ name: newCatName.trim(), icon: newCatIcon, monthlyBudget: parsed, type: 'expense' });
    setShowAddCatForm(false); setNewCatIcon(''); setNewCatName(''); setNewCatBudget('');
  }, [newCatIcon, newCatName, newCatBudget, addCategory]);

  const handleCancelAddCat = useCallback(() => {
    setShowAddCatForm(false); setNewCatIcon(''); setNewCatName(''); setNewCatBudget('');
  }, []);

  const handleNewCatBudgetInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setNewCatBudget(val);
  }, []);

  // Add Goal handlers
  const handleCreateGoal = useCallback(() => {
    if (!newGoalIcon || !newGoalName.trim() || !newGoalTarget || !newGoalContribution) return;
    const target = parseFloat(newGoalTarget);
    const contribution = parseFloat(newGoalContribution);
    if (isNaN(target) || target <= 0 || isNaN(contribution) || contribution < 0) return;
    const months = contribution > 0 ? Math.ceil(target / contribution) : -1;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + (months > 0 ? months : 0));
    addGoal({
      name: newGoalName.trim(), icon: newGoalIcon, target, saved: 0, monthlyContribution: contribution,
      targetDate: months > 0 ? format(targetDate, 'MMM yyyy') : 'Not started', monthIndex: months > 0 ? months : -1,
    });
    setShowAddGoalForm(false); setNewGoalIcon(''); setNewGoalName(''); setNewGoalTarget(''); setNewGoalContribution('');
  }, [newGoalIcon, newGoalName, newGoalTarget, newGoalContribution, addGoal]);

  const handleCancelAddGoal = useCallback(() => {
    setShowAddGoalForm(false); setNewGoalIcon(''); setNewGoalName(''); setNewGoalTarget(''); setNewGoalContribution('');
  }, []);

  const newCatBudgetNum = parseFloat(newCatBudget) || 0;
  const newCatTint = newCatIcon ? getTint(newCatIcon) : '#FFFFFF';
  const createCatDisabled = !newCatIcon || !newCatName.trim() || newCatBudgetNum <= 0;
  const createGoalDisabled = !newGoalIcon || !newGoalName.trim() || !(parseFloat(newGoalTarget) > 0);

  // Size tier calculation for grid layout - now zoom-aware
  const totalIncomeForZoom = config.monthlyIncome * multiplier;

  function getSizeTier(amount: number): { colSpan: number; rowSpan: number; tier: 'huge' | 'large' | 'medium' | 'small' } {
    if (totalIncomeForZoom <= 0) return { colSpan: 1, rowSpan: 1, tier: 'small' };
    const sizeRatio = amount / totalIncomeForZoom;
    if (sizeRatio > 0.25) return { colSpan: 3, rowSpan: 2, tier: 'huge' };
    if (sizeRatio > 0.15) return { colSpan: 2, rowSpan: 2, tier: 'large' };
    if (sizeRatio > 0.08) return { colSpan: 2, rowSpan: 1, tier: 'medium' };
    return { colSpan: 1, rowSpan: 1, tier: 'small' };
  }

  // Build unified block array
  type UnifiedBlock =
    | { type: 'spending'; id: string; amount: number; data: typeof expenseCategories[0] }
    | { type: 'goal'; id: string; amount: number; data: Goal }
    | { type: 'add-category'; id: string; amount: -1 }
    | { type: 'add-goal'; id: string; amount: -2 };

  const unifiedBlocks = useMemo<UnifiedBlock[]>(() => {
    const blocks: UnifiedBlock[] = [];
    for (const cat of expenseCategories) {
      const amt = cat.monthlyBudget * multiplier;
      blocks.push({ type: 'spending', id: cat.id, amount: amt, data: cat });
    }
    for (const goal of goals) {
      const amt = timeZoom === '5year' ? goal.target : goal.monthlyContribution * multiplier;
      blocks.push({ type: 'goal', id: `goal-${goal.id}`, amount: amt, data: goal });
    }
    blocks.sort((a, b) => b.amount - a.amount);
    blocks.push({ type: 'add-category', id: 'add-cat', amount: -1 });
    blocks.push({ type: 'add-goal', id: 'add-goal', amount: -2 });
    return blocks;
  }, [expenseCategories, goals, multiplier, timeZoom]);

  // Johnny size
  const spaceRatio = flexBudget > 0 ? (flexRemaining - (expandedId && expandedType === 'spending' ? sliderValue - originalBudget : 0)) / flexBudget : 1;
  const isOverflow = spaceRatio <= 0;
  const overAmount = isOverflow ? Math.abs(Math.round(flexRemaining - (expandedId && expandedType === 'spending' ? sliderValue - originalBudget : 0))) : 0;

  const johnnyAffordState = useMemo(() => {
    if (!affordAnswer || affordAmountNum <= 0) return 'happy';
    if (affordAnswer.color === '#34C759') return 'happy';
    if (affordAnswer.color === '#FFFFFF') return 'thinking';
    return 'stressed';
  }, [affordAnswer, affordAmountNum]);

  const hasExpenses = expenseCategories.length > 0 || goals.length > 0;
  const GAP = 6;

  // Fixed bar text scaled by zoom
  const fixedBarText = useMemo(() => {
    if (fixedCategories.length === 0) return null;
    const items = fixedCategories.map(c => `${c.name} €${Math.round(c.monthlyBudget * multiplier)}`);
    if (items.join(' · ').length > 40) {
      return `${fixedCategories.length} expenses · Fixed: €${Math.round(totalFixed * multiplier)}`;
    }
    return items.join(' · ');
  }, [fixedCategories, totalFixed, multiplier]);

  const PaceIcon = paceStatus === 'on-track' ? CheckCircle : paceStatus === 'watch' ? AlertTriangle : AlertCircle;
  const paceLabel = paceStatus === 'on-track' ? 'On track' : paceStatus === 'watch' ? 'Watch it' : 'Over pace';
  const paceColor = paceStatus === 'on-track' ? '#34C759' : '#FF9F0A';

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
        <div className="flex items-center gap-2 mb-3" style={{
          height: 48, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16, padding: '0 12px',
        }}>
          <FlaskConical size={18} strokeWidth={1.5} style={{ color: affordAnswer ? affordAnswer.color : 'rgba(255,255,255,0.35)', flexShrink: 0, transition: 'color 200ms' }} />
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {affordAmountNum > 0 && <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>€</span>}
            <input type="text" inputMode="decimal" value={affordAmount} onChange={handleAffordInput} placeholder="Can I afford €..."
              className="bg-transparent border-none outline-none flex-1 min-w-0"
              style={{ fontSize: affordAmountNum > 0 ? 16 : 14, color: affordAmountNum > 0 ? 'white' : undefined, caretColor: 'white' }} />
            {affordAnswer && (
              <span style={{ fontSize: 13, color: affordAnswer.color, flexShrink: 0, whiteSpace: 'nowrap', transition: 'color 200ms' }}>
                {affordAnswer.text}
              </span>
            )}
          </div>
          <div className="relative" ref={categoryPickerRef} style={{ flexShrink: 0 }}>
            <button onClick={() => setShowCategoryPicker(!showCategoryPicker)} className="flex items-center gap-1.5"
              style={{ height: 32, padding: '0 10px', background: 'rgba(255,255,255,0.10)', borderRadius: 999 }}>
              <SelectedAffordIcon size={16} className="text-primary-white/40" strokeWidth={1.5} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{selectedAffordCat ? selectedAffordCat.name.slice(0, 6) : 'Cat'}</span>
            </button>
            <AnimatePresence>
              {showCategoryPicker && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1" style={{
                    zIndex: 50, background: 'rgba(40,30,60,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', minWidth: 160, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}>
                  {expenseCategories.map(cat => {
                    const CatIcon = budgetIconMap[cat.icon] || MoreHorizontal;
                    return (
                      <button key={cat.id} onClick={() => { setAffordCategoryId(cat.id); setShowCategoryPicker(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
                        style={{ background: cat.id === affordCategoryId ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }} className="flex gap-2 mb-3">
              <button onClick={handleBuyIt} className="text-primary-white font-semibold"
                style={{ width: 120, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)', fontSize: 13 }}>Buy it</button>
              <button onClick={handleClearAfford}
                style={{ width: 80, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Clear</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Container */}
        <div className="relative">
          <div className="flex flex-col overflow-hidden relative" style={{
            background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.20)', borderRadius: 20,
            boxShadow: isOverflow ? 'inset 0 0 30px rgba(255,255,255,0.03), 0 -6px 20px rgba(255,159,10,0.25)' : 'inset 0 0 30px rgba(255,255,255,0.03)',
            zIndex: 1, transition: 'box-shadow 400ms ease',
          }}>
            {/* Fixed Expenses Bar + Time Zoom Toggle */}
            <div className="flex items-center justify-between px-3 flex-shrink-0" style={{
              height: 36, background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Lock size={12} className="text-primary-white/20 flex-shrink-0" strokeWidth={1.5} />
                <span style={{ fontSize: 11 }} className="text-primary-white/20 truncate">
                  {fixedBarText || 'No fixed expenses'}
                </span>
              </div>
              {/* Time Zoom Toggle */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {(['month', 'year', '5year'] as TimeZoom[]).map(z => (
                  <button key={z} onClick={() => setTimeZoom(z)}
                    className="text-primary-white font-medium transition-all duration-200"
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 999,
                      background: timeZoom === z ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.08)',
                      color: timeZoom === z ? 'white' : 'rgba(255,255,255,0.40)',
                    }}>
                    {zoomLabel[z]}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '6px 8px' }}>
              {!hasExpenses ? (
                <div className="flex flex-col items-center justify-center" style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                  backgroundSize: '24px 24px', minHeight: 200,
                }}>
                  <span style={{ fontSize: 16 }} className="text-primary-white/25 mb-2">Let's build your budget!</span>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                    <img src={johnnyImage} alt="Johnny" style={{ width: 48, height: 48 }} />
                  </motion.div>
                  <span style={{ fontSize: 12 }} className="text-primary-white/15 mt-2">Tap the + below to create your first category</span>
                </div>
              ) : (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gridAutoRows: 'minmax(60px, auto)', gap: GAP, padding: 0,
                }}>
                  {unifiedBlocks.map((block, index) => {
                    if (block.type === 'spending') {
                      return <SpendingBlock key={block.id} cat={block.data} index={index} amount={block.amount}
                        getSizeTier={getSizeTier} expandedId={expandedId} sliderValue={sliderValue} originalBudget={originalBudget}
                        animated={animated} initialAnimDone={initialAnimDone} flashCategoryId={flashCategoryId}
                        affordAmountNum={affordAmountNum} affordCategoryId={affordCategoryId}
                        spent={categorySpentMap[block.data.id] || 0}
                        transactions={transactions}
                        flexRemaining={flexRemaining} daysRemaining={daysRemaining} dailyAllowance={dailyAllowance}
                        onExpand={(id, budget) => handleExpand(id, budget, 'spending')}
                        onSliderChange={setSliderValue} onSave={handleSliderSave} onCancel={handleSliderCancel}
                        goalImpactText={goalImpactText} />;
                    }
                    if (block.type === 'goal') {
                      return <GoalBlock key={block.id} goal={block.data} blockId={block.id} amount={block.amount}
                        getSizeTier={getSizeTier} expandedId={expandedId} sliderValue={sliderValue} originalBudget={originalBudget}
                        animated={animated} flexRemaining={flexRemaining}
                        onExpand={(id, contribution) => handleExpand(id, contribution, 'goal')}
                        onSliderChange={setSliderValue} onSave={handleSliderSave} onCancel={handleSliderCancel} />;
                    }
                    if (block.type === 'add-category') {
                      return (
                        <motion.div key="add-cat" layout transition={{ type: 'spring', duration: 0.5, damping: 25 }}
                          style={{ gridColumn: showAddCatForm ? '1 / -1' : 'span 1', gridRow: 'span 1' }}>
                          <motion.div animate={{ height: showAddCatForm ? 'auto' : 60 }}
                            transition={{ type: 'spring', duration: 0.3, damping: 25 }}
                            style={{ border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden', height: '100%' }}
                            onClick={(e) => { e.stopPropagation(); if (!showAddCatForm) setShowAddCatForm(true); }}>
                            {!showAddCatForm ? (
                              <div className="flex flex-col items-center justify-center gap-1 cursor-pointer h-full">
                                <Plus size={18} className="text-primary-white/25" />
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Category</span>
                              </div>
                            ) : (
                              <div className="p-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2 overflow-x-auto pb-1" style={{
                                  scrollbarWidth: 'none', msOverflowStyle: 'none',
                                  animation: iconPickerFlash ? 'ghostPulse 0.3s ease-in-out 2' : undefined,
                                }}>
                                  {addCatIconOptions.map(iconName => {
                                    const IconComp = budgetIconMap[iconName] || MoreHorizontal;
                                    const t = getTint(iconName);
                                    const selected = newCatIcon === iconName;
                                    return (
                                      <button key={iconName} onClick={() => setNewCatIcon(iconName)} className="flex-shrink-0 flex items-center justify-center"
                                        style={{ width: 40, height: 40, borderRadius: '50%',
                                          background: selected ? hexToRgba(t, 0.20) : 'rgba(255,255,255,0.08)',
                                          border: selected ? `2px solid ${hexToRgba(t, 0.25)}` : '2px solid transparent', transition: 'all 150ms ease',
                                        }}>
                                        <IconComp size={18} style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                                      </button>
                                    );
                                  })}
                                </div>
                                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value.slice(0, 20))} placeholder="Category name"
                                  className="bg-transparent border-none outline-none" style={{ height: 40, background: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: '0 12px', fontSize: 13, color: 'white' }} />
                                <div className="flex items-center" style={{ height: 40, background: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: '0 12px' }}>
                                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>€</span>
                                  <input type="text" inputMode="decimal" value={newCatBudget} onChange={handleNewCatBudgetInput} placeholder="Monthly budget"
                                    className="flex-1 bg-transparent border-none outline-none placeholder:text-white/40"
                                    style={{ fontSize: 16, fontWeight: 700, color: 'white', caretColor: 'white' }} />
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                  <button onClick={handleCreateCategory} disabled={createCatDisabled}
                                    style={{ height: 40, width: 120, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)',
                                      opacity: createCatDisabled ? 0.3 : 1, fontSize: 13, fontWeight: 600, color: 'white' }}>Create</button>
                                  <button onClick={handleCancelAddCat} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </motion.div>
                      );
                    }
                    if (block.type === 'add-goal') {
                      return (
                        <motion.div key="add-goal" layout transition={{ type: 'spring', duration: 0.5, damping: 25 }}
                          style={{ gridColumn: showAddGoalForm ? '1 / -1' : 'span 1', gridRow: 'span 1' }}>
                          <motion.div animate={{ height: showAddGoalForm ? 'auto' : 60 }}
                            transition={{ type: 'spring', duration: 0.3, damping: 25 }}
                            style={{ border: '2px dashed rgba(52,199,89,0.15)', borderRadius: 16, overflow: 'hidden', height: '100%' }}
                            onClick={(e) => { e.stopPropagation(); if (!showAddGoalForm) setShowAddGoalForm(true); }}>
                            {!showAddGoalForm ? (
                              <div className="flex flex-col items-center justify-center gap-1 cursor-pointer h-full">
                                <Plus size={18} style={{ color: 'rgba(52,199,89,0.25)' }} />
                                <span style={{ fontSize: 11, color: 'rgba(52,199,89,0.25)' }}>Goal</span>
                              </div>
                            ) : (
                              <div className="p-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                  {addGoalIconOptions.map(iconName => {
                                    const IconComp = goalIconMap[iconName] || Target;
                                    const t = getGoalTint(iconName);
                                    const selected = newGoalIcon === iconName;
                                    return (
                                      <button key={iconName} onClick={() => setNewGoalIcon(iconName)} className="flex-shrink-0 flex items-center justify-center"
                                        style={{ width: 40, height: 40, borderRadius: '50%',
                                          background: selected ? hexToRgba(t, 0.20) : 'rgba(255,255,255,0.08)',
                                          border: selected ? `2px solid ${hexToRgba(t, 0.25)}` : '2px solid transparent', transition: 'all 150ms ease',
                                        }}>
                                        <IconComp size={18} style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                                      </button>
                                    );
                                  })}
                                </div>
                                <input type="text" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value.slice(0, 20))} placeholder="Goal name"
                                  className="bg-transparent border-none outline-none" style={{ height: 40, background: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: '0 12px', fontSize: 13, color: 'white' }} />
                                <div className="flex items-center" style={{ height: 40, background: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: '0 12px' }}>
                                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>€</span>
                                  <input type="text" inputMode="decimal" value={newGoalTarget}
                                    onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setNewGoalTarget(v); }}
                                    placeholder="Target amount" className="flex-1 bg-transparent border-none outline-none placeholder:text-white/40"
                                    style={{ fontSize: 16, fontWeight: 700, color: 'white', caretColor: 'white' }} />
                                </div>
                                <div className="flex items-center" style={{ height: 40, background: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: '0 12px' }}>
                                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>€</span>
                                  <input type="text" inputMode="decimal" value={newGoalContribution}
                                    onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setNewGoalContribution(v); }}
                                    placeholder="Per month" className="flex-1 bg-transparent border-none outline-none placeholder:text-white/40"
                                    style={{ fontSize: 16, fontWeight: 700, color: 'white', caretColor: 'white' }} />
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                  <button onClick={handleCreateGoal} disabled={createGoalDisabled}
                                    style={{ height: 40, width: 120, borderRadius: 12, background: 'linear-gradient(135deg, #34C759, #14B8A6)',
                                      opacity: createGoalDisabled ? 0.3 : 1, fontSize: 13, fontWeight: 600, color: 'white' }}>Create</button>
                                  <button onClick={handleCancelAddGoal} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </motion.div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* Johnny in Empty Space */}
              {hasExpenses && !isOverflow && (
                <motion.div className="flex flex-col items-center justify-center"
                  animate={{ opacity: 1 }} transition={{ type: 'spring', duration: 0.4, damping: 25 }}
                  style={{ padding: '12px 0', minHeight: spaceRatio > 0.3 ? 80 : spaceRatio > 0.1 ? 60 : 40 }}>
                  <div className="relative flex items-center justify-center">
                    <motion.div animate={{ y: spaceRatio > 0.1 ? [0, -4, 0] : 0 }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                      <img src={johnnyImage} alt="Johnny" style={{
                        width: spaceRatio > 0.3 ? 48 : spaceRatio > 0.1 ? 36 : 24,
                        height: spaceRatio > 0.3 ? 48 : spaceRatio > 0.1 ? 36 : 24, transition: 'width 400ms, height 400ms',
                      }} />
                    </motion.div>
                    {(spaceRatio <= 0.3 && spaceRatio > 0.1 || johnnyAffordState === 'thinking') && (
                      <div className="absolute flex items-end gap-0.5" style={{ right: -20, top: 0 }}>
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                        <div className="flex items-center justify-center" style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }}>
                          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.20)' }}>...</span>
                        </div>
                      </div>
                    )}
                    {(spaceRatio <= 0.1 && spaceRatio > 0 || johnnyAffordState === 'stressed') && (
                      <svg className="absolute" style={{ right: -4, top: -2, width: 6, height: 10 }} viewBox="0 0 6 10">
                        <path d="M3 0 C3 0 6 5 6 7 C6 8.66 4.66 10 3 10 C1.34 10 0 8.66 0 7 C0 5 3 0 3 0Z" fill="rgba(255,255,255,0.25)" />
                      </svg>
                    )}
                  </div>
                  {spaceRatio > 0.3 && (
                    <>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>€{Math.round(adjustedRemaining)} free</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>€{Math.round(adjustedDaily)}/day</span>
                    </>
                  )}
                  {spaceRatio > 0.1 && spaceRatio <= 0.3 && (
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>€{Math.round(adjustedRemaining)}</span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Savings Bar */}
            <div className="flex items-center justify-between px-3 flex-shrink-0" style={{
              height: 36, background: 'rgba(52,199,89,0.08)', borderTop: '1px solid rgba(52,199,89,0.12)',
            }}>
              <div className="flex items-center gap-1.5">
                <PiggyBank size={12} style={{ color: 'rgba(52,199,89,0.3)' }} strokeWidth={1.5} />
                <span style={{ fontSize: 11 }} className="text-primary-white/25">
                  {config.monthlySavingsTarget > 0
                    ? `Savings €${Math.round(config.monthlySavingsTarget * multiplier)}${zoomSuffix[timeZoom]}`
                    : 'Savings: not set'}
                </span>
              </div>
              <ShieldCheck size={12} className="text-primary-white/15" strokeWidth={1.5} />
            </div>
          </div>

          {/* Johnny peek for overflow */}
          {hasExpenses && isOverflow && (
            <div className="flex flex-col items-center mt-1">
              <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ marginTop: -10 }}>
                <img src={johnnyImage} alt="Johnny" style={{ width: 20, height: 20, opacity: 0.6 }} />
              </motion.div>
              <span style={{ fontSize: 12, color: 'rgba(255,159,10,0.5)', marginTop: 2 }}>€{overAmount} over</span>
            </div>
          )}
        </div>

        {/* Impact Summary Row */}
        <div className="mt-3 flex flex-col px-4" style={{
          minHeight: 40, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16, padding: '8px 16px',
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13 }} className="text-primary-white/50">€{Math.round(adjustedRemaining * multiplier)} left</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-primary-white font-medium"
              style={{ fontSize: 11, background: hexToRgba(paceColor, 0.7) }}>
              <PaceIcon size={12} strokeWidth={1.5} />{paceLabel}
            </span>
            <span style={{ fontSize: 13 }} className="text-primary-white/50">€{Math.round(adjustedDaily)}/day</span>
          </div>
          {mostAffectedGoal && sliderDiff !== 0 && (
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {mostAffectedGoal.monthsChange > 0 ? (
                <span style={{ color: 'rgba(52,199,89,0.4)' }}>{mostAffectedGoal.name}: {Math.round(mostAffectedGoal.monthsChange)} months sooner</span>
              ) : (
                <span style={{ color: 'rgba(255,159,10,0.4)' }}>{mostAffectedGoal.name}: {Math.abs(Math.round(mostAffectedGoal.monthsChange))} months later</span>
              )}
            </div>
          )}
        </div>

        {/* Johnny's Tip Card */}
        <div className="mt-3">
          <JohnnyTip tips={[
            "Zoom to 5 Year to see how small daily habits become massive over time.",
            "Goals and spending share the same budget. Every €1 is a trade-off.",
            "Small daily savings add up. Even €2/day is €60/month.",
          ]} />
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setShowAddTransaction(true)} className="fixed z-50 flex items-center justify-center"
        style={{ width: 56, height: 56, bottom: 80, right: 20, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
        }}>
        <Plus size={24} className="text-primary-white" strokeWidth={2} />
      </button>

      <EditBudgetSheet open={showSettings} onClose={() => setShowSettings(false)} />
      <AddTransactionSheet open={showAddTransaction} onClose={handleTransactionClose}
        prefillAmount={buyItMode ? affordAmountNum : undefined} prefillCategoryId={buyItMode ? (affordCategoryId || undefined) : undefined} />
    </div>
  );
}

// Spending Block Component
function SpendingBlock({
  cat, index, amount, getSizeTier, expandedId, sliderValue, originalBudget,
  animated, initialAnimDone, flashCategoryId, affordAmountNum, affordCategoryId,
  spent, transactions, flexRemaining, daysRemaining, dailyAllowance,
  onExpand, onSliderChange, onSave, onCancel, goalImpactText,
}: {
  cat: any; index: number; amount: number;
  getSizeTier: (amount: number) => { colSpan: number; rowSpan: number; tier: string };
  expandedId: string | null; sliderValue: number; originalBudget: number;
  animated: boolean; initialAnimDone: React.MutableRefObject<boolean>;
  flashCategoryId: string | null; affordAmountNum: number; affordCategoryId: string | null;
  spent: number;
  transactions: any[]; flexRemaining: number; daysRemaining: number; dailyAllowance: number;
  onExpand: (id: string, budget: number) => void;
  onSliderChange: (val: number) => void; onSave: () => void; onCancel: () => void;
  goalImpactText: { text: string; color: string } | null;
}) {
  const tint = getTint(cat.icon);
  const Icon = budgetIconMap[cat.icon] || MoreHorizontal;
  const isExpanded = expandedId === cat.id;
  const effectiveBudget = isExpanded ? sliderValue : cat.monthlyBudget;
  const { colSpan, rowSpan, tier } = getSizeTier(amount);
  const isLarge = tier === 'huge' || tier === 'large';
  const isMedium = tier === 'medium';
  const isSmall = tier === 'small';
  const fillPercent = effectiveBudget > 0 ? Math.min((spent / effectiveBudget) * 100, 110) : 0;
  const isOver = fillPercent > 100;
  const fillColor = getFillColor(fillPercent, tint);
  const fillRadius = fillPercent >= 100 ? '16px' : '0 0 16px 16px';
  const isFlashing = flashCategoryId === cat.id;
  const progressPercent = effectiveBudget > 0 ? Math.min((spent / effectiveBudget) * 100, 100) : 0;

  const isAffordTarget = affordAmountNum > 0 && cat.id === affordCategoryId;
  const ghostFillPercent = isAffordTarget && effectiveBudget > 0 ? (affordAmountNum / effectiveBudget) * 100 : 0;
  const combinedPercent = fillPercent + ghostFillPercent;
  const isGhostOverflow = combinedPercent > 100;
  const shouldDim = affordAmountNum > 0 && cat.id !== affordCategoryId;

  const catTransactions = transactions.filter((t: any) => t.type === 'expense' && t.categoryId === cat.id);

  return (
    <motion.div key={cat.id} className="relative overflow-hidden cursor-pointer" layout
      animate={{ opacity: shouldDim ? 0.85 : 1 }}
      transition={{ type: 'spring', duration: 0.5, damping: 25 }}
      onClick={() => onExpand(cat.id, cat.monthlyBudget)}
      style={{
        gridColumn: isExpanded ? '1 / -1' : `span ${colSpan}`,
        gridRow: isExpanded ? 'auto' : `span ${rowSpan}`,
        height: isExpanded ? 280 : '100%',
        borderRadius: 16,
        background: `linear-gradient(135deg, ${hexToRgba(tint, 0.20)}, rgba(255,255,255,0.06))`,
        border: `1.5px solid ${isOver ? hexToRgba('#FF9F0A', 0.35) : hexToRgba(tint, 0.25)}`,
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}>
      {/* Accent Stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: hexToRgba(tint, 0.50), borderRadius: '16px 0 0 16px', zIndex: 2 }} />

      {/* Fill */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        height: animated ? `${fillPercent}%` : '0%', background: fillColor, borderRadius: fillRadius,
        transition: 'height 600ms ease-out', transitionDelay: initialAnimDone.current ? '0ms' : `${index * 100}ms`,
      }} />

      {/* Ghost Fill */}
      {isAffordTarget && ghostFillPercent > 0 && (
        <div style={{
          position: 'absolute', bottom: `${Math.min(fillPercent, 100)}%`, left: 0, width: '100%',
          height: `${isGhostOverflow ? Math.max(0, 100 - fillPercent) : ghostFillPercent}%`,
          background: isGhostOverflow ? 'rgba(255,159,10,0.20)' : 'rgba(255,255,255,0.15)',
          borderTop: '2px dashed rgba(255,255,255,0.20)', animation: 'ghostPulse 2s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'bottom 200ms ease, height 200ms ease',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>+€{Math.round(affordAmountNum)}</span>
        </div>
      )}

      {isFlashing && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.10)', borderRadius: 16, animation: 'fadeOut 500ms ease-out forwards' }} />
      )}

      {/* Content - adapts to size tier */}
      {!isExpanded && isLarge && (
        <div className="absolute inset-0 flex flex-col p-3 pl-4" style={{ zIndex: 1 }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={18} className="text-primary-white/70 flex-shrink-0" strokeWidth={1.5} />
              <span style={{ fontSize: 14 }} className="text-primary-white truncate">{cat.name}</span>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span style={{ fontSize: 16 }} className="font-bold text-primary-white">€{Math.round(spent)}</span>
              <span style={{ fontSize: 11 }} className="text-primary-white/35">of €{Math.round(effectiveBudget)}</span>
            </div>
          </div>
          <div className="flex-1" />
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.10)', width: '100%' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 2, background: hexToRgba(tint, 0.60), transition: 'width 300ms ease' }} />
          </div>
        </div>
      )}

      {!isExpanded && isMedium && (
        <div className="absolute inset-0 flex flex-col justify-center p-2 pl-3" style={{ zIndex: 1 }}>
          <div className="flex items-center gap-1.5">
            <Icon size={16} className="text-primary-white/70 flex-shrink-0" strokeWidth={1.5} />
            <span style={{ fontSize: 13 }} className="text-primary-white truncate flex-1">{cat.name}</span>
            <span style={{ fontSize: 14 }} className="font-bold text-primary-white flex-shrink-0">€{Math.round(spent)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span style={{ fontSize: 11 }} className="text-primary-white/35">of €{Math.round(effectiveBudget)}</span>
            <div className="flex-1" style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.10)' }}>
              <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 2, background: hexToRgba(tint, 0.50), transition: 'width 300ms ease' }} />
            </div>
          </div>
        </div>
      )}

      {!isExpanded && isSmall && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 pl-2" style={{ zIndex: 1 }}>
          <Icon size={16} className="text-primary-white/70" strokeWidth={1.5} />
          <span style={{ fontSize: 14 }} className="font-bold text-primary-white mt-0.5">€{Math.round(spent)}</span>
          <span style={{ fontSize: 10 }} className="text-primary-white/30">/€{Math.round(effectiveBudget)}</span>
        </div>
      )}

      {isExpanded && (
        <div className="absolute inset-0 flex flex-col" style={{ zIndex: 1 }}>
          <div className="flex items-center justify-between p-3 pl-4">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={20} className="text-primary-white/70 flex-shrink-0" strokeWidth={1.5} />
              <span style={{ fontSize: 14 }} className="font-semibold text-primary-white truncate">{cat.name}</span>
            </div>
            <span style={{ fontSize: 13 }} className="flex-shrink-0 ml-2">
              <span className={spent === 0 ? 'text-primary-white/30' : 'text-primary-white/70'}>€{Math.round(spent)}</span>
              <span className="text-primary-white/50"> / €{Math.round(effectiveBudget)}</span>
            </span>
          </div>
          <ExpandedSpendingContent cat={cat} tint={tint} sliderValue={sliderValue} originalBudget={originalBudget}
            flexRemaining={flexRemaining} daysRemaining={daysRemaining} dailyAllowance={dailyAllowance}
            transactions={catTransactions} onSliderChange={onSliderChange} onSave={onSave} onCancel={onCancel}
            goalImpactText={goalImpactText} />
        </div>
      )}
    </motion.div>
  );
}

// Goal Block Component
function GoalBlock({
  goal, blockId, amount, getSizeTier, expandedId, sliderValue, originalBudget,
  animated, flexRemaining, onExpand, onSliderChange, onSave, onCancel,
}: {
  goal: Goal; blockId: string; amount: number;
  getSizeTier: (amount: number) => { colSpan: number; rowSpan: number; tier: string };
  expandedId: string | null; sliderValue: number; originalBudget: number;
  animated: boolean; flexRemaining: number;
  onExpand: (id: string, contribution: number) => void;
  onSliderChange: (val: number) => void; onSave: () => void; onCancel: () => void;
}) {
  const goalTint = getGoalTint(goal.icon);
  const GoalIcon = goalIconMap[goal.icon] || Target;
  const isExpanded = expandedId === blockId;
  const { colSpan, rowSpan, tier } = getSizeTier(amount);
  const isLarge = tier === 'huge' || tier === 'large';
  const isMedium = tier === 'medium';
  const isSmall = tier === 'small';
  const progressPercent = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
  const isFunded = goal.saved >= goal.target;
  const green = '#34C759';

  return (
    <motion.div key={blockId} className="relative overflow-hidden cursor-pointer" layout
      transition={{ type: 'spring', duration: 0.5, damping: 25 }}
      onClick={() => onExpand(blockId, goal.monthlyContribution)}
      style={{
        gridColumn: isExpanded ? '1 / -1' : `span ${colSpan}`,
        gridRow: isExpanded ? 'auto' : `span ${rowSpan}`,
        height: isExpanded ? 280 : '100%',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.15)',
        border: isFunded ? '1.5px solid rgba(52,199,89,0.25)' : '1.5px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        ...(isFunded ? { boxShadow: '0 0 12px rgba(52,199,89,0.1)' } : {}),
      }}>
      {/* Progress Fill - subtle white rising from bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        height: animated ? `${progressPercent}%` : '0%',
        background: 'rgba(255,255,255,0.08)', borderRadius: progressPercent >= 100 ? '16px' : '0 0 16px 16px',
        transition: 'height 600ms ease-out',
      }} />

      {/* Fully funded check icon top-right */}
      {isFunded && (
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 3 }}>
          <CheckCircle size={12} style={{ color: 'rgba(52,199,89,0.5)' }} />
        </div>
      )}

      {/* Content - Large */}
      {!isExpanded && isLarge && (() => {
        const remaining = goal.target - goal.saved;
        const mToGoal = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : Infinity;
        const compDate = new Date(); compDate.setMonth(compDate.getMonth() + (isFinite(mToGoal) ? mToGoal : 0));
        const dateStr = isFinite(mToGoal) ? format(compDate, 'MMM yyyy') : '--';
        const ringSize = 48; const sw = 3; const r = (ringSize - sw) / 2;
        const circ = 2 * Math.PI * r; const off = circ - (progressPercent / 100) * circ;
        const gradId = `goalGrad-${blockId}`;
        return (
          <div className="absolute inset-0 flex flex-col p-3" style={{ zIndex: 1 }}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <GoalIcon size={20} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} className="flex-shrink-0" />
                  <span style={{ fontSize: 14 }} className="font-bold text-primary-white truncate">{goal.name}</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }} className="text-primary-white/40">€{goal.saved} / €{goal.target}</div>
                {/* Progress bar */}
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.10)', width: '100%', marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 3,
                    background: isFunded ? 'rgba(52,199,89,0.4)' : 'linear-gradient(90deg, #8B5CF6, #FF6B9D)',
                    transition: 'width 300ms ease' }} />
                </div>
                <span style={{ fontSize: 11, marginTop: 4, display: 'block' }} className="text-primary-white/30">{Math.round(progressPercent)}% complete</span>
              </div>
              {/* Progress ring */}
              <div className="flex-shrink-0 ml-3 flex flex-col items-center">
                <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={isFunded ? '#34C759' : '#8B5CF6'} />
                      <stop offset="100%" stopColor={isFunded ? '#34C759' : '#FF6B9D'} />
                    </linearGradient>
                  </defs>
                  <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={sw} />
                  <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke={`url(#${gradId})`}
                    strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 13, marginTop: -32, position: 'relative' }} className="font-bold text-primary-white/50">{Math.round(progressPercent)}%</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex justify-end gap-2">
              <span style={{ fontSize: 11 }} className="text-primary-white/25">{dateStr}</span>
              <span style={{ fontSize: 11 }} className="text-primary-white/25">€{goal.monthlyContribution}/mo</span>
            </div>
          </div>
        );
      })()}

      {/* Content - Medium */}
      {!isExpanded && isMedium && (() => {
        const ringSize = 36; const sw = 3; const r = (ringSize - sw) / 2;
        const circ = 2 * Math.PI * r; const off = circ - (progressPercent / 100) * circ;
        const gradId = `goalGrad-${blockId}`;
        return (
          <div className="absolute inset-0 flex flex-col justify-between p-2" style={{ zIndex: 1 }}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <GoalIcon size={16} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} className="flex-shrink-0" />
                  <span style={{ fontSize: 13 }} className="text-primary-white truncate">{goal.name}</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 2 }} className="text-primary-white/40">€{goal.saved} / €{goal.target}</div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.10)', width: '100%', marginTop: 4 }}>
                  <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 2,
                    background: isFunded ? 'rgba(52,199,89,0.4)' : 'linear-gradient(90deg, #8B5CF6, #FF6B9D)',
                    transition: 'width 300ms ease' }} />
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={isFunded ? '#34C759' : '#8B5CF6'} />
                      <stop offset="100%" stopColor={isFunded ? '#34C759' : '#FF6B9D'} />
                    </linearGradient>
                  </defs>
                  <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={sw} />
                  <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke={`url(#${gradId})`}
                    strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="flex justify-end">
              <span style={{ fontSize: 11 }} className="text-primary-white/25">€{goal.monthlyContribution}/mo</span>
            </div>
          </div>
        );
      })()}

      {/* Content - Small */}
      {!isExpanded && isSmall && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-1" style={{ zIndex: 1 }}>
          <GoalIcon size={16} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
          <span style={{ fontSize: 14 }} className="font-bold text-primary-white mt-0.5">€{goal.saved}</span>
          <span style={{ fontSize: 10 }} className="text-primary-white/30">/€{goal.target}</span>
          <span style={{ fontSize: 10 }} className="text-primary-white/25">{Math.round(progressPercent)}%</span>
        </div>
      )}

      {isExpanded && (
        <div className="absolute inset-0 flex flex-col overflow-y-auto" style={{ zIndex: 1 }}>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 min-w-0">
              <GoalIcon size={20} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} className="flex-shrink-0" />
              <span style={{ fontSize: 14 }} className="font-semibold text-primary-white truncate">{goal.name}</span>
            </div>
            <span style={{ fontSize: 13 }} className="text-primary-white/40 flex-shrink-0 ml-2">{Math.round(progressPercent)}%</span>
          </div>
          <ExpandedGoalContent goal={goal} flexRemaining={flexRemaining}
            contributionValue={sliderValue} originalContribution={originalBudget}
            onSliderChange={onSliderChange} onSave={onSave} onCancel={onCancel} />
        </div>
      )}
    </motion.div>
  );
}

export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
