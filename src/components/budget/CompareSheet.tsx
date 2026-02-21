import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Minus, Plus } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  Food: '#E67E22', Entertainment: '#9B59B6', Shopping: '#E74C3C', Lifestyle: '#1ABC9C',
};

type CompareMode = 'menu' | 'plan-vs-actual' | 'month-vs-month' | 'compare-plans';

interface CompareSheetProps {
  open: boolean;
  onClose: () => void;
}

const presets = [
  { id: 'custom', label: 'Custom' },
  { id: 'save-15', label: 'Save 15%' },
  { id: 'cut-spending', label: 'Cut spending' },
  { id: 'boost-goals', label: 'Boost goals' },
  { id: 'income-300', label: '+€300 income' },
];

export function CompareSheet({ open, onClose }: CompareSheetProps) {
  const [mode, setMode] = useState<CompareMode>('menu');
  const { config, expenseCategories, fixedCategories, totalFixed, getCategorySpent, transactions, updateCategory, updateConfig, savingsTarget } = useBudget();
  const { goals } = useApp();

  const totalIncome = config.monthlyIncome;
  const totalGoalContributions = goals.reduce((s, g) => s + g.monthlyContribution, 0);
  const currentSpending = expenseCategories.reduce((s, c) => s + c.monthlyBudget, 0);
  const currentFree = totalIncome - totalFixed - savingsTarget - currentSpending - totalGoalContributions;

  // Save snapshot on open
  useMemo(() => {
    if (!open) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const snapshot = {
      month: monthKey, income: totalIncome,
      categories: expenseCategories.map(c => ({ id: c.id, name: c.name, budget: c.monthlyBudget, spent: getCategorySpent(c.id, 'month') })),
      savings: savingsTarget, goalsTotal: totalGoalContributions,
    };
    const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
    snapshots[monthKey] = snapshot;
    localStorage.setItem('jfb_month_snapshots', JSON.stringify(snapshots));
  }, [open]);

  const handleClose = useCallback(() => {
    setMode('menu');
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              maxHeight: mode === 'menu' ? '50vh' : '85vh',
              background: 'rgba(15, 12, 24, 0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* ═══ MENU ═══ */}
            {mode === 'menu' && (
              <div className="px-5 pb-6">
                {[
                  { id: 'plan-vs-actual' as CompareMode, label: 'Plan vs. Actual', desc: 'How this month is tracking' },
                  { id: 'month-vs-month' as CompareMode, label: 'Month vs. Month', desc: 'Compare two months' },
                  { id: 'compare-plans' as CompareMode, label: 'Compare Plans', desc: 'Build and compare a new plan' },
                ].map((item, i) => (
                  <div key={item.id}
                    className="flex items-center cursor-pointer"
                    style={{ padding: '14px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                    onClick={() => setMode(item.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: 'white' }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.12)' }} />
                  </div>
                ))}
              </div>
            )}

            {/* ═══ PLAN VS ACTUAL ═══ */}
            {mode === 'plan-vs-actual' && (
              <PlanVsActualContent onBack={() => setMode('menu')} onClose={handleClose} />
            )}

            {/* ═══ MONTH VS MONTH ═══ */}
            {mode === 'month-vs-month' && (
              <MonthVsMonthContent onBack={() => setMode('menu')} onClose={handleClose} />
            )}

            {/* ═══ COMPARE PLANS ═══ */}
            {mode === 'compare-plans' && (
              <ComparePlansContent onBack={() => setMode('menu')} onClose={handleClose} />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Plan vs Actual ──
function PlanVsActualContent({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { expenseCategories, getCategorySpent } = useBudget();

  const categoryData = useMemo(() =>
    expenseCategories.map(cat => {
      const budget = cat.monthlyBudget;
      const spent = getCategorySpent(cat.id, 'month');
      const delta = spent - budget;
      const color = categoryColors[cat.name] || '#7F8C8D';
      return { name: cat.name, budget, spent, delta, color };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    [expenseCategories, getCategorySpent]);

  const totalVariance = categoryData.reduce((s, c) => s + c.delta, 0);

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Plan vs. Actual</span>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {/* Summary */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Overall</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: totalVariance > 0 ? '#FBBF24' : '#86EFAC', marginTop: 4 }}>
          {totalVariance > 0 ? '+' : ''}€{Math.round(Math.abs(totalVariance))} {totalVariance > 0 ? 'over plan' : 'under plan'}
        </div>
      </div>

      {/* Category rows */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px 14px' }}>
        {categoryData.map((c, i) => (
          <div key={c.name} className="flex items-center" style={{ padding: '10px 0', borderBottom: i < categoryData.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: c.color, marginRight: 8, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{c.name}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginRight: 12 }}>€{Math.round(c.budget)} plan</span>
            <span style={{ fontSize: 12, color: 'white', marginRight: 12 }}>€{Math.round(c.spent)} actual</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.delta > 0 ? '#FBBF24' : '#86EFAC', minWidth: 50, textAlign: 'right' }}>
              {c.delta > 0 ? '+' : ''}€{Math.round(c.delta)}
            </span>
          </div>
        ))}
      </div>

      <button onClick={onClose} style={{
        marginTop: 16, width: '100%', height: 44, borderRadius: 10,
        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
        fontSize: 14, fontWeight: 500, border: 'none',
      }}>Done</button>
    </div>
  );
}

// ── Month vs Month ──
function MonthVsMonthContent({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { expenseCategories, transactions } = useBudget();
  const now = new Date();

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => { months.add(format(parseISO(t.date), 'yyyy-MM')); });
    months.add(format(now, 'yyyy-MM'));
    months.add(format(subMonths(now, 1), 'yyyy-MM'));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const [refIdx, setRefIdx] = useState(Math.min(1, availableMonths.length - 1));
  const refMonth = availableMonths[refIdx] || format(subMonths(now, 1), 'yyyy-MM');
  const currentMonth = availableMonths[0] || format(now, 'yyyy-MM');
  const hasEnoughData = availableMonths.length >= 2;

  const getSpending = useCallback((monthKey: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));
    const spending: Record<string, number> = {};
    let total = 0;
    transactions.forEach(t => {
      if (t.type !== 'expense') return;
      const d = parseISO(t.date);
      if (!isWithinInterval(d, { start, end })) return;
      spending[t.categoryId] = (spending[t.categoryId] || 0) + t.amount;
      total += t.amount;
    });
    return { spending, total };
  }, [transactions]);

  const refData = useMemo(() => getSpending(refMonth), [refMonth, getSpending]);
  const currentData = useMemo(() => getSpending(currentMonth), [currentMonth, getSpending]);
  const totalChange = currentData.total - refData.total;

  const fmtMonth = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return format(new Date(y, m - 1), 'MMMM yyyy');
  };

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Month vs. Month</span>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {!hasEnoughData ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Available after your first full month
        </div>
      ) : (
        <>
          {/* Month selector */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={() => setRefIdx(prev => Math.min(prev + 1, availableMonths.length - 1))}>
              <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{fmtMonth(refMonth).split(' ')[0]}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>vs.</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{fmtMonth(currentMonth).split(' ')[0]}</span>
            <button onClick={() => setRefIdx(prev => Math.max(prev - 1, 0))}>
              <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>

          {/* Summary */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Total Change</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: totalChange > 0 ? '#FBBF24' : '#86EFAC', marginTop: 4 }}>
              {totalChange > 0 ? '+' : ''}€{Math.round(Math.abs(totalChange))} {totalChange > 0 ? 'more' : 'less'}
            </div>
          </div>

          {/* Category comparison */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px 14px' }}>
            {expenseCategories.map((cat, i) => {
              const ref = refData.spending[cat.id] || 0;
              const cur = currentData.spending[cat.id] || 0;
              const pct = ref > 0 ? Math.round(((cur - ref) / ref) * 100) : cur > 0 ? 100 : 0;
              const color = categoryColors[cat.name] || '#7F8C8D';
              return (
                <div key={cat.id} className="flex items-center" style={{ padding: '10px 0', borderBottom: i < expenseCategories.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: color, marginRight: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginRight: 12 }}>€{Math.round(ref)}</span>
                  <span style={{ fontSize: 12, color: 'white', marginRight: 12 }}>€{Math.round(cur)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pct > 0 ? '#FBBF24' : '#86EFAC', minWidth: 45, textAlign: 'right' }}>
                    {pct > 0 ? '+' : ''}{pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button onClick={onClose} style={{
        marginTop: 16, width: '100%', height: 44, borderRadius: 10,
        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
        fontSize: 14, fontWeight: 500, border: 'none',
      }}>Done</button>
    </div>
  );
}

// ── Compare Plans ──
function ComparePlansContent({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { config, expenseCategories, fixedCategories, totalFixed, updateCategory, updateConfig, savingsTarget } = useBudget();
  const { goals } = useApp();

  const totalIncome = config.monthlyIncome;
  const totalGoalContributions = goals.reduce((s, g) => s + g.monthlyContribution, 0);
  const currentSpending = expenseCategories.reduce((s, c) => s + c.monthlyBudget, 0);
  const currentFree = totalIncome - totalFixed - savingsTarget - currentSpending - totalGoalContributions;

  const [modifiedBudgets, setModifiedBudgets] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    expenseCategories.forEach(c => { init[c.id] = c.monthlyBudget; });
    return init;
  });
  const [modifiedIncome, setModifiedIncome] = useState(totalIncome);
  const [activePreset, setActivePreset] = useState('custom');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  const modifiedSpending = Object.values(modifiedBudgets).reduce((s, v) => s + v, 0);
  const modifiedFree = modifiedIncome - totalFixed - savingsTarget - modifiedSpending - totalGoalContributions;
  const freeChange = modifiedFree - currentFree;

  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const newBudgets: Record<string, number> = {};
    expenseCategories.forEach(c => { newBudgets[c.id] = c.monthlyBudget; });
    let newIncome = totalIncome;
    if (presetId === 'save-15') Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.85); });
    if (presetId === 'cut-spending') Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.80); });
    if (presetId === 'boost-goals') Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.90); });
    if (presetId === 'income-300') newIncome = totalIncome + 300;
    setModifiedBudgets(newBudgets);
    setModifiedIncome(newIncome);
  };

  const handleIncrement = (catId: string, amount: number) => {
    setModifiedBudgets(prev => ({ ...prev, [catId]: Math.max(0, (prev[catId] || 0) + amount) }));
    setActivePreset('custom');
  };

  const handleApply = () => {
    Object.entries(modifiedBudgets).forEach(([catId, budget]) => {
      updateCategory(catId, { monthlyBudget: budget });
    });
    if (modifiedIncome !== totalIncome) updateConfig({ monthlyIncome: modifiedIncome });
    toast('New plan applied.');
    onClose();
  };

  const goalAcceleration = useMemo(() => {
    if (freeChange <= 0) return [];
    return goals.filter(g => g.monthlyContribution > 0).map(g => {
      const remaining = g.target - g.saved;
      const currentMonths = Math.ceil(remaining / g.monthlyContribution);
      const extra = freeChange * 0.5 / Math.max(goals.length, 1);
      const newMonths = Math.ceil(remaining / (g.monthlyContribution + extra));
      return { name: g.name, diff: currentMonths - newMonths };
    }).filter(g => g.diff > 0);
  }, [goals, freeChange]);

  const rows = [
    { label: 'Spending', current: currentSpending, modified: modifiedSpending, color: '#8E44AD' },
    { label: 'Fixed', current: totalFixed, modified: totalFixed, color: '#5D6D7E' },
    { label: 'Goals', current: totalGoalContributions, modified: totalGoalContributions, color: '#E91E63' },
    { label: 'Savings', current: savingsTarget, modified: savingsTarget, color: '#2980B9' },
    { label: 'Free', current: currentFree, modified: modifiedFree, color: 'rgba(255,255,255,0.3)' },
  ];

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Compare Plans</span>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {/* Preset pills */}
      <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {presets.map(p => (
          <button key={p.id} onClick={() => applyPreset(p.id)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap',
            background: activePreset === p.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: activePreset === p.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
            color: activePreset === p.id ? 'white' : 'rgba(255,255,255,0.4)',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {/* Current */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, opacity: 0.6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>CURRENT</div>
          {rows.map(r => (
            <div key={r.label} className="flex justify-between" style={{ padding: '4px 0' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>€{Math.round(r.current)}</span>
            </div>
          ))}
        </div>

        {/* New plan */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>NEW PLAN</div>
          {rows.map(r => {
            const diff = r.modified - r.current;
            const isSpending = r.label === 'Spending';
            return (
              <div key={r.label} className="flex justify-between items-center" style={{ padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', cursor: isSpending ? 'pointer' : undefined }}
                  onClick={isSpending ? () => setExpandedCatId(expandedCatId ? null : 'spending') : undefined}>
                  {r.label}
                </span>
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>€{Math.round(r.modified)}</span>
                  {diff !== 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: diff < 0 ? '#86EFAC' : '#FBBF24' }}>
                      {diff > 0 ? '+' : ''}€{Math.round(diff)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded spending categories */}
      <AnimatePresence>
        {expandedCatId === 'spending' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '8px 14px' }}>
              {expenseCategories.map(cat => {
                const modified = modifiedBudgets[cat.id] || 0;
                const color = categoryColors[cat.name] || '#7F8C8D';
                return (
                  <div key={cat.id} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleIncrement(cat.id, -25)} style={{
                        width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white',
                      }}><Minus size={12} /></button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'white', minWidth: 40, textAlign: 'center' }}>€{modified}</span>
                      <button onClick={() => handleIncrement(cat.id, 25)} style={{
                        width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white',
                      }}><Plus size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Impact */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>Impact</div>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Monthly</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: freeChange >= 0 ? '#86EFAC' : '#FBBF24' }}>
            {freeChange >= 0 ? '+' : ''}€{Math.round(freeChange)}/mo
          </span>
        </div>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Annual</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: freeChange >= 0 ? '#86EFAC' : '#FBBF24' }}>
            {freeChange >= 0 ? '+' : ''}€{Math.round(freeChange * 12)}/yr
          </span>
        </div>
        {goalAcceleration.map(g => (
          <div key={g.name} className="flex justify-between">
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Goals</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#86EFAC' }}>{g.name} {g.diff}mo sooner</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleApply} style={{
          flex: 2, height: 44, borderRadius: 10,
          background: '#27AE60', color: 'white', fontSize: 14, fontWeight: 600, border: 'none',
        }}>Apply</button>
        <button onClick={onClose} style={{
          flex: 1, height: 44, borderRadius: 10,
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
          fontSize: 14, fontWeight: 500, border: 'none',
        }}>Discard</button>
      </div>
    </div>
  );
}
