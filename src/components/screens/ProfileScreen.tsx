import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Brain, LayoutGrid, Target, Sparkles, BookOpen, Building2,
  Lock, ChevronRight, Settings, Bell, Palette, Download, Shield, Info,
  Footprints, ClipboardCheck, PiggyBank, Compass, TrendingUp, Trophy, Clock
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useBudget } from '@/context/BudgetContext';
import { useToast } from '@/hooks/use-toast';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import avatarImg from '@/assets/avatar.png';

// --- Score calculation ---
function calculateHealthScore(
  config: { setupComplete: boolean; monthlyIncome: number; monthlySavingsTarget: number },
  paceStatus: string,
  flexSpent: number,
  goals: { target: number; saved: number }[],
  hasCompletedAssessment: boolean,
  hasUsedWhatIf: boolean,
) {
  const awareness = hasCompletedAssessment ? 25 : 0;

  let budgetHealth = 0;
  if (config.setupComplete) budgetHealth += 10;
  if (paceStatus === 'on-track') budgetHealth += 10;
  if (flexSpent > 0) budgetHealth += 5;
  budgetHealth = Math.min(budgetHealth, 25);

  let goalProgress = 0;
  if (goals.length > 0) {
    const avg = goals.reduce((s, g) => s + (g.target > 0 ? Math.min(g.saved / g.target, 1) : 0), 0) / goals.length;
    goalProgress = Math.round(avg * 25);
  }

  let futurePlanning = 0;
  if (config.monthlySavingsTarget > 0) futurePlanning += 10;
  if (hasUsedWhatIf) futurePlanning += 5;
  const savingsRate = config.monthlyIncome > 0 ? config.monthlySavingsTarget / config.monthlyIncome : 0;
  if (savingsRate > 0.1) futurePlanning += 10;
  futurePlanning = Math.min(futurePlanning, 25);

  return { awareness, budgetHealth, goalProgress, futurePlanning, total: awareness + budgetHealth + goalProgress + futurePlanning };
}

function getLevelTitle(score: number) {
  if (score >= 80) return 'Financial Master';
  if (score >= 60) return 'Wealth Architect';
  if (score >= 40) return 'Budget Builder';
  if (score >= 20) return 'Money Explorer';
  return 'Financial Beginner';
}

// --- Count-up hook ---
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// --- Module data ---
const modulesDef = [
  { key: 'clarity', name: 'Know Yourself', icon: Brain, glow: 'rgba(139,92,246,0.15)' },
  { key: 'budget', name: 'Budget Arena', icon: LayoutGrid, glow: 'rgba(255,107,157,0.15)' },
  { key: 'goals', name: 'Dream Builder', icon: Target, glow: 'rgba(34,197,94,0.15)' },
  { key: 'simulate', name: 'Future Vision', icon: Sparkles, glow: 'rgba(6,182,212,0.15)' },
  { key: 'learn', name: 'Knowledge Tower', icon: BookOpen, glow: 'rgba(139,92,246,0.15)', locked: true },
  { key: 'banking', name: 'Execution Hub', icon: Building2, glow: 'rgba(139,92,246,0.15)', locked: true },
];

// --- Achievement data ---
const achievementsDef = [
  { key: 'first-step', name: 'First Step', desc: 'Set up your budget', hint: 'Complete the budget setup wizard', icon: Footprints },
  { key: 'tracker', name: 'Tracker', desc: 'Log 10+ transactions', hint: 'Keep logging your expenses', icon: ClipboardCheck },
  { key: 'dreamer', name: 'Dreamer', desc: 'Create your first goal', hint: 'Add a savings goal', icon: Star },
  { key: 'saver', name: 'Saver', desc: 'Set a savings target', hint: 'Set a monthly savings target > 0', icon: PiggyBank },
  { key: 'explorer', name: 'Explorer', desc: 'Try What If mode', hint: 'Tap What If on My Money', icon: Compass },
  { key: 'on-track', name: 'On Track', desc: 'Finish a month on track', hint: 'Stay on budget for a full month', icon: TrendingUp },
  { key: 'goal-getter', name: 'Goal Getter', desc: 'Fully fund a goal', hint: 'Save until a goal reaches 100%', icon: Trophy },
  { key: 'time-traveler', name: 'Time Traveler', desc: 'Use the 5 Year zoom', hint: 'Try the 5 Year time view', icon: Clock },
];

// --- Settings data ---
const settingsRows = [
  { key: 'budget', label: 'Budget Settings', icon: Settings },
  { key: 'reminders', label: 'Reminders', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'export', label: 'Export Data', icon: Download },
  { key: 'privacy', label: 'Privacy', icon: Shield },
  { key: 'about', label: 'About Johnny F. Banks', icon: Info },
];

// ======= Main Component =======
export function ProfileScreen() {
  const { goals, setActiveTab } = useApp();
  const { config, transactions, paceStatus, flexSpent } = useBudget();
  const { toast } = useToast();

  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // localStorage flags
  const hasCompletedAssessment = localStorage.getItem('jfb_hasCompletedAssessment') === 'true';
  const hasUsedWhatIf = localStorage.getItem('jfb_hasUsedWhatIf') === 'true';
  const hasUsed5YearZoom = localStorage.getItem('jfb_hasUsed5YearZoom') === 'true';
  const hasCompletedMonth = localStorage.getItem('jfb_hasCompletedMonth') === 'true';
  const userName = localStorage.getItem('jfb_userName') || 'Bogdan';

  // Score
  const score = useMemo(() => calculateHealthScore(
    config, paceStatus, flexSpent,
    goals.map(g => ({ target: g.target, saved: g.saved })),
    hasCompletedAssessment, hasUsedWhatIf,
  ), [config, paceStatus, flexSpent, goals, hasCompletedAssessment, hasUsedWhatIf]);

  const animatedScore = useCountUp(score.total);

  // Module progress
  const moduleProgress = useMemo(() => {
    const budgetProg = !config.setupComplete ? 0 : flexSpent > 0 ? 50 : 25;
    const goalProg = goals.length === 0 ? 0 : Math.round(goals.reduce((s, g) => s + (g.target > 0 ? Math.min(g.saved / g.target, 1) : 0), 0) / goals.length * 100);
    const simProg = hasUsedWhatIf ? 100 : 0;
    return {
      clarity: hasCompletedAssessment ? 100 : 0,
      budget: budgetProg,
      goals: goalProg,
      simulate: simProg,
      learn: 0,
      banking: 0,
    } as Record<string, number>;
  }, [config.setupComplete, flexSpent, goals, hasCompletedAssessment, hasUsedWhatIf]);

  // Achievement unlock checks
  const achievements = useMemo(() => ({
    'first-step': config.setupComplete,
    'tracker': transactions.length >= 10,
    'dreamer': goals.length >= 1,
    'saver': config.monthlySavingsTarget > 0,
    'explorer': hasUsedWhatIf,
    'on-track': hasCompletedMonth,
    'goal-getter': goals.some(g => g.saved >= g.target && g.target > 0),
    'time-traveler': hasUsed5YearZoom,
  }), [config, transactions.length, goals, hasUsedWhatIf, hasCompletedMonth, hasUsed5YearZoom]);

  const handleModuleTap = (key: string) => {
    if (key === 'learn' || key === 'banking') {
      toast({ title: key === 'learn' ? 'Financial lessons coming soon!' : 'Banking integration coming soon!' });
      return;
    }
    if (key === 'budget' || key === 'goals') { setActiveTab(1); return; }
    if (key === 'simulate') { setActiveTab(1); return; }
    if (key === 'clarity') {
      toast({ title: 'Financial Clarity Assessment coming soon', description: 'This will analyze your financial health across spending, saving, and planning.' });
    }
  };

  const handleSettingsTap = (key: string) => {
    if (key === 'budget') { setEditBudgetOpen(true); return; }
    if (key === 'privacy') { toast({ title: 'Your data is stored locally on this device only' }); return; }
    if (key === 'about') { setAboutOpen(true); return; }
    toast({ title: 'Coming soon' });
  };

  const handleAchievementTap = (a: typeof achievementsDef[0]) => {
    const unlocked = achievements[a.key as keyof typeof achievements];
    toast({ title: unlocked ? a.name : 'Keep going!', description: unlocked ? a.desc : a.hint });
  };

  // SVG ring values
  const ringR = 58;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - score.total / 100);

  // Pillar data for score breakdown
  const pillars = [
    { name: 'Awareness', icon: Brain, score: score.awareness },
    { name: 'Budget Health', icon: LayoutGrid, score: score.budgetHealth },
    { name: 'Goal Progress', icon: Target, score: score.goalProgress },
    { name: 'Future Planning', icon: Sparkles, score: score.futurePlanning },
  ];

  return (
    <div className="h-full overflow-auto pb-0">
      <div className="px-5 pt-12 pb-2 space-y-6">

        {/* ===== 1. AVATAR HERO ===== */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-[130px] h-[130px] flex items-center justify-center">
            {/* Level Ring SVG */}
            <svg width="130" height="130" className="absolute inset-0" style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.3))' }}>
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#FF6B9D" />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r={ringR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle
                cx="65" cy="65" r={ringR} fill="none"
                stroke="url(#ring-grad)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={ringC} strokeDashoffset={ringOffset}
                transform="rotate(-90 65 65)"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            {/* Avatar */}
            <img
              src={avatarImg} alt="Avatar"
              className="w-[100px] h-[100px] rounded-full object-cover"
              style={{ animation: 'avatar-bob 2s ease-in-out infinite' }}
            />
          </div>

          <span className="text-[20px] font-bold text-white">{userName}</span>
          <span className="text-[13px] text-white/50">{getLevelTitle(score.total)}</span>

          {/* Score pill */}
          <div className="glass-light rounded-full px-5 h-9 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-[#FFD700]" fill="#FFD700" />
            <span className="text-sm font-bold text-white">Score: {animatedScore}/100</span>
          </div>
        </div>

        {/* ===== 2. MODULE MAP ===== */}
        <div className="relative">
          <h3 className="text-sm font-semibold text-white/60 mb-3">Module Map</h3>
          {/* Constellation SVG lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {/* Horizontal connections row 1 */}
            <line x1="18%" y1="38%" x2="50%" y2="38%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4"
              style={{ animation: moduleProgress.clarity > 0 && moduleProgress.clarity < 100 ? 'line-pulse 3s ease-in-out infinite' : undefined,
                       stroke: moduleProgress.clarity >= 100 ? 'rgba(255,255,255,0.15)' : undefined,
                       strokeDasharray: moduleProgress.clarity >= 100 ? 'none' : '4 4' }} />
            <line x1="50%" y1="38%" x2="82%" y2="38%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4"
              style={{ stroke: moduleProgress.budget >= 100 ? 'rgba(255,255,255,0.15)' : undefined,
                       strokeDasharray: moduleProgress.budget >= 100 ? 'none' : '4 4' }} />
            {/* Vertical connections */}
            <line x1="18%" y1="52%" x2="18%" y2="68%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="52%" x2="50%" y2="68%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="82%" y1="52%" x2="82%" y2="68%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            {modulesDef.map((mod, i) => {
              const progress = moduleProgress[mod.key] || 0;
              const isLocked = !!mod.locked;
              const isComplete = progress >= 100;
              const Icon = mod.icon;
              return (
                <motion.button
                  key={mod.key}
                  onClick={() => handleModuleTap(mod.key)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="flex flex-col items-center gap-1.5 rounded-[20px] py-4 px-2 border"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    borderColor: isComplete ? mod.glow.replace('0.15', '0.4') : 'rgba(255,255,255,0.1)',
                    boxShadow: isComplete ? `0 0 12px ${mod.glow}` : 'none',
                    opacity: isLocked ? 0.6 : 1,
                  }}
                >
                  <div className="relative">
                    <Icon className="w-7 h-7" style={{ color: isComplete ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
                    {isLocked && <Lock className="w-3 h-3 text-white/20 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-[12px] text-white/60 text-center leading-tight">{mod.name}</span>
                  {/* Progress bar */}
                  <div className="w-[60px] h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px]" style={{
                    color: isLocked ? 'rgba(255,255,255,0.15)' : isComplete ? 'rgba(34,197,94,0.5)' : progress > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)',
                  }}>
                    {isLocked ? 'Soon' : isComplete ? 'Done' : progress > 0 ? `${progress}%` : 'Start'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ===== 3. SCORE BREAKDOWN ===== */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
          <h3 className="text-sm font-semibold text-white">Financial Health</h3>
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-white/40 shrink-0" strokeWidth={1.5} />
                <span className="text-[13px] text-white/60 w-[100px] shrink-0">{p.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.score / 25) * 100}%` }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                  />
                </div>
                <span className="text-[13px] text-white/40 w-10 text-right shrink-0">{p.score}/25</span>
              </div>
            );
          })}
        </div>

        {/* ===== 4. ACHIEVEMENTS ===== */}
        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Achievements</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {achievementsDef.map((a, i) => {
              const unlocked = achievements[a.key as keyof typeof achievements];
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.key}
                  onClick={() => handleAchievementTap(a)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative"
                  style={{
                    background: unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: unlocked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)' }} strokeWidth={1.5} />
                  {!unlocked && <Lock className="w-2.5 h-2.5 text-white/20 absolute bottom-1 right-1" />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ===== 5. SETTINGS ===== */}
        <div className="space-y-2">
          {settingsRows.map(row => {
            const Icon = row.icon;
            return (
              <button
                key={row.key}
                onClick={() => handleSettingsTap(row.key)}
                className="w-full h-12 rounded-2xl flex items-center gap-3 px-4"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
              >
                <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
                <span className="flex-1 text-left text-sm text-white">{row.label}</span>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </button>
            );
          })}
        </div>

        {/* ===== 6. BOTTOM SPACER ===== */}
        <div className="h-16" />
      </div>

      {/* Sheets */}
      <EditBudgetSheet open={editBudgetOpen} onClose={() => setEditBudgetOpen(false)} />
      <Sheet open={aboutOpen} onOpenChange={setAboutOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-transparent p-0">
          <div className="jfb-bg rounded-t-3xl p-6 space-y-3">
            <SheetHeader>
              <SheetTitle className="text-white text-lg">Johnny F. Banks</SheetTitle>
              <SheetDescription className="text-white/50">Your personal finance companion</SheetDescription>
            </SheetHeader>
            <p className="text-sm text-white/60">Version 1.0 — Built with love to help you take control of your money through gamification and visual budgeting.</p>
            <p className="text-sm text-white/40">All data stays on your device. No accounts, no tracking, no ads.</p>
          </div>
        </SheetContent>
      </Sheet>

      <style>{`
        @keyframes avatar-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes line-pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
