import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Home, Smartphone, Music, UtensilsCrossed, Coffee, Bus, Wallet, CheckCircle, Clock, 
  ShoppingCart, LucideIcon, Sparkles, X, Plus, AlertTriangle, AlertCircle, Scissors
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, ReferenceDot } from 'recharts';
import johnnyImage from '@/assets/johnny.png';
import { SimulationProvider, useSimulation, Simulation } from '@/context/SimulationContext';

// Day data interfaces
interface DayTransaction {
  icon: LucideIcon;
  name: string;
  amount: number;
}

interface DayBill {
  icon: LucideIcon;
  name: string;
  amount: number;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  transactions: DayTransaction[];
  upcomingBills: DayBill[];
  totalSpent: number;
  totalIncome: number;
  totalBillsDue: number;
}

interface SparklinePoint {
  day: number;
  amount: number;
  isToday: boolean;
}

// Generate mock data for 21 days
const generateDaysData = (): DayData[] => {
  const today = new Date();
  const days: DayData[] = [];
  
  // Generate 14 past days + today + 6 future days
  for (let i = -14; i <= 6; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const isToday = i === 0;
    const isPast = i < 0;
    const isFuture = i > 0;
    
    let transactions: DayTransaction[] = [];
    let upcomingBills: DayBill[] = [];
    let totalSpent = 0;
    let totalIncome = 0;
    let totalBillsDue = 0;
    
    // Mock data based on relative day
    if (isToday) {
      transactions = [
        { icon: UtensilsCrossed, name: 'Uber Eats', amount: -12.50 },
        { icon: Coffee, name: 'Coffee Shop', amount: -3.80 },
      ];
      totalSpent = 16.30;
    } else if (i === -1) {
      // Yesterday - no activity
    } else if (i === -2) {
      transactions = [
        { icon: Bus, name: 'Bus Pass', amount: -35.00 },
      ];
      totalSpent = 35.00;
    } else if (i === -3) {
      transactions = [
        { icon: ShoppingCart, name: 'Groceries', amount: -28.50 },
      ];
      totalSpent = 28.50;
    } else if (i === -4) {
      transactions = [
        { icon: Coffee, name: 'Coffee', amount: -4.50 },
        { icon: UtensilsCrossed, name: 'Snacks', amount: -4.40 },
      ];
      totalSpent = 8.90;
    } else if (i === -7) {
      // Feb 1 equivalent
      transactions = [
        { icon: Wallet, name: 'Salary', amount: 2400.00 },
        { icon: Home, name: 'Rent', amount: -450.00 },
      ];
      totalSpent = 450.00;
      totalIncome = 2400.00;
    } else if (isPast && i < -7) {
      // Random past spending
      const randomSpend = Math.random() * 45 + 5;
      if (Math.random() > 0.3) {
        transactions = [
          { icon: Coffee, name: 'Various', amount: -randomSpend },
        ];
        totalSpent = randomSpend;
      }
    }
    
    // Future days with bills - closer future
    if (i === 3) {
      upcomingBills = [{ icon: Music, name: 'Spotify', amount: 10 }];
      totalBillsDue = 10;
    } else if (i === 5) {
      upcomingBills = [{ icon: Smartphone, name: 'Phone', amount: 25 }];
      totalBillsDue = 25;
    }
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday,
      isPast,
      isFuture,
      transactions,
      upcomingBills,
      totalSpent,
      totalIncome,
      totalBillsDue,
    });
  }
  
  return days;
};

// Generate sparkline data (past 14 days)
const generateSparklineData = (days: DayData[]): SparklinePoint[] => {
  return days
    .filter(d => d.isPast || d.isToday)
    .slice(-14)
    .map((day, index) => ({
      day: index,
      amount: day.totalSpent || 0,
      isToday: day.isToday,
    }));
};

// Calculate dot size based on spending
const getDotSize = (amount: number): number => {
  const maxSpend = 50;
  const normalized = Math.min(Math.abs(amount) / maxSpend, 1);
  return 4 + (normalized * 6);
};

const johnnyTips = [
  "You're spending less on food this week. Keep it up!",
  "Emergency fund is 40% there. Closer than you think!",
  "At this pace, vacation goal done by December.",
];

// Quick amount pills
const QUICK_AMOUNTS = [20, 50, 100, 200];

interface TodayDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Main content component that uses simulation context
function TodayDrawerContent({ open, onClose }: TodayDrawerProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [days] = useState<DayData[]>(() => generateDaysData());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    return days.findIndex(d => d.isToday);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Simulation UI state
  const [isAllowanceExpanded, setIsAllowanceExpanded] = useState(false);
  const [quickSpendAmount, setQuickSpendAmount] = useState('');
  const [hypotheticalForm, setHypotheticalForm] = useState<{
    dayIndex: number;
    amount: string;
    description: string;
  } | null>(null);
  const [showSimulationDropdown, setShowSimulationDropdown] = useState(false);
  
  // Simulation context
  const {
    activeSimulations,
    isSimulating,
    addSimulation,
    removeSimulation,
    clearAllSimulations,
    flexRemaining,
    dailyAllowance,
    daysRemaining,
    simulatedFlexRemaining,
    simulatedDailyAllowance,
    getSimulatedDaySpending,
    getDayHasSimulation,
    getDaySimulations,
    isBillSkipped,
  } = useSimulation();
  
  const sparklineData = generateSparklineData(days);
  const avgSpending = Math.round(sparklineData.reduce((sum, p) => sum + p.amount, 0) / sparklineData.length);
  
  // Calculate next 7 days due (considering skipped bills)
  const todayIndex = days.findIndex(d => d.isToday);
  const next7DaysDue = days
    .slice(todayIndex, todayIndex + 8)
    .reduce((sum, d, idx) => {
      const actualDayIndex = todayIndex + idx;
      const skippedAmount = d.upcomingBills
        .filter(bill => isBillSkipped(bill.name, actualDayIndex))
        .reduce((s, b) => s + b.amount, 0);
      return sum + d.totalBillsDue - skippedAmount;
    }, 0);

  // Cycle through tips
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % johnnyTips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [open]);

  // Scroll to today when drawer opens
  useEffect(() => {
    if (open && scrollRef.current) {
      const todayIdx = days.findIndex(d => d.isToday);
      const scrollPosition = (todayIdx * 44) - (scrollRef.current.offsetWidth / 2) + 22;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }, 100);
    }
  }, [open, days]);

  // Auto-focus input when allowance card expands
  useEffect(() => {
    if (isAllowanceExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAllowanceExpanded]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50) {
      onClose();
    }
  };

  const handleDayTap = (index: number) => {
    setSelectedDayIndex(index);
    setHypotheticalForm(null); // Close form when selecting new day
  };

  const scrollToNext7Days = () => {
    if (scrollRef.current) {
      const scrollPosition = ((todayIndex + 4) * 44) - (scrollRef.current.offsetWidth / 2) + 22;
      scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  };

  // Calculate simulation result for quick spend
  const getQuickSpendResult = (amount: number) => {
    if (amount <= 0) return null;
    
    const newFlexRemaining = simulatedFlexRemaining - amount;
    const newDailyAllowance = newFlexRemaining / daysRemaining;
    
    if (amount <= simulatedDailyAllowance) {
      return {
        type: 'affordable' as const,
        icon: CheckCircle,
        iconColor: 'text-jfb-green',
        message: 'You can afford this',
        detail: `Daily budget stays at €${Math.round(newDailyAllowance)}/day for ${daysRemaining} days`,
        newDailyAllowance,
      };
    } else if (newFlexRemaining > 0) {
      return {
        type: 'tight' as const,
        icon: AlertTriangle,
        iconColor: 'text-jfb-amber',
        message: 'Tight but doable',
        detail: `Your daily budget drops from €${Math.round(simulatedDailyAllowance)} to €${Math.round(newDailyAllowance)}`,
        newDailyAllowance,
        oldAllowance: simulatedDailyAllowance,
      };
    } else {
      const overAmount = Math.abs(newFlexRemaining);
      return {
        type: 'over' as const,
        icon: AlertCircle,
        iconColor: 'text-jfb-amber',
        message: 'This would put you over budget',
        detail: `You'd be €${Math.round(overAmount)} over for the month`,
        overAmount,
        suggestion: 'Consider: wait for next income',
      };
    }
  };

  const handleSkipBill = (bill: DayBill, dayIndex: number) => {
    addSimulation({
      type: 'cancel-bill',
      amount: bill.amount,
      date: days[dayIndex].date.toISOString(),
      description: `Skip ${bill.name}`,
      targetDayIndex: dayIndex,
    });
  };

  const handleAddHypothetical = () => {
    if (!hypotheticalForm || !hypotheticalForm.amount) return;
    
    const amount = parseFloat(hypotheticalForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    
    addSimulation({
      type: 'spend',
      amount,
      date: days[hypotheticalForm.dayIndex].date.toISOString(),
      description: hypotheticalForm.description || 'Expense',
      targetDayIndex: hypotheticalForm.dayIndex,
    });
    
    setHypotheticalForm(null);
  };

  const selectedDay = days[selectedDayIndex];
  const quickSpendAmountNum = parseFloat(quickSpendAmount) || 0;
  const quickSpendResult = getQuickSpendResult(quickSpendAmountNum);

  // Get simulation summary text
  const getSimulationSummary = () => {
    if (activeSimulations.length === 0) return '';
    if (activeSimulations.length === 1) {
      const sim = activeSimulations[0];
      if (sim.type === 'cancel-bill') {
        return `skip ${sim.description.replace('Skip ', '')} (-€${sim.amount})`;
      }
      const day = days[sim.targetDayIndex];
      return `€${sim.amount} on ${day?.dayName || 'future'}`;
    }
    return `${activeSimulations.length} changes`;
  };

  // Week ahead forecast data
  const forecastDays = days.slice(todayIndex, todayIndex + 7);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      {/* Drawer from top */}
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
        {/* Safe area for notch */}
        <div className="h-[env(safe-area-inset-top)]" />

        <div className="px-5 pt-8 pb-6">
          {/* Month Pulse Card */}
          <div className="glass rounded-3xl p-5 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/60 text-xs">Available this month</p>
                <p className="text-3xl font-bold text-white mt-1">€1,340</p>
              </div>
              <div className="flex items-center gap-1.5 bg-jfb-green/20 rounded-full px-2.5 py-1">
                <CheckCircle size={14} strokeWidth={1.5} className="text-jfb-green" />
                <span className="text-jfb-green text-xs font-medium">On track</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
            <p className="text-white/50 text-xs mt-2">65% spent — 77% of month passed</p>
          </div>

          {/* Simulation Banner */}
          <AnimatePresence>
            {isSimulating && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-light rounded-2xl px-4 py-2.5 flex items-center justify-between">
                  <button 
                    className="flex items-center gap-2 flex-1"
                    onClick={() => setShowSimulationDropdown(!showSimulationDropdown)}
                  >
                    <Sparkles size={16} className="text-white" />
                    <span className="text-[13px] text-white">
                      Simulating: {getSimulationSummary()}
                    </span>
                  </button>
                  <button onClick={clearAllSimulations} className="p-1">
                    <X size={16} className="text-white/60" />
                  </button>
                </div>
                
                {/* Dropdown for multiple simulations */}
                <AnimatePresence>
                  {showSimulationDropdown && activeSimulations.length > 1 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="glass-light rounded-2xl mt-2 p-3 space-y-2">
                        {activeSimulations.map((sim) => (
                          <div key={sim.id} className="flex items-center justify-between">
                            <span className="text-xs text-white/70">
                              {sim.type === 'cancel-bill' ? (
                                <span className="text-jfb-green">+€{sim.amount}</span>
                              ) : (
                                <span className="text-jfb-amber">-€{sim.amount}</span>
                              )}{' '}
                              {sim.description}
                            </span>
                            <button onClick={() => removeSimulation(sim.id)}>
                              <X size={14} className="text-white/40" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daily Allowance Card - Interactive */}
          <motion.div 
            className="glass rounded-3xl p-5 mb-4 cursor-pointer"
            onClick={() => !isAllowanceExpanded && setIsAllowanceExpanded(true)}
            layout
          >
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">
                €{Math.round(isSimulating ? simulatedDailyAllowance : dailyAllowance)}
                <span className="text-lg font-normal"> / day</span>
              </p>
              {isSimulating && (
                <Sparkles size={16} className="text-white/60 simulation-dot" />
              )}
            </div>
            <p className="text-white/60 text-sm mt-1">
              remaining for the next {daysRemaining} days
            </p>

            {/* Expanded simulator */}
            <AnimatePresence>
              {isAllowanceExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pt-4 border-t border-white/10 mt-4">
                    {/* Amount input */}
                    <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-3">
                      <span className="text-white/60 text-xl">€</span>
                      <input
                        ref={inputRef}
                        type="number"
                        inputMode="decimal"
                        placeholder="How much would you spend?"
                        value={quickSpendAmount}
                        onChange={(e) => setQuickSpendAmount(e.target.value)}
                        className="flex-1 bg-transparent text-white text-xl placeholder:text-white/40 outline-none"
                      />
                    </div>

                    {/* Quick amount pills */}
                    <div className="flex gap-2 mt-3">
                      {QUICK_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          className="glass-light rounded-full px-3 py-1.5 text-[13px] text-white"
                          onClick={() => setQuickSpendAmount(amount.toString())}
                        >
                          €{amount}
                        </button>
                      ))}
                    </div>

                    {/* Result display */}
                    {quickSpendResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <quickSpendResult.icon 
                            size={18} 
                            className={quickSpendResult.iconColor} 
                          />
                          <span className={`text-sm font-medium ${
                            quickSpendResult.type === 'affordable' ? 'text-jfb-green' : 'text-jfb-amber'
                          }`}>
                            {quickSpendResult.message}
                          </span>
                        </div>
                        <p className="text-xs text-white/60">{quickSpendResult.detail}</p>
                        
                        {/* Before/after comparison for tight scenario */}
                        {quickSpendResult.type === 'tight' && (
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-white/40 line-through">
                              Now: €{Math.round(quickSpendResult.oldAllowance!)}/day
                            </span>
                            <span className="text-xs text-jfb-amber">
                              After: €{Math.round(quickSpendResult.newDailyAllowance)}/day
                            </span>
                          </div>
                        )}
                        
                        {/* Suggestion for over budget */}
                        {quickSpendResult.type === 'over' && quickSpendResult.suggestion && (
                          <p className="text-xs text-white/40">{quickSpendResult.suggestion}</p>
                        )}
                      </motion.div>
                    )}

                    {/* Cancel button */}
                    <button
                      className="mt-4 text-white/60 text-sm"
                      onClick={() => {
                        setIsAllowanceExpanded(false);
                        setQuickSpendAmount('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Mini Calendar Strip Card */}
          <div className="glass rounded-3xl overflow-hidden mb-3">
            {/* Calendar Strip */}
            <div 
              ref={scrollRef}
              className="flex overflow-x-auto scrollbar-hide py-3 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {days.map((day, index) => {
                const isSelected = index === selectedDayIndex;
                const hasSpending = day.totalSpent > 0;
                const hasIncome = day.totalIncome > 0;
                const hasBill = day.totalBillsDue > 0;
                const hasSimulation = getDayHasSimulation(index);
                const simSpending = getSimulatedDaySpending(index);
                const daySimulations = getDaySimulations(index);
                
                // Check if bills on this day are skipped
                const allBillsSkipped = day.upcomingBills.every(bill => isBillSkipped(bill.name, index));
                const skippedAmount = day.upcomingBills
                  .filter(bill => isBillSkipped(bill.name, index))
                  .reduce((sum, bill) => sum + bill.amount, 0);
                
                const totalAmount = day.totalSpent + simSpending;
                const dotSize = hasSpending || simSpending > 0 ? getDotSize(totalAmount) : 0;
                
                return (
                  <motion.button
                    key={index}
                    className={`flex-shrink-0 w-11 flex flex-col items-center justify-center rounded-xl mx-0.5 py-2 ${
                      day.isToday 
                        ? 'bg-white/15 border border-white/20' 
                        : isSelected 
                          ? 'bg-white/10' 
                          : ''
                    }`}
                    onClick={() => handleDayTap(index)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Day name */}
                    <span className={`text-[10px] ${day.isPast ? 'text-white/30' : 'text-white/40'}`}>
                      {day.dayName}
                    </span>
                    
                    {/* Day number */}
                    <span className={`text-base font-bold ${
                      day.isToday 
                        ? 'text-white' 
                        : day.isPast 
                          ? 'text-white/30' 
                          : 'text-white/50'
                    }`}>
                      {day.dayNumber}
                    </span>
                    
                    {/* Activity indicator */}
                    <div className="h-3 flex items-center justify-center">
                      {hasIncome && (
                        <div className="w-1.5 h-1.5 rounded-full bg-jfb-green" />
                      )}
                      {(hasSpending || simSpending > 0) && !hasIncome && (
                        <div 
                          className={`rounded-full gradient-primary ${hasSimulation ? 'simulation-dot' : ''}`}
                          style={{ width: dotSize, height: dotSize }}
                        />
                      )}
                      {hasBill && !hasSpending && simSpending === 0 && !hasIncome && (
                        allBillsSkipped ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-jfb-green" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full border border-white/30" />
                        )
                      )}
                      {/* Simulated spend on future day with no bills */}
                      {day.isFuture && simSpending > 0 && !hasBill && (
                        <div 
                          className="rounded-full gradient-primary simulation-dot"
                          style={{ width: getDotSize(simSpending), height: getDotSize(simSpending) }}
                        />
                      )}
                    </div>
                    
                    {/* Amount labels */}
                    {day.isToday && hasSpending && (
                      <span className="text-[10px] text-white/50 -mt-0.5">
                        €{Math.round(day.totalSpent)}
                      </span>
                    )}
                    {day.isFuture && hasBill && !allBillsSkipped && (
                      <span className="text-[10px] text-white/30 -mt-0.5">
                        €{day.totalBillsDue - skippedAmount}
                      </span>
                    )}
                    {/* Skipped bill indicator */}
                    {skippedAmount > 0 && (
                      <span className="text-[9px] text-jfb-green -mt-0.5">
                        +€{skippedAmount}
                      </span>
                    )}
                    {/* Simulated spend indicator */}
                    {simSpending > 0 && daySimulations.some(s => s.type === 'spend') && (
                      <span className="text-[9px] text-jfb-purple -mt-0.5">
                        €{simSpending}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Expanded Day Detail */}
            <AnimatePresence mode="wait">
              {selectedDay && (
                <motion.div
                  key={selectedDayIndex}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden border-t border-white/10"
                >
                  <div className="px-4 py-3">
                    {/* For past/today - show transactions */}
                    {(selectedDay.isPast || selectedDay.isToday) && selectedDay.transactions.length > 0 && (
                      <>
                        <p className="text-xs text-white/50 mb-2">
                          Spent €{selectedDay.totalSpent.toFixed(2)}
                          {selectedDay.totalIncome > 0 && (
                            <span className="text-jfb-green"> · +€{selectedDay.totalIncome.toLocaleString()} received</span>
                          )}
                        </p>
                        <div className="space-y-2">
                          {selectedDay.transactions.slice(0, 4).map((tx, i) => {
                            const Icon = tx.icon;
                            const isIncome = tx.amount > 0;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <Icon 
                                  size={16} 
                                  strokeWidth={1.5} 
                                  className={isIncome ? 'text-jfb-green' : 'text-white/60'} 
                                />
                                <span className="flex-1 text-[13px] text-white">{tx.name}</span>
                                <span className={`text-[13px] ${isIncome ? 'text-jfb-green' : 'text-white'}`}>
                                  {isIncome ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                          {selectedDay.transactions.length > 4 && (
                            <p className="text-xs text-white/40">
                              and {selectedDay.transactions.length - 4} more
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* For future - show upcoming bills with skip option */}
                    {selectedDay.isFuture && selectedDay.upcomingBills.length > 0 && (
                      <>
                        <p className="text-xs text-white/50 mb-2">
                          €{selectedDay.totalBillsDue} due
                        </p>
                        <div className="space-y-3">
                          {selectedDay.upcomingBills.map((bill, i) => {
                            const Icon = bill.icon;
                            const isSkipped = isBillSkipped(bill.name, selectedDayIndex);
                            
                            return (
                              <div key={i}>
                                <div className={`flex items-center gap-2 ${isSkipped ? 'opacity-50' : ''}`}>
                                  <Icon size={16} strokeWidth={1.5} className="text-white/40" />
                                  <div className="flex-1">
                                    <span className={`text-[13px] text-white/60 block ${isSkipped ? 'line-through' : ''}`}>
                                      {bill.name}
                                    </span>
                                    <span className="text-[10px] text-white/30">due</span>
                                  </div>
                                  <span className={`text-[13px] ${isSkipped ? 'text-jfb-green' : 'text-white/40'}`}>
                                    {isSkipped ? '+' : ''}€{bill.amount}
                                  </span>
                                </div>
                                {/* Skip bill option */}
                                {!isSkipped && (
                                  <button
                                    className="flex items-center gap-1.5 mt-1.5 ml-6"
                                    onClick={() => handleSkipBill(bill, selectedDayIndex)}
                                  >
                                    <Scissors size={12} className="text-white/40" />
                                    <span className="text-xs text-white/40">What if I skip this?</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* No activity for past/today */}
                    {((selectedDay.isPast || selectedDay.isToday) && selectedDay.transactions.length === 0) && (
                      <p className="text-xs text-white/30 text-center py-2">No activity</p>
                    )}
                    
                    {/* Future day with no bills - show hypothetical option */}
                    {selectedDay.isFuture && selectedDay.upcomingBills.length === 0 && !hypotheticalForm && (
                      <div className="space-y-2">
                        <p className="text-xs text-white/30 text-center py-2">No bills scheduled</p>
                        <button
                          className="flex items-center gap-1.5 mx-auto"
                          onClick={() => setHypotheticalForm({
                            dayIndex: selectedDayIndex,
                            amount: '',
                            description: '',
                          })}
                        >
                          <Plus size={14} className="text-white/40" />
                          <span className="text-xs text-white/40">What if I spend...</span>
                        </button>
                      </div>
                    )}

                    {/* Add hypothetical option for future days with bills too */}
                    {selectedDay.isFuture && selectedDay.upcomingBills.length > 0 && !hypotheticalForm && (
                      <button
                        className="flex items-center gap-1.5 mt-3"
                        onClick={() => setHypotheticalForm({
                          dayIndex: selectedDayIndex,
                          amount: '',
                          description: '',
                        })}
                      >
                        <Plus size={14} className="text-white/40" />
                        <span className="text-xs text-white/40">What if I spend...</span>
                      </button>
                    )}

                    {/* Hypothetical expense form */}
                    {hypotheticalForm && hypotheticalForm.dayIndex === selectedDayIndex && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 space-y-3"
                      >
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1 bg-white/15 rounded-lg px-2 py-1.5 w-24">
                            <span className="text-white/60 text-sm">€</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={hypotheticalForm.amount}
                              onChange={(e) => setHypotheticalForm({
                                ...hypotheticalForm,
                                amount: e.target.value,
                              })}
                              className="w-full bg-transparent text-white text-sm outline-none"
                              autoFocus
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="What for?"
                            value={hypotheticalForm.description}
                            onChange={(e) => setHypotheticalForm({
                              ...hypotheticalForm,
                              description: e.target.value,
                            })}
                            className="flex-1 bg-white/15 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/40 outline-none"
                          />
                        </div>
                        
                        {/* Quick amounts */}
                        <div className="flex gap-2">
                          {QUICK_AMOUNTS.map((amount) => (
                            <button
                              key={amount}
                              className="glass-light rounded-full px-2.5 py-1 text-[11px] text-white"
                              onClick={() => setHypotheticalForm({
                                ...hypotheticalForm,
                                amount: amount.toString(),
                              })}
                            >
                              €{amount}
                            </button>
                          ))}
                        </div>
                        
                        {/* Simulate button */}
                        <button
                          className="gradient-primary rounded-full px-4 py-2 text-white text-sm font-medium w-full"
                          onClick={handleAddHypothetical}
                        >
                          Simulate
                        </button>
                      </motion.div>
                    )}

                    {/* Show simulations on this day */}
                    {getDaySimulations(selectedDayIndex).filter(s => s.type === 'spend').length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-white/50 mb-2 flex items-center gap-1">
                          <Sparkles size={12} />
                          Simulated expenses
                        </p>
                        {getDaySimulations(selectedDayIndex)
                          .filter(s => s.type === 'spend')
                          .map((sim) => (
                            <div key={sim.id} className="flex items-center justify-between">
                              <span className="text-xs text-white/60">{sim.description}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-jfb-purple">€{sim.amount}</span>
                                <button onClick={() => removeSimulation(sim.id)}>
                                  <X size={12} className="text-white/40" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Week-Ahead Forecast Bar */}
          <div className="glass rounded-2xl p-3 mb-3">
            <div className="flex gap-0.5 h-8">
              {forecastDays.map((day, idx) => {
                const dayIndex = todayIndex + idx;
                const billAmount = day.upcomingBills
                  .filter(bill => !isBillSkipped(bill.name, dayIndex))
                  .reduce((sum, bill) => sum + bill.amount, 0);
                const simSpend = getSimulatedDaySpending(dayIndex);
                
                const maxHeight = 32;
                const billHeight = Math.min((billAmount / 100) * maxHeight, maxHeight);
                const avgHeight = Math.min((avgSpending / 100) * maxHeight, maxHeight * 0.5);
                const simHeight = Math.min((simSpend / 100) * maxHeight, maxHeight);
                
                const totalHeight = billHeight + avgHeight + simHeight;
                const isOverflow = totalHeight > maxHeight;
                
                return (
                  <div 
                    key={idx} 
                    className="flex-1 flex flex-col items-center"
                  >
                    <div 
                      className={`w-full rounded-sm relative overflow-hidden ${
                        isOverflow ? 'bg-jfb-amber/30' : 'bg-white/10'
                      }`}
                      style={{ height: maxHeight }}
                    >
                      {/* Bills layer */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-jfb-amber/40"
                        style={{ height: billHeight }}
                      />
                      {/* Average spending layer */}
                      <div 
                        className="absolute left-0 right-0 bg-jfb-purple/30"
                        style={{ 
                          height: avgHeight,
                          bottom: billHeight,
                        }}
                      />
                      {/* Simulated spending layer */}
                      {simSpend > 0 && (
                        <div 
                          className="absolute left-0 right-0 border-2 border-dashed border-jfb-purple/60 simulation-indicator"
                          style={{ 
                            height: simHeight,
                            bottom: billHeight + avgHeight,
                          }}
                        />
                      )}
                      {/* Overflow indicator */}
                      {isOverflow && (
                        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-jfb-amber font-bold">
                          !
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Day labels */}
            <div className="flex gap-0.5 mt-1">
              {forecastDays.map((day, idx) => (
                <span key={idx} className="flex-1 text-center text-[9px] text-white/30">
                  {day.dayName.charAt(0)}
                </span>
              ))}
            </div>
          </div>

          {/* Upcoming Summary Bar */}
          <motion.button
            className="glass-light rounded-2xl px-4 py-3 mb-3 w-full flex items-center justify-between"
            onClick={scrollToNext7Days}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.5} className="text-white/60" />
              <span className="text-[13px] text-white/60">Next 7 days</span>
            </div>
            <span className="text-[13px] text-white font-medium">€{next7DaysDue} due</span>
          </motion.button>

          {/* Spending Sparkline Card */}
          <div className="glass rounded-2xl p-3 mb-4">
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(262, 80%, 66%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(342, 100%, 71%)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={1.5}
                    fill="url(#sparklineGradient)"
                    dot={false}
                  />
                  <ReferenceDot
                    x={sparklineData.length - 1}
                    y={sparklineData[sparklineData.length - 1]?.amount || 0}
                    r={4}
                    fill="white"
                    stroke="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-white/30">Past 2 weeks</span>
              <span className="text-[10px] text-white/30">avg €{avgSpending}/day</span>
            </div>
          </div>

          {/* Johnny's Tip */}
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

        {/* Drag handle */}
        <div className="flex justify-center pb-4">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>
      </motion.div>
    </>
  );
}

// Wrapper component that provides simulation context
export function TodayDrawer({ open, onClose }: TodayDrawerProps) {
  // Mock values for simulation calculations
  const flexRemaining = 1340;
  const dailyAllowance = 44;
  const daysRemaining = 7;

  return (
    <AnimatePresence>
      {open && (
        <SimulationProvider
          flexRemaining={flexRemaining}
          dailyAllowance={dailyAllowance}
          daysRemaining={daysRemaining}
        >
          <TodayDrawerContent open={open} onClose={onClose} />
        </SimulationProvider>
      )}
    </AnimatePresence>
  );
}
