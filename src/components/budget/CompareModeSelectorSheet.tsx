import { motion, AnimatePresence } from 'framer-motion';
import { Target, CalendarRange, GitCompare, X } from 'lucide-react';

export type CompareMode = 'plan-vs-actual' | 'month-vs-month' | 'compare-plans';

interface CompareModeSelectorSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: CompareMode) => void;
}

const modes = [
  {
    id: 'plan-vs-actual' as CompareMode,
    Icon: Target,
    color: '#8B5CF6',
    title: 'Plan vs. Actual',
    desc: 'See where you followed your budget',
  },
  {
    id: 'month-vs-month' as CompareMode,
    Icon: CalendarRange,
    color: '#EC4899',
    title: 'Month vs. Month',
    desc: 'Compare spending between two months',
  },
  {
    id: 'compare-plans' as CompareMode,
    Icon: GitCompare,
    color: '#14B8A6',
    title: 'Compare Plans',
    desc: 'Build a new plan and see the difference',
  },
];

export function CompareModeSelectorSheet({ open, onClose, onSelect }: CompareModeSelectorSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.6)',
              padding: '24px 20px 40px',
              boxShadow: '0 -8px 32px rgba(45, 36, 64, 0.12)',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-5">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1C8E0' }} />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span style={{ fontSize: 18, fontWeight: 700, color: '#2D2440' }}>Compare</span>
              <button onClick={onClose}>
                <X size={20} style={{ color: '#8A7FA0' }} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {modes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => onSelect(mode.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '1.5px solid rgba(255,255,255,0.6)',
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: `${mode.color}15`,
                    }}
                  >
                    <mode.Icon size={24} style={{ color: mode.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2D2440' }}>{mode.title}</div>
                    <div style={{ fontSize: 12, color: '#5C4F6E' }}>{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
