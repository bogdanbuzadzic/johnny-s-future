import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sliders, Lock, PiggyBank, ShoppingBag, Target, Wallet, ChevronRight,
  ArrowLeft, FlaskConical, Sparkles, CircleX, RotateCcw, Check, X,
  UtensilsCrossed, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark,
  Car, Tv, Shield, Baby, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2,
  RefreshCw, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format, parseISO, isToday as isTodayFn, isYesterday as isYesterdayFn, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
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
  UtensilsCrossed: '#FF9F0A', ShoppingBag: '#FF6B9D', Bus: '#007AFF', Film: '#8B5CF6',
  Dumbbell: '#34C759', CreditCard: '#5AC8FA', Coffee: '#C4956A', Smartphone: '#FF6B9D',
  Gift: '#FFD700', BookOpen: '#007AFF', Shirt: '#8B5CF6', Wrench: '#5AC8FA',
  Heart: '#E040FB', MoreHorizontal: '#AAA', Home: '#6366F1', Zap: '#FF9F0A',
  Landmark: '#14B8A6', Car: '#007AFF', Tv: '#8B5CF6', Shield: '#34C759', Baby: '#FF6B9D',
  TrendingUp: '#34C759', LineChart: '#5AC8FA', Sunset: '#FF9F0A',
  Target: '#34C759', ShieldCheck: '#34C759', Plane: '#5AC8FA', Laptop: '#8B5CF6',
  GraduationCap: '#14B8A6', Gamepad2: '#5AC8FA', PiggyBank: '#34C759', Wallet: '#FFFFFF',
};

const fixedColors = ['#B0B0B0', '#8E8E93', '#6E6E73', '#545458', '#3A3A3C'];
const goalColors = ['#34C759', '#5AC8FA', '#6366F1', '#8B5CF6', '#14B8A6'];

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
  if (ratio > 0.30) return { col: 3, row: 2 };
  if (ratio > 0.20) return { col: 2, row: 2 };
  if (ratio > 0.10) return { col: 2, row: 1 };
  return { col: 1, row: 1 };
}

// ── Sub-Tetris Types ──
type SubView = 'fixed' | 'savings' | 'spending' | 'goals' | null;

// ── Main Content ──
function MyMoneyContent() {
  const {
    config, expenseCategories, fixedCategories, flexBudget, flexSpent, flexRemaining,
    dailyAllowance, paceStatus, getCategorySpent, totalFixed, transactions,
    updateCategory, daysRemaining, daysInMonth, dayOfMonth, addCategory, addTransaction,
  } = useBudget();
  const { goals, addGoal, updateGoal, setActiveTab } = useApp();

  // ── Empty state check ──
  const clarityDone = localStorage.getItem('jfb_clarity_done') === 'true';

  // ── Persona ──
  const persona = useMemo(() => {
    try {
      const m0 = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      return getPersona(m0);
    } catch { return null; }
  }, []);
  const personaName = persona?.n || null;

  const totalIncome = Number(config.monthlyIncome) || 0;
  const savingsTarget = Number(config.monthlySavingsTarget) || 0;
  const totalSpendingBudget = useMemo(() => expenseCategories.reduce((s, c) => s + (Number(c.monthlyBudget) || 0), 0), [expenseCategories]);
  const totalGoalContributions = useMemo(() => goals.reduce((s, g) => s + (Number(g.monthlyContribution) || 0), 0), [goals]);
  const freeAmount = totalIncome - totalFixed - savingsTarget - totalSpendingBudget - totalGoalContributions;

  // Category spent map
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
  const [subView, setSubView] = useState<SubView>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [sliderOriginal, setSliderOriginal] = useState(0);
  const [showFab, setShowFab] = useState(false);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillCatId, setPrefillCatId] = useState<string | undefined>();
  const [manageSubscriptions, setManageSubscriptions] = useState(false);
  const [cancellingSubName, setCancellingSubName] = useState<string | null>(null);

  // Can I Afford
  const [affordInput, setAffordInput] = useState('');
  const [affordCatId, setAffordCatId] = useState<string | null>(null);
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Default afford category
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
    if (afterFlex <= 0) {
      const text = getAffordText('over', personaName, Math.round(afterDaily), daysRemaining, shortage);
      return { text, color: '#FF9F0A', catName };
    }
    if (afterFlex > flexBudget * 0.3) {
      const text = getAffordText('comfortable', personaName, Math.round(afterDaily), daysRemaining, 0);
      return { text, color: '#34C759', catName };
    }
    if (afterFlex > flexBudget * 0.1) {
      const text = getAffordText('tight', personaName, Math.round(afterDaily), daysRemaining, 0);
      return { text, color: '#FFFFFF', catName };
    }
    const text = getAffordText('tight', personaName, Math.round(afterDaily), daysRemaining, 0);
    return { text, color: '#FF9F0A', catName };
  }, [affordNum, flexRemaining, daysRemaining, flexBudget, affordCatId, expenseCategories, personaName]);

  // Sorted fixed cats with assigned colors
  const sortedFixed = useMemo(() =>
    [...fixedCategories].sort((a, b) => b.monthlyBudget - a.monthlyBudget).map((c, i) => ({
      ...c, _color: fixedColors[Math.min(i, fixedColors.length - 1)]
    })), [fixedCategories]);

  // Sorted goals with assigned colors
  const sortedGoals = useMemo(() =>
    [...goals].sort((a, b) => b.monthlyContribution - a.monthlyContribution).map((g, i) => ({
      ...g, _color: goalColors[Math.min(i, goalColors.length - 1)]
    })), [goals]);

  // Macro blocks
  const macroBlocks = useMemo(() => {
    const goalsDisplay = zoom === '5 Year' ? goals.reduce((s, g) => s + g.target, 0) : totalGoalContributions;
    return [
      { id: 'fixed', name: 'Fixed', icon: 'Lock', amount: totalFixed, tint: '#6E6E73', tintAlpha: 0.25 },
      { id: 'savings', name: 'Savings', icon: 'PiggyBank', amount: savingsTarget, tint: '#34C759', tintAlpha: 0.20 },
      { id: 'spending', name: 'Spending', icon: 'ShoppingBag', amount: totalSpendingBudget, tint: '#8B5CF6', tintAlpha: 0.20 },
      { id: 'goals', name: 'Goals', icon: 'Target', amount: goalsDisplay, tint: '#FF6B9D', tintAlpha: 0.15 },
      { id: 'free', name: 'Free', icon: 'Wallet', amount: freeAmount, tint: '#FFFFFF', tintAlpha: 0.04 },
    ].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [totalFixed, savingsTarget, totalSpendingBudget, totalGoalContributions, freeAmount, goals, zoom]);

  // What If handlers
  const whatIfChangeCount = simulations.length;
  const handleWhatIfReset = () => setSimulations([]);
  const handleWhatIfSave = () => {
    // TODO: persist simulations to real data
    setSimulations([]);
    setIsWhatIf(false);
  };
  const handleWhatIfDone = () => { setSimulations([]); setIsWhatIf(false); };

  // Expand item in sub-tetris
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
        const entry = { id: catId, field: subView || '', value: Math.round(sliderVal), original: sliderOriginal };
        if (existing >= 0) { const u = [...prev]; u[existing] = entry; return u; }
        return [...prev, entry];
      });
    } else {
      updateCategory(catId, { monthlyBudget: Math.round(sliderVal) });
    }
    setExpandedItemId(null);
  };

  // Income label
  const incomeLabel = zoom === 'Month' ? `Monthly Income · €${totalIncome}` : zoom === 'Year' ? `Annual Income · €${totalIncome * 12}` : `5-Year Income · €${totalIncome * 60}`;

  // Segmented bar renderer
  const renderSegmentedBar = (items: Array<{ name: string; amount: number; color: string }>, total: number) => {
    if (total <= 0 || items.length === 0) return null;
    const visible = items.filter(i => i.amount > 0).slice(0, 5);
    const legendItems = visible.slice(0, 3);
    const moreCount = visible.length - 3;
    return (
      <div className="absolute bottom-2 left-2.5 right-2.5">
        <div className="flex rounded overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.06)' }}>
          {visible.map((item, i) => (
            <div key={i} style={{ width: `${(item.amount / total) * 100}%`, background: hexToRgba(item.color, 0.6), minWidth: 2 }} />
          ))}
        </div>
        <div className="flex items-center gap-0 mt-0.5 overflow-hidden" style={{ fontSize: 9, lineHeight: '12px' }}>
          {legendItems.map((item, i) => (
            <span key={i}>
              {i > 0 && <span className="text-white/15"> · </span>}
              <span style={{ color: hexToRgba(item.color, 0.7) }}>{item.name} €{Math.round(item.amount * mult)}</span>
            </span>
          ))}
          {moreCount > 0 && <span className="text-white/15"> · +{moreCount} more</span>}
        </div>
      </div>
    );
  };

  // ── Render Macro Block ──
  const renderMacroBlock = (block: typeof macroBlocks[0]) => {
    const { id, name, icon, amount, tint, tintAlpha } = block;
    const Icon = getIcon(icon);
    const spans = getSpans(Math.abs(amount), totalIncome);
    const isFree = id === 'free';
    const displayAmount = Math.round(amount * mult);

    // Spending fill
    const spendingFillPct = id === 'spending' && totalSpendingBudget > 0 ? Math.min((flexSpent / totalSpendingBudget) * 100, 100) : 0;
    const spendingFillColor = spendingFillPct > 70 ? hexToRgba('#FF9F0A', 0.15) : hexToRgba('#8B5CF6', 0.15);

    // Ghost (can I afford)
    const isGhosting = id === 'spending' && affordNum > 0;

    // Segments
    let segments: Array<{ name: string; amount: number; color: string }> | null = null;
    let segTotal = 0;
    if (id === 'fixed') {
      segments = sortedFixed.map(c => ({ name: c.name, amount: c.monthlyBudget, color: c._color }));
      segTotal = totalFixed;
    } else if (id === 'spending') {
      segments = expenseCategories.map(c => ({ name: c.name, amount: c.monthlyBudget, color: getTint(c.icon) }));
      segTotal = totalSpendingBudget;
    } else if (id === 'goals') {
      segments = sortedGoals.map(g => ({ name: g.name, amount: zoom === '5 Year' ? g.target : g.monthlyContribution, color: g._color }));
      segTotal = zoom === '5 Year' ? goals.reduce((s, g) => s + g.target, 0) : totalGoalContributions;
    } else if (id === 'savings') {
      segments = [{ name: 'Target', amount: savingsTarget, color: '#34C759' }];
      segTotal = savingsTarget;
    }

    return (
      <motion.div
        key={id}
        layout
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{
          gridColumn: `span ${spans.col}`,
          gridRow: `span ${spans.row}`,
          background: isFree
            ? `rgba(255,255,255,0.04)`
            : `${hexToRgba(tint, tintAlpha)}`,
          border: isFree ? '1.5px dashed rgba(255,255,255,0.08)' : `1.5px solid ${hexToRgba(tint, 0.15)}`,
          minHeight: 80,
          opacity: isGhosting && id !== 'spending' && id !== 'free' ? 0.8 : 1,
        }}
        onClick={() => {
          if (isFree) return;
          setSubView(id as SubView);
        }}
        whileTap={isFree ? undefined : { scale: 0.97 }}
      >
        {/* Spending fill */}
        {id === 'spending' && spendingFillPct > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            initial={{ height: 0 }}
            animate={{ height: `${spendingFillPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: spendingFillColor, borderRadius: '0 0 16px 16px' }}
          />
        )}

        {/* Ghost section for Can I Afford */}
        {isGhosting && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              bottom: `${spendingFillPct}%`,
              height: `${Math.min((affordNum / totalSpendingBudget) * 100, 100 - spendingFillPct)}%`,
              background: 'rgba(255,255,255,0.12)',
              borderTop: '2px dashed rgba(255,255,255,0.15)',
              animation: 'ghostPulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Free block dotted grid */}
        {isFree && (
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }} />
        )}

        {/* Content */}
        <div className="relative z-10 p-3 h-full flex flex-col">
          <div className="flex items-start justify-between">
            <Icon size={20} style={{ color: hexToRgba(isFree ? '#FFFFFF' : tint, isFree ? 0.2 : 0.4) }} strokeWidth={1.5} />
            {!isFree && <ChevronRight size={16} className="text-white/15" />}
          </div>
          <div className="flex-1 flex flex-col justify-center mt-1">
            <span className={`text-[16px] ${isFree ? 'text-white/30' : 'text-white/50'}`}>{name}</span>
            <span className={`text-[22px] font-bold ${isFree ? 'text-white/40' : 'text-white'} ${freeAmount <= 0 && isFree ? 'text-amber-400/60' : ''}`}>
              €{Math.abs(displayAmount)}
              {isFree && freeAmount < 0 && <span className="text-[12px] ml-1">over</span>}
            </span>
          </div>

          {/* Johnny in free block */}
          {isFree && (
            <div className="flex items-center gap-2 mt-1">
              <motion.img src={johnnyImage} alt="Johnny" className="w-9 h-9 object-contain"
                animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
              <span className="text-[11px] text-white/15">€{Math.round(dailyAllowance)}/day</span>
            </div>
          )}
        </div>

        {/* Segmented bar */}
        {segments && renderSegmentedBar(segments, segTotal)}
      </motion.div>
    );
  };

  // ── Sub-Tetris Renderer ──
  const renderSubTetris = () => {
    if (!subView) return null;

    const blockMeta = {
      fixed: { name: 'Fixed Expenses', icon: 'Lock', tint: '#6E6E73', total: totalFixed },
      savings: { name: 'Savings', icon: 'PiggyBank', tint: '#34C759', total: savingsTarget },
      spending: { name: 'Spending', icon: 'ShoppingBag', tint: '#8B5CF6', total: totalSpendingBudget },
      goals: { name: 'Goals', icon: 'Target', tint: '#FF6B9D', total: zoom === '5 Year' ? goals.reduce((s, g) => s + g.target, 0) : totalGoalContributions },
    }[subView]!;

    const Icon = getIcon(blockMeta.icon);
    const pct = totalIncome > 0 ? Math.round((blockMeta.total / totalIncome) * 100) : 0;

    return (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', duration: 0.3 }}
        style={{ background: 'linear-gradient(to bottom, #B4A6B8, #9B80B4)' }}
      >
        {/* Header */}
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => { setSubView(null); setExpandedItemId(null); }} className="p-1">
              <ArrowLeft size={24} className="text-white/50" />
            </button>
            <Icon size={22} style={{ color: hexToRgba(blockMeta.tint, 0.6) }} />
            <span className="text-[20px] font-bold text-white">{blockMeta.name}</span>
          </div>
          <div className="ml-10">
            <span className="text-[13px] text-white/40">€{Math.round(blockMeta.total * mult)} of €{Math.round(totalIncome * mult)} · {pct}% of income</span>
            <div className="mt-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: hexToRgba(blockMeta.tint, 0.5) }} />
            </div>
          </div>
        </div>

        {/* Sub-container */}
        <div className="flex-1 mx-4 mb-20 rounded-[20px] overflow-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.15)' }}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] auto-rows-[minmax(80px,auto)] gap-2 p-3">
            {subView === 'fixed' && sortedFixed.map(cat => {
              const CatIcon = getIcon(cat.icon);
              const sp = getSpans(cat.monthlyBudget, totalFixed);
              return (
                <div key={cat.id} className="relative rounded-xl p-3 flex flex-col" style={{
                  gridColumn: `span ${sp.col}`, gridRow: `span ${sp.row}`,
                  background: hexToRgba(cat._color, 0.25), border: '1.5px solid rgba(255,255,255,0.10)',
                }}>
                  <div className="flex items-start justify-between">
                    <CatIcon size={18} className="text-white/40" strokeWidth={1.5} />
                    <Lock size={10} className="text-white/15" />
                  </div>
                  <span className="text-[14px] text-white/50 mt-2">{cat.name}</span>
                  <span className="text-[18px] font-bold text-white">€{Math.round(cat.monthlyBudget * mult)}</span>
                  <span className="text-[10px] text-white/15 mt-0.5">fixed</span>
                </div>
              );
            })}

            {/* Subscription card in spending sub-view */}
            {subView === 'spending' && (() => {
              const recurringTxs = transactions.filter(t => t.isRecurring === true);
              const subscriptionMap: Record<string, { name: string; amount: number; categoryId: string }> = {};
              recurringTxs.forEach(t => {
                const key = (t.description || 'Unknown').trim();
                if (!subscriptionMap[key]) subscriptionMap[key] = { name: key, amount: Number(t.amount) || 0, categoryId: t.categoryId };
              });
              const subscriptions = Object.values(subscriptionMap);
              const monthlySubTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);
              const annualSubTotal = monthlySubTotal * 12;
              const hourlyRate = totalIncome > 0 ? totalIncome / 160 : 0;
              const hoursOfWork = hourlyRate > 0 ? Math.round(annualSubTotal / hourlyRate) : 0;

              if (subscriptions.length === 0) return null;
              return (
                <div className="col-span-full rounded-xl p-3 mb-1" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={16} className="text-white/40" />
                      <span className="text-sm font-bold text-white">Subscriptions</span>
                    </div>
                    <span className="text-base font-bold text-white">€{Math.round(monthlySubTotal)}/mo</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                    {subscriptions.map((sub, i) => {
                      const cat = expenseCategories.find(c => c.id === sub.categoryId);
                      const tintColor = cat ? getTint(cat.icon) : '#fff';
                      return (
                        <span key={i} className="shrink-0 flex items-center gap-1.5 px-2.5 rounded-full text-[11px] text-white/50"
                          style={{ height: 28, background: 'rgba(255,255,255,0.08)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: tintColor }} />
                          {sub.name} €{Math.round(sub.amount)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-white/25">Annual: €{annualSubTotal} · {hoursOfWork} hours of work/year</span>
                    <button onClick={() => setManageSubscriptions(!manageSubscriptions)} className="text-[11px]" style={{ color: 'rgba(139,92,246,0.6)' }}>
                      {manageSubscriptions ? 'Close' : 'Manage →'}
                    </button>
                  </div>
                  {manageSubscriptions && (
                    <div className="mt-2 border-t border-white/5 pt-2 space-y-1">
                      {subscriptions.map((sub, i) => {
                        const isCancelling = cancellingSubName === sub.name;
                        const cat = expenseCategories.find(c => c.id === sub.categoryId);
                        const tintColor = cat ? getTint(cat.icon) : '#fff';
                        const newDaily = daysRemaining > 0 ? Math.round((flexRemaining + sub.amount) / daysRemaining) : 0;
                        return (
                          <div key={i}>
                            <div className="flex items-center h-11">
                              <span className="w-2 h-2 rounded-full mr-2" style={{ background: tintColor }} />
                              <span className={`flex-1 text-[13px] text-white ${isCancelling ? 'line-through opacity-50' : ''}`}>{sub.name}</span>
                              <span className="text-[12px] text-white/40 mr-3">€{sub.amount}/mo · €{sub.amount * 12}/yr</span>
                              <button onClick={() => setCancellingSubName(isCancelling ? null : sub.name)} className="text-[11px]" style={{ color: 'rgba(139,92,246,0.5)' }}>
                                {isCancelling ? 'Undo' : 'Cancel?'}
                              </button>
                            </div>
                            {isCancelling && (
                              <div className="ml-4 mb-2 text-[12px] space-y-1">
                                <p style={{ color: 'rgba(52,199,89,0.5)' }}>Cancelling {sub.name}: saves €{sub.amount * 12}/yr. Daily budget: €{Math.round(dailyAllowance)} → €{newDaily}/day</p>
                                {goals.length > 0 && <p style={{ color: 'rgba(52,199,89,0.4)' }}>{goals[0].name}: {Math.round(sub.amount / (goals[0].monthlyContribution || 1) * 4)} weeks sooner</p>}
                                <div className="flex gap-2 mt-1">
                                  <button onClick={() => { /* remove isRecurring from matching transactions */ setCancellingSubName(null); }} className="px-3 py-1 rounded-full text-[11px] text-white" style={{ background: 'rgba(52,199,89,0.2)' }}>Confirm cancel</button>
                                  <button onClick={() => setCancellingSubName(null)} className="px-3 py-1 rounded-full text-[11px] text-white/30" style={{ background: 'rgba(255,255,255,0.08)' }}>Just checking</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {subView === 'spending' && expenseCategories.map(cat => {
              const CatIcon = getIcon(cat.icon);
              const tint = getTint(cat.icon);
              const spent = categorySpentMap[cat.id] || 0;
              const budget = cat.monthlyBudget;
              const fillPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const fillColor = fillPct > 70 ? hexToRgba('#FF9F0A', 0.35) : hexToRgba(tint, 0.40);
              const sp = getSpans(budget, totalSpendingBudget);
              const isExpanded = expandedItemId === cat.id;

              return (
                <motion.div key={cat.id} layout className="relative rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    gridColumn: isExpanded ? '1 / -1' : `span ${sp.col}`,
                    gridRow: isExpanded ? 'span 3' : `span ${sp.row}`,
                    background: hexToRgba(tint, 0.25), border: `1.5px solid ${hexToRgba(tint, 0.20)}`,
                    borderLeft: `4px solid ${hexToRgba(tint, 0.50)}`,
                    minHeight: isExpanded ? 280 : 80,
                  }}
                  onClick={() => handleExpandItem(cat.id, budget)}
                >
                  {/* Fill */}
                  <motion.div className="absolute bottom-0 left-0 right-0" initial={{ height: 0 }}
                    animate={{ height: `${fillPct}%` }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    style={{ background: fillColor, borderRadius: '0 0 12px 12px' }} />

                  <div className="relative z-10 p-3">
                    <div className="flex items-start justify-between">
                      <CatIcon size={18} className="text-white/70" strokeWidth={1.5} />
                    </div>
                    <span className="text-[14px] text-white mt-1 block">{cat.name}</span>
                    <span className="text-[12px] text-white/40">€{Math.round(spent)} / €{Math.round(budget * mult)}</span>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="relative z-10 px-3 pb-3" onClick={e => e.stopPropagation()}>
                        <div className="h-px bg-white/5 mb-3" />
                        <div className="text-center mb-2">
                          <span className="text-[18px] font-bold text-white">€{Math.round(sliderVal)}</span>
                        </div>
                        <input type="range" min={0} max={Math.round(budget + flexRemaining)} value={Math.round(sliderVal)}
                          onChange={e => setSliderVal(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, ${hexToRgba(tint, 0.35)} ${(sliderVal / (budget + flexRemaining)) * 100}%, rgba(255,255,255,0.10) ${(sliderVal / (budget + flexRemaining)) * 100}%)` }}
                        />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-white/15">€0</span>
                          <span className="text-[10px] text-white/15">€{Math.round(budget + flexRemaining)}</span>
                        </div>
                        <div className="mt-2 text-[13px]">
                          {Math.round(sliderVal) === Math.round(budget) ? (
                            <span className="text-white/25">Drag to adjust</span>
                          ) : (() => {
                            const diff = Math.round(sliderVal) - Math.round(budget);
                            const newDaily = Math.round((flexRemaining + budget - sliderVal) / daysRemaining);
                            const nearestGoal = goals[0]?.name;
                            const goalText = nearestGoal ? `→ ${nearestGoal}` : '';
                            const text = getImpactText(diff, newDaily, goalText, personaName);
                            return (
                              <span className="text-white/60">{text}</span>
                            );
                          })()}
                        </div>
                        {Math.round(sliderVal) !== Math.round(budget) && (
                          <div className="flex justify-center gap-3 mt-3">
                            <button onClick={() => handleSliderSave(cat.id)}
                              style={{ height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}
                              className="text-white font-medium text-[13px] px-6">Save</button>
                            <button onClick={() => setExpandedItemId(null)}
                              style={{ height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)' }}
                              className="text-white/40 font-medium text-[13px] px-6">Cancel</button>
                          </div>
                        )}
                        {/* Recent transactions */}
                        <div className="mt-3">
                          <span className="text-[12px] text-white/30">Recent</span>
                          {(() => {
                            const now = new Date();
                            const catTxns = transactions
                              .filter(t => t.categoryId === cat.id && t.type === 'expense' && isWithinInterval(parseISO(t.date), { start: startOfMonth(now), end: endOfMonth(now) }))
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 4);
                            if (catTxns.length === 0) return <div className="text-[12px] text-white/20 text-center py-2">No spending yet</div>;
                            return catTxns.map(t => (
                              <div key={t.id} className="flex justify-between py-1">
                                <div>
                                  <div className="text-[13px] text-white/60 truncate">{t.description || 'Untitled'}</div>
                                  <div className="text-[10px] text-white/25">{isTodayFn(parseISO(t.date)) ? 'Today' : isYesterdayFn(parseISO(t.date)) ? 'Yesterday' : format(parseISO(t.date), 'MMM d')}</div>
                                </div>
                                <span className="text-[13px] text-white/50">-€{Number(t.amount).toFixed(2)}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {subView === 'goals' && sortedGoals.map(goal => {
              const GoalIcon = getIcon(goal.icon);
              const pctFunded = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
              const dispAmount = zoom === '5 Year' ? goal.target : goal.monthlyContribution;
              const sp = getSpans(dispAmount, blockMeta.total);
              const isExpanded = expandedItemId === goal.id;
              const remaining = goal.target - goal.saved;
              const monthsToGoal = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : Infinity;

              return (
                <motion.div key={goal.id} layout className="relative rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    gridColumn: isExpanded ? '1 / -1' : `span ${sp.col}`,
                    gridRow: isExpanded ? 'span 3' : `span ${sp.row}`,
                    background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.12)',
                    minHeight: isExpanded ? 280 : 80,
                  }}
                  onClick={() => handleExpandItem(goal.id, goal.monthlyContribution)}
                >
                  <div className="relative z-10 p-3">
                    <GoalIcon size={18} className="text-white/50" strokeWidth={1.5} />
                    <span className="text-[14px] font-bold text-white mt-1 block">{goal.name}</span>
                    <span className="text-[12px] text-white/40">€{goal.saved} / €{goal.target}</span>
                    <div className="mt-1.5 h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pctFunded}%`, background: 'linear-gradient(90deg, #8B5CF6, #FF6B9D)' }} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="relative z-10 px-3 pb-3" onClick={e => e.stopPropagation()}>
                        <div className="h-px bg-white/5 mb-3" />
                        {/* Progress ring */}
                        <div className="flex flex-col items-center mb-3">
                          <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
                            <circle cx={40} cy={40} r={34} fill="none"
                              stroke="url(#goalGrad)" strokeWidth={6}
                              strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - pctFunded / 100)} strokeLinecap="round" />
                            <defs><linearGradient id="goalGrad"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#FF6B9D" /></linearGradient></defs>
                          </svg>
                          <span className="text-white mt-1">{Math.round(pctFunded)}% funded</span>
                        </div>
                        <div className="text-center mb-2">
                          <span className="text-[18px] font-bold text-white">€{Math.round(sliderVal)}/month</span>
                        </div>
                        <input type="range" min={0} max={Math.round(goal.monthlyContribution + Math.max(freeAmount, 0))} value={Math.round(sliderVal)}
                          onChange={e => setSliderVal(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, rgba(52,199,89,0.35) ${(sliderVal / Math.max(goal.monthlyContribution + Math.max(freeAmount, 0), 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
                        />
                        <div className="mt-2 text-[13px] text-white/50">
                          {sliderVal > 0 ? `At €${Math.round(sliderVal)}/mo: reach in ${isFinite(monthsToGoal) ? monthsToGoal : '∞'} months` : 'Set contribution to start saving'}
                        </div>
                        {Math.round(sliderVal) !== Math.round(goal.monthlyContribution) && (
                          <div className="flex justify-center gap-3 mt-3">
                            <button onClick={() => { updateGoal(goal.id, { monthlyContribution: Math.round(sliderVal) }); setExpandedItemId(null); }}
                              style={{ height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #34C759, #14B8A6)' }}
                              className="text-white font-medium text-[13px] px-6">Save</button>
                            <button onClick={() => setExpandedItemId(null)}
                              style={{ height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)' }}
                              className="text-white/40 font-medium text-[13px] px-6">Cancel</button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {subView === 'savings' && (
              <div className="relative rounded-xl p-4 flex flex-col items-center justify-center col-span-full" style={{
                background: 'rgba(52,199,89,0.15)', border: '1.5px solid rgba(52,199,89,0.15)', minHeight: 120,
              }}>
                <PiggyBank size={28} className="text-white/40 mb-2" />
                <span className="text-[16px] text-white/50">Savings Target</span>
                <span className="text-[24px] font-bold text-white">€{Math.round(savingsTarget * mult)}</span>
              </div>
            )}

            {/* Add button */}
            {(subView === 'spending' || subView === 'goals' || subView === 'fixed') && (
              <button className="flex items-center justify-center rounded-xl" style={{
                border: '2px dashed rgba(255,255,255,0.15)', minHeight: 80,
              }} onClick={() => { /* TODO: add form */ }}>
                <Plus size={20} className="text-white/30" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Empty state when Clarity not done ──
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
          {/* Category picker */}
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
        {/* Answer */}
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

      {/* Income label */}
      <div className="px-4 mb-2 flex items-center gap-1.5">
        <Wallet size={16} className="text-white/25" />
        <span className="text-[14px] text-white/40">{incomeLabel}</span>
      </div>

      {/* Macro Container */}
      <div className="px-4 mb-3">
        <div className="rounded-[20px] overflow-hidden relative" style={{
          background: 'rgba(255,255,255,0.04)',
          border: isWhatIf ? '2px dashed rgba(255,255,255,0.10)' : '2px solid rgba(255,255,255,0.15)',
          height: '58vh',
          animation: isWhatIf ? 'ghostPulse 3s ease-in-out infinite' : undefined,
        }}>
          {isWhatIf && <div className="absolute top-1.5 right-3 z-10 text-[10px] text-white/15">Playground</div>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] auto-rows-[minmax(80px,auto)] gap-2 p-2.5 h-full">
            {macroBlocks.map(renderMacroBlock)}
          </div>
        </div>
      </div>

      {/* What If toolbar */}
      <AnimatePresence>
        {isWhatIf && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="px-4 mb-3 flex items-center justify-between">
            <span className="text-[12px] text-white/40">Changes: {whatIfChangeCount}</span>
            <div className="flex items-center gap-2">
              <button onClick={handleWhatIfReset} className="px-3 py-1 rounded-full text-[12px] text-white/50" style={{ background: 'rgba(255,255,255,0.10)' }}>Reset</button>
              <button onClick={handleWhatIfSave} className="px-3 py-1 rounded-full text-[12px] text-white font-medium" style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}>Save all</button>
              <button onClick={handleWhatIfDone} className="text-[12px] text-white/40">Done</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Impact Summary */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between rounded-2xl px-4" style={{ height: 40, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
          <span className="text-[13px] text-white/40">€{Math.round(freeAmount)} free</span>
          <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${paceStatus === 'on-track' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {paceStatus === 'on-track' ? 'Spending OK' : 'Watch spending'}
          </span>
          <span className="text-[13px] text-white/40">€{Math.round(flexRemaining)} left · €{Math.round(dailyAllowance)}/day</span>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => { setPrefillAmount(undefined); setPrefillCatId(undefined); setShowFab(true); }}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)' }}>
        <Plus size={24} className="text-white" />
      </button>

      {/* Sub-Tetris overlay */}
      <AnimatePresence>{renderSubTetris()}</AnimatePresence>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet open={showFab} onClose={() => { setShowFab(false); setAffordInput(''); }}
        prefillAmount={prefillAmount} prefillCategoryId={prefillCatId} />
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
