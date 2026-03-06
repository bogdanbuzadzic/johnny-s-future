import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
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

const iconTintMap: Record<string, string> = {
  UtensilsCrossed: '#F97316', ShoppingBag: '#EF4444', Bus: '#34495E', Film: '#8B5CF6',
  Dumbbell: '#7F8C8D', CreditCard: '#6C3483', Coffee: '#795548', Smartphone: '#E91E63',
  Gift: '#F1C40F', BookOpen: '#8E44AD', Shirt: '#D35400', Wrench: '#5AC8FA',
  Heart: '#06B6D4', MoreHorizontal: '#7F8C8D', Home: '#5D6D7E', Zap: '#2E86C1',
  Landmark: '#1A5276', Car: '#3498DB', Tv: '#6C3483', Shield: '#1A5276', Baby: '#EC4899',
  TrendingUp: '#8B5CF6', LineChart: '#3498DB', Sunset: '#F39C12',
  Target: '#1ABC9C', ShieldCheck: '#8B5CF6', Plane: '#F39C12', Laptop: '#8E44AD',
  GraduationCap: '#8E44AD', Gamepad2: '#3498DB', PiggyBank: '#2980B9', Wallet: '#FFFFFF',
};

function getIcon(name: string): LucideIcon { return allIcons[name] || MoreHorizontal; }
function getCatColor(icon: string): string { return iconTintMap[icon] || '#8B5CF6'; }

interface BlockDetailSheetProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  spent: number;
  transactions: Transaction[];
  daysInMonth: number;
  dayOfMonth: number;
  onUpdateBudget: (id: string, budget: number) => void;
  allExpenseCategories?: Category[];
  categorySpentMap?: Record<string, number>;
}

export function BlockDetailSheet({
  open, onClose, category, spent, transactions: rawTransactions, daysInMonth, dayOfMonth, onUpdateBudget,
  allExpenseCategories = [], categorySpentMap = {},
}: BlockDetailSheetProps) {
  // Filter transactions to current month only
  const transactions = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return rawTransactions.filter(t => {
      try {
        const txDate = parseISO(t.date);
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      } catch { return false; }
    });
  }, [rawTransactions]);
  const [sliderVal, setSliderVal] = useState(0);
  const [sliderDirty, setSliderDirty] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const catBudget = category?.monthlyBudget || 0;
  if (open && !sliderDirty && sliderVal !== catBudget) {
    setSliderVal(catBudget);
  }

  const dailyBudget = daysInMonth > 0 ? catBudget / daysInMonth : 0;
  const catColor = category ? getCatColor(category.icon) : '#8B5CF6';

  // Stacked spending bar data
  const totalAllSpent = useMemo(() =>
    allExpenseCategories.reduce((s, c) => s + (categorySpentMap[c.id] || 0), 0),
    [allExpenseCategories, categorySpentMap]);

  // Build daily totals for current calendar week (Mon-Sun)
  const { dailyData, weekDays } = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    // Find Monday of current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);

    const days: { dayNum: number; dayName: string; amount: number; isToday: boolean; isFuture: boolean; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const isToday = dateStr === todayStr;
      const isFuture = d > now && !isToday;
      const dayTxs = isFuture ? [] : transactions.filter(t => t.date === dateStr);
      const total = dayTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      days.push({
        dayNum: d.getDate(),
        dayName: isToday ? 'Today' : format(d, 'EEE'),
        amount: isFuture ? 0 : total,
        isToday,
        isFuture,
        dateStr,
      });
    }
    return { dailyData: days, weekDays: days };
  }, [transactions, dayOfMonth]);

  const maxBarValue = useMemo(() =>
    Math.max(dailyBudget, ...dailyData.map(d => d.amount), 1),
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
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (d.getDate() === selectedDay) {
        const dateStr = format(d, 'yyyy-MM-dd');
        return transactions.filter(t => t.date === dateStr);
      }
    }
    return [];
  }, [selectedDay, transactions]);

  // Cumulative chart data
  const { cumulativeActual, cumMax } = useMemo(() => {
    const actual: number[] = [];
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
    }
    return {
      cumulativeActual: actual,
      cumMax: Math.max(...actual, catBudget, 1),
    };
  }, [transactions, dayOfMonth, daysInMonth, catBudget]);

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
              {/* 1A. Category Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: catColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CatIcon size={18} style={{ color: 'white' }} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{category.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    €{Math.round(spent)} of €{Math.round(catBudget)} spent
                  </div>
                </div>
              </div>

              {/* 1B. Stacked Spending Bar */}
              {allExpenseCategories.length > 0 && totalAllSpent > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    height: 10, borderRadius: 5, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                  }}>
                    {allExpenseCategories.map(cat => {
                      const catSpent = categorySpentMap[cat.id] || 0;
                      if (catSpent === 0) return null;
                      const pct = (catSpent / totalAllSpent) * 100;
                      const color = getCatColor(cat.icon);
                      const isActive = cat.id === category.id;
                      return (
                        <div key={cat.id} style={{
                          width: `${pct}%`, height: '100%',
                          background: color,
                          opacity: isActive ? 1 : 0.35,
                          transition: 'opacity 0.3s',
                        }} />
                      );
                    })}
                  </div>
                </div>
              )}


              {/* 1C. Budget Slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>€{Math.round(sliderVal)}</span>
                </div>
                <input type="range" min={0} max={Math.round(catBudget * 2)}
                  value={Math.round(sliderVal)}
                  onChange={e => { setSliderVal(Number(e.target.value)); setSliderDirty(true); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${catColor}80 ${(sliderVal / Math.max(catBudget * 2, 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
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

              {/* 1D. Daily Spending Bars */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  THIS WEEK
                </div>
                <div style={{ display: 'flex', gap: 0, justifyContent: 'space-between' }}>
                  {weekDays.map((day, i) => {
                    const pct = Math.min(100, maxBarValue > 0 ? (day.amount / maxBarValue) * 100 : 0);
                    const isOver = day.amount > dailyBudget;
                    const isSelected = selectedDay === day.dayNum;
                    const budgetLinePct = maxBarValue > 0 ? (dailyBudget / maxBarValue) * 100 : 0;

                    return (
                      <div key={i}
                        onClick={() => !day.isFuture && setSelectedDay(isSelected ? null : day.dayNum)}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                          cursor: day.isFuture ? 'default' : 'pointer',
                          opacity: day.isFuture ? 0.35 : (isSelected ? 1 : 0.85),
                        }}
                      >
                        <span style={{ fontSize: 9, color: day.isToday ? catColor : 'rgba(255,255,255,0.3)', fontWeight: day.isToday ? 700 : 400 }}>
                          {day.dayName}
                        </span>
                        {/* Bar area */}
                        <div style={{ position: 'relative', width: 10, height: barAreaHeight, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }}>
                          {/* Budget line */}
                          {!day.isFuture && (
                            <div style={{
                              position: 'absolute',
                              bottom: `${budgetLinePct}%`,
                              left: -3, right: -3,
                              height: 2,
                              borderTop: '2px dashed rgba(255,255,255,0.15)',
                            }} />
                          )}
                          {/* Fill */}
                          {day.amount > 0 && !day.isFuture && (
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              height: `${pct}%`,
                              borderRadius: 5,
                              background: isOver
                                ? `linear-gradient(to top, ${catColor}, #FBBF24)`
                                : catColor,
                              transition: 'height 0.3s ease',
                            }} />
                          )}
                        </div>
                        <span style={{
                          fontSize: 8,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: day.isFuture ? 'rgba(255,255,255,0.08)'
                            : isOver ? '#FBBF24'
                            : day.amount > 0 ? 'rgba(255,255,255,0.3)'
                            : 'rgba(255,255,255,0.12)',
                        }}>
                          {day.isFuture ? '-' : (day.amount > 0 ? `€${Math.round(day.amount)}` : '-')}
                        </span>
                        <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.2)' }}>{day.dayNum}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Budget</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: catColor }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Spent</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FBBF24' }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Over</span>
                  </div>
                  <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.2)' }}>€{Math.round(dailyBudget)}/day</span>
                </div>
              </div>

              {/* 1E. Johnny Insight */}
              <div style={{ marginBottom: 16 }}>
                <JohnnyMessage variant="dark" from="Johnny">
                  {overBudgetDayCount > 0 ? (
                    <>You overspend on <strong style={{ color: '#FBBF24' }}>{overBudgetDayCount}</strong> out of {Math.min(7, daysElapsed)} days. Those days are <strong style={{ color: '#FBBF24' }}>{overBudgetSpendPct}%</strong> of total spending. Your big spending days are the pattern to watch.</>
                  ) : (
                    <>Every day under budget so far. That's rare — keep it up.</>
                  )}
                </JohnnyMessage>
              </div>

              {/* 1F. Transaction List */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  {selectedDay !== null ? `Day ${selectedDay} transactions` : 'Recent transactions'}
                </div>
                {filteredTxs.length > 0 ? filteredTxs.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{tx.description}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{format(parseISO(tx.date), 'MMM d')}</span>
                      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#F87171', fontWeight: 600 }}>-€{Number(tx.amount)}</span>
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
                      stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="4 4"
                    />
                    {/* Actual cumulative polyline */}
                    <polyline
                      fill="none"
                      stroke={catColor}
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
