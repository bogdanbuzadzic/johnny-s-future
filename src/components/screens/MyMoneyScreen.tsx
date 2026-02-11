import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, FlaskConical, ArrowRight, Sliders } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { SimulationProvider } from '@/context/SimulationContext';
import { TetrisContainer } from '@/components/budget/TetrisContainer';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { JohnnyTip } from '@/components/budget/JohnnyTip';
import johnnyImage from '@/assets/johnny.png';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
};

function MyMoneyContent() {
  const {
    config, flexRemaining, dailyAllowance, daysRemaining,
    flexBudget, flexSpent, expenseCategories, paceStatus,
  } = useBudget();
  const { goals } = useApp();

  const [mode, setMode] = useState<'month' | 'whatif'>('month');
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const [showAddTx, setShowAddTx] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // "Can I afford" state
  const [affordTestInput, setAffordTestInput] = useState('');
  const [affordTestCategoryId, setAffordTestCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillCategoryId, setPrefillCategoryId] = useState<string | undefined>();

  const affordTestAmount = parseFloat(affordTestInput) || 0;
  const effectiveCategoryId = affordTestCategoryId || (expenseCategories.length > 0 ? expenseCategories[0].id : null);
  const selectedCategory = expenseCategories.find(c => c.id === effectiveCategoryId);

  const resultInfo = useMemo(() => {
    if (affordTestAmount <= 0) return null;
    const testRemaining = flexRemaining - affordTestAmount;
    const testRatio = flexBudget > 0 ? testRemaining / flexBudget : 0;
    const testDailyAllowance = Math.max(0, testRemaining / daysRemaining);
    if (testRatio > 0.3) return { text: 'Yes, comfortably', color: 'text-green-400' };
    if (testRatio > 0.1) return { text: "Yes, but it'll be tighter", color: 'text-white' };
    if (testRatio >= 0) return { text: `Tight. €${Math.round(testDailyAllowance)}/day left`, color: 'text-amber-400' };
    return { text: `€${Math.abs(Math.round(testRemaining))} over budget`, color: 'text-amber-400' };
  }, [affordTestAmount, flexRemaining, flexBudget, daysRemaining]);

  const avgDailySpend = flexBudget > 0 ? flexSpent / Math.max(1, new Date().getDate()) : 0;

  if (!config.setupComplete) return <SetupWizard />;

  const handleBuyIt = () => {
    setPrefillAmount(affordTestAmount);
    setPrefillCategoryId(effectiveCategoryId || undefined);
    setShowAddTx(true);
  };

  const handleCloseTxSheet = () => {
    setShowAddTx(false);
    if (prefillAmount) setAffordTestInput('');
    setPrefillAmount(undefined);
    setPrefillCategoryId(undefined);
  };

  const SelectedIcon = selectedCategory ? (iconMap[selectedCategory.icon] || MoreHorizontal) : FlaskConical;

  // Dynamic tips
  const largestCat = expenseCategories.length > 0
    ? expenseCategories.reduce((a, b) => a.monthlyBudget > b.monthlyBudget ? a : b)
    : null;
  const closestGoal = goals.filter(g => g.monthlyContribution > 0 && g.saved < g.target)
    .sort((a, b) => (b.saved / b.target) - (a.saved / a.target))[0];

  const tips = [
    largestCat ? `${largestCat.name} is your biggest budget. Try the slider to see trade-offs.` : "Set up categories to see budget trade-offs.",
    closestGoal ? `${closestGoal.name} is ${Math.round((closestGoal.saved / closestGoal.target) * 100)}% funded. Keep going!` : "Add goals to see them compete with spending.",
    paceStatus === 'on-track' ? "You're on track this month. Nice work!" : "Spending is running ahead of pace. Check your largest category.",
    "Try the What If mode to explore budget scenarios.",
  ];

  const paceLabel = paceStatus === 'on-track' ? 'On track' : paceStatus === 'watch' ? 'Watch it' : 'Slow down';
  const paceColor = paceStatus === 'on-track' ? 'rgba(52,199,89,0.7)' : 'rgba(255,159,10,0.7)';

  return (
    <SimulationProvider
      flexRemaining={flexRemaining}
      dailyAllowance={dailyAllowance}
      daysRemaining={daysRemaining}
      monthlyIncome={config.monthlyIncome}
      averageDailySpend={avgDailySpend}
    >
      <div className="h-full overflow-auto pb-24">
        <div className="px-3 pt-12 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[20px] font-bold text-white">My Money</h1>
            <button onClick={() => setShowSettings(true)} className="p-2 -mr-2">
              <Sliders size={20} className="text-white/60" strokeWidth={1.5} />
            </button>
          </div>

          {/* Can I Afford input */}
          <div className="mb-3">
            <div
              className="flex items-center gap-2 px-3 rounded-2xl"
              style={{ height: 44, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
            >
              <FlaskConical size={18} className="text-white/40 flex-shrink-0" strokeWidth={1.5} />
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
                    <span className={`text-[13px] truncate ${resultInfo.color}`}>{resultInfo.text}</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={affordTestInput}
                    onChange={(e) => setAffordTestInput(e.target.value)}
                    placeholder="Can I afford €..."
                    className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-white/25"
                  />
                )}
              </div>
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

            {/* Category picker */}
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
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[12px] transition-colors ${isSelected ? 'text-white' : 'text-white/50'}`}
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

            {/* Buy / Clear */}
            <AnimatePresence>
              {affordTestAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 pt-2 overflow-hidden"
                >
                  <button onClick={handleBuyIt} className="px-4 py-2 rounded-full text-[13px] font-medium text-white" style={{ height: 36, background: 'linear-gradient(135deg, #8B5CF6, #A855F7)' }}>
                    Buy it
                  </button>
                  <button onClick={() => setAffordTestInput('')} className="px-4 py-2 rounded-full text-[13px] text-white/30" style={{ height: 36, background: 'rgba(255,255,255,0.08)' }}>
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center gap-2 mb-3">
            <button
              onClick={() => setMode('month')}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${mode === 'month' ? 'text-white' : 'text-white/40'}`}
              style={{ background: mode === 'month' ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
            >
              My Month
            </button>
            <button
              onClick={() => setMode('whatif')}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 ${mode === 'whatif' ? 'text-white' : 'text-white/40'}`}
              style={{ background: mode === 'whatif' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
            >
              <Sparkles size={14} strokeWidth={1.5} />
              What If
            </button>
          </div>

          {/* Tetris Container */}
          <TetrisContainer
            mode={mode}
            period={period}
            goals={goals}
            ghostTestAmount={affordTestAmount}
            ghostTestCategoryId={effectiveCategoryId || undefined}
            onPeriodChange={setPeriod}
          />

          {/* Impact Summary */}
          <div
            className="mt-3 flex items-center justify-between px-3 rounded-2xl"
            style={{ height: 36, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}
          >
            <span className="text-[13px] text-white/40">€{Math.round(flexRemaining)} left</span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: paceColor, color: 'white' }}
            >
              {paceLabel}
            </span>
            <span className="text-[13px] text-white/40">€{Math.round(dailyAllowance)}/day</span>
          </div>

          {/* Johnny's Tip */}
          <div className="mt-3">
            <JohnnyTip tips={tips} />
          </div>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddTx(true)}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #A855F7)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}
      >
        <Plus size={24} className="text-white" strokeWidth={2} />
      </motion.button>

      <AddTransactionSheet open={showAddTx} onClose={handleCloseTxSheet} prefillAmount={prefillAmount} prefillCategoryId={prefillCategoryId} />
      <EditBudgetSheet open={showSettings} onClose={() => setShowSettings(false)} />
    </SimulationProvider>
  );
}

export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
