import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import johnnyImage from '@/assets/johnny.png';

interface BankConnectionScreenProps {
  onComplete: () => void;
}

const banks = [
  { name: 'OTP Banka', abbrev: 'OTP', fallbackColor: '#4A9B3F' },
  { name: 'UniCredit', abbrev: 'UNI', fallbackColor: '#E00A17' },
  { name: 'Intesa', abbrev: 'INT', fallbackColor: '#004B23' },
  { name: 'Revolut', abbrev: 'REV', fallbackColor: '#0075EB' },
  { name: 'NLB', abbrev: 'NLB', fallbackColor: '#00A4E4' },
  { name: 'More', abbrev: '+', fallbackColor: '#8A7FA0' },
];

function loadDemoData() {
  try {
    const bd = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
    if (!bd.config?.setupComplete) return;

    const cats = bd.categories || [];
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const demoTransactions = [
      { cat: 'Food', items: [{ desc: 'Maxi Market', amt: 42 }, { desc: 'Kafana Question Mark', amt: 28 }, { desc: 'Wolt delivery', amt: 18 }, { desc: 'Pekara', amt: 6 }, { desc: 'Lidl groceries', amt: 55 }, { desc: 'Aroma coffee', amt: 4 }, { desc: 'Mercator', amt: 38 }, { desc: 'Street food', amt: 12 }, { desc: 'Bakery', amt: 8 }, { desc: 'Restaurant', amt: 35 }, { desc: 'Glovo', amt: 15 }] },
      { cat: 'Entertainment', items: [{ desc: 'Netflix', amt: 14 }, { desc: 'Cinema City', amt: 12 }, { desc: 'Spotify', amt: 10 }, { desc: 'PlayStation Store', amt: 25 }, { desc: 'Night out', amt: 45 }, { desc: 'Escape room', amt: 18 }, { desc: 'Concert ticket', amt: 35 }] },
      { cat: 'Shopping', items: [{ desc: 'Zara', amt: 65 }, { desc: 'H&M', amt: 42 }, { desc: 'Amazon', amt: 38 }, { desc: 'AliExpress', amt: 22 }, { desc: 'IKEA', amt: 55 }, { desc: 'New sneakers', amt: 85 }] },
      { cat: 'Lifestyle', items: [{ desc: 'Gym membership', amt: 30 }, { desc: 'Haircut', amt: 15 }, { desc: 'Vitamins', amt: 12 }] },
    ];

    const txs: any[] = [...(bd.transactions || [])];
    demoTransactions.forEach(group => {
      const cat = cats.find((c: any) => c.name === group.cat && c.type === 'expense');
      if (!cat) return;
      group.items.forEach((item, i) => {
        const day = Math.min(1 + Math.floor(Math.random() * 28), 28);
        txs.push({
          id: crypto.randomUUID(),
          amount: item.amt,
          type: 'expense',
          categoryId: cat.id,
          description: item.desc,
          date: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          isRecurring: false,
        });
      });
    });

    bd.transactions = txs;

    // Fix category budgets to match demo spending
    // ── ENSURE FIXED CATEGORIES EXIST (needed for terrain markers) ──
    const fixedCatsToEnsure = [
      { name: 'Rent', icon: 'Home', monthlyBudget: 600, type: 'fixed' as const },
      { name: 'Utilities', icon: 'Zap', monthlyBudget: 120, type: 'fixed' as const },
      { name: 'Transport', icon: 'Car', monthlyBudget: 80, type: 'fixed' as const },
    ];
    fixedCatsToEnsure.forEach(fc => {
      const exists = bd.categories.some((c: any) => c.name === fc.name && c.type === 'fixed');
      if (!exists) {
        bd.categories.push({
          id: crypto.randomUUID(),
          name: fc.name,
          icon: fc.icon,
          monthlyBudget: fc.monthlyBudget,
          type: fc.type,
          sortOrder: bd.categories.length,
        });
      }
    });

    const catBudgetMap: Record<string, number> = {
      Food: 334, Entertainment: 191, Shopping: 241, Lifestyle: 170, Subscriptions: 66, Subs: 66,
    };
    bd.categories = (bd.categories || []).map((c: any) => {
      if (c.type === 'expense' && catBudgetMap[c.name]) {
        return { ...c, monthlyBudget: catBudgetMap[c.name] };
      }
      return c;
    });
    bd.config = { ...bd.config, monthlyIncome: 2500, monthlySavingsTarget: 200, setupComplete: true };

    localStorage.setItem('jfb-budget-data', JSON.stringify(bd));
  } catch {}
}

export function BankConnectionScreen({ onComplete }: BankConnectionScreenProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handleConnect = (text: string) => {
    setLoading(true);
    setLoadingText(text);
    setTimeout(() => {
      loadDemoData();
      localStorage.setItem('jfb_bank_connected', 'true');
      onComplete();
    }, 1500);
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: '#8B5CF6', borderTopColor: 'transparent' }} />
        <p className="mt-4 text-[14px] font-medium" style={{ color: '#5C4F6E' }}>{loadingText}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex flex-col overflow-auto"
      style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>

      <div className="flex-1 px-6 py-10 flex flex-col items-center">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#34C759' }}>✓</div>
          <div className="w-8 h-0.5" style={{ background: '#34C759' }} />
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#34C759' }}>✓</div>
          <div className="w-8 h-0.5" style={{ background: '#8B5CF6' }} />
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#8B5CF6' }}>3</div>
        </div>

        {/* Title */}
        <h1 className="text-[24px] font-bold text-center mb-1" style={{ color: '#2D2440' }}>Connect Your Money</h1>
        <p className="text-[13px] text-center mb-6" style={{ color: '#8A7FA0' }}>
          So Johnny can see where your money actually goes
        </p>

        {/* Option 1: Bank logos */}
        <div className="w-full max-w-[340px] rounded-2xl p-4 mb-3"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)' }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: '#2D2440' }}>Connect Bank Account</p>
          <div className="grid grid-cols-3 gap-2">
            {banks.map(bank => (
              <button key={bank.abbrev} onClick={() => handleConnect('Connecting...')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: bank.fallbackColor }}>
                  <span className="text-white text-[11px] font-bold">{bank.abbrev}</span>
                </div>
                <span className="text-[10px]" style={{ color: '#5C4F6E' }}>{bank.name}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-3 text-center" style={{ color: '#8A7FA0' }}>
            Automatic sync — transactions update daily
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-[340px] my-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(45,36,64,0.1)' }} />
          <span className="text-[11px] font-medium" style={{ color: '#8A7FA0' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(45,36,64,0.1)' }} />
        </div>

        {/* Option 2: Upload */}
        <button onClick={() => handleConnect('Processing...')}
          className="w-full max-w-[340px] rounded-2xl p-5 mb-4 flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.4)', border: '2px dashed rgba(139,92,246,0.25)' }}>
          <Upload className="w-6 h-6" style={{ color: '#8B5CF6' }} />
          <p className="text-[13px] font-semibold" style={{ color: '#2D2440' }}>Upload Bank Statement</p>
          <p className="text-[10px]" style={{ color: '#8A7FA0' }}>Drop a PDF here or tap to browse</p>
          <p className="text-[10px]" style={{ color: '#8A7FA0' }}>Supports OTP, Revolut, NLB, and more</p>
        </button>

        {/* Skip */}
        <button onClick={() => handleConnect('Setting up...')}
          className="text-[12px] mb-5" style={{ color: '#8A7FA0' }}>
          Skip for now — I'll add data manually
        </button>

        {/* Johnny */}
        <div className="w-full max-w-[340px]">
          <div className="flex items-start gap-3 rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)' }}>
            <img src={johnnyImage} alt="Johnny" className="w-8 h-8 object-contain shrink-0" style={{ imageRendering: 'pixelated' as any }} />
            <div>
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#8A7FA0' }}>Johnny</p>
              <p className="text-[12px]" style={{ color: '#5C4F6E' }}>
                I need your transactions to make Financial Tetris work. The more data I have, the better I can help.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
