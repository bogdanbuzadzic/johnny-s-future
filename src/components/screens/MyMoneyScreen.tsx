import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Plus, Sparkles, FlaskConical } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SimulationProvider } from '@/context/SimulationContext';
import { TetrisContainer } from '@/components/budget/TetrisContainer';
import { TerrainPath } from '@/components/terrain/TerrainPath';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import johnnyImage from '@/assets/johnny.png';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
};

function MyMoneyContent() {
  const {
    config,
    flexRemaining,
    dailyAllowance,
    daysRemaining,
    flexBudget,
    flexSpent,
    expenseCategories,
    transactions,
  } = useBudget();
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const [showAddTx, setShowAddTx] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState(false);

  // "Can I afford" state
  const [affordTestInput, setAffordTestInput] = useState('');
  const [affordTestCategoryId, setAffordTestCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Prefill state for AddTransactionSheet
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillCategoryId, setPrefillCategoryId] = useState<string | undefined>();

  const affordTestAmount = parseFloat(affordTestInput) || 0;

  // Default category: first expense category
  const effectiveCategoryId = affordTestCategoryId || (expenseCategories.length > 0 ? expenseCategories[0].id : null);
  const selectedCategory = expenseCategories.find(c => c.id === effectiveCategoryId);

  // Result text
  const resultInfo = useMemo(() => {
    if (affordTestAmount <= 0) return null;
    const testRemaining = flexRemaining - affordTestAmount;
    const testRatio = flexBudget > 0 ? testRemaining / flexBudget : 0;
    const testDailyAllowance = Math.max(0, testRemaining / daysRemaining);

    if (testRatio > 0.3) return { text: 'Yes, comfortably', color: 'text-green-400' };
    if (testRatio > 0.1) return { text: "Yes, but it'll be tighter", color: 'text-white' };
    if (testRatio >= 0) return { text: `Tight. €${Math.round(testDailyAllowance)}/day left for ${daysRemaining} days`, color: 'text-amber-400' };
    return { text: `€${Math.abs(Math.round(testRemaining))} over budget`, color: 'text-amber-400' };
  }, [affordTestAmount, flexRemaining, flexBudget, daysRemaining]);

  // Daily allowance delta for terrain
  const ghostDailyAllowance = affordTestAmount > 0 ? Math.max(0, (flexRemaining - affordTestAmount) / daysRemaining) : null;

  const monthlyIncome = config.monthlyIncome;
  const avgDailySpend = flexBudget > 0 ? flexSpent / Math.max(1, new Date().getDate()) : 0;

  if (!config.setupComplete) {
    return <SetupWizard />;
  }

  const handleBuyIt = () => {
    setPrefillAmount(affordTestAmount);
    setPrefillCategoryId(effectiveCategoryId || undefined);
    setShowAddTx(true);
  };

  const handleClearTest = () => {
    setAffordTestInput('');
  };

  const handleCloseTxSheet = () => {
    setShowAddTx(false);
    setPrefillAmount(undefined);
    setPrefillCategoryId(undefined);
    // Clear the afford test if we had a prefill
    if (prefillAmount) {
      setAffordTestInput('');
    }
  };

  const SelectedIcon = selectedCategory ? (iconMap[selectedCategory.icon] || MoreHorizontal) : FlaskConical;

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
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${period === 'month' ? 'bg-white/20 text-white' : 'text-white/50'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${period === 'week' ? 'bg-white/20 text-white' : 'text-white/50'}`}
              >
                Weekly
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setOptimizeMode(true)}
                className="w-8 h-8 rounded-full glass-light flex items-center justify-center"
              >
                <Sparkles size={16} className="text-white/60" strokeWidth={1.5} />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 -mr-2">
                <Sliders size={20} className="text-white/60" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Tetris Container */}
          <TetrisContainer
            period={period}
            optimizeMode={optimizeMode}
            onOptimizeDone={() => setOptimizeMode(false)}
            ghostTestAmount={affordTestAmount}
            ghostTestCategoryId={effectiveCategoryId || undefined}
          />

          {/* === "Can I Afford This?" Input Row === */}
          <div className="mt-3">
            <div
              className="flex items-center gap-2 px-3 rounded-2xl"
              style={{
                height: 44,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <FlaskConical size={18} className="text-white/40 flex-shrink-0" strokeWidth={1.5} />

              {/* Input or result text */}
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-white/40 text-[14px]">€</span>
                {resultInfo && affordTestAmount > 0 ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={affordTestInput}
                      onChange={(e) => setAffordTestInput(e.target.value)}
                      className="w-16 bg-transparent text-white text-[14px] outline-none"
                      placeholder="0"
                    />
                    <span className={`text-[13px] truncate ${resultInfo.color}`}>
                      {resultInfo.text}
                    </span>
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={affordTestInput}
                    onChange={(e) => setAffordTestInput(e.target.value)}
                    placeholder="Can I afford €..."
                    className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-white/25"
                    disabled={expenseCategories.length === 0}
                  />
                )}
              </div>

              {/* Category picker pill */}
              {expenseCategories.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCategoryPicker(!showCategoryPicker); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <SelectedIcon size={12} className="text-white/60" strokeWidth={1.5} />
                  <span className="text-[11px] text-white/50 max-w-[40px] truncate">
                    {selectedCategory?.name || 'Pick'}
                  </span>
                </button>
              )}
            </div>

            {/* Category picker row */}
            <AnimatePresence>
              {showCategoryPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-1.5 overflow-x-auto py-2 px-1">
                    {expenseCategories.map((cat) => {
                      const CatIcon = iconMap[cat.icon] || MoreHorizontal;
                      const isSelected = effectiveCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => { setAffordTestCategoryId(cat.id); setShowCategoryPicker(false); }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[12px] transition-colors ${
                            isSelected ? 'bg-white/20 text-white' : 'text-white/50'
                          }`}
                          style={{ background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)' }}
                        >
                          <CatIcon size={12} strokeWidth={1.5} />
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buy it / Clear buttons */}
            <AnimatePresence>
              {affordTestAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 pt-2 overflow-hidden"
                >
                  <button
                    onClick={handleBuyIt}
                    className="px-4 py-2 rounded-full text-[13px] font-medium gradient-primary text-white"
                    style={{ height: 36 }}
                  >
                    Buy it
                  </button>
                  <button
                    onClick={handleClearTest}
                    className="px-4 py-2 rounded-full text-[13px] text-white/30"
                    style={{ height: 36, background: 'rgba(255,255,255,0.08)' }}
                  >
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terrain */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[11px] text-white/40">Next 30 days</span>
              {ghostDailyAllowance !== null ? (
                <span className="text-[11px] text-white/40">
                  €{Math.round(dailyAllowance)}/day → €{Math.round(ghostDailyAllowance)}/day
                </span>
              ) : (
                <span className="text-[11px] text-white/30">€{Math.round(dailyAllowance)}/day</span>
              )}
            </div>
            <TerrainPath />
          </div>

          {/* What If button */}
          <div className="mt-3" />

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

      <AddTransactionSheet
        open={showAddTx}
        onClose={handleCloseTxSheet}
        prefillAmount={prefillAmount}
        prefillCategoryId={prefillCategoryId}
      />
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
