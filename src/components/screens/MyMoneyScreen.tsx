import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Plus, Sparkles } from 'lucide-react';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SimulationProvider } from '@/context/SimulationContext';
import { TetrisContainer } from '@/components/budget/TetrisContainer';
import { TerrainPath } from '@/components/terrain/TerrainPath';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import johnnyImage from '@/assets/johnny.png';

function MyMoneyContent() {
  const {
    config, flexRemaining, dailyAllowance, daysRemaining, flexBudget, flexSpent,
  } = useBudget();

  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const [showAddTx, setShowAddTx] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const monthlyIncome = config.monthlyIncome;
  const avgDailySpend = flexBudget > 0 ? flexSpent / Math.max(1, new Date().getDate()) : 0;

  if (!config.setupComplete) {
    return <SetupWizard />;
  }

  const tips = [
    "You're spending less on food this week. Keep it up!",
    "Emergency fund is 40% there. Closer than you think!",
    "At this pace, vacation goal done by December.",
    "Try the What If button to explore scenarios.",
  ];

  return (
    <SimulationProvider
      flexRemaining={flexRemaining}
      dailyAllowance={dailyAllowance}
      daysRemaining={daysRemaining}
      monthlyIncome={monthlyIncome}
      averageDailySpend={avgDailySpend}
    >
      <div className="h-full overflow-auto pb-24">
        <div className="px-4 pt-12 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[20px] font-bold text-white">My Money</h1>

            {/* Monthly/Weekly toggle */}
            <div className="glass-light rounded-full p-0.5 flex">
              <button
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  period === 'month' ? 'bg-white/20 text-white' : 'text-white/50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  period === 'week' ? 'bg-white/20 text-white' : 'text-white/50'
                }`}
              >
                Weekly
              </button>
            </div>

            <button onClick={() => setShowSettings(true)} className="p-2 -mr-2">
              <Sliders size={20} className="text-white/60" strokeWidth={1.5} />
            </button>
          </div>

          {/* Tetris Container */}
          <TetrisContainer period={period} />

          {/* Terrain */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[11px] text-white/40">Next 30 days</span>
              <span className="text-[11px] text-white/30">€{Math.round(dailyAllowance)}/day</span>
            </div>
            <TerrainPath />
          </div>

          {/* What If button */}
          <div className="mt-3">
            <button className="w-full h-12 glass-light rounded-2xl flex items-center justify-center gap-2 border border-white/15">
              <Sparkles size={20} className="text-white/70" strokeWidth={1.5} />
              <span className="text-[15px] text-white font-medium">What if?</span>
            </button>
          </div>

          {/* Johnny's Tip */}
          <div className="mt-3 glass-light rounded-2xl p-4 flex items-center gap-3">
            <img src={johnnyImage} alt="Johnny" className="w-10 h-10 flex-shrink-0" />
            <JohnnyTip tips={tips} />
          </div>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddTx(true)}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg"
        style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}
      >
        <Plus size={24} className="text-white" strokeWidth={2} />
      </motion.button>

      <AddTransactionSheet open={showAddTx} onClose={() => setShowAddTx(false)} />
      <EditBudgetSheet open={showSettings} onClose={() => setShowSettings(false)} />
    </SimulationProvider>
  );
}

function JohnnyTip({ tips }: { tips: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-[13px] text-white/70"
      >
        {tips[index]}
      </motion.p>
    </AnimatePresence>
  );
}

export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
