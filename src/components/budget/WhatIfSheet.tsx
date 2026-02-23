import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, PiggyBank, TrendingDown, ChevronRight, X, Shield,
  AlertTriangle, Flame, Layers, TrendingUp, PlusCircle, Heart,
  ArrowLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──
type ScenarioId =
  | 'cheap-rent' | 'save-more' | 'income-drop-quick'
  | 'job-loss' | 'income-cut' | 'emergency' | 'inflation' | 'perfect-storm'
  | 'raise' | 'cheaper-housing' | 'side-income' | 'baby'
  | 'cut-dining' | 'cancel-subs' | 'rent-increase' | 'car-breakdown' | 'medical';

type ScenarioSection = 'quick' | 'stress' | 'life';

interface ScenarioDef {
  id: ScenarioId;
  icon: LucideIcon;
  label: string;
  section: ScenarioSection;
  pills?: string[];
  pills2?: string[];
  pillLabel?: string;
  pillLabel2?: string;
  euroInput?: boolean;
  euroLabel?: string;
  euroDefault?: number;
  instant?: boolean;
  positive?: boolean;
}

const scenarios: ScenarioDef[] = [
  // Quick
  { id: 'cheap-rent', icon: Home, label: 'Cheaper rent (-€100)', section: 'quick', instant: true, positive: true },
  { id: 'save-more', icon: PiggyBank, label: 'Save €100 more', section: 'quick', instant: true, positive: true },
  { id: 'income-drop-quick', icon: TrendingDown, label: 'Income drops 20%', section: 'quick', instant: true },
  // Stress (negative)
  { id: 'job-loss', icon: AlertTriangle, label: 'Job loss', section: 'stress', pills: ['1 mo', '3 mo', '6 mo'], pillLabel: 'How long without income?' },
  { id: 'income-cut', icon: TrendingDown, label: 'Income cut', section: 'stress', pills: ['-10%', '-20%', '-30%', '-50%'], pillLabel: 'How much?' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency expense', section: 'stress', pills: ['€500', '€1k', '€2.5k', '€5k'], pillLabel: 'How big?' },
  { id: 'medical', icon: Heart, label: 'Medical emergency', section: 'stress', pills: ['€1k', '€3k', '€5k', '€10k'], pillLabel: 'How much?' },
  { id: 'car-breakdown', icon: Home, label: 'Car breakdown', section: 'stress', pills: ['€500', '€1k', '€2k'], pillLabel: 'Repair cost?' },
  { id: 'rent-increase', icon: Home, label: 'Rent increase', section: 'stress', pills: ['+€50', '+€100', '+€200'], pillLabel: 'How much more?' },
  { id: 'inflation', icon: Flame, label: 'Inflation', section: 'stress', pills: ['5%', '8%', '12%'], pillLabel: 'Annual rate?' },
  { id: 'perfect-storm', icon: Layers, label: 'Perfect storm', section: 'stress', instant: true },
  // Life Changes (positive)
  { id: 'raise', icon: TrendingUp, label: 'Salary raise', section: 'life', pills: ['+5%', '+10%', '+20%', '+30%'], pillLabel: 'How much?', positive: true },
  { id: 'side-income', icon: PlusCircle, label: 'Side income', section: 'life', pills: ['+€200', '+€500', '+€1000'], pillLabel: 'Extra per month?', positive: true },
  { id: 'cheaper-housing', icon: Home, label: 'Cheaper housing', section: 'life', euroInput: true, euroLabel: 'New monthly rent', positive: true },
  { id: 'cut-dining', icon: Home, label: 'Cut dining by 50%', section: 'life', instant: true, positive: true },
  { id: 'cancel-subs', icon: Home, label: 'Cancel subscriptions', section: 'life', instant: true, positive: true },
  { id: 'baby', icon: Heart, label: 'Having a baby', section: 'life', instant: true },
];

const sections: { key: ScenarioSection; label: string }[] = [
  { key: 'quick', label: 'QUICK' },
  { key: 'stress', label: 'STRESS TESTS' },
  { key: 'life', label: 'LIFE CHANGES' },
];

// ── Budget reader ──
function readBudgetData() {
  try {
    const raw = localStorage.getItem('jfb-budget-data');
    if (!raw) return null;
    const p = JSON.parse(raw);
    const config = p.config || {};
    const cats = (p.categories || []) as any[];
    const fixedCats = cats.filter((c: any) => c.type === 'fixed');
    const expenseCats = cats.filter((c: any) => c.type === 'expense');
    const totalFixed = fixedCats.reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);
    const totalSpending = expenseCats.reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);
    const savings = Number(config.monthlySavingsTarget) || 0;
    const goals = JSON.parse(localStorage.getItem('jfb_goals') || '[]');
    const goalsTotal = goals.reduce((s: number, g: any) => s + (Number(g.monthlyContribution) || 0), 0);
    const income = Number(config.monthlyIncome) || 2500;
    const rentCat = fixedCats.find((c: any) => c.name === 'Rent');
    const bankBalance = Number(localStorage.getItem('jfb_bank_balance')) || 1200;
    const savingsBalance = Number(localStorage.getItem('jfb_savings_balance')) || 500;
    const diningCat = expenseCats.find((c: any) => c.name === 'Food' || c.name === 'Dining');
    const subsCat = fixedCats.find((c: any) => c.name === 'Subscriptions');
    return {
      income, totalFixed, totalSpending, savings, goalsTotal, goals,
      freeAmount: income - totalFixed - totalSpending - savings - goalsTotal,
      rent: rentCat ? Number(rentCat.monthlyBudget) || 0 : 0,
      expenseCats, fixedCats, bankBalance, savingsBalance,
      foodBudget: diningCat?.monthlyBudget || expenseCats.find((c: any) => c.name === 'Food')?.monthlyBudget || 350,
      diningBudget: diningCat ? Number(diningCat.monthlyBudget) || 0 : 200,
      subsBudget: subsCat ? Number(subsCat.monthlyBudget) || 0 : 60,
    };
  } catch { return null; }
}

// ── Daily cash flow generator (sawtooth pattern) ──
function generateDailyFlow(
  income: number, fixed: number, savings: number, goals: number,
  dailyFlex: number, initialReserves: number, totalDays: number,
): number[] {
  let bal = initialReserves;
  const points: number[] = [];
  for (let d = 0; d < totalDays; d++) {
    const dom = (d % 30) + 1;
    if (dom === 1) {
      bal += income;
      bal -= fixed + savings + goals;
    }
    bal -= dailyFlex;
    points.push(Math.round(bal));
  }
  return points;
}

// ── Stress simulation using daily sawtooth model ──
function simulateStress(scenarioId: ScenarioId, pill: string, budget: ReturnType<typeof readBudgetData>) {
  if (!budget) return { base: [] as number[], scenario: [] as number[], brokeDay: -1, recoveryDay: -1, survivalMonths: 0 };

  const dailyFlex = budget.totalSpending / 30;
  const reserves = budget.bankBalance + budget.savingsBalance;
  const totalDays = 24 * 30;

  const base = generateDailyFlow(budget.income, budget.totalFixed, budget.savings, budget.goalsTotal, dailyFlex, reserves, totalDays);

  let scenario: number[];

  if (scenarioId === 'job-loss') {
    const mo = pill === '1 mo' ? 1 : pill === '3 mo' ? 3 : 6;
    const lossDays = mo * 30;
    const essentialDaily = budget.foodBudget / 30;
    const phase1 = generateDailyFlow(0, budget.totalFixed, 0, 0, essentialDaily, reserves, lossDays);
    const lastBal = phase1[phase1.length - 1];
    const phase2 = totalDays - lossDays > 0
      ? generateDailyFlow(budget.income, budget.totalFixed, budget.savings, budget.goalsTotal, dailyFlex, lastBal, totalDays - lossDays)
      : [];
    scenario = [...phase1, ...phase2];
  } else {
    let modIncome = budget.income;
    let modFixed = budget.totalFixed;
    let modFlex = dailyFlex;
    let startHit = 0;

    switch (scenarioId) {
      case 'income-cut': case 'income-drop-quick': {
        const pct = scenarioId === 'income-drop-quick' ? 20 : parseInt(pill.replace(/[^0-9]/g, '')) || 20;
        modIncome *= (1 - pct / 100);
        break;
      }
      case 'emergency': case 'medical': case 'car-breakdown':
        if (scenarioId === 'medical') {
          startHit = pill === '€1k' ? 1000 : pill === '€3k' ? 3000 : pill === '€5k' ? 5000 : 10000;
        } else if (scenarioId === 'car-breakdown') {
          startHit = pill === '€500' ? 500 : pill === '€1k' ? 1000 : 2000;
        } else {
          startHit = pill === '€500' ? 500 : pill === '€1k' ? 1000 : pill === '€2.5k' ? 2500 : 5000;
        }
        break;
      case 'rent-increase': {
        const extra = parseInt(pill.replace(/[^0-9]/g, '')) || 100;
        modFixed += extra;
        break;
      }
      case 'inflation': {
        const rate = parseInt(pill) || 8;
        modFixed = Math.round(budget.totalFixed * (1 + rate / 100));
        modFlex = dailyFlex * (1 + rate / 100);
        break;
      }
      case 'perfect-storm':
        modIncome *= 0.7;
        startHit = 2000;
        modFixed = Math.round(budget.totalFixed * 1.08);
        modFlex = dailyFlex * 1.08;
        break;
    }

    scenario = generateDailyFlow(modIncome, modFixed, budget.savings, budget.goalsTotal, modFlex, reserves - startHit, totalDays);
  }

  const brokeDay = scenario.findIndex(v => v < 0);
  const recoveryDay = brokeDay >= 0 ? scenario.findIndex((v, i) => i > brokeDay && v >= 0) : -1;
  const survivalMonths = brokeDay >= 0 ? Math.round(brokeDay / 30 * 10) / 10 : 24;

  return { base, scenario, brokeDay, recoveryDay, survivalMonths };
}

function simulateWithFund(scenarioId: ScenarioId, pill: string, budget: ReturnType<typeof readBudgetData>): number[] {
  if (!budget) return [];
  const emergencyFund = 6 * (budget.totalFixed + budget.foodBudget);
  const preparedBudget = { ...budget, bankBalance: emergencyFund, savingsBalance: 0 };
  return simulateStress(scenarioId, pill, preparedBudget).scenario;
}

// ── Props ──
interface WhatIfSheetProps {
  open: boolean;
  onClose: () => void;
}

type ViewState = 'menu' | 'stress-results' | 'life-results';

export function WhatIfSheet({ open, onClose }: WhatIfSheetProps) {
  const [view, setView] = useState<ViewState>('menu');
  const [expandedId, setExpandedId] = useState<ScenarioId | null>(null);
  const [selectedPill, setSelectedPill] = useState<string | null>(null);
  const [selectedPill2, setSelectedPill2] = useState<string | null>(null);
  const [euroVal, setEuroVal] = useState('');
  const [activeScenario, setActiveScenario] = useState<{ id: ScenarioId; pill: string } | null>(null);
  const [showPrepared, setShowPrepared] = useState(false);

  const budget = useMemo(() => readBudgetData(), []);

  const resetMenu = useCallback(() => {
    setView('menu');
    setExpandedId(null);
    setSelectedPill(null);
    setSelectedPill2(null);
    setEuroVal('');
    setActiveScenario(null);
    setShowPrepared(false);
  }, []);

  const handleClose = useCallback(() => {
    resetMenu();
    onClose();
  }, [onClose, resetMenu]);

  const isPositiveScenario = useCallback((id: ScenarioId) => {
    return scenarios.find(s => s.id === id)?.positive ?? false;
  }, []);

  const runScenario = useCallback((id: ScenarioId, pill: string) => {
    const def = scenarios.find(s => s.id === id);
    if (!def) return;
    setActiveScenario({ id, pill });
    // Positive life changes go to life-results, negative/stress go to stress-results
    if (def.positive && def.section === 'life') {
      setView('life-results');
    } else if (def.positive) {
      setView('life-results');
    } else {
      setView('stress-results');
    }
  }, []);

  const handleRowClick = useCallback((def: ScenarioDef) => {
    if (def.instant) {
      runScenario(def.id, '');
      return;
    }
    if (expandedId === def.id) {
      setExpandedId(null);
    } else {
      setExpandedId(def.id);
      setSelectedPill(def.pills?.[1] || def.pills?.[0] || null);
      setSelectedPill2(null);
      setEuroVal(def.euroDefault?.toString() || '');
    }
  }, [expandedId, runScenario]);

  const handleRun = useCallback(() => {
    if (!expandedId) return;
    const pill = selectedPill || euroVal || '';
    runScenario(expandedId, pill);
  }, [expandedId, selectedPill, euroVal, runScenario]);

  // Stress results data
  const stressData = useMemo(() => {
    if (!activeScenario || view !== 'stress-results' || !budget) return null;
    const result = simulateStress(activeScenario.id, activeScenario.pill, budget);
    const prepared = showPrepared ? simulateWithFund(activeScenario.id, activeScenario.pill, budget) : [];
    return { ...result, prepared };
  }, [activeScenario, view, budget, showPrepared]);

  // Life change results
  const lifeData = useMemo(() => {
    if (!activeScenario || view !== 'life-results' || !budget) return null;
    let extraMonthly = 0;
    const id = activeScenario.id;
    const pill = activeScenario.pill;

    if (id === 'cheap-rent') extraMonthly = 100;
    else if (id === 'save-more') extraMonthly = 100;
    else if (id === 'raise') {
      const pct = parseInt(pill.replace(/[^0-9]/g, '')) || 10;
      extraMonthly = Math.round(budget.income * pct / 100);
    }
    else if (id === 'cheaper-housing') {
      const newRent = Number(pill) || budget.rent - 200;
      extraMonthly = budget.rent - newRent;
    }
    else if (id === 'side-income') {
      extraMonthly = parseInt(pill.replace(/[^0-9]/g, '')) || 300;
    }
    else if (id === 'cut-dining') extraMonthly = Math.round(budget.diningBudget * 0.5);
    else if (id === 'cancel-subs') extraMonthly = budget.subsBudget;
    else if (id === 'baby') extraMonthly = -(Math.round(budget.income * 0.15) + 400);

    const currentSavingsRate = budget.income > 0 ? Math.round((budget.savings / budget.income) * 100) : 0;
    const newSavingsRate = budget.income > 0 ? Math.round(((budget.savings + Math.max(0, extraMonthly * 0.5)) / (budget.income + extraMonthly)) * 100) : 0;

    let goalAccel = 0;
    if (budget.goals.length > 0 && extraMonthly > 0) {
      const g = budget.goals[0];
      const remaining = (Number(g.target) || 0) - (Number(g.saved) || 0);
      const mc = Number(g.monthlyContribution) || 0;
      if (mc > 0) {
        const monthsNow = remaining / mc;
        const monthsNew = remaining / (mc + extraMonthly * 0.3);
        goalAccel = Math.round((monthsNow - monthsNew) * 10) / 10;
      }
    }

    const freeAmount = budget.freeAmount;
    const afterFree = freeAmount + extraMonthly;
    const blocks = [
      { label: 'Spending', amount: budget.totalSpending, newAmount: budget.totalSpending, color: '#8E44AD' },
      { label: 'Fixed', amount: budget.totalFixed, newAmount: (id === 'cheap-rent' || id === 'cheaper-housing') ? budget.totalFixed - Math.max(0, extraMonthly) : budget.totalFixed, color: '#5D6D7E' },
      { label: 'Savings', amount: budget.savings, newAmount: budget.savings, color: '#2980B9' },
      { label: 'Goals', amount: budget.goalsTotal, newAmount: budget.goalsTotal, color: '#E91E63' },
      { label: 'Free', amount: Math.max(0, freeAmount), newAmount: Math.max(0, afterFree), color: 'rgba(255,255,255,0.15)' },
    ].filter(b => b.amount > 0 || b.newAmount > 0);

    // Also generate sawtooth lines for positive scenarios
    const dailyFlex = budget.totalSpending / 30;
    const reserves = budget.bankBalance + budget.savingsBalance;
    const totalDays = 12 * 30;
    const baseLine = generateDailyFlow(budget.income, budget.totalFixed, budget.savings, budget.goalsTotal, dailyFlex, reserves, totalDays);
    const newIncome = budget.income + (id === 'raise' || id === 'side-income' ? extraMonthly : 0);
    const newFixed = (id === 'cheap-rent' || id === 'cheaper-housing') ? budget.totalFixed - Math.max(0, extraMonthly) : budget.totalFixed;
    const newFlex = (id === 'cut-dining') ? dailyFlex - (extraMonthly / 30) : (id === 'cancel-subs') ? dailyFlex : dailyFlex;
    const newSavings = budget.savings + (id === 'save-more' ? extraMonthly : 0);
    const scenarioLine = generateDailyFlow(newIncome, newFixed, newSavings, budget.goalsTotal, newFlex, reserves, totalDays);

    return {
      extraMonthly, newSavingsRate, goalAccel, blocks, isPositive: extraMonthly >= 0, freeAmount, afterFree,
      baseLine, scenarioLine, annualImpact: extraMonthly * 12,
    };
  }, [activeScenario, view, budget]);

  if (!open) return null;

  const scenarioLabel = activeScenario
    ? (scenarios.find(s => s.id === activeScenario.id)?.label || '') + (activeScenario.pill ? ` (${activeScenario.pill})` : '')
    : '';

  // ── Full-screen sawtooth chart renderer ──
  const renderFullChart = (base: number[], scenario: number[], options?: {
    forkColor?: string;
    prepared?: number[];
    brokeDay?: number;
    recoveryDay?: number;
  }) => {
    if (base.length === 0 || scenario.length === 0) return null;
    const { forkColor = '#FBBF24', prepared = [], brokeDay = -1, recoveryDay = -1 } = options || {};

    const W = 380, H = 260;
    const PAD = { top: 20, bottom: 30, left: 45, right: 15 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const step = 3;
    const baseDS = base.filter((_, i) => i % step === 0);
    const scenDS = scenario.filter((_, i) => i % step === 0);
    const prepDS = prepared.length > 0 ? prepared.filter((_, i) => i % step === 0) : [];

    const allVals = [...baseDS, ...scenDS, ...prepDS];
    const yMax = Math.max(...allVals, 100);
    const yMin = Math.min(...allVals, 0);
    const yRange = yMax - yMin || 1;

    const toX = (i: number) => PAD.left + (i / Math.max(baseDS.length - 1, 1)) * chartW;
    const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH;

    const makePath = (pts: number[]) =>
      pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

    const basePath = makePath(baseDS);
    const scenPath = makePath(scenDS);
    const prepPath = prepDS.length > 0 ? makePath(prepDS) : '';

    const scenArea = `${scenPath} L${toX(scenDS.length - 1).toFixed(1)},${toY(yMin).toFixed(1)} L${toX(0).toFixed(1)},${toY(yMin).toFixed(1)} Z`;

    const totalMonths = Math.ceil(base.length / 30);
    const monthLabels = Array.from({ length: Math.min(5, totalMonths + 1) }, (_, i) => {
      const m = Math.round(i * totalMonths / 4);
      const d = new Date(); d.setMonth(d.getMonth() + m);
      return { x: toX(Math.min(Math.floor(m * 30 / step), baseDS.length - 1)), label: d.toLocaleString('en', { month: 'short', year: '2-digit' }) };
    });

    const brokeIdx = brokeDay >= 0 ? Math.floor(brokeDay / step) : -1;
    const recovIdx = recoveryDay >= 0 ? Math.floor(recoveryDay / step) : -1;

    const gradId = `grad-${forkColor.replace('#', '')}`;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '100%', minHeight: 220 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`${forkColor}33`} />
            <stop offset="100%" stopColor={`${forkColor}05`} />
          </linearGradient>
        </defs>

        {yMin < 0 && <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3" />}

        <path d={scenArea} fill={`url(#${gradId})`} opacity="0.5" />
        <path d={basePath} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <path d={scenPath} fill="none" stroke={forkColor} strokeWidth="2" strokeDasharray="6,3" />
        {prepPath && <path d={prepPath} fill="none" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4,3" />}

        {brokeIdx >= 0 && brokeIdx < scenDS.length && (
          <g>
            <line x1={toX(brokeIdx)} y1={PAD.top} x2={toX(brokeIdx)} y2={H - PAD.bottom}
              stroke="#EF4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
            <circle cx={toX(brokeIdx)} cy={toY(scenDS[brokeIdx])} r="4" fill="#EF4444" />
            <text x={toX(brokeIdx)} y={PAD.top - 5} fill="#EF4444" fontSize="10" textAnchor="middle" fontWeight="600">Broke</text>
          </g>
        )}

        {recovIdx >= 0 && recovIdx < scenDS.length && (
          <g>
            <circle cx={toX(recovIdx)} cy={toY(scenDS[recovIdx])} r="4" fill="#86EFAC" />
            <text x={toX(recovIdx)} y={toY(scenDS[recovIdx]) - 10} fill="#86EFAC" fontSize="10" textAnchor="middle" fontWeight="600">Recovers</text>
          </g>
        )}

        {[yMin < 0 ? yMin : 0, Math.round((yMax + yMin) / 2), yMax].map(v => (
          <text key={v} x={PAD.left - 5} y={toY(v) + 3} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">
            €{Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
          </text>
        ))}

        {monthLabels.map((ml, i) => (
          <text key={i} x={ml.x} y={H - 6} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="middle">{ml.label}</text>
        ))}

        <g transform={`translate(${W - PAD.right - 80}, ${PAD.top + 4})`}>
          <line x1="0" y1="0" x2="14" y2="0" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <text x="18" y="3" fill="rgba(255,255,255,0.4)" fontSize="8">Current</text>
          <line x1="0" y1="14" x2="14" y2="14" stroke={forkColor} strokeWidth="2" strokeDasharray="4,2" />
          <text x="18" y="17" fill="rgba(255,255,255,0.4)" fontSize="8">Scenario</text>
          {prepPath && <>
            <line x1="0" y1="28" x2="14" y2="28" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4,2" />
            <text x="18" y="31" fill="rgba(255,255,255,0.4)" fontSize="8">Prepared</text>
          </>}
        </g>
      </svg>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{
            background: 'rgba(15, 12, 24, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* ═══ MENU ═══ */}
          {view === 'menu' && (
            <div className="px-5 pb-8 pt-12">
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>What if?</span>
                <button onClick={handleClose}><X size={22} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
              </div>
              {sections.map(sec => {
                const items = scenarios.filter(s => s.section === sec.key);
                return (
                  <div key={sec.key}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, textTransform: 'uppercase', padding: '16px 0 6px' }}>{sec.label}</div>
                    {items.map((def, i) => {
                      const Icon = def.icon;
                      const isExpanded = expandedId === def.id;
                      return (
                        <div key={def.id}>
                          <div
                            className="flex items-center cursor-pointer"
                            style={{ padding: '14px 0', borderBottom: i < items.length - 1 || isExpanded ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                            onClick={() => handleRowClick(def)}
                          >
                            <Icon size={18} style={{ color: def.positive ? 'rgba(134,239,172,0.5)' : 'rgba(255,255,255,0.35)', marginRight: 14, flexShrink: 0 }} />
                            <span style={{ fontSize: 15, color: 'white', flex: 1 }}>{def.label}</span>
                            <ChevronRight size={16} style={{
                              color: 'rgba(255,255,255,0.12)',
                              transform: isExpanded ? 'rotate(90deg)' : undefined,
                              transition: 'transform 200ms',
                            }} />
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div style={{ padding: '10px 0 10px 32px' }}>
                                  {def.pillLabel && (
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{def.pillLabel}</p>
                                  )}
                                  {def.pills && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {def.pills.map(p => (
                                        <button key={p} onClick={() => setSelectedPill(p)}
                                          style={{
                                            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                                            background: selectedPill === p ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                            border: selectedPill === p ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                                            color: selectedPill === p ? 'white' : 'rgba(255,255,255,0.5)',
                                          }}>{p}</button>
                                      ))}
                                    </div>
                                  )}
                                  {def.euroInput && (
                                    <>
                                      {def.euroLabel && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{def.euroLabel}</p>}
                                      <input
                                        type="number" inputMode="decimal" placeholder="0"
                                        value={euroVal} onChange={e => setEuroVal(e.target.value)}
                                        style={{
                                          width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                                          color: 'white', outline: 'none',
                                        }}
                                      />
                                    </>
                                  )}
                                  <button onClick={handleRun} style={{
                                    marginTop: 16, width: '100%', height: 48, borderRadius: 12,
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'white', fontSize: 15, fontWeight: 600,
                                  }}>Run</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ STRESS TEST RESULTS (full screen) ═══ */}
          {view === 'stress-results' && stressData && (
            <div className="px-5 pb-8 pt-12">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <button onClick={resetMenu}><ArrowLeft size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{scenarioLabel}</span>
                </div>
                <button onClick={handleClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
              </div>

              {/* Full-width chart — 60% viewport */}
              <div style={{ height: '55vh', minHeight: 280, marginLeft: -20, marginRight: -20, padding: '0 8px' }}>
                {renderFullChart(stressData.base, stressData.scenario, {
                  forkColor: '#FBBF24',
                  prepared: stressData.prepared,
                  brokeDay: stressData.brokeDay,
                  recoveryDay: stressData.recoveryDay,
                })}
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                {[
                  { label: 'SURVIVAL', value: stressData.brokeDay < 0 ? 'Indefinitely' : `${stressData.survivalMonths} mo`, color: stressData.brokeDay < 0 ? '#86EFAC' : 'white' },
                  { label: 'BROKE AFTER', value: stressData.brokeDay < 0 ? 'Never' : `Month ${Math.ceil(stressData.brokeDay / 30)}`, color: stressData.brokeDay < 0 ? '#86EFAC' : '#EF4444' },
                  { label: 'RECOVERY', value: stressData.recoveryDay < 0 ? (stressData.brokeDay < 0 ? 'N/A' : 'No') : `Month ${Math.ceil(stressData.recoveryDay / 30)}`, color: 'white' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Emergency fund toggle */}
              <div className="mt-4 flex items-center justify-between" style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div className="flex items-center gap-2">
                  <Shield size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>With 6-month emergency fund</span>
                </div>
                <button onClick={() => setShowPrepared(!showPrepared)} style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: showPrepared ? '#86EFAC' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 200ms',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: 'white',
                    position: 'absolute', top: 2,
                    left: showPrepared ? 20 : 2, transition: 'left 200ms',
                  }} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                <button onClick={resetMenu} style={{
                  flex: 1, height: 44, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                  fontSize: 14, fontWeight: 500, border: 'none',
                }}>Try another</button>
                <button onClick={handleClose} style={{
                  flex: 1, height: 44, borderRadius: 10,
                  background: '#27AE60', color: 'white',
                  fontSize: 14, fontWeight: 600, border: 'none',
                }}>Build safety net</button>
              </div>
            </div>
          )}

          {/* ═══ LIFE CHANGE RESULTS (full screen) ═══ */}
          {view === 'life-results' && lifeData && (
            <div className="px-5 pb-8 pt-12">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <button onClick={resetMenu}><ArrowLeft size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{scenarioLabel}</span>
                </div>
                <button onClick={handleClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
              </div>

              {/* Full-width chart for positive scenarios too */}
              {lifeData.baseLine && lifeData.scenarioLine && (
                <div style={{ height: '40vh', minHeight: 220, marginLeft: -20, marginRight: -20, padding: '0 8px' }}>
                  {renderFullChart(lifeData.baseLine, lifeData.scenarioLine, {
                    forkColor: lifeData.isPositive ? '#86EFAC' : '#FBBF24',
                  })}
                </div>
              )}

              {/* Positive scenario stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              {(lifeData.isPositive ? [
                  { label: 'MONTHLY SAVINGS', value: `+€${Math.abs(lifeData.extraMonthly)}`, color: '#86EFAC' },
                  { label: 'GOAL ACCELERATION', value: lifeData.goalAccel > 0 ? `${lifeData.goalAccel} mo sooner` : 'No change', color: '#86EFAC' },
                  { label: 'ANNUAL IMPACT', value: `+€${Math.abs(lifeData.annualImpact)}`, color: '#86EFAC' },
                ] : [
                  { label: 'EXTRA/MONTH', value: `${lifeData.extraMonthly >= 0 ? '+' : ''}€${Math.abs(lifeData.extraMonthly)}`, color: '#FBBF24' },
                  { label: 'GOALS FASTER', value: lifeData.goalAccel > 0 ? `${lifeData.goalAccel} mo sooner` : 'No change', color: '#86EFAC' },
                  { label: 'NEW SAVINGS RATE', value: `${lifeData.newSavingsRate}%`, color: '#86EFAC' },
                ]).map((m, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                  ))}
              </div>

              {/* Before / After budget bars */}
              <div className="mt-4" style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: 14,
              }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 4 }}>Current</div>
                <div className="flex rounded-md overflow-hidden" style={{ height: 28 }}>
                  {lifeData.blocks.map((b, i) => {
                    const total = budget ? budget.income : lifeData.blocks.reduce((s, bl) => s + bl.amount, 0);
                    const pct = total > 0 ? (b.amount / total) * 100 : 20;
                    return (
                      <div key={`curr-${i}`} className="flex items-center justify-center" style={{
                        width: `${Math.max(pct, 3)}%`, background: b.color, minWidth: 2,
                      }}>
                        {pct > 10 && <span style={{ fontSize: 8, fontWeight: 700, color: 'white' }}>{b.label}</span>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
                  After {scenarioLabel}
                </div>
                <div className="flex rounded-md overflow-hidden" style={{ height: 28 }}>
                  {lifeData.blocks.map((b, i) => {
                    const newAmt = b.newAmount ?? b.amount;
                    const totalAfter = budget ? budget.income + lifeData.extraMonthly : lifeData.blocks.reduce((s, bl) => s + (bl.newAmount ?? bl.amount), 0);
                    const pct = totalAfter > 0 ? (newAmt / totalAfter) * 100 : 20;
                    const changed = newAmt !== b.amount;
                    return (
                      <div key={`new-${i}`} className="flex items-center justify-center" style={{
                        width: `${Math.max(pct, 3)}%`, background: b.color, minWidth: 2,
                        outline: changed ? '1px solid rgba(134,239,172,0.4)' : 'none',
                      }}>
                        {pct > 10 && <span style={{ fontSize: 8, fontWeight: 700, color: changed ? '#86EFAC' : 'white' }}>{b.label}</span>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10, color: lifeData.extraMonthly >= 0 ? '#86EFAC' : '#FBBF24' }}>
                  {lifeData.extraMonthly >= 0 ? '+' : ''}€{Math.abs(lifeData.extraMonthly)}/month {lifeData.extraMonthly >= 0 ? 'extra free cash' : 'less free cash'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                <button onClick={resetMenu} style={{
                  flex: 1, height: 44, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                  fontSize: 14, fontWeight: 500, border: 'none',
                }}>Try another</button>
                {lifeData.isPositive && (
                  <button onClick={handleClose} style={{
                    flex: 1, height: 44, borderRadius: 10,
                    background: '#27AE60', color: 'white',
                    fontSize: 14, fontWeight: 600, border: 'none',
                  }}>Apply plan</button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
