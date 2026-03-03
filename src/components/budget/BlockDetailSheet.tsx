import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO, format } from 'date-fns';
import { JohnnyMessage } from '@/components/ui/JohnnyMessage';
import type { Category, Transaction } from '@/context/BudgetContext';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark, Car, Tv,
  Shield, Baby, Lock, PiggyBank, Target, Wallet, Plus, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const allIcons: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark, Car, Tv,
  Shield, Baby, Lock, PiggyBank, Target, Wallet, Plus, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2, RefreshCw,
};

function getIcon(name: string): LucideIcon { return allIcons[name] || MoreHorizontal; }

interface BlockDetailSheetProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  spent: number;
  transactions: Transaction[];
  daysInMonth: number;
  dayOfMonth: number;
  onUpdateBudget: (id: string, budget: number) => void;
}

export function BlockDetailSheet({
  open, onClose, category, spent, transactions, daysInMonth, dayOfMonth, onUpdateBudget,
}: BlockDetailSheetProps) {
  const [sliderVal, setSliderVal] = useState(0);
  const [sliderDirty, setSliderDirty] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Reset slider when category changes
  const catBudget = category?.monthlyBudget || 0;
  if (open && !sliderDirty && sliderVal !== catBudget) {
    setSliderVal(catBudget);
  }

  const dailyBudget = daysInMonth > 0 ? catBudget / daysInMonth : 0;

  // Build daily totals for the last 7 days
  const { dailyData, weekDays } = useMemo(() => {
    const days: { dayNum: number; dayName: string; amount: number; isToday: boolean }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dom = d.getDate();
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTxs = transactions.filter(t => t.date === dateStr);
      const total = dayTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      days.push({
        dayNum: dom,
        dayName: i === 0 ? 'Today' : format(d, 'EEE'),
        amount: total,
        isToday: i === 0,
      });
    }
    return { dailyData: days, weekDays: days };
  }, [transactions, dayOfMonth]);

  const maxBarValue = useMemo(() =>
    Math.max(dailyBudget * 2.5, ...dailyData.map(d => d.amount), 1),
    [dailyBudget, dailyData]);

  const barAreaHeight = 60;

  // Over-budget analysis
  const daysElapsed = dayOfMonth;
  const overBudgetDays = dailyData.filter(d => d.amount > dailyBudget && d.amount > 0);
  const overBudgetDayCount = overBudgetDays.length;
  const totalWeekSpend = dailyData.reduce((s, d) => s + d.amount, 0);
  const overBudgetSpend = overBudgetDays.reduce((s, d) => s + d.amount, 0);
  const overBudgetSpendPct = totalWeekSpend > 0 ? Math.round((overBudgetSpend / totalWeekSpend) * 100) : 0;

  // Filtered transactions for selected day
  const filteredTxs = useMemo(() => {
    if (selectedDay === null) return transactions.slice(0, 10);
    const now = new Date();
    // Find the date for the selected day number in the last 7 days
    const target = dailyData.find(d => d.dayNum === selectedDay);
    if (!target) return [];
    // Reconstruct date
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (d.getDate() === selectedDay) {
        const dateStr = format(d, 'yyyy-MM-dd');
        return transactions.filter(t => t.date === dateStr);
      }
    }
    return [];
  }, [selectedDay, transactions, dailyData]);

  // Cumulative chart data
  const { cumulativeActual, cumulativeBudget, cumMax } = useMemo(() => {
    const actual: number[] = [];
    const budget: number[] = [];
    let runningActual = 0;
    for (let day = 1; day <= Math.min(dayOfMonth, daysInMonth); day++) {
      const dateStr = (() => {
        const d = new Date();
        d.setDate(day);
        return format(d, 'yyyy-MM-dd');
      })();
      const dayTotal = transactions.filter(t => t.date === dateStr).reduce((s, t) => s + (Number(t.amount) || 0), 0);
      runningActual += dayTotal;
      actual.push(runningActual);
      budget.push(dailyBudget * day);
    }
    return {
      cumulativeActual: actual,
      cumulativeBudget: budget,
      cumMax: Math.max(...actual, ...budget, catBudget, 1),
    };
  }, [transactions, dayOfMonth, daysInMonth, dailyBudget, catBudget]);

  const cumChartW = 280;
  const cumChartH = 60;

  if (!open || !category) return null;

  const CatIcon = getIcon(category.icon);
  const fillPct = catBudget > 0 ? Math.min((spent / catBudget) * 100, 120) : 0;

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
              background: 'linear-gradient(180deg, #1A1525 0%, #2D1F3D 100%)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            <div className="px-5 pb-6">
              {/* Category Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(139,92,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CatIcon size={18} style={{ color: '#8B5CF6' }} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{category.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    €{Math.round(spent)} of €{Math.round(catBudget)} spent
                  </div>
                </div>
              </div>

              {/* Budget bar */}
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{
                  width: `${Math.min(fillPct, 100)}%`, height: '100%', borderRadius: 4,
                  background: fillPct > 100 ? '#FF5252' : fillPct > 80 ? '#FFC107' : '#8B5CF6',
                  transition: 'width 0.4s ease',
                }} />
              </div>

              {/* Budget Slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>€{Math.round(sliderVal)}</span>
                </div>
                <input type="range" min={0} max={Math.round(catBudget * 2)}
                  value={Math.round(sliderVal)}
                  onChange={e => { setSliderVal(Number(e.target.value)); setSliderDirty(true); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, rgba(139,92,246,0.5) ${(sliderVal / Math.max(catBudget * 2, 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
                />
                {sliderDirty && Math.round(sliderVal) !== Math.round(catBudget) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                    <button onClick={() => { onUpdateBudget(category.id, Math.round(sliderVal)); setSliderDirty(false); onClose(); }}
                      style={{ height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: 'white', fontWeight: 600, fontSize: 12, border: 'none', padding: '0 16px' }}>
                      Save
                    </button>
                    <button onClick={() => { setSliderVal(catBudget); setSliderDirty(false); }}
                      style={{ height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 12, border: 'none', padding: '0 16px' }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Daily Spending Timeline */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  THIS WEEK
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
                  {weekDays.map((day, i) => {
                    const underPart = Math.min(day.amount, dailyBudget);
                    const overPart = Math.max(0, day.amount - dailyBudget);
                    const budgetLineBottom = (dailyBudget / maxBarValue) * barAreaHeight;
                    const isSelected = selectedDay === day.dayNum;

                    return (
                      <div key={i}
                        onClick={() => setSelectedDay(isSelected ? null : day.dayNum)}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          cursor: 'pointer', opacity: isSelected ? 1 : 0.8,
                        }}
                      >
                        <span style={{ fontSize: 9, color: day.isToday ? '#8B5CF6' : 'rgba(255,255,255,0.3)' }}>
                          {day.dayName}
                        </span>
                        <div style={{ position: 'relative', width: '100%', height: barAreaHeight }}>
                          {/* Budget line */}
                          <div style={{
                            position: 'absolute', bottom: budgetLineBottom, left: 0, right: 0,
                            height: 2, borderTop: '2px dashed rgba(139,92,246,0.4)',
                          }} />
                          {day.amount > 0 && (
                            <>
                              {/* Under-budget portion */}
                              <div style={{
                                position: 'absolute', bottom: 0, left: '15%', right: '15%',
                                height: (underPart / maxBarValue) * barAreaHeight,
                                background: 'rgba(255,255,255,0.12)', borderRadius: '4px 4px 0 0',
                              }} />
                              {overPart > 0 && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: (underPart / maxBarValue) * barAreaHeight,
                                  left: '15%', right: '15%',
                                  height: (overPart / maxBarValue) * barAreaHeight,
                                  background: '#FFD700', borderRadius: '4px 4px 0 0',
                                }} />
                              )}
                            </>
                          )}
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 600,
                          color: day.amount > dailyBudget ? '#FFD700'
                            : day.amount > 0 ? 'rgba(255,255,255,0.3)'
                            : 'rgba(255,255,255,0.1)',
                        }}>
                          {day.amount > 0 ? `€${Math.round(day.amount)}` : '-'}
                        </span>
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{day.dayNum}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 6, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Under budget</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FFD700' }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Over budget</span>
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>€{Math.round(dailyBudget)}/day</span>
                </div>
              </div>

              {/* Johnny Insight */}
              <div style={{ marginBottom: 16 }}>
                <JohnnyMessage variant="dark" from="Johnny">
                  {overBudgetDayCount > 0 ? (
                    <>You overspend on <strong style={{ color: '#FFD700' }}>{overBudgetDayCount}</strong> out of {Math.min(7, daysElapsed)} days, and those days are <strong style={{ color: '#FFD700' }}>{overBudgetSpendPct}%</strong> of total spending. Your big spending days are the pattern to watch.</>
                  ) : (
                    <>Every day under budget so far. That's rare — keep it up.</>
                  )}
                </JohnnyMessage>
              </div>

              {/* Transaction List */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  {selectedDay !== null ? `Day ${selectedDay} transactions` : 'Recent transactions'}
                </div>
                {filteredTxs.length > 0 ? filteredTxs.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{tx.description}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{format(parseISO(tx.date), 'MMM d')}</span>
                      <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>-€{Number(tx.amount)}</span>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>No transactions</div>
                )}
              </div>

              {/* Cumulative Chart */}
              {cumulativeActual.length > 1 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    CUMULATIVE
                  </div>
                  <svg width={cumChartW} height={cumChartH} style={{ display: 'block', width: '100%' }} viewBox={`0 0 ${cumChartW} ${cumChartH}`}>
                    {/* Budget pace line (diagonal) */}
                    <line
                      x1={0} y1={cumChartH}
                      x2={cumChartW} y2={cumChartH - (catBudget / cumMax) * cumChartH}
                      stroke="rgba(139,92,246,0.3)" strokeWidth={1.5} strokeDasharray="4 4"
                    />
                    {/* Actual cumulative polyline */}
                    <polyline
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      points={cumulativeActual.map((v, i) => {
                        const x = (i / Math.max(cumulativeActual.length - 1, 1)) * cumChartW;
                        const y = cumChartH - (v / cumMax) * cumChartH;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>Day 1</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>Day {dayOfMonth}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
