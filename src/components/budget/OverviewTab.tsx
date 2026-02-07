import { motion } from 'framer-motion';
import { 
  Calendar, CheckCircle, AlertTriangle, AlertCircle, 
  Wallet, Lock, PiggyBank, ShoppingBag, Equal, ChevronRight
} from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { startOfWeek, endOfWeek, addWeeks, startOfMonth, format, isSameWeek, isAfter, isBefore } from 'date-fns';
import { useMemo } from 'react';

interface OverviewTabProps {
  onOpenFixedExpenses: () => void;
  onSwitchTab: (tab: string) => void;
}

export function OverviewTab({ onOpenFixedExpenses, onSwitchTab }: OverviewTabProps) {
  const {
    flexRemaining,
    flexBudget,
    flexSpent,
    totalIncome,
    totalFixed,
    savingsTarget,
    dailyAllowance,
    percentSpent,
    paceStatus,
    getWeekTransactions,
  } = useBudget();

  const now = new Date();
  const monthStart = startOfMonth(now);

  // Generate week cards for the current month
  const weekCards = useMemo(() => {
    const weeks = [];
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    let weekNum = 1;

    while (weekNum <= 5) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const transactions = getWeekTransactions(weekStart, weekEnd);
      const weekSpent = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const isCurrent = isSameWeek(now, weekStart, { weekStartsOn: 1 });
      const isPast = isBefore(weekEnd, now) && !isCurrent;
      const isFuture = isAfter(weekStart, now) && !isCurrent;

      weeks.push({
        weekNum,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        spent: weekSpent,
        isCurrent,
        isPast,
        isFuture,
      });

      weekStart = addWeeks(weekStart, 1);
      weekNum++;
    }

    return weeks;
  }, [monthStart, now, getWeekTransactions]);

  const getPaceIcon = () => {
    switch (paceStatus) {
      case 'on-track':
        return <CheckCircle className="w-4 h-4 text-positive" />;
      case 'watch':
        return <AlertTriangle className="w-4 h-4 text-attention" />;
      case 'slow-down':
        return <AlertCircle className="w-4 h-4 text-attention" />;
    }
  };

  const getPaceText = () => {
    switch (paceStatus) {
      case 'on-track':
        return 'On track';
      case 'watch':
        return 'Watch spending';
      case 'slow-down':
        return 'Slow down';
    }
  };

  return (
    <div className="space-y-4">
      {/* Flex Number Hero Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-5"
      >
        <p className="text-white/50 text-xs mb-1">Available to spend</p>
        <p className={`text-4xl font-bold mb-1 ${flexRemaining < 0 ? 'text-attention' : 'text-white'}`}>
          €{flexRemaining.toFixed(0)}
        </p>
        <p className="text-white/60 text-sm mb-4">of €{flexBudget.toFixed(0)} flex budget</p>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden mb-4">
          <div
            className="h-full gradient-primary transition-all"
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
            €{dailyAllowance.toFixed(0)}/day
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
            paceStatus === 'on-track' ? 'bg-positive/20 text-positive' : 'bg-white/10 text-attention'
          }`}>
            {getPaceIcon()}
            {getPaceText()}
          </div>
        </div>
      </motion.div>

      {/* Flex Breakdown Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-3xl p-5"
      >
        <button
          onClick={() => onSwitchTab('income')}
          className="w-full flex items-center gap-3 py-2 group"
        >
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white text-left">Income</span>
          <span className="text-white/80">€{totalIncome.toFixed(0)}</span>
          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
        </button>

        <button
          onClick={onOpenFixedExpenses}
          className="w-full flex items-center gap-3 py-2 group"
        >
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white text-left">Fixed expenses</span>
          <span className="text-white/80">−€{totalFixed.toFixed(0)}</span>
          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
        </button>

        <button
          onClick={() => {}}
          className="w-full flex items-center gap-3 py-2 group"
        >
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <PiggyBank className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white text-left">Savings</span>
          <span className="text-white/80">−€{savingsTarget.toFixed(0)}</span>
          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
        </button>

        <div className="border-t border-white/10 my-2" />

        <button
          onClick={() => onSwitchTab('categories')}
          className="w-full flex items-center gap-3 py-2 group"
        >
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white text-left">Spent so far</span>
          <span className="text-white/80">−€{flexSpent.toFixed(0)}</span>
          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <Equal className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white font-semibold">Available</span>
          <span className="text-primary font-bold">€{flexRemaining.toFixed(0)}</span>
        </div>
      </motion.div>

      {/* Weekly Pulse */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-white/60 text-sm font-medium mb-3 px-1">Weekly pulse</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
          {weekCards.map((week) => (
            <div
              key={week.weekNum}
              className={`flex-shrink-0 w-24 glass rounded-2xl p-3 ${
                week.isCurrent ? 'ring-2 ring-primary' : ''
              } ${week.isPast ? 'opacity-60' : ''}`}
            >
              <p className="text-white/60 text-xs mb-1">Week {week.weekNum}</p>
              {week.isFuture ? (
                <p className="text-white/40 text-sm">Upcoming</p>
              ) : (
                <>
                  <p className="text-white font-semibold">€{week.spent.toFixed(0)}</p>
                  {week.isCurrent && (
                    <p className="text-primary text-xs mt-1">€{dailyAllowance.toFixed(0)}/day</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
