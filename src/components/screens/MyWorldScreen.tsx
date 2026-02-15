import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Info, HelpCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import avatarImg from '@/assets/avatar.png';

// Sky imports
import sky1 from '@/assets/world/sky1_sunny.png';
import sky2 from '@/assets/world/sky2_sunset.png';
import sky3 from '@/assets/world/sky3_overcast.png';

// Ground imports
import ground1 from '@/assets/world/ground1_healthy.png';
import ground2 from '@/assets/world/ground2_average.png';
import ground3 from '@/assets/world/ground3_struggling.png';

// Weather imports
import weather1 from '@/assets/world/weather1_sunny.png';
import weather2 from '@/assets/world/weather2_cloudy.png';
import weather3 from '@/assets/world/weather3_rain.png';

// Goal assets
import car1Img from '@/assets/world/car1.png';
import car2Img from '@/assets/world/car2.png';
import car3Img from '@/assets/world/car3.png';
import car4Img from '@/assets/world/car4.png';
import vacation1Img from '@/assets/world/vacation1.png';
import vacation2Img from '@/assets/world/vacation2.png';
import vacation3Img from '@/assets/world/vacation3.png';
import vacation4Img from '@/assets/world/vacation4.png';
import education2Img from '@/assets/world/education2.png';
import education3Img from '@/assets/world/education3.png';
import education4Img from '@/assets/world/education4.png';
import generalGoal1 from '@/assets/world/general_goal_icon1.png';
import generalGoal2 from '@/assets/world/general_goal_icon2.png';

const SKY_MAP: Record<string, string> = { sky1_sunny: sky1, sky2_sunset: sky2, sky3_overcast: sky3 };
const GROUND_MAP: Record<string, string> = { ground1_healthy: ground1, ground2_average: ground2, ground3_struggling: ground3 };
const WEATHER_MAP: Record<string, string> = { weather1_sunny: weather1, weather2_cloudy: weather2, weather3_rain: weather3 };

const GOAL_ASSETS: Record<string, string> = {
  car1: car1Img, car2: car2Img, car3: car3Img, car4: car4Img,
  vacation1: vacation1Img, vacation2: vacation2Img, vacation3: vacation3Img, vacation4: vacation4Img,
  education2: education2Img, education3: education3Img, education4: education4Img,
};

const POSITIONS = [
  { x: '50%', y: '18%', size: 90 },
  { x: '20%', y: '25%', size: 80 },
  { x: '75%', y: '22%', size: 80 },
  { x: '35%', y: '38%', size: 75 },
  { x: '65%', y: '35%', size: 75 },
  { x: '15%', y: '45%', size: 70 },
  { x: '80%', y: '42%', size: 70 },
];

function getAssetPrefix(goal: any): string {
  const name = (goal.name || '').toLowerCase();
  const icon = goal.icon || '';
  if (name.includes('house') || name.includes('home') || name.includes('apartment') || icon === 'Home') return 'house';
  if (name.includes('car') || name.includes('vehicle') || icon === 'Car') return 'car';
  if (name.includes('vacation') || name.includes('travel') || name.includes('trip') || icon === 'Plane') return 'vacation';
  if (name.includes('laptop') || name.includes('computer') || name.includes('tech') || icon === 'Laptop') return 'laptop';
  if (name.includes('bike') || name.includes('bicycle') || icon === 'Bike') return 'bike';
  if (name.includes('emergency') || name.includes('safety') || icon === 'ShieldCheck') return 'shield';
  if (name.includes('education') || name.includes('school') || name.includes('course') || icon === 'GraduationCap') return 'education';
  if (name.includes('invest') || name.includes('grow') || icon === 'TrendingUp' || icon === 'LineChart') return 'investment';
  return 'target';
}

function getProgressNumber(goal: any): number {
  const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
  if (pct >= 75) return 4;
  if (pct >= 50) return 3;
  if (pct >= 25) return 2;
  return 1;
}

function getGoalImage(goal: any): string {
  const prefix = getAssetPrefix(goal);
  const num = getProgressNumber(goal);
  const key = `${prefix}${num}`;
  if (GOAL_ASSETS[key]) return GOAL_ASSETS[key];
  // Fallback: alternate between the two general icons
  return num % 2 === 0 ? generalGoal2 : generalGoal1;
}

function getDreamImage(goal: any): string {
  const prefix = getAssetPrefix(goal);
  const key = `${prefix}4`;
  if (GOAL_ASSETS[key]) return GOAL_ASSETS[key];
  return generalGoal2;
}

type Goal = { name: string; icon: string; savedAmount: number; targetAmount: number; monthlyContribution: number };

interface Props {
  onClose: () => void;
}

export function MyWorldScreen({ onClose }: Props) {
  const { setActiveTab } = useApp();
  const { toast } = useToast();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [dreamGoalIdx, setDreamGoalIdx] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dreamTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read data from localStorage
  const clarityScore = useMemo(() => {
    try { const c = JSON.parse(localStorage.getItem('jfb_clarityScore') || '{}'); return c.total || 0; } catch { return 0; }
  }, []);

  const goals: Goal[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_goals') || '[]'); } catch { return []; }
  }, []);

  // Sky / Ground
  const skyKey = clarityScore > 60 ? 'sky1_sunny' : clarityScore > 30 ? 'sky2_sunset' : clarityScore === 0 ? 'sky2_sunset' : 'sky3_overcast';
  const groundKey = clarityScore > 60 ? 'ground1_healthy' : clarityScore > 30 ? 'ground2_average' : clarityScore === 0 ? 'ground2_average' : 'ground3_struggling';

  // Weather from budget pace
  const weatherKey = useMemo(() => {
    try {
      const bd = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
      const cfg = bd.config || {};
      const txns = bd.transactions || [];
      const cats = bd.categories || [];
      const income = Number(cfg.monthlyIncome) || 0;
      const totalFixed = cats.filter((c: any) => c.type === 'fixed').reduce((s: number, c: any) => s + (Number(c.monthlyBudget) || 0), 0);
      const savings = Number(cfg.monthlySavingsTarget) || 0;
      const flexBudget = income - totalFixed - savings;
      if (flexBudget <= 0) return 'weather1_sunny';
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const percentMonth = (dayOfMonth / daysInMonth) * 100;
      const totalSpent = txns
        .filter((t: any) => {
          if (t.type !== 'expense') return false;
          const d = new Date(t.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
      const percentSpent = (totalSpent / flexBudget) * 100;
      if (percentSpent <= percentMonth + 5) return 'weather1_sunny';
      if (percentSpent <= percentMonth + 15) return 'weather2_cloudy';
      return 'weather3_rain';
    } catch { return 'weather1_sunny'; }
  }, []);

  const sorted = useMemo(() => [...goals].sort((a, b) => b.targetAmount - a.targetAmount), [goals]);

  // Long press handlers
  const handlePointerDown = useCallback((idx: number) => {
    longPressTimer.current = setTimeout(() => {
      setDreamGoalIdx(idx);
      dreamTimer.current = setTimeout(() => setDreamGoalIdx(null), 2000);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (dreamTimer.current) clearTimeout(dreamTimer.current);
    };
  }, []);

  const showClouds = weatherKey === 'weather2_cloudy' || weatherKey === 'weather3_rain';

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sky */}
      <motion.img
        src={SKY_MAP[skyKey]} alt="sky"
        className="absolute inset-0 w-full object-cover"
        style={{ height: '80%', imageRendering: 'pixelated' as any }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      />

      {/* Ground */}
      <motion.img
        src={GROUND_MAP[groundKey]} alt="ground"
        className="absolute bottom-0 w-full object-cover"
        style={{ height: '22%', imageRendering: 'pixelated' as any }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}
      />

      {/* Weather overlay */}
      <div className="absolute inset-0" style={{ height: '80%', overflow: 'hidden', pointerEvents: 'none' }}>
        <img src={WEATHER_MAP[weatherKey]} alt="weather" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.5, imageRendering: 'pixelated' as any }} />
        {showClouds && (
          <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
            <img src={WEATHER_MAP[weatherKey]} alt="clouds" className="absolute h-full object-cover"
              style={{ width: '200%', imageRendering: 'pixelated' as any, opacity: 0.3, animation: 'cloud-drift 30s linear infinite' }} />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-30">
        <button onClick={onClose} className="flex items-center gap-2">
          <ArrowLeft className="w-6 h-6 text-white/50" />
          <span className="text-lg font-bold text-white">My World</span>
        </button>
        <button
          onClick={() => toast({ title: 'Your Financial World', description: 'Objects materialize as you save toward goals. Sky and ground reflect your financial health.' })}
          className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
        >
          <Info className="w-3.5 h-3.5 text-white/25" />
          <span className="text-[10px] text-white/20">About</span>
        </button>
      </div>

      {/* Goal objects */}
      {sorted.length > 0 ? (
        sorted.slice(0, 7).map((goal, i) => {
          const pos = POSITIONS[i];
          const isDreaming = dreamGoalIdx === i;
          const img = isDreaming ? getDreamImage(goal) : getGoalImage(goal);
          const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
          const isFullyFunded = pct >= 100;

          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: pos.x, top: pos.y,
                transform: 'translateX(-50%)',
                zIndex: Math.round(parseFloat(pos.y)),
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div
                className="relative cursor-pointer"
                style={{ animation: `goal-bob 2.5s ease-in-out ${i * 0.4}s infinite` }}
                onClick={() => { handlePointerUp(); setSelectedGoal(goal); }}
                onPointerDown={() => handlePointerDown(i)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <img
                  src={img} alt={goal.name}
                  style={{
                    width: pos.size, height: pos.size,
                    objectFit: 'contain',
                    imageRendering: 'pixelated' as any,
                    transition: 'opacity 0.5s ease',
                  }}
                />
                {/* Sparkles on fully funded */}
                {isFullyFunded && (
                  <div className="absolute inset-0">
                    {[0, 1, 2].map(s => (
                      <div key={s} className="absolute rounded-full bg-white"
                        style={{
                          width: 3, height: 3,
                          top: `${15 + s * 25}%`, left: `${20 + s * 25}%`,
                          animation: `sparkle-dot 1.5s ease-in-out ${s * 0.5}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })
      ) : (
        /* Empty state */
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center z-10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          <div className="flex gap-8 mb-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="text-2xl text-white/15" style={{ animation: `goal-bob 2s ease-in-out ${i * 0.4}s infinite` }}>?</div>
            ))}
          </div>
          <p className="text-base text-white/25 font-medium mb-1">Your world is empty!</p>
          <p className="text-[13px] text-white/15 mb-4 text-center px-8">Add goals in My Money to watch them come to life</p>
          <button
            onClick={() => { onClose(); setTimeout(() => setActiveTab(1), 100); }}
            className="rounded-full px-5 py-2 text-sm font-medium text-white"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
          >
            Go to My Money
          </button>
        </motion.div>
      )}

      {/* Avatar */}
      <motion.img
        src={avatarImg} alt="Avatar"
        className="absolute left-1/2"
        style={{
          width: 120, height: 120,
          bottom: '12%',
          transform: 'translateX(-50%)',
          objectFit: 'contain',
          imageRendering: 'pixelated' as any,
          zIndex: 20,
          animation: 'avatar-bob 2s ease-in-out infinite',
        }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
      />

      {/* Goal detail sheet */}
      <AnimatePresence>
        {selectedGoal && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedGoal(null)} />
            <motion.div
              className="relative w-full rounded-t-3xl p-6 pb-8"
              style={{ background: 'rgba(30,20,40,0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex flex-col items-center gap-3">
                <h3 className="text-lg font-bold text-white">{selectedGoal.name}</h3>
                <img
                  src={getGoalImage(selectedGoal)} alt={selectedGoal.name}
                  style={{ width: 80, height: 80, objectFit: 'contain', imageRendering: 'pixelated' as any }}
                />
                <div className="w-full max-w-[280px]">
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, selectedGoal.targetAmount > 0 ? (selectedGoal.savedAmount / selectedGoal.targetAmount) * 100 : 0)}%`,
                      background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                    }} />
                  </div>
                </div>
                <p className="text-sm text-white">
                  €{selectedGoal.savedAmount.toLocaleString()} / €{selectedGoal.targetAmount.toLocaleString()}
                </p>
                <p className="text-[13px] text-white/40">
                  {selectedGoal.targetAmount > 0 ? Math.round((selectedGoal.savedAmount / selectedGoal.targetAmount) * 100) : 0}% funded
                </p>
                {selectedGoal.monthlyContribution > 0 && (
                  <>
                    <p className="text-xs text-white/30">€{selectedGoal.monthlyContribution}/month</p>
                    <p className="text-xs text-white/30">
                      At this rate: {Math.ceil((selectedGoal.targetAmount - selectedGoal.savedAmount) / selectedGoal.monthlyContribution)} months to go
                    </p>
                  </>
                )}
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="mt-2 rounded-full px-6 py-2 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS animations */}
      <style>{`
        @keyframes cloud-drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes goal-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes sparkle-dot {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
