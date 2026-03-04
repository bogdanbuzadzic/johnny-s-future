import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { JohnnyMessage } from '@/components/ui/JohnnyMessage';
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

const purchaseTypes: { id: PurchaseType; label: string; desc: string }[] = [
  { id: 'habit', label: 'Replaces a habit', desc: 'Coffee machine, gym equipment' },
  { id: 'one-time', label: 'One-time purchase', desc: 'Clothes, phone, furniture' },
  { id: 'experience', label: 'Experience', desc: 'Travel, concert, dinner out' },
  { id: 'tool', label: 'Tool / Investment', desc: 'Saves or earns money' },
];

function getVerdict(amount: number, flexRemaining: number, flexBudget: number) {
  const after = flexRemaining - amount;
  if (after <= 0) return { label: 'Over budget', color: '#FCA5A5', bg: 'rgba(239,68,68,0.15)' };
  if (after > flexBudget * 0.3) return { label: 'Comfortable ✓', color: '#86EFAC', bg: 'rgba(52,199,89,0.15)' };
  return { label: 'Tight', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' };
}

export function CanIAffordSheet({
  open, onClose, amount, description, income, flexBudget, flexSpent, flexRemaining,
  freeAmount, daysRemaining, daysInMonth, expenseCategories, categorySpentMap, goals,
  onBuyIt, onWait24h,
}: CanIAffordSheetProps) {
  const [selectedType, setSelectedType] = useState<PurchaseType | null>(null);
  const [habitCost, setHabitCost] = useState('');
  const [habitFreq, setHabitFreq] = useState<'day' | 'week' | 'month'>('day');
  const [splitCount, setSplitCount] = useState(1);
  const [roiValue, setRoiValue] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedType(null);
      setHabitCost('');
      setHabitFreq('day');
      setSplitCount(1);
      setRoiValue('');
    }
  }, [open]);

  const effectiveAmount = selectedType === 'experience' ? amount / splitCount : amount;
  const hourlyRate = income / 160;
  const hoursOfWork = hourlyRate > 0 ? effectiveAmount / hourlyRate : 0;
  const workdays = Math.ceil(hoursOfWork / 8);
  const recoveryMonths = freeAmount > 0 ? Math.ceil(effectiveAmount / freeAmount) : Infinity;
  const verdict = getVerdict(effectiveAmount, flexRemaining, flexBudget);

  const goalDelays = useMemo(() =>
    goals.filter(g => g.monthlyContribution > 0)
      .map(g => ({ name: g.name, months: effectiveAmount / g.monthlyContribution }))
      .sort((a, b) => b.months - a.months),
    [goals, effectiveAmount]);

  const bestCategoryId = useMemo(() => {
    let best = expenseCategories[0];
    let bestRem = best ? best.monthlyBudget - (categorySpentMap[best.id] || 0) : 0;
    expenseCategories.forEach(c => {
      const rem = c.monthlyBudget - (categorySpentMap[c.id] || 0);
      if (rem > bestRem) { best = c; bestRem = rem; }
    });
    return best?.id || '';
  }, [expenseCategories, categorySpentMap]);

  const habitCostNum = parseFloat(habitCost) || 0;
  const habitMonthly = habitFreq === 'day' ? habitCostNum * 30.4 : habitFreq === 'week' ? habitCostNum * 4.33 : habitCostNum;
  const dailyHabitCost = habitMonthly / 30.4;
  const paybackDays = dailyHabitCost > 0 ? Math.ceil(effectiveAmount / dailyHabitCost) : 0;
  const roiNum = parseFloat(roiValue) || 0;
  const roiPaybackMonths = roiNum > 0 ? Math.ceil(effectiveAmount / roiNum) : 0;

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'white',
    fontSize: 14,
    outline: 'none',
  };

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
              maxHeight: '85vh',
              height: 'auto',
              background: 'linear-gradient(180deg, #1A1525 0%, #2D1F3D 100%)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            <div className="pb-6">
              {/* ═══ TYPE SELECTOR ═══ */}
              {!selectedType && (
                <div className="px-5">
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 12 }}>
                    What kind of purchase?
                  </h3>
                  {purchaseTypes.map(type => (
                    <button key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '14px 0',
                        background: 'none', border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                      }}>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: 15, color: 'white', margin: 0 }}>{type.label}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{type.desc}</p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.12)' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* ═══ RESULTS ═══ */}
              {selectedType && (
                <>
                  {/* Header */}
                  <div className="px-5" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>
                      €{effectiveAmount.toLocaleString()} — {description || 'Purchase'}
                    </h3>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: 'rgba(139,92,246,0.2)', color: 'rgba(139,92,246,0.8)',
                      }}>{purchaseTypes.find(p => p.id === selectedType)?.label}</span>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: verdict.bg, color: verdict.color,
                      }}>{verdict.label}</span>
                    </div>
                  </div>

                  {/* Split info for experience */}
                  {selectedType === 'experience' && splitCount > 1 && (
                    <div className="px-5" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                      €{amount} / {splitCount} = <span style={{ color: 'white', fontWeight: 600 }}>€{Math.round(effectiveAmount)}</span> each
                    </div>
                  )}

                  {/* ═══ PURCHASE TYPE HERO SECTIONS ═══ */}

                  {/* HABIT: Payback hero */}
                  {selectedType === 'habit' && (
                    <div className="px-4 mb-3">
                      {/* Habit input */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>How much do you spend on this?</div>
                        <div className="flex gap-2 items-center">
                          <input type="number" inputMode="decimal" placeholder="0" value={habitCost}
                            onChange={e => setHabitCost(e.target.value)}
                            style={{ ...inputStyle, width: 80 }} />
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
                      </div>

                      {dailyHabitCost > 0 && (
                        <div style={{
                          background: 'rgba(34,197,94,0.08)',
                          border: '1px solid rgba(34,197,94,0.15)',
                          borderRadius: 14, padding: 16, textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(34,197,94,0.5)' }}>
                            Pays for itself in
                          </div>
                          <div style={{ fontSize: 36, fontWeight: 800, color: '#86EFAC', marginTop: 6 }}>
                            {paybackDays} days
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                            If you spend €{dailyHabitCost.toFixed(0)}/day on this habit now
                          </div>

                          {/* Break-even bar */}
                          <div style={{ marginTop: 14, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, (dailyHabitCost * 365 / effectiveAmount) * 20)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #86EFAC, #22C55E)',
                              borderRadius: 4,
                            }} />
                          </div>

                          {/* Annual savings */}
                          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 20 }}>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: '#86EFAC' }}>
                                €{Math.round(dailyHabitCost * 365 - effectiveAmount)}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>saved/year</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>
                                €{(dailyHabitCost - (effectiveAmount / 365)).toFixed(2)}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>saved/day</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ONE-TIME: Cost per use hero */}
                  {selectedType === 'one-time' && (
                    <div style={{
                      margin: '0 16px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14, padding: 16, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Cost Per Day (3 year lifespan)
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: 'white', marginTop: 6 }}>
                        €{(effectiveAmount / (365 * 3)).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                        €{(effectiveAmount / (52 * 3)).toFixed(2)}/week · €{(effectiveAmount / 36).toFixed(2)}/month
                      </div>
                    </div>
                  )}

                  {/* TOOL: ROI Calculator */}
                  {selectedType === 'tool' && (
                    <div className="px-4 mb-3">
                      {/* ROI input */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Monthly savings from this?</div>
                        <input type="number" inputMode="decimal" placeholder="0" value={roiValue}
                          onChange={e => setRoiValue(e.target.value)}
                          style={{ ...inputStyle, width: '100%' }} />
                      </div>

                      <div style={{
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        borderRadius: 14, padding: 16,
                      }}>
                        <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                          If this earns or saves you...
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[
                            { monthly: 50, label: '€50/mo' },
                            { monthly: 200, label: '€200/mo' },
                            { monthly: 500, label: '€500/mo' },
                          ].map(scenario => {
                            const months = Math.ceil(effectiveAmount / scenario.monthly);
                            return (
                              <div key={scenario.monthly} style={{
                                flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                                padding: 10, textAlign: 'center',
                                border: scenario.monthly === 200 ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(255,255,255,0.08)',
                              }}>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{scenario.label}</div>
                                <div style={{
                                  fontSize: 18, fontWeight: 800, marginTop: 4,
                                  color: months <= 3 ? '#86EFAC' : months <= 12 ? '#C4B5FD' : '#FBBF24',
                                }}>{months} mo</div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>to pay back</div>
                              </div>
                            );
                          })}
                        </div>
                        {roiPaybackMonths > 0 && (
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10, textAlign: 'center' }}>
                            At €{roiNum}/mo → pays back in <span style={{ color: '#86EFAC', fontWeight: 600 }}>{roiPaybackMonths} months</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EXPERIENCE: Split selector */}
                  {selectedType === 'experience' && (
                    <div className="px-5" style={{ marginBottom: 12 }}>
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

                  {/* ═══ METRICS CARDS (2-column) ═══ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 12px' }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: 12,
                    }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hours of Work</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginTop: 4 }}>{Math.round(hoursOfWork)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{workdays} workday{workdays !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: 12,
                    }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recovery</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: recoveryMonths > 3 ? '#FBBF24' : '#86EFAC', marginTop: 4 }}>
                        {recoveryMonths === Infinity ? '∞' : `~${recoveryMonths} mo`}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>at current pace</div>
                    </div>
                  </div>

                  {/* ═══ GOAL DELAYS WITH BARS ═══ */}
                  {goalDelays.length > 0 && (
                    <div style={{ padding: '0 16px 12px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        What Gets Delayed
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {goalDelays.map(g => {
                          const maxDelay = Math.max(...goalDelays.map(d => d.months));
                          const barPct = maxDelay > 0 ? (g.months / maxDelay) * 100 : 0;
                          return (
                            <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', width: 80, flexShrink: 0 }}>{g.name}</span>
                              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${barPct}%`, height: '100%', background: '#FBBF24', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#FBBF24', minWidth: 55, textAlign: 'right' }}>
                                +{Math.round(g.months)} mo
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ═══ JOHNNY INSIGHT (adapts to type) ═══ */}
                  {amount > 0 && (
                    <div className="px-4" style={{ marginBottom: 12 }}>
                      <JohnnyMessage variant="dark" from="Johnny">
                        {selectedType === 'habit' && dailyHabitCost > 0 && (
                          <>This pays for itself in <strong style={{ color: '#86EFAC' }}>{paybackDays} days</strong> and saves you <strong style={{ color: '#86EFAC' }}>€{Math.round(dailyHabitCost * 365 - effectiveAmount)}/year</strong>. Smart buy.</>
                        )}
                        {selectedType === 'habit' && dailyHabitCost <= 0 && (
                          <>Enter your current habit cost above to see if this purchase pays for itself.</>
                        )}
                        {selectedType === 'one-time' && (
                          <>€{(effectiveAmount / (365 * 3)).toFixed(2)}/day over 3 years.
                          {goalDelays.length > 0 && goalDelays[0] && <> But it pushes your <strong style={{ color: '#FBBF24' }}>{goalDelays[0].name}</strong> back <strong style={{ color: '#FBBF24' }}>+{Math.round(goalDelays[0].months)} months</strong>. Worth the trade?</>}
                          </>
                        )}
                        {selectedType === 'tool' && (
                          <>If this leads to even €200/mo more income, it pays back in <strong style={{ color: '#C4B5FD' }}>{Math.ceil(effectiveAmount / 200)} months</strong>. Good investment.</>
                        )}
                        {selectedType === 'experience' && (
                          <>€{effectiveAmount.toLocaleString()} = <strong style={{ color: 'white' }}>{hoursOfWork.toFixed(1)} hours</strong> of your work.
                          {goalDelays.length > 0 && goalDelays[0] && <> Your {goalDelays[0].name} gets pushed back <strong style={{ color: '#FBBF24' }}>+{Math.round(goalDelays[0].months)} mo</strong>.</>}
                          {' '}Still worth it?</>
                        )}
                      </JohnnyMessage>
                    </div>
                  )}

                  {/* ═══ ACTIONS ═══ */}
                  <div className="px-5" style={{
                    display: 'flex', gap: 8, padding: '12px 0',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    marginTop: 8,
                  }}>
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
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
