import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, PiggyBank, TrendingDown, ChevronRight, X, Shield,
  AlertTriangle, Flame, Layers, TrendingUp, PlusCircle, Heart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──
type ScenarioId =
  | 'cheap-rent' | 'save-more' | 'income-drop-quick'
  | 'job-loss' | 'income-cut' | 'emergency' | 'inflation' | 'perfect-storm'
  | 'raise' | 'cheaper-housing' | 'side-income' | 'baby';

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
}

const scenarios: ScenarioDef[] = [
  // Quick
  { id: 'cheap-rent', icon: Home, label: 'Cheaper rent (-€100)', section: 'quick', instant: true },
  { id: 'save-more', icon: PiggyBank, label: 'Save €100 more', section: 'quick', instant: true },
  { id: 'income-drop-quick', icon: TrendingDown, label: 'Income drops 20%', section: 'quick', instant: true },
  // Stress
  { id: 'job-loss', icon: AlertTriangle, label: 'Job loss', section: 'stress', pills: ['1 mo', '3 mo', '6 mo'], pillLabel: 'How long without income?' },
  { id: 'income-cut', icon: TrendingDown, label: 'Income cut', section: 'stress', pills: ['-10%', '-20%', '-30%', '-50%'], pillLabel: 'How much?' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency expense', section: 'stress', pills: ['€500', '€1k', '€2.5k', '€5k'], pillLabel: 'How big?' },
  { id: 'inflation', icon: Flame, label: 'Inflation', section: 'stress', pills: ['5%', '8%', '12%'], pillLabel: 'Annual rate?' },
  { id: 'perfect-storm', icon: Layers, label: 'Perfect storm', section: 'stress', instant: true },
  // Life Changes
  { id: 'raise', icon: TrendingUp, label: 'I get a raise', section: 'life', pills: ['+5%', '+10%', '+20%', '+30%'], pillLabel: 'How much?' },
  { id: 'cheaper-housing', icon: Home, label: 'Cheaper housing', section: 'life', euroInput: true, euroLabel: 'New monthly rent' },
  { id: 'side-income', icon: PlusCircle, label: 'Side income', section: 'life', euroInput: true, euroLabel: 'Extra per month', euroDefault: 300 },
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
    return {
      income, totalFixed, totalSpending, savings, goalsTotal, goals,
      freeAmount: income - totalFixed - totalSpending - savings - goalsTotal,
      rent: rentCat ? Number(rentCat.monthlyBudget) || 0 : 0,
      expenseCats, fixedCats, bankBalance, savingsBalance,
      foodBudget: expenseCats.find((c: any) => c.name === 'Food')?.monthlyBudget || 350,
    };
  } catch { return null; }
}

// ── Stress simulation ──
function simulateStress(scenarioId: ScenarioId, pill: string, budget: ReturnType<typeof readBudgetData>) {
  if (!budget) return [];
  const results: Array<{ month: number; reserves: number; isBroke: boolean }> = [];
  let reserves = budget.bankBalance + budget.savingsBalance;
  let monthlyIncome = budget.income;
  const monthlyBurn = budget.totalFixed + budget.foodBudget;
  let emergencyHit = 0;
  let durationMonths = 24;

  if (scenarioId === 'job-loss') {
    monthlyIncome = 0;
    durationMonths = pill === '1 mo' ? 1 : pill === '3 mo' ? 3 : 6;
  } else if (scenarioId === 'income-cut') {
    const pct = parseInt(pill.replace(/[^0-9]/g, '')) || 20;
    monthlyIncome *= (1 - pct / 100);
  } else if (scenarioId === 'emergency') {
    emergencyHit = pill === '€500' ? 500 : pill === '€1k' ? 1000 : pill === '€2.5k' ? 2500 : 5000;
  } else if (scenarioId === 'inflation') {
    const rate = parseInt(pill) || 8;
    // Increase burn
    const inflated = monthlyBurn * (1 + rate / 100);
    reserves -= emergencyHit;
    for (let m = 0; m <= 24; m++) {
      results.push({ month: m, reserves: Math.round(reserves), isBroke: reserves < 0 });
      reserves += monthlyIncome - inflated;
    }
    return results;
  } else if (scenarioId === 'perfect-storm') {
    monthlyIncome *= 0.7;
    emergencyHit = 2000;
  }

  reserves -= emergencyHit;

  for (let m = 0; m <= 24; m++) {
    const net = monthlyIncome - monthlyBurn;
    results.push({ month: m, reserves: Math.round(reserves), isBroke: reserves < 0 });
    reserves += net;
    if (durationMonths < 24 && m >= durationMonths) monthlyIncome = budget.income;
  }
  return results;
}

function simulateWithFund(scenarioId: ScenarioId, pill: string, budget: ReturnType<typeof readBudgetData>) {
  if (!budget) return [];
  const preparedBudget = {
    ...budget,
    bankBalance: 6 * (budget.totalFixed + budget.foodBudget),
    savingsBalance: 0,
  };
  return simulateStress(scenarioId, pill, preparedBudget);
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

  const runScenario = useCallback((id: ScenarioId, pill: string) => {
    const def = scenarios.find(s => s.id === id);
    if (!def) return;
    setActiveScenario({ id, pill });
    if (def.section === 'stress' || def.section === 'quick' && ['income-drop-quick'].includes(id)) {
      setView('stress-results');
    } else {
      setView('life-results');
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
    const results = simulateStress(activeScenario.id, activeScenario.pill, budget);
    const preparedResults = showPrepared ? simulateWithFund(activeScenario.id, activeScenario.pill, budget) : null;
    const brokeIdx = results.findIndex(r => r.isBroke);
    const recoveryIdx = brokeIdx >= 0 ? results.findIndex((r, i) => i > brokeIdx && !r.isBroke) : -1;
    const maxReserves = Math.max(...results.map(r => r.reserves), 0);
    const minReserves = Math.min(...results.map(r => r.reserves));
    const survivalMonths = brokeIdx >= 0 ? brokeIdx : results.length;

    return { results, preparedResults, brokeIdx, recoveryIdx, maxReserves, minReserves, survivalMonths };
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
    else if (id === 'side-income') extraMonthly = Number(pill) || 300;
    else if (id === 'baby') extraMonthly = -(Math.round(budget.income * 0.15) + 400);

    const currentSavingsRate = budget.income > 0 ? Math.round((budget.savings / budget.income) * 100) : 0;
    const newSavingsRate = budget.income > 0 ? Math.round(((budget.savings + Math.max(0, extraMonthly * 0.5)) / (budget.income + extraMonthly)) * 100) : 0;

    // Goal acceleration
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

    // Budget blocks
    const blocks = [
      { label: 'Spending', amount: budget.totalSpending, color: '#8E44AD' },
      { label: 'Fixed', amount: budget.totalFixed, newAmount: id === 'cheap-rent' || id === 'cheaper-housing' ? budget.totalFixed - Math.max(0, extraMonthly) : budget.totalFixed, color: '#5D6D7E' },
      { label: 'Savings', amount: budget.savings, color: '#2980B9' },
      { label: 'Goals', amount: budget.goalsTotal, color: '#E91E63' },
    ].filter(b => b.amount > 0);

    return { extraMonthly, newSavingsRate, goalAccel, blocks, isPositive: extraMonthly >= 0 };
  }, [activeScenario, view, budget]);

  if (!open) return null;

  const scenarioLabel = activeScenario
    ? (scenarios.find(s => s.id === activeScenario.id)?.label || '') + (activeScenario.pill ? ` (${activeScenario.pill})` : '')
    : '';

  // ── Chart renderer for stress ──
  const renderStressChart = () => {
    if (!stressData) return null;
    const { results, preparedResults, brokeIdx, recoveryIdx, maxReserves, minReserves } = stressData;
    const W = 340, H = 160, PAD = 30;
    const chartW = W - PAD * 2, chartH = H - 30;
    const yMax = Math.max(maxReserves, preparedResults ? Math.max(...preparedResults.map(r => r.reserves)) : 0, 100);
    const yMin = Math.min(minReserves, 0);
    const yRange = yMax - yMin || 1;

    const toX = (i: number) => PAD + (i / (results.length - 1)) * chartW;
    const toY = (v: number) => 10 + chartH - ((v - yMin) / yRange) * chartH;

    const path = results.map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(r.reserves)}`).join(' ');
    const areaPath = `${path} L${toX(results.length - 1)},${toY(yMin)} L${toX(0)},${toY(yMin)} Z`;
    const prepPath = preparedResults?.map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(r.reserves)}`).join(' ');

    const now = new Date();
    const monthLabels = [0, 6, 12, 18, 24].map(m => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + m);
      return { m, label: d.toLocaleString('en', { month: 'short', year: '2-digit' }) };
    });

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(139,92,246,0.4)" />
            <stop offset="50%" stopColor="rgba(236,72,153,0.3)" />
            <stop offset="100%" stopColor="rgba(231,76,60,0.4)" />
          </linearGradient>
        </defs>
        {/* Zero line */}
        <line x1={PAD} y1={toY(0)} x2={W - PAD} y2={toY(0)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {/* Area */}
        <path d={areaPath} fill="url(#stressGrad)" opacity="0.5" />
        {/* Main line */}
        <path d={path} fill="none" stroke="white" strokeWidth="2" />
        {/* Prepared line */}
        {prepPath && <path d={prepPath} fill="none" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4,3" />}
        {/* Broke marker */}
        {brokeIdx >= 0 && (
          <g>
            <line x1={toX(brokeIdx)} y1={10} x2={toX(brokeIdx)} y2={H - 20} stroke="#EF4444" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={toX(brokeIdx)} cy={toY(results[brokeIdx].reserves)} r="3" fill="#EF4444" />
            <text x={toX(brokeIdx)} y={8} fill="#EF4444" fontSize="9" textAnchor="middle" fontWeight="600">Broke</text>
          </g>
        )}
        {/* Recovery marker */}
        {recoveryIdx >= 0 && (
          <g>
            <line x1={toX(recoveryIdx)} y1={10} x2={toX(recoveryIdx)} y2={H - 20} stroke="#86EFAC" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={toX(recoveryIdx)} cy={toY(results[recoveryIdx].reserves)} r="3" fill="#86EFAC" />
            <text x={toX(recoveryIdx)} y={8} fill="#86EFAC" fontSize="9" textAnchor="middle" fontWeight="600">Recovers</text>
          </g>
        )}
        {/* Month labels */}
        {monthLabels.map(ml => (
          <text key={ml.m} x={toX(ml.m)} y={H - 4} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="middle">{ml.label}</text>
        ))}
        {/* Y labels */}
        {[0, Math.round(yMax / 2), yMax].map(v => (
          <text key={v} x={PAD - 4} y={toY(v) + 3} fill="rgba(255,255,255,0.25)" fontSize="8" textAnchor="end">€{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}</text>
        ))}
      </svg>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              maxHeight: view === 'menu' ? '70vh' : '85vh',
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

            {/* ═══ MENU ═══ */}
            {view === 'menu' && (
              <div className="px-5 pb-8">
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
                              <Icon size={18} style={{ color: 'rgba(255,255,255,0.35)', marginRight: 14, flexShrink: 0 }} />
                              <span style={{ fontSize: 15, color: 'white', flex: 1 }}>{def.label}</span>
                              <ChevronRight size={16} style={{
                                color: 'rgba(255,255,255,0.12)',
                                transform: isExpanded ? 'rotate(90deg)' : undefined,
                                transition: 'transform 200ms',
                              }} />
                            </div>
                            {/* Inline config */}
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

            {/* ═══ STRESS TEST RESULTS ═══ */}
            {view === 'stress-results' && stressData && (
              <div className="px-5 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{scenarioLabel}</span>
                  <button onClick={handleClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
                </div>

                {/* Chart */}
                <div className="my-4">{renderStressChart()}</div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'SURVIVAL', value: stressData.brokeIdx < 0 ? 'Indefinitely' : `${stressData.survivalMonths} mo`, color: stressData.brokeIdx < 0 ? '#86EFAC' : 'white' },
                    { label: 'BROKE AFTER', value: stressData.brokeIdx < 0 ? 'Never' : `Month ${stressData.brokeIdx}`, color: stressData.brokeIdx < 0 ? '#86EFAC' : '#EF4444' },
                    { label: 'RECOVERY', value: stressData.recoveryIdx < 0 ? (stressData.brokeIdx < 0 ? 'N/A' : 'No') : `Month ${stressData.recoveryIdx}`, color: 'white' },
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
                  <button onClick={() => { resetMenu(); }} style={{
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

            {/* ═══ LIFE CHANGE RESULTS ═══ */}
            {view === 'life-results' && lifeData && (
              <div className="px-5 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{scenarioLabel}</span>
                  <button onClick={handleClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
                </div>

                {/* Key metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
                  {[
                    { label: 'EXTRA/MONTH', value: `${lifeData.extraMonthly >= 0 ? '+' : ''}€${Math.abs(lifeData.extraMonthly)}`, color: lifeData.extraMonthly >= 0 ? '#86EFAC' : '#FBBF24' },
                    { label: 'GOALS FASTER', value: lifeData.goalAccel > 0 ? `${lifeData.goalAccel} mo sooner` : 'No change', color: '#86EFAC' },
                    { label: 'NEW SAVINGS RATE', value: `${lifeData.newSavingsRate}%`, color: '#86EFAC' },
                  ].map((m, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Budget impact bar */}
                <div className="mt-4" style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>Budget Impact</div>
                  <div className="flex rounded-lg overflow-hidden" style={{ height: 32 }}>
                    {lifeData.blocks.map((b, i) => {
                      const total = lifeData.blocks.reduce((s, bl) => s + bl.amount, 0);
                      const pct = total > 0 ? (b.amount / total) * 100 : 25;
                      return (
                        <div key={i} className="flex items-center justify-center" style={{ width: `${pct}%`, background: b.color, minWidth: 24 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'white' }}>{b.label}</span>
                        </div>
                      );
                    })}
                    {lifeData.extraMonthly > 0 && budget && (
                      <div className="flex items-center justify-center" style={{
                        width: `${Math.round(lifeData.extraMonthly / budget.income * 100)}%`,
                        background: 'rgba(134,239,172,0.3)', minWidth: 16,
                      }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#86EFAC' }}>+</span>
                      </div>
                    )}
                  </div>
                  {/* Delta text */}
                  {lifeData.blocks.map((b, i) => {
                    const newAmt = (b as any).newAmount;
                    if (newAmt === undefined || newAmt === b.amount) return null;
                    const delta = newAmt - b.amount;
                    return (
                      <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                        {b.label}: €{b.amount} → €{newAmt}{' '}
                        <span style={{ color: delta < 0 ? '#86EFAC' : '#FBBF24', fontWeight: 600 }}>
                          ({delta > 0 ? '+' : ''}€{delta})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  <button onClick={handleClose} style={{
                    flex: 1, height: 44, borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                    fontSize: 14, fontWeight: 500, border: 'none',
                  }}>Save scenario</button>
                  {lifeData.isPositive && (
                    <button onClick={handleClose} style={{
                      flex: 1, height: 44, borderRadius: 10,
                      background: '#27AE60', color: 'white',
                      fontSize: 14, fontWeight: 600, border: 'none',
                    }}>Apply changes</button>
                  )}
                  <button onClick={handleClose} style={{
                    height: 44, padding: '0 12px',
                    color: 'rgba(255,255,255,0.25)', fontSize: 13,
                    background: 'none', border: 'none',
                  }}>Done</button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
