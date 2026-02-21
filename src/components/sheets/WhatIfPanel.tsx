import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Briefcase, TrendingDown, AlertTriangle, Flame, Layers,
  TrendingUp, Home, PlusCircle, Heart, Shield, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──
export type ScenarioType = 'stress' | 'positive';

export interface ScenarioDefinition {
  id: string;
  icon: LucideIcon;
  label: string;
  type: ScenarioType;
  configType: 'none' | 'pills' | 'euro-input';
  configLabel?: string;
  pills?: string[];
  defaultPill?: string;
  euroPlaceholder?: string;
  euroDefault?: number;
}

export interface ActiveScenario {
  def: ScenarioDefinition;
  value?: string | number;
}

export interface ForkConfig {
  label: string;
  type: 'shock' | 'positive';
  // Modifiers applied to the base cash flow
  incomeMultiplier: number; // e.g. 0.7 for -30%
  extraMonthlyExpense: number;
  oneTimeExpense: number;
  durationMonths: number; // 0 = permanent
  extraMonthlyIncome: number;
}

const stressScenarios: ScenarioDefinition[] = [
  { id: 'job-loss', icon: Briefcase, label: 'Job loss', type: 'stress', configType: 'pills', configLabel: 'Duration', pills: ['1 month', '3 months', '6 months'], defaultPill: '3 months' },
  { id: 'income-drop', icon: TrendingDown, label: 'Income drops', type: 'stress', configType: 'pills', configLabel: 'How much?', pills: ['-10%', '-20%', '-30%', '-50%'], defaultPill: '-20%' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency expense', type: 'stress', configType: 'pills', configLabel: 'Amount', pills: ['€500', '€1,000', '€2,500', '€5,000'], defaultPill: '€1,000' },
  { id: 'inflation', icon: Flame, label: 'Inflation rises', type: 'stress', configType: 'pills', configLabel: 'Rate', pills: ['5%', '8%', '12%'], defaultPill: '8%' },
  { id: 'perfect-storm', icon: Layers, label: 'Perfect storm', type: 'stress', configType: 'none' },
];

const lifeChangeScenarios: ScenarioDefinition[] = [
  { id: 'raise', icon: TrendingUp, label: 'I get a raise', type: 'positive', configType: 'pills', configLabel: 'Raise', pills: ['+5%', '+10%', '+20%', '+30%'], defaultPill: '+10%' },
  { id: 'cheaper-housing', icon: Home, label: 'Cheaper housing', type: 'positive', configType: 'euro-input', configLabel: 'New monthly rent', euroPlaceholder: '0' },
  { id: 'side-income', icon: PlusCircle, label: 'Side income', type: 'positive', configType: 'euro-input', configLabel: 'Extra per month', euroDefault: 300 },
  { id: 'baby', icon: Heart, label: 'Having a baby', type: 'positive', configType: 'none' },
];

function parseEuro(s: string): number {
  return Number(s.replace(/[^0-9.]/g, '')) || 0;
}

function parsePercent(s: string): number {
  return Number(s.replace(/[^0-9.-]/g, '')) || 0;
}

function parseDuration(s: string): number {
  const n = parseInt(s);
  return isNaN(n) ? 3 : n;
}

export function scenariosToForkConfig(
  scenarios: ActiveScenario[],
  income: number,
  totalFixed: number,
): ForkConfig {
  let incomeMultiplier = 1;
  let extraMonthlyExpense = 0;
  let oneTimeExpense = 0;
  let durationMonths = 12; // default projection
  let extraMonthlyIncome = 0;
  let label = '';
  let type: 'shock' | 'positive' = 'positive';

  for (const s of scenarios) {
    const v = s.value;
    switch (s.def.id) {
      case 'job-loss':
        incomeMultiplier = 0;
        durationMonths = parseDuration(String(v || '3 months'));
        label = `Job loss ${v || '3 months'}`;
        type = 'shock';
        break;
      case 'income-drop': {
        const pct = parsePercent(String(v || '-20%'));
        incomeMultiplier *= (1 + pct / 100);
        label = `Income ${v || '-20%'}`;
        type = 'shock';
        break;
      }
      case 'emergency':
        oneTimeExpense += parseEuro(String(v || '€1,000'));
        label = `Emergency ${v || '€1,000'}`;
        type = 'shock';
        break;
      case 'inflation': {
        const rate = parsePercent(String(v || '8%')) / 100;
        extraMonthlyExpense += totalFixed * rate / 12;
        label = `Inflation ${v || '8%'}`;
        type = 'shock';
        break;
      }
      case 'perfect-storm':
        incomeMultiplier *= 0.7;
        oneTimeExpense += 2000;
        extraMonthlyExpense += totalFixed * 0.08 / 12;
        label = 'Perfect storm';
        type = 'shock';
        break;
      case 'raise': {
        const pct = parsePercent(String(v || '+10%'));
        incomeMultiplier *= (1 + pct / 100);
        label = `Raise ${v || '+10%'}`;
        break;
      }
      case 'cheaper-housing': {
        const newRent = parseEuro(String(v || '0'));
        // Assume current rent is largest fixed cost
        const currentRent = totalFixed > 0 ? totalFixed * 0.5 : 500;
        extraMonthlyIncome += Math.max(0, currentRent - newRent);
        label = `Cheaper housing €${newRent}`;
        break;
      }
      case 'side-income':
        extraMonthlyIncome += parseEuro(String(v || '300'));
        label = `Side income +€${parseEuro(String(v || '300'))}`;
        break;
      case 'baby':
        incomeMultiplier *= 0.85;
        extraMonthlyExpense += 400;
        label = 'Having a baby';
        type = 'shock';
        break;
    }
  }

  if (scenarios.length > 1) {
    label = scenarios.map(s => s.def.label).join(' + ');
  }

  return { label, type, incomeMultiplier, extraMonthlyExpense, oneTimeExpense, durationMonths, extraMonthlyIncome };
}

// ── Component ──
interface WhatIfPanelProps {
  onClose: () => void;
  activeScenarios: ActiveScenario[];
  setActiveScenarios: (scenarios: ActiveScenario[]) => void;
  showPrepared: boolean;
  setShowPrepared: (v: boolean) => void;
  forkConfig: ForkConfig | null;
}

export function WhatIfPanel({
  onClose,
  activeScenarios,
  setActiveScenarios,
  showPrepared,
  setShowPrepared,
  forkConfig,
}: WhatIfPanelProps) {
  const [tab, setTab] = useState<'stress' | 'life'>('stress');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [euroInput, setEuroInput] = useState('');

  const scenarios = tab === 'stress' ? stressScenarios : lifeChangeScenarios;
  const isActive = (id: string) => activeScenarios.some(s => s.def.id === id);
  const hasStress = activeScenarios.some(s => s.def.type === 'stress');

  const toggleScenario = useCallback((def: ScenarioDefinition) => {
    if (isActive(def.id)) {
      setActiveScenarios(activeScenarios.filter(s => s.def.id !== def.id));
      setExpandedId(null);
      return;
    }
    if (activeScenarios.length >= 3) return;

    if (def.configType === 'none') {
      setActiveScenarios([...activeScenarios, { def }]);
      return;
    }

    if (expandedId === def.id) {
      setExpandedId(null);
    } else {
      setExpandedId(def.id);
      if (def.configType === 'euro-input') {
        setEuroInput(def.euroDefault?.toString() || '');
      }
    }
  }, [activeScenarios, expandedId, isActive, setActiveScenarios]);

  const selectPill = useCallback((def: ScenarioDefinition, pill: string) => {
    const without = activeScenarios.filter(s => s.def.id !== def.id);
    if (without.length >= 3) return;
    setActiveScenarios([...without, { def, value: pill }]);
    setExpandedId(null);
  }, [activeScenarios, setActiveScenarios]);

  const confirmEuro = useCallback((def: ScenarioDefinition) => {
    const val = parseFloat(euroInput);
    if (isNaN(val) || val <= 0) return;
    const without = activeScenarios.filter(s => s.def.id !== def.id);
    if (without.length >= 3) return;
    setActiveScenarios([...without, { def, value: `€${val}` }]);
    setExpandedId(null);
  }, [euroInput, activeScenarios, setActiveScenarios]);

  const removeScenario = useCallback((id: string) => {
    setActiveScenarios(activeScenarios.filter(s => s.def.id !== id));
  }, [activeScenarios, setActiveScenarios]);

  const handleSave = useCallback(() => {
    if (activeScenarios.length === 0) return;
    const saved = JSON.parse(localStorage.getItem('jfb_saved_scenarios') || '[]');
    saved.push({
      id: Date.now().toString(),
      scenarios: activeScenarios.map(s => ({ defId: s.def.id, value: s.value })),
      timestamp: Date.now(),
    });
    localStorage.setItem('jfb_saved_scenarios', JSON.stringify(saved.slice(-3)));
  }, [activeScenarios]);

  // Fork stats
  const forkStats = useMemo(() => {
    if (!forkConfig) return null;
    if (forkConfig.type === 'shock') {
      return [
        { label: 'SURVIVES', value: forkConfig.durationMonths > 0 ? `${forkConfig.durationMonths} mo` : 'Indefinitely' },
        { label: 'IMPACT', value: forkConfig.incomeMultiplier < 1 ? `${Math.round((1 - forkConfig.incomeMultiplier) * 100)}% less` : forkConfig.oneTimeExpense > 0 ? `-€${forkConfig.oneTimeExpense.toLocaleString()}` : 'Combined' },
      ];
    }
    return [
      { label: 'EXTRA', value: `+€${Math.round(forkConfig.extraMonthlyIncome + (forkConfig.incomeMultiplier - 1) * 2500)}/mo`, color: '#86EFAC' },
      { label: 'IMPACT', value: forkConfig.extraMonthlyExpense > 0 ? `+€${Math.round(forkConfig.extraMonthlyExpense)}/mo costs` : 'Positive' },
    ];
  }, [forkConfig]);

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px 16px 0 0',
        padding: '16px',
        margin: '0 -16px -40px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[16px] font-bold text-white">What if...</span>
        <button onClick={onClose} className="p-1">
          <X size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[10px] p-[3px] mb-3.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-center transition-all"
          style={{
            background: tab === 'stress' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: tab === 'stress' ? 'white' : 'rgba(255,255,255,0.4)',
          }}
          onClick={() => setTab('stress')}
        >
          Stress Tests
        </button>
        <button
          className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-center transition-all"
          style={{
            background: tab === 'life' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: tab === 'life' ? 'white' : 'rgba(255,255,255,0.4)',
          }}
          onClick={() => setTab('life')}
        >
          Life Changes
        </button>
      </div>

      {/* Active scenario tags */}
      <AnimatePresence>
        {activeScenarios.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-1 pb-2 overflow-hidden"
          >
            {activeScenarios.map(s => (
              <div
                key={s.def.id}
                className="flex items-center gap-1 rounded-md px-2 py-1"
                style={{
                  background: s.def.type === 'stress' ? 'rgba(251,191,36,0.1)' : 'rgba(52,199,89,0.1)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: s.def.type === 'stress' ? '#FBBF24' : '#86EFAC',
                }}
              >
                {s.def.label}{s.value ? ` ${s.value}` : ''}
                <button onClick={() => removeScenario(s.def.id)} className="ml-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fork stats */}
      <AnimatePresence>
        {forkStats && activeScenarios.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex gap-2 pb-2 overflow-x-auto overflow-hidden"
          >
            {forkStats.map((stat, i) => (
              <div key={i} className="flex-shrink-0 rounded-[10px] px-3 py-2" style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                minWidth: 100,
              }}>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</span>
                <p className="text-[16px] font-bold mt-0.5" style={{ color: (stat as any).color || 'white' }}>{stat.value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prepared toggle (stress only) */}
      {hasStress && (
        <div
          className="flex items-center gap-2 py-2 cursor-pointer"
          onClick={() => setShowPrepared(!showPrepared)}
        >
          <Shield size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Show with 6-month emergency fund
          </span>
          <div className="ml-auto w-8 h-[18px] rounded-full relative" style={{
            background: showPrepared ? 'rgba(52,199,89,0.3)' : 'rgba(255,255,255,0.1)',
            transition: 'background 200ms',
          }}>
            <div className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all" style={{
              left: showPrepared ? 14 : 2,
              background: showPrepared ? '#34C759' : 'rgba(255,255,255,0.4)',
            }} />
          </div>
        </div>
      )}

      {/* Scenario list */}
      <div className="max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {scenarios.map(def => {
          const Icon = def.icon;
          const active = isActive(def.id);
          const expanded = expandedId === def.id;
          const isPositive = def.type === 'positive';

          return (
            <div key={def.id}>
              <div
                className="flex items-center gap-3 py-3 px-3 rounded-xl mb-1 cursor-pointer transition-colors"
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                }}
                onClick={() => toggleScenario(def)}
              >
                <Icon size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
                <span className="text-[14px] text-white flex-1">{def.label}</span>
                {def.configType !== 'none' && (
                  <ChevronRight
                    size={14}
                    style={{
                      color: 'rgba(255,255,255,0.2)',
                      transform: expanded ? 'rotate(90deg)' : undefined,
                      transition: 'transform 200ms',
                    }}
                  />
                )}
                {active && def.configType === 'none' && (
                  <div className="w-2 h-2 rounded-full" style={{ background: isPositive ? '#34C759' : '#FBBF24' }} />
                )}
              </div>

              {/* Inline config */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {def.configType === 'pills' && (
                      <div className="flex flex-wrap gap-1.5 pb-3" style={{ paddingLeft: 30 }}>
                        {def.pills?.map(pill => {
                          const sel = activeScenarios.find(s => s.def.id === def.id)?.value === pill;
                          return (
                            <button
                              key={pill}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                              style={{
                                background: sel
                                  ? isPositive ? 'rgba(39,174,96,0.15)' : 'rgba(245,158,11,0.15)'
                                  : 'rgba(255,255,255,0.06)',
                                border: sel
                                  ? isPositive ? '1px solid rgba(39,174,96,0.3)' : '1px solid rgba(245,158,11,0.3)'
                                  : '1px solid rgba(255,255,255,0.08)',
                                color: sel
                                  ? isPositive ? '#86EFAC' : '#FBBF24'
                                  : 'rgba(255,255,255,0.6)',
                              }}
                              onClick={(e) => { e.stopPropagation(); selectPill(def, pill); }}
                            >
                              {pill}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {def.configType === 'euro-input' && (
                      <div className="flex items-center gap-2 pb-3" style={{ paddingLeft: 30 }}>
                        <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>€</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={def.euroPlaceholder || '0'}
                          value={euroInput}
                          onChange={e => setEuroInput(e.target.value)}
                          className="h-9 rounded-lg px-3 text-[14px] font-medium outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            width: 120,
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          className="h-9 px-3 rounded-lg text-[12px] font-semibold"
                          style={{
                            background: isPositive ? 'rgba(39,174,96,0.15)' : 'rgba(245,158,11,0.15)',
                            color: isPositive ? '#86EFAC' : '#FBBF24',
                          }}
                          onClick={(e) => { e.stopPropagation(); confirmEuro(def); }}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {activeScenarios.length > 0 && (
        <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            className="flex-1 h-10 rounded-xl text-[13px] font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            onClick={handleSave}
          >
            Save
          </button>
          {!hasStress && (
            <button
              className="flex-1 h-10 rounded-xl text-[13px] font-semibold"
              style={{ background: 'rgba(39,174,96,0.15)', color: '#86EFAC' }}
            >
              Apply
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
