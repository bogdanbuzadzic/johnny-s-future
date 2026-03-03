import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JohnnyMessage, JohnnyPrimaryBtn, JohnnySecondaryBtn } from '@/components/ui/JohnnyMessage';
import { ArrowLeft, Info, Play, Pause, Zap, Clock, Minus, Plus, Check, Star, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import avatarImg from '@/assets/avatar.png';
import { AddGoalSheet } from '@/components/sheets/AddGoalSheet';

// Goal assets — 4 stages each
import car1Img from '@/assets/world/car1.png';
import car2Img from '@/assets/world/car2.png';
import car3Img from '@/assets/world/car3.png';
import car4Img from '@/assets/world/car4.png';
import vacation1Img from '@/assets/world/vacation1.png';
import vacation2Img from '@/assets/world/vacation2.png';
import vacation3Img from '@/assets/world/vacation3.png';
import vacation4Img from '@/assets/world/vacation4.png';
import laptop1Img from '@/assets/world/laptop1.png';
import laptop2Img from '@/assets/world/laptop2.png';
import laptop3Img from '@/assets/world/laptop3.png';
import laptop4Img from '@/assets/world/laptop4.png';
import house1Img from '@/assets/world/house1.png';
import house2Img from '@/assets/world/house2.png';
import house3Img from '@/assets/world/house3.png';
import house4Img from '@/assets/world/house4.png';
import education1Img from '@/assets/world/education1.png';
import education2Img from '@/assets/world/education2.png';
import education3Img from '@/assets/world/education3.png';
import education4Img from '@/assets/world/education4.png';
import generalGoal1 from '@/assets/world/general_goal_icon1.png';
import generalGoal2 from '@/assets/world/general_goal_icon2.png';

// ── Stage mappings ──
const stageImages: Record<string, string[]> = {
  house: [house1Img, house2Img, house3Img, house4Img],
  car: [car1Img, car2Img, car3Img, car4Img],
  vacation: [vacation1Img, vacation2Img, vacation3Img, vacation4Img],
  laptop: [laptop1Img, laptop2Img, laptop3Img, laptop4Img],
  education: [education1Img, education2Img, education3Img, education4Img],
};

function getGoalCategory(goal: GoalType): string {
  const name = (goal.name || '').toLowerCase();
  const icon = goal.icon || '';
  if (name.includes('house') || name.includes('home') || icon === 'Home') return 'house';
  if (name.includes('car') || name.includes('vehicle') || icon === 'Car') return 'car';
  if (name.includes('vacation') || name.includes('travel') || name.includes('trip') || icon === 'Plane') return 'vacation';
  if (name.includes('laptop') || name.includes('computer') || name.includes('tech') || icon === 'Laptop') return 'laptop';
  if (name.includes('education') || name.includes('study') || name.includes('degree') || icon === 'GraduationCap') return 'education';
  return 'generic';
}

function getProgressStage(fillPct: number): number {
  if (fillPct >= 76) return 3;
  if (fillPct >= 51) return 2;
  if (fillPct >= 26) return 1;
  return 0;
}

const fallbackCache = new Map<string, string>();
function getGoalImage(goal: GoalType, fillPct: number): string {
  const category = getGoalCategory(goal);
  const stage = getProgressStage(fillPct);
  if (category !== 'generic' && stageImages[category]) {
    return stageImages[category][stage];
  }
  // Generic fallback
  const key = goal.name || goal.id || '';
  if (!fallbackCache.has(key)) fallbackCache.set(key, Math.random() > 0.5 ? generalGoal1 : generalGoal2);
  return fallbackCache.get(key)!;
}

// ── Constants ──
const SKY_GRADIENTS: Record<string, string> = {
  healthy: 'linear-gradient(180deg, #87CEEB 0%, #B0E0FF 40%, #E0F0FF 100%)',
  average: 'linear-gradient(180deg, #C8A2C8 0%, #DEB8D0 40%, #F0D0E0 100%)',
  struggling: 'linear-gradient(180deg, #8E7BA4 0%, #A090B0 40%, #C0B0C8 100%)',
};
const SKY_BRIGHT = 'linear-gradient(180deg, #5BB8F5 0%, #87CEEB 40%, #D0EFFF 100%)';

const GROUND_GRADIENTS: Record<string, string> = {
  healthy: 'linear-gradient(180deg, #5B8C3E 0%, #4A7A32 50%, #3D6B28 100%)',
  average: 'linear-gradient(180deg, #7A9A5A 0%, #6A8A4A 50%, #5A7A3A 100%)',
  struggling: 'linear-gradient(180deg, #9A8A5A 0%, #8A7A4A 50%, #7A6A3A 100%)',
};
const GROUND_GREEN = 'linear-gradient(180deg, #4CAF50 0%, #388E3C 50%, #2E7D32 100%)';
const GROUND_EDGE: Record<string, string> = {
  healthy: '#5B8C3E', average: '#7A9A5A', struggling: '#9A8A5A',
};

// Goals positioned LEFT and RIGHT of character, never behind
const POSITIONS = [
  { x: '12%', bottom: '20%', size: 70 },  // far left
  { x: '32%', bottom: '20%', size: 75 },  // left of avatar
  { x: '68%', bottom: '20%', size: 75 },  // right of avatar
  { x: '88%', bottom: '20%', size: 70 },  // far right
];

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#E67E22', Entertainment: '#9B59B6', Shopping: '#E74C3C', Lifestyle: '#1ABC9C',
};

// ── Helpers ──
function getGoalCompletionDate(goal: GoalType): Date | null {
  if (goal.monthlyContribution <= 0) return null;
  const remaining = goal.target - goal.saved;
  if (remaining <= 0) return new Date();
  const months = Math.ceil(remaining / goal.monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

function getProjectedProgress(goal: GoalType, scrubberDate: Date): number {
  const now = new Date();
  const monthsElapsed = (scrubberDate.getFullYear() - now.getFullYear()) * 12
    + (scrubberDate.getMonth() - now.getMonth());
  const projected = goal.saved + (goal.monthlyContribution * Math.max(0, monthsElapsed));
  return Math.min(projected, goal.target);
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

type GoalType = { id?: string; name: string; icon: string; saved: number; target: number; monthlyContribution: number; targetDate?: string };

interface SpendingCategory { name: string; budget: number; redirected: number; }

interface Props { onClose: () => void; }

export function MyWorldScreen({ onClose }: Props) {
  const { setActiveTab } = useApp();
  const { toast } = useToast();
  const trackRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const [thumbPct, setThumbPct] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverGoalIdx, setHoverGoalIdx] = useState<number | null>(null);
  const [showAcceleration, setShowAcceleration] = useState(false);
  const [acceleratingGoalIdx, setAcceleratingGoalIdx] = useState<number | null>(null);
  const [timelineMode, setTimelineMode] = useState<'projected' | 'actual'>('projected');
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [hintShown, setHintShown] = useState(() => localStorage.getItem('jfb_scrubberHintShown') === 'true');
  const [celebratedGoals, setCelebratedGoals] = useState<Set<string>>(new Set());
  const [prevStages, setPrevStages] = useState<Record<string, number>>({});
  const [stageTransitions, setStageTransitions] = useState<Set<string>>(new Set());
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategory[]>([]);
  const [milestoneGoal, setMilestoneGoal] = useState<GoalType | null>(null);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goals: GoalType[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_goals') || '[]'); } catch { return []; }
  }, []);

  const sorted = useMemo(() => [...goals].sort((a, b) => b.target - a.target), [goals]);

  useEffect(() => {
    try {
      const budgetData = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
      const cats = (budgetData.categories || []).filter((c: any) => c.type === 'expense');
      const mapped = cats.map((c: any) => ({ name: c.name, budget: c.monthlyBudget || 0, redirected: 0 }));
      if (mapped.length > 0) setSpendingCategories(mapped);
      else setSpendingCategories([
        { name: 'Food', budget: 400, redirected: 0 },
        { name: 'Entertainment', budget: 200, redirected: 0 },
        { name: 'Shopping', budget: 150, redirected: 0 },
        { name: 'Lifestyle', budget: 100, redirected: 0 },
      ]);
    } catch {
      setSpendingCategories([
        { name: 'Food', budget: 400, redirected: 0 },
        { name: 'Entertainment', budget: 200, redirected: 0 },
        { name: 'Shopping', budget: 150, redirected: 0 },
        { name: 'Lifestyle', budget: 100, redirected: 0 },
      ]);
    }
  }, []);

  const clarityScore = useMemo(() => {
    try { const c = JSON.parse(localStorage.getItem('jfb_clarityScore') || '{}'); return c.total || 0; } catch { return 0; }
  }, []);
  const healthTier = clarityScore > 60 ? 'healthy' : clarityScore > 30 ? 'average' : 'average';

  const today = useMemo(() => new Date(), []);
  const timelineEnd = useMemo(() => {
    const furthest = sorted.reduce((max, g) => {
      const d = getGoalCompletionDate(g);
      return d && d > max ? d : max;
    }, new Date(today.getFullYear() + 1, today.getMonth()));
    const end = new Date(furthest);
    end.setMonth(end.getMonth() + 12);
    return end;
  }, [sorted, today]);

  const totalMonths = useMemo(() =>
    (timelineEnd.getFullYear() - today.getFullYear()) * 12 + (timelineEnd.getMonth() - today.getMonth()),
    [today, timelineEnd]);

  const scrubberDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + Math.round((thumbPct / 100) * totalMonths));
    return d;
  }, [thumbPct, today, totalMonths]);

  const totalRedirected = spendingCategories.reduce((s, c) => s + c.redirected, 0);

  const goalMilestones = useMemo(() => {
    return sorted.map((g, i) => {
      const extraMonthly = acceleratingGoalIdx === i ? totalRedirected : 0;
      const effectiveContrib = g.monthlyContribution + extraMonthly;
      if (effectiveContrib <= 0) return { goal: g, pct: null, date: null, idx: i };
      const remaining = g.target - g.saved;
      if (remaining <= 0) return { goal: g, pct: 0, date: new Date(), idx: i };
      const months = Math.ceil(remaining / effectiveContrib);
      const d = new Date(today);
      d.setMonth(d.getMonth() + months);
      const pct = Math.min((months / totalMonths) * 100, 100);
      return { goal: g, pct, date: d, idx: i };
    });
  }, [sorted, today, totalMonths, acceleratingGoalIdx, totalRedirected]);

  const originalMilestones = useMemo(() => {
    return sorted.map(g => {
      if (g.monthlyContribution <= 0) return null;
      const remaining = g.target - g.saved;
      if (remaining <= 0) return 0;
      return Math.min((Math.ceil(remaining / g.monthlyContribution) / totalMonths) * 100, 100);
    });
  }, [sorted, totalMonths]);

  const completedCount = useMemo(() => {
    return sorted.filter(g => {
      const projected = getProjectedProgress(g, scrubberDate);
      return projected >= g.target;
    }).length;
  }, [sorted, scrubberDate]);

  const allGoalsComplete = sorted.length > 0 && completedCount === sorted.length;
  const halfGoalsComplete = sorted.length > 0 && completedCount >= sorted.length * 0.5;

  const skyGradient = allGoalsComplete ? SKY_BRIGHT : SKY_GRADIENTS[healthTier];
  const groundGradient = halfGoalsComplete ? GROUND_GREEN : GROUND_GRADIENTS[healthTier];
  const groundEdge = halfGoalsComplete ? '#4CAF50' : GROUND_EDGE[healthTier];

  const contextText = useMemo(() => {
    const upcoming = goalMilestones
      .filter(m => m.date && m.date > scrubberDate)
      .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0))[0];
    if (!upcoming) return '🎉 All goals achieved!';
    const monthsAway = Math.ceil(((upcoming.date?.getTime() || 0) - scrubberDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4));
    if (monthsAway <= 1) return `${upcoming.goal.name}: THIS MONTH!`;
    if (monthsAway <= 3) return `${upcoming.goal.name}: ${monthsAway} months away!`;
    const totalContrib = sorted.reduce((s, g) => s + g.monthlyContribution, 0);
    return `Moving €${totalContrib}/month toward goals`;
  }, [goalMilestones, scrubberDate, sorted]);

  const dateLabels = useMemo(() => {
    const labels: { pct: number; text: string }[] = [];
    labels.push({ pct: 0, text: formatMonth(today).replace(' ', ' \'').slice(0, 6) });
    for (let y = today.getFullYear() + 1; y <= timelineEnd.getFullYear(); y++) {
      const monthsFromStart = (y - today.getFullYear()) * 12 - today.getMonth();
      const pct = (monthsFromStart / totalMonths) * 100;
      if (pct > 5 && pct < 95) labels.push({ pct, text: String(y) });
    }
    return labels.slice(0, 7);
  }, [today, timelineEnd, totalMonths]);

  // ── Drag handling ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (!hintShown) { setHintShown(true); localStorage.setItem('jfb_scrubberHintShown', 'true'); }
    if (isPlaying) { setIsPlaying(false); isPlayingRef.current = false; }
  }, [hintShown, isPlaying]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, raw));
    const snapped = goalMilestones.reduce((pos, m) => {
      if (m.pct !== null && Math.abs(m.pct - pos) < 3) {
        navigator.vibrate?.(30);
        return m.pct;
      }
      return pos;
    }, clamped);
    setThumbPct(snapped);
  }, [isDragging, goalMilestones]);

  const handlePointerUp = useCallback(() => { setIsDragging(false); }, []);

  useEffect(() => {
    if (isDragging) {
      const up = () => setIsDragging(false);
      window.addEventListener('pointerup', up);
      return () => window.removeEventListener('pointerup', up);
    }
  }, [isDragging]);

  const lastTapRef = useRef(0);
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setThumbPct(Math.max(0, Math.min(100, pct)));
    }
    lastTapRef.current = now;
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
      const startPos = thumbPct;
      const startTime = Date.now();
      const duration = 5000;
      function animate() {
        if (!isPlayingRef.current) return;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setThumbPct(startPos + (100 - startPos) * eased);
        if (progress < 1) animFrameRef.current = requestAnimationFrame(animate);
        else { isPlayingRef.current = false; setIsPlaying(false); }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, thumbPct]);

  useEffect(() => {
    return () => { cancelAnimationFrame(animFrameRef.current); if (touchTimer.current) clearTimeout(touchTimer.current); };
  }, []);

  // ── Stage transition detection ──
  useEffect(() => {
    const newStages: Record<string, number> = {};
    sorted.forEach(g => {
      const projected = getProjectedProgress(g, scrubberDate);
      const fillPct = g.target > 0 ? Math.min((projected / g.target) * 100, 100) : 0;
      const stage = getProgressStage(fillPct);
      const key = g.name;
      newStages[key] = stage;
      if (prevStages[key] !== undefined && prevStages[key] < stage) {
        setStageTransitions(prev => new Set([...prev, key]));
        setTimeout(() => setStageTransitions(prev => { const n = new Set(prev); n.delete(key); return n; }), 800);
      }
    });
    setPrevStages(newStages);
  }, [scrubberDate, sorted]);

  useEffect(() => {
    sorted.forEach(g => {
      const projected = getProjectedProgress(g, scrubberDate);
      const pct = g.target > 0 ? (projected / g.target) * 100 : 0;
      // Check 50% milestone
      const key50 = `jfb_milestone_${g.name}_50`;
      if (pct >= 50 && !localStorage.getItem(key50)) {
        localStorage.setItem(key50, 'true');
        setMilestoneGoal(g);
      }
      // Check 75% milestone
      const key75 = `jfb_milestone_${g.name}_75`;
      if (pct >= 75 && !localStorage.getItem(key75)) {
        localStorage.setItem(key75, 'true');
        setMilestoneGoal(g);
      }
    });
  }, [scrubberDate, sorted]);

  useEffect(() => {
    const newCelebrated = new Set<string>();
    sorted.forEach(g => {
      const projected = getProjectedProgress(g, scrubberDate);
      if (projected >= g.target) newCelebrated.add(g.name);
    });
    setCelebratedGoals(newCelebrated);
  }, [scrubberDate, sorted]);

  // ── Acceleration handlers ──
  const handleSpeedUp = (idx: number) => {
    setAcceleratingGoalIdx(idx);
    setShowAcceleration(true);
  };

  const adjustCategory = (catIdx: number, delta: number) => {
    setSpendingCategories(prev => prev.map((c, i) => {
      if (i !== catIdx) return c;
      const maxRedirect = Math.floor(c.budget * 0.8);
      const newVal = Math.max(0, Math.min(maxRedirect, c.redirected + delta));
      return { ...c, redirected: newVal };
    }));
  };

  const applyAcceleration = () => {
    toast({ title: 'Plan updated!', description: `Redirecting €${totalRedirected}/mo to accelerate your goal.` });
    setShowAcceleration(false);
    setAcceleratingGoalIdx(null);
  };

  const cancelAcceleration = () => {
    setSpendingCategories(prev => prev.map(c => ({ ...c, redirected: 0 })));
    setShowAcceleration(false);
    setAcceleratingGoalIdx(null);
  };

  const handleTouchStart = useCallback((idx: number) => {
    if (showAcceleration) { handleSpeedUp(idx); return; }
    setHoverGoalIdx(idx);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setHoverGoalIdx(null), 5000);
  }, [showAcceleration]);

  const avatarBobDuration = allGoalsComplete ? '1.2s' : completedCount >= 2 ? '1.6s' : '2s';

  const accelDelta = useMemo(() => {
    if (acceleratingGoalIdx === null || totalRedirected === 0) return null;
    const g = sorted[acceleratingGoalIdx];
    if (!g || g.monthlyContribution <= 0) return null;
    const origMonths = Math.ceil((g.target - g.saved) / g.monthlyContribution);
    const newMonths = Math.ceil((g.target - g.saved) / (g.monthlyContribution + totalRedirected));
    const saved = origMonths - newMonths;
    if (saved <= 0) return null;
    return saved;
  }, [acceleratingGoalIdx, totalRedirected, sorted]);

  // ── No goals state ──
  if (sorted.length === 0) {
    return (
      <motion.div className="fixed inset-0 z-50 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ height: '75%', background: SKY_GRADIENTS.average }} />
        <div className="absolute bottom-0 w-full" style={{ height: '25%', background: GROUND_GRADIENTS.average }} />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-30">
          <button onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="w-6 h-6 text-white/50" />
            <span className="text-lg font-bold text-white">My World</span>
          </button>
        </div>
        <motion.img src={avatarImg} alt="Avatar" className="absolute left-1/2" style={{ width: 120, height: 120, bottom: '14%', transform: 'translateX(-50%)', objectFit: 'contain', imageRendering: 'pixelated' as any, zIndex: 20, animation: 'avatar-bob 2s ease-in-out infinite' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p className="text-base text-white/40 font-medium mb-1">Add goals to see your timeline</p>
          <p className="text-[13px] text-white/25 mb-4 text-center px-8">Watch your future unfold as you save</p>
          <button onClick={() => setAddGoalOpen(true)} className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            Add Goal
          </button>
        </motion.div>
        <AddGoalSheet open={addGoalOpen} onClose={() => setAddGoalOpen(false)} />
        <style>{baseStyles}</style>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden select-none"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onPointerMove={isDragging ? handlePointerMove : undefined}
      onPointerUp={isDragging ? handlePointerUp : undefined}
    >
      {/* Sky */}
      <div className="absolute inset-0 transition-all duration-500" style={{ height: '75%', background: skyGradient }} />

      {/* Clouds */}
      <div className="absolute inset-0 pointer-events-none" style={{ height: '75%' }}>
        <div className="absolute rounded-full" style={{ width: 120, height: 40, top: '10%', left: '15%', background: 'rgba(255,255,255,0.4)', filter: 'blur(8px)', animation: 'cloud-drift-soft 60s linear infinite' }} />
        <div className="absolute rounded-full" style={{ width: 80, height: 30, top: '18%', right: '20%', background: 'rgba(255,255,255,0.3)', filter: 'blur(10px)', animation: 'cloud-drift-soft 45s linear infinite reverse' }} />
        <div className="absolute rounded-full" style={{ width: 100, height: 35, top: '8%', right: '40%', background: 'rgba(255,255,255,0.35)', filter: 'blur(9px)', animation: 'cloud-drift-soft 55s linear infinite' }} />
      </div>

      {/* Ground */}
      <motion.div
        className="absolute bottom-0 w-full transition-all duration-500"
        style={{ height: '25%', background: groundGradient }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="absolute left-0 right-0 transition-all duration-500" style={{ top: -4, height: 8, background: `linear-gradient(180deg, transparent, ${groundEdge})` }} />
      </motion.div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-30">
        <button onClick={onClose} className="flex items-center gap-2">
          <ArrowLeft className="w-6 h-6 text-white/50" />
          <span className="text-lg font-bold text-white">My World</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {(['projected', 'actual'] as const).map(m => (
              <button key={m} onClick={() => setTimelineMode(m)}
                className="px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize transition-all"
                style={{
                  background: timelineMode === m ? 'rgba(139,92,246,0.3)' : 'transparent',
                  color: timelineMode === m ? 'white' : 'rgba(255,255,255,0.4)',
                }}>
                {m === 'actual' ? 'Actual vs Plan' : 'Projected'}
              </button>
            ))}
          </div>
          <button onClick={() => toast({ title: 'Your Financial World', description: 'Drag the timeline to see goals fill up over time.' })}
            className="flex items-center gap-1 rounded-full px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
            <Info className="w-3.5 h-3.5 text-white/25" />
          </button>
        </div>
      </div>

      {/* Goal objects — LEFT and RIGHT of avatar, never behind */}
      {sorted.slice(0, 4).map((goal, i) => {
        const pos = POSITIONS[i];
        const projected = getProjectedProgress(goal, scrubberDate);
        const fillPct = goal.target > 0 ? Math.min((projected / goal.target) * 100, 100) : 0;
        const isComplete = fillPct >= 100;
        const isCelebrated = celebratedGoals.has(goal.name);
        const isHovered = hoverGoalIdx === i;
        const milestone = goalMilestones[i];
        const isTransitioning = stageTransitions.has(goal.name);

        // Progressive image based on fill
        const img = getGoalImage(goal, fillPct);

        return (
          <motion.div key={goal.name + i} className="absolute"
            style={{ left: pos.x, bottom: pos.bottom, transform: 'translateX(-50%)', zIndex: isHovered ? 25 : 10 + i }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}>
            <div className="relative cursor-pointer"
              style={{ animation: `goal-bob 2.5s ease-in-out ${i * 0.4}s infinite` }}
              onClick={() => showAcceleration ? handleSpeedUp(i) : handleTouchStart(i)}
              onMouseEnter={() => !showAcceleration && setHoverGoalIdx(i)}
              onMouseLeave={() => setHoverGoalIdx(null)}>

              {/* Image — NO dark overlay, progressive images handle stages */}
              <div className="relative overflow-hidden" style={{ width: pos.size, height: pos.size, borderRadius: 8 }}>
                <img src={img} alt={goal.name}
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' as any,
                    animation: isComplete && isCelebrated ? 'goalAchieved 0.5s ease-out' : isTransitioning ? 'stageUp 0.4s ease-out' : undefined,
                  }} />
              </div>

              {/* Goal name + progress */}
              <p className="text-center mt-0.5" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {goal.name}
              </p>
              <div className="mx-auto mt-0.5" style={{ width: pos.size - 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ width: `${fillPct}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #8B5CF6, #EC4899)', transition: 'width 200ms' }} />
              </div>

              {/* Achieved banner */}
              <AnimatePresence>
                {isComplete && isCelebrated && (
                  <>
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg text-white font-bold"
                      style={{ top: -22, fontSize: 11, background: 'rgba(39,174,96,0.8)', whiteSpace: 'nowrap' }}>
                      Achieved!
                    </motion.div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                      className="absolute flex items-center justify-center"
                      style={{ top: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#27AE60' }}>
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Sparkles */}
              {(isComplete && isCelebrated || isTransitioning) && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 8 }).map((_, s) => {
                    const angle = (s / 8) * 360;
                    const tx = Math.cos(angle * Math.PI / 180) * 40;
                    const ty = Math.sin(angle * Math.PI / 180) * 40;
                    return (
                      <div key={s} className="absolute rounded-full"
                        style={{
                          width: 4 + Math.random() * 2, height: 4 + Math.random() * 2,
                          top: '50%', left: '50%',
                          background: s % 2 === 0 ? '#FFD700' : 'white',
                          ['--tx' as any]: `${tx}px`, ['--ty' as any]: `${ty}px`,
                          animation: `sparkle 0.8s ease-out ${s * 0.05}s forwards`,
                        }} />
                    );
                  })}
                </div>
              )}

              {/* Actual vs Plan indicator */}
              {timelineMode === 'actual' && (
                <div className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-semibold"
                  style={{ bottom: -20, background: 'rgba(39,174,96,0.2)', color: '#34C759', whiteSpace: 'nowrap' }}>
                  On track
                </div>
              )}

              {/* Speed up button */}
              {isHovered && !showAcceleration && (
                <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ bottom: `calc(100% + 40px)`, background: 'rgba(139,92,246,0.25)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(139,92,246,0.3)', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: 'white' }}
                  onClick={(e) => { e.stopPropagation(); handleSpeedUp(i); }}>
                  <Zap className="w-3.5 h-3.5" /> Speed this up
                </motion.button>
              )}

              {/* Hover tooltip */}
              <AnimatePresence>
                {isHovered && !showAcceleration && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute pointer-events-none"
                    style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, width: 180 }}>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(20,15,30,0.90)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p className="text-[13px] font-bold text-white text-center mb-1">{goal.name}</p>
                      <p className="text-[11px] text-white/60 text-center mb-2">
                        €{Math.round(projected).toLocaleString()} / €{goal.target.toLocaleString()}
                      </p>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ width: `${fillPct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #8B5CF6, #EC4899)', transition: 'width 200ms' }} />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-white/40">{Math.round(fillPct)}%</span>
                        {goal.monthlyContribution > 0 && <span className="text-[10px] text-white/40">€{goal.monthlyContribution}/mo</span>}
                      </div>
                      {milestone.date && <p className="text-[10px] text-white/30 text-center mt-1.5">Est. {formatMonth(milestone.date)}</p>}
                    </div>
                    <div className="flex justify-center">
                      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(20,15,30,0.90)' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Acceleration delta */}
              {acceleratingGoalIdx === i && accelDelta && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                  style={{ top: -24, background: 'rgba(39,174,96,0.2)', color: '#34C759', whiteSpace: 'nowrap' }}>
                  {accelDelta} months sooner!
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Avatar — centered */}
      <motion.div className="absolute left-1/2" style={{ bottom: '14%', transform: 'translateX(-50%)', zIndex: 20 }}>
        <img src={avatarImg} alt="Avatar"
          style={{ width: 110, height: 110, objectFit: 'contain', imageRendering: 'pixelated' as any,
            animation: `avatar-bob ${avatarBobDuration} ease-in-out infinite` }} />
        <AnimatePresence>
          {allGoalsComplete && (
            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
              className="absolute flex items-center justify-center"
              style={{ top: -10, right: -10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,215,0,0.3)', border: '1px solid rgba(255,215,0,0.5)' }}>
              <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Milestone notification ── */}
      {milestoneGoal && (
        <div className="absolute left-4 right-4 z-30" style={{ bottom: 148 }}>
          <JohnnyMessage variant="glass" from="Johnny"
            onDismiss={() => setMilestoneGoal(null)}
            actions={
              <>
                <JohnnyPrimaryBtn onClick={() => {
                  setMilestoneGoal(null);
                  setShowAcceleration(true);
                  setAcceleratingGoalIdx(sorted.indexOf(milestoneGoal));
                }}>Speed it up</JohnnyPrimaryBtn>
                <JohnnySecondaryBtn onClick={() => setMilestoneGoal(null)}>Keep pace</JohnnySecondaryBtn>
              </>
            }
          >
            🎉 <strong>{milestoneGoal.name}</strong> just hit a milestone!{' '}
            {milestoneGoal.monthlyContribution > 0 && (
              <>Redirect spending and reach it <strong>sooner</strong>.</>
            )}
          </JohnnyMessage>
        </div>
      )}

      {/* ── Acceleration Chips ── */}
      <AnimatePresence>
        {showAcceleration && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute left-0 right-0 z-30 px-4"
            style={{ bottom: 148 }}>
            <div className="rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-white/60">Redirect spending to this goal</span>
                <button onClick={cancelAcceleration}><X className="w-4 h-4 text-white/40" /></button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {spendingCategories.map((cat, ci) => {
                  const color = CATEGORY_COLORS[cat.name] || '#8A7FA0';
                  const isActive = cat.redirected > 0;
                  return (
                    <div key={cat.name} className="flex-shrink-0 rounded-xl p-2.5"
                      style={{
                        minWidth: 110, background: isActive ? `rgba(${hexToRgb(color)}, 0.15)` : 'rgba(255,255,255,0.1)',
                        border: `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.15)'}`,
                      }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-[11px] text-white font-medium">{cat.name}</span>
                      </div>
                      <span className="text-[10px] text-white/50 block mb-1.5">€{cat.budget}/mo</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustCategory(ci, -25)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <Minus className="w-3 h-3 text-white/60" />
                        </button>
                        <span className="text-[11px] font-semibold min-w-[40px] text-center" style={{ color: cat.redirected > 0 ? color : 'rgba(255,255,255,0.4)' }}>
                          {cat.redirected > 0 ? `-€${cat.redirected}` : '€0'}
                        </span>
                        <button onClick={() => adjustCategory(ci, 25)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <Plus className="w-3 h-3 text-white/60" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalRedirected > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-white/50">Total: €{totalRedirected}/mo redirected</span>
                  <div className="flex gap-2">
                    <button onClick={cancelAcceleration} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/50" style={{ background: 'rgba(255,255,255,0.1)' }}>Just exploring</button>
                    <button onClick={applyAcceleration} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}>Apply to my plan</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timeline Scrubber ── */}
      <motion.div className="absolute left-4 right-4 z-20"
        style={{ bottom: 60, height: 72, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: '10px 16px' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.3 }}>

        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-white/40" />
            <span className="text-[12px] text-white/40">Today</span>
          </div>
          <span className="text-[14px] font-bold text-white">{formatMonth(scrubberDate)}</span>
        </div>

        <div ref={trackRef} className="relative h-5 flex items-center cursor-pointer" onClick={handleTrackClick}>
          {showAcceleration && totalRedirected > 0 && (
            <div className="absolute left-0 right-0 h-1 rounded-full" style={{ top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)' }}>
              {originalMilestones.map((pct, i) => pct !== null && pct > 0 ? (
                <div key={i} className="absolute w-2 h-2 rounded-sm" style={{ left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.15)' }} />
              ) : null)}
            </div>
          )}

          <div className="absolute left-0 right-0 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-75" style={{ width: `${thumbPct}%`, background: 'linear-gradient(90deg, #8B5CF6, #EC4899)' }} />
          </div>

          {goalMilestones.map((m, i) => m.pct !== null && m.pct > 0 && m.pct < 100 ? (
            <div key={i} className="absolute" style={{ left: `${m.pct}%`, top: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                style={{
                  background: m.goal.monthlyContribution > 0 ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)',
                  border: thumbPct >= (m.pct || 0) ? '1px solid rgba(236,72,153,0.5)' : '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 200ms',
                }}>
                {getGoalEmoji(m.goal)}
              </div>
            </div>
          ) : m.pct === null ? (
            <div key={i} className="absolute text-[9px] text-white/20" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>∞</div>
          ) : null)}

          <div className="absolute" style={{ left: `${thumbPct}%`, top: '50%', transform: 'translate(-50%, -50%)', zIndex: 3 }}
            onPointerDown={handlePointerDown}>
            <div className="transition-transform" style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              boxShadow: '0 0 12px rgba(139,92,246,0.5)',
              cursor: isDragging ? 'grabbing' : 'grab',
              transform: isDragging ? 'scale(1.15)' : 'scale(1)',
            }} />
          </div>

          <button onClick={togglePlay} className="absolute flex items-center justify-center"
            style={{ right: -2, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', zIndex: 2 }}>
            {isPlaying ? <Pause className="w-2.5 h-2.5 text-white/60" /> : <Play className="w-2.5 h-2.5 text-white/60" style={{ marginLeft: 1 }} />}
          </button>
        </div>

        <div className="relative h-3 mt-0.5">
          {dateLabels.map((l, i) => (
            <span key={i} className="absolute text-[9px] font-medium" style={{ left: `${l.pct}%`, transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.35)' }}>
              {l.text}
            </span>
          ))}
        </div>

        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {!hintShown ? 'Drag to see your future' : contextText}
        </p>
      </motion.div>

      <AddGoalSheet open={addGoalOpen} onClose={() => setAddGoalOpen(false)} />
      <style>{baseStyles}</style>
    </motion.div>
  );
}

function getGoalEmoji(goal: GoalType): string {
  const icon = goal.icon || '';
  const name = (goal.name || '').toLowerCase();
  if (icon === 'Home' || name.includes('house')) return '🏠';
  if (icon === 'Car' || name.includes('car')) return '🚗';
  if (icon === 'Plane' || name.includes('vacation') || name.includes('travel')) return '✈️';
  if (icon === 'Laptop' || name.includes('laptop')) return '💻';
  if (icon === 'GraduationCap' || name.includes('education')) return '🎓';
  return '🎯';
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const baseStyles = `
  @keyframes cloud-drift-soft {
    0% { transform: translateX(0); }
    100% { transform: translateX(30px); }
  }
  @keyframes goal-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes avatar-bob {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-4px); }
  }
  @keyframes goalAchieved {
    0% { transform: scale(1); }
    40% { transform: scale(1.15); }
    100% { transform: scale(1.0); }
  }
  @keyframes stageUp {
    0% { transform: scale(0.9); filter: brightness(1.5); }
    50% { transform: scale(1.1); filter: brightness(1.3); }
    100% { transform: scale(1); filter: brightness(1); }
  }
  @keyframes sparkle {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
  }
  @keyframes popIn {
    0% { transform: scale(0); }
    70% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
