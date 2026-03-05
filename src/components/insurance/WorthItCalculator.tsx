import { useState } from 'react';
import { X, Smartphone, Heart, Home, Car, Activity, Plane, MoreHorizontal, Shield, Check, AlertTriangle, HelpCircle, Dog } from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';

interface WorthItCalculatorProps {
  onBack: () => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'warranty', label: 'Extended Warranty', icon: Smartphone },
  { id: 'life', label: 'Life Insurance', icon: Heart },
  { id: 'home', label: 'Home / Renter\'s', icon: Home },
  { id: 'car', label: 'Car Insurance', icon: Car },
  { id: 'health', label: 'Health Insurance', icon: Activity },
  { id: 'travel', label: 'Travel Insurance', icon: Plane },
  { id: 'pet', label: 'Pet Insurance', icon: Dog },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

const HELP_TEXT: Record<string, string> = {
  warranty: 'The replacement cost of the item',
  life: 'Years of income your family would lose (e.g. 10 × annual income)',
  home: 'Cost to rebuild + replace contents',
  car: 'Current market value of the vehicle',
  health: 'Maximum medical bills you could face',
  travel: 'Trip cost + potential medical expenses abroad',
  pet: 'Potential vet bills for surgery or illness',
  other: 'The maximum financial loss you could face',
};

type Verdict = 'SKIP' | 'CONSIDER' | 'BUY' | 'ESSENTIAL';

const VERDICT_CONFIG: Record<Verdict, { color: string; bg: string; border: string; icon: any; title: string }> = {
  SKIP: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: '#EF4444', icon: X, title: 'SKIP — You can self-insure this' },
  CONSIDER: { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: '#FBBF24', icon: HelpCircle, title: 'CONSIDER — It\'s a judgment call' },
  BUY: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: '#22C55E', icon: Check, title: 'BUY — This is worth protecting' },
  ESSENTIAL: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: '#22C55E', icon: Shield, title: 'ESSENTIAL — Don\'t go without this' },
};

export function WorthItCalculator({ onBack, onClose }: WorthItCalculatorProps) {
  const [category, setCategory] = useState('');
  const [valueAtRisk, setValueAtRisk] = useState('');
  const [premium, setPremium] = useState('');
  const [premiumMode, setPremiumMode] = useState<'month' | 'year'>('year');
  const [deductible, setDeductible] = useState('');
  const [showResults, setShowResults] = useState(false);

  const annualPremium = premiumMode === 'month' ? parseFloat(premium || '0') * 12 : parseFloat(premium || '0');
  const val = parseFloat(valueAtRisk || '0');
  const ded = parseFloat(deductible || '0');
  const showDeductible = category !== 'warranty' && category !== '';

  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('jfb_insurance_profile') || '{}'); } catch { return {}; }
  })();
  const netWorth = profile.netWorth || 30000;
  const riskTolerance = profile.riskTolerance || 1.0;
  const hasDependents = profile.hasDependents || false;
  const emergencySavings = profile.emergencySavings || 0;

  const proportionalLoss = netWorth > 0 ? (val - ded) / netWorth : 0;
  const adjustedLoss = riskTolerance > 0 ? proportionalLoss / riskTolerance : proportionalLoss;

  let verdict: Verdict = 'SKIP';
  if (adjustedLoss >= 0.50) verdict = 'ESSENTIAL';
  else if (adjustedLoss >= 0.20) verdict = 'BUY';
  else if (adjustedLoss >= 0.05) verdict = 'CONSIDER';

  // Special cases
  const isSmallWarranty = category === 'warranty' && val < 1000 && proportionalLoss < 0.02;
  const isLifeNoDeps = category === 'life' && !hasDependents;
  if (isSmallWarranty) verdict = 'SKIP';

  const vc = VERDICT_CONFIG[verdict];
  const VerdictIcon = vc.icon;

  const impactLabel = adjustedLoss < 0.05 ? 'Minimal Impact' : adjustedLoss < 0.20 ? 'Moderate Impact' : adjustedLoss < 0.50 ? 'Significant Impact' : 'Catastrophic Impact';
  const impactColor = adjustedLoss < 0.05 ? '#86EFAC' : adjustedLoss < 0.20 ? '#FBBF24' : adjustedLoss < 0.50 ? '#F97316' : '#EF4444';
  const impactPct = Math.min(adjustedLoss * 100 * 2, 100); // scale for visibility

  const selfInsureYears = annualPremium > 0 ? Math.ceil(val / annualPremium) : 0;

  const canAnalyze = category && val > 0 && annualPremium > 0;

  const getJohnnyInsight = () => {
    if (isSmallWarranty) return `Extended warranties on items under €1,000 rarely pay off. The markup is high, and your emergency fund can handle it.`;
    if (verdict === 'SKIP') return `Put that €${Math.round(annualPremium)} into your emergency fund instead. After ${selfInsureYears} years, you'll have saved €${Math.round(annualPremium * selfInsureYears)} — nearly the cost of a replacement.`;
    if (verdict === 'CONSIDER') return `This is a judgment call. With your risk profile, it's borderline. If losing €${Math.round(val)} would cause you stress, it might be worth the peace of mind.`;
    if (verdict === 'BUY') return `This protects against a real risk. €${Math.round(annualPremium)}/year is reasonable for protecting €${Math.round(val)}.`;
    return `This is exactly what insurance is designed for — protecting against catastrophic, irreversible losses. Don't go without it.`;
  };

  return (
    <div className="px-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>← Back</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Worth-It Calculator</span>
        </div>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {!showResults ? (
        <>
          {/* Category Selection */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 600 }}>
              What type of insurance?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const selected = category === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 12,
                      border: selected ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={16} style={{ color: selected ? '#C4B5FD' : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: selected ? '#C4B5FD' : 'rgba(255,255,255,0.5)' }}>{cat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value at Risk */}
          {category && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>
                What's the maximum you could lose?
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>
                {HELP_TEXT[category]}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '0 12px', height: 44,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>€</span>
                <input
                  type="number" value={valueAtRisk} onChange={e => setValueAtRisk(e.target.value)}
                  placeholder="0"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'white', fontSize: 16, fontWeight: 600,
                  }}
                />
              </div>
            </div>
          )}

          {/* Annual Premium */}
          {category && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>
                How much would you pay?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '0 12px', height: 44,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>€</span>
                  <input
                    type="number" value={premium} onChange={e => setPremium(e.target.value)}
                    placeholder="0"
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: 'white', fontSize: 16, fontWeight: 600,
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex', borderRadius: 10, overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {(['month', 'year'] as const).map(m => (
                    <button key={m} onClick={() => setPremiumMode(m)} style={{
                      padding: '0 12px', height: 44, border: 'none',
                      background: premiumMode === m ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                      color: premiumMode === m ? '#C4B5FD' : 'rgba(255,255,255,0.3)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      /{m === 'month' ? 'mo' : 'yr'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Deductible */}
          {showDeductible && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>
                What's the deductible?
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '0 12px', height: 44,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>€</span>
                <input
                  type="number" value={deductible} onChange={e => setDeductible(e.target.value)}
                  placeholder="0"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'white', fontSize: 16, fontWeight: 600,
                  }}
                />
              </div>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={() => canAnalyze && setShowResults(true)}
            disabled={!canAnalyze}
            style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none',
              background: canAnalyze ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'rgba(255,255,255,0.06)',
              color: canAnalyze ? 'white' : 'rgba(255,255,255,0.2)',
              fontSize: 15, fontWeight: 700, cursor: canAnalyze ? 'pointer' : 'default',
            }}
          >Analyze</button>
        </>
      ) : (
        <>
          {/* Results */}
          {/* Verdict Card */}
          <div style={{
            background: vc.bg,
            borderLeft: `${verdict === 'ESSENTIAL' ? 6 : 4}px solid ${vc.border}`,
            borderRadius: 14, padding: 18, marginBottom: 14,
            animation: verdict === 'ESSENTIAL' ? 'pulse 2s infinite' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <VerdictIcon size={24} style={{ color: vc.color }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: vc.color }}>{vc.title}</span>
            </div>

            {/* Impact bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Impact on your wealth</span>
                <span style={{ fontSize: 10, color: impactColor, fontWeight: 600 }}>{impactLabel}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  width: `${impactPct}%`, height: '100%', borderRadius: 3,
                  background: impactColor, transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>
                {Math.round(proportionalLoss * 100)}% of your net worth at risk
              </div>
            </div>

            {/* Special case notes */}
            {isSmallWarranty && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                Extended warranties on small items have high markups. Your emergency fund can handle this.
              </div>
            )}
            {isLifeNoDeps && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                💡 You have no dependents, so life insurance may not be necessary. Consider disability insurance instead.
              </div>
            )}
          </div>

          {/* Johnny Insight */}
          <div style={{
            display: 'flex', gap: 10, padding: '12px 14px', marginBottom: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, alignItems: 'flex-start',
          }}>
            <img src={johnnyImage} alt="Johnny" style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {getJohnnyInsight()}
            </div>
          </div>

          {/* Self-insure alternative for SKIP */}
          {verdict === 'SKIP' && annualPremium > 0 && (
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)',
              borderRadius: 14, padding: 16, marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
                Instead of insurance
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Put €{Math.round(annualPremium)}/year into your emergency fund. After 5 years: <span style={{ color: '#86EFAC', fontWeight: 700 }}>€{Math.round(annualPremium * 5)} saved</span>.
              </div>
            </div>
          )}

          {/* Add to Fixed suggestion for BUY/ESSENTIAL */}
          {(verdict === 'BUY' || verdict === 'ESSENTIAL') && (
            <div style={{
              background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)',
              borderRadius: 14, padding: 14, marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <img src={johnnyImage} alt="Johnny" style={{ width: 24, height: 24, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>
                Want to add €{Math.round(annualPremium / 12)}/mo to your Fixed expenses?
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowResults(false); setCategory(''); setValueAtRisk(''); setPremium(''); setDeductible(''); }}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              }}>New Analysis</button>
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
