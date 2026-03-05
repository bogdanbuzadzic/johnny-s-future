import { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';

interface RiskProfileWizardProps {
  onBack: () => void;
  onClose: () => void;
}

interface Profile {
  netWorth: number;
  annualIncome: number;
  hasDependents: boolean;
  dependentCount: number;
  emergencySavings: number;
  housing: string;
  riskTolerance: number;
}

const STEPS = [
  {
    key: 'netWorth',
    label: "What's your approximate net worth?",
    help: 'Total assets minus debts',
    options: [
      { label: 'Negative', value: -5000 },
      { label: '€0–€10K', value: 5000 },
      { label: '€10K–€50K', value: 30000 },
      { label: '€50K–€100K', value: 75000 },
      { label: '€100K–€250K', value: 175000 },
      { label: '€250K+', value: 350000 },
    ],
  },
  {
    key: 'annualIncome',
    label: "What's your annual household income?",
    help: null,
    options: [
      { label: '< €20K', value: 15000 },
      { label: '€20K–€35K', value: 27500 },
      { label: '€35K–€50K', value: 42500 },
      { label: '€50K–€75K', value: 62500 },
      { label: '€75K–€100K', value: 87500 },
      { label: '€100K+', value: 125000 },
    ],
  },
  {
    key: 'dependents',
    label: 'Do you have dependents who rely on your income?',
    help: 'Spouse, children, elderly parents',
    options: [
      { label: 'No dependents', value: 0 },
      { label: 'Yes, 1', value: 1 },
      { label: 'Yes, 2–3', value: 2 },
      { label: 'Yes, 4+', value: 4 },
    ],
  },
  {
    key: 'emergencySavings',
    label: 'How much do you have in emergency savings?',
    help: 'Cash you could access within a week',
    options: [
      { label: 'None', value: 0 },
      { label: '< €1,000', value: 500 },
      { label: '€1,000–€5,000', value: 3000 },
      { label: '€5,000–€15,000', value: 10000 },
      { label: '€15,000+', value: 20000 },
    ],
  },
  {
    key: 'housing',
    label: 'Do you own or rent?',
    help: null,
    options: [
      { label: 'Own (mortgage)', value: 'own-mortgage' },
      { label: 'Own (no mortgage)', value: 'own-free' },
      { label: 'Rent', value: 'rent' },
      { label: 'Live with family', value: 'family' },
    ],
  },
  {
    key: 'riskTolerance',
    label: 'How do you feel about financial risk?',
    help: 'This adjusts how aggressively we recommend insurance',
    options: [
      { label: 'Very cautious', value: 0.5 },
      { label: 'Somewhat cautious', value: 0.75 },
      { label: 'Moderate', value: 1.0 },
      { label: 'Comfortable with risk', value: 1.5 },
    ],
  },
];

export function RiskProfileWizard({ onBack, onClose }: RiskProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [done, setDone] = useState(false);

  // Pre-populate from existing profile or budget config
  useEffect(() => {
    const existing = localStorage.getItem('jfb_insurance_profile');
    if (existing) {
      try {
        const p: Profile = JSON.parse(existing);
        setAnswers({
          netWorth: p.netWorth,
          annualIncome: p.annualIncome,
          dependents: p.dependentCount,
          emergencySavings: p.emergencySavings,
          housing: p.housing,
          riskTolerance: p.riskTolerance,
        });
      } catch {}
    } else {
      // Try to pre-populate income from budget
      try {
        const bd = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
        if (bd.config?.monthlyIncome) {
          setAnswers(prev => ({ ...prev, annualIncome: bd.config.monthlyIncome * 12 }));
        }
      } catch {}
    }
  }, []);

  const currentStep = STEPS[step];
  const currentValue = answers[currentStep.key];
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSelect = (value: any) => {
    setAnswers(prev => ({ ...prev, [currentStep.key]: value }));
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Save profile
      const profile: Profile = {
        netWorth: answers.netWorth ?? 30000,
        annualIncome: answers.annualIncome ?? 30000,
        hasDependents: (answers.dependents ?? 0) > 0,
        dependentCount: answers.dependents ?? 0,
        emergencySavings: answers.emergencySavings ?? 0,
        housing: answers.housing ?? 'rent',
        riskTolerance: answers.riskTolerance ?? 1.0,
      };
      localStorage.setItem('jfb_insurance_profile', JSON.stringify(profile));
      setDone(true);
      setTimeout(() => onBack(), 1800);
    }
  };

  if (done) {
    return (
      <div className="px-5 pb-8" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
          background: 'rgba(34,197,94,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={32} style={{ color: '#86EFAC' }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>Profile Saved!</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
          Johnny now has the context to help you make insurance decisions.
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>← Back</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Risk Profile</span>
        </div>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          Step {step + 1} of {STEPS.length}
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${progress}%`,
            background: 'linear-gradient(90deg, #8B5CF6, #C4B5FD)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>
          {currentStep.label}
        </div>
        {currentStep.help && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            {currentStep.help}
          </div>
        )}
      </div>

      {/* Options as pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {currentStep.options.map(opt => {
          const isSelected = currentValue === opt.value;
          return (
            <button
              key={String(opt.value)}
              onClick={() => handleSelect(opt.value)}
              style={{
                minHeight: 44,
                padding: '10px 16px',
                borderRadius: 12,
                border: isSelected ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                color: isSelected ? '#C4B5FD' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Privacy note on step 1 */}
      {step === 0 && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', textAlign: 'center', marginBottom: 16 }}>
          🔒 This stays on your device. Never shared.
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
              fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
            }}
          >Back</button>
        )}
        <button
          onClick={handleNext}
          disabled={currentValue === undefined}
          style={{
            flex: 2, height: 44, borderRadius: 10,
            background: currentValue !== undefined
              ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
              : 'rgba(255,255,255,0.06)',
            color: currentValue !== undefined ? 'white' : 'rgba(255,255,255,0.2)',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            opacity: currentValue !== undefined ? 1 : 0.5,
          }}
        >
          {step === STEPS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
