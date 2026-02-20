import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle, Minus } from 'lucide-react';
import { useBudget, type Category } from '@/context/BudgetContext';
import { getPersona } from '@/lib/profileData';
import johnnyImage from '@/assets/johnny.png';

const categoryColors: Record<string, string> = {
  Food: '#E67E22',
  Entertainment: '#9B59B6',
  Shopping: '#E74C3C',
  Lifestyle: '#1ABC9C',
};

const fixedColors: Record<string, string> = {
  Rent: '#5D6D7E',
  Utilities: '#2E86C1',
  Transport: '#34495E',
};

const insightText: Record<string, string> = {
  'Money Avoider': "Progress over perfection. You stayed close to plan, and that matters.",
  'Impulsive Optimist': "Almost nailed it! One small tweak and you're golden.",
  'Present Hedonist': "You enjoyed your month AND stayed mostly on track. That's the goal.",
  'Vigilant Saver': "Solid discipline overall. Worth investigating the overspend areas.",
  'Confident Controller': "Data shows your variance. Focus on actionable areas.",
  'Steady Saver': "Consistent across most categories. Your system is working.",
};

interface PlanVsActualViewProps {
  onClose: () => void;
}

export function PlanVsActualView({ onClose }: PlanVsActualViewProps) {
  const { expenseCategories, fixedCategories, getCategorySpent, config, transactions } = useBudget();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const persona = useMemo(() => {
    try {
      const m0 = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      return getPersona(m0);
    } catch { return null; }
  }, []);

  const categoryData = useMemo(() => {
    return expenseCategories.map(cat => {
      const budget = cat.monthlyBudget;
      const spent = getCategorySpent(cat.id, 'month');
      const delta = spent - budget;
      const pct = budget > 0 ? (spent / budget) * 100 : 0;
      const status: 'under' | 'over' | 'on-track' = Math.abs(pct - 100) <= 5 ? 'on-track' : pct > 100 ? 'over' : 'under';
      const color = categoryColors[cat.name] || '#7F8C8D';
      return { ...cat, budget, spent, delta, pct, status, color };
    });
  }, [expenseCategories, getCategorySpent]);

  const fixedData = useMemo(() => {
    return fixedCategories.map(cat => {
      const budget = cat.monthlyBudget;
      const color = fixedColors[cat.name] || '#5D6D7E';
      return { ...cat, budget, spent: budget, delta: 0, pct: 100, status: 'on-track' as const, color, isFixed: true };
    });
  }, [fixedCategories]);

  const allData = [...categoryData, ...fixedData];
  const overTotal = categoryData.reduce((s, c) => s + Math.max(0, c.delta), 0);
  const underTotal = categoryData.reduce((s, c) => s + Math.max(0, -c.delta), 0);
  const netDelta = overTotal - underTotal;
  const onTrackCount = categoryData.filter(c => c.status !== 'over').length;
  const bestCat = [...categoryData].sort((a, b) => a.delta - b.delta)[0];

  const selectedCat = selectedCatId ? allData.find(c => c.id === selectedCatId) : null;

  // Get top 3 transactions for selected category
  const selectedTxs = useMemo(() => {
    if (!selectedCatId) return [];
    return transactions
      .filter(t => t.categoryId === selectedCatId && t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [selectedCatId, transactions]);

  return (
    <div className="h-full overflow-auto pb-24">
      {/* Green container with comparison header */}
      <div className="px-4 pt-12 pb-2">
        <div className="relative rounded-[20px] overflow-hidden" style={{
          background: '#27AE60',
          minHeight: '50vh',
          padding: 10,
          paddingTop: 52,
          paddingBottom: 10,
        }}>
          {/* Comparison header bar */}
          <div className="absolute top-0 left-0 right-0 z-10" style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '20px 20px 0 0',
            padding: '12px 16px',
          }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                Plan vs. Actual — February 2026
              </span>
              <button onClick={onClose}>
                <X size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center">
                <span style={{ fontSize: 18, fontWeight: 700, color: netDelta > 0 ? '#FF6B6B' : '#90EE90' }}>
                  {netDelta > 0 ? '+' : ''}€{Math.round(Math.abs(netDelta))}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                  {netDelta > 0 ? 'Over budget' : 'Under budget'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                  {onTrackCount} of {categoryData.length}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>On track</span>
              </div>
              {bestCat && (
                <div className="flex flex-col items-center">
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#90EE90' }}>
                    {bestCat.name} -€{Math.abs(Math.round(bestCat.delta))}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Best category</span>
                </div>
              )}
            </div>
          </div>

          {/* Category blocks with dual fill */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            marginTop: 6,
          }}>
            {allData.map(cat => {
              const fillPct = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
              const overflowPct = cat.pct > 100 ? Math.min(cat.pct - 100, 30) : 0;
              const isFixed = 'isFixed' in cat;

              return (
                <motion.div
                  key={cat.id}
                  className="relative rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    background: cat.color,
                    border: `1.5px solid rgba(255,255,255,0.15)`,
                    boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
                    minHeight: 90,
                    padding: 8,
                  }}
                  onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Actual fill from bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: `${fillPct}%`,
                      background: cat.status === 'over' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                      transition: 'height 600ms ease',
                    }}
                  />

                  {/* Overflow indicator */}
                  {overflowPct > 0 && (
                    <div
                      className="absolute top-0 left-0 right-0"
                      style={{
                        height: `${overflowPct}%`,
                        background: 'rgba(239, 68, 68, 0.35)',
                        borderBottom: '2px dashed rgba(239, 68, 68, 0.5)',
                      }}
                    />
                  )}

                  <div className="relative z-10 flex flex-col h-full">
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.80)' }}>
                      €{Math.round(cat.spent)} / €{Math.round(cat.budget)}
                    </span>

                    {/* Delta badge */}
                    <div className="mt-auto flex items-center gap-1">
                      {isFixed ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                          Fixed
                        </span>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                          style={{
                            background: cat.status === 'under' ? 'rgba(39,174,96,0.2)' :
                              cat.status === 'over' ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.15)',
                            color: cat.status === 'under' ? '#27AE60' :
                              cat.status === 'over' ? '#EF4444' : '#8B5CF6',
                          }}
                        >
                          {cat.status === 'on-track' ? '✓ On track' :
                            cat.delta > 0 ? `+€${Math.round(cat.delta)}` : `-€${Math.abs(Math.round(cat.delta))}`}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Detail tooltip for selected block */}
          <AnimatePresence>
            {selectedCat && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  minWidth: 220,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2D2440' }}>{selectedCat.name}</div>
                <div className="flex justify-between mt-2">
                  <span style={{ fontSize: 12, color: '#5C4F6E' }}>Planned</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2D2440' }}>€{Math.round(selectedCat.budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 12, color: '#5C4F6E' }}>Actual</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2D2440' }}>€{Math.round(selectedCat.spent)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 12, color: '#5C4F6E' }}>Delta</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedCat.delta > 0 ? '#EF4444' : '#27AE60' }}>
                    {selectedCat.delta > 0 ? '+' : ''}€{Math.round(selectedCat.delta)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 relative" style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)' }}>
                  <div style={{
                    width: `${Math.min(selectedCat.pct, 100)}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: selectedCat.status === 'over' ? '#EF4444' : selectedCat.status === 'on-track' ? '#8B5CF6' : '#27AE60',
                  }} />
                  {/* 100% marker */}
                  <div className="absolute top-0 bottom-0" style={{ left: '100%', width: 2, background: '#2D2440', opacity: 0.3 }} />
                </div>
                <div className="text-right mt-0.5" style={{ fontSize: 10, color: '#8A7FA0' }}>
                  {Math.round(selectedCat.pct)}%
                </div>
                {/* Top transactions */}
                {selectedTxs.length > 0 && (
                  <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 10, color: '#8A7FA0' }}>Top transactions</span>
                    {selectedTxs.map(tx => (
                      <div key={tx.id} className="flex justify-between mt-1">
                        <span style={{ fontSize: 11, color: '#5C4F6E' }}>{tx.description}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#2D2440' }}>€{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Net Result Card */}
      <div className="px-4 mt-3">
        <div style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          <div className="flex items-center gap-3">
            <img src={johnnyImage} alt="Johnny" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2D2440' }}>Johnny's Take</div>
              <div style={{ fontSize: 12, color: '#5C4F6E', lineHeight: 1.4 }}>
                {persona?.n ? (insightText[persona.n] || insightText['Steady Saver']) : insightText['Steady Saver']}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
