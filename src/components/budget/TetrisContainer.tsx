import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, PiggyBank, ShieldCheck, Wallet } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { CategoryBlock, getTintColor } from './CategoryBlock';
import { parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import johnnyImage from '@/assets/johnny.png';

interface TetrisContainerProps {
  period: 'month' | 'week';
}

export function TetrisContainer({ period }: TetrisContainerProps) {
  const {
    config, fixedCategories, expenseCategories, transactions,
    flexBudget, flexSpent, flexRemaining, dailyAllowance,
    getCategorySpent, updateCategory,
  } = useBudget();

  const containerWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 400) : 343;

  // Block layout calculation
  const blockLayout = useMemo(() => {
    const gap = 6;
    const innerWidth = containerWidth - 24; // 12px padding each side
    const effectiveFlexBudget = period === 'week' ? flexBudget / 4.33 : flexBudget;

    const blocks = expenseCategories.map((cat) => {
      const budget = period === 'week' ? cat.monthlyBudget / 4.33 : cat.monthlyBudget;
      const rawWidth = effectiveFlexBudget > 0
        ? (budget / effectiveFlexBudget) * innerWidth
        : innerWidth / Math.max(expenseCategories.length, 1);
      const width = Math.max(100, Math.min(rawWidth, innerWidth));
      const height = width >= 120 ? 56 : 48;
      return { ...cat, computedWidth: width, computedHeight: height, budget };
    });

    // Row packing
    const rows: typeof blocks[] = [];
    let currentRow: typeof blocks = [];
    let rowWidth = 0;

    blocks.forEach((block) => {
      if (currentRow.length > 0 && rowWidth + gap + block.computedWidth > innerWidth) {
        rows.push(currentRow);
        currentRow = [block];
        rowWidth = block.computedWidth;
      } else {
        if (currentRow.length > 0) rowWidth += gap;
        currentRow.push(block);
        rowWidth += block.computedWidth;
      }
    });
    if (currentRow.length > 0) rows.push(currentRow);

    return { rows, innerWidth };
  }, [expenseCategories, containerWidth, flexBudget, period]);

  // Get transactions for a category in current period
  const getCategoryTransactions = (categoryId: string) => {
    const now = new Date();
    let start: Date, end: Date;
    if (period === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    }
    return transactions.filter(t => {
      if (t.categoryId !== categoryId || t.type !== 'expense') return false;
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });
  };

  const totalFixed = fixedCategories.reduce((s, c) => s + c.monthlyBudget, 0);
  const isOverBudget = flexRemaining < 0;

  // Flex zone space calculation
  const fixedBarHeight = 36;
  const savingsBarHeight = 48;
  const blockRowsHeight = blockLayout.rows.reduce((sum, row) => {
    const maxH = Math.max(...row.map(b => b.computedHeight));
    return sum + maxH + 6;
  }, 0);
  const containerHeight = Math.max(
    typeof window !== 'undefined' ? window.innerHeight * 0.55 : 400,
    fixedBarHeight + savingsBarHeight + blockRowsHeight + 120
  );
  const emptySpaceHeight = containerHeight - fixedBarHeight - savingsBarHeight - blockRowsHeight - 12;
  const flexZoneHeight = containerHeight - fixedBarHeight - savingsBarHeight;
  const spaceRatio = flexZoneHeight > 0 ? emptySpaceHeight / flexZoneHeight : 1;

  return (
    <div>
      {/* Income label */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Wallet size={14} className="text-white/40" strokeWidth={1.5} />
        <span className="text-[13px] text-white/40">
          {period === 'month' ? 'Monthly' : 'Weekly'} Income €{config.monthlyIncome}
        </span>
      </div>

      {/* Container */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.20)',
          boxShadow: isOverBudget
            ? 'inset 0 0 20px rgba(255,255,255,0.03), 0 -8px 24px rgba(255,159,10,0.3)'
            : 'inset 0 0 20px rgba(255,255,255,0.03)',
          minHeight: containerHeight,
        }}
      >
        {/* Zone 1: Fixed Expenses Bar */}
        <div
          className="flex items-center px-3 gap-2"
          style={{
            height: fixedBarHeight,
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Lock size={10} className="text-white/25 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 truncate text-[11px] text-white/25">
            {fixedCategories.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ' · '}
                {c.name} €{c.monthlyBudget}
              </span>
            ))}
            {fixedCategories.length === 0 && 'No fixed expenses'}
          </div>
          <span className="text-[11px] text-white/30 flex-shrink-0">Fixed: €{totalFixed}</span>
        </div>

        {/* Zone 2: Savings */}
        <div
          className="flex items-center px-3 gap-2 relative backdrop-blur-sm"
          style={{
            height: savingsBarHeight,
            background: 'rgba(52,199,89,0.12)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <PiggyBank size={16} className="text-green-400/50 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-[13px] text-white/50">Savings €{config.monthlySavingsTarget}</span>
          <ShieldCheck size={10} className="text-white/20 absolute top-2 right-2" />
        </div>

        {/* Zone 3: Flex Zone */}
        <div className="p-3">
          {/* Blocks */}
          {blockLayout.rows.map((row, ri) => (
            <div key={ri} className="flex gap-1.5 mb-1.5">
              {row.map((block) => {
                const spent = getCategorySpent(block.id, period);
                const txs = getCategoryTransactions(block.id);
                return (
                  <CategoryBlock
                    key={block.id}
                    id={block.id}
                    name={block.name}
                    icon={block.icon}
                    tintColor={getTintColor(block.name)}
                    budget={block.budget}
                    spent={spent}
                    width={block.computedWidth}
                    height={block.computedHeight}
                    transactions={txs}
                    onUpdateBudget={(id, newBudget) => updateCategory(id, { monthlyBudget: newBudget })}
                  />
                );
              })}
            </div>
          ))}

          {/* Empty Space */}
          {emptySpaceHeight > 40 && (
            <div
              className="relative flex flex-col items-center justify-center"
              style={{ height: Math.max(emptySpaceHeight, 80) }}
            >
              {/* Dotted grid */}
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.03 }}>
                <defs>
                  <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotGrid)" />
              </svg>

              <span className="text-[18px] text-white/30 font-medium relative z-10">
                €{Math.round(flexRemaining)} to spend
              </span>
              <span className="text-[12px] text-white/20 relative z-10">
                €{Math.round(dailyAllowance)}/day
              </span>

              {/* Johnny */}
              <motion.img
                src={johnnyImage}
                alt="Johnny"
                className="w-11 h-11 relative z-10 mt-2"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Johnny thought bubble for tiny space */}
              {spaceRatio < 0.1 && spaceRatio > 0 && (
                <div className="absolute bottom-16 flex items-end gap-0.5 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
                  <div className="w-2 h-2 rounded-full bg-white/15" />
                  <div className="w-3 h-3 rounded-full bg-white/15 flex items-center justify-center">
                    <span className="text-[8px] text-white/30">...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Over budget indicator */}
          {isOverBudget && (
            <div className="flex items-center justify-center py-2">
              <span className="text-[14px] text-amber-400 font-medium">
                €{Math.abs(Math.round(flexRemaining))} over
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
