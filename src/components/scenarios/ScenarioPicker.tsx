import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Home, PiggyBank, TrendingDown, Briefcase, AlertTriangle,
  Flame, Percent, Layers, TrendingUp, PlusCircle, Heart, ChevronRight,
  Coffee, ShoppingBag, Wrench, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ScenarioType = 'stress' | 'positive' | 'quick';
export type PurchaseType = 'habit' | 'one-time' | 'experience' | 'tool';

export interface ScenarioConfig {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  type: ScenarioType;
  inputType: 'none' | 'preset-pills' | 'dual-pills' | 'slider' | 'euro-input';
  inputLabel?: string;
  inputOptions?: string[];
  inputOptions2?: string[];
  inputLabels?: string[];
  inputDefault?: string | number;
  inputMin?: number;
  inputMax?: number;
  inputStep?: number;
  inputUnit?: string;
  inputExamples?: string;
  inputPlaceholder?: string;
  requiresDebt?: boolean;
}

export interface SelectedScenario {
  config: ScenarioConfig;
  value1?: string | number;
  value2?: string | number;
}

const quickScenarios: ScenarioConfig[] = [
  { id: 'cheap-rent', icon: Home, label: 'Cheaper rent (-€100)', description: '', color: '#059669', type: 'quick', inputType: 'none' },
  { id: 'save-more', icon: PiggyBank, label: 'Save €100 more', description: '', color: '#0D9488', type: 'quick', inputType: 'none' },
  { id: 'income-drop-quick', icon: TrendingDown, label: 'Income drops 20%', description: '', color: '#E67E22', type: 'quick', inputType: 'none' },
];

const stressScenarios: ScenarioConfig[] = [
  { id: 'job-loss', icon: Briefcase, label: 'Job loss', description: 'You lose your income entirely', color: '#E74C3C', type: 'stress', inputType: 'preset-pills', inputLabel: 'How long without income?', inputOptions: ['1 month', '3 months', '6 months', 'Custom'], inputDefault: '3 months' },
  { id: 'income-cut', icon: TrendingDown, label: 'Income cut', description: 'Your income drops by a percentage', color: '#E67E22', type: 'stress', inputType: 'dual-pills', inputLabels: ['How much?', 'For how long?'], inputOptions: ['-10%', '-20%', '-30%', '-50%'], inputOptions2: ['3 months', '6 months', '1 year', 'Permanent'] },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency expense', description: 'An unexpected cost hits you', color: '#F39C12', type: 'stress', inputType: 'preset-pills', inputLabel: 'How big?', inputOptions: ['€500', '€1,000', '€2,500', '€5,000', 'Custom'], inputDefault: '€1,000', inputExamples: 'Car repair: €500-2,000 | Medical: €1,000-5,000 | Home: €2,000-10,000' },
  { id: 'inflation', icon: Flame, label: 'High inflation', description: 'Everything gets more expensive', color: '#9B59B6', type: 'stress', inputType: 'preset-pills', inputLabel: 'Annual inflation rate?', inputOptions: ['5%', '8%', '12%', '15%'], inputDefault: '8%' },
  { id: 'rate-hike', icon: Percent, label: 'Interest rate hike', description: 'Your debt payments increase', color: '#2980B9', type: 'stress', inputType: 'slider', inputMin: 1, inputMax: 5, inputDefault: 2, inputUnit: '%', requiresDebt: true },
  { id: 'perfect-storm', icon: Layers, label: 'Perfect storm', description: 'Income cut + emergency + inflation combined', color: '#E91E63', type: 'stress', inputType: 'none' },
];

const lifeChangeScenarios: ScenarioConfig[] = [
  { id: 'raise', icon: TrendingUp, label: 'I get a raise', description: 'More income. Where should it go?', color: '#16A34A', type: 'positive', inputType: 'slider', inputLabel: 'Raise amount', inputUnit: '%', inputMin: 5, inputMax: 30, inputDefault: 10, inputStep: 5 },
  { id: 'cheaper-housing', icon: Home, label: 'Cheaper housing', description: 'What if rent was lower?', color: '#059669', type: 'positive', inputType: 'euro-input', inputLabel: 'New monthly rent', inputPlaceholder: 'Current rent amount' },
  { id: 'side-income', icon: PlusCircle, label: 'Side income', description: 'Freelance, part-time, or passive income', color: '#0D9488', type: 'positive', inputType: 'euro-input', inputLabel: 'Extra per month', inputDefault: 300 },
  { id: 'baby', icon: Heart, label: 'Having a baby', description: 'New expenses, possible income change', color: '#7C3AED', type: 'positive', inputType: 'none' },
];

interface ScenarioPickerProps {
  open: boolean;
  onClose: () => void;
  onRunStress: (scenarios: SelectedScenario[]) => void;
  onRunLifeChange: (scenarios: SelectedScenario[]) => void;
  onRunQuick: (scenario: SelectedScenario) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ScenarioPicker({ open, onClose, onRunStress, onRunLifeChange, onRunQuick }: ScenarioPickerProps) {
  const [selected, setSelected] = useState<SelectedScenario[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [sliderValue, setSliderValue] = useState(10);
  const [euroValue, setEuroValue] = useState('');
  const [pill1, setPill1] = useState<string | null>(null);
  const [pill2, setPill2] = useState<string | null>(null);

  const hasDebt = useMemo(() => {
    try {
      const d = JSON.parse(localStorage.getItem('jfb_debt') || 'null');
      return d && d.balance > 0;
    } catch { return false; }
  }, []);

  const filteredStress = stressScenarios.filter(s => !s.requiresDebt || hasDebt);

  const isSelected = (id: string) => selected.some(s => s.config.id === id);

  const toggleScenario = (config: ScenarioConfig) => {
    if (config.inputType === 'none') {
      // Toggle directly
      if (isSelected(config.id)) {
        setSelected(prev => prev.filter(s => s.config.id !== config.id));
      } else if (selected.length < 3) {
        setSelected(prev => [...prev, { config }]);
      }
      return;
    }
    // Expand for configuration
    setExpandedId(expandedId === config.id ? null : config.id);
    if (config.inputType === 'preset-pills') setPill1(config.inputDefault as string || null);
    if (config.inputType === 'dual-pills') { setPill1(config.inputOptions?.[1] || null); setPill2(config.inputOptions2?.[0] || null); }
    if (config.inputType === 'slider') setSliderValue(config.inputDefault as number || 10);
    if (config.inputType === 'euro-input') setEuroValue(config.inputDefault?.toString() || '');
  };

  const confirmExpanded = (config: ScenarioConfig) => {
    if (selected.length >= 3 && !isSelected(config.id)) return;
    const value1 = config.inputType === 'preset-pills' ? pill1
      : config.inputType === 'dual-pills' ? pill1
      : config.inputType === 'slider' ? sliderValue
      : config.inputType === 'euro-input' ? euroValue
      : undefined;
    const value2 = config.inputType === 'dual-pills' ? pill2 : undefined;

    setSelected(prev => {
      const without = prev.filter(s => s.config.id !== config.id);
      return [...without, { config, value1: value1 ?? undefined, value2: value2 ?? undefined }];
    });
    setExpandedId(null);
  };

  const removeSelected = (id: string) => {
    setSelected(prev => prev.filter(s => s.config.id !== id));
  };

  const handleRun = () => {
    if (selected.length === 0) return;
    const hasStress = selected.some(s => s.config.type === 'stress');
    const hasPositive = selected.some(s => s.config.type === 'positive');
    if (hasStress) onRunStress(selected);
    else if (hasPositive) onRunLifeChange(selected);
  };

  const handleQuick = (config: ScenarioConfig) => {
    onRunQuick({ config });
  };

  const runButtonText = useMemo(() => {
    if (selected.length === 0) return '';
    const hasStress = selected.some(s => s.config.type === 'stress');
    if (hasStress) return 'Run Stress Test';
    if (selected.length > 1) return `Run ${selected.length} Scenarios`;
    return 'Run Scenario';
  }, [selected]);

  const isStressRun = selected.some(s => s.config.type === 'stress');

  const renderCard = (config: ScenarioConfig, idx: number) => {
    const Icon = config.icon;
    const sel = isSelected(config.id);
    const expanded = expandedId === config.id;

    return (
      <motion.div
        key={config.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="mx-5 mb-2.5"
      >
        <div
          className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.45)',
            border: sel ? `1.5px solid ${config.color}` : '1px solid rgba(255,255,255,0.55)',
            boxShadow: sel ? `0 0 0 1px ${config.color}` : undefined,
          }}
          onClick={() => toggleScenario(config)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: hexToRgba(config.color, 0.1) }}>
              <Icon size={22} style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold" style={{ color: '#2D2440' }}>{config.label}</p>
              <p className="text-[11px]" style={{ color: '#5C4F6E' }}>{config.description}</p>
            </div>
            <ChevronRight size={16} style={{ color: '#8A7FA0', transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 200ms' }} />
          </div>

          {/* Expanded input controls */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                  {config.inputType === 'preset-pills' && (
                    <>
                      <p className="text-[12px] mb-2" style={{ color: '#5C4F6E' }}>{config.inputLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {config.inputOptions?.map(opt => (
                          <button key={opt}
                            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                            style={{
                              background: pill1 === opt ? hexToRgba(config.color, 0.15) : 'rgba(255,255,255,0.5)',
                              border: pill1 === opt ? `1.5px solid ${hexToRgba(config.color, 0.4)}` : '1px solid rgba(255,255,255,0.5)',
                              color: pill1 === opt ? config.color : '#2D2440',
                            }}
                            onClick={() => {
                              if (opt === 'Custom') {
                                setPill1('Custom');
                              } else {
                                setPill1(opt);
                              }
                            }}
                          >{opt}</button>
                        ))}
                      </div>
                      {pill1 === 'Custom' && (
                        <input
                          type="number" inputMode="decimal" placeholder="Enter amount..."
                          value={customValue} onChange={e => setCustomValue(e.target.value)}
                          className="mt-2 w-full h-10 rounded-xl px-3 text-[14px] outline-none"
                          style={{ background: 'rgba(255,255,255,0.6)', border: `1.5px solid ${hexToRgba(config.color, 0.3)}`, color: '#2D2440' }}
                        />
                      )}
                      {config.inputExamples && (
                        <p className="text-[10px] mt-2" style={{ color: '#8A7FA0' }}>{config.inputExamples}</p>
                      )}
                    </>
                  )}

                  {config.inputType === 'dual-pills' && (
                    <>
                      <p className="text-[12px] mb-2" style={{ color: '#5C4F6E' }}>{config.inputLabels?.[0]}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {config.inputOptions?.map(opt => (
                          <button key={opt}
                            className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                            style={{
                              background: pill1 === opt ? hexToRgba(config.color, 0.15) : 'rgba(255,255,255,0.5)',
                              border: pill1 === opt ? `1.5px solid ${hexToRgba(config.color, 0.4)}` : '1px solid rgba(255,255,255,0.5)',
                              color: pill1 === opt ? config.color : '#2D2440',
                            }}
                            onClick={() => setPill1(opt)}
                          >{opt}</button>
                        ))}
                      </div>
                      <p className="text-[12px] mb-2" style={{ color: '#5C4F6E' }}>{config.inputLabels?.[1]}</p>
                      <div className="flex flex-wrap gap-2">
                        {config.inputOptions2?.map(opt => (
                          <button key={opt}
                            className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                            style={{
                              background: pill2 === opt ? hexToRgba(config.color, 0.15) : 'rgba(255,255,255,0.5)',
                              border: pill2 === opt ? `1.5px solid ${hexToRgba(config.color, 0.4)}` : '1px solid rgba(255,255,255,0.5)',
                              color: pill2 === opt ? config.color : '#2D2440',
                            }}
                            onClick={() => setPill2(opt)}
                          >{opt}</button>
                        ))}
                      </div>
                    </>
                  )}

                  {config.inputType === 'slider' && (
                    <>
                      <p className="text-[12px] mb-1" style={{ color: '#5C4F6E' }}>{config.inputLabel}</p>
                      <p className="text-[20px] font-bold mb-2" style={{ color: '#2D2440' }}>{sliderValue}{config.inputUnit}</p>
                      <input
                        type="range"
                        min={config.inputMin || 0} max={config.inputMax || 100} step={config.inputStep || 1}
                        value={sliderValue}
                        onChange={e => setSliderValue(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, ${config.color} ${((sliderValue - (config.inputMin || 0)) / ((config.inputMax || 100) - (config.inputMin || 0))) * 100}%, rgba(45,36,64,0.1) 0)` }}
                      />
                    </>
                  )}

                  {config.inputType === 'euro-input' && (
                    <>
                      <p className="text-[12px] mb-2" style={{ color: '#5C4F6E' }}>{config.inputLabel}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]" style={{ color: '#8A7FA0' }}>€</span>
                        <input
                          type="number" inputMode="decimal"
                          placeholder={config.inputPlaceholder || '0'}
                          value={euroValue}
                          onChange={e => setEuroValue(e.target.value)}
                          className="flex-1 h-10 rounded-xl px-3 text-[14px] outline-none"
                          style={{ background: 'rgba(255,255,255,0.6)', border: `1.5px solid ${hexToRgba(config.color, 0.3)}`, color: '#2D2440' }}
                        />
                      </div>
                    </>
                  )}

                  <button
                    className="mt-3 w-full h-10 rounded-xl text-[13px] font-semibold text-white"
                    style={{ background: config.color }}
                    onClick={() => confirmExpanded(config)}
                  >
                    Add to simulation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
    >
      <div className="pb-28">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-2">
          <button onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)' }}>
            <X size={20} style={{ color: '#2D2440' }} />
          </button>
          <span className="text-lg font-bold" style={{ color: '#2D2440' }}>Life Scenarios</span>
          <div className="w-10" /> {/* spacer */}
        </div>
        <p className="text-[13px] text-center mb-5" style={{ color: '#5C4F6E' }}>
          Explore how life changes affect your finances
        </p>

        {/* Active scenarios bar */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 mb-4"
            >
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {selected.map(s => (
                  <div key={s.config.id}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 flex-shrink-0"
                    style={{
                      background: s.config.type === 'stress' ? 'rgba(245,158,11,0.1)' : 'rgba(39,174,96,0.1)',
                      border: s.config.type === 'stress' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(39,174,96,0.2)',
                    }}>
                    <s.config.icon size={12} style={{ color: s.config.type === 'stress' ? '#92400E' : '#166534' }} />
                    <span className="text-[11px] font-medium" style={{ color: s.config.type === 'stress' ? '#92400E' : '#166534' }}>
                      {s.config.label}
                    </span>
                    <button onClick={() => removeSelected(s.config.id)}>
                      <X size={10} style={{ color: s.config.type === 'stress' ? '#92400E' : '#166534' }} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Scenarios */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} style={{ color: '#2D2440' }} />
            <span className="text-[15px] font-bold" style={{ color: '#2D2440' }}>Quick Scenarios</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {quickScenarios.map(qs => {
              const Icon = qs.icon;
              return (
                <button key={qs.id}
                  className="rounded-[14px] p-3.5 flex-shrink-0 text-left"
                  style={{
                    background: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.55)',
                    minWidth: 150,
                  }}
                  onClick={() => handleQuick(qs)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                    style={{ background: hexToRgba(qs.color, 0.1) }}>
                    <Icon size={16} style={{ color: qs.color }} />
                  </div>
                  <p className="text-[13px] font-semibold" style={{ color: '#2D2440' }}>{qs.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stress Tests */}
        <div className="mb-5">
          <div className="flex items-center gap-2 px-5 mb-3">
            <AlertTriangle size={18} style={{ color: '#2D2440' }} />
            <span className="text-[15px] font-bold" style={{ color: '#2D2440' }}>Stress Tests</span>
          </div>
          {filteredStress.map((s, i) => renderCard(s, i))}
        </div>

        {/* Life Changes */}
        <div className="mb-5">
          <div className="flex items-center gap-2 px-5 mb-3">
            <Sparkles size={18} style={{ color: '#2D2440' }} />
            <span className="text-[15px] font-bold" style={{ color: '#2D2440' }}>Life Changes</span>
          </div>
          {lifeChangeScenarios.map((s, i) => renderCard(s, i))}
        </div>
      </div>

      {/* Run button */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 left-5 right-5 z-[101]"
          >
            <button
              className="w-full h-[52px] rounded-2xl text-white text-[16px] font-semibold"
              style={{
                background: isStressRun
                  ? 'linear-gradient(135deg, #E74C3C, #C0392B)'
                  : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                boxShadow: isStressRun
                  ? '0 4px 16px rgba(231,76,60,0.3)'
                  : '0 4px 16px rgba(139,92,246,0.3)',
              }}
              onClick={handleRun}
            >
              {runButtonText}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
