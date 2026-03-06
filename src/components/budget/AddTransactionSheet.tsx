import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, RotateCcw, Delete, ChevronLeft,
  ShieldCheck, Plane, Car, Home, Laptop, GraduationCap, Heart, Target, TrendingUp, LineChart, Bike, Gamepad2,
} from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
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
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
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

const catTintMap: Record<string, string> = {
  UtensilsCrossed: '#F97316', ShoppingBag: '#EF4444', Bus: '#34495E', Film: '#8B5CF6',
  Dumbbell: '#7F8C8D', CreditCard: '#6C3483', Coffee: '#795548', MoreHorizontal: '#7F8C8D',
};

function getCatTint(icon: string): string {
  return catTintMap[icon] || '#8B5CF6';
}

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
  const [step, setStep] = useState(1);

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
      setStep(1);
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

  const selectedCatName = useMemo(() => {
    if (!selectedCategoryId) return '';
    const cat = expenseCategories.find(c => c.id === selectedCategoryId);
    return cat?.name || '';
  }, [selectedCategoryId, expenseCategories]);

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
    setStep(1);
    onClose();
  };

  const handleDateSelect = (preset: 'today' | 'yesterday') => {
    setSelectedDate(preset === 'today' ? new Date() : subDays(new Date(), 1));
    setShowCalendar(false);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isYesterday = format(selectedDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Custom numpad handler
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmountValue(v => v.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amountValue.includes('.')) return;
      if (amountValue === '') { setAmountValue('0.'); return; }
      setAmountValue(v => v + '.');
      return;
    }
    const parts = amountValue.split('.');
    if (parts.length === 2 && parts[1].length >= 2) return;
    if (amountValue === '0' && key !== '.') { setAmountValue(key); return; }
    setAmountValue(v => v + key);
  };

  const numKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  // Detect if wide screen (desktop/tablet)
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-3xl border-0 bg-transparent p-0"
        style={{ maxHeight: '90vh' }}
      >
        <div className="jfb-bg rounded-t-3xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <SheetHeader className="sr-only">
            <SheetTitle>{type === 'goal' ? 'Create Goal' : 'Add transaction'}</SheetTitle>
          </SheetHeader>

          {/* Goal form — same as before */}
          {type === 'goal' ? (
            <div className="p-5 space-y-5">
              {/* Type toggle */}
              <div className="flex justify-center">
                <div className="glass-light rounded-full p-1 flex">
                  {(['expense', 'income', 'goal'] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${type === t ? 'bg-white/20 text-white' : 'text-white/60'}`}>
                      {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Goal'}
                    </button>
                  ))}
                </div>
              </div>

              <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)}
                placeholder="What are you saving for?"
                className="w-full rounded-xl px-4 text-white text-[14px] placeholder:text-white/40 outline-none"
                style={{ height: 44, background: 'rgba(255,255,255,0.10)' }} />

              <div>
                <p className="text-white/60 text-sm mb-2">Icon</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {goalIconList.map(({ name, Icon }) => (
                    <button key={name} onClick={() => setGoalIcon(name)}
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.10)',
                        border: goalIcon === name ? '2px solid rgba(52,199,89,0.5)' : '2px solid transparent',
                      }}>
                      <Icon size={18} className="text-white/70" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/60 text-sm mb-2">Target amount</p>
                <div className="flex items-center rounded-xl px-4" style={{ height: 44, background: 'rgba(255,255,255,0.10)' }}>
                  <span className="text-white/40 mr-2">€</span>
                  <input type="number" inputMode="decimal" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                    placeholder="Target amount" className="flex-1 bg-transparent text-white text-[14px] placeholder:text-white/40 outline-none" />
                </div>
              </div>

              <div>
                <p className="text-white/60 text-sm mb-2">Monthly contribution</p>
                <div className="flex items-center rounded-xl px-4" style={{ height: 44, background: 'rgba(255,255,255,0.10)' }}>
                  <span className="text-white/40 mr-2">€</span>
                  <input type="number" inputMode="decimal" value={goalContribution} onChange={e => setGoalContribution(e.target.value)}
                    placeholder="Save per month" className="flex-1 bg-transparent text-white text-[14px] placeholder:text-white/40 outline-none" />
                </div>
              </div>

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={!isValid}
                className="w-full rounded-2xl text-white font-semibold disabled:opacity-50"
                style={{ height: 48, background: 'linear-gradient(135deg, #34C759, #5AC8FA)' }}>
                Create Goal
              </motion.button>
            </div>
          ) : isWide ? (
            /* ═══ DESKTOP: Single-screen compact layout ═══ */
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white text-lg font-semibold">Add transaction</span>
                <button onClick={onClose} className="p-2 -mr-2"><X className="w-5 h-5 text-white/60" /></button>
              </div>

              {/* Type toggle */}
              <div className="flex justify-center">
                <div className="glass-light rounded-full p-1 flex">
                  {(['expense', 'income', 'goal'] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${type === t ? 'bg-white/20 text-white' : 'text-white/60'}`}>
                      {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Goal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input (native keyboard) */}
              <div className="flex items-center rounded-xl px-4" style={{ height: 52, background: 'rgba(255,255,255,0.06)' }}>
                <span className="text-white/40 mr-2 text-xl">€</span>
                <input type="number" inputMode="decimal" autoFocus value={amountValue} onChange={e => setAmountValue(e.target.value)}
                  placeholder="0" className="flex-1 bg-transparent text-white text-2xl font-bold placeholder:text-white/20 outline-none" style={{ fontFamily: 'JetBrains Mono, monospace' }} />
              </div>

              {/* Category (expense) */}
              {type === 'expense' && (
                <div>
                  <p className="text-white/60 text-sm mb-2">Category</p>
                  <div className="flex gap-2 flex-wrap">
                    {expenseCategories.map(cat => {
                      const Icon = iconMap[cat.icon] || MoreHorizontal;
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)}
                          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${isSelected ? 'bg-primary text-white' : 'glass-light text-white/80'}`}>
                          <Icon className="w-4 h-4" strokeWidth={1.5} />{cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-white/60 text-sm mb-2">Description</p>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What was it?" className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none" />
              </div>

              {/* Date + Recurring */}
              <div className="flex items-center gap-3">
                <button onClick={() => handleDateSelect('today')}
                  className={`px-4 py-2 rounded-full text-sm ${isToday ? 'bg-primary text-white' : 'glass-light text-white/80'}`}>Today</button>
                <button onClick={() => handleDateSelect('yesterday')}
                  className={`px-4 py-2 rounded-full text-sm ${isYesterday ? 'bg-primary text-white' : 'glass-light text-white/80'}`}>Yesterday</button>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <button className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 ${!isToday && !isYesterday ? 'bg-primary text-white' : 'glass-light text-white/80'}`}>
                      <CalendarDays className="w-4 h-4" />{!isToday && !isYesterday && format(selectedDate, 'MMM d')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-transparent border-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={date => { if (date) { setSelectedDate(date); setShowCalendar(false); } }}
                      className={cn("p-3 pointer-events-auto glass rounded-2xl")} />
                  </PopoverContent>
                </Popover>
                <button onClick={() => setIsRecurring(!isRecurring)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${isRecurring ? 'bg-primary text-white' : 'glass-light text-white/80'}`}>
                  <RotateCcw className="w-4 h-4" />Recurring
                </button>
              </div>

              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={!isValid}
                className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold disabled:opacity-50">
                {type === 'expense' ? `Add expense${selectedCatName ? ` to ${selectedCatName}` : ''}` : 'Add income'}
              </motion.button>
            </div>
          ) : (
            /* ═══ MOBILE: Two-step flow ═══ */
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 ? (
                <motion.div key="step1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="p-5 space-y-5">
                    {/* Close */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-sm">Step 1 of 2</span>
                      <button onClick={onClose} className="p-2 -mr-2"><X className="w-5 h-5 text-white/60" /></button>
                    </div>

                    {/* Type toggle */}
                    <div className="flex justify-center">
                      <div className="rounded-full p-1 flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {(['expense', 'income', 'goal'] as const).map(t => (
                          <button key={t} onClick={() => setType(t)}
                            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                            style={{
                              background: type === t ? 'rgba(255,255,255,0.12)' : 'transparent',
                              color: type === t ? 'white' : 'rgba(255,255,255,0.4)',
                            }}>
                            {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Goal'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Big amount */}
                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        €{amountValue || '0'}
                      </p>
                    </div>

                    {/* Compact numpad */}
                    <div className="px-12">
                      <div className="grid grid-cols-3 gap-2">
                        {numKeys.flat().map(key => (
                          <motion.button key={key} type="button" whileTap={{ scale: 0.93 }}
                            onClick={() => handleKeyPress(key)}
                            className="h-12 rounded-xl flex items-center justify-center text-white text-lg font-medium"
                            style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {key === 'backspace' ? <Delete className="w-5 h-5 text-white/60" strokeWidth={1.5} /> : key}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Next button */}
                    <motion.button whileTap={{ scale: 0.98 }}
                      onClick={() => { if (amount > 0) setStep(2); }}
                      disabled={amount <= 0}
                      className="w-full py-3.5 rounded-2xl text-white font-semibold disabled:opacity-30"
                      style={{ background: amount > 0 ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.06)' }}>
                      Next →
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="p-5 space-y-4">
                    {/* Header with back + amount summary */}
                    <div className="flex items-center justify-between">
                      <button onClick={() => setStep(1)} className="flex items-center gap-1 text-white/40 text-sm">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <span className="text-white font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        €{amountValue} {type}
                      </span>
                      <button onClick={onClose} className="p-2 -mr-2"><X className="w-5 h-5 text-white/60" /></button>
                    </div>

                    {/* Category (expense only) — 2x2 grid */}
                    {type === 'expense' && (
                      <div>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">What category?</p>
                        <div className="grid grid-cols-2 gap-2">
                          {expenseCategories.map(cat => {
                            const Icon = iconMap[cat.icon] || MoreHorizontal;
                            const isSelected = selectedCategoryId === cat.id;
                            const color = getCatTint(cat.icon);
                            return (
                              <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)}
                                className="flex items-center gap-2 rounded-xl transition-all"
                                style={{
                                  padding: '12px 14px', textAlign: 'left',
                                  background: isSelected ? `${color}20` : 'rgba(255,255,255,0.03)',
                                  border: isSelected ? `1.5px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                                }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                                  <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
                                </div>
                                <span className="text-sm text-white/80 font-medium">{cat.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">What was it?</p>
                      <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Description (optional)" autoFocus
                        className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }} />
                      {suggestions.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {suggestions.map(s => (
                            <button key={s} onClick={() => setDescription(s)} className="px-3 py-1 rounded-full glass-light text-white/70 text-sm">{s}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date + Recurring row */}
                    <div>
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">When?</p>
                      <div className="flex gap-2 flex-wrap items-center">
                        <button onClick={() => handleDateSelect('today')}
                          className={`px-3 py-1.5 rounded-full text-sm ${isToday ? 'bg-primary text-white' : 'glass-light text-white/70'}`}>Today</button>
                        <button onClick={() => handleDateSelect('yesterday')}
                          className={`px-3 py-1.5 rounded-full text-sm ${isYesterday ? 'bg-primary text-white' : 'glass-light text-white/70'}`}>Yesterday</button>
                        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                          <PopoverTrigger asChild>
                            <button className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${!isToday && !isYesterday ? 'bg-primary text-white' : 'glass-light text-white/70'}`}>
                              <CalendarDays className="w-3.5 h-3.5" />{!isToday && !isYesterday && format(selectedDate, 'MMM d')}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-transparent border-0" align="start">
                            <Calendar mode="single" selected={selectedDate}
                              onSelect={date => { if (date) { setSelectedDate(date); setShowCalendar(false); } }}
                              className={cn("p-3 pointer-events-auto glass rounded-2xl")} />
                          </PopoverContent>
                        </Popover>
                        <button onClick={() => setIsRecurring(!isRecurring)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${isRecurring ? 'bg-primary text-white' : 'glass-light text-white/70'}`}>
                          <RotateCcw className="w-3.5 h-3.5" />Recurring
                        </button>
                      </div>
                      {isRecurring && (
                        <div className="flex gap-2 mt-2">
                          {(['weekly', 'biweekly', 'monthly'] as const).map(freq => (
                            <button key={freq} onClick={() => setRecurringFrequency(freq)}
                              className={`px-3 py-1.5 rounded-full text-sm ${recurringFrequency === freq ? 'bg-white/20 text-white' : 'glass-light text-white/60'}`}>
                              {freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add button */}
                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={!isValid}
                      className="w-full py-4 rounded-2xl text-white font-semibold disabled:opacity-50"
                      style={{ background: isValid ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(255,255,255,0.06)' }}>
                      {type === 'expense'
                        ? `Add €${amountValue}${selectedCatName ? ` to ${selectedCatName}` : ''}`
                        : `Add €${amountValue} income`}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
