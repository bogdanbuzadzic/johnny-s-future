import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  Food: '#E67E22', Entertainment: '#9B59B6', Shopping: '#E74C3C', Lifestyle: '#1ABC9C',
};

type ModifiedBudgets = Record<string, number>;

const presets = [
  { id: 'custom', label: 'Custom' },
  { id: 'save-15', label: 'Save 15%' },
  { id: 'cut-spending', label: 'Cut spending' },
  { id: 'boost-goals', label: 'Boost goals' },
  { id: 'income-300', label: '+€300 income' },
];

interface ComparePlansViewProps {
  onClose: () => void;
}

export function ComparePlansView({ onClose }: ComparePlansViewProps) {
  const { config, expenseCategories, fixedCategories, totalFixed, updateCategory, updateConfig } = useBudget();
  const { goals } = useApp();

  const totalIncome = config.monthlyIncome;
  const savingsTarget = config.monthlySavingsTarget;
  const totalGoalContributions = goals.reduce((s, g) => s + g.monthlyContribution, 0);
  const currentSpending = expenseCategories.reduce((s, c) => s + c.monthlyBudget, 0);
  const currentFree = totalIncome - totalFixed - savingsTarget - currentSpending - totalGoalContributions;

  const [modifiedBudgets, setModifiedBudgets] = useState<ModifiedBudgets>(() => {
    const init: ModifiedBudgets = {};
    expenseCategories.forEach(c => { init[c.id] = c.monthlyBudget; });
    return init;
  });
  const [modifiedIncome, setModifiedIncome] = useState(totalIncome);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [expandSpending, setExpandSpending] = useState(false);
  const [activePreset, setActivePreset] = useState('custom');

  const modifiedSpending = Object.values(modifiedBudgets).reduce((s, v) => s + v, 0);
  const modifiedFree = modifiedIncome - totalFixed - savingsTarget - modifiedSpending - totalGoalContributions;
  const freeChange = modifiedFree - currentFree;

  const handleIncrement = (catId: string, amount: number) => {
    setModifiedBudgets(prev => ({ ...prev, [catId]: Math.max(0, (prev[catId] || 0) + amount) }));
    setActivePreset('custom');
  };

  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const newBudgets: ModifiedBudgets = {};
    expenseCategories.forEach(c => { newBudgets[c.id] = c.monthlyBudget; });
    let newIncome = totalIncome;
    switch (presetId) {
      case 'save-15': Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.85); }); break;
      case 'cut-spending': Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.80); }); break;
      case 'boost-goals': Object.keys(newBudgets).forEach(k => { newBudgets[k] = Math.round(newBudgets[k] * 0.90); }); break;
      case 'income-300': newIncome = totalIncome + 300; break;
    }
    setModifiedBudgets(newBudgets);
    setModifiedIncome(newIncome);
  };

  const handleApply = () => {
    Object.entries(modifiedBudgets).forEach(([catId, budget]) => {
      updateCategory(catId, { monthlyBudget: budget });
    });
    if (modifiedIncome !== totalIncome) updateConfig({ monthlyIncome: modifiedIncome });
    toast('New plan applied.');
    onClose();
  };

  const goalAcceleration = useMemo(() => {
    if (freeChange <= 0) return [];
    return goals.filter(g => g.monthlyContribution > 0).map(g => {
      const remaining = g.target - g.saved;
      const currentMonths = Math.ceil(remaining / g.monthlyContribution);
      const extra = freeChange * 0.5 / Math.max(goals.length, 1);
      const newMonths = Math.ceil(remaining / (g.monthlyContribution + extra));
      const diff = currentMonths - newMonths;
      return { name: g.name, diff };
    }).filter(g => g.diff > 0);
  }, [goals, freeChange]);

  const renderMiniBlock = (label: string, amount: number, color: string, diff?: number) => (
    <div className="rounded-lg px-2 py-1.5 flex items-center justify-between" style={{ background: color }}>
      <span className="text-[9px] font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-bold text-white">€{Math.round(amount)}</span>
        {diff !== undefined && diff !== 0 && (
          <span className="text-[9px] font-bold" style={{ color: diff < 0 ? '#86EFAC' : '#FBBF24' }}>
            {diff > 0 ? '+' : ''}€{Math.round(diff)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-auto pb-24" style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2D2440' }}>Compare Plans</span>
        <button onClick={onClose}><X size={20} style={{ color: '#8A7FA0' }} /></button>
      </div>

      {/* Preset pills */}
      <div className="px-4 mb-3">
        <div className="flex gap-[6px] overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {presets.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className="flex-shrink-0 whitespace-nowrap"
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                background: activePreset === p.id ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.5)',
                border: activePreset === p.id ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(255,255,255,0.5)',
                color: activePreset === p.id ? '#8B5CF6' : '#5C4F6E',
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side panels */}
      <div className="px-4 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {/* Left: Current (dimmed) */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#27AE60', padding: 8, opacity: 0.7 }}>
          <div className="inline-block px-1.5 py-0.5 rounded mb-1.5" style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' as const,
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)',
          }}>CURRENT</div>
          <div className="text-[9px] mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            €{totalIncome.toLocaleString()} income | €{Math.round(currentFree)} free
          </div>
          <div className="space-y-1">
            {renderMiniBlock('Spending', currentSpending, '#8E44AD')}
            {renderMiniBlock('Fixed', totalFixed, '#5D6D7E')}
            {renderMiniBlock('Goals', totalGoalContributions, '#E91E63')}
            {renderMiniBlock('Savings', savingsTarget, '#2980B9')}
            {currentFree > 0 && renderMiniBlock('Free', currentFree, 'rgba(255,255,255,0.15)')}
          </div>
        </div>

        {/* Right: New Plan (editable) */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#27AE60', padding: 8, border: '1.5px solid rgba(139,92,246,0.2)' }}>
          <div className="inline-block px-1.5 py-0.5 rounded mb-1.5" style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' as const,
            background: 'rgba(139,92,246,0.15)', color: '#8B5CF6',
          }}>NEW PLAN</div>
          <div className="text-[9px] mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            €{modifiedIncome.toLocaleString()} income | €{Math.round(modifiedFree)} free
          </div>
          <div className="space-y-1">
            {/* Spending block - tappable to expand */}
            <div className="rounded-lg px-2 py-1.5 cursor-pointer" style={{ background: '#8E44AD' }}
              onClick={() => setExpandSpending(!expandSpending)}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Spending</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-white">€{Math.round(modifiedSpending)}</span>
                  {modifiedSpending !== currentSpending && (
                    <span className="text-[9px] font-bold" style={{ color: modifiedSpending < currentSpending ? '#86EFAC' : '#FBBF24' }}>
                      {modifiedSpending < currentSpending ? '' : '+'}{Math.round(modifiedSpending - currentSpending)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded sub-categories */}
            <AnimatePresence>
              {expandSpending && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-0.5">
                  {expenseCategories.map(cat => {
                    const modified = modifiedBudgets[cat.id] || 0;
                    const diff = modified - cat.monthlyBudget;
                    const isEditing = editingCatId === cat.id;
                    return (
                      <div key={cat.id}>
                        <div className="rounded-lg px-2 py-1 cursor-pointer flex items-center justify-between"
                          style={{ background: categoryColors[cat.name] || '#7F8C8D' }}
                          onClick={() => setEditingCatId(isEditing ? null : cat.id)}>
                          <span className="text-[8px] font-bold text-white">{cat.name}</span>
                          <span className="text-[10px] font-bold" style={{
                            color: diff > 0 ? '#FBBF24' : diff < 0 ? '#86EFAC' : 'white',
                          }}>€{modified}</span>
                        </div>
                        <AnimatePresence>
                          {isEditing && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              className="overflow-hidden flex items-center justify-center gap-2 py-1"
                              style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginTop: 2 }}>
                              <button onClick={(e) => { e.stopPropagation(); handleIncrement(cat.id, -25); }}
                                className="flex items-center justify-center" style={{
                                  width: 24, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: 14,
                                }}><Minus size={12} /></button>
                              <span className="text-[13px] font-bold text-white" style={{ minWidth: 50, textAlign: 'center' }}>€{modified}</span>
                              <button onClick={(e) => { e.stopPropagation(); handleIncrement(cat.id, 25); }}
                                className="flex items-center justify-center" style={{
                                  width: 24, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: 14,
                                }}><Plus size={12} /></button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {renderMiniBlock('Fixed', totalFixed, '#5D6D7E')}
            {renderMiniBlock('Goals', totalGoalContributions, '#E91E63')}
            {renderMiniBlock('Savings', savingsTarget, '#2980B9')}
            {modifiedFree > 0 && renderMiniBlock('Free', modifiedFree, 'rgba(255,255,255,0.15)',
              modifiedFree !== currentFree ? freeChange : undefined)}
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="px-4 mb-3">
        <div className="rounded-xl p-3" style={{
          background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#8A7FA0', letterSpacing: 0.5 }}>Impact</div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px]" style={{ color: '#5C4F6E' }}>Monthly</span>
            <span className="text-[12px] text-right" style={{ color: '#2D2440' }}>
              €{Math.round(currentFree)} free → €{Math.round(modifiedFree)} free{' '}
              <span style={{ fontWeight: 700, color: freeChange >= 0 ? '#27AE60' : '#E74C3C' }}>
                {freeChange >= 0 ? '+' : ''}€{Math.round(freeChange)}/mo
              </span>
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px]" style={{ color: '#5C4F6E' }}>Annual</span>
            <span className="text-[12px] font-bold" style={{ color: freeChange >= 0 ? '#27AE60' : '#E74C3C' }}>
              {freeChange >= 0 ? '+' : ''}€{Math.round(freeChange * 12)} saved per year
            </span>
          </div>
          {goalAcceleration.length > 0 && (
            <div className="flex justify-between">
              <span className="text-[11px]" style={{ color: '#5C4F6E' }}>Goals</span>
              <span className="text-[12px] font-bold" style={{ color: '#27AE60' }}>
                {goalAcceleration.map(g => `${g.name} ${g.diff}mo sooner`).join(' | ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 flex gap-2">
        <button onClick={handleApply} className="flex-[2] rounded-xl flex items-center justify-center"
          style={{
            height: 48, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            color: 'white', fontSize: 15, fontWeight: 600, border: 'none',
          }}>Apply</button>
        <button onClick={onClose} className="flex-1 rounded-xl flex items-center justify-center"
          style={{
            height: 48, background: 'rgba(45,36,64,0.06)', color: '#2D2440', fontSize: 15, fontWeight: 500,
          }}>Discard</button>
      </div>
    </div>
  );
}
