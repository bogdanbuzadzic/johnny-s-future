import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Clock, RefreshCw, Target } from 'lucide-react';
import type { Category } from '@/context/BudgetContext';
import type { Goal } from '@/context/AppContext';

type PurchaseType = 'habit' | 'one-time' | 'experience' | 'tool';

interface CanIAffordSheetProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  income: number;
  flexBudget: number;
  flexSpent: number;
  flexRemaining: number;
  freeAmount: number;
  daysRemaining: number;
  daysInMonth: number;
  expenseCategories: Category[];
  categorySpentMap: Record<string, number>;
  goals: Goal[];
  onBuyIt: (amount: number, description: string, categoryId: string) => void;
  onWait24h: (amount: number, description: string, purchaseType: PurchaseType) => void;
}

const purchaseTypes: { id: PurchaseType; label: string; subtitle: string }[] = [
  { id: 'habit', label: 'Replaces a habit', subtitle: 'Coffee machine, gym equipment' },
  { id: 'one-time', label: 'One-time purchase', subtitle: 'Clothes, phone, furniture' },
  { id: 'experience', label: 'Experience', subtitle: 'Travel, concert, dinner out' },
  { id: 'tool', label: 'Tool / Investment', subtitle: 'Saves or earns money' },
];

function getVerdict(amount: number, flexRemaining: number, flexBudget: number) {
  const after = flexRemaining - amount;
  if (after <= 0) return { label: 'Over budget', color: '#FCA5A5', bg: 'rgba(239,68,68,0.15)' };
  if (after > flexBudget * 0.3) return { label: 'Comfortable ✓', color: '#86EFAC', bg: 'rgba(52,199,89,0.15)' };
  return { label: 'Tight', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' };
}

export function CanIAffordSheet({
  open, onClose, amount, description, income, flexBudget, flexSpent, flexRemaining,
  freeAmount, daysRemaining, expenseCategories, categorySpentMap, goals,
  onBuyIt, onWait24h,
}: CanIAffordSheetProps) {
  const [phase, setPhase] = useState<'type' | 'results'>('type');
  const [selectedType, setSelectedType] = useState<PurchaseType | null>(null);
  const [habitCost, setHabitCost] = useState('');
  const [habitFreq, setHabitFreq] = useState<'day' | 'week' | 'month'>('day');
  const [splitCount, setSplitCount] = useState(1);
  const [roiValue, setRoiValue] = useState('');

  useEffect(() => {
    if (open) {
      setPhase('type');
      setSelectedType(null);
      setHabitCost('');
      setHabitFreq('day');
      setSplitCount(1);
      setRoiValue('');
    }
  }, [open]);

  const handleTypeSelect = (type: PurchaseType) => {
    setSelectedType(type);
    setPhase('results');
  };

  const effectiveAmount = selectedType === 'experience' ? amount / splitCount : amount;
  const hourlyRate = income / 160;
  const hoursOfWork = hourlyRate > 0 ? effectiveAmount / hourlyRate : 0;
  const workdays = Math.ceil(hoursOfWork / 8);
  const monthsToRecover = freeAmount > 0 ? Math.ceil(effectiveAmount / freeAmount) : Infinity;
  const verdict = getVerdict(effectiveAmount, flexRemaining, flexBudget);

  const goalDelays = useMemo(() =>
    goals.filter(g => g.monthlyContribution > 0)
      .map(g => ({ name: g.name, delay: parseFloat((effectiveAmount / g.monthlyContribution).toFixed(1)) }))
      .sort((a, b) => b.delay - a.delay),
    [goals, effectiveAmount]);

  const catComparison = useMemo(() => {
    const c = expenseCategories.filter(c => c.monthlyBudget > 0)
      .map(c => ({ name: c.name, months: Math.round(effectiveAmount / c.monthlyBudget) }))
      .filter(c => c.months > 0)
      .sort((a, b) => a.months - b.months);
    return c[0] || null;
  }, [expenseCategories, effectiveAmount]);

  const bestCategoryId = useMemo(() => {
    let best = expenseCategories[0];
    let bestRem = best ? best.monthlyBudget - (categorySpentMap[best.id] || 0) : 0;
    expenseCategories.forEach(c => {
      const rem = c.monthlyBudget - (categorySpentMap[c.id] || 0);
      if (rem > bestRem) { best = c; bestRem = rem; }
    });
    return best?.id || '';
  }, [expenseCategories, categorySpentMap]);

  // Habit payback
  const habitCostNum = parseFloat(habitCost) || 0;
  const habitMonthly = habitFreq === 'day' ? habitCostNum * 30.4 : habitFreq === 'week' ? habitCostNum * 4.33 : habitCostNum;
  const paybackDays = habitMonthly > 0 ? Math.ceil(effectiveAmount / (habitMonthly / 30.4)) : 0;

  // ROI
  const roiNum = parseFloat(roiValue) || 0;
  const roiPaybackMonths = roiNum > 0 ? Math.ceil(effectiveAmount / roiNum) : 0;

  const hoursContext = hoursOfWork < 4 ? "Less than half a day's work" : hoursOfWork < 8 ? "About a day's work" : `${workdays} full workdays at your rate`;
  const recoveryContext = monthsToRecover <= 1 ? "You'd recover this within a month" : monthsToRecover === Infinity ? "No free cash to recover" : `~${monthsToRecover} months at your current pace`;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              maxHeight: phase === 'results' ? '85vh' : undefined,
              background: 'rgba(15, 12, 24, 0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* ═══ TYPE SELECTOR ═══ */}
            {phase === 'type' && (
              <div className="px-5 pb-6">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 16 }}>What kind of purchase?</h3>
                {purchaseTypes.map((pt, i) => (
                  <div key={pt.id}
                    className="flex items-center cursor-pointer"
                    style={{ padding: '14px 0', borderBottom: i < purchaseTypes.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                    onClick={() => handleTypeSelect(pt.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: 'white' }}>{pt.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{pt.subtitle}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.12)' }} />
                  </div>
                ))}
              </div>
            )}

            {/* ═══ RESULTS ═══ */}
            {phase === 'results' && selectedType && (
              <div className="px-5 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>€{effectiveAmount.toLocaleString()}</span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>{description || 'Purchase'}</span>
                  </div>
                  <div style={{ ...verdictStyle(verdict), padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    {verdict.label}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  {purchaseTypes.find(p => p.id === selectedType)?.label}
                </div>

                {/* Split info */}
                {selectedType === 'experience' && splitCount > 1 && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                    €{amount} / {splitCount} = <span style={{ color: 'white', fontWeight: 600 }}>€{Math.round(effectiveAmount)}</span> each
                  </div>
                )}

                {/* Hours of work */}
                <MetricSection label="HOURS OF WORK" value={`${Math.round(hoursOfWork)} hours`} context={hoursContext} />

                {/* Time to recover */}
                <MetricSection label="TIME TO RECOVER"
                  value={monthsToRecover === Infinity ? 'Cannot recover' : `~${monthsToRecover} month${monthsToRecover !== 1 ? 's' : ''}`}
                  context={recoveryContext} />

                {/* Goal delays */}
                <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>WHAT YOU'RE GIVING UP</div>
                  {goalDelays.length > 0 ? goalDelays.map((g, i) => (
                    <div key={i} className="flex justify-between" style={{ padding: '4px 0' }}>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{g.name}</span>
                      <span style={{ fontSize: 13, color: '#FBBF24', fontWeight: 600 }}>{g.delay} mo later</span>
                    </div>
                  )) : (
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No active goals</span>
                  )}
                  {catComparison && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                      Or: {catComparison.months} month{catComparison.months !== 1 ? 's' : ''} of {catComparison.name}
                    </div>
                  )}
                </div>

                {/* Type-specific sections */}
                {selectedType === 'habit' && (
                  <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>PAYBACK ANALYSIS</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>How much do you spend on this?</div>
                    <div className="flex gap-2 items-center mb-2">
                      <input type="number" inputMode="decimal" placeholder="0" value={habitCost}
                        onChange={e => setHabitCost(e.target.value)}
                        style={{
                          width: 80, padding: '10px 12px', borderRadius: 8, fontSize: 14,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'white', outline: 'none',
                        }} />
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>€</span>
                      {(['day', 'week', 'month'] as const).map(f => (
                        <button key={f} onClick={() => setHabitFreq(f)} style={{
                          padding: '6px 10px', borderRadius: 6, fontSize: 11,
                          background: habitFreq === f ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                          border: habitFreq === f ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
                          color: habitFreq === f ? 'white' : 'rgba(255,255,255,0.4)',
                        }}>/{f}</button>
                      ))}
                    </div>
                    {paybackDays > 0 && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                        Pays for itself in <span style={{ color: '#86EFAC', fontWeight: 600 }}>{paybackDays} days</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedType === 'one-time' && (
                  <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                      Will you still want this in 1 week? 1 month? 1 year?
                    </div>
                  </div>
                )}

                {selectedType === 'experience' && (
                  <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>SPLIT WITH FRIENDS?</div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(n => (
                        <button key={n} onClick={() => setSplitCount(n)} style={{
                          width: 40, height: 40, borderRadius: 8, fontSize: 14, fontWeight: 600,
                          background: splitCount === n ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                          border: splitCount === n ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
                          color: splitCount === n ? 'white' : 'rgba(255,255,255,0.4)',
                        }}>{n}{n === 4 ? '+' : ''}</button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedType === 'tool' && (
                  <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>ROI CALCULATION</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Monthly savings from this?</div>
                    <input type="number" inputMode="decimal" placeholder="0" value={roiValue}
                      onChange={e => setRoiValue(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'white', outline: 'none',
                      }} />
                    {roiPaybackMonths > 0 && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                        Pays back in <span style={{ color: '#86EFAC', fontWeight: 600 }}>{roiPaybackMonths} months</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                  <button onClick={() => { onBuyIt(effectiveAmount, description, bestCategoryId); onClose(); }} style={{
                    flex: 1, height: 44, borderRadius: 10,
                    background: '#27AE60', color: 'white', fontWeight: 600, fontSize: 14, border: 'none',
                  }}>Buy it</button>
                  <button onClick={() => { onWait24h(effectiveAmount, description, selectedType); onClose(); }} style={{
                    flex: 1, height: 44, borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 14,
                  }}>Wait 24h</button>
                  <button onClick={onClose} style={{
                    padding: '0 12px', height: 44,
                    color: 'rgba(255,255,255,0.25)', fontSize: 13,
                    background: 'none', border: 'none',
                  }}>Skip</button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MetricSection({ label, value, context }: { label: string; value: string; context: string }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{context}</div>
    </div>
  );
}

function verdictStyle(v: { bg: string; color: string }) {
  return { background: v.bg, color: v.color } as React.CSSProperties;
}
