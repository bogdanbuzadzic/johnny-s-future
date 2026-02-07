import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Laptop, Plane, Car, GraduationCap, Heart, Home, Target, Dumbbell, Gamepad2 } from 'lucide-react';
import { useApp, iconMap } from '@/context/AppContext';

const iconOptions = [
  { key: 'ShieldCheck', icon: ShieldCheck },
  { key: 'Car', icon: Car },
  { key: 'Plane', icon: Plane },
  { key: 'Laptop', icon: Laptop },
  { key: 'GraduationCap', icon: GraduationCap },
  { key: 'Heart', icon: Heart },
  { key: 'Home', icon: Home },
  { key: 'Target', icon: Target },
  { key: 'Dumbbell', icon: Dumbbell },
  { key: 'Gamepad2', icon: Gamepad2 },
];

interface AddGoalSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddGoalSheet({ open, onClose }: AddGoalSheetProps) {
  const { addGoal } = useApp();
  
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleCreate = () => {
    if (!name || !targetAmount || !targetDate) return;
    
    const target = parseFloat(targetAmount);
    const monthsUntilTarget = 6; // Simplified calculation
    const monthlyContribution = Math.ceil(target / monthsUntilTarget);
    
    addGoal({
      name,
      icon: selectedIcon,
      target,
      saved: 0,
      monthlyContribution,
      targetDate,
      monthIndex: monthsUntilTarget,
    });
    
    // Reset form
    setName('');
    setTargetAmount('');
    setTargetDate('');
    setSelectedIcon('Target');
    onClose();
  };

  const monthlyContribution = targetAmount 
    ? Math.ceil(parseFloat(targetAmount) / 6)
    : 0;

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
          
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl max-h-[85vh] overflow-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">New Goal</h2>
                <motion.button
                  className="w-8 h-8 rounded-full glass flex items-center justify-center"
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                >
                  <X size={16} strokeWidth={1.5} className="text-white" />
                </motion.button>
              </div>

              {/* Icon picker */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-3 block">Choose an icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map(({ key, icon: Icon }) => (
                    <motion.button
                      key={key}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedIcon === key ? 'gradient-primary' : 'glass'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedIcon(key)}
                    >
                      <Icon size={22} strokeWidth={1.5} className="text-white" />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Name input */}
              <div className="mb-4">
                <label className="text-white/60 text-sm mb-2 block">Goal name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., New Car"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none"
                />
              </div>

              {/* Target amount input */}
              <div className="mb-4">
                <label className="text-white/60 text-sm mb-2 block">Target amount (€)</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none"
                />
              </div>

              {/* Target date input */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Target date</label>
                <input
                  type="text"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  placeholder="Dec 2026"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none"
                />
              </div>

              {/* Auto-calculated contribution */}
              {monthlyContribution > 0 && (
                <div className="glass rounded-xl p-4 mb-6 text-center">
                  <p className="text-white/60 text-sm">Estimated monthly contribution</p>
                  <p className="text-white text-2xl font-bold mt-1">€{monthlyContribution}/mo</p>
                </div>
              )}

              {/* Create button */}
              <motion.button
                className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold"
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
              >
                Create Goal
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
