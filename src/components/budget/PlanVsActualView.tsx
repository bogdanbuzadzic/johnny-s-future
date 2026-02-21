import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { getPersona } from '@/lib/profileData';

const categoryColors: Record<string, string> = {
  Food: '#E67E22', Entertainment: '#9B59B6', Shopping: '#E74C3C', Lifestyle: '#1ABC9C',
};

const insightText: Record<string, string> = {
  'Money Avoider': "Progress over perfection. You stayed close to plan, and that matters.",
  'Impulsive Optimist': "Almost nailed it! One small tweak and you're golden.",
  'Present Hedonist': "You enjoyed your month AND stayed mostly on track. That's the goal.",
  'Vigilant Saver': "Solid discipline overall. Worth investigating the overspend areas.",
  'Confident Controller': "Data shows your variance. Focus on actionable areas.",
  'Steady Saver': "Consistent across most categories. Your system is working.",
};

interface PlanVsActualOverlayProps {
  onClose: () => void;
}

/**
 * Renders INSIDE the terrain drawer as a section below the chart.
 * Shows category breakdown, stats, and insight.
 */
export function PlanVsActualOverlay({ onClose }: PlanVsActualOverlayProps) {
  const { expenseCategories, getCategorySpent } = useBudget();

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
      const color = categoryColors[cat.name] || '#7F8C8D';
      return { id: cat.id, name: cat.name, budget, spent, delta, color };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [expenseCategories, getCategorySpent]);

  const totalVariance = categoryData.reduce((s, c) => s + c.delta, 0);
  const bestDay = categoryData.reduce((best, c) => c.delta < best.delta ? c : best, categoryData[0]);
  const worstDay = categoryData.reduce((worst, c) => c.delta > worst.delta ? c : worst, categoryData[0]);

  return (
    <div className="mt-3">
      {/* Stats row */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        <div className="flex-shrink-0 rounded-[10px] px-3 py-2" style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 100,
        }}>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Variance</span>
          <p className="text-[16px] font-bold mt-0.5" style={{ color: totalVariance > 0 ? '#FBBF24' : '#86EFAC' }}>
            {totalVariance > 0 ? '+' : ''}€{Math.round(Math.abs(totalVariance))}
          </p>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {totalVariance > 0 ? 'over plan' : 'under plan'}
          </span>
        </div>
        {bestDay && (
          <div className="flex-shrink-0 rounded-[10px] px-3 py-2" style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 100,
          }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Best</span>
            <p className="text-[16px] font-bold mt-0.5" style={{ color: '#86EFAC' }}>
              {bestDay.name}
            </p>
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              -€{Math.abs(Math.round(bestDay.delta))} under
            </span>
          </div>
        )}
        {worstDay && (
          <div className="flex-shrink-0 rounded-[10px] px-3 py-2" style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 100,
          }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Worst</span>
            <p className="text-[16px] font-bold mt-0.5" style={{ color: '#FBBF24' }}>
              {worstDay.name}
            </p>
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              +€{Math.round(worstDay.delta)} over
            </span>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="mt-2 rounded-xl px-3 py-2" style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {categoryData.map((c, i) => (
          <div key={c.id} className="flex items-center py-[6px]"
            style={{ borderBottom: i < categoryData.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
            <div className="w-[6px] h-[6px] rounded-full mr-2 flex-shrink-0" style={{ background: c.color }} />
            <span className="text-[12px] flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{c.name}</span>
            <span className="text-[12px] mr-3" style={{ color: 'rgba(255,255,255,0.25)' }}>€{Math.round(c.budget)} plan</span>
            <span className="text-[12px] mr-3 text-white">€{Math.round(c.spent)} actual</span>
            <span className="text-[12px] font-bold" style={{ color: c.delta > 0 ? '#FBBF24' : '#86EFAC' }}>
              {c.delta > 0 ? '+' : ''}€{Math.round(c.delta)}
            </span>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-[12px] italic" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {(() => {
            const biggest = categoryData[0];
            if (!biggest) return '';
            if (biggest.delta > 0) return `${biggest.name} was the main deviation. Consider weekly planning.`;
            return `You were €${Math.abs(Math.round(biggest.delta))} under on ${biggest.name}. Your discipline is paying off.`;
          })()}
        </p>
      </div>
    </div>
  );
}

// Keep old export name for backward compat (but it's no longer used as a full view)
export function PlanVsActualView({ onClose }: { onClose: () => void }) {
  return null;
}
