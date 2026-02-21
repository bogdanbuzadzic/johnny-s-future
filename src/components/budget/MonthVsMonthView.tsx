import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

const categoryColors: Record<string, string> = {
  Food: '#E67E22', Entertainment: '#9B59B6', Shopping: '#E74C3C', Lifestyle: '#1ABC9C',
};

interface MonthVsMonthOverlayProps {
  onClose: () => void;
}

/**
 * Renders as an overlay on the existing Tetris blocks in My Money.
 * Returns: monthSelectorBar, deltaMap, summaryRow, and tooltipRenderer.
 */
export function useMonthVsMonth() {
  const { expenseCategories, transactions } = useBudget();
  const now = new Date();

  const availableMonths = useMemo(() => {
    const months: string[] = [];
    const seen = new Set<string>();
    transactions.forEach(t => {
      const d = parseISO(t.date);
      const key = format(d, 'yyyy-MM');
      if (!seen.has(key)) { seen.add(key); months.push(key); }
    });
    const currentKey = format(now, 'yyyy-MM');
    if (!seen.has(currentKey)) months.push(currentKey);
    const prevKey = format(subMonths(now, 1), 'yyyy-MM');
    if (!seen.has(prevKey)) months.push(prevKey);
    return months.sort().reverse();
  }, [transactions]);

  const [refMonthIdx, setRefMonthIdx] = useState(1); // reference = previous month
  const refMonth = availableMonths[Math.min(refMonthIdx, availableMonths.length - 1)] || format(subMonths(now, 1), 'yyyy-MM');
  const currentMonth = availableMonths[0] || format(now, 'yyyy-MM');

  const hasEnoughData = availableMonths.length >= 2;

  const getMonthSpending = useCallback((monthKey: string) => {
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
  }, [transactions]);

  const refData = useMemo(() => getMonthSpending(refMonth), [refMonth, getMonthSpending]);
  const currentData = useMemo(() => getMonthSpending(currentMonth), [currentMonth, getMonthSpending]);

  // Delta map: categoryId -> { pctChange, delta, refAmount, currentAmount }
  const deltaMap = useMemo(() => {
    const map: Record<string, { pctChange: number; delta: number; refAmount: number; currentAmount: number }> = {};
    expenseCategories.forEach(cat => {
      const ref = refData.spending[cat.id] || 0;
      const cur = currentData.spending[cat.id] || 0;
      const delta = cur - ref;
      const pctChange = ref > 0 ? ((cur - ref) / ref) * 100 : cur > 0 ? 100 : 0;
      map[cat.id] = { pctChange, delta, refAmount: ref, currentAmount: cur };
    });
    return map;
  }, [expenseCategories, refData, currentData]);

  const totalChange = currentData.total - refData.total;
  const improvedCount = Object.values(deltaMap).filter(d => d.delta < 0).length;
  const increasedCount = Object.values(deltaMap).filter(d => d.delta > 0).length;

  const formatMonthShort = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return format(new Date(y, m - 1), 'MMMM yyyy');
  };

  const shiftRef = (dir: number) => {
    setRefMonthIdx(prev => Math.max(0, Math.min(availableMonths.length - 1, prev + dir)));
  };

  return {
    hasEnoughData,
    deltaMap,
    refMonth,
    currentMonth,
    refMonthLabel: formatMonthShort(refMonth),
    currentMonthLabel: formatMonthShort(currentMonth),
    shiftRef,
    totalChange,
    improvedCount,
    increasedCount,
    refData,
    currentData,
    expenseCategories,
  };
}

// Standalone month selector bar component
export function MonthSelectorBar({ refLabel, currentLabel, onPrev, onNext }: {
  refLabel: string; currentLabel: string; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <button onClick={onPrev}>
        <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </button>
      <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{refLabel.split(' ')[0]}</span>
      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>vs.</span>
      <span className="text-[13px] font-bold text-white">{currentLabel.split(' ')[0]}</span>
      <button onClick={onNext}>
        <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </button>
    </div>
  );
}

// Delta badge component for Tetris blocks
export function DeltaBadge({ pctChange }: { pctChange: number }) {
  const isFlat = Math.abs(pctChange) <= 5;
  const isUp = pctChange > 5;
  const isDown = pctChange < -5;

  return (
    <div className="absolute -top-1 -right-1 z-[3] px-1.5 py-0.5 rounded-md" style={{
      fontSize: 9, fontWeight: 700,
      background: isUp ? 'rgba(251,191,36,0.2)' : isDown ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.06)',
      color: isUp ? '#FBBF24' : isDown ? '#86EFAC' : 'rgba(255,255,255,0.3)',
    }}>
      {isFlat ? '=' : `${pctChange > 0 ? '+' : ''}${Math.round(pctChange)}%`}
    </div>
  );
}

// Month comparison summary row
export function MonthSummaryRow({ totalChange, improved, increased }: {
  totalChange: number; improved: number; increased: number;
}) {
  return (
    <div className="flex justify-between rounded-[10px] mt-2" style={{
      padding: '10px 14px', background: 'rgba(0,0,0,0.15)',
    }}>
      <div className="text-center">
        <div className="text-[9px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Total change</div>
        <div className="text-[14px] font-bold mt-0.5" style={{ color: totalChange > 0 ? '#FBBF24' : '#86EFAC' }}>
          {totalChange > 0 ? '+' : ''}€{Math.round(Math.abs(totalChange))}
        </div>
      </div>
      <div className="text-center">
        <div className="text-[9px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Improved</div>
        <div className="text-[14px] font-bold mt-0.5" style={{ color: '#86EFAC' }}>{improved} categories</div>
      </div>
      <div className="text-center">
        <div className="text-[9px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Increased</div>
        <div className="text-[14px] font-bold mt-0.5" style={{ color: '#FBBF24' }}>{increased} categories</div>
      </div>
    </div>
  );
}

// Month detail tooltip
export function MonthDetailTooltip({ catName, refLabel, refAmount, currentLabel, currentAmount, delta, pctChange, onDismiss }: {
  catName: string; refLabel: string; refAmount: number; currentLabel: string; currentAmount: number; delta: number; pctChange: number; onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-20"
      style={{
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
        padding: '10px 12px', minWidth: 160,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="text-[12px] font-bold text-white mb-1">{catName}</div>
      <div className="flex justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <span>{refLabel.split(' ')[0]}: €{Math.round(refAmount)}</span>
        <span>{currentLabel.split(' ')[0]}: €{Math.round(currentAmount)}</span>
      </div>
      <div className="text-[12px] font-bold mt-1" style={{ color: delta > 0 ? '#FBBF24' : '#86EFAC' }}>
        {delta > 0 ? '+' : ''}€{Math.round(Math.abs(delta))} ({pctChange > 0 ? '+' : ''}{Math.round(pctChange)}%)
      </div>
    </motion.div>
  );
}

// Legacy export for backward compat
export function MonthVsMonthView({ onClose }: { onClose: () => void }) {
  return null;
}
