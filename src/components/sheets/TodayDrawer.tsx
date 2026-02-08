import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Home, Smartphone, Music, UtensilsCrossed, Coffee, Bus, Wallet, CheckCircle, ArrowRight, LucideIcon } from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';

// Transaction with date grouping
interface TimelineTransaction {
  icon: LucideIcon;
  name: string;
  amount: number;
  dateGroup: string;
}

// Upcoming bill
interface UpcomingBill {
  icon: LucideIcon;
  name: string;
  amount: number;
  daysUntil: number;
  isUrgent: boolean;
}

// Group transactions by date
const transactionsByDate: { dateGroup: string; transactions: TimelineTransaction[] }[] = [
  {
    dateGroup: 'Today',
    transactions: [
      { icon: UtensilsCrossed, name: 'Uber Eats', amount: -12.50, dateGroup: 'Today' },
      { icon: Coffee, name: 'Coffee Shop', amount: -3.80, dateGroup: 'Today' },
    ],
  },
  {
    dateGroup: 'Yesterday',
    transactions: [
      { icon: Bus, name: 'Bus Pass', amount: -35.00, dateGroup: 'Yesterday' },
    ],
  },
  {
    dateGroup: 'Feb 1',
    transactions: [
      { icon: Wallet, name: 'Salary', amount: 2400.00, dateGroup: 'Feb 1' },
      { icon: Home, name: 'Rent', amount: -450.00, dateGroup: 'Feb 1' },
    ],
  },
];

const upcomingBills: UpcomingBill[] = [
  { icon: Home, name: 'Rent', amount: 450, daysUntil: 20, isUrgent: false },
  { icon: Smartphone, name: 'Phone Plan', amount: 25, daysUntil: 21, isUrgent: false },
  { icon: Music, name: 'Spotify', amount: 10, daysUntil: 23, isUrgent: false },
];

const johnnyTips = [
  "You're spending less on food this week. Keep it up!",
  "Emergency fund is 40% there. Closer than you think!",
  "At this pace, vacation goal done by December.",
];

// Helper to get daily total
const getDayTotal = (transactions: TimelineTransaction[]): number => {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
};

// Helper to format daily total
const formatDayTotal = (total: number): { text: string; isPositive: boolean } => {
  const absTotal = Math.abs(total);
  if (total >= 0) {
    return { text: `€${absTotal.toLocaleString()} received`, isPositive: true };
  }
  return { text: `€${absTotal.toFixed(2)} spent`, isPositive: false };
};

// Total upcoming
const totalUpcoming = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);

interface TodayDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function TodayDrawer({ open, onClose }: TodayDrawerProps) {
  const [currentTip, setCurrentTip] = useState(0);

  // Cycle through tips
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % johnnyTips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [open]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50) {
      onClose();
    }
  };

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

              {/* Unified Timeline Card */}
              <div className="glass rounded-3xl overflow-hidden mb-4">
                {/* Past Transactions by Date Group */}
                {transactionsByDate.map((group, groupIndex) => {
                  const dayTotal = getDayTotal(group.transactions);
                  const { text: totalText, isPositive } = formatDayTotal(dayTotal);
                  
                  return (
                    <div key={group.dateGroup}>
                      {/* Date Group Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          <span className="text-xs text-white/50">{group.dateGroup}</span>
                        </div>
                        <span className={`text-xs ${isPositive ? 'text-jfb-green' : 'text-white/70'}`}>
                          {totalText}
                        </span>
                      </div>
                      
                      {/* Transactions */}
                      <div className="px-4">
                        {group.transactions.map((tx, txIndex) => {
                          const Icon = tx.icon;
                          const isIncome = tx.amount > 0;
                          
                          return (
                            <div key={`${group.dateGroup}-${txIndex}`}>
                              <div className="flex items-center gap-3 py-3">
                                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                  <Icon size={18} strokeWidth={1.5} className={isIncome ? 'text-jfb-green' : 'text-white'} />
                                </div>
                                <span className="flex-1 text-sm text-white">{tx.name}</span>
                                <span className={`text-sm font-medium ${isIncome ? 'text-jfb-green' : 'text-white'}`}>
                                  {isIncome ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                                </span>
                              </div>
                              {txIndex < group.transactions.length - 1 && (
                                <div className="h-px bg-white/[0.08]" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Upcoming Separator */}
                <div className="relative py-4 px-4">
                  <div className="absolute inset-x-4 top-1/2 h-px bg-white/20" />
                  <div className="relative flex justify-center">
                    <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] text-white/40 uppercase tracking-wider">
                      Upcoming
                    </span>
                  </div>
                </div>

                {/* Upcoming Bills */}
                <div className="px-4">
                  {upcomingBills.map((bill, index) => {
                    const Icon = bill.icon;
                    
                    return (
                      <div key={index}>
                        <div className="flex items-center gap-3 py-3">
                          <div className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center ${
                            bill.isUrgent ? 'border-amber-500' : 'border-white/15'
                          }`}>
                            <Icon size={18} strokeWidth={1.5} className="text-white/70" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-white block">{bill.name}</span>
                            <span className={`text-xs ${bill.isUrgent ? 'text-amber-500' : 'text-white/40'}`}>
                              in {bill.daysUntil} days
                            </span>
                          </div>
                          <span className="text-sm text-white/60">€{bill.amount}</span>
                        </div>
                        {index < upcomingBills.length - 1 && (
                          <div className="h-px bg-white/[0.08]" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total Upcoming Row */}
                <div className="px-4 py-3 border-t border-white/10">
                  <p className="text-xs text-white/50 text-right">€{totalUpcoming} due this month</p>
                </div>
              </div>

              {/* See All Link */}
              <button className="w-full flex items-center justify-center gap-1.5 py-2 mb-4">
                <span className="text-[13px] text-jfb-purple/80">View all transactions</span>
                <ArrowRight size={14} strokeWidth={1.5} className="text-jfb-purple/80" />
              </button>

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
