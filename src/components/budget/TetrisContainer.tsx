import { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, PiggyBank, ShieldCheck, Plus,
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, Gift, BookOpen, Smartphone, Shirt, MoreHorizontal,
  Target, Plane, Laptop, Car, Home, GraduationCap, Heart, Gamepad2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { CategoryBlock, ICON_TINT_MAP, getTintColor } from './CategoryBlock';
import { ProgressRing } from './ProgressRing';
import { parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import johnnyImage from '@/assets/johnny.png';
import type { Goal } from '@/context/AppContext';

const goalIconMap: Record<string, LucideIcon> = {
  ShieldCheck, Laptop, Plane, Car, Home, GraduationCap, Heart, Target, Dumbbell, Gamepad2,
};

const ICON_OPTIONS = [
  { key: 'UtensilsCrossed', Icon: UtensilsCrossed, label: 'Food' },
  { key: 'ShoppingBag', Icon: ShoppingBag, label: 'Shopping' },
  { key: 'Bus', Icon: Bus, label: 'Transport' },
  { key: 'Film', Icon: Film, label: 'Entertainment' },
  { key: 'Dumbbell', Icon: Dumbbell, label: 'Health' },
  { key: 'CreditCard', Icon: CreditCard, label: 'Subscriptions' },
  { key: 'Coffee', Icon: Coffee, label: 'Coffee' },
  { key: 'Gift', Icon: Gift, label: 'Gifts' },
  { key: 'BookOpen', Icon: BookOpen, label: 'Education' },
  { key: 'Smartphone', Icon: Smartphone, label: 'Tech' },
  { key: 'Shirt', Icon: Shirt, label: 'Clothing' },
  { key: 'MoreHorizontal', Icon: MoreHorizontal, label: 'Other' },
];

interface TetrisContainerProps {
  mode: 'month' | 'whatif';
  period: 'month' | 'week';
  goals: Goal[];
  ghostTestAmount?: number;
  ghostTestCategoryId?: string;
  onPeriodChange: (period: 'month' | 'week') => void;
}

export function TetrisContainer({
  mode, period, goals, ghostTestAmount = 0, ghostTestCategoryId,
  onPeriodChange,
}: TetrisContainerProps) {
  const {
    config, fixedCategories, expenseCategories, transactions,
    flexBudget, flexRemaining, dailyAllowance, daysRemaining,
    getCategorySpent, updateCategory, addCategory,
  } = useBudget();

  const containerWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - 24, 400) : 351;
  const containerHeight = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.52) : 380;
  const fixedBarH = 32;
  const savingsBarH = 32;
  const zoneHeight = containerHeight - fixedBarH - savingsBarH;
  const zonePadding = 6;
  const innerZoneHeight = zoneHeight - zonePadding * 2;

  // Slider preview state
  const [sliderPreviewBudgets, setSliderPreviewBudgets] = useState<Record<string, number>>({});
  // Simulated (What If) categories
  const [simulatedCats, setSimulatedCats] = useState<Array<{ id: string; name: string; icon: string; budget: number }>>([]);
  const [removedCatIds, setRemovedCatIds] = useState<Set<string>>(new Set());
  // Add category
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');

  // Effective categories
  const activeCats = useMemo(() => {
    let cats = expenseCategories.filter(c => !removedCatIds.has(c.id));
    return [...cats].sort((a, b) => {
      const aBudget = sliderPreviewBudgets[a.id] ?? (period === 'week' ? a.monthlyBudget / 4.33 : a.monthlyBudget);
      const bBudget = sliderPreviewBudgets[b.id] ?? (period === 'week' ? b.monthlyBudget / 4.33 : b.monthlyBudget);
      return bBudget - aBudget;
    });
  }, [expenseCategories, removedCatIds, sliderPreviewBudgets, period]);

  const effectiveFlexBudget = period === 'week' ? flexBudget / 4.33 : flexBudget;

  // Total spending budget allocated
  const totalSpendingBudget = useMemo(() => {
    let total = 0;
    activeCats.forEach(cat => {
      total += sliderPreviewBudgets[cat.id] ?? (period === 'week' ? cat.monthlyBudget / 4.33 : cat.monthlyBudget);
    });
    simulatedCats.forEach(sc => { total += sc.budget; });
    return total;
  }, [activeCats, sliderPreviewBudgets, period, simulatedCats]);

  // Slider delta for flex calculation
  const sliderDelta = useMemo(() => {
    let delta = 0;
    for (const catId of Object.keys(sliderPreviewBudgets)) {
      const cat = expenseCategories.find(c => c.id === catId);
      if (cat) {
        const actualBudget = period === 'week' ? cat.monthlyBudget / 4.33 : cat.monthlyBudget;
        delta += sliderPreviewBudgets[catId] - actualBudget;
      }
    }
    // Add simulated cats
    simulatedCats.forEach(sc => { delta += sc.budget; });
    // Subtract removed cats
    removedCatIds.forEach(rid => {
      const cat = expenseCategories.find(c => c.id === rid);
      if (cat) {
        delta -= period === 'week' ? cat.monthlyBudget / 4.33 : cat.monthlyBudget;
      }
    });
    return delta;
  }, [sliderPreviewBudgets, expenseCategories, period, simulatedCats, removedCatIds]);

  const effectiveFlexRemaining = flexRemaining - sliderDelta - ghostTestAmount;
  const effectiveDailyAllowance = Math.max(0, effectiveFlexRemaining / daysRemaining);

  // Goals with contributions
  const activeGoals = useMemo(() => goals.filter(g => g.monthlyContribution > 0), [goals]);
  const totalGoalContributions = useMemo(() => activeGoals.reduce((s, g) => s + g.monthlyContribution, 0), [activeGoals]);

  // Column sizing
  const totalFixed = fixedCategories.reduce((s, c) => s + c.monthlyBudget, 0);
  const savingsTarget = config.monthlySavingsTarget;
  const income = config.monthlyIncome;

  // Proportional widths
  const availableWidth = containerWidth - 12; // inner padding
  const spendingFraction = effectiveFlexBudget > 0 ? totalSpendingBudget / effectiveFlexBudget : 0;
  const goalsFraction = effectiveFlexBudget > 0 && totalGoalContributions > 0
    ? (savingsTarget / income) * (availableWidth / availableWidth) // goals take savings proportion
    : 0;

  // Spending total width (proportional to income)
  const spendingTotalWidth = Math.min(
    totalSpendingBudget > 0 ? (totalSpendingBudget / (income - totalFixed)) * availableWidth : 0,
    availableWidth * 0.85
  );
  // Goal total width
  const goalTotalWidth = totalGoalContributions > 0
    ? Math.min((savingsTarget / (income - totalFixed)) * availableWidth, availableWidth * 0.4)
    : 0;
  const gapWidth = Math.max(0, availableWidth - spendingTotalWidth - goalTotalWidth);

  // Individual column widths
  const getColumnWidth = (budget: number) => {
    if (totalSpendingBudget <= 0) return 60;
    return Math.max(60, (budget / totalSpendingBudget) * spendingTotalWidth);
  };

  const getGoalColumnWidth = (contribution: number) => {
    if (totalGoalContributions <= 0) return 60;
    return Math.max(50, (contribution / totalGoalContributions) * goalTotalWidth);
  };

  // Slider handlers
  const handleSliderChange = useCallback((id: string, newBudget: number) => {
    setSliderPreviewBudgets(prev => ({ ...prev, [id]: newBudget }));
  }, []);

  const handleSliderConfirm = useCallback((id: string, newBudget: number) => {
    const monthlyBudget = period === 'week' ? newBudget * 4.33 : newBudget;
    updateCategory(id, { monthlyBudget: Math.round(monthlyBudget) });
    setSliderPreviewBudgets(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [updateCategory, period]);

  const handleSliderCancel = useCallback((id: string) => {
    setSliderPreviewBudgets(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleRemoveBlock = useCallback((id: string) => {
    // In What If, just hide
    setRemovedCatIds(prev => new Set(prev).add(id));
  }, []);

  // Add category
  const handleCreateCategory = () => {
    if (!newCatIcon || !newCatName.trim() || !newCatBudget) return;
    const budgetNum = parseFloat(newCatBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) return;

    if (mode === 'whatif') {
      setSimulatedCats(prev => [...prev, {
        id: `sim-${Date.now()}`,
        name: newCatName.trim(),
        icon: newCatIcon,
        budget: budgetNum,
      }]);
    } else {
      addCategory({ name: newCatName.trim(), icon: newCatIcon, monthlyBudget: budgetNum, type: 'expense' });
    }
    setNewCatIcon('');
    setNewCatName('');
    setNewCatBudget('');
    setAddingCategory(false);
  };

  // Reset What If state
  const resetWhatIf = useCallback(() => {
    setSimulatedCats([]);
    setRemovedCatIds(new Set());
    setSliderPreviewBudgets({});
  }, []);

  // Get period transactions
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

  const selectedTint = newCatIcon ? (ICON_TINT_MAP[newCatIcon] || '#FFFFFF') : null;
  const canCreate = newCatIcon && newCatName.trim() && newCatBudget && parseFloat(newCatBudget) > 0;
  const isOverBudget = effectiveFlexRemaining < 0;
  const isSquished = gapWidth < 44;

  return (
    <div>
      {/* Container */}
      <div
        className="relative rounded-[20px] overflow-hidden"
        style={{
          width: containerWidth,
          height: containerHeight,
          background: 'rgba(255,255,255,0.05)',
          border: mode === 'whatif'
            ? '2px dashed rgba(255,255,255,0.10)'
            : '2px solid rgba(255,255,255,0.20)',
          boxShadow: isOverBudget
            ? 'inset 0 0 20px rgba(255,255,255,0.03), 0 0 24px rgba(255,159,10,0.3)'
            : 'inset 0 0 20px rgba(255,255,255,0.03)',
          animation: mode === 'whatif' ? 'ghostPulse 3s ease-in-out infinite' : undefined,
        }}
      >
        {/* What If label */}
        {mode === 'whatif' && (
          <div className="absolute top-1 right-2 z-10 text-[9px] text-white/15 flex items-center gap-1">
            Playground
          </div>
        )}

        {/* Fixed Expenses Bar */}
        <div
          className="flex items-center px-3 gap-2"
          style={{
            height: fixedBarH,
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Lock size={10} className="text-white/25 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 truncate text-[10px] text-white/20">
            {fixedCategories.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ' · '}
                {c.name} €{c.monthlyBudget}
              </span>
            ))}
            {fixedCategories.length === 0 && 'No fixed expenses'}
          </div>
          <span className="text-[10px] text-white/25 flex-shrink-0">Fixed: €{totalFixed}</span>

          {/* Period toggle inside header */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={() => onPeriodChange('month')}
              className={`px-1.5 py-0.5 rounded-full text-[9px] transition-colors ${period === 'month' ? 'bg-white/15 text-white/50' : 'text-white/20'}`}
            >
              Mo
            </button>
            <button
              onClick={() => onPeriodChange('week')}
              className={`px-1.5 py-0.5 rounded-full text-[9px] transition-colors ${period === 'week' ? 'bg-white/15 text-white/50' : 'text-white/20'}`}
            >
              Wk
            </button>
          </div>
        </div>

        {/* Main Zone: Spending | Gap | Goals */}
        <div
          className="relative flex"
          style={{
            height: zoneHeight,
            padding: zonePadding,
          }}
        >
          {/* Spending columns (left) */}
          <div className="flex gap-1 flex-shrink-0" style={{ height: innerZoneHeight }}>
            {activeCats.map(cat => {
              const budget = sliderPreviewBudgets[cat.id] ?? (period === 'week' ? cat.monthlyBudget / 4.33 : cat.monthlyBudget);
              const spent = getCategorySpent(cat.id, period);
              const colWidth = getColumnWidth(budget);
              const blockGhost = ghostTestCategoryId === cat.id ? ghostTestAmount : 0;

              return (
                <CategoryBlock
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  icon={cat.icon}
                  tintColor={ICON_TINT_MAP[cat.icon] || getTintColor(cat.name)}
                  budget={budget}
                  spent={spent}
                  width={colWidth}
                  height={innerZoneHeight}
                  ghostAmount={blockGhost}
                  mode={mode}
                  flexRemaining={effectiveFlexRemaining + (sliderPreviewBudgets[cat.id] !== undefined ? sliderPreviewBudgets[cat.id] - budget : 0)}
                  onSliderChange={handleSliderChange}
                  onSliderConfirm={handleSliderConfirm}
                  onSliderCancel={handleSliderCancel}
                  onRemove={mode === 'whatif' ? handleRemoveBlock : undefined}
                />
              );
            })}

            {/* Simulated blocks (What If) */}
            {simulatedCats.map(sc => (
              <CategoryBlock
                key={sc.id}
                id={sc.id}
                name={sc.name}
                icon={sc.icon}
                tintColor={ICON_TINT_MAP[sc.icon] || '#8B5CF6'}
                budget={sc.budget}
                spent={0}
                width={getColumnWidth(sc.budget)}
                height={innerZoneHeight}
                mode={mode}
                isSimulated
                flexRemaining={effectiveFlexRemaining}
                onRemove={(id) => setSimulatedCats(prev => prev.filter(s => s.id !== id))}
              />
            ))}

            {/* Add category button */}
            {!addingCategory && (
              <button
                onClick={() => setAddingCategory(true)}
                className="flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{
                  width: 28,
                  height: innerZoneHeight,
                  border: '2px dashed rgba(255,255,255,0.15)',
                }}
              >
                <Plus size={16} className="text-white/30" />
              </button>
            )}
          </div>

          {/* Gap with Johnny */}
          {gapWidth > 8 && (
            <div
              className="flex flex-col items-center justify-center flex-shrink-0"
              style={{ width: gapWidth, height: innerZoneHeight }}
            >
              {isSquished && isOverBudget && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,159,10,0.15) 0%, transparent 70%)',
                  }}
                />
              )}
              <span className="text-[14px] text-white/30 font-medium">
                €{Math.round(effectiveFlexRemaining)}
              </span>
              <motion.img
                src={johnnyImage}
                alt="Johnny"
                className="flex-shrink-0"
                style={{
                  width: isSquished ? 24 : 40,
                  height: isSquished ? 24 : 40,
                  objectFit: isSquished ? 'cover' : 'contain',
                  objectPosition: isSquished ? 'top' : 'center',
                }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-[11px] text-white/20">
                €{Math.round(effectiveDailyAllowance)}/day
              </span>
            </div>
          )}

          {/* Goal columns (right) */}
          {activeGoals.length > 0 && (
            <div className="flex gap-1 flex-shrink-0 ml-auto" style={{ height: innerZoneHeight }}>
              {activeGoals.map(goal => {
                const GoalIcon = goalIconMap[goal.icon] || Target;
                const colWidth = getGoalColumnWidth(goal.monthlyContribution);
                const progressPct = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
                const fillH = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
                const isFullyFunded = goal.saved >= goal.target;

                return (
                  <div
                    key={goal.id}
                    className="relative rounded-xl overflow-hidden flex-shrink-0"
                    style={{
                      width: colWidth,
                      height: innerZoneHeight,
                      background: isFullyFunded ? 'rgba(52,199,89,0.15)' : 'rgba(139,92,246,0.15)',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      boxShadow: isFullyFunded ? '0 0 12px rgba(52,199,89,0.2)' : undefined,
                    }}
                  >
                    {/* Goal fill from bottom */}
                    <div
                      className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                      style={{
                        height: `${fillH}%`,
                        background: 'rgba(52,199,89,0.20)',
                        borderRadius: '0 0 12px 12px',
                      }}
                    />

                    {/* Goal content */}
                    <div className="relative z-10 flex flex-col items-center pt-2 px-1 h-full">
                      <GoalIcon size={18} className="text-white/50 flex-shrink-0" strokeWidth={1.5} />
                      <span className="text-[11px] text-white/60 text-center leading-tight mt-1 line-clamp-2">
                        {goal.name}
                      </span>
                      <div className="mt-2">
                        <ProgressRing progress={progressPct} size={40} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] text-white/40 mt-1 text-center">
                        €{goal.saved}/€{goal.target}
                      </span>
                      <span className="text-[9px] text-white/25 mt-0.5">
                        €{goal.monthlyContribution}/mo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Savings Bar */}
        <div
          className="flex items-center px-3 gap-2 absolute bottom-0 left-0 right-0"
          style={{
            height: savingsBarH,
            background: 'rgba(52,199,89,0.08)',
            borderTop: '1px solid rgba(52,199,89,0.12)',
          }}
        >
          <PiggyBank size={10} className="text-green-400/50 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-[10px] text-white/30">Savings €{savingsTarget}/mo</span>
          <ShieldCheck size={10} className="text-white/15 ml-auto" />
        </div>
      </div>

      {/* Add category inline form (below container) */}
      <AnimatePresence>
        {addingCategory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2"
          >
            <div
              className="p-3 rounded-2xl"
              style={{
                border: '2px dashed rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {/* Icon picker */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {ICON_OPTIONS.map(opt => {
                  const selected = newCatIcon === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setNewCatIcon(opt.key)}
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)',
                        border: selected ? '2px solid rgba(139,92,246,0.8)' : '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <opt.Icon size={16} className="text-white/60" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mb-2">
                {selectedTint && <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selectedTint }} />}
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 rounded-xl px-3 py-2 text-[14px] text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-white/20"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              </div>
              <div className="flex items-center gap-1 mb-3">
                <span className="text-[14px] text-white/40">€</span>
                <input
                  type="number"
                  value={newCatBudget}
                  onChange={e => setNewCatBudget(e.target.value)}
                  placeholder={mode === 'whatif' ? 'Simulated budget' : 'Monthly budget'}
                  className="flex-1 rounded-xl px-3 py-2 text-[18px] font-bold text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-white/20"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              </div>
              <button
                onClick={handleCreateCategory}
                disabled={!canCreate}
                className="w-full py-2.5 rounded-full text-[14px] font-medium text-white transition-opacity"
                style={{
                  background: canCreate ? 'linear-gradient(135deg, #8B5CF6, #A855F7)' : 'rgba(255,255,255,0.08)',
                  opacity: canCreate ? 1 : 0.4,
                }}
              >
                {mode === 'whatif' ? 'Add' : 'Create'}
              </button>
              <button
                onClick={() => { setAddingCategory(false); setNewCatIcon(''); setNewCatName(''); setNewCatBudget(''); }}
                className="w-full mt-2 text-[13px] text-white/30 text-center"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
