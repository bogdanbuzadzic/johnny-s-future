import { useState, useEffect } from 'react';
import { Shield, Scale, GitCompare, Lock, ChevronRight, X } from 'lucide-react';
import { JohnnyMessage } from '@/components/ui/JohnnyMessage';
import { RiskProfileWizard } from './RiskProfileWizard';
import { WorthItCalculator } from './WorthItCalculator';
import { DeductibleOptimizer } from './DeductibleOptimizer';

interface InsuranceToolHomeProps {
  onBack: () => void;
  onClose: () => void;
}

export function InsuranceToolHome({ onBack, onClose }: InsuranceToolHomeProps) {
  const [activeView, setActiveView] = useState<'home' | 'profile' | 'worth-it' | 'deductible'>('home');
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    setHasProfile(!!localStorage.getItem('jfb_insurance_profile'));
  }, [activeView]);

  if (activeView === 'profile') {
    return <RiskProfileWizard onBack={() => setActiveView('home')} onClose={onClose} />;
  }
  if (activeView === 'worth-it') {
    return <WorthItCalculator onBack={() => setActiveView('home')} onClose={onClose} />;
  }
  if (activeView === 'deductible') {
    return <DeductibleOptimizer onBack={() => setActiveView('home')} onClose={onClose} />;
  }

  const tools = [
    {
      id: 'profile' as const,
      icon: Shield,
      title: 'My Risk Profile',
      desc: '60 seconds to understand what you actually need to protect',
      locked: false,
      complete: hasProfile,
      action: hasProfile ? 'Edit' : 'Start',
    },
    {
      id: 'worth-it' as const,
      icon: Scale,
      title: 'Should I Buy This Insurance?',
      desc: 'Find out if a specific insurance is worth the cost',
      locked: !hasProfile,
      complete: false,
      action: 'Calculate',
    },
    {
      id: 'deductible' as const,
      icon: GitCompare,
      title: 'Compare Insurance Plans',
      desc: 'Which deductible level saves you the most money?',
      locked: !hasProfile,
      complete: false,
      action: 'Compare',
    },
  ];

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>← Back</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Insurance Tools</span>
        </div>
        <button onClick={onClose}><X size={20} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <JohnnyMessage variant="dark">
          Insurance companies love confusion. Let's cut through it. Pick a tool below.
        </JohnnyMessage>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => !tool.locked && setActiveView(tool.id)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 16,
                cursor: tool.locked ? 'default' : 'pointer',
                opacity: tool.locked ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: tool.complete ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {tool.locked ? (
                  <Lock size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <Icon size={18} style={{ color: tool.complete ? '#86EFAC' : '#C4B5FD' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{tool.title}</span>
                  {tool.complete && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#86EFAC',
                      background: 'rgba(34,197,94,0.12)', borderRadius: 6, padding: '2px 6px',
                    }}>✓ Complete</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {tool.locked ? 'Complete Risk Profile first' : tool.desc}
                </div>
              </div>
              {!tool.locked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#C4B5FD', fontWeight: 500 }}>{tool.action}</span>
                  <ChevronRight size={14} style={{ color: '#C4B5FD' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
