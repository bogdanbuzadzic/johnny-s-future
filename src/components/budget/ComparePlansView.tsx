import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Plus, Minus, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Check, Trash2 } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { getPersona } from '@/lib/profileData';
import johnnyImage from '@/assets/johnny.png';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  Food: '#E67E22',
  Entertainment: '#9B59B6',
  Shopping: '#E74C3C',
  Lifestyle: '#1ABC9C',
};

type ModifiedBudgets = Record<string, number>;

interface SavedScenario {
  id: string;
  name: string;
  budgets: ModifiedBudgets;
  income: number;
}

const presets = [
  { id: 'custom', label: 'Custom' },
  { id: 'save-more', label: 'Save more' },
  { id: 'cut-expenses', label: 'Cut expenses' },
  { id: 'grow-income', label: 'Grow income' },
  { id: 'aggressive', label: 'Aggressive goals' },
];

interface ComparePlansViewProps {
  onClose: () => void;
}

export function ComparePlansView({ onClose }: ComparePlansViewProps) {
  const {
    config, expenseCategories, fixedCategories, flexBudget, totalFixed,
    updateCategory, updateConfig,
  } = useBudget();
  const { goals } = useApp();

  const totalIncome = config.monthlyIncome;
  const savingsTarget = config.monthlySavingsTarget;

  // Modified budgets for right panel
  const [modifiedBudgets, setModifiedBudgets] = useState<ModifiedBudgets>(() => {
    const initial: ModifiedBudgets = {};
    expenseCategories.forEach(c => { initial[c.id] = c.monthlyBudget; });
    return initial;
  });
  const [modifiedIncome, setModifiedIncome] = useState(totalIncome);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState('custom');

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('jfb_compare_scenarios') || '[]');
    } catch { return []; }
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const persona = useMemo(() => {
    try {
      const m0 = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      return getPersona(m0);
    } catch { return null; }
  }, []);

  // Current plan totals
  const currentSpending = useMemo(() =>
    expenseCategories.reduce((s, c) => s + c.monthlyBudget, 0),
    [expenseCategories]
  );
  const currentGoals = useMemo(() =>
    goals.reduce((s, g) => s + g.monthlyContribution, 0),
    [goals]
  );
  const currentFree = totalIncome - totalFixed - savingsTarget - currentSpending - currentGoals;

  // Modified plan totals
  const modifiedSpending = useMemo(() =>
    Object.values(modifiedBudgets).reduce((s, v) => s + v, 0),
    [modifiedBudgets]
  );
  const modifiedFree = modifiedIncome - totalFixed - savingsTarget - modifiedSpending - currentGoals;
  const freeChange = modifiedFree - currentFree;

  const handleIncrement = (catId: string, amount: number) => {
    setModifiedBudgets(prev => ({
      ...prev,
      [catId]: Math.max(0, (prev[catId] || 0) + amount),
    }));
    setActivePreset('custom');
  };

  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const newBudgets: ModifiedBudgets = {};
    expenseCategories.forEach(c => { newBudgets[c.id] = c.monthlyBudget; });
    let newIncome = totalIncome;

    switch (presetId) {
      case 'save-more':
        Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.85); });
        break;
      case 'cut-expenses':
        Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.80); });
        break;
      case 'grow-income':
        newIncome = totalIncome + 300;
        break;
      case 'aggressive':
        Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.75); });
        break;
      default:
        // Custom - reset to current
        break;
    }
    setModifiedBudgets(newBudgets);
    setModifiedIncome(newIncome);
  };

  const loadScenario = (scenario: SavedScenario) => {
    setModifiedBudgets(scenario.budgets);
    setModifiedIncome(scenario.income);
    setActivePreset('custom');
  };

  const handleApplyPlan = () => {
    // Apply modified budgets
    Object.entries(modifiedBudgets).forEach(([catId, budget]) => {
      updateCategory(catId, { monthlyBudget: budget });
    });
    if (modifiedIncome !== totalIncome) {
      updateConfig({ monthlyIncome: modifiedIncome });
    }
    toast('New plan applied! 🎉');
    onClose();
  };

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;
    if (savedScenarios.length >= 3) {
      toast('Max 3 scenarios. Delete one first.');
      return;
    }
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: scenarioName.trim(),
      budgets: { ...modifiedBudgets },
      income: modifiedIncome,
    };
    const updated = [...savedScenarios, scenario];
    setSavedScenarios(updated);
    localStorage.setItem('jfb_compare_scenarios', JSON.stringify(updated));
    setShowSaveDialog(false);
    setScenarioName('');
    toast('Scenario saved!');
  };

  const handleDeleteScenario = (id: string) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('jfb_compare_scenarios', JSON.stringify(updated));
  };

  // Goal acceleration calculation
  const goalAcceleration = useMemo(() => {
    if (freeChange <= 0) return [];
    return goals.filter(g => g.monthlyContribution > 0).map(g => {
      const remaining = g.target - g.saved;
      const currentMonths = Math.ceil(remaining / g.monthlyContribution);
      const extra = freeChange > 0 ? freeChange * 0.5 : 0; // Assume half of free goes to goals
      const newMonths = Math.ceil(remaining / (g.monthlyContribution + extra / goals.length));
      const diff = currentMonths - newMonths;
      return { name: g.name, currentMonths, newMonths, diff };
    }).filter(g => g.diff > 0);
  }, [goals, freeChange]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 500;

  return (
    <div className="h-full overflow-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2D2440' }}>Compare Plans</span>
        <button onClick={onClose}>
          <X size={20} style={{ color: '#8A7FA0' }} />
        </button>
      </div>

      {/* Preset templates */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap"
              style={{
                background: activePreset === p.id ? 'rgba(139,92,246,0.1)' : 'rgba(45,36,64,0.06)',
                border: `1.5px solid ${activePreset === p.id ? 'rgba(139,92,246,0.2)' : 'rgba(45,36,64,0.1)'}`,
                color: activePreset === p.id ? '#8B5CF6' : '#8A7FA0',
              }}
            >
              {p.label}
            </button>
          ))}
          {/* Saved scenarios */}
          {savedScenarios.map(s => (
            <button
              key={s.id}
              onClick={() => loadScenario(s)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1"
              style={{
                background: 'rgba(139,92,246,0.06)',
                border: '1.5px solid rgba(139,92,246,0.15)',
                color: '#8B5CF6',
              }}
            >
              {s.name}
              <button onClick={(e) => { e.stopPropagation(); handleDeleteScenario(s.id); }}>
                <X size={10} style={{ color: '#8A7FA0' }} />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side panels */}
      <div className="px-4 mb-4" style={{
        display: isMobile ? 'flex' : 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 8,
      }}>
        {/* Left Panel - Current (read-only, dimmed) */}
        <div className="rounded-2xl overflow-hidden" style={{
          flex: 1,
          opacity: 0.85,
          background: '#27AE60',
          padding: 10,
          minHeight: isMobile ? 200 : 300,
        }}>
          <div className="flex items-center gap-1 mb-2">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#8A7FA0' }}>CURRENT</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Current Plan</span>
          </div>
          {/* Mini summary */}
          <div className="mb-2" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
            Income €{totalIncome.toLocaleString()} | Free €{Math.round(currentFree)}
          </div>
          {/* Mini blocks */}
          <div className="space-y-1">
            {expenseCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                style={{ background: categoryColors[cat.name] || '#7F8C8D' }}>
                <span style={{ fontSize: 9, color: 'white', fontWeight: 700, flex: 1 }}>{cat.name}</span>
                <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>€{cat.monthlyBudget}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Modified (editable) */}
        <div className="rounded-2xl overflow-hidden" style={{
          flex: 1,
          background: '#27AE60',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          padding: 10,
          minHeight: isMobile ? 200 : 300,
        }}>
          <div className="flex items-center gap-1 mb-2">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#8B5CF6' }}>MODIFIED</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>New Plan</span>
            <Pencil size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </div>
          {/* Income */}
          <button
            onClick={() => setModifiedIncome(prev => prev + 100)}
            className="mb-2 w-full text-left"
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}
          >
            Income €{modifiedIncome.toLocaleString()}
            {modifiedIncome !== totalIncome && (
              <span style={{ color: modifiedIncome > totalIncome ? '#90EE90' : '#FF6B6B', marginLeft: 4 }}>
                {modifiedIncome > totalIncome ? '↑' : '↓'}€{Math.abs(modifiedIncome - totalIncome)}
              </span>
            )}
            {' '}| Free €{Math.round(modifiedFree)}
          </button>
          {/* Editable blocks */}
          <div className="space-y-1">
            {expenseCategories.map(cat => {
              const current = cat.monthlyBudget;
              const modified = modifiedBudgets[cat.id] || 0;
              const diff = modified - current;
              const isEditing = editingCatId === cat.id;

              return (
                <div key={cat.id}>
                  <div
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 cursor-pointer"
                    style={{ background: categoryColors[cat.name] || '#7F8C8D' }}
                    onClick={() => setEditingCatId(isEditing ? null : cat.id)}
                  >
                    <span style={{ fontSize: 9, color: 'white', fontWeight: 700, flex: 1 }}>{cat.name}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: diff > 0 ? '#FFC107' : diff < 0 ? '#90EE90' : 'white',
                    }}>€{modified}</span>
                    {diff !== 0 && (
                      <span className="px-1 py-0.5 rounded text-[8px] font-bold"
                        style={{
                          background: diff > 0 ? 'rgba(255,193,7,0.2)' : 'rgba(39,174,96,0.2)',
                          color: diff > 0 ? '#FFC107' : '#27AE60',
                        }}>
                        {diff > 0 ? '↑' : '↓'}€{Math.abs(diff)}
                      </span>
                    )}
                  </div>
                  {/* Edit popover */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl mt-1 mb-1 flex items-center justify-center gap-3 py-2"
                        style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.6)',
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleIncrement(cat.id, -25); }}
                          className="flex items-center justify-center"
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.1)' }}
                        >
                          <Minus size={14} style={{ color: '#EF4444' }} />
                        </button>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#2D2440', minWidth: 60, textAlign: 'center' }}>
                          €{modified}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleIncrement(cat.id, 25); }}
                          className="flex items-center justify-center"
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(39,174,96,0.1)' }}
                        >
                          <Plus size={14} style={{ color: '#27AE60' }} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison Summary */}
      <div className="px-4 mb-4">
        <div style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2D2440', marginBottom: 8 }}>Impact Summary</div>

          {/* Monthly impact */}
          <div className="flex justify-between mb-2">
            <span style={{ fontSize: 12, color: '#5C4F6E' }}>Monthly free</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2D2440' }}>
              €{Math.round(currentFree)} → €{Math.round(modifiedFree)}{' '}
              <span style={{ color: freeChange >= 0 ? '#27AE60' : '#EF4444' }}>
                ({freeChange >= 0 ? '+' : ''}€{Math.round(freeChange)})
              </span>
            </span>
          </div>

          {/* Annual projection */}
          <div className="flex justify-between mb-2">
            <span style={{ fontSize: 12, color: '#5C4F6E' }}>Annual impact</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: freeChange >= 0 ? '#27AE60' : '#EF4444' }}>
              {freeChange >= 0 ? '+' : ''}€{Math.round(freeChange * 12)}/year
            </span>
          </div>

          {/* Goal acceleration */}
          {goalAcceleration.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2D2440', marginTop: 8, marginBottom: 4 }}>Goal acceleration</div>
              {goalAcceleration.map(g => (
                <div key={g.name} className="flex justify-between" style={{ fontSize: 11, color: '#5C4F6E' }}>
                  <span>{g.name}</span>
                  <span style={{ color: '#27AE60', fontWeight: 600 }}>
                    {g.currentMonths}mo → {g.newMonths}mo ({g.diff} sooner!)
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Trade-offs */}
          {Object.entries(modifiedBudgets).filter(([id, v]) => {
            const cat = expenseCategories.find(c => c.id === id);
            return cat && v < cat.monthlyBudget;
          }).length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2D2440', marginTop: 8, marginBottom: 4 }}>Trade-offs</div>
              {Object.entries(modifiedBudgets).map(([id, v]) => {
                const cat = expenseCategories.find(c => c.id === id);
                if (!cat || v >= cat.monthlyBudget) return null;
                return (
                  <div key={id} style={{ fontSize: 11, color: '#D97706' }}>
                    • {cat.name} reduced by €{cat.monthlyBudget - v}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Dual Timeline */}
      {goals.length > 0 && freeChange !== 0 && (
        <div className="px-4 mb-4">
          <div style={{
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: 16,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2D2440', marginBottom: 8 }}>Timeline Comparison</div>
            {['Current', 'New Plan'].map((label, idx) => (
              <div key={label} className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 10, color: '#8A7FA0', width: 55 }}>{label}</span>
                <div className="flex-1 relative" style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%',
                    width: idx === 0 ? '70%' : freeChange > 0 ? '85%' : '55%',
                    background: idx === 0 ? '#8A7FA0' : 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                    borderRadius: 4,
                    transition: 'width 600ms ease',
                  }} />
                </div>
              </div>
            ))}
            {freeChange > 0 && (
              <div className="text-center" style={{ fontSize: 11, color: '#27AE60', fontWeight: 600 }}>
                ↑ Goals reached sooner with new plan!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mb-4 space-y-2">
        <button
          onClick={handleApplyPlan}
          className="w-full rounded-2xl flex items-center justify-center"
          style={{
            height: 48,
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            color: 'white',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
          }}
        >
          Apply New Plan
        </button>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="w-full rounded-2xl flex items-center justify-center"
          style={{
            height: 44,
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#5C4F6E',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Save as Scenario
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center"
          style={{ height: 40, color: '#8A7FA0', fontSize: 14 }}
        >
          Discard
        </button>
      </div>

      {/* Save Scenario Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.3)' }}
              onClick={() => setShowSaveDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(24px)',
                borderRadius: 20,
                padding: 24,
                width: 'min(320px, calc(100vw - 48px))',
                boxShadow: '0 8px 32px rgba(45,36,64,0.2)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2D2440', marginBottom: 12 }}>Name your scenario</div>
              <input
                autoFocus
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
                placeholder="e.g. Summer budget"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1.5px solid rgba(0,0,0,0.08)', color: '#2D2440' }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveScenario(); }}
              />
              <div className="flex gap-2">
                <button onClick={handleSaveScenario}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: 'white' }}>
                  Save
                </button>
                <button onClick={() => setShowSaveDialog(false)}
                  className="px-4 rounded-xl py-2.5 text-sm"
                  style={{ background: 'rgba(0,0,0,0.04)', color: '#8A7FA0' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
