import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Sliders, Lock, PiggyBank, ShieldCheck, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isYesterday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';

const iconMap: Record<string, LucideIcon> = {
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
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [animated, setAnimated] = useState(false);
  const initialAnimDone = useRef(false);
  const [flashCategoryId, setFlashCategoryId] = useState<string | null>(null);

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [originalBudget, setOriginalBudget] = useState(0);

  const sortedCategories = useMemo(
    () => [...expenseCategories].sort((a, b) => b.monthlyBudget - a.monthlyBudget),
    [expenseCategories]
  );

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
  }, []);

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

  // Compute adjusted impact values when slider is active
  const sliderDiff = expandedId ? sliderValue - originalBudget : 0;
  const adjustedRemaining = flexRemaining - sliderDiff;
  const adjustedDaily = daysRemaining > 0 ? Math.max(0, adjustedRemaining / daysRemaining) : 0;

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

        {/* Container */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.20)',
            borderRadius: 20,
            boxShadow: 'inset 0 0 30px rgba(255,255,255,0.03)',
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
                  const Icon = iconMap[cat.icon] || MoreHorizontal;
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

                  // Get transactions for this category
                  const catTransactions = transactions.filter(t => t.type === 'expense' && t.categoryId === cat.id);

                  return (
                    <motion.div
                      key={cat.id}
                      className="relative flex-shrink-0 overflow-hidden cursor-pointer"
                      animate={{ height: h }}
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

        {/* Impact Summary Row */}
        <div
          className="mt-3 flex items-center justify-between px-4"
          style={{
            height: 40,
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16,
          }}
        >
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
      <AddTransactionSheet open={showAddTransaction} onClose={handleTransactionClose} />
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
