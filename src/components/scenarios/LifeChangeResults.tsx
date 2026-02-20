import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, Target, PiggyBank, Lightbulb, Home,
} from 'lucide-react';
import type { SelectedScenario } from './ScenarioPicker';

interface LifeChangeResultsProps {
  scenarios: SelectedScenario[];
  onClose: () => void;
  onSave: () => void;
  onApply: () => void;
}

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
    return {
      income, totalFixed, totalSpending, savings, goalsTotal, goals,
      freeAmount: income - totalFixed - totalSpending - savings - goalsTotal,
      rent: rentCat ? Number(rentCat.monthlyBudget) || 0 : 0,
      expenseCats, fixedCats,
    };
  } catch { return null; }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function LifeChangeResults({ scenarios, onClose, onSave, onApply }: LifeChangeResultsProps) {
  const budget = useMemo(() => readBudgetData(), []);

  const scenarioLabel = scenarios.map(s => s.config.label).join(' + ');

  // Calculate impact
  const impact = useMemo(() => {
    if (!budget) return { extraMonthly: 0, newIncome: 0, newFixed: 0, newFree: 0, currentSavingsRate: 0, potentialSavingsRate: 0, goalAcceleration: 0 };
    let extraMonthly = 0;
    let newIncome = budget.income;
    let newFixed = budget.totalFixed;
    let newSavings = budget.savings;

    for (const s of scenarios) {
      if (s.config.id === 'raise') {
        const pct = Number(s.value1) || 10;
        const raise = Math.round(budget.income * pct / 100);
        extraMonthly += raise;
        newIncome += raise;
      }
      if (s.config.id === 'cheaper-housing') {
        const newRent = Number(s.value1) || budget.rent - 200;
        const diff = budget.rent - newRent;
        extraMonthly += diff;
        newFixed -= diff;
      }
      if (s.config.id === 'side-income') {
        const extra = Number(s.value1) || 300;
        extraMonthly += extra;
        newIncome += extra;
      }
      if (s.config.id === 'baby') {
        const incomeDrop = Math.round(budget.income * 0.15);
        const expenseIncrease = 400;
        extraMonthly -= (incomeDrop + expenseIncrease);
        newIncome -= incomeDrop;
      }
    }

    const newFree = newIncome - newFixed - budget.totalSpending - newSavings - budget.goalsTotal;
    const currentSavingsRate = budget.income > 0 ? Math.round((budget.savings / budget.income) * 100) : 0;
    const potentialSavingsRate = newIncome > 0 ? Math.round(((budget.savings + Math.max(0, extraMonthly * 0.5)) / newIncome) * 100) : 0;

    // Goal acceleration
    let goalAcceleration = 0;
    if (budget.goals.length > 0 && extraMonthly > 0) {
      const g = budget.goals[0];
      const remaining = (Number(g.target) || 0) - (Number(g.saved) || 0);
      const mc = Number(g.monthlyContribution) || 0;
      if (mc > 0) {
        const monthsNow = remaining / mc;
        const monthsNew = remaining / (mc + extraMonthly * 0.3);
        goalAcceleration = Math.round((monthsNow - monthsNew) * 10) / 10;
      }
    }

    return { extraMonthly, newIncome, newFixed, newFree, currentSavingsRate, potentialSavingsRate, goalAcceleration };
  }, [scenarios, budget]);

  const suggestions = useMemo(() => {
    const s: string[] = [];
    if (scenarios.some(sc => sc.config.id === 'raise')) {
      s.push('Put at least 50% of the raise toward savings or goals before lifestyle inflation kicks in.');
      s.push('Accelerate your highest-priority goal with the extra.');
    }
    if (scenarios.some(sc => sc.config.id === 'cheaper-housing')) {
      s.push('Direct the housing savings to your emergency fund first.');
    }
    if (scenarios.some(sc => sc.config.id === 'side-income')) {
      s.push('Keep side income separate — use it exclusively for goals.');
    }
    if (scenarios.some(sc => sc.config.id === 'baby')) {
      s.push('Start building a baby fund 6 months before the due date.');
      s.push('Review your insurance coverage and parental leave options.');
    }
    if (s.length < 2) s.push('Review your budget monthly to track the actual impact.');
    return s.slice(0, 3);
  }, [scenarios]);

  const blocks = useMemo(() => {
    if (!budget) return [];
    const total = budget.totalSpending + budget.totalFixed + budget.savings + budget.goalsTotal;
    const items = [
      { label: 'Spending', amount: budget.totalSpending, color: '#8E44AD', delta: 0 },
      { label: 'Fixed', amount: budget.totalFixed, color: '#5D6D7E', delta: budget.totalFixed - impact.newFixed },
      { label: 'Savings', amount: budget.savings, color: '#2980B9', delta: 0 },
      { label: 'Goals', amount: budget.goalsTotal, color: '#E91E63', delta: 0 },
    ].filter(b => b.amount > 0);

    return items.map(b => ({
      ...b,
      pct: total > 0 ? Math.round((b.amount / total) * 100) : 0,
    }));
  }, [budget, impact]);

  const isPositive = impact.extraMonthly >= 0;

  if (!budget) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="px-4 pt-12 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onClose}><ArrowLeft size={24} style={{ color: '#2D2440' }} /></button>
          <span className="text-[20px] font-bold" style={{ color: '#2D2440' }}>Scenario Results</span>
        </div>
        <p className="text-[13px] mb-6" style={{ color: '#5C4F6E' }}>{scenarioLabel}</p>

        {/* Key Metrics */}
        <div className="flex gap-3 overflow-x-auto mb-5 pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'Extra per month', value: `€${Math.abs(impact.extraMonthly)}`, color: isPositive ? '#27AE60' : '#EF4444', prefix: isPositive ? '+' : '-' },
            { label: 'Goals accelerated', value: impact.goalAcceleration > 0 ? `${impact.goalAcceleration} months sooner` : 'No change', color: '#16A34A' },
            { label: 'New savings rate', value: `${impact.potentialSavingsRate}%`, color: '#0D9488' },
          ].map((m, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[14px] p-4 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)', minWidth: 160 }}
            >
              <p className="text-[11px] uppercase" style={{ color: '#8A7FA0' }}>{m.label}</p>
              <p className="text-[24px] font-bold mt-1" style={{ color: m.color }}>
                {m.prefix || ''}{m.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mini Tetris */}
        <div className="rounded-2xl p-3.5 mb-5" style={{ background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.15)' }}>
          <p className="text-[13px] font-bold mb-3" style={{ color: '#2D2440' }}>Budget Impact</p>
          <div className="flex gap-1.5 rounded-xl overflow-hidden" style={{ height: 40 }}>
            {blocks.map((b, i) => (
              <div key={i} className="relative flex items-center justify-center"
                style={{ width: `${b.pct}%`, background: b.color, minWidth: 30 }}>
                <span className="text-[9px] font-bold text-white">{b.label}</span>
                {b.delta !== 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap"
                    style={{
                      background: b.delta > 0 ? 'rgba(39,174,96,0.15)' : 'rgba(239,68,68,0.15)',
                      color: b.delta > 0 ? '#16A34A' : '#DC2626',
                      border: b.delta > 0 ? '1px solid rgba(39,174,96,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    }}>
                    {b.delta > 0 ? '-' : '+'}€{Math.abs(b.delta)}
                  </div>
                )}
              </div>
            ))}
            {impact.extraMonthly > 0 && (
              <div className="flex items-center justify-center" style={{ width: `${Math.round(impact.extraMonthly / budget.income * 100)}%`, background: 'rgba(39,174,96,0.3)', minWidth: 20 }}>
                <span className="text-[8px] font-bold" style={{ color: '#166534' }}>+</span>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="rounded-[14px] p-4 mb-5" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} style={{ color: '#8B5CF6' }} />
            <span className="text-[14px] font-bold" style={{ color: '#2D2440' }}>Suggestions</span>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#8B5CF6' }} />
              <p className="text-[13px]" style={{ color: '#5C4F6E' }}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 flex gap-2.5" style={{
        background: 'rgba(250,244,252,0.9)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.5)',
      }}>
        <button onClick={onSave}
          className="flex-1 h-12 rounded-[14px] text-[14px] font-medium"
          style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)', color: '#2D2440' }}>
          Save Scenario
        </button>
        {isPositive && (
          <button onClick={onApply}
            className="flex-1 h-12 rounded-[14px] text-[14px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}>
            Apply Changes
          </button>
        )}
        <button onClick={onClose}
          className="flex-1 h-12 rounded-[14px] text-[14px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
          Done
        </button>
      </div>
    </motion.div>
  );
}
