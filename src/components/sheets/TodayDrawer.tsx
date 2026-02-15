import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';
import { SimulationProvider } from '@/context/SimulationContext';
import { TerrainPath } from '@/components/terrain/TerrainPath';
import {
  Home, Zap, Shield, ShoppingCart, Smartphone, Music, Dumbbell, Wallet,
  UtensilsCrossed, ShoppingBag, Bus, Film, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Shirt, Wrench, Heart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, getDate, getDaysInMonth } from 'date-fns';

const STORAGE_KEY = 'jfb-budget-data';

const iconLookup: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Smartphone, MoreHorizontal,
  Gift, BookOpen, Shirt, Wrench, Heart, Home, Zap, Shield, ShoppingCart, Music, Wallet,
};

const johnnyTips = [
  "You're spending less on food this week. Keep it up!",
  "Emergency fund is 40% there. Closer than you think!",
  "At this pace, vacation goal done by December.",
];

/** Read budget data fresh from localStorage (no caching) */
function readBudgetFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      config: parsed.config || { monthlyIncome: 0, monthlySavingsTarget: 0, setupComplete: false },
      categories: (parsed.categories || []) as Array<{ id: string; name: string; icon: string; monthlyBudget: number; type: string; sortOrder: number }>,
      transactions: (parsed.transactions || []) as Array<{ id: string; amount: number; type: string; categoryId: string; description: string; date: string; isRecurring: boolean }>,
    };
  } catch {
    return null;
  }
}

interface TodayDrawerProps {
  open: boolean;
  onClose: () => void;
}

function TodayDrawerContent({ onClose, budgetData }: TodayDrawerProps & { budgetData: ReturnType<typeof readBudgetFromStorage> }) {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % johnnyTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50) {
      onClose();
    }
  };

  // Compute display values from budget data
  const computed = useMemo(() => {
    const now = new Date();
    const dIM = getDaysInMonth(now);
    const dOM = getDate(now);
    const dR = dIM - dOM + 1;
    const pM = Math.round((dOM / dIM) * 100);

    if (!budgetData || !budgetData.config.setupComplete) {
      return { flexRemaining: 0, dailyAllowance: 0, percentSpent: 0, percentMonth: pM, paceStatus: 'on-track' as const, daysRemaining: dR, monthlyIncome: 0, hasData: false };
    }

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = dIM;
    const dayOfMonth = dOM;
    const daysRemaining = dR;

    const { config, categories, transactions } = budgetData;
    const expenseCats = categories.filter(c => c.type === 'expense');
    const fixedCats = categories.filter(c => c.type === 'fixed');
    const totalFixed = fixedCats.reduce((s, c) => s + c.monthlyBudget, 0);
    const flexBudget = config.monthlyIncome - totalFixed - config.monthlySavingsTarget;

    const expenseCatIds = new Set(expenseCats.map(c => c.id));
    const flexSpent = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!expenseCatIds.has(t.categoryId)) return false;
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .reduce((s, t) => s + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0), 0);

    const flexRemaining = flexBudget - flexSpent;
    const dailyAllowance = daysRemaining > 0 ? Math.max(0, flexRemaining / daysRemaining) : 0;
    const percentSpent = flexBudget > 0 ? (flexSpent / flexBudget) * 100 : 0;
    const percentMonth = (dayOfMonth / daysInMonth) * 100;
    const paceStatus: 'on-track' | 'watch' | 'slow-down' =
      percentSpent <= percentMonth + 5 ? 'on-track' : percentSpent <= percentMonth + 15 ? 'watch' : 'slow-down';

    return { flexRemaining, dailyAllowance, percentSpent, percentMonth, paceStatus, daysRemaining, monthlyIncome: config.monthlyIncome, hasData: true };
  }, [budgetData]);

  const PaceIcon = computed.paceStatus === 'on-track' ? CheckCircle : computed.paceStatus === 'watch' ? AlertTriangle : AlertCircle;
  const paceLabel = computed.paceStatus === 'on-track' ? 'On track' : computed.paceStatus === 'watch' ? 'Watch it' : 'Over pace';
  const paceColor = computed.paceStatus === 'on-track' ? '#34C759' : '#FF9F0A';

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/60 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed top-0 left-0 right-0 z-50 glass-dark rounded-b-3xl max-h-[85vh] overflow-auto"
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <div className="h-[env(safe-area-inset-top)]" />

        <div className="px-5 pt-8 pb-6">
          {/* Month Pulse Card */}
          <div className="glass rounded-3xl p-5 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/60 text-xs">Available this month</p>
                <p className="text-3xl font-bold text-white mt-1">€{Math.round(computed.flexRemaining)}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: `${paceColor}20` }}>
                <PaceIcon size={14} strokeWidth={1.5} style={{ color: paceColor }} />
                <span className="text-xs font-medium" style={{ color: paceColor }}>{paceLabel}</span>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(computed.percentSpent, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
            <p className="text-white/50 text-xs mt-2">
              {Math.round(computed.percentSpent)}% spent — {Math.round(computed.percentMonth)}% of month passed
            </p>
          </div>

          {/* Daily Allowance Card */}
          <div className="glass rounded-3xl p-5 mb-4">
            <p className="text-2xl font-bold text-white">
              €{Math.round(computed.dailyAllowance)}<span className="text-lg font-normal"> / day</span>
            </p>
            <p className="text-white/60 text-sm mt-1">remaining for the next {computed.daysRemaining} days</p>
          </div>
        </div>

        {/* Terrain Visualization */}
        <TerrainPath />

        {/* Johnny's Tip */}
        <div className="px-5 mt-4 pb-6">
          <div className="glass rounded-3xl p-4 flex items-center gap-3">
            <img src={johnnyImage} alt="Johnny" className="w-10 h-10 object-contain" />
            <AnimatePresence mode="wait">
              <motion.p
                key={currentTip}
                className="text-white text-sm flex-1"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                {johnnyTips[currentTip]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center pb-4">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>
      </motion.div>
    </>
  );
}

export function TodayDrawer({ open, onClose }: TodayDrawerProps) {
  // Read fresh from localStorage every time drawer opens (no caching)
  const budgetData = useMemo(() => {
    if (!open) return null;
    return readBudgetFromStorage();
  }, [open]);

  const computed = useMemo(() => {
    if (!budgetData || !budgetData.config.setupComplete) {
      return { flexRemaining: 0, dailyAllowance: 0, daysRemaining: 0, monthlyIncome: 0, averageDailySpend: 0 };
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = getDaysInMonth(now);
    const dayOfMonth = getDate(now);
    const daysRemaining = daysInMonth - dayOfMonth + 1;

    const { config, categories, transactions } = budgetData;
    const expenseCats = categories.filter(c => c.type === 'expense');
    const fixedCats = categories.filter(c => c.type === 'fixed');
    const totalFixed = fixedCats.reduce((s, c) => s + c.monthlyBudget, 0);
    const flexBudget = config.monthlyIncome - totalFixed - config.monthlySavingsTarget;

    const expenseCatIds = new Set(expenseCats.map(c => c.id));
    const flexSpent = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!expenseCatIds.has(t.categoryId)) return false;
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .reduce((s, t) => s + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0), 0);

    const flexRemaining = flexBudget - flexSpent;
    const dailyAllowance = daysRemaining > 0 ? Math.max(0, flexRemaining / daysRemaining) : 0;

    // Average daily spend from past transactions this month
    const pastDays = Math.max(dayOfMonth - 1, 1);
    const averageDailySpend = flexSpent > 0 ? flexSpent / pastDays : dailyAllowance * 0.85;

    return { flexRemaining, dailyAllowance, daysRemaining, monthlyIncome: config.monthlyIncome, averageDailySpend };
  }, [budgetData]);

  return (
    <AnimatePresence>
      {open && (
        <SimulationProvider
          flexRemaining={computed.flexRemaining}
          dailyAllowance={computed.dailyAllowance}
          daysRemaining={computed.daysRemaining}
          monthlyIncome={computed.monthlyIncome}
          averageDailySpend={computed.averageDailySpend}
        >
          <TodayDrawerContent open={open} onClose={onClose} budgetData={budgetData} />
        </SimulationProvider>
      )}
    </AnimatePresence>
  );
}
