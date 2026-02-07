import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, LineChart, Car, Baby, Scissors, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const iconMap = {
  raise: TrendingUp,
  invest: LineChart,
  car: Car,
  baby: Baby,
  'cut-spending': Scissors,
  custom: Plus,
};

interface WhatIfConfig {
  type: string;
  title: string;
  defaultAmount: number;
  frequency: 'one-time' | 'monthly' | 'yearly';
}

interface WhatIfConfigSheetProps {
  config: WhatIfConfig | null;
  open: boolean;
  onClose: () => void;
}

export function WhatIfConfigSheet({ config, open, onClose }: WhatIfConfigSheetProps) {
  const { addScenario } = useApp();
  
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('May 2026');
  const [customName, setCustomName] = useState('');
  const [isIncome, setIsIncome] = useState(true);

  // Reset form when config changes
  const handleOpen = () => {
    if (config) {
      setAmount(config.defaultAmount.toString());
      setFrequency(config.frequency);
      setStartDate('May 2026');
      setCustomName('');
      setIsIncome(true);
    }
  };

  const handleApply = () => {
    if (!config) return;
    
    const parsedAmount = parseFloat(amount) || 0;
    const name = config.type === 'custom' 
      ? customName || 'Custom Scenario'
      : config.title;
    
    const scenarioType = config.type === 'custom'
      ? isIncome ? 'custom-income' : 'custom-expense'
      : config.type;

    addScenario({
      type: scenarioType,
      name,
      amount: parsedAmount,
      frequency,
      startDate,
      startMonthIndex: 3, // Simplified: 3 months from now
    });

    onClose();
  };

  if (!config) return null;

  const Icon = iconMap[config.type as keyof typeof iconMap] || Plus;
  const isCustom = config.type === 'custom';

  return (
    <AnimatePresence onExitComplete={handleOpen}>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[60] glass-dark rounded-t-3xl"
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
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                  <Icon size={24} strokeWidth={1.5} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{config.title}</h2>
                  <p className="text-white/60 text-sm">Configure this scenario</p>
                </div>
                <motion.button
                  className="ml-auto w-8 h-8 rounded-full glass flex items-center justify-center"
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                >
                  <X size={16} strokeWidth={1.5} className="text-white" />
                </motion.button>
              </div>

              {/* Custom name input */}
              {isCustom && (
                <div className="mb-4">
                  <label className="text-white/60 text-sm mb-2 block">Scenario name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., Side hustle income"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none"
                  />
                </div>
              )}

              {/* Income/Expense toggle for custom */}
              {isCustom && (
                <div className="mb-4">
                  <label className="text-white/60 text-sm mb-2 block">Type</label>
                  <div className="flex gap-2">
                    <motion.button
                      className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                        isIncome ? 'gradient-primary text-white' : 'glass text-white/60'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsIncome(true)}
                    >
                      Income
                    </motion.button>
                    <motion.button
                      className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                        !isIncome ? 'gradient-primary text-white' : 'glass text-white/60'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsIncome(false)}
                    >
                      Expense
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Amount input */}
              <div className="mb-4">
                <label className="text-white/60 text-sm mb-2 block">Amount (€)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none"
                />
              </div>

              {/* Frequency pills */}
              <div className="mb-4">
                <label className="text-white/60 text-sm mb-2 block">Frequency</label>
                <div className="flex gap-2">
                  {(['one-time', 'monthly', 'yearly'] as const).map(freq => (
                    <motion.button
                      key={freq}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize ${
                        frequency === freq ? 'gradient-primary text-white' : 'glass text-white/60'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFrequency(freq)}
                    >
                      {freq.replace('-', ' ')}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Start date */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Starting from</label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="May 2026"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <motion.button
                  className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                >
                  Apply to Timeline
                </motion.button>
                <motion.button
                  className="w-full py-3 rounded-2xl glass text-white font-medium"
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
