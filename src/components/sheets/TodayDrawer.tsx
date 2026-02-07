import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Home, Smartphone, Music, UtensilsCrossed, Coffee, Bus, Wallet, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import johnnyImage from '@/assets/johnny.png';

const upcomingBills = [
  { icon: Home, name: 'Rent', amount: 450, date: 'Feb 28' },
  { icon: Smartphone, name: 'Phone Plan', amount: 25, date: 'Mar 1' },
  { icon: Music, name: 'Spotify', amount: 10, date: 'Mar 3' },
];

const recentTransactions = [
  { icon: UtensilsCrossed, name: 'Uber Eats', date: 'Today', amount: -12.50 },
  { icon: Coffee, name: 'Coffee Shop', date: 'Today', amount: -3.80 },
  { icon: Bus, name: 'Bus Pass', date: 'Yesterday', amount: -35.00 },
  { icon: Wallet, name: 'Salary', date: 'Feb 1', amount: 2400.00 },
  { icon: Home, name: 'Rent', date: 'Feb 1', amount: -450.00 },
];

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
            className="fixed top-0 left-0 right-0 z-50 glass-dark rounded-b-3xl max-h-[80vh] overflow-auto"
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

              {/* Coming Up */}
              <div className="mb-4">
                <h3 className="text-white/60 text-sm font-medium mb-3">Coming Up</h3>
                <div className="space-y-2">
                  {upcomingBills.map((bill, index) => {
                    const Icon = bill.icon;
                    return (
                      <div key={index} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl glass-light flex items-center justify-center">
                          <Icon size={16} strokeWidth={1.5} className="text-white" />
                        </div>
                        <span className="flex-1 text-white text-sm">{bill.name}</span>
                        <span className="text-white font-medium text-sm">€{bill.amount}</span>
                        <span className="text-white/50 text-xs">{bill.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="mb-4">
                <h3 className="text-white/60 text-sm font-medium mb-3">Recent Transactions</h3>
                <div className="space-y-2">
                  {recentTransactions.map((tx, index) => {
                    const Icon = tx.icon;
                    const isPositive = tx.amount > 0;
                    return (
                      <div key={index} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl glass-light flex items-center justify-center">
                          <Icon size={16} strokeWidth={1.5} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="text-white text-sm block">{tx.name}</span>
                          <span className="text-white/50 text-xs">{tx.date}</span>
                        </div>
                        <span className={`font-medium text-sm ${isPositive ? 'text-jfb-green' : 'text-white'}`}>
                          {isPositive ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
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
