import { useState } from 'react';
import { Plus, Sliders, Lock, PiggyBank, ShieldCheck } from 'lucide-react';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { toast } from 'sonner';

function MyMoneyContent() {
  const { config } = useBudget();
  const [showSettings, setShowSettings] = useState(false);

  if (!config.setupComplete) return <SetupWizard />;

  return (
    <div className="h-full overflow-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        {/* Header – 48px */}
        <div className="flex items-center justify-between mb-3" style={{ height: 48 }}>
          <h1 style={{ fontSize: 22 }} className="font-bold text-primary-white">My Money</h1>
          <button onClick={() => setShowSettings(true)} className="p-2 -mr-2">
            <Sliders size={24} className="text-primary-white/50" strokeWidth={1.5} />
          </button>
        </div>

        {/* Container – the game board */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            height: '55vh',
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.20)',
            borderRadius: 20,
            boxShadow: 'inset 0 0 30px rgba(255,255,255,0.03)',
          }}
        >
          {/* Fixed Expenses Bar – 36px */}
          <div
            className="flex items-center justify-between px-3 flex-shrink-0"
            style={{
              height: 36,
              background: 'rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Lock size={12} className="text-primary-white/20" strokeWidth={1.5} />
              <span style={{ fontSize: 11 }} className="text-primary-white/20">No fixed expenses</span>
            </div>
            <span style={{ fontSize: 11 }} className="text-primary-white/20">Fixed: €0</span>
          </div>

          {/* Main Area – empty state with dotted grid */}
          <div
            className="flex-1 flex flex-col items-center justify-center"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <span style={{ fontSize: 16 }} className="text-primary-white/20 mb-1">
              Your budget blocks will appear here
            </span>
            <span style={{ fontSize: 12 }} className="text-primary-white/15">
              Add categories in Settings to get started
            </span>
          </div>

          {/* Savings Bar – 36px */}
          <div
            className="flex items-center justify-between px-3 flex-shrink-0"
            style={{
              height: 36,
              background: 'rgba(52,199,89,0.08)',
              borderTop: '1px solid rgba(52,199,89,0.12)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <PiggyBank size={12} style={{ color: 'rgba(52,199,89,0.3)' }} strokeWidth={1.5} />
              <span style={{ fontSize: 11 }} className="text-primary-white/25">Savings €0/mo</span>
            </div>
            <ShieldCheck size={12} className="text-primary-white/15" strokeWidth={1.5} />
          </div>
        </div>

        {/* Impact Summary Row */}
        <div
          className="mt-3 flex items-center justify-between px-4"
          style={{
            height: 40,
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16,
          }}
        >
          <span style={{ fontSize: 13 }} className="text-primary-white/30">€0 remaining</span>
          <span
            style={{ fontSize: 12, background: 'rgba(255,255,255,0.10)' }}
            className="text-primary-white/25 px-3 py-1 rounded-full"
          >
            Set up budget
          </span>
          <span style={{ fontSize: 13 }} className="text-primary-white/30">€0/day</span>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => toast('Add Transaction coming soon')}
        className="fixed z-50 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          bottom: 80,
          right: 20,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B5CF6, #FF6B9D)',
          boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
        }}
      >
        <Plus size={24} className="text-primary-white" strokeWidth={2} />
      </button>

      <EditBudgetSheet open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
