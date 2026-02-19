import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee, ShoppingBag, Sparkles, Wrench, Clock, RefreshCw, Target,
  Check, AlertTriangle, X, ChevronRight, Lightbulb, Timer, Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category } from '@/context/BudgetContext';
import type { Goal } from '@/context/AppContext';

// ── Types ──
type PurchaseType = 'habit' | 'one-time' | 'experience' | 'tool';

interface PurchaseDecisionSheetProps {
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

// ── Purchase Type Definitions ──
const purchaseTypes: Array<{ id: PurchaseType; icon: LucideIcon; label: string; example: string; color: string }> = [
  { id: 'habit', icon: Coffee, label: 'Replaces a habit', example: 'Coffee machine, gym, meal prep gear', color: '#E67E22' },
  { id: 'one-time', icon: ShoppingBag, label: 'One-time purchase', example: 'Clothes, phone, furniture', color: '#E74C3C' },
  { id: 'experience', icon: Sparkles, label: 'Experience', example: 'Travel, concert, dinner out', color: '#9B59B6' },
  { id: 'tool', icon: Wrench, label: 'Tool / Investment', example: 'Saves money or earns money', color: '#2980B9' },
];

// ── Helper Functions ──
function deriveValues(): string[] {
  const persona = localStorage.getItem('jfb_persona');
  const values: string[] = [];
  if (persona === 'Vigilant Saver') values.push('quality');
  if (persona === 'Money Avoider') values.push('minimalism');
  if (persona === 'Steady Saver') values.push('quality');
  try {
    const module5 = JSON.parse(localStorage.getItem('jfb_module5_answers') || '{}');
    if (module5.dominant === 'vigilance') values.push('quality');
    if (module5.dominant === 'avoidance') values.push('minimalism');
    if (module5.dominant === 'status') values.push('quality');
  } catch {}
  if (values.length === 0) values.push('quality');
  return [...new Set(values)];
}

function getVerdictInfo(amount: number, flexRemaining: number, flexBudget: number) {
  const after = flexRemaining - amount;
  if (after <= 0) return { label: `Over budget by €${Math.abs(Math.round(after))}`, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', textColor: '#991B1B', icon: X };
  if (after > flexBudget * 0.3) return { label: 'Comfortable', color: '#27AE60', bg: 'rgba(39,174,96,0.12)', textColor: '#27AE60', icon: Check };
  return { label: 'Tight but possible', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', textColor: '#92400E', icon: AlertTriangle };
}

function calculateGoalDelays(amount: number, goals: Goal[]) {
  return goals
    .filter(g => g.monthlyContribution > 0)
    .map(g => ({ name: g.name, delay: parseFloat((amount / g.monthlyContribution).toFixed(1)) }))
    .sort((a, b) => b.delay - a.delay);
}

function getCategoryComparison(amount: number, categories: Category[]) {
  const comparisons = categories
    .filter(c => !['Subscriptions'].includes(c.name) && c.monthlyBudget > 0)
    .map(c => ({ name: c.name, months: Math.round(amount / c.monthlyBudget) }))
    .filter(c => c.months > 0)
    .sort((a, b) => Math.abs(a.months - Math.round(a.months)) - Math.abs(b.months - Math.round(b.months)));
  return comparisons[0] || null;
}

const coolingTexts: Record<string, string> = {
  'Money Avoider': "No rush. Take a day. You're allowed to want things.",
  'Impulsive Optimist': "Your future self called. They said wait 24 hours.",
  'Present Hedonist': "Tomorrow-you will thank today-you for waiting.",
  'Vigilant Saver': "You already know this one. Sleep on it.",
  'Confident Controller': "A strategic pause. Smart decisions aren't rushed.",
  'Steady Saver': "One more day won't change the price. But it might change your mind.",
};

function getAlternatives(persona: string, purchaseType: PurchaseType, values: string[]): string[] {
  const suggestions: string[] = [];
  suggestions.push('Wait a week. If you still want it, it was meant to be.');
  if (persona === 'Impulsive Optimist') suggestions.push('Screenshot it. If you remember in 3 days, go for it.');
  if (persona === 'Money Avoider') suggestions.push("You don't have to decide now. That's okay.");
  if (persona === 'Vigilant Saver') suggestions.push('Compare 3 options before deciding.');
  if (persona === 'Present Hedonist') suggestions.push('Ask: is future-me okay with this?');
  if (persona === 'Confident Controller') suggestions.push('Run the numbers on two alternatives before committing.');
  if (persona === 'Steady Saver') suggestions.push('Does this break your streak? If not, go for it.');
  if (values.includes('sustainability')) suggestions.push('Check second-hand or certified refurbished options');
  if (values.includes('quality')) suggestions.push('Will this last 5+ years? Invest in durability.');
  if (values.includes('minimalism')) suggestions.push('Do you already own something that serves this purpose?');
  if (suggestions.length < 3 && purchaseType === 'one-time') {
    suggestions.push('Check refurbished options (often 30-40% off)');
    suggestions.push('Compare prices across at least 3 stores');
  }
  if (suggestions.length < 3 && purchaseType === 'experience') suggestions.push('Check for early-bird or group discounts');
  return suggestions.slice(0, 3);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Main Component ──
export function PurchaseDecisionSheet({
  open, onClose, amount, description, income, flexBudget, flexSpent, flexRemaining,
  freeAmount, daysRemaining, daysInMonth, expenseCategories, categorySpentMap, goals,
  onBuyIt, onWait24h,
}: PurchaseDecisionSheetProps) {
  const [phase, setPhase] = useState<'type' | 'decision'>('type');
  const [selectedType, setSelectedType] = useState<PurchaseType | null>(null);
  const [highlightedType, setHighlightedType] = useState<PurchaseType | null>(null);

  // Habit-specific
  const [habitCost, setHabitCost] = useState('');
  const [habitFreq, setHabitFreq] = useState<'day' | 'week' | 'month'>('day');

  // Experience-specific
  const [splitCount, setSplitCount] = useState(1);

  // Tool-specific
  const [roiValue, setRoiValue] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase('type');
      setSelectedType(null);
      setHighlightedType(null);
      setHabitCost('');
      setHabitFreq('day');
      setSplitCount(1);
      setRoiValue('');
    }
  }, [open]);

  const handleTypeSelect = (type: PurchaseType) => {
    setHighlightedType(type);
    setTimeout(() => {
      setSelectedType(type);
      setPhase('decision');
    }, 300);
  };

  // Computed values
  const effectiveAmount = selectedType === 'experience' ? amount / splitCount : amount;
  const hourlyRate = income / 160;
  const hoursOfWork = hourlyRate > 0 ? effectiveAmount / hourlyRate : 0;
  const workdays = Math.ceil(hoursOfWork / 8);
  const monthsToRecover = freeAmount > 0 ? Math.ceil(effectiveAmount / freeAmount) : Infinity;
  const verdict = getVerdictInfo(effectiveAmount, flexRemaining, flexBudget);
  const goalDelays = calculateGoalDelays(effectiveAmount, goals);
  const catComparison = getCategoryComparison(effectiveAmount, expenseCategories);
  const persona = localStorage.getItem('jfb_persona') || 'Steady Saver';
  const values = deriveValues();
  const alternatives = getAlternatives(persona, selectedType || 'one-time', values);
  const coolingText = coolingTexts[persona] || coolingTexts['Steady Saver'];
  const isOverIncome = amount > income;

  // Best category for auto-assignment
  const bestCategoryId = useMemo(() => {
    let best = expenseCategories[0];
    let bestRem = best ? best.monthlyBudget - (categorySpentMap[best.id] || 0) : 0;
    expenseCategories.forEach(c => {
      const rem = c.monthlyBudget - (categorySpentMap[c.id] || 0);
      if (rem > bestRem) { best = c; bestRem = rem; }
    });
    return best?.id || '';
  }, [expenseCategories, categorySpentMap]);

  // Before/after calculations
  const bestCat = expenseCategories.find(c => c.id === bestCategoryId);
  const catSpent = bestCat ? (categorySpentMap[bestCat.id] || 0) : 0;
  const catBudget = bestCat?.monthlyBudget || 1;
  const currentPct = Math.round((catSpent / catBudget) * 100);
  const afterPct = Math.round(((catSpent + effectiveAmount) / catBudget) * 100);
  const afterFree = freeAmount - effectiveAmount;
  const afterDaily = daysRemaining > 0 ? Math.round((flexBudget - flexSpent - effectiveAmount) / daysRemaining) : 0;
  const currentDaily = daysRemaining > 0 ? Math.round((flexBudget - flexSpent) / daysRemaining) : 0;

  // Habit payback
  const habitCostNum = parseFloat(habitCost) || 0;
  const habitMonthly = habitFreq === 'day' ? habitCostNum * 30.4 : habitFreq === 'week' ? habitCostNum * 4.33 : habitCostNum;
  const paybackDays = habitMonthly > 0 ? Math.ceil(effectiveAmount / (habitMonthly / 30.4)) : 0;
  const yearNetSavings = habitMonthly > 0 ? Math.round((habitMonthly * 12) - effectiveAmount) : 0;

  // ROI
  const roiNum = parseFloat(roiValue) || 0;
  const roiPaybackMonths = roiNum > 0 ? Math.ceil(effectiveAmount / roiNum) : 0;
  const roiYear1 = roiNum > 0 ? Math.round((roiNum * 12) - effectiveAmount) : 0;
  const roiYear2 = roiNum > 0 ? Math.round((roiNum * 24) - effectiveAmount) : 0;

  // Hours context
  const hoursContext = hoursOfWork < 4 ? "Less than half a day's work" : hoursOfWork < 8 ? "About a day's work" : `That's ${workdays} full workdays at your rate`;
  // Recovery context
  const recoveryContext = monthsToRecover <= 1 ? "You'd recover this within a month" : monthsToRecover <= 3 ? "A few months to rebuild" : monthsToRecover <= 6 ? "Half a year to recover" : monthsToRecover === Infinity ? "You have no free cash to recover this" : `${monthsToRecover} months at your current savings pace`;

  if (!open) return null;

  const typeConfig = purchaseTypes.find(t => t.id === selectedType);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              maxHeight: phase === 'decision' ? '80vh' : undefined,
              background: phase === 'type' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 -8px 32px rgba(45,36,64,0.15)',
              overflowY: phase === 'decision' ? 'auto' : undefined,
              paddingBottom: phase === 'decision' ? 100 : 40,
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1C8E0' }} />
            </div>

            {phase === 'type' && (
              <div className="px-5 pb-6">
                <h3 className="text-center text-[18px] font-bold mb-4" style={{ color: '#2D2440' }}>What kind of purchase?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {purchaseTypes.map(pt => {
                    const Icon = pt.icon;
                    const isHighlighted = highlightedType === pt.id;
                    return (
                      <div
                        key={pt.id}
                        onClick={() => handleTypeSelect(pt.id)}
                        className="cursor-pointer transition-all duration-200"
                        style={{
                          background: isHighlighted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)',
                          border: isHighlighted ? `1.5px solid ${pt.color}` : '1.5px solid rgba(255,255,255,0.6)',
                          borderRadius: 14,
                          padding: 14,
                          boxShadow: isHighlighted ? `0 2px 12px rgba(0,0,0,0.06)` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-center mb-2" style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: hexToRgba(pt.color, 0.1),
                        }}>
                          <Icon size={20} style={{ color: pt.color }} />
                        </div>
                        <span className="text-[13px] font-bold block" style={{ color: '#2D2440' }}>{pt.label}</span>
                        <span className="text-[10px] block mt-0.5" style={{ color: '#8A7FA0' }}>{pt.example}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {phase === 'decision' && selectedType && !isOverIncome && (
              <div className="px-5 pb-4">
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-[20px] font-bold" style={{ color: '#2D2440' }}>
                    €{effectiveAmount.toLocaleString()} — {description || 'Purchase'}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {typeConfig && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
                        style={{ background: hexToRgba(typeConfig.color, 0.12), color: typeConfig.color }}>
                        <typeConfig.icon size={12} /> {typeConfig.label}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
                      style={{ background: verdict.bg, color: verdict.textColor }}>
                      <verdict.icon size={12} /> {verdict.label}
                    </span>
                  </div>
                </div>

                {/* Split info for experience */}
                {selectedType === 'experience' && splitCount > 1 && (
                  <div className="text-[13px] mb-3" style={{ color: '#5C4F6E' }}>
                    €{amount.toLocaleString()} / {splitCount} = <span className="font-bold" style={{ color: '#2D2440' }}>€{Math.round(effectiveAmount)}</span> each
                  </div>
                )}

                {/* ── Universal Metrics ── */}
                {/* Metric 1: Hours of Work */}
                <MetricCard icon={Clock} iconColor="#8B5CF6" label="HOURS OF WORK"
                  value={`${Math.round(hoursOfWork)} hours`} context={hoursContext} />

                {/* Metric 2: Time to Recover */}
                <MetricCard icon={RefreshCw} iconColor="#14B8A6" label="TIME TO RECOVER"
                  value={monthsToRecover === Infinity ? 'Cannot recover' : `~${monthsToRecover} month${monthsToRecover !== 1 ? 's' : ''}`}
                  context={recoveryContext} />

                {/* Metric 3: What You're Giving Up */}
                <div className="rounded-xl p-3.5 mb-2.5" style={{
                  background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)',
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} style={{ color: '#E91E63' }} />
                    <span className="text-[12px] tracking-wide uppercase" style={{ color: '#8A7FA0' }}>What you're giving up</span>
                  </div>
                  {goalDelays.length > 0 ? (
                    <div className="space-y-1.5">
                      {goalDelays.map((g, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-[14px]" style={{ color: '#2D2440' }}>{g.name}</span>
                          <span className="text-[14px] font-medium" style={{ color: '#E91E63' }}>{g.delay} months later</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[13px]" style={{ color: '#5C4F6E' }}>No active goals to compare</span>
                  )}
                  {catComparison && (
                    <div className="mt-2 text-[13px]" style={{ color: '#5C4F6E' }}>
                      Or: {catComparison.months} month{catComparison.months !== 1 ? 's' : ''} of {catComparison.name}
                    </div>
                  )}
                </div>

                {/* ── Type-Specific Metric ── */}
                {selectedType === 'habit' && (
                  <div className="rounded-xl p-3.5 mb-2.5" style={{
                    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)',
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee size={16} style={{ color: '#E67E22' }} />
                      <span className="text-[12px] tracking-wide uppercase" style={{ color: '#8A7FA0' }}>Payback Analysis</span>
                    </div>
                    <p className="text-[13px] mb-3" style={{ color: '#5C4F6E' }}>How much do you spend on this habit?</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 flex-1" style={{
                        background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(230,126,34,0.3)',
                        borderRadius: 10, padding: '12px 14px',
                      }}>
                        <span className="text-[13px]" style={{ color: '#8A7FA0' }}>€</span>
                        <input type="number" inputMode="decimal" value={habitCost} onChange={e => setHabitCost(e.target.value)}
                          placeholder="0" className="flex-1 bg-transparent outline-none text-[14px]"
                          style={{ color: '#2D2440' }} />
                      </div>
                      <span className="text-[13px]" style={{ color: '#5C4F6E' }}>per</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {(['day', 'week', 'month'] as const).map(f => (
                        <button key={f} onClick={() => setHabitFreq(f)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                          style={{
                            background: habitFreq === f ? hexToRgba('#E67E22', 0.15) : 'rgba(255,255,255,0.3)',
                            color: habitFreq === f ? '#E67E22' : '#5C4F6E',
                          }}>
                          {f}
                        </button>
                      ))}
                    </div>
                    {habitCostNum > 0 && (
                      <div className="space-y-1">
                        <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                          At €{habitCostNum}/{habitFreq}: pays for itself in <span className="font-bold" style={{ color: '#2D2440' }}>{paybackDays} days</span>
                        </p>
                        <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                          After that: save <span className="font-bold" style={{ color: '#2D2440' }}>€{Math.round(habitMonthly)}/month</span>
                        </p>
                        <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                          1-year savings: <span className="font-bold" style={{ color: yearNetSavings >= 0 ? '#27AE60' : '#EF4444' }}>€{yearNetSavings} net</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedType === 'one-time' && (
                  <div className="rounded-xl p-3.5 mb-2.5" style={{
                    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)',
                  }}>
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingBag size={16} style={{ color: '#E74C3C' }} />
                      <span className="text-[12px] tracking-wide uppercase" style={{ color: '#8A7FA0' }}>Purchase Reality Check</span>
                    </div>
                    <p className="text-[14px] font-medium mb-3" style={{ color: '#2D2440' }}>Will you still be happy with this in:</p>
                    <div className="space-y-2 mb-3">
                      {[{ time: '1 week?', note: 'Probably' }, { time: '1 month?', note: 'Think about it' }, { time: '1 year?', note: "That's the real test" }].map(r => (
                        <div key={r.time} className="flex items-center justify-between">
                          <span className="text-[14px] font-bold" style={{ color: '#2D2440' }}>{r.time}</span>
                          <span className="text-[13px]" style={{ color: '#5C4F6E' }}>{r.note}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pl-3" style={{ borderLeft: '3px solid #E74C3C' }}>
                      <p className="text-[13px] italic" style={{ color: '#5C4F6E' }}>
                        "Ask yourself: would I buy this again at full price 30 days from now?"
                      </p>
                    </div>
                  </div>
                )}

                {selectedType === 'experience' && (
                  <div className="rounded-xl p-3.5 mb-2.5" style={{
                    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)',
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} style={{ color: '#9B59B6' }} />
                      <span className="text-[12px] tracking-wide uppercase" style={{ color: '#8A7FA0' }}>Experience Value</span>
                    </div>
                    <p className="text-[13px] italic mb-3" style={{ color: '#5C4F6E' }}>
                      Experiences create longer-lasting happiness than material purchases.
                    </p>
                    <p className="text-[14px] font-medium mb-2" style={{ color: '#2D2440' }}>Split with friends?</p>
                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3, 4].map(n => (
                        <button key={n} onClick={() => setSplitCount(n)}
                          className="flex items-center justify-center text-[15px] font-semibold transition-all"
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: splitCount === n ? 'rgba(155,89,182,0.2)' : 'rgba(155,89,182,0.1)',
                            border: splitCount === n ? '1.5px solid #9B59B6' : '1.5px solid rgba(155,89,182,0.2)',
                            color: splitCount === n ? '#9B59B6' : '#2D2440',
                          }}>
                          {n === 4 ? '4+' : n}
                        </button>
                      ))}
                    </div>
                    {splitCount > 1 && (
                      <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                        €{amount} / {splitCount} = <span className="font-bold" style={{ color: '#2D2440' }}>€{Math.round(effectiveAmount)} each</span>
                      </p>
                    )}
                  </div>
                )}

                {selectedType === 'tool' && (
                  <div className="rounded-xl p-3.5 mb-2.5" style={{
                    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)',
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench size={16} style={{ color: '#2980B9' }} />
                      <span className="text-[12px] tracking-wide uppercase" style={{ color: '#8A7FA0' }}>Return on Investment</span>
                    </div>
                    <p className="text-[13px] mb-3" style={{ color: '#5C4F6E' }}>If this saves or earns you money:</p>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1 flex-1" style={{
                        background: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(41,128,185,0.3)',
                        borderRadius: 10, padding: '12px 14px',
                      }}>
                        <span className="text-[13px]" style={{ color: '#8A7FA0' }}>€</span>
                        <input type="number" inputMode="decimal" value={roiValue} onChange={e => setRoiValue(e.target.value)}
                          placeholder="0" className="flex-1 bg-transparent outline-none text-[14px]"
                          style={{ color: '#2D2440' }} />
                      </div>
                      <span className="text-[13px]" style={{ color: '#5C4F6E' }}>per month</span>
                    </div>
                    {roiNum > 0 && (
                      <div className="space-y-1">
                        <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                          At €{roiNum}/mo: pays for itself in <span className="font-bold" style={{ color: '#2D2440' }}>{roiPaybackMonths} months</span>
                        </p>
                        <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                          Year 1 net: <span className="font-bold" style={{ color: roiYear1 >= 0 ? '#27AE60' : '#EF4444' }}>
                            {roiYear1 >= 0 ? '+' : ''}€{roiYear1}
                          </span>
                        </p>
                        <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                          Year 2 net: <span className="font-bold" style={{ color: roiYear2 >= 0 ? '#27AE60' : '#EF4444' }}>
                            {roiYear2 >= 0 ? '+' : ''}€{roiYear2}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Alternatives ── */}
                <div className="rounded-xl p-4 mb-2.5" style={{
                  background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)',
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={16} style={{ color: '#8B5CF6' }} />
                    <span className="text-[14px] font-bold" style={{ color: '#2D2440' }}>Alternatives for you</span>
                  </div>
                  <div className="space-y-2">
                    {alternatives.map((alt, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#8B5CF6' }} />
                        <span className="text-[13px]" style={{ color: '#5C4F6E' }}>{alt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Cooling Period / Experience Note ── */}
                {selectedType === 'experience' ? (
                  <div className="rounded-xl p-4 mb-2.5" style={{
                    background: 'rgba(155,89,182,0.06)', border: '1px solid rgba(155,89,182,0.12)',
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} style={{ color: '#9B59B6' }} />
                      <span className="text-[14px] font-bold" style={{ color: '#2D2440' }}>Is this time-sensitive?</span>
                    </div>
                    <p className="text-[13px]" style={{ color: '#5C4F6E' }}>
                      If it's a now-or-never event, trust your gut. If you can book later, consider waiting.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl p-4 mb-2.5" style={{
                    background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.12)',
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Timer size={16} style={{ color: '#14B8A6' }} />
                      <span className="text-[14px] font-medium" style={{ color: '#2D2440' }}>{coolingText}</span>
                    </div>
                    <p className="text-[12px] italic mb-3" style={{ color: '#5C4F6E' }}>
                      72% of impulse purchases are regretted within a week.
                    </p>
                    <button onClick={() => { onWait24h(amount, description, selectedType); onClose(); }}
                      className="w-full text-center py-3 rounded-xl text-[14px] font-semibold transition-all"
                      style={{
                        background: 'rgba(20,184,166,0.1)', border: '1.5px solid rgba(20,184,166,0.25)',
                        color: '#14B8A6',
                      }}>
                      Remind me in 24 hours
                    </button>
                  </div>
                )}

                {/* ── Mini Before/After ── */}
                <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
                  <div className="rounded-xl p-3" style={{
                    background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)',
                  }}>
                    <span className="text-[11px] uppercase tracking-wide block mb-1" style={{ color: '#8A7FA0' }}>Now</span>
                    {bestCat && (
                      <>
                        <span className="text-[13px] font-bold block" style={{ color: '#2D2440' }}>{bestCat.name}</span>
                        <div className="mt-1.5" style={{ height: 6, borderRadius: 3, background: 'rgba(45,36,64,0.08)' }}>
                          <div style={{
                            width: `${Math.min(currentPct, 100)}%`, height: '100%', borderRadius: 3,
                            background: currentPct > 100 ? '#EF4444' : currentPct > 80 ? '#F59E0B' : '#8B5CF6',
                          }} />
                        </div>
                        <span className="text-[12px] mt-0.5 block" style={{
                          color: currentPct > 80 ? '#F59E0B' : '#8B5CF6',
                        }}>{currentPct}%</span>
                      </>
                    )}
                    <div className="mt-2 space-y-0.5">
                      <span className="text-[14px] font-bold block" style={{ color: freeAmount >= 0 ? '#27AE60' : '#EF4444' }}>
                        Free: €{Math.round(freeAmount)}
                      </span>
                      <span className="text-[13px] block" style={{ color: '#5C4F6E' }}>Daily: €{currentDaily}/day</span>
                    </div>
                  </div>

                  <ChevronRight size={20} style={{ color: '#8A7FA0' }} />

                  <div className="rounded-xl p-3" style={{
                    background: afterFree < 0 ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.5)',
                    border: afterFree < 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.6)',
                  }}>
                    <span className="text-[11px] uppercase tracking-wide block mb-1" style={{ color: '#8A7FA0' }}>After €{Math.round(effectiveAmount)}</span>
                    {bestCat && (
                      <>
                        <span className="text-[13px] font-bold block" style={{ color: '#2D2440' }}>{bestCat.name}</span>
                        <div className="mt-1.5" style={{ height: 6, borderRadius: 3, background: 'rgba(45,36,64,0.08)' }}>
                          <div style={{
                            width: `${Math.min(afterPct, 100)}%`, height: '100%', borderRadius: 3,
                            background: afterPct > 100 ? '#EF4444' : afterPct > 80 ? '#F59E0B' : '#8B5CF6',
                          }} />
                        </div>
                        <span className="text-[12px] mt-0.5 block" style={{
                          color: afterPct > 100 ? '#EF4444' : afterPct > 80 ? '#F59E0B' : '#8B5CF6',
                        }}>{afterPct}%</span>
                      </>
                    )}
                    <div className="mt-2 space-y-0.5">
                      <span className="text-[14px] font-bold block" style={{ color: afterFree >= 0 ? '#27AE60' : '#EF4444' }}>
                        Free: €{Math.round(afterFree)}
                      </span>
                      <span className="text-[13px] block" style={{ color: '#5C4F6E' }}>Daily: €{afterDaily}/day</span>
                    </div>
                  </div>
                </div>

                {/* ── Action Buttons (sticky) ── */}
                <div className="sticky bottom-0 -mx-5 px-5 pt-4 pb-2 flex gap-2.5" style={{
                  background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                  borderTop: '1px solid rgba(255,255,255,0.5)',
                }}>
                  <button onClick={() => { onBuyIt(effectiveAmount, description, bestCategoryId); onClose(); }}
                    className="flex-1 text-white font-semibold text-[15px] rounded-[14px]"
                    style={{ height: 48, background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}>
                    Buy it
                  </button>
                  <button onClick={() => { onWait24h(amount, description, selectedType); onClose(); }}
                    className="flex-1 font-medium text-[15px] rounded-[14px]"
                    style={{ height: 48, background: 'rgba(45,36,64,0.06)', border: '1.5px solid rgba(45,36,64,0.12)', color: '#2D2440' }}>
                    Wait 24h
                  </button>
                  <button onClick={onClose}
                    className="text-[15px] px-3"
                    style={{ height: 48, color: '#8A7FA0' }}>
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* ── Over Income Edge Case ── */}
            {phase === 'decision' && selectedType && isOverIncome && (
              <div className="px-5 pb-6">
                <div className="text-center py-8">
                  <h3 className="text-[20px] font-bold mb-2" style={{ color: '#2D2440' }}>This is bigger than your monthly income.</h3>
                  <p className="text-[14px] mb-1" style={{ color: '#5C4F6E' }}>Consider making it a savings goal instead.</p>
                  <p className="text-[13px] mb-6" style={{ color: '#8A7FA0' }}>
                    At €{Math.round(freeAmount > 0 ? freeAmount : 0)}/month, you'd reach €{amount.toLocaleString()} in{' '}
                    {freeAmount > 0 ? Math.ceil(amount / freeAmount) : '∞'} months.
                  </p>
                  <button onClick={onClose}
                    className="w-full text-white font-semibold text-[15px] rounded-[14px] mb-3"
                    style={{ height: 48, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                    Create a goal
                  </button>
                  <button onClick={onClose} className="text-[14px]" style={{ color: '#8A7FA0' }}>Cancel</button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Reusable Metric Card ──
function MetricCard({ icon: Icon, iconColor, label, value, context }: {
  icon: LucideIcon; iconColor: string; label: string; value: string; context: string;
}) {
  return (
    <div className="rounded-xl p-3.5 mb-2.5" style={{
      background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)',
    }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} style={{ color: iconColor }} />
        <span className="text-[12px] tracking-wide uppercase" style={{ color: '#8A7FA0' }}>{label}</span>
      </div>
      <span className="text-[20px] font-bold block" style={{ color: '#2D2440' }}>{value}</span>
      <span className="text-[13px]" style={{ color: '#5C4F6E' }}>{context}</span>
    </div>
  );
}
