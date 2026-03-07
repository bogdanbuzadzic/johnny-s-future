import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Zap, Shield, ShoppingCart, Smartphone, Music, Dumbbell, Wallet,
  Sparkles, ArrowUp, ArrowDown, CircleCheck, CircleX, Scissors, LucideIcon,
  CreditCard, UtensilsCrossed, Car,
} from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';
import { useSimulation, TerrainSimulation } from '@/context/SimulationContext';
import { format, addDays, startOfMonth, differenceInDays, isSameDay } from 'date-fns';

// --- Types ---
interface BillEvent {
  name: string;
  amount: number;
  icon: LucideIcon;
  date: Date;
}

interface IncomeEvent {
  name: string;
  amount: number;
  icon: LucideIcon;
  date: Date;
}

interface TerrainPoint {
  dayIndex: number;
  date: Date;
  balance: number;
  income: number;
  expenses: number;
  dailySpend: number;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  bills: BillEvent[];
  incomeItems: IncomeEvent[];
}

// --- Constants ---
const DAY_WIDTH = 44;
const TERRAIN_HEIGHT = 220;
const DATE_AXIS_HEIGHT = 32;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 10;

// --- Date constants ---
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

// --- Read budget data from localStorage ---
const STORAGE_KEY = 'jfb-budget-data';

interface BudgetTerrainData {
  bills: BillEvent[];
  income: IncomeEvent[];
  isProjection: boolean;
  hasRealData: boolean;
  isEmpty: boolean;
  monthlyIncome: number;
  flexBudget: number;
  totalFixed: number;
  savings: number;
  dailySpendRate: number;
  fixedCats: Array<{ name: string; icon: string; monthlyBudget: number }>;
}

function readBudgetForTerrain(): BudgetTerrainData {
  const empty: BudgetTerrainData = { bills: [], income: [], isProjection: false, hasRealData: false, isEmpty: true, monthlyIncome: 0, flexBudget: 0, totalFixed: 0, savings: 0, dailySpendRate: 0, fixedCats: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const config = parsed.config || {};
    const categories = (parsed.categories || []) as any[];
    const transactions = (parsed.transactions || []) as any[];

    if (!config.setupComplete) return empty;

    const mi = Number(config.monthlyIncome) || 0;
    if (mi === 0) return empty;

    const fixedCats = categories.filter((c: any) => c.type === 'fixed');
    const totalFixed = fixedCats.reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);
    const savings = Number(config.monthlySavingsTarget) || 0;
    const flexBudget = mi - totalFixed - savings;

    const billDays = [1, 15, 28, 28, 5, 10];
    const getBillIcon = (name: string): LucideIcon => {
      const n = name.toLowerCase();
      if (n.includes('rent') || n.includes('mortgage') || n.includes('hous')) return Home;
      if (n.includes('util') || n.includes('electric') || n.includes('gas') || n.includes('water') || n.includes('energy')) return Zap;
      if (n.includes('insur') || n.includes('health')) return Shield;
      if (n.includes('transport') || n.includes('car') || n.includes('fuel')) return Car;
      if (n.includes('phone') || n.includes('mobile') || n.includes('internet') || n.includes('wifi')) return Smartphone;
      if (n.includes('gym') || n.includes('fitness')) return Dumbbell;
      if (n.includes('music') || n.includes('spotify') || n.includes('netflix') || n.includes('subscri')) return Music;
      if (n.includes('grocer') || n.includes('food')) return UtensilsCrossed;
      if (n.includes('shop')) return ShoppingCart;
      return CreditCard;
    };

    const bills: BillEvent[] = fixedCats.map((c: any, i: number) => ({
      name: c.name,
      amount: Number(c.monthlyBudget) || 0,
      icon: getBillIcon(c.name),
      date: new Date(currentYear, currentMonth, billDays[i % billDays.length]),
    }));

    const incomeEvents: IncomeEvent[] = [
      { name: 'Salary', amount: mi, icon: Wallet, date: new Date(currentYear, currentMonth, 1) },
    ];

    // Compute actual spending this month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const expenseCats = categories.filter((c: any) => c.type === 'expense');
    const expenseCatIds = new Set(expenseCats.map((c: any) => c.id));
    const monthTx = transactions.filter((t: any) => {
      if (t.type !== 'expense') return false;
      if (!expenseCatIds.has(t.categoryId)) return false;
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalSpent = monthTx.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const pastDays = Math.max(dayOfMonth - 1, 1);
    const dailySpendRate = totalSpent > 0 ? totalSpent / pastDays : flexBudget / 30;

    const hasRealData = transactions.length > 0;

    console.log('Terrain data:', { monthlyIncome: mi, flexBudget, totalFixed, savings, dailySpendRate, hasRealData, txCount: transactions.length });

    return {
      bills,
      income: incomeEvents,
      isProjection: !hasRealData,
      hasRealData,
      isEmpty: false,
      monthlyIncome: mi,
      flexBudget,
      totalFixed,
      savings,
      dailySpendRate,
      fixedCats: fixedCats.map((c: any) => ({ name: c.name, icon: c.icon || 'Home', monthlyBudget: Number(c.monthlyBudget) || 0 })),
    };
  } catch (e) {
    console.error('Terrain data read error:', e);
    return empty;
  }
}

// --- Marker size helper ---
function getMarkerSize(amount: number) {
  if (amount < 50) return { w: 18, h: 18, icon: 10, font: 8 };
  if (amount < 200) return { w: 24, h: 24, icon: 12, font: 9 };
  return { w: 30, h: 30, icon: 14, font: 10 };
}

// --- Helper: Build terrain data with SAWTOOTH cash flow (1 point per day) ---
// Balance spikes UP on salary day (1st), declines daily from spending,
// step-drops at bill due dates. This repeats each month.
function buildTerrainData(
  budgetData: BudgetTerrainData,
  simulations: TerrainSimulation[],
): TerrainPoint[] {
  const { monthlyIncome, dailySpendRate, bills, income: incomeEvents, savings } = budgetData;

  if (monthlyIncome <= 0) return [];

  const now = new Date();
  // Start 10 days before month start so first salary spike is always visible
  const monthStart = addDays(startOfMonth(now), -10);
  const totalDays = 70; // ~2.3 months: ensures two full salary spikes visible

  // Map bills by day-of-month (they recur monthly)
  const billsByDom = new Map<number, BillEvent[]>();
  bills.forEach(b => {
    const d = b.date.getDate();
    if (!billsByDom.has(d)) billsByDom.set(d, []);
    billsByDom.get(d)!.push(b);
  });

  // Read goals total
  const goalsTotal = (() => {
    try {
      const goals = JSON.parse(localStorage.getItem('jfb_goals') || '[]');
      return goals.reduce((s: number, g: any) => s + (Number(g.monthlyContribution) || 0), 0);
    } catch { return 0; }
  })();

  let balance = 0;
  const points: TerrainPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(monthStart, i);
    const dom = date.getDate();
    const isPast = date < now && !isSameDay(date, now);
    const isToday = isSameDay(date, now);
    const isFuture = date > now;
    const isMonthStart = dom === 1;

    let dayIncome = 0;
    let dayExpenses = 0;
    let dayBills: BillEvent[] = [];
    let dayIncomeItems: IncomeEvent[] = [];

    // SALARY on 1st of each month — creates the upward SPIKE
    if (isMonthStart) {
      if (i > 0) balance += monthlyIncome;
      else balance = monthlyIncome; // First day starts at income
      dayIncome = monthlyIncome;
      dayIncomeItems = incomeEvents;
      // Auto-deductions on salary day
      balance -= savings + goalsTotal;
    }

    // BILLS due today — creates step-DROP
    const dueBills = billsByDom.get(dom) || [];
    dueBills.forEach(b => {
      balance -= b.amount;
      dayExpenses += b.amount;
    });
    dayBills = [...dueBills];

    // DAILY discretionary spending — creates gradual DECLINE
    if (i > 0) {
      balance -= dailySpendRate;
    }

    // SIMULATIONS (playground mode)
    const daySims = simulations.filter(s => s.dayIndex === i);
    const simExp = daySims.filter(s => s.type === 'add-expense').reduce((s, x) => s + x.amount, 0);
    const simInc = daySims.filter(s => s.type === 'add-income').reduce((s, x) => s + x.amount, 0);
    const cancelled = daySims.filter(s => s.type === 'cancel-bill');

    balance -= simExp;
    balance += simInc;
    cancelled.forEach(c => { balance += c.amount; });
    dayExpenses += simExp;
    dayIncome += simInc;
    dayBills = dayBills.filter(b => !cancelled.some(c => c.description === b.name));

    points.push({
      dayIndex: i,
      date,
      balance: Math.max(0, Math.round(balance)),
      income: dayIncome,
      expenses: dayExpenses,
      dailySpend: dailySpendRate,
      isPast,
      isToday,
      isFuture,
      bills: dayBills,
      incomeItems: dayIncomeItems,
    });
  }

  return points;
}

// --- BUG 1 FIX: Build split path points for smooth U-valleys ---
// For transaction days, insert pre/post fractional points to create slopes
interface PathPoint {
  x: number;
  y: number;
  dayIndex: number; // original day index (integer)
}

function buildPathPoints(
  points: TerrainPoint[],
  maxBalance: number,
  height: number,
): PathPoint[] {
  const mapY = (balance: number) => {
    const normalized = balance / Math.max(maxBalance, 1);
    return height - PADDING_BOTTOM - normalized * (height - PADDING_TOP - PADDING_BOTTOM);
  };

  const result: PathPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prevBalance = i > 0 ? points[i - 1].balance : curr.balance;
    const hasExpense = curr.expenses > 0;
    const hasIncome = curr.income > 0;

    if (hasExpense && hasIncome) {
      // Both on same day: pre-point at prev balance, valley at post-expense, then post-income
      const postExpenseBalance = Math.max(0, prevBalance - curr.expenses - curr.dailySpend);
      result.push({ x: (i - 0.3) * DAY_WIDTH, y: mapY(prevBalance), dayIndex: i });
      result.push({ x: (i) * DAY_WIDTH, y: mapY(postExpenseBalance), dayIndex: i });
      result.push({ x: (i + 0.3) * DAY_WIDTH, y: mapY(curr.balance), dayIndex: i });
    } else if (hasExpense) {
      // Expense: pre-point at prev balance, then drop
      result.push({ x: (i - 0.2) * DAY_WIDTH, y: mapY(prevBalance), dayIndex: i });
      result.push({ x: (i + 0.2) * DAY_WIDTH, y: mapY(curr.balance), dayIndex: i });
    } else if (hasIncome) {
      // Income: pre-point at prev balance, then rise
      result.push({ x: (i - 0.2) * DAY_WIDTH, y: mapY(prevBalance), dayIndex: i });
      result.push({ x: (i + 0.2) * DAY_WIDTH, y: mapY(curr.balance), dayIndex: i });
    } else {
      // Normal day
      result.push({ x: i * DAY_WIDTH, y: mapY(curr.balance), dayIndex: i });
    }
  }

  // Enforce minimum 30px gap between valley floor and adjacent peaks
  for (let i = 1; i < result.length - 1; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    const next = result[i + 1];
    // If this is a valley (lower than neighbors)
    if (curr.y > prev.y && curr.y > next.y) {
      // Ensure at least 30px from prev and next
      if (curr.x - prev.x < 30) {
        result[i - 1].x = curr.x - 30;
      }
      if (next.x - curr.x < 30) {
        result[i + 1].x = curr.x + 30;
      }
    }
  }

  return result;
}

// --- BUG 3 FIX: Interpolate terrain Y at any x-position ---
function getTerrainYAtX(xPosition: number, pathPoints: PathPoint[]): number {
  if (pathPoints.length === 0) return TERRAIN_HEIGHT - PADDING_BOTTOM;
  if (xPosition <= pathPoints[0].x) return pathPoints[0].y;
  if (xPosition >= pathPoints[pathPoints.length - 1].x) return pathPoints[pathPoints.length - 1].y;

  for (let i = 0; i < pathPoints.length - 1; i++) {
    if (pathPoints[i].x <= xPosition && pathPoints[i + 1].x >= xPosition) {
      const left = pathPoints[i];
      const right = pathPoints[i + 1];
      const t = (xPosition - left.x) / (right.x - left.x || 1);
      return left.y + t * (right.y - left.y);
    }
  }
  return pathPoints[pathPoints.length - 1].y;
}

// --- Build SVG terrain fill path from path points with smooth beziers ---
function buildTerrainPath(pathPoints: PathPoint[], height: number): string {
  if (pathPoints.length === 0) return '';

  let path = `M 0 ${height}`;
  path += ` L ${pathPoints[0].x} ${pathPoints[0].y}`;

  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const dx = curr.x - prev.x;
    // Smooth bezier with horizontal control points at ~40% distance
    const cpx1 = prev.x + dx * 0.4;
    const cpx2 = curr.x - dx * 0.4;
    path += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
  }

  const lastX = pathPoints[pathPoints.length - 1].x;
  path += ` L ${lastX} ${height}`;
  path += ' Z';

  return path;
}

// --- Build surface-only path (no closure) ---
function buildSurfacePath(pathPoints: PathPoint[]): string {
  if (pathPoints.length === 0) return '';

  let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;

  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const dx = curr.x - prev.x;
    const cpx1 = prev.x + dx * 0.4;
    const cpx2 = curr.x - dx * 0.4;
    path += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
  }

  return path;
}

// --- Find longest gradual stretch ---
function findLongestGradualStretch(points: TerrainPoint[]): { start: number; end: number } | null {
  let longest = { start: 0, end: 0, len: 0 };
  let current = { start: 0, len: 0 };

  for (let i = 0; i < points.length; i++) {
    if (points[i].expenses === 0 && points[i].income === 0) {
      if (current.len === 0) current.start = i;
      current.len++;
    } else {
      if (current.len > longest.len) {
        longest = { start: current.start, end: current.start + current.len - 1, len: current.len };
      }
      current = { start: 0, len: 0 };
    }
  }
  if (current.len > longest.len) {
    longest = { start: current.start, end: current.start + current.len - 1, len: current.len };
  }

  return longest.len >= 3 ? { start: longest.start, end: longest.end } : null;
}

// --- BUG 2 FIX: Collision-based stagger using x-position ---
interface MarkerRenderInfo {
  key: string;
  x: number;
  type: 'expense' | 'income';
  dayIndex: number;
  yOffset: number;
}

function computeMarkerStagger(markers: Omit<MarkerRenderInfo, 'yOffset'>[]): Map<string, number> {
  const sorted = [...markers].sort((a, b) => a.x - b.x);
  const offsets = new Map<string, number>();
  const minGap = 40;
  const staggerStep = 36;

  for (let i = 0; i < sorted.length; i++) {
    let offset = 0;
    for (let j = 0; j < i; j++) {
      if (Math.abs(sorted[i].x - sorted[j].x) < minGap) {
        const prevOffset = offsets.get(sorted[j].key) || 0;
        offset = Math.max(offset, prevOffset + staggerStep);
      }
    }
    offsets.set(sorted[i].key, offset);
  }

  return offsets;
}

// --- Main Component ---
export function TerrainPath() {
  const {
    terrainSimulations,
    addTerrainSimulation,
    removeTerrainSimulation,
    clearAllSimulations,
    isSimulating,
    playgroundMode,
    selectedTool,
    setPlaygroundMode,
    setSelectedTool,
    monthlyIncome,
    averageDailySpend,
    simulatedDailyAllowance,
    dailyAllowance,
  } = useSimulation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTodayPill, setShowTodayPill] = useState(false);
  const [terrainRange, setTerrainRange] = useState<'1M'|'3M'|'6M'|'1Y'>('1M');
  const [hoveredMarker, setHoveredMarker] = useState<{
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: Date;
    x: number;
    y: number;
  } | null>(null);
  const [activeBubble, setActiveBubble] = useState<{
    dayIndex: number;
    amount: string;
    type: 'new' | 'existing-bill';
    billName?: string;
    billAmount?: number;
  } | null>(null);

  // Read budget data directly from localStorage (source of truth)
  const budgetTerrain = useMemo(() => readBudgetForTerrain(), []);
  const terrainBills = budgetTerrain.isEmpty ? [] : budgetTerrain.bills;
  const terrainIncome = budgetTerrain.isEmpty ? [] : budgetTerrain.income;
  const isProjection = budgetTerrain.isProjection;

  // Build terrain data with sawtooth cash flow model
  const points = useMemo(() =>
    buildTerrainData(budgetTerrain, terrainSimulations),
    [budgetTerrain, terrainSimulations]
  );

  const todayIndex = useMemo(() => points.findIndex(p => p.isToday), [points]);
  const maxBalance = useMemo(() => Math.max(...points.map(p => p.balance), 1), [points]);
  const totalWidth = points.length * DAY_WIDTH;

  const mapY = useCallback((balance: number) => {
    const normalized = balance / Math.max(maxBalance, 1);
    return TERRAIN_HEIGHT - PADDING_BOTTOM - normalized * (TERRAIN_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
  }, [maxBalance]);

  // BUG 1: Build path points with split transaction days for smooth U-valleys
  const pathPoints = useMemo(() =>
    buildPathPoints(points, maxBalance, TERRAIN_HEIGHT),
    [points, maxBalance]
  );

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayIndex >= 0) {
      const viewWidth = scrollRef.current.offsetWidth;
      const scrollPos = todayIndex * DAY_WIDTH - viewWidth * 0.15;
      scrollRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [todayIndex]);

  // Scroll tracking for Today pill
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const todayX = todayIndex * DAY_WIDTH;
    const scrollLeft = scrollRef.current.scrollLeft;
    const viewWidth = scrollRef.current.offsetWidth;
    setShowTodayPill(todayX < scrollLeft - 20 || todayX > scrollLeft + viewWidth + 20);
  }, [todayIndex]);

  const snapToToday = () => {
    if (scrollRef.current && todayIndex >= 0) {
      const viewWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: Math.max(0, todayIndex * DAY_WIDTH - viewWidth * 0.15),
        behavior: 'smooth',
      });
    }
  };

  // Handle terrain tap in playground mode
  const handleTerrainClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!playgroundMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    const dayIdx = Math.floor(x / DAY_WIDTH);
    
    if (dayIdx <= todayIndex || dayIdx >= points.length) return;

    const point = points[dayIdx];
    if (point.bills.length > 0) {
      setActiveBubble({
        dayIndex: dayIdx,
        amount: point.bills[0].amount.toString(),
        type: 'existing-bill',
        billName: point.bills[0].name,
        billAmount: point.bills[0].amount,
      });
      return;
    }

    const simAtDay = terrainSimulations.find(s => s.dayIndex === dayIdx);
    if (simAtDay) {
      removeTerrainSimulation(simAtDay.id);
      return;
    }

    setActiveBubble({
      dayIndex: dayIdx,
      amount: '',
      type: 'new',
    });
  };

  const confirmBubble = () => {
    if (!activeBubble || !activeBubble.amount) return;
    const amount = parseFloat(activeBubble.amount);
    if (isNaN(amount) || amount <= 0) return;

    if (activeBubble.type === 'existing-bill') {
      addTerrainSimulation({
        type: 'cancel-bill',
        amount: activeBubble.billAmount || amount,
        dayIndex: activeBubble.dayIndex,
        description: activeBubble.billName || 'Bill',
      });
    } else {
      addTerrainSimulation({
        type: selectedTool === 'expense' ? 'add-expense' : 'add-income',
        amount,
        dayIndex: activeBubble.dayIndex,
        description: selectedTool === 'expense' ? 'Expense' : 'Income',
      });
    }
    setActiveBubble(null);
  };

  const handleSkipBill = () => {
    if (!activeBubble || activeBubble.type !== 'existing-bill') return;
    addTerrainSimulation({
      type: 'cancel-bill',
      amount: activeBubble.billAmount || 0,
      dayIndex: activeBubble.dayIndex,
      description: activeBubble.billName || 'Bill',
    });
    setActiveBubble(null);
  };

  // Johnny reaction
  const johnnyReaction = useMemo(() => {
    if (todayIndex < 0) return 'happy';
    const todayBalance = points[todayIndex]?.balance || 0;
    const next7 = points.slice(todayIndex + 1, todayIndex + 8);
    if (next7.length === 0) return 'happy';
    const avgNext = next7.reduce((s, p) => s + p.balance, 0) / next7.length;
    const dropPct = todayBalance > 0 ? (todayBalance - avgNext) / todayBalance : 0;
    if (dropPct > 0.4) return 'sweat';
    if (dropPct > 0.2) return 'worried';
    return 'happy';
  }, [points, todayIndex]);

  // Build paths using pathPoints
  const terrainFillPath = useMemo(() => buildTerrainPath(pathPoints, TERRAIN_HEIGHT), [pathPoints]);
  const surfacePath = useMemo(() => buildSurfacePath(pathPoints), [pathPoints]);

  // Find longest gradual stretch for ~37/day label
  const gradualStretch = useMemo(() => findLongestGradualStretch(points), [points]);

  // Past clip path x
  const pastClipX = todayIndex >= 0 ? todayIndex * DAY_WIDTH : 0;

  // Altitude labels
  const altitudeLabels = useMemo(() => {
    const labels: { value: number; y: number }[] = [];
    const step = maxBalance > 2000 ? 500 : maxBalance > 1000 ? 500 : 250;
    for (let v = step; v < maxBalance; v += step) {
      labels.push({ value: v, y: mapY(v) });
    }
    return labels.slice(0, 3);
  }, [maxBalance, mapY]);

  // BUG 2+3: Compute stagger offsets using x-position collision
  const staggerOffsets = useMemo(() => {
    const allMarkers: Omit<MarkerRenderInfo, 'yOffset'>[] = [];
    points.forEach((p, i) => {
      if (p.isPast) return;
      p.bills.forEach((b, bi) => {
        allMarkers.push({ dayIndex: i, type: 'expense', key: `exp-${i}-${bi}`, x: i * DAY_WIDTH });
      });
      p.incomeItems.forEach((inc, ii) => {
        allMarkers.push({ dayIndex: i, type: 'income', key: `inc-${i}-${ii}`, x: i * DAY_WIDTH });
      });
    });
    return computeMarkerStagger(allMarkers);
  }, [points]);

  // Impact text for active bubble
  const impactText = useMemo(() => {
    if (!activeBubble || activeBubble.type === 'existing-bill') return null;
    const amount = parseFloat(activeBubble.amount);
    if (isNaN(amount) || amount <= 0) return null;
    const newDaily = selectedTool === 'expense'
      ? Math.max(0, simulatedDailyAllowance - amount / Math.max(1, points.length - todayIndex))
      : simulatedDailyAllowance + amount / Math.max(1, points.length - todayIndex);
    return `€${Math.round(dailyAllowance)}/day becomes €${Math.round(newDaily)}/day`;
  }, [activeBubble, selectedTool, simulatedDailyAllowance, dailyAllowance, points.length, todayIndex]);

  // Empty state - no budget data
  if (budgetTerrain.isEmpty) {
    return (
      <div className="relative mx-5 rounded-2xl overflow-hidden flex items-center justify-center" style={{
        background: 'linear-gradient(180deg, rgba(60, 30, 80, 0.9) 0%, rgba(80, 40, 100, 0.85) 50%, rgba(50, 25, 70, 0.9) 100%)',
        height: TERRAIN_HEIGHT + DATE_AXIS_HEIGHT,
      }}>
        <div className="text-center px-6">
          <p className="text-white/40 text-sm font-medium">Complete Clarity to see your financial terrain</p>
          <p className="text-white/20 text-xs mt-1">Your 30-day projection will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-5 rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(180deg, rgba(60, 30, 80, 0.9) 0%, rgba(80, 40, 100, 0.85) 50%, rgba(50, 25, 70, 0.9) 100%)',
    }}>
      {/* Playground border */}
      {playgroundMode && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            border: '2px dashed rgba(255,255,255,0.15)',
            animation: 'simulation-pulse 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Playground label */}
      {playgroundMode && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1">
          <Sparkles size={10} className="text-white/20" />
          <span className="text-[9px] text-white/20">Playground</span>
        </div>
      )}

      {/* Scrollable terrain + date axis */}
      <div
        ref={scrollRef}
        className="overflow-x-auto relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
      >
        <div style={{ width: totalWidth, position: 'relative' }}>
          {/* SVG Terrain */}
          <svg
            width={totalWidth}
            height={TERRAIN_HEIGHT}
            className="block"
            onClick={handleTerrainClick}
          >
            <defs>
              <linearGradient id="terrainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.45)" />
                <stop offset="40%" stopColor="rgba(168, 85, 247, 0.25)" />
                <stop offset="70%" stopColor="rgba(236, 72, 153, 0.15)" />
                <stop offset="100%" stopColor="rgba(249, 115, 22, 0.08)" />
              </linearGradient>
              <linearGradient id="terrainGradientDim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.25)" />
                <stop offset="40%" stopColor="rgba(168, 85, 247, 0.15)" />
                <stop offset="70%" stopColor="rgba(236, 72, 153, 0.08)" />
                <stop offset="100%" stopColor="rgba(249, 115, 22, 0.04)" />
              </linearGradient>
              <linearGradient id="terrainGradientProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.24)" />
                <stop offset="50%" stopColor="rgba(236, 72, 153, 0.18)" />
                <stop offset="100%" stopColor="rgba(249, 115, 22, 0.06)" />
              </linearGradient>
              <clipPath id="pastClip">
                <rect x="0" y="0" width={pastClipX} height={TERRAIN_HEIGHT} />
              </clipPath>
              <clipPath id="futureClip">
                <rect x={pastClipX} y="0" width={totalWidth - pastClipX} height={TERRAIN_HEIGHT} />
              </clipPath>
            </defs>

            {/* 1. Baseline */}
            <line
              x1="0" y1={TERRAIN_HEIGHT - 1}
              x2={totalWidth} y2={TERRAIN_HEIGHT - 1}
              stroke="rgba(255,255,255,0.08)" strokeWidth={1}
            />

            {/* Y-axis horizontal gridlines */}
            {altitudeLabels.map((label) => (
              <line
                key={`grid-${label.value}`}
                x1="0" y1={label.y}
                x2={totalWidth} y2={label.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}

            {/* 2. Terrain fill - past (dimmed) */}
            <path d={terrainFillPath} fill={isProjection ? "url(#terrainGradientProjected)" : "url(#terrainGradientDim)"} clipPath="url(#pastClip)" />

            {/* 2. Terrain fill - future */}
            <path d={terrainFillPath} fill={isProjection ? "url(#terrainGradientProjected)" : "url(#terrainGradient)"} clipPath="url(#futureClip)" />

            {/* Today vertical marker line */}
            {todayIndex >= 0 && (
              <line
                x1={todayIndex * DAY_WIDTH}
                y1={0}
                x2={todayIndex * DAY_WIDTH}
                y2={TERRAIN_HEIGHT}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            )}

            {/* 3. Green tint wedges for income days */}
            {points.map((p, i) => {
              if (p.income <= 0) return null;
              const markerX = i * DAY_WIDTH;
              const preY = getTerrainYAtX(markerX - DAY_WIDTH * 0.3, pathPoints);
              const postY = getTerrainYAtX(markerX + DAY_WIDTH * 0.3, pathPoints);
              const startX = markerX - DAY_WIDTH * 0.3;
              const endX = markerX + DAY_WIDTH * 0.3;
              const midY = Math.max(preY, postY);
              const tintPath = `M ${startX} ${preY} L ${markerX} ${getTerrainYAtX(markerX, pathPoints)} L ${endX} ${postY} L ${endX} ${midY} L ${startX} ${midY} Z`;
              return (
                <path key={`green-${i}`} d={tintPath} fill="#34C759" opacity={0.12} />
              );
            })}

            {/* 5. Surface line */}
            <path
              d={surfacePath}
              fill="none"
              stroke={isProjection ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)"}
              strokeWidth={2}
              strokeDasharray={isProjection ? "6 4" : undefined}
            />

            {/* Projection label */}
            {isProjection && (
              <text x={totalWidth - 10} y={TERRAIN_HEIGHT - 8} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={9}>
                Projected from Clarity data
              </text>
            )}

            {/* Monthly income label top-left */}
            {budgetTerrain.monthlyIncome > 0 && (
              <text x={8} y={14} textAnchor="start" fill="rgba(255,255,255,0.2)" fontSize={10}>
                Monthly: €{budgetTerrain.monthlyIncome.toLocaleString()}
              </text>
            )}

            {/* Salary spike labels on income days */}
            {points.map((p, i) => {
              if (p.income <= 0 || p.isPast) return null;
              const markerX = i * DAY_WIDTH;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);
              return (
                <text
                  key={`salary-label-${i}`}
                  x={markerX}
                  y={surfaceY - 22}
                  textAnchor="middle"
                  fill="rgba(52,199,89,0.5)"
                  fontSize={10}
                  fontWeight={600}
                >
                  €{p.income.toLocaleString()}
                </text>
              );
            })}

            {/* 6. Vertical dotted connector lines for expenses */}
            {points.map((p, i) => {
              if (p.expenses <= 0 || p.isPast || p.income > 0) return null;
              const markerX = i * DAY_WIDTH;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);
              const staggerKey = `exp-${i}-0`;
              const staggerOffset = staggerOffsets.get(staggerKey) || 0;
              const size = getMarkerSize(p.bills[0]?.amount || p.expenses);
              const markerTopY = surfaceY - size.h - staggerOffset;

              // Only draw dotted line if staggered (offset > 0)
              if (staggerOffset === 0) return null;

              return (
                <line
                  key={`vline-${i}`}
                  x1={markerX} y1={surfaceY - size.h}
                  x2={markerX} y2={surfaceY}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* 6. Vertical dotted connector lines for staggered expenses */}
            {points.map((p, i) => {
              if (p.expenses <= 0 || p.isPast || p.income > 0) return null;
              const markerX = i * DAY_WIDTH;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);
              const staggerKey = `exp-${i}-0`;
              const staggerOffset = staggerOffsets.get(staggerKey) || 0;
              if (staggerOffset <= 0) return null;
              const size = getMarkerSize(p.bills[0]?.amount || p.expenses);
              const markerBottomY = surfaceY - staggerOffset;

              return (
                <line
                  key={`stagger-line-${i}`}
                  x1={markerX} y1={markerBottomY}
                  x2={markerX} y2={surfaceY}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* 6b. Vertical dotted lines for income */}
            {points.map((p, i) => {
              if (p.income <= 0) return null;
              const markerX = i * DAY_WIDTH;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);
              const staggerKey = `inc-${i}-0`;
              const staggerOffset = staggerOffsets.get(staggerKey) || 0;
              const r = 14;

              if (staggerOffset <= 0) return null;
              
              return (
                <line
                  key={`vline-inc-${i}`}
                  x1={markerX} y1={surfaceY - r * 2 - staggerOffset}
                  x2={markerX} y2={surfaceY}
                  stroke="rgba(52,199,89,0.1)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* 7. Expense obstacle blocks - scaled, surface-anchored, staggered, with icons */}
            {/* Skip expense markers on income days (salary day) so income marker shows instead */}
            {points.map((p, i) => {
              if (p.bills.length === 0 || p.isPast) return null;
              if (p.income > 0) return null; // Don't render expense on salary days
              const markerX = i * DAY_WIDTH;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);

              return p.bills.map((bill, bi) => {
                const Icon = bill.icon;
                const size = getMarkerSize(bill.amount);
                const staggerKey = `exp-${i}-${bi}`;
                const staggerOffset = staggerOffsets.get(staggerKey) || 0;
                const markerY = surfaceY - size.h - staggerOffset;

                return (
                  <g key={`obs-${i}-${bi}`} style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const svg = e.currentTarget.closest('svg');
                      const container = svg?.closest('.overflow-x-auto');
                      if (!svg || !container) return;
                      const containerRect = container.getBoundingClientRect();
                      setHoveredMarker({
                        description: bill.name,
                        amount: -bill.amount,
                        type: 'expense',
                        date: p.date,
                        x: markerX - (container.scrollLeft || 0) + containerRect.left,
                        y: markerY + containerRect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredMarker(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      const svg = e.currentTarget.closest('svg');
                      const container = svg?.closest('.overflow-x-auto');
                      if (!svg || !container) return;
                      const containerRect = container.getBoundingClientRect();
                      setHoveredMarker(prev =>
                        prev?.description === bill.name ? null : {
                          description: bill.name,
                          amount: -bill.amount,
                          type: 'expense',
                          date: p.date,
                          x: markerX - (container.scrollLeft || 0) + containerRect.left,
                          y: markerY + containerRect.top,
                        }
                      );
                    }}
                  >
                    <rect
                      x={markerX - size.w / 2}
                      y={markerY}
                      width={size.w}
                      height={size.h}
                      rx={6}
                      fill="rgba(239,68,68,0.15)"
                      stroke="rgba(239,68,68,0.3)"
                      strokeWidth={1}
                    />
                    <foreignObject
                      x={markerX - size.w / 2}
                      y={markerY}
                      width={size.w}
                      height={size.h}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon size={size.icon} className="text-white/50" />
                      </div>
                    </foreignObject>
                    <text
                      x={markerX}
                      y={markerY + size.h + size.font + 2}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.35)"
                      fontSize={size.font}
                    >
                      €{bill.amount}
                    </text>
                  </g>
                );
              });
            })}

            {/* 8. Income markers - surface-anchored, staggered, with icons */}
            {points.map((p, i) => {
              if (p.incomeItems.length === 0) return null;
              const markerX = i * DAY_WIDTH;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);

              return p.incomeItems.map((inc, ii) => {
                const staggerKey = `inc-${i}-${ii}`;
                const staggerOffset = staggerOffsets.get(staggerKey) || 0;
                const r = 14;
                const cy = surfaceY - r - staggerOffset;

                return (
                  <g key={`inc-${i}-${ii}`}>
                    <circle
                      cx={markerX}
                      cy={cy}
                      r={r}
                      fill="rgba(52,199,89,0.15)"
                      stroke="rgba(52,199,89,0.3)"
                      strokeWidth={1}
                    />
                    <foreignObject
                      x={markerX - r}
                      y={cy - r}
                      width={r * 2}
                      height={r * 2}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Wallet size={14} className="text-green-400/50" />
                      </div>
                    </foreignObject>
                    <text
                      x={markerX}
                      y={cy - r - 4}
                      textAnchor="middle"
                      fill="rgba(52,199,89,0.4)"
                      fontSize={10}
                    >
                      €{inc.amount.toLocaleString()}
                    </text>
                  </g>
                );
              });
            })}

            {/* 9. ~37/day label on gradual stretch */}
            {gradualStretch && (
              <text
                x={(gradualStretch.start + gradualStretch.end) / 2 * DAY_WIDTH}
                y={mapY(points[Math.floor((gradualStretch.start + gradualStretch.end) / 2)]?.balance || 0) + 16}
                textAnchor="middle"
                fill="rgba(255,255,255,0.12)"
                fontSize={9}
              >
                ~€{Math.round(averageDailySpend)}/day
              </text>
            )}

            {/* 11. Simulation overlay markers (dashed) */}
            {terrainSimulations.map((sim) => {
              const markerX = sim.dayIndex * DAY_WIDTH;
              const point = points[sim.dayIndex];
              if (!point) return null;
              const surfaceY = getTerrainYAtX(markerX, pathPoints);

              if (sim.type === 'add-expense') {
                const size = getMarkerSize(sim.amount);
                return (
                  <rect
                    key={sim.id}
                    x={markerX - size.w / 2}
                    y={surfaceY - size.h}
                    width={size.w}
                    height={size.h}
                    rx={6}
                    fill="rgba(255,255,255,0.05)"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    className="simulation-indicator"
                  />
                );
              }
              if (sim.type === 'add-income') {
                return (
                  <circle
                    key={sim.id}
                    cx={markerX}
                    cy={surfaceY - 14}
                    r={14}
                    fill="rgba(255,255,255,0.05)"
                    stroke="rgba(52,199,89,0.2)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    className="simulation-indicator"
                  />
                );
              }
              return null;
            })}

            {/* 13. Altitude labels */}
            {altitudeLabels.map((label) => (
              <text
                key={label.value}
                x={totalWidth - 8}
                y={label.y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.12)"
                fontSize={9}
              >
                €{label.value.toLocaleString()}
              </text>
            ))}
          </svg>

          {/* 10. Johnny on terrain */}
          {todayIndex >= 0 && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                left: todayIndex * DAY_WIDTH - 24,
                top: getTerrainYAtX(todayIndex * DAY_WIDTH, pathPoints) - 48,
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
            >
              <img
                src={johnnyImage}
                alt="Johnny"
                className="w-12 h-12 object-contain"
                style={{ transform: 'scaleX(1)' }}
              />
              {/* Reactions */}
              {johnnyReaction === 'worried' && (
                <div className="absolute -top-6 left-6 flex items-end gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-white/15" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
                  <div className="w-3 h-3 rounded-full bg-white/15 flex items-center justify-center">
                    <span className="text-[8px] text-white/30">...</span>
                  </div>
                </div>
              )}
              {johnnyReaction === 'sweat' && (
                <svg className="absolute -top-1 right-0" width="8" height="12" viewBox="0 0 8 12">
                  <path
                    d="M4 0 C4 0 0 6 0 8 C0 10.2 1.8 12 4 12 C6.2 12 8 10.2 8 8 C8 6 4 0 4 0Z"
                    fill="rgba(255,255,255,0.3)"
                  />
                </svg>
              )}
            </motion.div>
          )}

          {/* Date Axis */}
          <div style={{ height: DATE_AXIS_HEIGHT, position: 'relative' }}>
            {points.map((p, i) => {
              const x = i * DAY_WIDTH;
              const isWeekBoundary = i % 7 === 0;
              const isMonthStart = p.date.getDate() === 1 && i > 0;
              const tickH = isWeekBoundary ? 10 : 6;

              let label: string;
              if (p.isToday) {
                label = 'Today';
              } else if (isMonthStart) {
                label = format(p.date, 'MMM d');
              } else if (isWeekBoundary) {
                label = format(p.date, 'MMM d');
              } else {
                label = p.date.getDate().toString();
              }

              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: x, width: DAY_WIDTH }}
                >
                  {p.isToday && (
                    <svg width="10" height="5" className="mb-0.5" style={{ marginTop: -2 }}>
                      <polygon points="5,0 0,5 10,5" fill="rgba(255,255,255,0.3)" />
                    </svg>
                  )}
                  <div
                    style={{
                      width: p.isToday ? 2 : 1,
                      height: tickH,
                      backgroundColor: p.isToday
                        ? 'rgba(255,255,255,0.5)'
                        : isWeekBoundary
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(255,255,255,0.12)',
                    }}
                  />
                  <span
                    className="mt-0.5 whitespace-nowrap"
                    style={{
                      fontSize: p.isToday || isWeekBoundary || isMonthStart ? 10 : 9,
                      color: p.isToday
                        ? 'rgba(255,255,255,0.5)'
                        : isWeekBoundary || isMonthStart
                          ? 'rgba(255,255,255,0.35)'
                          : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today snap-back pill */}
      <AnimatePresence>
        {showTodayPill && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-10 left-3 glass-light rounded-full px-3 py-1.5 z-20"
            onClick={snapToToday}
          >
            <span className="text-[10px] text-white">Today</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Playground bubble */}
      <AnimatePresence>
        {activeBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute z-30 glass rounded-xl p-2"
            style={{
              left: activeBubble.dayIndex * DAY_WIDTH - 65 - (scrollRef.current?.scrollLeft || 0),
              top: getTerrainYAtX(activeBubble.dayIndex * DAY_WIDTH, pathPoints) - 80,
              width: 140,
              borderColor: activeBubble.type === 'existing-bill'
                ? 'rgba(255,255,255,0.15)'
                : selectedTool === 'income'
                  ? 'rgba(52,199,89,0.2)'
                  : 'rgba(255,107,157,0.2)',
              borderWidth: 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeBubble.type === 'existing-bill' ? (
              <>
                <p className="text-sm text-white font-medium">{activeBubble.billName}</p>
                <p className="text-xs text-white/60">€{activeBubble.billAmount}</p>
                <button
                  className="flex items-center gap-1.5 mt-2 w-full justify-center glass-light rounded-lg py-1.5"
                  onClick={handleSkipBill}
                >
                  <Scissors size={16} className="text-white/60" />
                  <span className="text-[11px] text-white/35">Skip this?</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-white/60 text-sm">€</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={activeBubble.amount}
                    onChange={(e) => setActiveBubble({ ...activeBubble, amount: e.target.value })}
                    className="flex-1 bg-transparent text-white text-lg outline-none w-full"
                    placeholder="0"
                    autoFocus
                  />
                  <button onClick={confirmBubble} className="p-1">
                    <CircleCheck size={20} className="text-white/50" />
                  </button>
                </div>
                <p className="text-[9px] text-white/25 mt-1">
                  {format(points[activeBubble.dayIndex]?.date || new Date(), 'EEE, MMM d')}
                </p>
                {impactText && (
                  <p className="text-[11px] text-white/35 mt-1">{impactText}</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* What if? button / Playground toolbar */}
      <div className="px-5 mt-3">
        <AnimatePresence mode="wait">
          {!playgroundMode ? (
            <motion.button
              key="whatif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full glass-light rounded-2xl h-12 flex items-center justify-center gap-2"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => setPlaygroundMode(true)}
            >
              <Sparkles size={20} className="text-white" />
              <span className="text-[15px] text-white font-semibold">What if?</span>
            </motion.button>
          ) : (
            <motion.div
              key="toolbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <div className="flex gap-2 w-full">
                <button
                  className="flex-[42] h-12 rounded-xl flex items-center gap-2 px-3"
                  style={{
                    backgroundColor: selectedTool === 'income'
                      ? 'rgba(52,199,89,0.12)'
                      : 'rgba(255,255,255,0.1)',
                    border: selectedTool === 'income'
                      ? '1px solid rgba(52,199,89,0.3)'
                      : '1px solid transparent',
                  }}
                  onClick={() => setSelectedTool('income')}
                >
                  <ArrowUp size={18} className="text-jfb-green" />
                  <span className="text-sm text-white">Income</span>
                </button>

                <button
                  className="flex-[42] h-12 rounded-xl flex items-center gap-2 px-3"
                  style={{
                    backgroundColor: selectedTool === 'expense'
                      ? 'rgba(255,107,157,0.12)'
                      : 'rgba(255,255,255,0.1)',
                    border: selectedTool === 'expense'
                      ? '1px solid rgba(255,107,157,0.3)'
                      : '1px solid transparent',
                  }}
                  onClick={() => setSelectedTool('expense')}
                >
                  <ArrowDown size={18} className="text-jfb-pink" />
                  <span className="text-sm text-white">Expense</span>
                </button>

                <button
                  className="flex-[16] h-12 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid transparent',
                  }}
                  onClick={() => {
                    setPlaygroundMode(false);
                    setActiveBubble(null);
                  }}
                >
                  <span className="text-sm text-white/60">Done</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-xs text-white/25">
                  Tap anywhere on the terrain to add {selectedTool}
                </p>
                {terrainSimulations.length > 0 && (
                  <span className="text-[9px] text-white/30">
                    · {terrainSimulations.length} change{terrainSimulations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
