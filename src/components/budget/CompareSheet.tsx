import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Minus, Plus, Check } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import johnnyImage from '@/assets/johnny.png';
import { InsuranceToolHome } from '@/components/insurance/InsuranceToolHome';

const categoryColors: Record<string, string> = {
  Food: '#E67E22', Entertainment: '#9B59B6', Shopping: '#E74C3C', Lifestyle: '#1ABC9C',
};

type CompareMode = 'menu' | 'plan-vs-actual' | 'month-vs-month' | 'compare-plans' | 'insurance';

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

const planColors = ['#86EFAC', '#60A5FA', '#C084FC'];
const planLabels = ['Plan A', 'Plan B', 'Plan C'];

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
              height: 'auto',
              background: 'linear-gradient(180deg, #1A1525 0%, #2D1F3D 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {mode === 'menu' && (
              <div className="px-5 pb-6">
                {[
                  { id: 'plan-vs-actual' as CompareMode, label: 'Plan vs. Actual', desc: 'How this month is tracking' },
                  { id: 'month-vs-month' as CompareMode, label: 'Month vs. Month', desc: 'Compare two months' },
                  { id: 'compare-plans' as CompareMode, label: 'Compare Plans', desc: 'Build and compare new plans' },
                  { id: 'insurance' as CompareMode, label: 'Do I Need Insurance?', desc: 'Evaluate if insurance is worth it for you' },
                ].map((item, i) => (
                  <div key={item.id}
                    className="flex items-center cursor-pointer"
                    style={{ padding: '14px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
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

            {mode === 'plan-vs-actual' && (
              <PlanVsActualContent onBack={() => setMode('menu')} onClose={handleClose} />
            )}

            {mode === 'month-vs-month' && (
              <MonthVsMonthContent onBack={() => setMode('menu')} onClose={handleClose} />
            )}

            {mode === 'compare-plans' && (
              <ComparePlansContent onBack={() => setMode('menu')} onClose={handleClose} />
            )}

            {mode === 'insurance' && (
              <InsuranceToolHome onBack={() => setMode('menu')} onClose={handleClose} />
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
  const planTotal = categoryData.reduce((s, c) => s + c.budget, 0);
  const actualTotal = categoryData.reduce((s, c) => s + c.spent, 0);

  // Ring chart calculations
  const innerR = 50;
  const outerR = 68;
  const circumInner = 2 * Math.PI * innerR;
  const circumOuter = 2 * Math.PI * outerR;

  const innerSegments = useMemo(() => {
    let offset = 0;
    return categoryData.map(c => {
      const dash = planTotal > 0 ? (c.budget / planTotal) * circumInner : 0;
      const seg = { dash, offset, color: c.color };
      offset += dash;
      return seg;
    });
  }, [categoryData, planTotal, circumInner]);

  const outerSegments = useMemo(() => {
    let offset = 0;
    return categoryData.map(c => {
      const dash = actualTotal > 0 ? (c.spent / actualTotal) * circumOuter : 0;
      const seg = { dash, offset, color: c.color };
      offset += dash;
      return seg;
    });
  }, [categoryData, actualTotal, circumOuter]);

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Plan vs. Actual</span>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {/* Ring Chart */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 16px' }}>
        <svg width={160} height={160} viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          {/* Inner ring background */}
          <circle cx={80} cy={80} r={innerR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
          {/* Inner ring segments (Plan) */}
          {innerSegments.map((seg, i) => (
            <circle key={`inner-${i}`} cx={80} cy={80} r={innerR} fill="none"
              stroke={seg.color} strokeWidth={12} strokeOpacity={0.3}
              strokeDasharray={`${seg.dash} ${circumInner - seg.dash}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
          {/* Outer ring background */}
          <circle cx={80} cy={80} r={outerR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8} />
          {/* Outer ring segments (Actual) */}
          {outerSegments.map((seg, i) => (
            <circle key={`outer-${i}`} cx={80} cy={80} r={outerR} fill="none"
              stroke={seg.color} strokeWidth={8}
              strokeDasharray={`${seg.dash} ${circumOuter - seg.dash}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
          {/* Center text */}
          <text x={80} y={74} textAnchor="middle" fill={totalVariance > 0 ? '#FBBF24' : '#86EFAC'}
            fontSize={20} fontWeight={800} fontFamily="JetBrains Mono, monospace"
            style={{ transform: 'rotate(90deg)', transformOrigin: '80px 80px' }}>
            {totalVariance > 0 ? '+' : ''}€{Math.round(Math.abs(totalVariance))}
          </text>
          <text x={80} y={92} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={10}
            style={{ transform: 'rotate(90deg)', transformOrigin: '80px 80px' }}>
            {totalVariance > 0 ? 'over plan' : 'under plan'}
          </text>
        </svg>
      </div>

      {/* Ring legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
        <span>Inner = Plan</span>
        <span>Outer = Actual</span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', padding: '0 14px 6px', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)' }}>
        <span style={{ flex: 1 }}>Category</span>
        <span style={{ width: 55, textAlign: 'right' }}>Plan</span>
        <span style={{ width: 65, textAlign: 'center' }}>Delta</span>
        <span style={{ width: 55, textAlign: 'right' }}>Actual</span>
      </div>

      {/* Table rows */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px 14px' }}>
        {categoryData.map((c, i) => (
          <div key={c.name} style={{
            display: 'flex', alignItems: 'center', padding: '10px 0',
            borderBottom: i < categoryData.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: c.color }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{c.name}</span>
            </div>
            <span style={{ width: 55, textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              €{Math.round(c.budget)}
            </span>
            <span style={{
              width: 65, textAlign: 'center', fontSize: 14, fontWeight: 800,
              color: c.delta > 0 ? '#FBBF24' : '#86EFAC',
            }}>
              {c.delta > 0 ? '+' : ''}€{Math.round(Math.abs(c.delta))}
            </span>
            <span style={{ width: 55, textAlign: 'right', fontSize: 12, color: 'white' }}>
              €{Math.round(c.spent)}
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

// ── Month vs Month (FIXED: zero baseline bug) ──
function MonthVsMonthContent({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { expenseCategories, transactions } = useBudget();
  const now = new Date();

  // Only months that ACTUALLY have transaction data
  const monthsWithData = useMemo(() => {
    const months = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type !== 'expense') return;
      const key = format(parseISO(t.date), 'yyyy-MM');
      months.set(key, (months.get(key) || 0) + t.amount);
    });
    return Array.from(months.entries())
      .filter(([, total]) => total > 0)
      .map(([key]) => key)
      .sort()
      .reverse();
  }, [transactions]);

  // Ensure synthetic previous month exists for demo/first-use
  useMemo(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
    if (!snapshots[prevKey]) {
      // Create synthetic snapshot using budget amounts (assume full budget spent)
      const budgetRaw = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
      const cats = ((budgetRaw.categories || []) as any[]).filter((c: any) => c.type === 'expense');
      if (cats.length > 0) {
        snapshots[prevKey] = {
          month: prevKey,
          income: budgetRaw.config?.monthlyIncome || 0,
          categories: cats.map((c: any) => ({
            id: c.id, name: c.name, budget: c.monthlyBudget || 0, spent: c.monthlyBudget || 0,
          })),
          totalSpent: cats.reduce((s: number, c: any) => s + (c.monthlyBudget || 0), 0),
          timestamp: Date.now(),
        };
        localStorage.setItem('jfb_month_snapshots', JSON.stringify(snapshots));
      }
    }
  }, []);

  const hasEnoughData = monthsWithData.length >= 2 || (() => {
    // Re-check with synthetic data
    const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
    return Object.keys(snapshots).length >= 2;
  })();

  // Build months list from snapshots if transactions don't have enough
  const effectiveMonths = useMemo(() => {
    if (monthsWithData.length >= 2) return monthsWithData;
    const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
    const snapshotMonths = Object.keys(snapshots).sort().reverse();
    // Merge with transaction months
    const all = new Set([...monthsWithData, ...snapshotMonths]);
    return Array.from(all).sort().reverse();
  }, [monthsWithData]);

  const [refIdx, setRefIdx] = useState(Math.min(1, effectiveMonths.length - 1));
  const refMonth = effectiveMonths[refIdx] || '';
  const currentMonth = effectiveMonths[0] || '';

  const isPartialMonth = useMemo(() => {
    if (!currentMonth) return false;
    const [y, m] = currentMonth.split('-').map(Number);
    const end = endOfMonth(new Date(y, m - 1));
    return now < end;
  }, [currentMonth, now]);

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
    // If no transaction data, try snapshot
    if (total === 0) {
      const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
      const snap = snapshots[monthKey];
      if (snap && snap.categories) {
        snap.categories.forEach((c: any) => {
          spending[c.id] = c.spent || 0;
          total += c.spent || 0;
        });
      }
    }
    return { spending, total };
  }, [transactions]);

  const refData = useMemo(() => refMonth ? getSpending(refMonth) : { spending: {}, total: 0 }, [refMonth, getSpending]);
  const currentData = useMemo(() => currentMonth ? getSpending(currentMonth) : { spending: {}, total: 0 }, [currentMonth, getSpending]);
  const totalChange = currentData.total - refData.total;

  const fmtMonth = (key: string) => {
    if (!key) return '';
    const [y, m] = key.split('-').map(Number);
    return format(new Date(y, m - 1), 'MMMM');
  };

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Month vs. Month</span>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {!hasEnoughData ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <img src={johnnyImage} alt="Johnny" style={{ width: 80, height: 80, margin: '0 auto 16px', objectFit: 'contain', opacity: 0.6 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Not enough data yet
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
            You'll see month-over-month trends once you have two months of spending data. Keep tracking!
          </p>
        </div>
      ) : (
        <>
          {/* Month selector — only months with data */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={() => setRefIdx(prev => Math.min(prev + 1, effectiveMonths.length - 1))}
              disabled={refIdx >= effectiveMonths.length - 1}
              style={{ opacity: refIdx >= effectiveMonths.length - 1 ? 0.2 : 1 }}
            >
              <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{fmtMonth(refMonth)}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>vs.</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{fmtMonth(currentMonth)}</span>
            <button
              onClick={() => setRefIdx(prev => Math.max(prev - 1, 1))}
              disabled={refIdx <= 1}
              style={{ opacity: refIdx <= 1 ? 0.2 : 1 }}
            >
              <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>

          {/* Partial month warning */}
          {isPartialMonth && (
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#FBBF24' }}>
              {fmtMonth(currentMonth)} is in progress — showing data through {format(now, 'MMM d')}
            </div>
          )}

          {/* Summary */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Total Change</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: totalChange > 0 ? '#FBBF24' : '#86EFAC', marginTop: 4 }}>
              {totalChange > 0 ? '+' : ''}€{Math.round(Math.abs(totalChange))} {totalChange > 0 ? 'more' : 'less'}
            </div>
          </div>

          {/* Category comparison with both amounts shown */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px 14px' }}>
            {expenseCategories
              .filter(cat => !['Personal', 'Other', 'other', 'personal'].includes(cat.name))
              .map((cat, i) => {
              const ref = refData.spending[cat.id] || 0;
              const cur = currentData.spending[cat.id] || 0;
              // Skip categories with zero in BOTH months
              if (ref === 0 && cur === 0) return null;
              const pct = ref > 0 ? Math.round(((cur - ref) / ref) * 100) : (cur > 0 ? 100 : 0);
              const color = categoryColors[cat.name] || '#7F8C8D';
              // Green for decrease (saving more), amber for increase
              const deltaColor = cur <= ref ? '#86EFAC' : '#FBBF24';
              return (
                <div key={cat.id} className="flex items-center" style={{ padding: '10px 0', borderBottom: i < expenseCategories.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: color, marginRight: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginRight: 8 }}>€{Math.round(ref)}</span>
                  <span style={{ fontSize: 12, color: 'white', marginRight: 8 }}>€{Math.round(cur)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor, minWidth: 45, textAlign: 'right' }}>
                    {ref > 0 ? `${pct > 0 ? '+' : ''}${pct}%` : 'New'}
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

// ── Compare Plans (multi-scenario) ──
function ComparePlansContent({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { config, expenseCategories, fixedCategories, totalFixed, updateCategory, updateConfig, savingsTarget } = useBudget();
  const { goals } = useApp();

  const totalIncome = config.monthlyIncome;
  const totalGoalContributions = goals.reduce((s, g) => s + g.monthlyContribution, 0);
  const currentSpending = expenseCategories.reduce((s, c) => s + c.monthlyBudget, 0);
  const currentFree = totalIncome - totalFixed - savingsTarget - currentSpending - totalGoalContributions;

  // Multi-select preset chips (up to 3)
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0); // which plan to apply
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Custom plan budgets (used when 'custom' is selected)
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    expenseCategories.forEach(c => { init[c.id] = c.monthlyBudget; });
    return init;
  });
  const [customIncome, setCustomIncome] = useState(totalIncome);

  const togglePreset = (presetId: string) => {
    setSelectedPresets(prev => {
      if (prev.includes(presetId)) return prev.filter(p => p !== presetId);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, presetId];
    });
  };

  // Generate plan data for a given preset
  const generatePlan = useCallback((presetId: string) => {
    const budgets: Record<string, number> = {};
    expenseCategories.forEach(c => { budgets[c.id] = c.monthlyBudget; });
    let income = totalIncome;

    if (presetId === 'custom') {
      Object.assign(budgets, customBudgets);
      income = customIncome;
    } else if (presetId === 'save-15') {
      Object.keys(budgets).forEach(k => { budgets[k] = Math.round(budgets[k] * 0.85); });
    } else if (presetId === 'cut-spending') {
      Object.keys(budgets).forEach(k => { budgets[k] = Math.round(budgets[k] * 0.80); });
    } else if (presetId === 'boost-goals') {
      Object.keys(budgets).forEach(k => { budgets[k] = Math.round(budgets[k] * 0.90); });
    } else if (presetId === 'income-300') {
      income = totalIncome + 300;
    }

    const spending = Object.values(budgets).reduce((s, v) => s + v, 0);
    const free = income - totalFixed - savingsTarget - spending - totalGoalContributions;
    const freeChange = free - currentFree;

    return { budgets, income, spending, free, freeChange };
  }, [expenseCategories, totalIncome, totalFixed, savingsTarget, totalGoalContributions, currentFree, customBudgets, customIncome]);

  const plans = useMemo(() => selectedPresets.map(p => ({
    presetId: p,
    label: presets.find(pr => pr.id === p)?.label || p,
    ...generatePlan(p),
  })), [selectedPresets, generatePlan]);

  const handleCustomIncrement = (catId: string, amount: number) => {
    setCustomBudgets(prev => ({ ...prev, [catId]: Math.max(0, (prev[catId] || 0) + amount) }));
  };

  const handleApply = () => {
    const plan = plans[selectedPlanIdx];
    if (!plan) return;
    Object.entries(plan.budgets).forEach(([catId, budget]) => {
      updateCategory(catId, { monthlyBudget: budget });
    });
    if (plan.income !== totalIncome) updateConfig({ monthlyIncome: plan.income });
    toast(`${plan.label} applied!`);
    onClose();
  };

  const rows = [
    { label: 'Spending', current: currentSpending },
    { label: 'Fixed', current: totalFixed },
    { label: 'Goals', current: totalGoalContributions },
    { label: 'Savings', current: savingsTarget },
    { label: 'Free', current: currentFree },
  ];

  const colCount = 1 + plans.length; // Current + selected plans

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Compare Plans</span>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {/* Toggleable preset chips */}
      <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {presets.map(p => {
          const isSelected = selectedPresets.includes(p.id);
          const idx = selectedPresets.indexOf(p.id);
          return (
            <button key={p.id} onClick={() => togglePreset(p.id)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap',
              background: isSelected ? `${planColors[idx] || '#86EFAC'}22` : 'rgba(255,255,255,0.04)',
              border: isSelected ? `1px solid ${planColors[idx] || '#86EFAC'}55` : '1px solid rgba(255,255,255,0.06)',
              color: isSelected ? planColors[idx] || '#86EFAC' : 'rgba(255,255,255,0.4)',
            }}>{p.label}</button>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
          Select up to 3 presets to compare
        </div>
      )}

      {plans.length > 0 && (
        <>
          {/* Multi-column comparison */}
          <div className="overflow-x-auto mb-3" style={{ scrollbarWidth: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `1fr ${plans.map(() => '1fr').join(' ')}`, gap: 6, minWidth: colCount > 3 ? 400 : undefined }}>
              {/* Current column */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, opacity: 0.6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>CURRENT</div>
                {rows.map(r => (
                  <div key={r.label} className="flex justify-between" style={{ padding: '4px 0' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'white' }}>€{Math.round(r.current)}</span>
                  </div>
                ))}
              </div>

              {/* Plan columns */}
              {plans.map((plan, pIdx) => {
                const color = planColors[pIdx];
                const isApplyTarget = selectedPlanIdx === pIdx;
                return (
                  <div key={plan.presetId}
                    onClick={() => setSelectedPlanIdx(pIdx)}
                    className="cursor-pointer"
                    style={{
                      background: isApplyTarget ? `${color}11` : 'rgba(255,255,255,0.04)',
                      border: isApplyTarget ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: 10,
                    }}>
                    <div className="flex items-center gap-1 mb-2">
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isApplyTarget ? color : 'transparent',
                      }}>
                        {isApplyTarget && <Check size={8} style={{ color: '#0F0C18' }} />}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {plan.label}
                      </span>
                    </div>
                    {rows.map(r => {
                      const val = r.label === 'Spending' ? plan.spending
                        : r.label === 'Fixed' ? totalFixed
                        : r.label === 'Goals' ? totalGoalContributions
                        : r.label === 'Savings' ? savingsTarget
                        : plan.free;
                      const diff = val - r.current;
                      return (
                        <div key={r.label} className="flex justify-between items-center" style={{ padding: '4px 0' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'white' }}>€{Math.round(val)}</span>
                            {diff !== 0 && (
                              <span style={{ fontSize: 8, fontWeight: 700, color: diff < 0 ? '#86EFAC' : diff > 0 && r.label === 'Free' ? '#86EFAC' : '#FBBF24' }}>
                                {diff > 0 ? '+' : ''}€{Math.round(diff)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom category editing */}
          {selectedPresets.includes('custom') && (
            <AnimatePresence>
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '8px 14px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 6 }}>Custom Plan Categories</div>
                  {expenseCategories.map(cat => {
                    const modified = customBudgets[cat.id] || 0;
                    const color = categoryColors[cat.name] || '#7F8C8D';
                    return (
                      <div key={cat.id} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleCustomIncrement(cat.id, -25)} style={{
                            width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white',
                          }}><Minus size={12} /></button>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'white', minWidth: 40, textAlign: 'center' }}>€{modified}</span>
                          <button onClick={() => handleCustomIncrement(cat.id, 25)} style={{
                            width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white',
                          }}><Plus size={12} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Impact per plan */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>Impact</div>
            {plans.map((plan, pIdx) => {
              const color = planColors[pIdx];
              return (
                <div key={plan.presetId} style={{ marginBottom: pIdx < plans.length - 1 ? 8 : 0 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{plan.label}</span>
                  </div>
                  <div className="flex gap-4">
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      Monthly: <span style={{ fontWeight: 700, color: plan.freeChange >= 0 ? '#86EFAC' : '#FBBF24' }}>
                        {plan.freeChange >= 0 ? '+' : ''}€{Math.round(plan.freeChange)}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      Annual: <span style={{ fontWeight: 700, color: plan.freeChange >= 0 ? '#86EFAC' : '#FBBF24' }}>
                        {plan.freeChange >= 0 ? '+' : ''}€{Math.round(plan.freeChange * 12)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleApply} style={{
              flex: 2, height: 44, borderRadius: 10,
              background: '#27AE60', color: 'white', fontSize: 14, fontWeight: 600, border: 'none',
            }}>Apply {plans[selectedPlanIdx]?.label || 'Plan'}</button>
            <button onClick={onClose} style={{
              flex: 1, height: 44, borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
              fontSize: 14, fontWeight: 500, border: 'none',
            }}>Discard</button>
          </div>
        </>
      )}
    </div>
  );
}
