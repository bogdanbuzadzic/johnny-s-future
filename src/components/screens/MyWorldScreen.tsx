import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import avatarImg from '@/assets/avatar.png';

// Goal assets - only the ones we need
import car2Img from '@/assets/world/car2.png';
import vacation2Img from '@/assets/world/vacation2.png';
import laptop3Img from '@/assets/world/laptop3.png';
import house3Img from '@/assets/world/house3.png';
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

const POSITIONS = [
  { x: '20%', bottom: '18%', size: 75 },
  { x: '40%', bottom: '18%', size: 80 },
  { x: '60%', bottom: '18%', size: 80 },
  { x: '80%', bottom: '18%', size: 75 },
];

function getGoalImage(goal: any): string {
  const name = (goal.name || '').toLowerCase();
  const icon = goal.icon || '';
  if (name.includes('house') || name.includes('home') || icon === 'Home') return house3Img;
  if (name.includes('car') || name.includes('vehicle') || icon === 'Car') return car2Img;
  if (name.includes('vacation') || name.includes('travel') || name.includes('trip') || icon === 'Plane') return vacation2Img;
  if (name.includes('laptop') || name.includes('computer') || name.includes('tech') || icon === 'Laptop') return laptop3Img;
  // Fallback
  return Math.random() > 0.5 ? generalGoal1 : generalGoal2;
}

// Cache fallback images per goal name so they don't flicker
const fallbackCache = new Map<string, string>();
function getGoalImageStable(goal: any): string {
  const name = (goal.name || '').toLowerCase();
  const icon = goal.icon || '';
  if (name.includes('house') || name.includes('home') || icon === 'Home') return house3Img;
  if (name.includes('car') || name.includes('vehicle') || icon === 'Car') return car2Img;
  if (name.includes('vacation') || name.includes('travel') || name.includes('trip') || icon === 'Plane') return vacation2Img;
  if (name.includes('laptop') || name.includes('computer') || name.includes('tech') || icon === 'Laptop') return laptop3Img;
  const key = goal.name || goal.id || '';
  if (!fallbackCache.has(key)) {
    fallbackCache.set(key, Math.random() > 0.5 ? generalGoal1 : generalGoal2);
  }
  return fallbackCache.get(key)!;
}

type Goal = { name: string; icon: string; saved: number; target: number; monthlyContribution: number };

interface Props {
  onClose: () => void;
}

export function MyWorldScreen({ onClose }: Props) {
  const { setActiveTab } = useApp();
  const { toast } = useToast();
  const [hoverGoalIdx, setHoverGoalIdx] = useState<number | null>(null);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clarityScore = useMemo(() => {
    try { const c = JSON.parse(localStorage.getItem('jfb_clarityScore') || '{}'); return c.total || 0; } catch { return 0; }
  }, []);

  const goals: Goal[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_goals') || '[]'); } catch { return []; }
  }, []);

  const healthTier = clarityScore > 60 ? 'healthy' : clarityScore > 30 ? 'average' : clarityScore === 0 ? 'average' : 'struggling';

  const sorted = useMemo(() => [...goals].sort((a, b) => b.target - a.target), [goals]);

  useEffect(() => {
    return () => { if (touchTimer.current) clearTimeout(touchTimer.current); };
  }, []);

  const handleTouchStart = useCallback((idx: number) => {
    setHoverGoalIdx(idx);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setHoverGoalIdx(null), 3000);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sky */}
      <div className="absolute inset-0" style={{ height: '75%', background: SKY_GRADIENTS[healthTier] }} />

      {/* Clouds */}
      <div className="absolute inset-0 pointer-events-none" style={{ height: '75%' }}>
        <div className="absolute rounded-full" style={{ width: 120, height: 40, top: '10%', left: '15%', background: 'rgba(255,255,255,0.4)', filter: 'blur(8px)', animation: 'cloud-drift-soft 60s linear infinite' }} />
        <div className="absolute rounded-full" style={{ width: 80, height: 30, top: '18%', right: '20%', background: 'rgba(255,255,255,0.3)', filter: 'blur(10px)', animation: 'cloud-drift-soft 45s linear infinite reverse' }} />
        <div className="absolute rounded-full" style={{ width: 100, height: 35, top: '8%', right: '40%', background: 'rgba(255,255,255,0.35)', filter: 'blur(9px)', animation: 'cloud-drift-soft 55s linear infinite' }} />
      </div>

      {/* Ground */}
      <motion.div
        className="absolute bottom-0 w-full"
        style={{ height: '25%', background: GROUND_GRADIENTS[healthTier] }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}
      >
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
        sorted.slice(0, 4).map((goal, i) => {
          const pos = POSITIONS[i];
          const img = getGoalImageStable(goal);
          const pct = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
          const isFullyFunded = pct >= 100;
          const isHovered = hoverGoalIdx === i;

          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: pos.x, bottom: pos.bottom,
                transform: 'translateX(-50%)',
                zIndex: isHovered ? 25 : 10 + i,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div
                className="relative cursor-pointer"
                style={{ animation: `goal-bob 2.5s ease-in-out ${i * 0.4}s infinite` }}
                onMouseEnter={() => setHoverGoalIdx(i)}
                onMouseLeave={() => setHoverGoalIdx(null)}
                onTouchStart={() => handleTouchStart(i)}
              >
                <img
                  src={img} alt={goal.name}
                  style={{
                    width: pos.size, height: pos.size,
                    objectFit: 'contain',
                    imageRendering: 'pixelated' as any,
                  }}
                />
                {/* Goal name below */}
                <p className="text-center mt-0.5" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {goal.name}
                </p>
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

                {/* Floating progress tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute pointer-events-none"
                      style={{
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: 8,
                        width: 180,
                      }}
                    >
                      <div className="rounded-xl p-3" style={{
                        background: 'rgba(20,15,30,0.90)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        <p className="text-[13px] font-bold text-white text-center mb-1">{goal.name}</p>
                        <p className="text-[11px] text-white/60 text-center mb-2">
                          €{goal.saved.toLocaleString()} / €{goal.target.toLocaleString()}
                        </p>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                          <div style={{
                            width: `${Math.min(pct, 100)}%`,
                            height: '100%', borderRadius: 3,
                            background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                          }} />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-white/40">{Math.round(pct)}% funded</span>
                          {goal.monthlyContribution > 0 && (
                            <span className="text-[10px] text-white/40">€{goal.monthlyContribution}/mo</span>
                          )}
                        </div>
                      </div>
                      {/* Triangle pointer */}
                      <div className="flex justify-center">
                        <div style={{
                          width: 0, height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid rgba(20,15,30,0.90)',
                        }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })
      ) : (
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
