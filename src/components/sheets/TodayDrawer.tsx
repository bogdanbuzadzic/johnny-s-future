import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { CheckCircle, AlertTriangle, Sparkles, X, Home, Zap, Bus, ArrowUp, ArrowDown, CircleCheck } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, getDate, getDaysInMonth, addMonths, format, addDays, differenceInDays } from 'date-fns';
import johnnyImage from '@/assets/johnny.png';
import { tipsByPersona } from '@/lib/personaMessaging';
import { WhatIfPanel, scenariosToForkConfig, type ActiveScenario, type ForkConfig } from './WhatIfPanel';
import { useApp } from '@/context/AppContext';
import { BudgetProvider } from '@/context/BudgetContext';
// PlanVsActualOverlay removed - now in CompareSheet

// ── Storage ──
const STORAGE_KEY = 'jfb-budget-data';

function readBudgetFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      config: parsed.config || { monthlyIncome: 0, monthlySavingsTarget: 0, setupComplete: false },
      categories: (parsed.categories || []) as Array<{ id: string; name: string; icon: string; monthlyBudget: number; type: string; sortOrder: number }>,
      transactions: (parsed.transactions || []) as Array<{ id: string; amount: number; type: string; categoryId: string; description: string; date: string; isRecurring: boolean }>,
    };
  } catch { return null; }
}

// ── Types ──
type TimeRange = '1M' | '3M' | '6M' | '1Y';

interface TerrainPoint {
  date: Date;
  balance: number;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  isSalaryDay: boolean;
  bill?: { icon: string; label: string; amount: number };
}

export interface TerrainForkData {
  active: boolean;
  label: string;
  color: string;
  points: TerrainPoint[];
  dangerMonth?: number;
  deltaLabel?: string;
}

interface TodayDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ── Persona tips ──
function getPersonaTip(): string {
  const persona = localStorage.getItem('jfb_persona') || 'default';
  const tips = tipsByPersona[persona] || tipsByPersona['default'];
  return tips[Math.floor(Math.random() * tips.length)];
}

// ── Data generation ──
function generateCashFlowPoints(
  range: TimeRange,
  income: number,
  totalFixed: number,
  flexBudget: number,
  flexSpent: number,
  bills: Array<{ day: number; icon: string; label: string; amount: number }>,
): TerrainPoint[] {
  const now = new Date();
  const dayOfMonth = getDate(now);
  const daysInCurrentMonth = getDaysInMonth(now);

  const totalMonths = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 12;
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = range === '1M'
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
    : addMonths(startDate, totalMonths);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  // Daily discretionary spending rate
  const dailySpend = flexBudget / daysInCurrentMonth;

  // Estimate current balance using cash flow model
  // On the 1st, balance = income. Then bills and spending subtract through month.
  let startBalance = income;
  // Subtract bills that already occurred this month
  bills.forEach(b => {
    if (b.day <= dayOfMonth) startBalance -= b.amount;
  });
  // Subtract daily spending for days passed
  startBalance -= dailySpend * Math.max(0, dayOfMonth - 1);

  // For weekly aggregation (6M/1Y)
  const useWeekly = range === '6M' || range === '1Y';
  const points: TerrainPoint[] = [];

  if (useWeekly) {
    let bal = startBalance;
    for (let w = 0; w < Math.ceil(totalDays / 7); w++) {
      const weekDate = addDays(startDate, w * 7);
      const weekDom = weekDate.getDate();
      const weekMonth = weekDate.getMonth();
      const isPast = weekDate < now;
      const isToday = w * 7 <= dayOfMonth && (w + 1) * 7 > dayOfMonth && weekMonth === now.getMonth();
      const isFuture = weekDate > now;
      const isSalaryDay = weekDom <= 7 && (weekMonth !== now.getMonth() || w === 0);

      if (w > 0) {
        // Check if salary day falls in this week
        if (weekDom <= 7 && weekMonth !== startDate.getMonth()) {
          bal += income; // Salary spike
        }
        bal -= dailySpend * 7;
        bills.forEach(b => {
          if (b.day >= weekDom && b.day < weekDom + 7) bal -= b.amount;
        });
      }

      points.push({
        date: weekDate,
        balance: Math.round(bal),
        isPast: isPast && !isToday,
        isToday: !!isToday,
        isFuture: isFuture && !isToday,
        isSalaryDay,
      });
    }
  } else {
    // Daily cash flow: sawtooth pattern
    let bal = income; // Day 1 of month 1 starts with salary
    for (let d = 0; d < totalDays; d++) {
      const date = addDays(startDate, d);
      const dom = date.getDate();
      const dateMonth = date.getMonth();
      const isPast = date < now && !(dom === dayOfMonth && dateMonth === now.getMonth());
      const isToday = dom === dayOfMonth && dateMonth === now.getMonth();
      const isFuture = date > now;
      const isSalaryDay = dom === 1;

      // On the 1st of each NEW month, salary arrives (spike UP)
      if (dom === 1 && d > 0) {
        bal += income;
      }

      // Subtract daily discretionary spending
      if (d > 0) {
        bal -= dailySpend;
      }

      // Check for bills due today (step DOWN)
      const dueBills = bills.filter(b => b.day === dom);
      let billForDisplay: { icon: string; label: string; amount: number } | undefined;
      if (dueBills.length > 0) {
        dueBills.forEach(b => { bal -= b.amount; });
        billForDisplay = dueBills[0]; // Show first bill icon
      }

      points.push({
        date,
        balance: Math.round(bal),
        isPast: isPast && !isToday,
        isToday,
        isFuture: isFuture && !isToday,
        isSalaryDay,
        bill: billForDisplay,
      });
    }
  }

  return points;
}

// ── Fork point generation (proper cash flow fork) ──
function generateForkPoints(
  basePoints: TerrainPoint[],
  forkCfg: ForkConfig,
  originalIncome: number,
  dailySpend: number,
  bills: Array<{ day: number; amount: number }>,
): TerrainPoint[] {
  const modifiedIncome = originalIncome * forkCfg.incomeMultiplier + forkCfg.extraMonthlyIncome;
  const extraDaily = forkCfg.extraMonthlyExpense / 30.4;
  const modifiedDailySpend = dailySpend + extraDaily;
  const daysInMonth = getDaysInMonth(new Date());

  // Rebuild cash flow with modified params
  const startDate = basePoints[0]?.date || new Date();
  let bal = basePoints[0]?.balance || 0;

  // Apply one-time expense immediately
  bal -= forkCfg.oneTimeExpense;

  const result: TerrainPoint[] = [];
  for (let i = 0; i < basePoints.length; i++) {
    const bp = basePoints[i];
    const dom = bp.date.getDate();
    const monthsSinceStart = Math.floor(i / 30);
    const withinDuration = forkCfg.durationMonths === 0 || monthsSinceStart < forkCfg.durationMonths;

    if (i === 0) {
      result.push({ ...bp, balance: Math.round(bal) });
      continue;
    }

    // Salary on 1st
    if (dom === 1) {
      const inc = withinDuration ? modifiedIncome : originalIncome;
      bal += inc;
    }

    // Bills
    const dueBills = bills.filter(b => b.day === dom);
    dueBills.forEach(b => { bal -= b.amount; });

    // Daily spend
    bal -= withinDuration ? modifiedDailySpend : dailySpend;

    result.push({ ...bp, balance: Math.round(bal) });
  }

  return result;
}

// ── Prepared fork (with 6-month emergency fund) ──
function generatePreparedForkPoints(
  basePoints: TerrainPoint[],
  forkCfg: ForkConfig,
  originalIncome: number,
  dailySpend: number,
  bills: Array<{ day: number; amount: number }>,
  monthlyExpenses: number,
): TerrainPoint[] {
  const emergencyFund = monthlyExpenses * 6;
  const modifiedCfg = { ...forkCfg };
  // Add emergency fund as starting balance boost (reduce one-time expense impact)
  const boostedPoints = generateForkPoints(basePoints, modifiedCfg, originalIncome, dailySpend, bills);
  return boostedPoints.map(p => ({ ...p, balance: Math.round(p.balance + emergencyFund) }));
}

// ── Custom events ──
interface CustomEvent {
  id: string;
  date: string; // ISO
  type: 'income' | 'expense';
  amount: number;
  label: string;
  recurring: boolean;
}

function readCustomEvents(): CustomEvent[] {
  try {
    return JSON.parse(localStorage.getItem('jfb_custom_events') || '[]');
  } catch { return []; }
}

function saveCustomEvents(events: CustomEvent[]) {
  localStorage.setItem('jfb_custom_events', JSON.stringify(events));
}

// ── SVG helpers ──
function buildPath(points: TerrainPoint[], width: number, height: number, padding = { top: 20, bottom: 10 }, externalMaxBal?: number, externalMinBal?: number): string {
  if (points.length === 0) return '';
  const maxBal = externalMaxBal ?? Math.max(...points.map(p => p.balance), 1);
  const minBal = externalMinBal ?? Math.min(...points.map(p => p.balance), 0);
  const range = maxBal - minBal || 1;
  const mapX = (i: number) => (i / (points.length - 1)) * width;
  const mapY = (bal: number) => {
    const norm = (bal - minBal) / range;
    return height - padding.bottom - norm * (height - padding.top - padding.bottom);
  };

  let path = `M ${mapX(0)} ${mapY(points[0].balance)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = { x: mapX(i - 1), y: mapY(points[i - 1].balance) };
    const curr = { x: mapX(i), y: mapY(points[i].balance) };
    const dx = curr.x - prev.x;
    path += ` C ${prev.x + dx * 0.4} ${prev.y} ${curr.x - dx * 0.4} ${curr.y} ${curr.x} ${curr.y}`;
  }
  return path;
}

function buildFillPath(points: TerrainPoint[], width: number, height: number, padding = { top: 20, bottom: 10 }, externalMaxBal?: number, externalMinBal?: number): string {
  const line = buildPath(points, width, height, padding, externalMaxBal, externalMinBal);
  if (!line) return '';
  const maxX = (points.length - 1) / (points.length - 1) * width;
  return `${line} L ${maxX} ${height} L 0 ${height} Z`;
}

// ── Main Component ──
function DrawerContent({ onClose }: { onClose: () => void }) {
  const { planVsActualMode, setPlanVsActualMode } = useApp();
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [tip] = useState(getPersonaTip);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(320);

  // What If panel state
  const [showWhatIfPanel, setShowWhatIfPanel] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<ActiveScenario[]>([]);
  const [showPrepared, setShowPrepared] = useState(false);

  // Custom events for direct terrain editing
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => readCustomEvents());
  const [eventPicker, setEventPicker] = useState<{ x: number; y: number; dayIdx: number } | null>(null);
  const [eventMode, setEventMode] = useState<'pick' | 'configure' | null>(null);
  const [eventType, setEventType] = useState<'income' | 'expense'>('expense');
  const [eventAmount, setEventAmount] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [eventRecurring, setEventRecurring] = useState(false);
  const [undoAction, setUndoAction] = useState<{ event: CustomEvent; action: 'add' | 'delete' } | null>(null);

  // Fork state
  const [forkData, setForkData] = useState<TerrainForkData | null>(null);

  // Read budget data fresh
  const budgetData = useMemo(() => readBudgetFromStorage(), []);

  useEffect(() => {
    if (chartRef.current) {
      setChartWidth(chartRef.current.offsetWidth - 24); // padding
    }
  }, []);

  const computed = useMemo(() => {
    const now = new Date();
    const dIM = getDaysInMonth(now);
    const dOM = getDate(now);
    const dR = dIM - dOM + 1;
    const pM = Math.round((dOM / dIM) * 100);

    if (!budgetData || !budgetData.config.setupComplete) {
      return {
        flexRemaining: 0, dailyAllowance: 0, percentSpent: 0, percentMonth: pM,
        paceStatus: 'on-track' as const, daysRemaining: dR, monthlyIncome: 0,
        flexBudget: 0, flexSpent: 0, totalFixed: 0, hasData: false,
      };
    }

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const { config, categories, transactions } = budgetData;
    const expenseCats = categories.filter(c => c.type === 'expense');
    const fixedCats = categories.filter(c => c.type === 'fixed');
    const totalFixed = fixedCats.reduce((s, c) => s + c.monthlyBudget, 0);
    const flexBudget = config.monthlyIncome - totalFixed - config.monthlySavingsTarget;

    const expenseCatIds = new Set(expenseCats.map(c => c.id));
    const flexSpent = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!expenseCatIds.has(t.categoryId)) return false;
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .reduce((s, t) => s + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0), 0);

    const flexRemaining = flexBudget - flexSpent;
    const dailyAllowance = dR > 0 ? Math.max(0, flexRemaining / dR) : 0;
    const percentSpent = flexBudget > 0 ? (flexSpent / flexBudget) * 100 : 0;
    const paceStatus: 'on-track' | 'watch' | 'slow-down' =
      percentSpent <= pM + 5 ? 'on-track' : percentSpent <= pM + 15 ? 'watch' : 'slow-down';

    return {
      flexRemaining, dailyAllowance, percentSpent, percentMonth: pM,
      paceStatus, daysRemaining: dR, monthlyIncome: config.monthlyIncome,
      flexBudget, flexSpent, totalFixed, hasData: true,
    };
  }, [budgetData]);

  // Build bills from fixed categories
  const bills = useMemo(() => {
    if (!budgetData) return [];
    const fixedCats = budgetData.categories.filter(c => c.type === 'fixed');
    return fixedCats.map((c, i) => ({
      day: Math.min(3 + i * 4, 28),
      icon: c.icon || 'Home',
      label: c.name,
      amount: c.monthlyBudget,
    }));
  }, [budgetData]);

  // Generate terrain points (incorporating custom events)
  const terrainPoints = useMemo(() => {
    if (!computed.hasData) return [];
    const basePoints = generateCashFlowPoints(
      timeRange,
      computed.monthlyIncome,
      computed.totalFixed,
      computed.flexBudget,
      computed.flexSpent,
      bills,
    );
    // Apply custom events to terrain
    if (customEvents.length === 0) return basePoints;
    return basePoints.map(p => {
      let bal = p.balance;
      customEvents.forEach(ev => {
        const evDate = new Date(ev.date);
        const sameDay = evDate.toDateString() === p.date.toDateString();
        const isRecurringMatch = ev.recurring && evDate.getDate() === p.date.getDate() && p.date >= evDate;
        if (sameDay || isRecurringMatch) {
          if (ev.type === 'income') bal += ev.amount;
          else bal -= ev.amount;
        }
      });
      return { ...p, balance: Math.round(bal) };
    });
  }, [timeRange, computed, bills, customEvents]);

  const chartHeight = showWhatIfPanel ? 140 : 200;
  const todayIdx = terrainPoints.findIndex(p => p.isToday);
  const allBalances = useMemo(() => {
    const bals = terrainPoints.map(p => p.balance);
    if (forkData?.active) bals.push(...forkData.points.map(p => p.balance));
    return bals;
  }, [terrainPoints, forkData]);
  const maxBal = Math.max(...allBalances, 1);
  const minBal = Math.min(...allBalances, 0);

  const mapX = useCallback((i: number) => (i / Math.max(terrainPoints.length - 1, 1)) * chartWidth, [terrainPoints.length, chartWidth]);
  const mapY = useCallback((bal: number) => {
    const range = maxBal - minBal || 1;
    const norm = (bal - minBal) / range;
    return chartHeight - 10 - norm * (chartHeight - 30);
  }, [maxBal, minBal, chartHeight]);

  // SVG paths — pass maxBal AND minBal so all lines share the SAME Y-axis scale
  const fillPath = useMemo(() => buildFillPath(terrainPoints, chartWidth, chartHeight, undefined, maxBal, minBal), [terrainPoints, chartWidth, chartHeight, maxBal, minBal]);
  const linePath = useMemo(() => buildPath(terrainPoints, chartWidth, chartHeight, undefined, maxBal, minBal), [terrainPoints, chartWidth, chartHeight, maxBal, minBal]);

  // Plan line (planned spending, no actuals) for Plan vs. Actual
  const planPoints = useMemo(() => {
    if (!planVsActualMode || !computed.hasData) return [];
    // Generate ideal cash flow using budget amounts only
    return generateCashFlowPoints(timeRange, computed.monthlyIncome, computed.totalFixed, computed.flexBudget, 0, bills);
  }, [planVsActualMode, timeRange, computed, bills]);
  const planLinePath = useMemo(() => {
    if (planPoints.length === 0) return '';
    return buildPath(planPoints, chartWidth, chartHeight, undefined, maxBal, minBal);
  }, [planPoints, chartWidth, chartHeight, maxBal, minBal]);

  // Plan vs Actual deviation fill
  const deviationFillPath = useMemo(() => {
    if (!planVsActualMode || planPoints.length === 0 || terrainPoints.length === 0) return '';
    const padding = { top: 20, bottom: 10 };
    const range = maxBal - minBal || 1;
    const mY = (bal: number) => {
      const norm = (bal - minBal) / range;
      return chartHeight - padding.bottom - norm * (chartHeight - padding.top - padding.bottom);
    };
    const mX = (i: number) => (i / Math.max(terrainPoints.length - 1, 1)) * chartWidth;
    let path = `M ${mX(0)} ${mY(terrainPoints[0].balance)}`;
    for (let i = 1; i < terrainPoints.length; i++) path += ` L ${mX(i)} ${mY(terrainPoints[i].balance)}`;
    const len = Math.min(terrainPoints.length, planPoints.length);
    for (let i = len - 1; i >= 0; i--) path += ` L ${mX(i)} ${mY(planPoints[i].balance)}`;
    path += ' Z';
    return path;
  }, [planVsActualMode, planPoints, terrainPoints, chartWidth, chartHeight]);

  // Determine if actual is above or below plan at today
  const actualAbovePlan = useMemo(() => {
    if (todayIdx < 0 || !planPoints[todayIdx]) return true;
    return terrainPoints[todayIdx]?.balance >= planPoints[todayIdx]?.balance;
  }, [todayIdx, terrainPoints, planPoints]);

  // Split past/future paths at today index
  const todayX = todayIdx >= 0 ? mapX(todayIdx) : 0;

  // ── Compute fork from active scenarios ──
  const forkConfig = useMemo<ForkConfig | null>(() => {
    if (activeScenarios.length === 0) return null;
    return scenariosToForkConfig(activeScenarios, computed.monthlyIncome, computed.totalFixed);
  }, [activeScenarios, computed.monthlyIncome, computed.totalFixed]);

  // Update fork data when scenarios change
  useEffect(() => {
    if (!forkConfig || terrainPoints.length === 0) {
      if (activeScenarios.length === 0) setForkData(null);
      return;
    }
    const dailySpend = computed.flexBudget / getDaysInMonth(new Date());
    const billDays = bills.map(b => ({ day: b.day, amount: b.amount }));
    const forkPts = generateForkPoints(terrainPoints, forkConfig, computed.monthlyIncome, dailySpend, billDays);
    const dangerIdx = forkPts.findIndex(p => p.balance <= 0);

    setForkData({
      active: true,
      label: forkConfig.label,
      color: forkConfig.type === 'shock' ? '#FBBF24' : '#34C759',
      points: forkPts,
      dangerMonth: dangerIdx >= 0 ? dangerIdx : undefined,
      deltaLabel: forkConfig.type === 'shock'
        ? (dangerIdx >= 0 ? `Broke month ${Math.ceil(dangerIdx / 30)}` : 'Survives')
        : `+€${Math.round(forkConfig.extraMonthlyIncome + (forkConfig.incomeMultiplier - 1) * computed.monthlyIncome)}/mo`,
    });
  }, [forkConfig, terrainPoints, computed, bills, activeScenarios.length]);

  // Prepared fork (emergency fund)
  const preparedForkPoints = useMemo(() => {
    if (!showPrepared || !forkConfig || terrainPoints.length === 0) return null;
    const dailySpend = computed.flexBudget / getDaysInMonth(new Date());
    const billDays = bills.map(b => ({ day: b.day, amount: b.amount }));
    const monthlyExpenses = computed.totalFixed + computed.flexBudget;
    return generatePreparedForkPoints(terrainPoints, forkConfig, computed.monthlyIncome, dailySpend, billDays, monthlyExpenses);
  }, [showPrepared, forkConfig, terrainPoints, computed, bills]);

  const preparedForkPath = useMemo(() => {
    if (!preparedForkPoints) return '';
    return buildPath(preparedForkPoints, chartWidth, chartHeight, undefined, maxBal, minBal);
  }, [preparedForkPoints, chartWidth, chartHeight, maxBal, minBal]);

  // ── Terrain direct editing handlers ──
  const handleChartClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!showWhatIfPanel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // Find closest point index
    const idx = Math.round((clickX / chartWidth) * (terrainPoints.length - 1));
    if (idx <= todayIdx || idx >= terrainPoints.length) return; // only future
    setEventPicker({ x: e.clientX, y: e.clientY, dayIdx: idx });
    setEventMode('pick');
    setEventAmount('');
    setEventLabel('');
    setEventRecurring(false);
  }, [showWhatIfPanel, chartWidth, terrainPoints.length, todayIdx]);

  const addCustomEvent = useCallback(() => {
    if (!eventPicker || !eventAmount) return;
    const amt = parseFloat(eventAmount);
    if (isNaN(amt) || amt <= 0) return;
    const point = terrainPoints[eventPicker.dayIdx];
    if (!point) return;
    const newEvent: CustomEvent = {
      id: Date.now().toString(),
      date: point.date.toISOString(),
      type: eventType,
      amount: amt,
      label: eventLabel || (eventType === 'income' ? 'Income' : 'Expense'),
      recurring: eventRecurring,
    };
    const updated = [...customEvents, newEvent];
    setCustomEvents(updated);
    saveCustomEvents(updated);
    setEventPicker(null);
    setEventMode(null);
    setUndoAction({ event: newEvent, action: 'add' });
    setTimeout(() => setUndoAction(null), 5000);
  }, [eventPicker, eventAmount, eventType, eventLabel, eventRecurring, customEvents, terrainPoints]);

  const handleUndo = useCallback(() => {
    if (!undoAction) return;
    if (undoAction.action === 'add') {
      const updated = customEvents.filter(e => e.id !== undoAction.event.id);
      setCustomEvents(updated);
      saveCustomEvents(updated);
    } else {
      const updated = [...customEvents, undoAction.event];
      setCustomEvents(updated);
      saveCustomEvents(updated);
    }
    setUndoAction(null);
  }, [undoAction, customEvents]);

  // Y-axis labels
  const yLabels = useMemo(() => {
    const labels: { value: number; y: number }[] = [];
    const range = maxBal - minBal || 1;
    const step = range > 5000 ? 2000 : range > 2000 ? 1000 : range > 1000 ? 500 : 250;
    const startVal = Math.ceil(Math.min(0, minBal) / step) * step;
    for (let v = startVal; v <= maxBal; v += step) {
      if (v === 0 && minBal >= 0) continue; // skip 0 if all positive (handled by zero ref line)
      labels.push({ value: v, y: mapY(v) });
    }
    return labels.slice(0, 5);
  }, [maxBal, minBal, mapY]);

  // X-axis labels
  const xLabels = useMemo(() => {
    const labels: { x: number; text: string }[] = [];
    if (timeRange === '1M') {
      const interval = Math.max(1, Math.floor(terrainPoints.length / 7));
      terrainPoints.forEach((p, i) => {
        if (i % interval === 0 || p.isToday) {
          labels.push({ x: mapX(i), text: p.isToday ? 'Today' : p.date.getDate().toString() });
        }
      });
    } else if (timeRange === '3M') {
      terrainPoints.forEach((p, i) => {
        if (p.date.getDate() === 15 || p.isToday) {
          labels.push({ x: mapX(i), text: p.isToday ? 'Today' : format(p.date, 'MMM') });
        }
      });
    } else {
      // 6M / 1Y: month abbreviations
      let lastMonth = -1;
      terrainPoints.forEach((p, i) => {
        const m = p.date.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          labels.push({ x: mapX(i), text: format(p.date, 'MMM') });
        }
      });
    }
    return labels;
  }, [timeRange, terrainPoints, mapX]);

  // Daily burn label
  const dailyBurn = computed.flexBudget > 0 ? Math.round(computed.flexBudget / getDaysInMonth(new Date())) : 0;

  // Salary spike label position
  const salaryIdx = terrainPoints.findIndex((p, i) => i > 0 && p.isSalaryDay);

  // Fork paths
  const forkLinePath = useMemo(() => {
    if (!forkData?.active || !forkData.points.length) return '';
    return buildPath(forkData.points, chartWidth, chartHeight, undefined, maxBal, minBal);
  }, [forkData, chartWidth, chartHeight, maxBal, minBal]);

  const forkFillPath = useMemo(() => {
    if (!forkData?.active || !forkData.points.length) return '';
    return buildFillPath(forkData.points, chartWidth, chartHeight, undefined, maxBal, minBal);
  }, [forkData, chartWidth, chartHeight, maxBal, minBal]);

  // Between-area fill (area between main and fork)
  const betweenFillPath = useMemo(() => {
    if (!forkData?.active || !forkData.points.length || terrainPoints.length === 0) return '';
    const padding = { top: 20, bottom: 10 };
    const range = maxBal - minBal || 1;
    const mY = (bal: number) => {
      const norm = (bal - minBal) / range;
      return chartHeight - padding.bottom - norm * (chartHeight - padding.top - padding.bottom);
    };
    const mX = (i: number) => (i / Math.max(terrainPoints.length - 1, 1)) * chartWidth;

    // Forward along main line, backward along fork line
    let path = `M ${mX(0)} ${mY(terrainPoints[0].balance)}`;
    for (let i = 1; i < terrainPoints.length; i++) {
      path += ` L ${mX(i)} ${mY(terrainPoints[i].balance)}`;
    }
    for (let i = forkData.points.length - 1; i >= 0; i--) {
      path += ` L ${mX(i)} ${mY(forkData.points[i].balance)}`;
    }
    path += ' Z';
    return path;
  }, [forkData, terrainPoints, chartWidth, chartHeight, maxBal, minBal]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 80) onClose();
  };

  const PaceIcon = computed.paceStatus === 'on-track' ? CheckCircle : AlertTriangle;
  const paceLabel = computed.paceStatus === 'on-track' ? 'On track' : computed.paceStatus === 'watch' ? 'Watch spending' : 'Over pace';
  const paceColor = computed.paceStatus === 'on-track' ? '#34C759' : '#FF9F0A';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
        style={{
          height: '85vh',
          background: 'linear-gradient(180deg, #1A1525 0%, #2D1F3D 100%)',
          borderRadius: '24px 24px 0 0',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <span className="text-lg font-bold text-white">Financial Overview</span>

          {/* Time range toggle */}
          <div className="flex gap-[3px] rounded-[10px] p-[3px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {(['1M', '3M', '6M', '1Y'] as TimeRange[]).map(r => (
              <button
                key={r}
                className="rounded-lg transition-all duration-200"
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: timeRange === r ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
                  background: timeRange === r ? 'rgba(139,92,246,0.25)' : 'transparent',
                }}
                onClick={() => setTimeRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-[10px] px-5 pb-4">
          {/* Available this month */}
          <div className="rounded-2xl p-4" style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div className="flex items-start justify-between">
              <span className="text-[11px] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Available this month</span>
              {/* Status badge */}
              <span className="text-[10px] font-medium rounded-full px-1.5 py-0.5"
                style={{ background: `${paceColor}26`, color: paceColor }}>
                {paceLabel}
              </span>
            </div>
            <p className="text-[28px] font-bold text-white mt-1">€{Math.round(computed.flexRemaining).toLocaleString()}</p>
            {/* Pace bar */}
            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #EC4899)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(computed.percentSpent, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {Math.round(computed.percentSpent)}% spent — {computed.percentMonth}% of month passed
            </p>
          </div>

          {/* Daily rate */}
          <div className="rounded-2xl p-4 relative overflow-hidden" style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span className="text-[11px] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Daily rate</span>
            <p className="text-[28px] font-bold text-white mt-1">
              €{Math.round(computed.dailyAllowance)}
              <span className="text-lg font-normal"> / day</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              remaining for the next {computed.daysRemaining} days
            </p>
            {/* Small Johnny */}
            <img
              src={johnnyImage}
              alt=""
              className="absolute bottom-2 right-2 w-10 h-10 object-contain"
              style={{ opacity: 0.3 }}
            />
          </div>
        </div>

        {/* Terrain Chart Card */}
        <div ref={chartRef} className="mx-5 rounded-[20px] overflow-hidden transition-all duration-300" style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 12px 12px',
        }}>
          {/* Tap hint when panel is open */}
          {showWhatIfPanel && (
            <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Tap the timeline to add events
            </p>
          )}
          {terrainPoints.length > 0 ? (
            <div className="relative">
              <svg
                width={chartWidth}
                height={chartHeight}
                className="block"
                style={{ cursor: showWhatIfPanel ? 'crosshair' : undefined }}
                onClick={handleChartClick}
              >
                <defs>
                  <linearGradient id="drawerTerrainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                    <stop offset="40%" stopColor="#A855F7" stopOpacity={0.25} />
                    <stop offset="70%" stopColor="#EC4899" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#F97316" stopOpacity={0.08} />
                  </linearGradient>
                  {forkData?.active && (
                    <linearGradient id="forkFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={forkData.color} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={forkData.color} stopOpacity={0.02} />
                    </linearGradient>
                  )}
                  <clipPath id="drawerPastClip">
                    <rect x="0" y="0" width={todayX} height={chartHeight} />
                  </clipPath>
                  <clipPath id="drawerFutureClip">
                    <rect x={todayX} y="0" width={chartWidth - todayX} height={chartHeight} />
                  </clipPath>
                </defs>

                {/* Y-axis gridlines */}
                {yLabels.map(l => (
                  <line key={l.value} x1={0} y1={l.y} x2={chartWidth} y2={l.y}
                    stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="4 4" />
                ))}

                {/* Zero reference line */}
                <line x1={0} y1={chartHeight - 10} x2={chartWidth} y2={chartHeight - 10}
                  stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" />

                {/* Terrain fill */}
                <path d={fillPath} fill="url(#drawerTerrainGrad)" />

                {/* Between-area fill (main vs fork) */}
                {forkData?.active && betweenFillPath && (
                  <path d={betweenFillPath} fill={forkData.color === '#FBBF24' ? 'rgba(251,191,36,0.06)' : 'rgba(52,199,89,0.06)'} />
                )}

                {/* Past line (solid) */}
                <path d={linePath} fill="none"
                  stroke="rgba(255,255,255,0.9)" strokeWidth={2.5}
                  clipPath="url(#drawerPastClip)" />

                {/* Future line (dashed) */}
                <path d={linePath} fill="none"
                  stroke="rgba(255,255,255,0.5)" strokeWidth={2}
                  strokeDasharray="6 4"
                  clipPath="url(#drawerFutureClip)" />

                {/* Plan vs Actual: deviation fill */}
                {planVsActualMode && deviationFillPath && (
                  <path d={deviationFillPath} fill={actualAbovePlan ? 'rgba(52,199,89,0.06)' : 'rgba(251,191,36,0.06)'} />
                )}
                {/* Plan vs Actual: plan line (dashed purple) */}
                {planVsActualMode && planLinePath && (
                  <path d={planLinePath} fill="none"
                    stroke="rgba(139,92,246,0.5)" strokeWidth={1.5}
                    strokeDasharray="4 4" />
                )}

                {/* Fork line */}
                {forkData?.active && forkLinePath && (
                  <path d={forkLinePath} fill="none"
                    stroke={forkData.color} strokeWidth={2}
                    strokeDasharray="8 4" opacity={0.8} />
                )}

                {/* Prepared fork line (green dashed) */}
                {preparedForkPath && (
                  <path d={preparedForkPath} fill="none"
                    stroke="#34C759" strokeWidth={2}
                    strokeDasharray="8 4" opacity={0.6} />
                )}

                {/* Today marker */}
                {todayIdx >= 0 && (
                  <line x1={todayX} y1={0} x2={todayX} y2={chartHeight}
                    stroke="rgba(255,255,255,0.3)" strokeWidth={1} strokeDasharray="3 3" />
                )}

                {/* Y-axis labels (right side) */}
                {yLabels.map(l => (
                  <text key={`yl-${l.value}`} x={chartWidth - 4} y={l.y - 4}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.25)" fontSize={9}>
                    €{l.value >= 1000 ? `${(l.value / 1000).toFixed(l.value % 1000 === 0 ? 0 : 1)}k` : l.value}
                  </text>
                ))}

                {/* Salary spike label */}
                {salaryIdx >= 0 && (timeRange === '1M' || timeRange === '3M') && (
                  <g>
                    <rect
                      x={mapX(salaryIdx) - 28} y={mapY(terrainPoints[salaryIdx].balance) - 18}
                      width={56} height={16} rx={4}
                      fill="rgba(39,174,96,0.2)"
                    />
                    <text
                      x={mapX(salaryIdx)} y={mapY(terrainPoints[salaryIdx].balance) - 7}
                      textAnchor="middle" fill="#34C759" fontSize={10} fontWeight={600}>
                      €{computed.monthlyIncome.toLocaleString()}
                    </text>
                  </g>
                )}

                {/* Bill icons (1M and 3M only) */}
                {(timeRange === '1M' || timeRange === '3M') && terrainPoints.map((p, i) => {
                  if (!p.bill || p.isPast) return null;
                  const x = mapX(i);
                  const y = mapY(p.balance);
                  return (
                    <g key={`bill-${i}`}>
                      <rect x={x - 11} y={y - 24} width={22} height={22} rx={6}
                        fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                      <foreignObject x={x - 11} y={y - 24} width={22} height={22}>
                        <div className="w-full h-full flex items-center justify-center">
                          {p.bill.icon === 'Home' && <Home size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />}
                          {p.bill.icon === 'Zap' && <Zap size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />}
                          {p.bill.icon === 'Bus' && <Bus size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Burn rate label near future dashed line */}
                {todayIdx >= 0 && todayIdx < terrainPoints.length - 3 && (
                  <g>
                    <rect
                      x={mapX(todayIdx + 2) - 30}
                      y={mapY(terrainPoints[Math.min(todayIdx + 3, terrainPoints.length - 1)].balance) + 8}
                      width={60} height={14} rx={4}
                      fill="rgba(255,255,255,0.06)"
                    />
                    <text
                      x={mapX(todayIdx + 2)}
                      y={mapY(terrainPoints[Math.min(todayIdx + 3, terrainPoints.length - 1)].balance) + 18}
                      textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>
                      ~€{dailyBurn}/day
                    </text>
                  </g>
                )}

                {/* Today label */}
                {todayIdx >= 0 && (
                  <text x={todayX} y={chartHeight - 2} textAnchor="middle"
                    fill="rgba(255,255,255,0.5)" fontSize={10}>
                    Today
                  </text>
                )}

                {/* Danger marker (fork) */}
                {forkData?.active && forkData.dangerMonth !== undefined && (
                  <g>
                    <circle
                      cx={mapX(forkData.dangerMonth)}
                      cy={mapY(0)}
                      r={4}
                      fill="#EF4444"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }}
                    />
                    <text
                      x={mapX(forkData.dangerMonth)}
                      y={mapY(0) + 14}
                      textAnchor="middle" fill="#EF4444" fontSize={9}>
                      Broke
                    </text>
                  </g>
                )}

                {/* Recovery marker */}
                {forkData?.active && forkData.dangerMonth !== undefined && (() => {
                  const recoveryIdx = forkData.points.findIndex((p, i) => i > forkData.dangerMonth! && p.balance > 0);
                  if (recoveryIdx < 0) return null;
                  return (
                    <g>
                      <circle cx={mapX(recoveryIdx)} cy={mapY(forkData.points[recoveryIdx].balance)} r={4} fill="#34C759" />
                      <text x={mapX(recoveryIdx)} y={mapY(forkData.points[recoveryIdx].balance) - 8}
                        textAnchor="middle" fill="#34C759" fontSize={9}>
                        Recovers
                      </text>
                    </g>
                  );
                })()}
              </svg>

              {/* Johnny on the line at today */}
              {todayIdx >= 0 && (
                <motion.img
                  src={johnnyImage}
                  alt="Johnny"
                  className="absolute pointer-events-none"
                  style={{
                    width: 36, height: 36,
                    left: todayX - 18,
                    top: mapY(terrainPoints[todayIdx].balance) - 33,
                  }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                />
              )}

              {/* Ghost Johnny on fork */}
              {forkData?.active && todayIdx >= 0 && forkData.points[todayIdx] && (
                <img
                  src={johnnyImage}
                  alt=""
                  className="absolute pointer-events-none"
                  style={{
                    width: 30, height: 30,
                    left: todayX - 15,
                    top: mapY(forkData.points[todayIdx].balance) - 27,
                    opacity: 0.35,
                    filter: 'grayscale(30%)',
                  }}
                />
              )}

              {/* X-axis labels */}
              <div className="flex justify-between mt-1 px-1">
                {xLabels.map((l, i) => (
                  <span key={i} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {l.text}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center" style={{ height: chartHeight }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Complete Clarity to see your financial terrain</p>
            </div>
          )}
        </div>

        {/* Plan vs Actual overlay section */}
        {planVsActualMode && computed.hasData && (
          <div className="mx-5 mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-white">Plan vs. Actual</span>
              <button onClick={() => setPlanVsActualMode(false)}>
                <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '8px 0' }}>
                Plan vs. Actual is now in Compare on My Money.
              </div>
          </div>
        )}

        {/* Fork legend */}
        <AnimatePresence>
          {forkData?.active && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mt-2 flex items-center gap-2 rounded-lg px-[10px] py-[6px] flex-wrap"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Current</span>
              <div className="w-2 h-2 rounded-full" style={{ background: forkData.color }} />
              <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{forkData.label}</span>
              {showPrepared && (
                <>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#34C759' }} />
                  <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Prepared</span>
                </>
              )}
              {forkData.deltaLabel && (
                <span className="text-[10px] rounded px-1.5 py-0.5 ml-auto" style={{
                  background: forkData.color === '#FBBF24' ? 'rgba(239,68,68,0.15)' : 'rgba(52,199,89,0.15)',
                  color: forkData.color === '#FBBF24' ? '#FCA5A5' : '#86EFAC',
                }}>
                  {forkData.deltaLabel}
                </span>
              )}
              <button onClick={() => { setForkData(null); setActiveScenarios([]); setShowPrepared(false); }}>
                <X size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event picker popup (terrain direct editing) */}
        <AnimatePresence>
          {eventPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="fixed z-[60]"
              style={{
                left: Math.min(eventPicker.x - 80, window.innerWidth - 180),
                top: eventPicker.y - (eventMode === 'configure' ? 200 : 120),
              }}
            >
              <div style={{
                background: 'rgba(20, 15, 30, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 10,
                minWidth: 160,
              }}>
                {eventMode === 'pick' ? (
                  <>
                    <button
                      className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg"
                      style={{ color: 'white' }}
                      onClick={() => { setEventType('income'); setEventMode('configure'); }}
                    >
                      <ArrowUp size={16} style={{ color: '#34C759' }} />
                      <div>
                        <p className="text-[13px] text-white text-left">Income</p>
                        <p className="text-[10px] text-left" style={{ color: 'rgba(255,255,255,0.25)' }}>One-time or recurring</p>
                      </div>
                    </button>
                    <button
                      className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg"
                      onClick={() => { setEventType('expense'); setEventMode('configure'); }}
                    >
                      <ArrowDown size={16} style={{ color: '#EF4444' }} />
                      <div>
                        <p className="text-[13px] text-white text-left">Expense</p>
                        <p className="text-[10px] text-left" style={{ color: 'rgba(255,255,255,0.25)' }}>One-time or recurring</p>
                      </div>
                    </button>
                    <button
                      className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg"
                      onClick={() => { setEventPicker(null); setEventMode(null); }}
                    >
                      <X size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</p>
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="€ Amount"
                      value={eventAmount}
                      onChange={e => setEventAmount(e.target.value)}
                      autoFocus
                      className="w-full h-9 rounded-lg px-3 text-[13px] outline-none mb-1.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <input
                      placeholder="Label (optional)"
                      value={eventLabel}
                      onChange={e => setEventLabel(e.target.value)}
                      className="w-full h-9 rounded-lg px-3 text-[13px] outline-none mb-1.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    {/* One-time / Monthly toggle */}
                    <div className="flex gap-1 mb-2">
                      <button
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{
                          background: !eventRecurring ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                          color: !eventRecurring ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
                        }}
                        onClick={() => setEventRecurring(false)}
                      >One-time</button>
                      <button
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{
                          background: eventRecurring ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                          color: eventRecurring ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
                        }}
                        onClick={() => setEventRecurring(true)}
                      >Monthly</button>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        className="flex-1 h-9 rounded-lg text-[12px] font-semibold"
                        style={{ background: 'rgba(139,92,246,0.2)', color: '#8B5CF6' }}
                        onClick={addCustomEvent}
                      >Add</button>
                      <button
                        className="h-9 px-3 rounded-lg text-[12px]"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                        onClick={() => { setEventPicker(null); setEventMode(null); }}
                      >Cancel</button>
                    </div>
                  </>
                )}
              </div>
              {/* Arrow pointer */}
              <div className="flex justify-center">
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(20, 15, 30, 0.95)',
                }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "What if?" button / Panel */}
        <div className="mx-5 mt-4">
          <AnimatePresence mode="wait">
            {!showWhatIfPanel ? (
              <motion.button
                key="whatif-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-12 rounded-[14px] flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1.5px solid rgba(139,92,246,0.25)',
                  color: '#8B5CF6',
                  fontSize: 15,
                  fontWeight: 600,
                }}
                onClick={() => setShowWhatIfPanel(true)}
              >
                <Sparkles size={18} style={{ color: '#8B5CF6' }} />
                What if?
              </motion.button>
            ) : (
              <WhatIfPanel
                key="whatif-panel"
                onClose={() => {
                  setShowWhatIfPanel(false);
                  setEventPicker(null);
                  setEventMode(null);
                }}
                activeScenarios={activeScenarios}
                setActiveScenarios={setActiveScenarios}
                showPrepared={showPrepared}
                setShowPrepared={setShowPrepared}
                forkConfig={forkConfig}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Undo toast */}
        <AnimatePresence>
          {undoAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2.5"
              style={{
                background: 'rgba(20, 15, 30, 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 16px',
              }}
            >
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Event {undoAction.action === 'add' ? 'added' : 'removed'}
              </span>
              <button
                className="text-[12px] font-bold"
                style={{ color: '#8B5CF6' }}
                onClick={handleUndo}
              >Undo</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Johnny's Note */}
        <div className="mx-5 mt-3 mb-8 flex items-start gap-[10px] rounded-[14px] p-3" style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <img src={johnnyImage} alt="Johnny" className="w-9 h-9 object-contain flex-shrink-0" />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{tip}</p>
        </div>
      </motion.div>
    </>
  );
}

// ── Export: activateTerrainFork API ──
export function activateTerrainFork(_scenario: {
  label: string;
  type: 'shock' | 'positive';
  modifiedIncome?: number;
  modifiedFixed?: number;
  modifiedSpending?: number;
  durationMonths?: number;
  oneTimeExpense?: number;
}) {
  // Stub - fork activation now handled via WhatIfPanel within the drawer
}

// ── Wrapper ──
export function TodayDrawer({ open, onClose }: TodayDrawerProps) {
  return (
    <AnimatePresence>
      {open && <DrawerContent onClose={onClose} />}
    </AnimatePresence>
  );
}
