import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Coins } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';

interface BlockInfo {
  id: string;
  type: 'spending' | 'goals' | 'savings' | 'fixed';
  name: string;
  color: string;
  budget: number;
}

interface TransferSheetProps {
  open: boolean;
  source: BlockInfo | null;
  target: BlockInfo | null;
  isWhatIf: boolean;
  onApply: (sourceId: string, targetId: string, amount: number, makePermanent: boolean) => void;
  onClose: () => void;
}

const quickAmounts = [25, 50, 100];

export function TransferSheet({ open, source, target, isWhatIf, onApply, onClose }: TransferSheetProps) {
  const { config } = useBudget();
  const { goals } = useApp();
  const income = config.monthlyIncome || 1;

  const maxAmount = source?.budget || 0;
  const [amount, setAmount] = useState(0);
  const [makePermanent, setMakePermanent] = useState(false);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);
  const [coinParticles, setCoinParticles] = useState<number[]>([]);
  const coinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setAmount(0);
      setMakePermanent(false);
      setActiveQuick(null);
    }
  }, [open]);

  // Coin flow animation
  useEffect(() => {
    if (amount > 0 && open && source && target) {
      if (coinTimerRef.current) clearInterval(coinTimerRef.current);
      const numCoins = Math.min(Math.ceil(amount / 25), 10);
      let spawned = 0;
      coinTimerRef.current = setInterval(() => {
        if (spawned >= numCoins) {
          if (coinTimerRef.current) clearInterval(coinTimerRef.current);
          return;
        }
        setCoinParticles(prev => [...prev.slice(-9), Date.now()]);
        spawned++;
      }, 80);
      return () => { if (coinTimerRef.current) clearInterval(coinTimerRef.current); };
    }
  }, [amount, open, source, target]);

  const selectQuick = (label: string, val: number) => {
    setActiveQuick(label);
    setAmount(Math.min(val, maxAmount));
  };

  // Goal acceleration
  const goalAcceleration = useMemo(() => {
    if (!target || target.type !== 'goals' || amount <= 0) return [];
    return goals.filter(g => g.monthlyContribution > 0).map(g => {
      const remaining = g.target - g.saved;
      if (remaining <= 0) return null;
      const currentMonths = Math.ceil(remaining / g.monthlyContribution);
      const extra = amount / Math.max(goals.filter(gg => gg.monthlyContribution > 0).length, 1);
      const newMonths = Math.ceil(remaining / (g.monthlyContribution + extra));
      const diff = currentMonths - newMonths;
      return diff > 0 ? { name: g.name, diff } : null;
    }).filter(Boolean) as Array<{ name: string; diff: number }>;
  }, [target, amount, goals]);

  if (!source || !target) return null;

  const sourceAfter = Math.max(0, source.budget - amount);
  const targetAfter = target.budget + amount;
  const maxW = 140;
  const sourceBeforeW = Math.max(10, (source.budget / income) * maxW);
  const sourceAfterW = Math.max(4, (sourceAfter / income) * maxW);
  const targetBeforeW = Math.max(10, (target.budget / income) * maxW);
  const targetAfterW = Math.max(10, (targetAfter / income) * maxW);

  // Ripple effects
  const sourcePctChange = source.budget > 0 ? Math.round(((sourceAfter - source.budget) / source.budget) * 100) : 0;
  const targetPctChange = target.budget > 0 ? Math.round(((targetAfter - target.budget) / target.budget) * 100) : 0;
  const eliminatesSource = sourceAfter === 0 && amount > 0;
  const dailyBefore = source.budget / 30;
  const dailyAfter = sourceAfter / 30;

  // (goalAcceleration already computed above)

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
              padding: '20px 20px 100px',
              boxShadow: '0 -8px 32px rgba(45, 36, 64, 0.12)',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-4">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1C8E0' }} />
            </div>

            {/* Header: Source -> Target */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div style={{ width: 20, height: 20, borderRadius: 4, background: source.color }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2D2440' }}>{source.name}</div>
                  <div style={{ fontSize: 11, color: '#8A7FA0' }}>€{Math.round(source.budget)}/mo</div>
                </div>
              </div>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight size={20} style={{ color: '#FFD700' }} />
              </motion.div>
              <div className="flex items-center gap-2">
                <div style={{ width: 20, height: 20, borderRadius: 4, background: target.color }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2D2440' }}>{target.name}</div>
                  <div style={{ fontSize: 11, color: '#8A7FA0' }}>€{Math.round(target.budget)}/mo</div>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center mb-2">
              <span style={{ fontSize: 13, color: '#5C4F6E' }}>How much to move?</span>
            </div>
            <div className="text-center mb-3">
              <span style={{ fontSize: 28, fontWeight: 700, color: '#2D2440' }}>€{Math.round(amount)}</span>
            </div>

            {/* Slider */}
            <div className="mb-4 px-2">
              <input
                type="range"
                min={0}
                max={Math.round(maxAmount)}
                value={Math.round(amount)}
                onChange={e => { setAmount(Number(e.target.value)); setActiveQuick(null); }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #8B5CF6 ${maxAmount > 0 ? (amount / maxAmount) * 100 : 0}%, rgba(45,36,64,0.08) 0)`,
                }}
              />
            </div>

            {/* Quick-pick pills */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {quickAmounts.map(v => (
                <button
                  key={v}
                  onClick={() => selectQuick(`${v}`, v)}
                  className="flex-shrink-0 rounded-[10px]"
                  style={{
                    padding: '8px 14px',
                    background: activeQuick === `${v}` ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.5)',
                    border: activeQuick === `${v}` ? '1.5px solid rgba(139,92,246,0.3)' : '1.5px solid rgba(255,255,255,0.6)',
                    color: activeQuick === `${v}` ? '#8B5CF6' : '#2D2440',
                    fontSize: 13, fontWeight: 500,
                  }}
                >€{v}</button>
              ))}
              <button
                onClick={() => selectQuick('half', Math.round(maxAmount / 2))}
                className="flex-shrink-0 rounded-[10px]"
                style={{
                  padding: '8px 14px',
                  background: activeQuick === 'half' ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.5)',
                  border: activeQuick === 'half' ? '1.5px solid rgba(139,92,246,0.3)' : '1.5px solid rgba(255,255,255,0.6)',
                  color: activeQuick === 'half' ? '#8B5CF6' : '#2D2440',
                  fontSize: 13, fontWeight: 500,
                }}
              >Half</button>
              <button
                onClick={() => selectQuick('all', maxAmount)}
                className="flex-shrink-0 rounded-[10px]"
                style={{
                  padding: '8px 14px',
                  background: activeQuick === 'all' ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.5)',
                  border: activeQuick === 'all' ? '1.5px solid rgba(139,92,246,0.3)' : '1.5px solid rgba(255,255,255,0.6)',
                  color: activeQuick === 'all' ? '#8B5CF6' : '#2D2440',
                  fontSize: 13, fontWeight: 500,
                }}
              >All</button>
            </div>

            {/* Mini Block Preview: Before -> After */}
            <div className="flex items-center gap-3 justify-center mb-4">
              {/* Before */}
              <div className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 10, color: '#8A7FA0', fontWeight: 600 }}>Before</span>
                <motion.div
                  animate={{ width: sourceBeforeW }}
                  style={{ height: 24, borderRadius: 6, background: source.color }}
                  className="flex items-center justify-center"
                >
                  <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>€{Math.round(source.budget)}</span>
                </motion.div>
                <motion.div
                  animate={{ width: targetBeforeW }}
                  style={{ height: 24, borderRadius: 6, background: target.color }}
                  className="flex items-center justify-center"
                >
                  <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>€{Math.round(target.budget)}</span>
                </motion.div>
              </div>

              <ArrowRight size={16} style={{ color: '#8A7FA0' }} />

              {/* After */}
              <div className="flex flex-col items-center gap-1 relative">
                <span style={{ fontSize: 10, color: '#8A7FA0', fontWeight: 600 }}>After</span>
                <motion.div
                  animate={{ width: sourceAfterW }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={{ height: 24, borderRadius: 6, background: source.color, opacity: sourceAfter === 0 ? 0.3 : 1 }}
                  className="flex items-center justify-center"
                >
                  <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>€{Math.round(sourceAfter)}</span>
                </motion.div>
                <motion.div
                  animate={{ width: targetAfterW }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={{ height: 24, borderRadius: 6, background: target.color }}
                  className="flex items-center justify-center"
                >
                  <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>€{Math.round(targetAfter)}</span>
                </motion.div>
                {/* Coin particles */}
                <AnimatePresence>
                  {coinParticles.slice(-5).map(id => (
                    <motion.div
                      key={id}
                      initial={{ x: -30, y: 12, opacity: 1 }}
                      animate={{ x: 30, y: 32, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute pointer-events-none"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD700' }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Ripple Effects */}
            {amount > 0 && (
              <div className="rounded-[14px] p-3.5 mb-4" style={{ background: 'rgba(255,255,255,0.4)' }}>
                <div style={{ fontSize: 13, color: '#5C4F6E', marginBottom: 8 }}>
                  Ripple effects of moving €{Math.round(amount)}:
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: source.color, fontWeight: 600 }}>{source.name}</span>
                    <span style={{ color: '#2D2440' }}>
                      €{Math.round(source.budget)} → €{Math.round(sourceAfter)} ({sourcePctChange}%)
                    </span>
                  </div>
                  {source.type === 'spending' && (
                    <div className="flex justify-between" style={{ fontSize: 11 }}>
                      <span style={{ color: '#5C4F6E' }}>Daily budget</span>
                      <span style={{ color: '#5C4F6E' }}>€{dailyBefore.toFixed(1)} → €{dailyAfter.toFixed(1)}/day</span>
                    </div>
                  )}
                  <div className="flex justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: target.type === 'goals' ? '#27AE60' : target.color, fontWeight: 600 }}>{target.name}</span>
                    <span style={{ color: '#2D2440' }}>
                      €{Math.round(target.budget)} → €{Math.round(targetAfter)} (+{targetPctChange}%)
                    </span>
                  </div>
                  {goalAcceleration.map(g => (
                    <div key={g.name} style={{ fontSize: 11, color: '#27AE60' }}>
                      {g.name}: {g.diff} months sooner
                    </div>
                  ))}
                  <div className="flex justify-between" style={{ fontSize: 11 }}>
                    <span style={{ color: '#5C4F6E' }}>Free cash</span>
                    <span style={{ color: '#5C4F6E' }}>unchanged</span>
                  </div>
                </div>
                {eliminatesSource && (
                  <div className="mt-2 rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span style={{ fontSize: 12, color: '#F59E0B' }}>
                      This eliminates your {source.name} budget entirely
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions - sticky bottom */}
            <div className="sticky bottom-0 pt-3 pb-2 flex gap-2.5" style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(255,255,255,0.5)',
            }}>
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl flex items-center justify-center"
                style={{
                  height: 48,
                  background: 'rgba(45,36,64,0.06)',
                  color: '#2D2440',
                  fontSize: 15, fontWeight: 600,
                }}
              >Cancel</button>
              <button
                onClick={() => { if (amount > 0 && source && target) onApply(source.id, target.id, amount, makePermanent); }}
                disabled={amount <= 0}
                className="flex-[2] rounded-2xl flex items-center justify-center"
                style={{
                  height: 48,
                  background: amount > 0 ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(45,36,64,0.08)',
                  color: 'white',
                  fontSize: 15, fontWeight: 700,
                  opacity: amount > 0 ? 1 : 0.4,
                }}
              >
                {isWhatIf ? '✨ Try it' : 'Apply'}
              </button>
            </div>

            {/* Make permanent toggle */}
            {!isWhatIf && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  onClick={() => setMakePermanent(!makePermanent)}
                  className="flex items-center gap-2"
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: makePermanent ? 'rgba(139,92,246,0.3)' : 'rgba(45,36,64,0.08)',
                    padding: 2, transition: 'background 200ms',
                    display: 'flex', alignItems: makePermanent ? 'center' : 'center',
                    justifyContent: makePermanent ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: makePermanent ? '#8B5CF6' : '#D1C8E0',
                      transition: 'background 200ms',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#8A7FA0' }}>Make permanent</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
