import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Home, Smartphone, Music, UtensilsCrossed, Coffee, Bus, Wallet, CheckCircle, Clock, ShoppingCart, LucideIcon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, ReferenceDot } from 'recharts';
import johnnyImage from '@/assets/johnny.png';

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
    
    // Future days with bills
    if (i === 20) {
      upcomingBills = [{ icon: Home, name: 'Rent', amount: 450 }];
      totalBillsDue = 450;
    } else if (i === 21) {
      upcomingBills = [{ icon: Smartphone, name: 'Phone', amount: 25 }];
      totalBillsDue = 25;
    } else if (i === 23) {
      upcomingBills = [{ icon: Music, name: 'Spotify', amount: 10 }];
      totalBillsDue = 10;
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

interface TodayDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function TodayDrawer({ open, onClose }: TodayDrawerProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [days] = useState<DayData[]>(() => generateDaysData());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    return days.findIndex(d => d.isToday);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const sparklineData = generateSparklineData(days);
  const avgSpending = Math.round(sparklineData.reduce((sum, p) => sum + p.amount, 0) / sparklineData.length);
  
  // Calculate next 7 days due
  const todayIndex = days.findIndex(d => d.isToday);
  const next7DaysDue = days
    .slice(todayIndex, todayIndex + 8)
    .reduce((sum, d) => sum + d.totalBillsDue, 0);

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

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50) {
      onClose();
    }
  };

  const handleDayTap = (index: number) => {
    setSelectedDayIndex(index);
  };

  const scrollToNext7Days = () => {
    if (scrollRef.current) {
      const scrollPosition = ((todayIndex + 4) * 44) - (scrollRef.current.offsetWidth / 2) + 22;
      scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  };

  const selectedDay = days[selectedDayIndex];

  return (
    <AnimatePresence>
      {open && (
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

              {/* Daily Allowance */}
              <div className="glass rounded-3xl p-5 mb-4">
                <p className="text-2xl font-bold text-white">€44 <span className="text-lg font-normal">/ day</span></p>
                <p className="text-white/60 text-sm mt-1">remaining for the next 7 days</p>
              </div>

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
                    const dotSize = hasSpending ? getDotSize(day.totalSpent) : 0;
                    
                    return (
                      <motion.button
                        key={index}
                        className={`flex-shrink-0 w-11 h-16 flex flex-col items-center justify-center rounded-xl mx-0.5 ${
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
                          {hasSpending && !hasIncome && (
                            <div 
                              className="rounded-full gradient-primary"
                              style={{ width: dotSize, height: dotSize }}
                            />
                          )}
                          {hasBill && !hasSpending && !hasIncome && (
                            <div className="w-1.5 h-1.5 rounded-full border border-white/30" />
                          )}
                        </div>
                        
                        {/* Amount below dot for today or future bills */}
                        {day.isToday && hasSpending && (
                          <span className="text-[10px] text-white/50 -mt-0.5">
                            €{Math.round(day.totalSpent)}
                          </span>
                        )}
                        {day.isFuture && hasBill && (
                          <span className="text-[10px] text-white/30 -mt-0.5">
                            €{day.totalBillsDue}
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

                        {/* For future - show upcoming bills */}
                        {selectedDay.isFuture && selectedDay.upcomingBills.length > 0 && (
                          <>
                            <p className="text-xs text-white/50 mb-2">
                              €{selectedDay.totalBillsDue} due
                            </p>
                            <div className="space-y-2">
                              {selectedDay.upcomingBills.map((bill, i) => {
                                const Icon = bill.icon;
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    <Icon size={16} strokeWidth={1.5} className="text-white/40" />
                                    <div className="flex-1">
                                      <span className="text-[13px] text-white/60 block">{bill.name}</span>
                                      <span className="text-[10px] text-white/30">due</span>
                                    </div>
                                    <span className="text-[13px] text-white/40">€{bill.amount}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* No activity */}
                        {((selectedDay.isPast || selectedDay.isToday) && selectedDay.transactions.length === 0) && (
                          <p className="text-xs text-white/30 text-center py-2">No activity</p>
                        )}
                        {(selectedDay.isFuture && selectedDay.upcomingBills.length === 0) && (
                          <p className="text-xs text-white/30 text-center py-2">No bills scheduled</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
      )}
    </AnimatePresence>
  );
}
