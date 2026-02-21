import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export type CompareMode = 'plan-vs-actual' | 'month-vs-month' | 'compare-plans';

interface CompareModeSelectorSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: CompareMode) => void;
}

const modes: { id: CompareMode; label: string; desc: string }[] = [
  { id: 'plan-vs-actual', label: 'Plan vs. Actual', desc: 'How this month is tracking' },
  { id: 'month-vs-month', label: 'Month vs. Month', desc: 'Compare two months' },
  { id: 'compare-plans', label: 'Compare Plans', desc: 'Build and compare a new plan' },
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
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'rgba(20, 15, 30, 0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '20px 20px 0 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '20px',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-5">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {modes.map((mode, i) => (
              <div
                key={mode.id}
                className="flex items-center justify-between cursor-pointer"
                style={{
                  padding: '14px 0',
                  borderBottom: i < modes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
                onClick={() => { onSelect(mode.id); onClose(); }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'white' }}>{mode.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{mode.desc}</div>
                </div>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
