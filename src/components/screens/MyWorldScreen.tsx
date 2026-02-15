import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import avatarImg from '@/assets/avatar.png';

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
import education1Img from '@/assets/world/education1.png';
import laptop1Img from '@/assets/world/laptop1.png';
import laptop2Img from '@/assets/world/laptop2.png';
import laptop3Img from '@/assets/world/laptop3.png';
import laptop4Img from '@/assets/world/laptop4.png';
import house1Img from '@/assets/world/house1.png';
import house2Img from '@/assets/world/house2.png';
import house3Img from '@/assets/world/house3.png';
import house4Img from '@/assets/world/house4.png';
import generalGoal1 from '@/assets/world/general_goal_icon1.png';
import generalGoal2 from '@/assets/world/general_goal_icon2.png';

const SKY_GRADIENTS: Record<string, string> = {
  healthy: 'linear-gradient(180deg, #87CEEB 0%, #B0E0FF 40%, #E0F0FF 100%)',
  average: 'linear-gradient(180deg, #C8A2C8 0%, #DEB8D0 40%, #F0D0E0 100%)',
  struggling: 'linear-gradient(180deg, #8E7BA4 0%, #A090B0 40%, #C0B0C8 100%)',
};

const GROUND_GRADIENTS: Record<string, string> = {
  healthy: 'linear-gradient(180deg, #5B8C3E 0%, #4A7A32 50%, #3D6B28 100%)',
  average: 'linear-gradient(180deg, #7A9A5A 0%, #6A8A4A 50%, #5A7A3A 100%)',
  struggling: 'linear-gradient(180deg, #9A8A5A 0%, #8A7A4A 50%, #7A6A3A 100%)',
};

const GROUND_EDGE: Record<string, string> = {
  healthy: '#5B8C3E',
  average: '#7A9A5A',
  struggling: '#9A8A5A',
};

const GOAL_ASSETS: Record<string, string> = {
  car1: car1Img, car2: car2Img, car3: car3Img, car4: car4Img,
  vacation1: vacation1Img, vacation2: vacation2Img, vacation3: vacation3Img, vacation4: vacation4Img,
  education1: education1Img, education2: education2Img, education3: education3Img, education4: education4Img,
  laptop1: laptop1Img, laptop2: laptop2Img, laptop3: laptop3Img, laptop4: laptop4Img,
  house1: house1Img, house2: house2Img, house3: house3Img, house4: house4Img,
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

  // Health tier
  const healthTier = clarityScore > 60 ? 'healthy' : clarityScore > 30 ? 'average' : clarityScore === 0 ? 'average' : 'struggling';

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

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sky - CSS gradient */}
      <div
        className="absolute inset-0"
        style={{ height: '75%', background: SKY_GRADIENTS[healthTier] }}
      />

      {/* Optional soft clouds */}
      <div className="absolute inset-0 pointer-events-none" style={{ height: '75%' }}>
        <div className="absolute rounded-full" style={{ width: 120, height: 40, top: '10%', left: '15%', background: 'rgba(255,255,255,0.4)', filter: 'blur(8px)', animation: 'cloud-drift-soft 60s linear infinite' }} />
        <div className="absolute rounded-full" style={{ width: 80, height: 30, top: '18%', right: '20%', background: 'rgba(255,255,255,0.3)', filter: 'blur(10px)', animation: 'cloud-drift-soft 45s linear infinite reverse' }} />
        <div className="absolute rounded-full" style={{ width: 100, height: 35, top: '8%', right: '40%', background: 'rgba(255,255,255,0.35)', filter: 'blur(9px)', animation: 'cloud-drift-soft 55s linear infinite' }} />
      </div>

      {/* Ground - CSS gradient */}
      <motion.div
        className="absolute bottom-0 w-full"
        style={{ height: '25%', background: GROUND_GRADIENTS[healthTier] }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}
      >
        {/* Soft grass edge */}
        <div className="absolute left-0 right-0" style={{ top: -4, height: 8, background: `linear-gradient(180deg, transparent, ${GROUND_EDGE[healthTier]})` }} />
      </motion.div>

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
        @keyframes cloud-drift-soft {
          0% { transform: translateX(0); }
          100% { transform: translateX(30px); }
        }
        @keyframes goal-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes sparkle-dot {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes avatar-bob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </motion.div>
  );
}
