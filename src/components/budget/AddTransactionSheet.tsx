import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, RotateCcw,
  ShieldCheck, Plane, Car, Home, Laptop, GraduationCap, Heart, Target, TrendingUp, LineChart, Bike, Gamepad2,
} from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { NumberKeypad } from './NumberKeypad';
import { 
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal 
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBag,
  Bus,
  Film,
  Dumbbell,
  CreditCard,
  Coffee,
  MoreHorizontal,
};

const goalIconList = [
  { name: 'ShieldCheck', Icon: ShieldCheck },
  { name: 'Plane', Icon: Plane },
  { name: 'Car', Icon: Car },
  { name: 'Home', Icon: Home },
  { name: 'Laptop', Icon: Laptop },
  { name: 'GraduationCap', Icon: GraduationCap },
  { name: 'Heart', Icon: Heart },
  { name: 'Target', Icon: Target },
  { name: 'TrendingUp', Icon: TrendingUp },
  { name: 'LineChart', Icon: LineChart },
  { name: 'Bike', Icon: Bike },
  { name: 'Gamepad2', Icon: Gamepad2 },
];

interface AddTransactionSheetProps {
  open: boolean;
  onClose: () => void;
  prefillAmount?: number;
  prefillCategoryId?: string;
  initialMode?: 'expense' | 'income' | 'goal';
}

export function AddTransactionSheet({ open, onClose, prefillAmount, prefillCategoryId, initialMode }: AddTransactionSheetProps) {
  const { expenseCategories, transactions, addTransaction } = useBudget();
  const { addGoal } = useApp();

  const [type, setType] = useState<'expense' | 'income' | 'goal'>('expense');
  const [amountValue, setAmountValue] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Goal form state
  const [goalName, setGoalName] = useState('');
  const [goalIcon, setGoalIcon] = useState('Target');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalContribution, setGoalContribution] = useState('');

  // Initialize with prefill values when opening
  useEffect(() => {
    if (open) {
      if (initialMode) setType(initialMode);
      if (prefillAmount !== undefined) {
        setAmountValue(prefillAmount.toString());
      }
      if (prefillCategoryId !== undefined) {
        setSelectedCategoryId(prefillCategoryId);
      }
    } else {
      // Reset goal form on close
      setGoalName('');
      setGoalIcon('Target');
      setGoalTarget('');
      setGoalContribution('');
    }
  }, [open, prefillAmount, prefillCategoryId, initialMode]);

  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [showCalendar, setShowCalendar] = useState(false);

  // Autocomplete suggestions from transaction history
  const suggestions = useMemo(() => {
    if (!description) return [];
    const lowerDesc = description.toLowerCase();
    const uniqueDescriptions = new Set(
      transactions
        .filter(t => t.description.toLowerCase().startsWith(lowerDesc))
        .map(t => t.description)
    );
    return Array.from(uniqueDescriptions).slice(0, 3);
  }, [description, transactions]);

  const amount = parseFloat(amountValue) || 0;
  const isValid = type === 'goal'
    ? (goalName.trim() && parseFloat(goalTarget) > 0 && parseFloat(goalContribution) > 0)
    : (amount > 0 && (type === 'income' || selectedCategoryId));

  const handleSave = () => {
    if (!isValid) return;

    if (type === 'goal') {
      addGoal({
        name: goalName.trim(),
        icon: goalIcon,
        target: parseFloat(goalTarget) || 0,
        saved: 0,
        monthlyContribution: parseFloat(goalContribution) || 0,
        targetDate: '',
        monthIndex: -1,
      });
      setGoalName('');
      setGoalIcon('Target');
      setGoalTarget('');
      setGoalContribution('');
      onClose();
      return;
    }

    addTransaction({
      amount,
      type,
      categoryId: type === 'expense' ? selectedCategoryId! : 'income',
      description: description || (type === 'expense' ? 'Expense' : 'Income'),
      date: format(selectedDate, 'yyyy-MM-dd'),
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
    });

    // Reset and close
    setAmountValue('');
    setSelectedCategoryId(null);
    setDescription('');
    setSelectedDate(new Date());
    setIsRecurring(false);
    onClose();
  };

  const handleDateSelect = (preset: 'today' | 'yesterday') => {
    setSelectedDate(preset === 'today' ? new Date() : subDays(new Date(), 1));
    setShowCalendar(false);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isYesterday = format(selectedDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl border-0 bg-transparent p-0"
      >
        <div className="h-full jfb-bg rounded-t-3xl overflow-auto">
          <SheetHeader className="p-5 pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-lg font-semibold">
                {type === 'goal' ? 'Create Goal' : 'Add transaction'}
              </SheetTitle>
              <button onClick={onClose} className="p-2 -mr-2">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </SheetHeader>

          <div className="p-5 space-y-6">
            {/* Type toggle - three pills */}
            <div className="flex justify-center">
              <div className="glass-light rounded-full p-1 flex">
                {(['expense', 'income', 'goal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      type === t ? 'bg-white/20 text-white' : 'text-white/60'
                    }`}
                  >
                    {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Goal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal form */}
            {type === 'goal' ? (
              <div className="space-y-5">
                {/* Goal name */}
                <input
                  type="text"
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  placeholder="What are you saving for?"
                  className="w-full rounded-xl px-4 text-white text-[14px] placeholder:text-white/40 outline-none"
                  style={{ height: 44, background: 'rgba(255,255,255,0.10)' }}
                />

                {/* Icon picker */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Icon</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {goalIconList.map(({ name, Icon }) => (
                      <button
                        key={name}
                        onClick={() => setGoalIcon(name)}
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.10)',
                          border: goalIcon === name ? '2px solid rgba(52,199,89,0.5)' : '2px solid transparent',
                        }}
                      >
                        <Icon size={18} className="text-white/70" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target amount */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Target amount</p>
                  <div className="flex items-center rounded-xl px-4" style={{ height: 44, background: 'rgba(255,255,255,0.10)' }}>
                    <span className="text-white/40 mr-2">€</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={goalTarget}
                      onChange={e => setGoalTarget(e.target.value)}
                      placeholder="Target amount"
                      className="flex-1 bg-transparent text-white text-[14px] placeholder:text-white/40 outline-none"
                    />
                  </div>
                </div>

                {/* Monthly contribution */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Monthly contribution</p>
                  <div className="flex items-center rounded-xl px-4" style={{ height: 44, background: 'rgba(255,255,255,0.10)' }}>
                    <span className="text-white/40 mr-2">€</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={goalContribution}
                      onChange={e => setGoalContribution(e.target.value)}
                      placeholder="Save per month"
                      className="flex-1 bg-transparent text-white text-[14px] placeholder:text-white/40 outline-none"
                    />
                  </div>
                </div>

                {/* Create Goal button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!isValid}
                  className="w-full rounded-2xl text-white font-semibold disabled:opacity-50"
                  style={{ height: 48, background: 'linear-gradient(135deg, #34C759, #5AC8FA)' }}
                >
                  Create Goal
                </motion.button>
              </div>
            ) : (
              <>
                {/* Amount display */}
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">
                    €{amountValue || '0'}
                  </p>
                </div>

                {/* Keypad */}
                <NumberKeypad value={amountValue} onChange={setAmountValue} />

                {/* Category selector (expense only) */}
                {type === 'expense' && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Category</p>
                    {expenseCategories.length === 0 ? (
                      <p className="text-white/40 text-sm">No categories yet</p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {expenseCategories.map((cat) => {
                          const Icon = iconMap[cat.icon] || MoreHorizontal;
                          const isSelected = selectedCategoryId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategoryId(cat.id)}
                              className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
                                isSelected ? 'bg-primary text-white' : 'glass-light text-white/80'
                              }`}
                            >
                              <Icon className="w-4 h-4" strokeWidth={1.5} />
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Description</p>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What was it?"
                    className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
                  />
                  {suggestions.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => setDescription(s)}
                          className="px-3 py-1 rounded-full glass-light text-white/70 text-sm"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date selector */}
                <div>
                  <p className="text-white/60 text-sm mb-2">Date</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDateSelect('today')}
                      className={`px-4 py-2 rounded-full text-sm ${
                        isToday ? 'bg-primary text-white' : 'glass-light text-white/80'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleDateSelect('yesterday')}
                      className={`px-4 py-2 rounded-full text-sm ${
                        isYesterday ? 'bg-primary text-white' : 'glass-light text-white/80'
                      }`}
                    >
                      Yesterday
                    </button>
                    <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                      <PopoverTrigger asChild>
                        <button
                          className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 ${
                            !isToday && !isYesterday ? 'bg-primary text-white' : 'glass-light text-white/80'
                          }`}
                        >
                          <CalendarDays className="w-4 h-4" />
                          {!isToday && !isYesterday && format(selectedDate, 'MMM d')}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-transparent border-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date);
                              setShowCalendar(false);
                            }
                          }}
                          className={cn("p-3 pointer-events-auto glass rounded-2xl")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Recurring toggle */}
                <div>
                  <button
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      isRecurring ? 'bg-primary text-white' : 'glass-light text-white/80'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Recurring
                  </button>
                  {isRecurring && (
                    <div className="flex gap-2 mt-2">
                      {(['weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setRecurringFrequency(freq)}
                          className={`px-3 py-1.5 rounded-full text-sm ${
                            recurringFrequency === freq ? 'bg-white/20 text-white' : 'glass-light text-white/60'
                          }`}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!isValid}
                  className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold disabled:opacity-50"
                >
                  {type === 'expense' ? 'Add expense' : 'Add income'}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
