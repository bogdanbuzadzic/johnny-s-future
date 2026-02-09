import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Zap, Shield, ShoppingCart, Smartphone, Music, Dumbbell, Wallet,
  Sparkles, ArrowUp, ArrowDown, CircleCheck, CircleX, Scissors, LucideIcon,
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

// --- Fallback Data ---
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth(); // 0-indexed

const FALLBACK_BILLS: BillEvent[] = [
  { name: 'Electricity', amount: 60, icon: Zap, date: new Date(currentYear, currentMonth, 3) },
  { name: 'Insurance', amount: 30, icon: Shield, date: new Date(currentYear, currentMonth, 6) },
  { name: 'Groceries', amount: 100, icon: ShoppingCart, date: new Date(currentYear, currentMonth, 8) },
  { name: 'Rent', amount: 450, icon: Home, date: new Date(currentYear, currentMonth, 28) },
  { name: 'Phone', amount: 25, icon: Smartphone, date: new Date(currentYear, currentMonth + 1, 1) },
  { name: 'Spotify', amount: 10, icon: Music, date: new Date(currentYear, currentMonth + 1, 3) },
  { name: 'Gym', amount: 50, icon: Dumbbell, date: new Date(currentYear, currentMonth + 1, 5) },
];

const FALLBACK_INCOME: IncomeEvent[] = [
  { name: 'Salary', amount: 2400, icon: Wallet, date: new Date(currentYear, currentMonth + 1, 1) },
];

// --- Helper: Build terrain data ---
function buildTerrainData(
  monthlyIncome: number,
  averageDailySpend: number,
  bills: BillEvent[],
  incomeEvents: IncomeEvent[],
  simulations: TerrainSimulation[],
): TerrainPoint[] {
  const monthStart = startOfMonth(today);
  const endDate = addDays(today, 30);
  const totalDays = differenceInDays(endDate, monthStart) + 1;

  let balance = monthlyIncome;
  const points: TerrainPoint[] = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(monthStart, i);
    const isPast = date < today && !isSameDay(date, today);
    const isToday = isSameDay(date, today);
    const isFuture = date > today;

    // Find events on this day
    const dayBills = bills.filter(b => isSameDay(b.date, date));
    const dayIncome = incomeEvents.filter(inc => isSameDay(inc.date, date));

    // Check for simulations on this day
    const daySims = simulations.filter(s => s.dayIndex === i);
    const simExpenses = daySims.filter(s => s.type === 'add-expense').reduce((s, x) => s + x.amount, 0);
    const simIncome = daySims.filter(s => s.type === 'add-income').reduce((s, x) => s + x.amount, 0);
    const cancelledBills = daySims.filter(s => s.type === 'cancel-bill');

    const incomeAmount = dayIncome.reduce((s, x) => s + x.amount, 0) + simIncome;
    let expenseAmount = dayBills
      .filter(b => !cancelledBills.some(c => c.description === b.name))
      .reduce((s, x) => s + x.amount, 0) + simExpenses;

    balance += incomeAmount;
    balance -= expenseAmount;

    const dailySpend = isPast || isToday ? averageDailySpend : averageDailySpend;
    balance -= dailySpend;

    points.push({
      dayIndex: i,
      date,
      balance: Math.max(0, balance),
      income: incomeAmount,
      expenses: expenseAmount,
      dailySpend,
      isPast,
      isToday,
      isFuture,
      bills: dayBills.filter(b => !cancelledBills.some(c => c.description === b.name)),
      incomeItems: dayIncome,
    });
  }

  return points;
}

// --- Helper: Build SVG path ---
function buildTerrainPath(
  points: TerrainPoint[],
  maxBalance: number,
  height: number,
): string {
  if (points.length === 0) return '';

  const mapY = (balance: number) => {
    const normalized = balance / Math.max(maxBalance, 1);
    return height - PADDING_BOTTOM - normalized * (height - PADDING_TOP - PADDING_BOTTOM);
  };

  let path = `M 0 ${height}`;
  path += ` L 0 ${mapY(points[0].balance)}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const x = i * DAY_WIDTH;
    const y = mapY(curr.balance);
    const prevX = (i - 1) * DAY_WIDTH;
    const prevY = mapY(prev.balance);

    const hasTransaction = curr.expenses > 0 || curr.income > 0;

    if (hasTransaction) {
      // Sharp transition: go horizontal to just before this day, then drop/rise
      const midX = prevX + DAY_WIDTH * 0.3;
      path += ` L ${midX} ${prevY}`;
      path += ` L ${x} ${y}`;
    } else {
      // Smooth bezier for gradual daily spend
      const cpx1 = prevX + DAY_WIDTH * 0.5;
      const cpx2 = x - DAY_WIDTH * 0.5;
      path += ` C ${cpx1} ${prevY} ${cpx2} ${y} ${x} ${y}`;
    }
  }

  // Close path
  const lastX = (points.length - 1) * DAY_WIDTH;
  path += ` L ${lastX} ${height}`;
  path += ' Z';

  return path;
}

function buildSurfacePath(
  points: TerrainPoint[],
  maxBalance: number,
  height: number,
): string {
  if (points.length === 0) return '';

  const mapY = (balance: number) => {
    const normalized = balance / Math.max(maxBalance, 1);
    return height - PADDING_BOTTOM - normalized * (height - PADDING_TOP - PADDING_BOTTOM);
  };

  let path = `M 0 ${mapY(points[0].balance)}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const x = i * DAY_WIDTH;
    const y = mapY(curr.balance);
    const prevX = (i - 1) * DAY_WIDTH;
    const prevY = mapY(prev.balance);

    const hasTransaction = curr.expenses > 0 || curr.income > 0;

    if (hasTransaction) {
      const midX = prevX + DAY_WIDTH * 0.3;
      path += ` L ${midX} ${prevY}`;
      path += ` L ${x} ${y}`;
    } else {
      const cpx1 = prevX + DAY_WIDTH * 0.5;
      const cpx2 = x - DAY_WIDTH * 0.5;
      path += ` C ${cpx1} ${prevY} ${cpx2} ${y} ${x} ${y}`;
    }
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
  const [activeBubble, setActiveBubble] = useState<{
    dayIndex: number;
    amount: string;
    type: 'new' | 'existing-bill';
    billName?: string;
    billAmount?: number;
  } | null>(null);

  // Build terrain data
  const points = useMemo(() =>
    buildTerrainData(monthlyIncome, averageDailySpend, FALLBACK_BILLS, FALLBACK_INCOME, terrainSimulations),
    [monthlyIncome, averageDailySpend, terrainSimulations]
  );

  const todayIndex = useMemo(() => points.findIndex(p => p.isToday), [points]);
  const maxBalance = useMemo(() => Math.max(...points.map(p => p.balance), 1), [points]);
  const totalWidth = points.length * DAY_WIDTH;

  const mapY = useCallback((balance: number) => {
    const normalized = balance / Math.max(maxBalance, 1);
    return TERRAIN_HEIGHT - PADDING_BOTTOM - normalized * (TERRAIN_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
  }, [maxBalance]);

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

    // Check if tapping on an existing bill obstacle
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

    // Check if tapping simulated marker
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

  // Build paths
  const terrainFillPath = useMemo(() => buildTerrainPath(points, maxBalance, TERRAIN_HEIGHT), [points, maxBalance]);
  const surfacePath = useMemo(() => buildSurfacePath(points, maxBalance, TERRAIN_HEIGHT), [points, maxBalance]);

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

  return (
    <div className="relative">
      {/* Playground border */}
      {playgroundMode && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            border: '2px dashed rgba(255,255,255,0.1)',
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
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#FF6B9D" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FF9F0A" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="terrainGradientDim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.09} />
                <stop offset="50%" stopColor="#FF6B9D" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#FF9F0A" stopOpacity={0.06} />
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

            {/* 2. Terrain fill - past (dimmed) */}
            <path d={terrainFillPath} fill="url(#terrainGradientDim)" clipPath="url(#pastClip)" />

            {/* 2. Terrain fill - future */}
            <path d={terrainFillPath} fill="url(#terrainGradient)" clipPath="url(#futureClip)" />

            {/* 3. Green tint overlays on income sections */}
            {points.map((p, i) => {
              if (p.income <= 0) return null;
              const x = i * DAY_WIDTH;
              const y = mapY(p.balance);
              const prevY = i > 0 ? mapY(points[i - 1].balance) : y;
              return (
                <rect
                  key={`green-${i}`}
                  x={x - DAY_WIDTH * 0.7}
                  y={Math.min(y, prevY)}
                  width={DAY_WIDTH * 1.4}
                  height={Math.abs(prevY - y) + 10}
                  fill="#34C759"
                  opacity={0.15}
                  rx={4}
                />
              );
            })}

            {/* 5. Surface line */}
            <path
              d={surfacePath}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={2}
            />

            {/* 6. Vertical dotted connector lines for expenses */}
            {points.map((p, i) => {
              if (p.expenses <= 0 || p.isPast) return null;
              const x = i * DAY_WIDTH;
              const y = mapY(p.balance);
              return (
                <line
                  key={`vline-${i}`}
                  x1={x} y1={y}
                  x2={x} y2={TERRAIN_HEIGHT - 1}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* 6b. Vertical dotted lines for income */}
            {points.map((p, i) => {
              if (p.income <= 0) return null;
              const x = i * DAY_WIDTH;
              const y = mapY(p.balance);
              const prevY = i > 0 ? mapY(points[i - 1].balance) : y;
              return (
                <line
                  key={`vline-inc-${i}`}
                  x1={x} y1={prevY}
                  x2={x} y2={y}
                  stroke="rgba(52,199,89,0.1)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* 7. Expense obstacle blocks */}
            {points.map((p, i) => {
              if (p.bills.length === 0 || p.isPast) return null;
              const bill = p.bills[0];
              const Icon = bill.icon;
              const x = i * DAY_WIDTH;
              // Position at cliff top (prev balance)
              const prevBalance = i > 0 ? points[i - 1].balance : p.balance;
              const y = mapY(prevBalance + p.dailySpend); // top of cliff
              const obstacleW = Math.max(20, Math.min(44, (bill.amount / 500) * 44));
              const obstacleH = 28;

              return (
                <g key={`obs-${i}`}>
                  <rect
                    x={x - obstacleW / 2}
                    y={y - obstacleH}
                    width={obstacleW}
                    height={obstacleH}
                    rx={6}
                    fill="rgba(255,255,255,0.1)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                  {/* Amount label below obstacle */}
                  <text
                    x={x}
                    y={y + 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.35)"
                    fontSize={10}
                  >
                    €{bill.amount}
                  </text>
                </g>
              );
            })}

            {/* 8. Income markers */}
            {points.map((p, i) => {
              if (p.incomeItems.length === 0) return null;
              const inc = p.incomeItems[0];
              const x = i * DAY_WIDTH;
              const prevBalance = i > 0 ? points[i - 1].balance : p.balance;
              const y = mapY(prevBalance); // bottom of rise

              return (
                <g key={`inc-${i}`}>
                  <circle
                    cx={x}
                    cy={y - 14}
                    r={14}
                    fill="rgba(255,255,255,0.15)"
                    stroke="rgba(52,199,89,0.2)"
                    strokeWidth={1}
                  />
                  {/* Amount label above peak */}
                  <text
                    x={x}
                    y={mapY(p.balance) - 8}
                    textAnchor="middle"
                    fill="rgba(52,199,89,0.4)"
                    fontSize={10}
                  >
                    €{inc.amount.toLocaleString()}
                  </text>
                </g>
              );
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
                ~€{averageDailySpend}/day
              </text>
            )}

            {/* 11. Simulation overlay markers (dashed) */}
            {terrainSimulations.map((sim) => {
              const x = sim.dayIndex * DAY_WIDTH;
              const point = points[sim.dayIndex];
              if (!point) return null;
              const y = mapY(point.balance);

              if (sim.type === 'add-expense') {
                return (
                  <rect
                    key={sim.id}
                    x={x - 12}
                    y={y - 28}
                    width={24}
                    height={28}
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
                    cx={x}
                    cy={y - 14}
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

            {/* 13. Altitude labels (right sticky - use last visible area) */}
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
                top: mapY(points[todayIndex]?.balance || 0) - 48,
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
                  {/* Today triangle */}
                  {p.isToday && (
                    <svg width="10" height="5" className="mb-0.5" style={{ marginTop: -2 }}>
                      <polygon points="5,0 0,5 10,5" fill="rgba(255,255,255,0.3)" />
                    </svg>
                  )}
                  {/* Tick */}
                  <div
                    className={p.isToday ? '' : ''}
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
                  {/* Label */}
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
              top: mapY(points[activeBubble.dayIndex]?.balance || 0) - 80,
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
              className="w-full glass-light rounded-2xl h-12 flex items-center justify-between px-3"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    border: selectedTool === 'income'
                      ? '1px solid rgba(52,199,89,0.4)'
                      : '1px solid rgba(52,199,89,0.2)',
                  }}
                  onClick={() => setSelectedTool('income')}
                >
                  <ArrowUp size={14} className="text-jfb-green" />
                  <span className="text-white">Income</span>
                </button>
                <button
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    border: selectedTool === 'expense'
                      ? '1px solid rgba(255,107,157,0.4)'
                      : '1px solid rgba(255,107,157,0.2)',
                  }}
                  onClick={() => setSelectedTool('expense')}
                >
                  <ArrowDown size={14} className="text-jfb-pink" />
                  <span className="text-white">Expense</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {terrainSimulations.length > 0 && (
                  <span className="text-[9px] text-white/30">
                    {terrainSimulations.length} change{terrainSimulations.length > 1 ? 's' : ''}
                  </span>
                )}
                <button
                  className="text-[13px] text-white/50"
                  onClick={() => {
                    setPlaygroundMode(false);
                    setActiveBubble(null);
                  }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
