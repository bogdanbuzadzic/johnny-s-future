import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowUp, ArrowDown, Minus, Calendar } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { getPersona } from '@/lib/profileData';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import johnnyImage from '@/assets/johnny.png';

const categoryColors: Record<string, string> = {
  Food: '#E67E22',
  Entertainment: '#9B59B6',
  Shopping: '#E74C3C',
  Lifestyle: '#1ABC9C',
};

function generateComparisonInsight(
  changes: Array<{ name: string; delta: number }>,
  persona: string | null
): string {
  if (changes.length === 0) return 'No data to compare yet.';
  const biggest = changes[0];
  const improved = changes.filter(c => c.delta < 0);
  const worsened = changes.filter(c => c.delta > 0);

  let insight = biggest.delta > 0
    ? `Your ${biggest.name} spending increased the most (+€${Math.abs(biggest.delta)}). `
    : `Great improvement in ${biggest.name} (-€${Math.abs(biggest.delta)}). `;

  insight += improved.length > worsened.length
    ? `Overall trend: improving. ${improved.length} of ${changes.length} categories decreased.`
    : `${worsened.length} categories increased. Consider reviewing for patterns.`;

  const suffix: Record<string, string> = {
    'Money Avoider': " Awareness is the first step. You're doing great by looking.",
    'Impulsive Optimist': " The categories that went up might have stories. Any impulse buys?",
    'Present Hedonist': " The question: would future-you agree with these numbers?",
    'Vigilant Saver': " Your reduced categories show discipline. Keep leveraging that.",
    'Confident Controller': " Track over 3+ months before making structural changes.",
    'Steady Saver': " Month-to-month variation is normal. Look for the 3-month trend.",
  };
  return insight + (persona ? (suffix[persona] || '') : '');
}

interface MonthVsMonthViewProps {
  onClose: () => void;
}

export function MonthVsMonthView({ onClose }: MonthVsMonthViewProps) {
  const { expenseCategories, transactions, config } = useBudget();
  const now = new Date();

  // Get available months from snapshots or transactions
  const availableMonths = useMemo(() => {
    const months: string[] = [];
    const seen = new Set<string>();
    transactions.forEach(t => {
      const d = parseISO(t.date);
      const key = format(d, 'yyyy-MM');
      if (!seen.has(key)) {
        seen.add(key);
        months.push(key);
      }
    });
    // Ensure current month
    const currentKey = format(now, 'yyyy-MM');
    if (!seen.has(currentKey)) months.push(currentKey);
    // Ensure previous month
    const prevKey = format(subMonths(now, 1), 'yyyy-MM');
    if (!seen.has(prevKey)) months.push(prevKey);
    return months.sort().reverse();
  }, [transactions, now]);

  const [monthA, setMonthA] = useState(() => availableMonths.length >= 2 ? availableMonths[1] : availableMonths[0] || format(subMonths(now, 1), 'yyyy-MM'));
  const [monthB, setMonthB] = useState(() => availableMonths[0] || format(now, 'yyyy-MM'));

  const hasEnoughData = availableMonths.length >= 2;

  const persona = useMemo(() => {
    try {
      const m0 = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      return getPersona(m0);
    } catch { return null; }
  }, []);

  // Calculate spending per category for a given month
  const getMonthSpending = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

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
  };

  const dataA = useMemo(() => getMonthSpending(monthA), [monthA, transactions]);
  const dataB = useMemo(() => getMonthSpending(monthB), [monthB, transactions]);

  const changes = useMemo(() => {
    return expenseCategories.map(cat => {
      const a = dataA.spending[cat.id] || 0;
      const b = dataB.spending[cat.id] || 0;
      const delta = b - a;
      const pctChange = a > 0 ? ((b - a) / a) * 100 : b > 0 ? 100 : 0;
      return { id: cat.id, name: cat.name, amountA: a, amountB: b, delta, pctChange, color: categoryColors[cat.name] || '#7F8C8D' };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [expenseCategories, dataA, dataB]);

  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return format(new Date(y, m - 1), 'MMMM yyyy');
  };

  if (!hasEnoughData) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>
        <Calendar size={48} style={{ color: '#8A7FA0', marginBottom: 16 }} />
        <h2 className="text-lg font-bold mb-2 text-center" style={{ color: '#2D2440' }}>Not enough data yet</h2>
        <p className="text-sm text-center max-w-[260px] mb-6" style={{ color: '#8A7FA0' }}>
          You need at least 2 months of data to compare. Try Plan vs. Actual instead!
        </p>
        <button onClick={onClose}
          className="px-6 py-3 rounded-2xl text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: 'white' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pb-24">
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2D2440' }}>Month vs. Month</span>
        <button onClick={onClose}>
          <X size={20} style={{ color: '#8A7FA0' }} />
        </button>
      </div>

      {/* Month Pickers */}
      <div className="px-4 mb-4 flex items-center gap-2">
        <select
          value={monthA}
          onChange={e => setMonthA(e.target.value)}
          className="flex-1 rounded-[10px] text-center outline-none"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1.5px solid rgba(255,255,255,0.6)',
            padding: '10px 14px',
            color: '#2D2440',
            fontSize: 14,
          }}
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#8A7FA0' }}>vs.</span>
        <select
          value={monthB}
          onChange={e => setMonthB(e.target.value)}
          className="flex-1 rounded-[10px] text-center outline-none"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1.5px solid rgba(255,255,255,0.6)',
            padding: '10px 14px',
            color: '#2D2440',
            fontSize: 14,
          }}
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Side-by-side Mini Tetris */}
      <div className="px-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[{ data: dataA, label: formatMonthLabel(monthA), spending: dataA }, { data: dataB, label: formatMonthLabel(monthB), spending: dataB }].map((panel, idx) => (
          <div key={idx} className="rounded-[14px] p-2.5" style={{
            background: 'rgba(39, 174, 96, 0.06)',
            border: '1px solid rgba(39, 174, 96, 0.12)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2D2440', marginBottom: 2 }}>
              {panel.label.split(' ')[0]}
            </div>
            <div style={{ fontSize: 11, color: '#5C4F6E', marginBottom: 6 }}>
              €{Math.round(panel.data.total)} spent
            </div>
            <div className="space-y-1">
              {expenseCategories.map(cat => {
                const amount = panel.spending.spending[cat.id] || 0;
                const maxAmount = Math.max(dataA.total, dataB.total) || 1;
                const width = Math.max(8, (amount / maxAmount) * 100);
                return (
                  <div key={cat.id} className="flex items-center gap-1">
                    <div style={{
                      width: `${width}%`,
                      height: 12,
                      borderRadius: 3,
                      background: categoryColors[cat.name] || '#7F8C8D',
                    }} />
                    <span style={{ fontSize: 9, color: '#5C4F6E', whiteSpace: 'nowrap' }}>€{Math.round(amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="px-4 mb-4">
        <div style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          <div className="flex items-center justify-between mb-3" style={{ fontSize: 10, color: '#8A7FA0', fontWeight: 600 }}>
            <span className="flex-1">Category</span>
            <span style={{ width: 60, textAlign: 'right' }}>{monthA.split('-')[1]}</span>
            <span style={{ width: 60, textAlign: 'right' }}>{monthB.split('-')[1]}</span>
            <span style={{ width: 70, textAlign: 'right' }}>Change</span>
          </div>
          {changes.map(c => {
            const isUp = c.delta > 0;
            const isFlat = Math.abs(c.pctChange) <= 5;
            return (
              <div key={c.id} className="flex items-center justify-between py-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-1.5 flex-1">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                  <span style={{ fontSize: 12, color: '#2D2440' }}>{c.name}</span>
                </div>
                <span style={{ width: 60, textAlign: 'right', fontSize: 12, color: '#5C4F6E' }}>€{Math.round(c.amountA)}</span>
                <span style={{ width: 60, textAlign: 'right', fontSize: 12, color: '#5C4F6E' }}>€{Math.round(c.amountB)}</span>
                <div style={{ width: 70, textAlign: 'right' }}>
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{
                      background: isFlat ? 'rgba(138,127,160,0.1)' : isUp ? 'rgba(239,68,68,0.12)' : 'rgba(39,174,96,0.12)',
                      color: isFlat ? '#8A7FA0' : isUp ? '#EF4444' : '#27AE60',
                    }}
                  >
                    {isFlat ? <Minus size={10} /> : isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {isFlat ? 'flat' : `${Math.abs(Math.round(c.pctChange))}%`}
                  </span>
                </div>
              </div>
            );
          })}
          {/* Total */}
          <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2D2440' }}>Total</span>
            <span style={{ width: 60, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#2D2440' }}>€{Math.round(dataA.total)}</span>
            <span style={{ width: 60, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#2D2440' }}>€{Math.round(dataB.total)}</span>
            <div style={{ width: 70, textAlign: 'right' }}>
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: dataB.total > dataA.total ? 'rgba(239,68,68,0.12)' : 'rgba(39,174,96,0.12)',
                  color: dataB.total > dataA.total ? '#EF4444' : '#27AE60',
                }}
              >
                {dataB.total > dataA.total ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                €{Math.abs(Math.round(dataB.total - dataA.total))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="px-4 mb-4">
        <div style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          <div className="flex items-center gap-3">
            <img src={johnnyImage} alt="Johnny" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2D2440' }}>Johnny's Analysis</div>
              <div style={{ fontSize: 12, color: '#5C4F6E', lineHeight: 1.4 }}>
                {generateComparisonInsight(changes, persona?.n || null)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
