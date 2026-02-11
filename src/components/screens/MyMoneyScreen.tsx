import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Sliders, Lock, PiggyBank, ShieldCheck, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

function MyMoneyContent() {
  const {
    config, expenseCategories, fixedCategories, flexBudget, flexSpent,
    flexRemaining, dailyAllowance, paceStatus, getCategorySpent,
    totalFixed,
  } = useBudget();
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [animated, setAnimated] = useState(false);
  const initialAnimDone = useRef(false);
  const [flashCategoryId, setFlashCategoryId] = useState<string | null>(null);

  // Staggered fill animation on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setAnimated(true);
      // Mark initial animation done after last block finishes
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
    // We could track the last added category from context, but for simplicity
    // flash the most recently changed category on next render
  }, []);

  const hasExpenses = expenseCategories.length > 0;

  const sortedCategories = useMemo(
    () => [...expenseCategories].sort((a, b) => b.monthlyBudget - a.monthlyBudget),
    [expenseCategories]
  );

  // Block heights
  const FIXED_BAR = 36;
  const SAVINGS_BAR = 36;
  const GAP = 6;
  const MIN_H = 56;
  const MAX_H = 160;

  const totalGaps = Math.max(0, sortedCategories.length - 1) * GAP;

  function blockHeight(budget: number): number {
    if (flexBudget <= 0) return MIN_H;
    const containerPx = window.innerHeight * 0.55 - FIXED_BAR - SAVINGS_BAR - totalGaps;
    const raw = (budget / flexBudget) * containerPx;
    return Math.max(MIN_H, Math.min(MAX_H, raw));
  }

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
            height: '55vh',
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
                  const h = blockHeight(cat.monthlyBudget);
                  const fillPercent = cat.monthlyBudget > 0
                    ? Math.min((spent / cat.monthlyBudget) * 100, 110)
                    : 0;
                  const isOver = fillPercent > 100;
                  const fillColor = getFillColor(fillPercent, tint);
                  const fillRadius = fillPercent >= 100
                    ? '16px'
                    : '0 0 16px 16px';
                  const isFlashing = flashCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="relative flex-shrink-0 overflow-hidden"
                      style={{
                        height: h,
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
                          <span className="text-primary-white/50"> / €{Math.round(cat.monthlyBudget)}</span>
                        </span>
                      </div>
                    </div>
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
            €{Math.round(flexRemaining)} left
          </span>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-primary-white font-medium"
            style={{ fontSize: 11, background: hexToRgba(paceColor, 0.7) }}
          >
            <PaceIcon size={12} strokeWidth={1.5} />
            {paceLabel}
          </span>
          <span style={{ fontSize: 13 }} className="text-primary-white/50">
            €{Math.round(dailyAllowance)}/day
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
