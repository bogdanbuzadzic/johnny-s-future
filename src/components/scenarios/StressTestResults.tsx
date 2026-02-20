import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Timer, Skull, RefreshCw, Target, Shield, Scissors, Layers, Pause,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SelectedScenario } from './ScenarioPicker';
import { addMonths, format } from 'date-fns';

interface ClarityData {
  income: number;
  fixedTotal: number;
  foodBudget: number;
  spendingFlex: number;
  bankBalance: number;
  savingsBalance: number;
  goalsTotal: number;
}

interface SimResult {
  month: number;
  reserves: number;
  income: number;
  burn: number;
  net: number;
  isBroke: boolean;
}

function readClarityData(): ClarityData {
  try {
    const raw = localStorage.getItem('jfb-budget-data');
    if (!raw) return { income: 2500, fixedTotal: 800, foodBudget: 350, spendingFlex: 1000, bankBalance: 2000, savingsBalance: 1000, goalsTotal: 200 };
    const p = JSON.parse(raw);
    const config = p.config || {};
    const cats = (p.categories || []) as any[];
    const fixedCats = cats.filter((c: any) => c.type === 'fixed');
    const expenseCats = cats.filter((c: any) => c.type === 'expense');
    const totalFixed = fixedCats.reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);
    const foodCat = expenseCats.find((c: any) => c.name === 'Food');
    const foodBudget = foodCat ? Number(foodCat.monthlyBudget) || 350 : 350;
    const spendingFlex = expenseCats.reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);
    const savings = Number(config.monthlySavingsTarget) || 0;
    const goals = JSON.parse(localStorage.getItem('jfb_goals') || '[]');
    const goalsTotal = goals.reduce((s: number, g: any) => s + (Number(g.monthlyContribution) || 0), 0);
    return {
      income: Number(config.monthlyIncome) || 2500,
      fixedTotal: totalFixed,
      foodBudget,
      spendingFlex,
      bankBalance: 2000,
      savingsBalance: savings * 6,
      goalsTotal,
    };
  } catch { return { income: 2500, fixedTotal: 800, foodBudget: 350, spendingFlex: 1000, bankBalance: 2000, savingsBalance: 1000, goalsTotal: 200 }; }
}

function parseScenarioParams(scenarios: SelectedScenario[]) {
  let scenarioType = 'job-loss';
  let cutPercent = 0;
  let emergencyAmount = 0;
  let inflationRate = 0;
  let durationMonths = 3;

  for (const s of scenarios) {
    scenarioType = s.config.id;
    if (s.config.id === 'job-loss') {
      const v = String(s.value1 || '3 months');
      const m = v.match(/(\d+)/);
      durationMonths = m ? parseInt(m[1]) : 3;
    }
    if (s.config.id === 'income-cut') {
      const v1 = String(s.value1 || '-20%');
      cutPercent = parseInt(v1.replace(/[^0-9]/g, '')) || 20;
      const v2 = String(s.value2 || '6 months');
      if (v2 === 'Permanent') durationMonths = 999;
      else { const m = v2.match(/(\d+)/); durationMonths = m ? parseInt(m[1]) * (v2.includes('year') ? 12 : 1) : 6; }
    }
    if (s.config.id === 'emergency') {
      const v = String(s.value1 || '€1,000');
      emergencyAmount = parseInt(v.replace(/[^0-9]/g, '')) || 1000;
    }
    if (s.config.id === 'inflation') {
      const v = String(s.value1 || '8%');
      inflationRate = parseInt(v.replace(/[^0-9]/g, '')) || 8;
    }
    if (s.config.id === 'perfect-storm') {
      cutPercent = 30; emergencyAmount = 2000; inflationRate = 8; durationMonths = 6;
    }
  }

  return { scenarioType, cutPercent, emergencyAmount, inflationRate, durationMonths };
}

function simulateStress(params: ReturnType<typeof parseScenarioParams>, data: ClarityData): SimResult[] {
  const results: SimResult[] = [];
  let reserves = (data.bankBalance || 0) + (data.savingsBalance || 0);
  let monthlyIncome = data.income;

  if (params.scenarioType === 'job-loss') monthlyIncome = 0;
  if (params.scenarioType === 'income-cut' || params.cutPercent > 0) monthlyIncome = data.income * (1 - params.cutPercent / 100);

  const inflationMult = params.inflationRate > 0 ? (1 + params.inflationRate / 100) : 1;
  const monthlyBurn = (data.fixedTotal * inflationMult) + (data.foodBudget * inflationMult);
  let currentIncome = monthlyIncome;

  reserves -= params.emergencyAmount;

  for (let month = 0; month <= 24; month++) {
    const net = currentIncome - monthlyBurn;
    results.push({
      month, reserves: Math.round(reserves),
      income: Math.round(currentIncome), burn: Math.round(monthlyBurn),
      net: Math.round(net), isBroke: reserves < 0,
    });
    reserves += net;
    if (params.durationMonths && month >= params.durationMonths && params.durationMonths < 999) {
      currentIncome = data.income;
    }
  }
  return results;
}

function simulateWithFund(params: ReturnType<typeof parseScenarioParams>, data: ClarityData): SimResult[] {
  const preparedReserves = 6 * (data.fixedTotal + data.foodBudget);
  return simulateStress(params, { ...data, bankBalance: preparedReserves, savingsBalance: 0 });
}

interface Recommendation {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  priority: 'high' | 'medium' | 'low';
  color: string;
}

function getRecommendations(data: ClarityData): Recommendation[] {
  const recs: Recommendation[] = [];
  const reserves = (data.bankBalance || 0) + (data.savingsBalance || 0);
  const monthlyBurn = data.fixedTotal + data.foodBudget;
  const emergencyMonths = monthlyBurn > 0 ? reserves / monthlyBurn : 0;

  if (emergencyMonths < 3) {
    const needed = (3 * monthlyBurn) - reserves;
    recs.push({ icon: Shield, title: '3-month emergency fund', subtitle: `You need €${Math.round(needed)} more. Save €${Math.round(needed / 12)}/mo to get there in 1 year.`, priority: 'high', color: '#E74C3C' });
  } else if (emergencyMonths < 6) {
    const needed = (6 * monthlyBurn) - reserves;
    recs.push({ icon: Shield, title: '6-month emergency fund', subtitle: `You have ${emergencyMonths.toFixed(1)} months covered. €${Math.round(needed)} more for full safety.`, priority: 'medium', color: '#F39C12' });
  }

  const cuttable = data.spendingFlex - data.foodBudget;
  if (cuttable > 0) {
    recs.push({ icon: Scissors, title: 'Emergency spending cuts', subtitle: `You could cut up to €${Math.round(cuttable)}/mo by pausing non-essential spending.`, priority: 'medium', color: '#E67E22' });
  }

  recs.push({ icon: Layers, title: 'Income diversification', subtitle: `A side income of €200/mo would extend survival by ${monthlyBurn > 0 ? Math.round(200 / monthlyBurn * 30) : 0} days per month.`, priority: 'low', color: '#2980B9' });

  if (data.goalsTotal > 0) {
    recs.push({ icon: Pause, title: 'Pause goal contributions', subtitle: `Pausing goals frees €${data.goalsTotal}/mo. Delays goals but buys ${monthlyBurn > 0 ? (data.goalsTotal / monthlyBurn).toFixed(1) : 0} extra months.`, priority: 'medium', color: '#9B59B6' });
  }

  return recs.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
}

const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' };

interface StressTestResultsProps {
  scenarios: SelectedScenario[];
  onClose: () => void;
  onTryAnother: () => void;
  onBuildSafetyNet: () => void;
}

export function StressTestResults({ scenarios, onClose, onTryAnother, onBuildSafetyNet }: StressTestResultsProps) {
  const [showPrepared, setShowPrepared] = useState(false);

  const clarityData = useMemo(() => readClarityData(), []);
  const params = useMemo(() => parseScenarioParams(scenarios), [scenarios]);
  const results = useMemo(() => simulateStress(params, clarityData), [params, clarityData]);
  const preparedResults = useMemo(() => simulateWithFund(params, clarityData), [params, clarityData]);
  const recs = useMemo(() => getRecommendations(clarityData), [clarityData]);

  const brokeMonth = results.findIndex(r => r.isBroke);
  const recoveryMonth = brokeMonth >= 0 ? results.findIndex((r, i) => i > brokeMonth && r.reserves >= 0) : -1;
  const survivalMonths = brokeMonth >= 0 ? brokeMonth : Infinity;

  const scenarioLabel = scenarios.map(s => s.config.label).join(' + ');
  const durationLabel = params.durationMonths < 999 ? ` for ${params.durationMonths} months` : '';

  // Chart
  const chartW = 320;
  const chartH = 180;
  const maxRes = Math.max(...results.map(r => Math.abs(r.reserves)), ...preparedResults.map(r => Math.abs(r.reserves)), 1);
  const mapX = (i: number) => (i / (results.length - 1)) * chartW;
  const mapY = (v: number) => chartH - 10 - ((v + maxRes * 0.1) / (maxRes * 1.2)) * (chartH - 20);

  const mainPath = results.map((r, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(r.reserves)}`).join(' ');
  const mainFill = `${mainPath} L ${chartW} ${chartH} L 0 ${chartH} Z`;
  const prepPath = preparedResults.map((r, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(r.reserves)}`).join(' ');

  const now = new Date();
  const monthLabels = results.filter((_, i) => i % 3 === 0).map((r, idx) => ({
    x: mapX(r.month),
    text: format(addMonths(now, r.month), 'MMM'),
  }));

  const brokeX = brokeMonth >= 0 ? mapX(brokeMonth) : -1;
  const recoveryX = recoveryMonth >= 0 ? mapX(recoveryMonth) : -1;

  // Goals impact
  const goals = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_goals') || '[]'); } catch { return []; }
  }, []);
  const goalImpactText = goals.slice(0, 2).map((g: any) => {
    const mc = Number(g.monthlyContribution) || 0;
    const delay = mc > 0 ? Math.round(params.durationMonths * mc / mc) : 0;
    return `${g.name}: +${delay} mo`;
  }).join(', ');

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: 'linear-gradient(to bottom, #1A1020, #0D0A15)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="px-4 pt-12 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onClose}><ArrowLeft size={24} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
          <span className="text-[20px] font-bold text-white">Stress Test</span>
        </div>
        <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {scenarioLabel}{durationLabel}
        </p>

        {/* Survival Timeline Chart */}
        <div className="rounded-[20px] p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
          <svg width={chartW} height={chartH} className="w-full" viewBox={`0 0 ${chartW} ${chartH}`}>
            <defs>
              <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(39,174,96,0.4)" />
                <stop offset="70%" stopColor="rgba(241,196,15,0.3)" />
                <stop offset="100%" stopColor="rgba(231,76,60,0.4)" />
              </linearGradient>
            </defs>

            {/* Zero line */}
            <line x1={0} y1={mapY(0)} x2={chartW} y2={mapY(0)}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" />

            {/* Main fill */}
            <path d={mainFill} fill="url(#stressGrad)" />

            {/* Main line */}
            <path d={mainPath} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />

            {/* Prepared line */}
            {showPrepared && (
              <path d={prepPath} fill="none" stroke="#34C759" strokeWidth={2} strokeDasharray="6 4" />
            )}

            {/* BROKE marker */}
            {brokeX >= 0 && (
              <>
                <line x1={brokeX} y1={0} x2={brokeX} y2={chartH}
                  stroke="rgba(239,68,68,0.4)" strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={brokeX} cy={mapY(0)} r={6} fill="#EF4444" />
                <rect x={brokeX - 22} y={4} width={44} height={16} rx={8} fill="rgba(239,68,68,0.8)" />
                <text x={brokeX} y={15} textAnchor="middle" fill="white" fontSize={9} fontWeight={700}>BROKE</text>
              </>
            )}

            {/* RECOVERED marker */}
            {recoveryX >= 0 && (
              <>
                <line x1={recoveryX} y1={0} x2={recoveryX} y2={chartH}
                  stroke="rgba(52,199,89,0.4)" strokeWidth={1} strokeDasharray="4 4" />
                <rect x={recoveryX - 32} y={4} width={64} height={16} rx={8} fill="rgba(52,199,89,0.6)" />
                <text x={recoveryX} y={15} textAnchor="middle" fill="white" fontSize={9} fontWeight={600}>RECOVERED</text>
              </>
            )}

            {/* Month labels */}
            {monthLabels.map((l, i) => (
              <text key={i} x={l.x} y={chartH - 2} textAnchor="middle"
                fill="rgba(255,255,255,0.35)" fontSize={10}>{l.text}</text>
            ))}

            {/* Y labels */}
            <text x={2} y={mapY(0) - 4} fill="rgba(255,255,255,0.3)" fontSize={9}>€0</text>
            {maxRes > 500 && <text x={2} y={mapY(maxRes * 0.5) - 4} fill="rgba(255,255,255,0.3)" fontSize={9}>€{Math.round(maxRes * 0.5).toLocaleString()}</text>}
          </svg>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {[
            { icon: Timer, label: 'Survival', value: survivalMonths === Infinity ? 'Indefinitely' : `${survivalMonths.toFixed(1)} months`, color: survivalMonths === Infinity ? '#34C759' : 'white', context: survivalMonths === Infinity ? 'You survive this scenario' : 'Before reserves run out' },
            { icon: Skull, label: 'Broke after', value: brokeMonth >= 0 ? `Month ${brokeMonth} (${format(addMonths(now, brokeMonth), 'MMM yyyy')})` : 'Never', color: brokeMonth >= 0 ? '#EF4444' : '#34C759', context: brokeMonth >= 0 ? 'Reserves hit zero' : 'You stay afloat' },
            { icon: RefreshCw, label: 'Recovery', value: recoveryMonth >= 0 ? `Month ${recoveryMonth}` : brokeMonth >= 0 ? 'N/A' : 'N/A', color: 'white', context: recoveryMonth >= 0 ? 'Back above zero' : 'Not applicable' },
            { icon: Target, label: 'Goal impact', value: goalImpactText || 'No goals set', color: 'white', context: 'Delayed by scenario' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="rounded-[14px] p-3.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.06)' }}
              >
                <Icon size={16} style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 4 }} />
                <p className="text-[11px] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</p>
                <p className="text-[16px] font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{stat.context}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Prepared toggle */}
        <div className="rounded-[14px] p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} style={{ color: '#34C759' }} />
            <span className="text-[14px] font-bold text-white">What if you had a 6-month emergency fund?</span>
          </div>
          <button
            className="rounded-xl px-4 py-2 text-[13px] font-semibold"
            style={{ background: showPrepared ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.08)', color: '#34C759', border: '1px solid rgba(52,199,89,0.2)' }}
            onClick={() => setShowPrepared(!showPrepared)}
          >
            {showPrepared ? 'Hide comparison' : 'Show me'}
          </button>
        </div>

        {/* Recommendations */}
        <p className="text-[16px] font-bold text-white mb-3">How to prepare</p>
        {recs.map((rec, i) => {
          const Icon = rec.icon;
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="rounded-r-xl p-3.5 mb-2"
              style={{ background: 'rgba(255,255,255,0.04)', borderLeft: `4px solid ${rec.color}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color: rec.color }} />
                  <span className="text-[13px] font-bold text-white">{rec.title}</span>
                </div>
                <span className="text-[9px] font-bold rounded-full px-2 py-0.5"
                  style={{ background: `${priorityColors[rec.priority]}20`, color: priorityColors[rec.priority] }}>
                  {rec.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{rec.subtitle}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 flex gap-2.5" style={{ background: 'rgba(13,10,21,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onTryAnother}
          className="flex-1 h-12 rounded-[14px] text-[14px] font-medium"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          Try another
        </button>
        <button onClick={onBuildSafetyNet}
          className="flex-1 h-12 rounded-[14px] text-[14px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}>
          Build my safety net
        </button>
      </div>
    </motion.div>
  );
}
