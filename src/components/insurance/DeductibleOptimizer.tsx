import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';

interface DeductibleOptimizerProps {
  onBack: () => void;
  onClose: () => void;
}

interface PlanInput {
  premium: string;
  deductible: string;
  oopMax: string;
}

export function DeductibleOptimizer({ onBack, onClose }: DeductibleOptimizerProps) {
  const [planA, setPlanA] = useState<PlanInput>({ premium: '', deductible: '', oopMax: '' });
  const [planB, setPlanB] = useState<PlanInput>({ premium: '', deductible: '', oopMax: '' });
  const [showResults, setShowResults] = useState(false);

  const a = { premium: parseFloat(planA.premium || '0'), deductible: parseFloat(planA.deductible || '0'), oopMax: parseFloat(planA.oopMax || '0') };
  const b = { premium: parseFloat(planB.premium || '0'), deductible: parseFloat(planB.deductible || '0'), oopMax: parseFloat(planB.oopMax || '0') };

  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('jfb_insurance_profile') || '{}'); } catch { return {}; }
  })();
  const emergencySavings = profile.emergencySavings || 0;

  // Scenarios
  const scenarios = [
    {
      label: 'No claims',
      costA: a.premium,
      costB: b.premium,
    },
    {
      label: 'One claim',
      costA: a.premium + a.deductible,
      costB: b.premium + b.deductible,
    },
    {
      label: 'Multiple claims',
      costA: a.premium + (a.oopMax > 0 ? a.oopMax : a.deductible * 2),
      costB: b.premium + (b.oopMax > 0 ? b.oopMax : b.deductible * 2),
    },
  ];

  const premiumDiff = a.premium - b.premium;
  const deductibleDiff = b.deductible - a.deductible;
  const isDominated = premiumDiff > 0 && premiumDiff > deductibleDiff;
  const breakEvenYears = premiumDiff > 0 ? deductibleDiff / premiumDiff : 0;

  const canCompare = a.premium > 0 && b.premium > 0 && a.deductible >= 0 && b.deductible >= 0;
  const bIsCheaper = b.premium < a.premium;

  const renderInput = (label: string, value: string, onChange: (v: string) => void) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, padding: '0 10px', height: 38,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4, fontSize: 12 }}>€</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 14, fontWeight: 600 }}
        />
      </div>
    </div>
  );

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>← Back</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Deductible Optimizer</span>
        </div>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {!showResults ? (
        <>
          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {/* Plan A */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textAlign: 'center' }}>
                Plan A<br /><span style={{ fontSize: 10, fontWeight: 400 }}>Low Deductible</span>
              </div>
              {renderInput('Annual Premium', planA.premium, v => setPlanA(p => ({ ...p, premium: v })))}
              {renderInput('Deductible', planA.deductible, v => setPlanA(p => ({ ...p, deductible: v })))}
              {renderInput('OOP Max (optional)', planA.oopMax, v => setPlanA(p => ({ ...p, oopMax: v })))}
            </div>
            {/* Plan B */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.1)',
              borderRadius: 14, padding: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#C4B5FD', marginBottom: 12, textAlign: 'center' }}>
                Plan B<br /><span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>High Deductible</span>
              </div>
              {renderInput('Annual Premium', planB.premium, v => setPlanB(p => ({ ...p, premium: v })))}
              {renderInput('Deductible', planB.deductible, v => setPlanB(p => ({ ...p, deductible: v })))}
              {renderInput('OOP Max (optional)', planB.oopMax, v => setPlanB(p => ({ ...p, oopMax: v })))}
            </div>
          </div>

          <button onClick={() => canCompare && setShowResults(true)} disabled={!canCompare}
            style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none',
              background: canCompare ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'rgba(255,255,255,0.06)',
              color: canCompare ? 'white' : 'rgba(255,255,255,0.2)',
              fontSize: 15, fontWeight: 700, cursor: canCompare ? 'pointer' : 'default',
            }}>Compare Plans</button>
        </>
      ) : (
        <>
          {/* Scenario Table */}
          <div style={{ marginBottom: 14 }}>
            {/* Header */}
            <div style={{ display: 'flex', padding: '0 0 8px', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)' }}>
              <span style={{ flex: 1 }}>Scenario</span>
              <span style={{ width: 65, textAlign: 'right' }}>Plan A</span>
              <span style={{ width: 65, textAlign: 'right' }}>Plan B</span>
              <span style={{ width: 70, textAlign: 'right' }}>You Save</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '4px 12px' }}>
              {scenarios.map((s, i) => {
                const diff = s.costA - s.costB;
                const winner = diff > 0 ? 'B' : diff < 0 ? 'A' : 'tie';
                return (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', padding: '10px 0',
                    borderBottom: i < scenarios.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}>
                    <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
                    <span style={{ width: 65, textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>€{Math.round(s.costA)}</span>
                    <span style={{ width: 65, textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>€{Math.round(s.costB)}</span>
                    <span style={{
                      width: 70, textAlign: 'right', fontSize: 13, fontWeight: 700,
                      color: winner === 'tie' ? 'rgba(255,255,255,0.3)' : diff > 0 ? '#86EFAC' : '#FBBF24',
                    }}>
                      {winner === 'tie' ? '—' : `€${Math.round(Math.abs(diff))} ${winner}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Domination Warning */}
          {isDominated && (
            <div style={{
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)',
              borderRadius: 14, padding: 16, marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={16} style={{ color: '#FBBF24' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#FBBF24' }}>
                  Plan A Costs More in Every Scenario
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                You're paying €{Math.round(premiumDiff)} more per year in premiums, but the maximum you could ever save is €{Math.round(deductibleDiff)}. In less than {breakEvenYears.toFixed(1)} years, you'll have overpaid more than you could ever save.
              </div>
            </div>
          )}

          {/* Key Insight */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              KEY INSIGHT
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {premiumDiff > 0 ? (
                <>
                  You're paying <span style={{ color: 'white', fontWeight: 600 }}>€{Math.round(premiumDiff)}</span> extra per year for Plan A.
                  The maximum you could ever save is €{Math.round(deductibleDiff)} (the deductible difference).
                  {breakEvenYears < 2
                    ? ` In less than ${breakEvenYears.toFixed(1)} years, you'll have paid more extra premium than you could ever save.`
                    : ` You'd need to make a claim every ${breakEvenYears.toFixed(1)} years for Plan A to be worth it.`
                  }
                </>
              ) : (
                <>Plan A has lower premiums and a lower deductible — it's the better deal in every scenario.</>
              )}
            </div>
          </div>

          {/* Emergency Fund Context */}
          <div style={{
            display: 'flex', gap: 10, padding: '12px 14px', marginBottom: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, alignItems: 'flex-start',
          }}>
            <img src={johnnyImage} alt="Johnny" style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {emergencySavings >= b.deductible && b.deductible > 0 ? (
                <>You have €{Math.round(emergencySavings)} in emergency savings, which can cover Plan B's €{Math.round(b.deductible)} deductible. The €{Math.round(premiumDiff)}/year you save could grow your emergency fund further.</>
              ) : b.deductible > 0 ? (
                <>You have €{Math.round(emergencySavings)} in emergency savings, but Plan B's deductible is €{Math.round(b.deductible)}. Consider: keep Plan A for now, save €{Math.round(premiumDiff / 12)}/month until your emergency fund reaches €{Math.round(b.deductible)}. Then switch.</>
              ) : (
                <>Based on these numbers, {bIsCheaper ? 'Plan B saves you money on premiums' : 'Plan A is the more economical choice'}. Factor in your comfort level with out-of-pocket costs.</>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowResults(false); setPlanA({ premium: '', deductible: '', oopMax: '' }); setPlanB({ premium: '', deductible: '', oopMax: '' }); }}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              }}>New Comparison</button>
            <button onClick={onClose}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              }}>Done</button>
          </div>
        </>
      )}
    </div>
  );
}
