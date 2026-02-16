import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sliders, Lock, PiggyBank, ShoppingBag, Target, Wallet, ChevronRight,
  ArrowLeft, FlaskConical, Sparkles, RotateCcw, Check, X,
  UtensilsCrossed, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark,
  Car, Tv, Shield, Baby, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2,
  RefreshCw, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { useApp, Goal } from '@/context/AppContext';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { tipsByPersona, getImpactText, getAffordText } from '@/lib/personaMessaging';
import { getPersona } from '@/lib/profileData';
import johnnyImage from '@/assets/johnny.png';

// ── Icon Maps ──
const allIcons: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark, Car, Tv,
  Shield, Baby, Lock, PiggyBank, Target, Wallet, Plus, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2,
};

const iconTintMap: Record<string, string> = {
  UtensilsCrossed: '#E67E22', ShoppingBag: '#E74C3C', Bus: '#2874A6', Film: '#9B59B6',
  Dumbbell: '#27AE60', CreditCard: '#6C3483', Coffee: '#795548', Smartphone: '#E91E63',
  Gift: '#F1C40F', BookOpen: '#8E44AD', Shirt: '#D35400', Wrench: '#5AC8FA',
  Heart: '#1ABC9C', MoreHorizontal: '#7F8C8D', Home: '#2ECC71', Zap: '#2E86C1',
  Landmark: '#1A5276', Car: '#3498DB', Tv: '#6C3483', Shield: '#1A5276', Baby: '#EC4899',
  TrendingUp: '#27AE60', LineChart: '#3498DB', Sunset: '#F39C12',
  Target: '#1ABC9C', ShieldCheck: '#2ECC71', Plane: '#F39C12', Laptop: '#8E44AD',
  GraduationCap: '#8E44AD', Gamepad2: '#3498DB', PiggyBank: '#27AE60', Wallet: '#FFFFFF',
};

const fixedColors: Record<string, string> = {
  'Rent': '#5D6D7E', 'Utilities': '#2E86C1', 'Transport': '#2874A6',
  'Subscriptions': '#6C3483', 'Insurance': '#1A5276', 'Tax': '#1A5276',
  'Childcare': '#5D6D7E', 'Other Fixed': '#566573',
};
const fixedColorFallbacks = ['#5D6D7E', '#2E86C1', '#2874A6', '#6C3483', '#1A5276'];

const goalIconColors: Record<string, string> = {
  ShieldCheck: '#27AE60', Plane: '#F39C12', Car: '#3498DB',
  Home: '#2ECC71', Laptop: '#8E44AD', GraduationCap: '#8E44AD',
  Heart: '#E74C3C', TrendingUp: '#27AE60', LineChart: '#3498DB',
  Target: '#1ABC9C', Gamepad2: '#3498DB',
};

// Health bar contrasting colors
const healthBarColors: Record<string, string> = {
  '#E67E22': '#FFD700', // orange → gold
  '#9B59B6': '#FF69B4', // purple → hot pink
  '#E74C3C': '#FFA500', // red → bright orange
  '#1ABC9C': '#87CEEB', // teal → sky blue
  '#7F8C8D': '#DDDDDD', // gray → light gray
};

function getIcon(name: string): LucideIcon { return allIcons[name] || MoreHorizontal; }
function getTint(iconName: string): string { return iconTintMap[iconName] || '#FFFFFF'; }

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type TimeZoom = 'Month' | 'Year' | '5 Year';
const zoomMult: Record<TimeZoom, number> = { 'Month': 1, 'Year': 12, '5 Year': 60 };

function getSpans(amount: number, income: number) {
  if (income <= 0) return { col: 1, row: 1 };
  const ratio = amount / income;
  if (ratio > 0.35) return { col: 2, row: 2 };
  if (ratio > 0.20) return { col: 2, row: 1 };
  if (ratio > 0.10) return { col: 1, row: 2 };
  return { col: 1, row: 1 };
}

// ── Main Content ──
function MyMoneyContent() {
  const {
    config, expenseCategories, fixedCategories, flexBudget, flexSpent, flexRemaining,
    dailyAllowance, paceStatus, getCategorySpent, totalFixed, transactions,
    updateCategory, daysRemaining, daysInMonth, dayOfMonth, addCategory, addTransaction,
    savingsTarget,
  } = useBudget();
  const { goals, addGoal, updateGoal, setActiveTab } = useApp();

  const clarityDone = localStorage.getItem('jfb_clarity_done') === 'true';

  const persona = useMemo(() => {
    try {
      const m0 = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      return getPersona(m0);
    } catch { return null; }
  }, []);
  const personaName = persona?.n || null;

  const totalIncome = Number(config.monthlyIncome) || 0;
  const totalSpendingBudget = useMemo(() => expenseCategories.reduce((s, c) => s + (Number(c.monthlyBudget) || 0), 0), [expenseCategories]);
  const totalGoalContributions = useMemo(() => goals.reduce((s, g) => s + (Number(g.monthlyContribution) || 0), 0), [goals]);
  const freeAmount = totalIncome - totalFixed - savingsTarget - totalSpendingBudget - totalGoalContributions;

  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenseCategories.forEach(c => { map[c.id] = getCategorySpent(c.id, 'month'); });
    return map;
  }, [expenseCategories, getCategorySpent]);

  // State
  const [zoom, setZoom] = useState<TimeZoom>('Month');
  const mult = zoomMult[zoom];
  const [isWhatIf, setIsWhatIf] = useState(false);
  const [simulations, setSimulations] = useState<Array<{ id: string; field: string; value: number; original: number }>>([]);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [sliderOriginal, setSliderOriginal] = useState(0);
  const [showFab, setShowFab] = useState(false);
  const [fabMode, setFabMode] = useState<'expense' | 'income' | 'goal' | undefined>(undefined);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillCatId, setPrefillCatId] = useState<string | undefined>();
  const [manageSubscriptions, setManageSubscriptions] = useState(false);
  const [cancellingSubName, setCancellingSubName] = useState<string | null>(null);
  const [importShown, setImportShown] = useState(() => localStorage.getItem('jfb_import_shown') === 'true');
  const [importing, setImporting] = useState(false);
  const [whatIfFirstActivation, setWhatIfFirstActivation] = useState(true);
  const [savingsExpanded, setSavingsExpanded] = useState(false);
  const [savingsSlider, setSavingsSlider] = useState(savingsTarget);

  // Can I Afford
  const [affordInput, setAffordInput] = useState('');
  const [affordCatId, setAffordCatId] = useState<string | null>(null);
  const [showCatPicker, setShowCatPicker] = useState(false);

  useEffect(() => {
    if (expenseCategories.length > 0 && !affordCatId) {
      let best = expenseCategories[0];
      let bestRem = best.monthlyBudget - (categorySpentMap[best.id] || 0);
      expenseCategories.forEach(c => {
        const rem = c.monthlyBudget - (categorySpentMap[c.id] || 0);
        if (rem > bestRem) { best = c; bestRem = rem; }
      });
      setAffordCatId(best.id);
    }
  }, [expenseCategories, categorySpentMap, affordCatId]);

  const affordNum = parseFloat(affordInput) || 0;
  const affordAnswer = useMemo(() => {
    if (affordNum <= 0) return null;
    const afterFlex = flexRemaining - affordNum;
    const afterDaily = daysRemaining > 0 ? afterFlex / daysRemaining : 0;
    const cat = expenseCategories.find(c => c.id === affordCatId);
    const catName = cat?.name || '';
    const shortage = Math.abs(Math.round(afterFlex));
    if (afterFlex <= 0) return { text: getAffordText('over', personaName, Math.round(afterDaily), daysRemaining, shortage), color: '#FF9F0A', catName };
    if (afterFlex > flexBudget * 0.3) return { text: getAffordText('comfortable', personaName, Math.round(afterDaily), daysRemaining, 0), color: '#34C759', catName };
    return { text: getAffordText('tight', personaName, Math.round(afterDaily), daysRemaining, 0), color: afterFlex > flexBudget * 0.1 ? '#FFFFFF' : '#FF9F0A', catName };
  }, [affordNum, flexRemaining, daysRemaining, flexBudget, affordCatId, expenseCategories, personaName]);

  const sortedFixed = useMemo(() =>
    [...fixedCategories].sort((a, b) => b.monthlyBudget - a.monthlyBudget).map((c, i) => ({
      ...c, _color: fixedColors[c.name] || fixedColorFallbacks[Math.min(i, fixedColorFallbacks.length - 1)]
    })), [fixedCategories]);

  const sortedGoals = useMemo(() =>
    [...goals].sort((a, b) => b.monthlyContribution - a.monthlyContribution).map((g) => ({
      ...g, _color: goalIconColors[g.icon] || '#8B5CF6'
    })), [goals]);

  // What If handlers
  const handleWhatIfReset = () => setSimulations([]);
  const handleWhatIfSave = () => { setSimulations([]); setIsWhatIf(false); };
  const handleWhatIfDone = () => { setSimulations([]); setIsWhatIf(false); };

  // Mock bank import
  const handleMockImport = useCallback(() => {
    setImporting(true);
    setTimeout(() => {
      const foodCat = expenseCategories.find(c => c.name === 'Food');
      const entCat = expenseCategories.find(c => c.name === 'Entertainment');
      const shopCat = expenseCategories.find(c => c.name === 'Shopping');
      const persCat = expenseCategories.find(c => c.name === 'Personal');
      const mockTxs = [
        { amount: 45, categoryId: foodCat?.id, description: 'Grocery Store', date: '2026-02-10' },
        { amount: 12, categoryId: foodCat?.id, description: 'Coffee Shop', date: '2026-02-11' },
        { amount: 35, categoryId: entCat?.id, description: 'Cinema', date: '2026-02-09' },
        { amount: 89, categoryId: shopCat?.id, description: 'H&M', date: '2026-02-08' },
        { amount: 15, categoryId: foodCat?.id, description: 'Uber Eats', date: '2026-02-12' },
        { amount: 25, categoryId: persCat?.id, description: 'Pharmacy', date: '2026-02-07' },
        { amount: 60, categoryId: foodCat?.id, description: 'Weekly Groceries', date: '2026-02-14' },
        { amount: 10, categoryId: entCat?.id, description: 'Spotify', date: '2026-02-01', isRecurring: true },
        { amount: 50, categoryId: shopCat?.id, description: 'Amazon', date: '2026-02-05' },
      ];
      mockTxs.forEach(tx => {
        if (tx.categoryId) {
          addTransaction({ amount: tx.amount, type: 'expense', categoryId: tx.categoryId, description: tx.description, date: tx.date, isRecurring: (tx as any).isRecurring || false });
        }
      });
      localStorage.setItem('jfb_import_shown', 'true');
      setImportShown(true);
      setImporting(false);
    }, 2000);
  }, [expenseCategories, addTransaction]);

  // What If quick scenarios
  const [activeScenarioLabel, setActiveScenarioLabel] = useState<string | null>(null);
  const handleQuickScenario = useCallback((scenario: string) => {
    if (scenario === 'rent') {
      const rent = fixedCategories.find(c => c.name === 'Rent');
      if (rent) setSimulations([{ id: 'rent-sim', field: 'fixed', value: rent.monthlyBudget - 100, original: rent.monthlyBudget }]);
      setActiveScenarioLabel('rent');
    } else if (scenario === 'save') {
      setSimulations([{ id: 'save-sim', field: 'savings', value: savingsTarget + 100, original: savingsTarget }]);
      setActiveScenarioLabel('save');
    } else if (scenario === 'income-drop') {
      setSimulations([{ id: 'income-sim', field: 'income', value: Math.round(totalIncome * 0.8), original: totalIncome }]);
      setActiveScenarioLabel('income-drop');
    }
    setWhatIfFirstActivation(false);
  }, [fixedCategories, savingsTarget, totalIncome]);

  const handleTryAnother = useCallback(() => {
    setSimulations([]);
    setActiveScenarioLabel(null);
    setWhatIfFirstActivation(true);
  }, []);

  const scenarioImpact = useMemo(() => {
    if (!activeScenarioLabel || simulations.length === 0) return null;
    const sim = simulations[0];
    const diff = sim.value - sim.original;
    const newFree = freeAmount + (sim.field === 'fixed' ? -diff : sim.field === 'savings' ? -diff : sim.field === 'income' ? diff : 0);
    const annualSaved = Math.abs(diff) * 12;
    const nearestGoal = goals[0];
    let goalImpact = '';
    if (nearestGoal && nearestGoal.monthlyContribution > 0) {
      const remaining = nearestGoal.target - nearestGoal.saved;
      const monthsNow = Math.ceil(remaining / nearestGoal.monthlyContribution);
      const extra = diff < 0 ? Math.abs(diff) : 0;
      const monthsNew = extra > 0 ? Math.ceil(remaining / (nearestGoal.monthlyContribution + extra * 0.5)) : monthsNow;
      const diff2 = monthsNow - monthsNew;
      if (diff2 > 0) goalImpact = `${nearestGoal.name}: ${diff2} months sooner`;
    }
    return { diff, newFree, annualSaved, goalImpact, isNegative: newFree < 0, originalField: sim.field, originalValue: sim.original, newValue: sim.value };
  }, [activeScenarioLabel, simulations, freeAmount, goals]);

  // Expand item
  const handleExpandItem = (id: string, budget: number) => {
    if (expandedItemId === id) { setExpandedItemId(null); return; }
    setExpandedItemId(id);
    setSliderVal(budget);
    setSliderOriginal(budget);
  };

  const handleSliderSave = (catId: string) => {
    if (isWhatIf) {
      setSimulations(prev => {
        const existing = prev.findIndex(s => s.id === catId);
        const entry = { id: catId, field: 'spending', value: Math.round(sliderVal), original: sliderOriginal };
        if (existing >= 0) { const u = [...prev]; u[existing] = entry; return u; }
        return [...prev, entry];
      });
    } else {
      updateCategory(catId, { monthlyBudget: Math.round(sliderVal) });
    }
    setExpandedItemId(null);
  };

  const incomeLabel = zoom === 'Month' ? `€${totalIncome.toLocaleString()}/month` : zoom === 'Year' ? `€${(totalIncome * 12).toLocaleString()}/year` : `€${(totalIncome * 60).toLocaleString()}/5yr`;

  // Parent blocks
  const parentBlocks = useMemo(() => {
    const goalsDisplay = zoom === '5 Year' ? goals.reduce((s, g) => s + g.target, 0) : totalGoalContributions;
    return [
      { id: 'spending', label: 'Spending', icon: 'ShoppingBag', amount: totalSpendingBudget, color: '#8E44AD' },
      { id: 'fixed', label: 'Fixed', icon: 'Lock', amount: totalFixed, color: '#5D6D7E' },
      { id: 'goals', label: 'Goals', icon: 'Target', amount: goalsDisplay, color: '#E91E63' },
      { id: 'savings', label: 'Savings', icon: 'PiggyBank', amount: savingsTarget, color: '#27AE60' },
    ].filter(b => b.amount > 0);
  }, [totalSpendingBudget, totalFixed, totalGoalContributions, savingsTarget, goals, zoom]);

  // Get recent transactions for a category
  const getRecentTxs = useCallback((catId: string) => {
    const now = new Date();
    const ms = startOfMonth(now);
    const me = endOfMonth(now);
    return transactions
      .filter(t => t.categoryId === catId && t.type === 'expense' && isWithinInterval(parseISO(t.date), { start: ms, end: me }))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // ── Full-Income Context Bar ──
  const renderContextBar = (currentId: string) => {
    const all = [
      { id: 'spending', label: 'Spending', amount: totalSpendingBudget, color: '#8E44AD' },
      { id: 'fixed', label: 'Fixed', amount: totalFixed, color: '#5D6D7E' },
      { id: 'goals', label: 'Goals', amount: totalGoalContributions, color: '#E91E63' },
      { id: 'savings', label: 'Savings', amount: savingsTarget, color: '#27AE60' },
    ].filter(s => s.amount > 0);
    const currentBlock = all.find(s => s.id === currentId);
    const pct = totalIncome > 0 && currentBlock ? Math.round((currentBlock.amount / totalIncome) * 100) : 0;

    return (
      <div className="mb-3">
        <div className="text-[13px] mb-1.5" style={{ color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
          €{Math.round((currentBlock?.amount || 0) * mult).toLocaleString()} of €{Math.round(totalIncome * mult).toLocaleString()} · {pct}% of income
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ height: 10, background: 'rgba(255,255,255,0.06)' }}>
          {all.map((seg, i) => {
            const w = totalIncome > 0 ? (seg.amount / totalIncome) * 100 : 0;
            return (
              <div key={seg.id} style={{
                width: `${w}%`, background: seg.color,
                opacity: seg.id === currentId ? 1 : 0.2,
                borderRight: i < all.length - 1 ? '1px solid rgba(255,255,255,0.3)' : undefined,
              }} />
            );
          })}
          {freeAmount > 0 && totalIncome > 0 && (
            <div style={{
              width: `${(freeAmount / totalIncome) * 100}%`,
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)',
            }} />
          )}
        </div>
      </div>
    );
  };

  // ── Spending Health Bar ──
  const renderHealthBar = (spent: number, budget: number, blockColor: string) => {
    const fillPct = budget > 0 ? Math.min((spent / budget) * 100, 120) : 0;
    const remaining = Math.max(0, budget - spent);
    const usedPct = Math.round(budget > 0 ? (spent / budget) * 100 : 0);
    const barFill = fillPct > 100 ? '#FF5252' : fillPct > 80 ? '#FFC107' : (healthBarColors[blockColor] || '#DDDDDD');

    return (
      <div className="mt-auto">
        <div style={{
          height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'rgba(0,0,0,0.15)',
          marginTop: 4,
          boxShadow: fillPct > 100 ? `0 0 8px ${hexToRgba('#FF5252', 0.4)}` : undefined,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(fillPct, 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 4, background: barFill }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {usedPct}%
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            €{Math.round(remaining)} left
          </span>
        </div>
      </div>
    );
  };

  // ── Render Spending Parent Internals ──
  const renderSpendingChildren = () => {
    const visibleCats = expenseCategories.filter(c => Number(c.monthlyBudget) > 0);
    const spendingFillPct = totalSpendingBudget > 0 ? Math.min((flexSpent / totalSpendingBudget) * 100, 100) : 0;

    // Subscription block
    const recurringTxs = transactions.filter(t => t.isRecurring === true);
    const subscriptionMap: Record<string, { name: string; amount: number; categoryId: string }> = {};
    recurringTxs.forEach(t => {
      const key = (t.description || 'Unknown').trim();
      if (!subscriptionMap[key]) subscriptionMap[key] = { name: key, amount: Number(t.amount) || 0, categoryId: t.categoryId };
    });
    const subscriptions = Object.values(subscriptionMap);
    const monthlySubTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);

    return (
      <>
        {/* Dark spending fill overlay */}
        {spendingFillPct > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none"
            initial={{ height: 0 }}
            animate={{ height: `${spendingFillPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '0 0 16px 16px' }}
          />
        )}

        {/* Sub-grid */}
        <div className="relative z-10" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gridAutoRows: 'minmax(60px, auto)',
          gap: 6,
        }}>
          {/* Subscription block */}
          {subscriptions.length > 0 && (
            <div className="relative rounded-xl p-2" style={{
              gridColumn: visibleCats.length <= 2 ? '1 / -1' : undefined,
              background: 'repeating-linear-gradient(135deg, #D4A017, #D4A017 4px, #C49000 4px, #C49000 8px)',
              boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
            }}>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <RefreshCw size={14} className="text-white" />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Subs</span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>€{Math.round(monthlySubTotal)}/mo</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>€{Math.round(monthlySubTotal * 12)}/yr</span>
            </div>
          )}

          {visibleCats.map(cat => {
            const CatIcon = getIcon(cat.icon);
            const tint = getTint(cat.icon);
            const spent = categorySpentMap[cat.id] || 0;
            const budget = cat.monthlyBudget;
            const isExpanded = expandedItemId === cat.id;

            if (isExpanded) {
              const recentTxs = getRecentTxs(cat.id);
              return (
                <motion.div key={cat.id} layout
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    gridColumn: '1 / -1', gridRow: 'span 3',
                    background: tint, border: `1.5px solid ${hexToRgba(tint, 0.30)}`,
                    boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
                    minHeight: 280,
                  }}
                  transition={{ type: 'spring', duration: 0.3 }}
                >
                  <div className="relative z-10 p-3 flex flex-col h-full" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <CatIcon size={14} className="text-white" />
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                      €{Math.round(spent)} of €{Math.round(budget * mult)}
                    </span>
                    {renderHealthBar(spent, budget, tint)}

                    <div className="h-px bg-white/10 my-3" />

                    {/* Budget slider */}
                    <div className="text-center mb-1">
                      <span className="text-[16px] font-bold text-white">€{Math.round(sliderVal)}</span>
                    </div>
                    <input type="range" min={0} max={Math.round(budget + Math.max(freeAmount, 0))} value={Math.round(sliderVal)}
                      onChange={e => setSliderVal(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, rgba(255,255,255,0.35) ${(sliderVal / Math.max(budget + Math.max(freeAmount, 0), 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
                    />
                    <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Budget: €{sliderOriginal} → €{Math.round(sliderVal)}. Daily: €{Math.round(dailyAllowance)}/day
                    </div>

                    {/* Recent transactions */}
                    {recentTxs.length > 0 && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <span className="text-[11px] text-white/30 mb-1">Recent</span>
                        {recentTxs.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between py-1">
                            <span className="text-[12px] text-white/70">{tx.description}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-white/40">{format(parseISO(tx.date), 'MMM d')}</span>
                              <span className="text-[12px] text-white font-medium">-€{tx.amount}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Save/Cancel */}
                    {Math.round(sliderVal) !== Math.round(sliderOriginal) && (
                      <div className="flex justify-center gap-3 mt-3">
                        <button onClick={() => handleSliderSave(cat.id)}
                          style={{ height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #34C759, #14B8A6)' }}
                          className="text-white font-medium text-[13px] px-6">Save</button>
                        <button onClick={() => setExpandedItemId(null)}
                          style={{ height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)' }}
                          className="text-white/40 font-medium text-[13px] px-6">Cancel</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div key={cat.id} layout
                className="relative rounded-xl overflow-hidden cursor-pointer"
                style={{
                  background: tint, border: `1.5px solid ${hexToRgba(tint, 0.30)}`,
                  boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
                  minHeight: 60, padding: 8,
                }}
                onClick={() => handleExpandItem(cat.id, budget)}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', duration: 0.3 }}
              >
                <div className="flex flex-col h-full">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <CatIcon size={14} className="text-white" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{cat.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.80)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    €{Math.round(spent)} / €{Math.round(budget * mult)}
                  </span>
                  {renderHealthBar(spent, budget, tint)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </>
    );
  };

  // ── Render Fixed Parent Internals ──
  const renderFixedChildren = () => (
    <div className="relative z-10" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gridAutoRows: 'minmax(60px, auto)',
      gap: 6,
    }}>
      {sortedFixed.map(cat => {
        const CatIcon = getIcon(cat.icon);
        return (
          <div key={cat.id} className="relative rounded-xl p-2 flex flex-col" style={{
            background: cat._color,
            border: `1.5px solid rgba(255,255,255,0.15)`,
            boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
            minHeight: 60,
          }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <CatIcon size={14} style={{ color: 'rgba(255,255,255,0.9)' }} strokeWidth={1.5} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{cat.name}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.80)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>€{Math.round(cat.monthlyBudget * mult)}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)' }}>fixed</span>
          </div>
        );
      })}
    </div>
  );

  // ── Render Goals Parent Internals ──
  const renderGoalsChildren = () => (
    <div className="relative z-10 space-y-1.5">
      {sortedGoals.slice(0, 3).map(goal => {
        const GoalIcon = getIcon(goal.icon);
        const pctFunded = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
        return (
          <div key={goal.id} className="flex items-center gap-2">
            <GoalIcon size={16} style={{ color: goal._color }} strokeWidth={1.5} />
            <span style={{ fontSize: 11, color: 'white', fontWeight: 600, flex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{goal.name}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.60)' }}>€{goal.saved}/€{goal.target}</span>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ width: `${pctFunded}%`, height: '100%', borderRadius: 2, background: goal._color }} />
            </div>
          </div>
        );
      })}
      {sortedGoals.length > 3 && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)' }}>+{sortedGoals.length - 3} more</span>
      )}
      {sortedGoals.length === 0 && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Tap to add goals</span>
      )}
    </div>
  );

  // ── Render Savings Parent Internals ──
  const renderSavingsChildren = () => {
    const pctOfIncome = totalIncome > 0 ? Math.round((savingsTarget / totalIncome) * 100) : 0;
    return (
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <PiggyBank size={14} className="text-white" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>€{Math.round(savingsTarget * mult)}/mo</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{pctOfIncome}% of income</span>
        {pctOfIncome < 20 && (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Experts recommend 20%</span>
        )}
        {savingsExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full mt-2">
            <input type="range" min={0} max={Math.round(savingsTarget + Math.max(freeAmount, 0))}
              value={Math.round(savingsSlider)}
              onChange={e => setSavingsSlider(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, rgba(39,174,96,0.5) ${(savingsSlider / Math.max(savingsTarget + Math.max(freeAmount, 0), 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
            />
            <div className="text-[11px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              €{Math.round(savingsSlider)}/mo · Daily: €{Math.round(Math.max(0, (flexBudget - (savingsSlider - savingsTarget) - flexSpent) / daysRemaining))}/day
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // ── Render Parent Block ──
  const renderParentBlock = (block: typeof parentBlocks[0]) => {
    const { id, label, icon, amount, color } = block;
    const Icon = getIcon(icon);
    const spans = getSpans(Math.abs(amount * mult), totalIncome * mult);
    const displayAmount = Math.round(amount * mult);
    const isGhosting = id === 'spending' && affordNum > 0;

    return (
      <motion.div
        key={id}
        layout
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{
          gridColumn: `span ${spans.col}`,
          gridRow: `span ${spans.row}`,
          background: 'rgba(255,255,255,0.05)',
          border: `1.5px solid rgba(255,255,255,0.10)`,
          padding: 8,
          minHeight: 120,
        }}
        onClick={() => {
          if (id === 'goals') {
            setActiveTab(2);
            setTimeout(() => { window.dispatchEvent(new CustomEvent('openMyWorld')); }, 100);
            return;
          }
          if (id === 'savings') {
            setSavingsExpanded(!savingsExpanded);
            return;
          }
          setExpandedParent(expandedParent === id ? null : id);
        }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Left accent stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />

        {/* Ghost for Can I Afford */}
        {isGhosting && (
          <div className="absolute inset-0 pointer-events-none z-0"
            style={{ background: 'rgba(255,255,255,0.06)', animation: 'ghostPulse 2s ease-in-out infinite' }} />
        )}

        {/* Parent header */}
        <div className="relative z-10 flex items-center justify-between mb-1.5 pl-2">
          <div className="flex items-center gap-1.5">
            <Icon size={16} style={{ color: 'rgba(255,255,255,0.40)' }} strokeWidth={1.5} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.60)' }}>{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>€{displayAmount.toLocaleString()}</span>
            <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.20)' }} />
          </div>
        </div>

        {/* Children */}
        <div className="relative pl-2">
          {id === 'spending' && renderSpendingChildren()}
          {id === 'fixed' && renderFixedChildren()}
          {id === 'goals' && renderGoalsChildren()}
          {id === 'savings' && renderSavingsChildren()}
        </div>
      </motion.div>
    );
  };

  // ── Empty state ──
  if (!clarityDone) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(to bottom, #B4A6B8, #9B80B4)' }}>
        <motion.img src={johnnyImage} alt="Johnny" className="w-16 h-16 object-contain mb-4"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <h2 className="text-xl font-bold text-white mb-2 text-center">Set up your finances</h2>
        <p className="text-sm text-white/30 text-center max-w-[260px] mb-6">Complete the Financial Clarity quest on your Profile to unlock your budget</p>
        <button onClick={() => setActiveTab(2)}
          className="flex items-center gap-2 px-6 rounded-2xl text-sm text-white/50 font-medium"
          style={{ height: 48, width: 200, justifyContent: 'center', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 16 }}>
          <User size={18} />
          Go to Profile
        </button>
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div className="h-full overflow-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <span className="text-[22px] font-bold text-white">My Money</span>
        <Sliders size={20} className="text-white/40" />
      </div>

      {/* Can I Afford */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 rounded-2xl px-3" style={{ height: 48, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
          <FlaskConical size={18} className="text-white/35 flex-shrink-0" />
          <input type="number" inputMode="decimal" placeholder="Can I afford €..." value={affordInput}
            onChange={e => setAffordInput(e.target.value)}
            className="flex-1 bg-transparent text-white text-[14px] placeholder:text-white/25 outline-none min-w-0" />
          <div className="relative">
            <button onClick={() => setShowCatPicker(!showCatPicker)}
              className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.10)', height: 32 }}>
              {affordCatId && (() => {
                const c = expenseCategories.find(x => x.id === affordCatId);
                if (!c) return null;
                const CI = getIcon(c.icon);
                return <><CI size={14} className="text-white/60" /><span className="text-[12px] text-white/60">{c.name}</span></>;
              })()}
            </button>
            {showCatPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 rounded-xl p-2 min-w-[140px]" style={{ background: 'rgba(40,30,50,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {expenseCategories.map(c => {
                  const CI = getIcon(c.icon);
                  return (
                    <button key={c.id} onClick={() => { setAffordCatId(c.id); setShowCatPicker(false); }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-white/10">
                      <CI size={14} className="text-white/60" />
                      <span className="text-[13px] text-white/70">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <AnimatePresence>
          {affordAnswer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-1 mt-1.5">
              <span className="text-[13px] font-medium" style={{ color: affordAnswer.color }}>{affordAnswer.text}</span>
              {affordAnswer.catName && <span className="text-[10px] ml-2" style={{ color: getTint(expenseCategories.find(c => c.id === affordCatId)?.icon || '') }}>→ {affordAnswer.catName}</span>}
              <div className="flex gap-2 mt-1.5">
                <button onClick={() => { setPrefillAmount(affordNum); setPrefillCatId(affordCatId || undefined); setShowFab(true); }}
                  className="px-4 py-1.5 rounded-full text-[12px] text-white font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}>Buy it</button>
                <button onClick={() => setAffordInput('')}
                  className="px-4 py-1.5 rounded-full text-[12px] text-white/40" style={{ background: 'rgba(255,255,255,0.10)' }}>Clear</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode + Zoom toggles */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <div className="flex items-center rounded-full p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <button onClick={() => { setIsWhatIf(false); handleWhatIfDone(); }}
            className={`px-3 py-1 rounded-full text-[12px] font-medium ${!isWhatIf ? 'bg-white/15 text-white' : 'text-white/40'}`}>My Month</button>
          <button onClick={() => setIsWhatIf(true)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 ${isWhatIf ? 'bg-white/15 text-white' : 'text-white/40'}`}>
            <Sparkles size={12} />What If
          </button>
        </div>
        <div className="flex items-center rounded-full p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {(['Month', 'Year', '5 Year'] as TimeZoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-2 py-1 rounded-full text-[11px] font-medium ${zoom === z ? 'bg-white/15 text-white' : 'text-white/30'}`}>{z}</button>
          ))}
        </div>
      </div>

      {/* THE INCOME CONTAINER */}
      <div className="px-4 mb-3">
        <div className="relative rounded-[20px] overflow-hidden" style={{
          background: 'rgba(255,255,255,0.04)',
          border: isWhatIf ? '2px dashed rgba(255,255,255,0.10)'
            : activeScenarioLabel === 'income-drop' && scenarioImpact ? '2px solid rgba(245,158,11,0.5)'
            : freeAmount < 0 ? '2px solid rgba(245,158,11,0.4)'
            : '2px solid rgba(255,255,255,0.12)',
          minHeight: '62vh',
          padding: 10,
          animation: isWhatIf ? 'ghostPulse 3s ease-in-out infinite' : undefined,
          boxShadow: freeAmount < 0 ? '0 0 24px rgba(245,158,11,0.2)' : undefined,
        }}>
          {/* Income header inside container */}
          <div className="flex items-center justify-between mb-2.5 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Wallet size={18} style={{ color: 'rgba(255,255,255,0.40)' }} />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>Income</span>
            </div>
            <div>
              {activeScenarioLabel === 'income-drop' && scenarioImpact ? (
                <span className="text-[18px] font-bold" style={{ color: 'white' }}>
                  <span className="line-through" style={{ color: 'rgba(239,68,68,0.5)' }}>€{totalIncome.toLocaleString()}</span>
                  {' '}
                  <span style={{ color: '#F59E0B' }}>€{scenarioImpact.newValue.toLocaleString()}</span>
                </span>
              ) : (
                <span className="text-[18px] font-bold text-white">{incomeLabel}</span>
              )}
            </div>
          </div>

          {isWhatIf && <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] text-white/15"><Sparkles size={10} /> Playground</div>}

          {/* Parent blocks grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gridAutoRows: 'minmax(120px, auto)',
            gap: 8,
          }}>
            {parentBlocks.map(renderParentBlock)}
          </div>

          {/* Empty space = free/unallocated */}
          <div className="flex items-center justify-center gap-3 mt-3 py-3 rounded-xl"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              minHeight: freeAmount > 0 ? 60 : 36,
            }}>
            {freeAmount >= 0 ? (
              <>
                <motion.img src={johnnyImage} alt="Johnny" className="w-9 h-9 object-contain"
                  animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ imageRendering: 'pixelated' }} />
                <div className="flex flex-col">
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>€{Math.round(freeAmount * mult).toLocaleString()} free</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>€{Math.round(dailyAllowance)}/day</span>
                </div>
              </>
            ) : (
              <>
                <motion.img src={johnnyImage} alt="Johnny" className="w-7 h-7 object-contain"
                  animate={{ y: [0, -2, 0], rotate: [0, -3, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ imageRendering: 'pixelated' }} />
                <div className="flex flex-col">
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#F59E0B' }}>€{Math.abs(Math.round(freeAmount * mult)).toLocaleString()} over</span>
                  <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.5)' }}>Over-committed</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* What If toolbar */}
      <AnimatePresence>
        {isWhatIf && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="px-4 mb-3">
            {whatIfFirstActivation && simulations.length === 0 && (
              <div className="mb-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={14} className="text-white/30" />
                  <span className="text-[12px] text-white/30">Try a scenario:</span>
                </div>
                <div className="space-y-1.5">
                  <button onClick={() => handleQuickScenario('rent')}
                    className="w-full px-3 h-9 rounded-xl text-left text-[13px] text-white/60 flex items-center"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    🏠 Cheaper rent (-€100)
                  </button>
                  <button onClick={() => handleQuickScenario('save')}
                    className="w-full px-3 h-9 rounded-xl text-left text-[13px] text-white/60 flex items-center"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    💰 Save €100 more
                  </button>
                  <button onClick={() => handleQuickScenario('income-drop')}
                    className="w-full px-3 h-9 rounded-xl text-left text-[13px] text-white/60 flex items-center"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    📉 Income drops 20%
                  </button>
                </div>
              </div>
            )}

            {scenarioImpact && (
              <div className="mb-3 rounded-xl p-3" style={{
                background: scenarioImpact.isNegative ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
              }}>
                {activeScenarioLabel === 'rent' && (
                  <>
                    <p className="text-[14px] text-white">🏠 Rent: €{scenarioImpact.originalValue} → <span className="text-green-400">€{scenarioImpact.newValue}</span></p>
                    <p className="text-[14px] text-green-400">Free: €{Math.round(freeAmount)} → €{Math.round(scenarioImpact.newFree)} (+€100/mo)</p>
                    <p className="text-[13px] text-white/50">That's €{scenarioImpact.annualSaved}/year saved</p>
                    {scenarioImpact.goalImpact && <p className="text-[13px] text-green-400/60">{scenarioImpact.goalImpact}</p>}
                  </>
                )}
                {activeScenarioLabel === 'save' && (
                  <>
                    <p className="text-[14px] text-white">💰 Savings: €{scenarioImpact.originalValue} → <span className="text-green-400">€{scenarioImpact.newValue}</span></p>
                    <p className="text-[14px] text-white/60">Free: €{Math.round(freeAmount)} → €{Math.round(scenarioImpact.newFree)}</p>
                    <p className="text-[13px] text-white/50">€{scenarioImpact.annualSaved}/year more saved</p>
                  </>
                )}
                {activeScenarioLabel === 'income-drop' && (
                  <>
                    <p className="text-[14px] text-white">⚠️ Income: <span className="line-through text-red-400/60">€{scenarioImpact.originalValue}</span> → <span className="text-amber-400">€{scenarioImpact.newValue}</span></p>
                    {scenarioImpact.isNegative ? (
                      <>
                        <p className="text-[14px] text-amber-400">You'd be €{Math.abs(Math.round(scenarioImpact.newFree))}/month over-committed</p>
                        <p className="text-[13px] text-white/50">You'd need to cut spending by €{Math.abs(Math.round(scenarioImpact.newFree))}</p>
                      </>
                    ) : (
                      <p className="text-[14px] text-white/60">Free: €{Math.round(freeAmount)} → €{Math.round(scenarioImpact.newFree)}</p>
                    )}
                  </>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => { handleWhatIfReset(); setActiveScenarioLabel(null); }}
                    className="px-3 py-1.5 rounded-full text-[12px] text-white/50" style={{ background: 'rgba(255,255,255,0.10)' }}>Reset</button>
                  <button onClick={handleWhatIfSave}
                    className="px-3 py-1.5 rounded-full text-[12px] text-white font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}>Save All</button>
                  <button onClick={handleTryAnother}
                    className="px-3 py-1.5 rounded-full text-[12px] text-white/50" style={{ background: 'rgba(255,255,255,0.10)' }}>Try Another</button>
                </div>
              </div>
            )}

            {!scenarioImpact && !whatIfFirstActivation && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/40">Changes: {simulations.length}</span>
                <div className="flex items-center gap-2">
                  <button onClick={handleWhatIfReset} className="px-3 py-1 rounded-full text-[12px] text-white/50" style={{ background: 'rgba(255,255,255,0.10)' }}>Reset</button>
                  <button onClick={handleWhatIfSave} className="px-3 py-1 rounded-full text-[12px] text-white font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}>Save all</button>
                  <button onClick={handleWhatIfDone} className="text-[12px] text-white/40">Done</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Impact Summary */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between rounded-2xl px-4" style={{ height: 40, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
          <span className="text-[13px]" style={{ color: freeAmount < 0 ? '#F59E0B' : 'rgba(255,255,255,0.5)' }}>
            {freeAmount < 0 ? `€${Math.abs(Math.round(freeAmount))} over-committed` : `€${Math.round(freeAmount)} unallocated`}
          </span>
          <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${paceStatus === 'on-track' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {paceStatus === 'on-track' ? 'Spending OK' : 'Watch spending'}
          </span>
          <span className="text-[13px] text-white/50">€{Math.round(flexRemaining)} · €{Math.round(dailyAllowance)}/day</span>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => { setPrefillAmount(undefined); setPrefillCatId(undefined); setFabMode(undefined); setShowFab(true); }}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}>
        <Plus size={24} className="text-white" />
      </button>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet open={showFab} onClose={() => { setShowFab(false); setFabMode(undefined); setAffordInput(''); }}
        prefillAmount={prefillAmount} prefillCategoryId={prefillCatId} initialMode={fabMode} />
    </div>
  );
}

// ── Wrapper with BudgetProvider ──
export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
