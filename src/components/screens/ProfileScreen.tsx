import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Lock, ChevronRight, Settings, Check, X, Plus, Trophy,
  UserCircle, Bell, Palette, Download, Shield, Info, Flame, Hourglass, Users, BookOpen, Eye, Zap, PiggyBank, AlertTriangle, Target, TrendingUp, Clock
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { useToast } from '@/hooks/use-toast';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { QuestionnaireOverlay } from '@/components/profile/QuestionnaireOverlay';
import {
  QUEST_NODES, BADGES, getLevelTitle, getLevelTier, calculateCompleteness,
  getPersona, getJohnnyObservations, getDimensionScore, getModuleQuestions
} from '@/lib/profileData';
import avatarImg from '@/assets/avatar.png';
import johnnyImg from '@/assets/johnny.png';

// ── Observation icon map ──
const OBS_ICONS: Record<string, any> = { Eye, Zap, PiggyBank, Clock, AlertTriangle, Star, TrendingUp, Target };

// ── Count-up hook ──
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const s = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - s) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// ── Radar chart helper ──
function radarPoint(cx: number, cy: number, r: number, idx: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI / 5) * idx;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

const DIMENSION_LABELS = [
  { key: 'module1', label: 'Risk', Icon: Flame },
  { key: 'module2', label: 'Time', Icon: Hourglass },
  { key: 'module3', label: 'Confidence', Icon: Shield },
  { key: 'module4', label: 'Social', Icon: Users },
  { key: 'module5', label: 'Script', Icon: BookOpen },
];

const ROW_H = 96;

// ══════════════════════════════════════════════
// Main Content (inside BudgetProvider)
// ══════════════════════════════════════════════
function ProfileScreenContent() {
  const { goals, setActiveTab } = useApp();
  const { config, transactions, paceStatus, flexSpent } = useBudget();
  const { toast } = useToast();

  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── localStorage reads ──
  const readDone = useCallback(() => {
    const flags: Record<string, boolean> = {};
    QUEST_NODES.forEach(n => { if (n.lsDone) flags[n.key] = localStorage.getItem(n.lsDone) === 'true'; });
    return flags;
  }, []);

  const [doneFlags, setDoneFlags] = useState(readDone);
  const userName = localStorage.getItem('jfb_userName') || 'Explorer';
  const hasUsedWhatIf = localStorage.getItem('jfb_hasUsedWhatIf') === 'true';
  const hasUsed5YearZoom = localStorage.getItem('jfb_hasUsed5YearZoom') === 'true';
  const hasCompletedMonth = localStorage.getItem('jfb_hasCompletedMonth') === 'true';

  const m0Answers = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null'); } catch { return null; }
  }, [refreshKey]);
  const clarityAnswers = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_clarity_answers') || 'null'); } catch { return null; }
  }, [refreshKey]);

  // ── Computed ──
  const completeness = calculateCompleteness(doneFlags);
  const animatedScore = useCountUp(completeness);
  const levelTitle = getLevelTitle(completeness);
  const tier = getLevelTier(completeness);
  const tierProgress = tier.max > tier.min ? ((completeness - tier.min) / (tier.max - tier.min)) * 100 : 100;
  const persona = useMemo(() => doneFlags.module0 && doneFlags.clarity ? getPersona(m0Answers) : null, [doneFlags, m0Answers]);
  const observations = useMemo(() => getJohnnyObservations(m0Answers, clarityAnswers), [m0Answers, clarityAnswers]);

  // Module answers for DNA chart
  const dimensionAnswers = useMemo(() => {
    const result: Record<string, Record<string, any> | null> = {};
    DIMENSION_LABELS.forEach(d => {
      try { result[d.key] = JSON.parse(localStorage.getItem(`jfb_${d.key === 'module1' ? 'module1' : d.key}_answers`) || 'null'); } catch { result[d.key] = null; }
      // Fix: use correct localStorage key
      const node = QUEST_NODES.find(n => n.key === d.key);
      if (node?.lsAnswers) {
        try { result[d.key] = JSON.parse(localStorage.getItem(node.lsAnswers) || 'null'); } catch { result[d.key] = null; }
      }
    });
    return result;
  }, [refreshKey]);

  // ── Badge unlocks ──
  const earnedBadges: string[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_badges') || '[]'); } catch { return []; }
  }, [refreshKey]);

  const allBadgeUnlocks = useMemo(() => {
    const u: Record<string, boolean> = {};
    BADGES.forEach(b => { u[b.key] = earnedBadges.includes(b.key); });
    // Also check runtime conditions
    if (config.setupComplete) u['first-step'] = true;
    if (transactions.length >= 10) u['tracker'] = true;
    if (goals.some(g => g.saved >= g.target && g.target > 0)) u['goal-getter'] = true;
    if (hasUsedWhatIf) u['explorer'] = true;
    if (hasCompletedMonth) u['on-track'] = true;
    if (hasUsed5YearZoom) u['time-traveler'] = true;
    return u;
  }, [earnedBadges, config, transactions.length, goals, hasUsedWhatIf, hasCompletedMonth, hasUsed5YearZoom]);

  // ── Featured badges (first 3 earned) ──
  const featuredBadges = useMemo(() => BADGES.filter(b => allBadgeUnlocks[b.key]).slice(0, 3), [allBadgeUnlocks]);
  const totalEarned = BADGES.filter(b => allBadgeUnlocks[b.key]).length;

  // ── Node status ──
  const getNodeStatus = useCallback((node: typeof QUEST_NODES[0], idx: number) => {
    if (node.status === 'coming-soon') return 'coming-soon' as const;
    if (doneFlags[node.key]) return 'completed' as const;
    const prereqsMet = node.prereqs.every(p => doneFlags[p]);
    if (prereqsMet) return 'current' as const;
    return 'locked' as const;
  }, [doneFlags]);

  // Johnny position: between last completed and first current
  const lastCompletedIdx = useMemo(() => {
    let last = -1;
    QUEST_NODES.forEach((n, i) => { if (doneFlags[n.key]) last = i; });
    return last;
  }, [doneFlags]);

  const handleNodeTap = useCallback((node: typeof QUEST_NODES[0], status: string) => {
    if (status === 'coming-soon') { toast({ title: `${node.name} coming soon!` }); return; }
    if (status === 'locked') {
      const prereqName = QUEST_NODES.find(n => n.key === node.prereqs[0])?.name || 'previous quest';
      toast({ title: `Complete ${prereqName} first` });
      return;
    }
    setActiveQuest(node.key);
  }, [toast]);

  const handleQuestComplete = useCallback(() => {
    setActiveQuest(null);
    setDoneFlags(readDone());
    setRefreshKey(k => k + 1);
  }, [readDone]);

  const handleBadgeTap = (b: typeof BADGES[0]) => {
    const unlocked = allBadgeUnlocks[b.key];
    toast({ title: unlocked ? b.name : 'Keep going!', description: unlocked ? b.desc : b.hint });
  };

  const handleSaveName = () => {
    if (nameInput.trim()) localStorage.setItem('jfb_userName', nameInput.trim());
    setEditingName(false);
    setRefreshKey(k => k + 1);
  };

  // ── SVG ring ──
  const ringR = 48;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - completeness / 100);

  // ── Next quest hint ──
  const nextQuestName = useMemo(() => {
    const next = QUEST_NODES.find((n, i) => getNodeStatus(n, i) === 'current');
    return next?.name || '';
  }, [getNodeStatus]);

  return (
    <div className="h-full overflow-auto pb-0">
      <div className="px-5 pt-10 pb-2 space-y-6">

        {/* ═══ 1. AVATAR + SCORE HEADER ═══ */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-[110px] h-[110px] flex items-center justify-center">
            <svg width="110" height="110" className="absolute inset-0" style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.35))' }}>
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#FF6B9D" />
                </linearGradient>
              </defs>
              <circle cx="55" cy="55" r={ringR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
              <circle cx="55" cy="55" r={ringR} fill="none" stroke="url(#ring-grad)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={ringC} strokeDashoffset={ringOffset} transform="rotate(-90 55 55)"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            {/* Sparkle dots */}
            {[0, 90, 180, 270].map(deg => (
              <div key={deg} className="absolute w-full h-full" style={{ animation: `sparkle-orbit 10s linear infinite`, animationDelay: `${deg / 360 * 10}s` }}>
                <div className="absolute w-[3px] h-[3px] rounded-full bg-white/25" style={{ left: '50%', top: '0' }} />
              </div>
            ))}
            <img src={avatarImg} alt="Avatar" className="w-20 h-20 rounded-full object-cover" style={{ animation: 'avatar-bob 2s ease-in-out infinite' }} />
          </div>

          <span className="text-xl font-bold text-white">{userName}</span>
          <span className="text-xs text-white/40">── ◆ {levelTitle} ◆ ──</span>

          <div className="flex items-center gap-2 rounded-full px-4 h-8" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <Star className="w-3.5 h-3.5 text-[#FFD700]" fill="#FFD700" style={{ animation: 'star-pulse 2s ease-in-out infinite' }} />
            <span className="text-[13px] font-bold text-white">Score: {animatedScore}/100</span>
          </div>
        </div>

        {/* ═══ 2. QUEST PATH ═══ */}
        <div className="relative" style={{ height: QUEST_NODES.length * ROW_H }}>
          {/* Center vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          {/* Completed segment overlay */}
          {lastCompletedIdx >= 0 && (
            <div className="absolute left-1/2 top-0 w-[3px] -translate-x-1/2" style={{ height: (lastCompletedIdx + 1) * ROW_H, background: 'rgba(255,255,255,0.2)' }} />
          )}

          {/* Johnny on path */}
          {lastCompletedIdx >= 0 && (
            <img src={johnnyImg} alt="Johnny" className="absolute left-1/2 -translate-x-1/2 w-6 h-6 z-10"
              style={{ top: (lastCompletedIdx + 0.5) * ROW_H - 12 }} />
          )}

          {QUEST_NODES.map((node, i) => {
            const isLeft = i % 2 === 0;
            const status = getNodeStatus(node, i);
            const Icon = node.Icon;
            const leftPos = isLeft ? '28%' : '72%';

            return (
              <motion.div key={node.key} className="absolute w-full" style={{ top: i * ROW_H }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}>

                {/* Horizontal connector */}
                <div className="absolute top-1/2 h-[3px] -translate-y-1/2"
                  style={{
                    left: isLeft ? leftPos : '50%',
                    width: '22%',
                    borderTop: status === 'completed' ? '3px solid rgba(255,255,255,0.15)' : '3px dashed rgba(255,255,255,0.08)',
                    animation: status === 'current' ? 'line-pulse 3s ease-in-out infinite' : undefined,
                  }} />

                {/* Node circle */}
                <button onClick={() => handleNodeTap(node, status)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                  style={{ left: leftPos }}>

                  {/* Pulse ring for current */}
                  {status === 'current' && (
                    <div className="absolute w-[74px] h-[74px] rounded-full border-2 border-white/15" style={{ animation: 'node-pulse 2s ease-in-out infinite' }} />
                  )}

                  {/* Circle */}
                  <div className="relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                      background: status === 'completed' ? 'linear-gradient(135deg, #8B5CF6, #FF6B9D)'
                        : status === 'current' ? 'rgba(255,255,255,0.15)'
                        : status === 'coming-soon' ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.05)',
                      border: status === 'current' ? '3px solid transparent' : status === 'coming-soon' ? '2px solid rgba(255,255,255,0.05)' : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: status === 'completed' ? '0 0 16px rgba(139,92,246,0.3)' : 'none',
                    }}>
                    {status === 'current' && (
                      <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#8B5CF6, #FF6B9D, #8B5CF6)', animation: 'rotating-border 3s linear infinite', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor', WebkitMaskComposite: 'xor', padding: '3px', borderRadius: '9999px' }} />
                    )}
                    <Icon className="w-[26px] h-[26px] relative z-10" strokeWidth={1.5}
                      style={{ color: status === 'completed' ? 'white' : status === 'current' ? 'rgba(255,255,255,0.8)' : status === 'coming-soon' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)' }} />
                    {status === 'locked' && <Lock className="w-3 h-3 text-white/15 absolute top-1.5 right-1.5 z-10" />}
                  </div>

                  {/* Completed check */}
                  {status === 'completed' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#34C759] flex items-center justify-center z-20">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}

                  {/* Label */}
                  <div className="mt-2 text-center" style={{ width: 100 }}>
                    <p className="text-[13px] leading-tight" style={{
                      color: status === 'completed' ? 'white' : status === 'current' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                    }}>{node.name}</p>
                    <p className="text-[10px] text-white/30">{node.subtitle}</p>
                    {status === 'current' && <p className="text-[11px] font-bold text-purple-400 mt-0.5">START</p>}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ═══ 3. FINANCIAL DNA CARD ═══ */}
        <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Financial DNA</h3>
            <Info className="w-4 h-4 text-white/25" />
          </div>

          {/* Radar Pentagon */}
          <div className="flex justify-center mb-4">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="radar-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map(pct => {
                const pts = Array.from({ length: 5 }, (_, i) => radarPoint(100, 100, 75 * pct, i));
                return <polygon key={pct} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
              })}
              {/* Axis lines */}
              {Array.from({ length: 5 }, (_, i) => {
                const p = radarPoint(100, 100, 75, i);
                return <line key={i} x1={100} y1={100} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
              })}
              {/* Data polygon */}
              {(() => {
                const scores = DIMENSION_LABELS.map(d => {
                  const done = doneFlags[d.key];
                  const ans = dimensionAnswers[d.key];
                  return done && ans ? getDimensionScore(d.key, ans) : 50;
                });
                const pts = scores.map((s, i) => {
                  const pct = doneFlags[DIMENSION_LABELS[i].key] ? s / 100 : 0.5;
                  return radarPoint(100, 100, 75 * pct, i);
                });
                return (
                  <motion.polygon
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
                    points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="url(#radar-fill)" stroke="url(#radar-stroke)" strokeWidth="2" />
                );
              })()}
              {/* Axis labels */}
              {DIMENSION_LABELS.map((d, i) => {
                const p = radarPoint(100, 100, 92, i);
                const done = doneFlags[d.key];
                return (
                  <g key={d.key}>
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize="9">{d.label}</text>
                    {!done && <text x={p.x} y={p.y + 12} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="8">?</text>}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Stat pills */}
          <div className="flex gap-2 justify-center flex-wrap">
            {DIMENSION_LABELS.map((d, i) => {
              const done = doneFlags[d.key];
              const Icon = d.Icon;
              const score = done && dimensionAnswers[d.key] ? getDimensionScore(d.key, dimensionAnswers[d.key]) : null;
              return (
                <motion.div key={d.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-1 px-2 h-7 rounded-full text-xs"
                  style={{ background: done ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)', color: done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                  <Icon className="w-3 h-3" strokeWidth={1.5} />
                  <span>{done ? score : '?'}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Persona */}
          {persona && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-white/30 mb-1">Your Persona</p>
              <p className="text-lg font-bold text-white">{persona.n}</p>
              <p className="text-xs text-white/40 mt-1">{persona.d}</p>
              <p className="text-[10px] text-white/25 mt-1">Style: {persona.s}</p>
            </div>
          )}
          {!persona && (
            <p className="text-xs text-white/15 text-center mt-3">Complete quests to discover your persona</p>
          )}
        </div>

        {/* ═══ 4. LEVEL PROGRESS ═══ */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-white">{levelTitle}</span>
            <span className="text-white/25">{tier.next || 'Max Level'}</span>
          </div>
          <div className="w-full h-2 rounded bg-white/[0.08] overflow-hidden">
            <motion.div className="h-full rounded gradient-primary" initial={{ width: 0 }} animate={{ width: `${tierProgress}%` }} transition={{ delay: 0.3, duration: 0.6 }} />
          </div>
          {nextQuestName && <p className="text-[11px] text-white/25">Next: Complete {nextQuestName} to level up</p>}
        </div>

        {/* ═══ 5. BADGE SHOWCASE ═══ */}
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Trophy Case</h3>
          </div>

          {/* Featured badges */}
          <div className="flex gap-3 justify-center mb-4">
            {[0, 1, 2].map(i => {
              const badge = featuredBadges[i];
              if (badge) {
                return (
                  <button key={badge.key} onClick={() => handleBadgeTap(badge)} className="flex flex-col items-center gap-1.5">
                    <div className="w-[56px] h-[56px] rounded-[14px] flex items-center justify-center relative overflow-hidden" style={{ background: badge.tint + '25' }}>
                      <badge.Icon className="w-7 h-7" style={{ color: badge.tint }} strokeWidth={1.5} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)', animation: 'shimmer 4s infinite' }} />
                    </div>
                    <span className="text-[10px] text-white/60 w-16 text-center truncate">{badge.name}</span>
                  </button>
                );
              }
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-[56px] h-[56px] rounded-[14px] border-2 border-dashed border-white/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white/10" />
                  </div>
                  <span className="text-[10px] text-white/15">Empty</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/30">All Badges</span>
              <span className="text-xs text-white/30">{totalEarned}/{BADGES.length}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {BADGES.map((b, i) => {
                const unlocked = allBadgeUnlocks[b.key];
                return (
                  <motion.button key={b.key} onClick={() => handleBadgeTap(b)}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.04 }}
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative"
                    style={{ background: unlocked ? b.tint + '20' : 'rgba(255,255,255,0.03)' }}>
                    <b.Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: unlocked ? b.tint : 'rgba(255,255,255,0.08)' }} />
                    {!unlocked && <Lock className="w-2 h-2 text-white/10 absolute bottom-0.5 right-0.5" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ 6. JOHNNY'S OBSERVATIONS ═══ */}
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2 mb-3">
            <img src={johnnyImg} alt="Johnny" className="w-8 h-8" />
            <h3 className="text-sm font-bold text-white">Johnny's Notes</h3>
          </div>
          {observations.length > 0 ? observations.map((obs, i) => {
            const Icon = OBS_ICONS[obs.icon] || Star;
            return (
              <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <Icon className="w-3.5 h-3.5 text-white/50" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] text-white/50 leading-relaxed">{obs.text}</p>
              </div>
            );
          }) : (
            <p className="text-xs text-white/20">Complete quests for Johnny to learn about you!</p>
          )}
        </div>

        {/* ═══ 7. SETTINGS BUTTON ═══ */}
        <button onClick={() => setSettingsOpen(true)}
          className="w-full h-12 rounded-2xl flex items-center gap-3 px-4"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <Settings className="w-5 h-5 text-white/40" strokeWidth={1.5} />
          <span className="flex-1 text-left text-sm text-white/50">Settings</span>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </button>

        {/* ═══ 8. SPACER ═══ */}
        <div className="h-20" />
      </div>

      {/* ── Settings Sheet ── */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-transparent p-0 max-h-[70vh]">
          <div className="jfb-bg rounded-t-3xl p-5 space-y-2 overflow-auto">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-white text-lg">Settings</SheetTitle>
              <SheetDescription className="sr-only">App settings</SheetDescription>
            </SheetHeader>
            {[
              { icon: Settings, label: 'Budget Settings', action: () => { setSettingsOpen(false); setEditBudgetOpen(true); } },
              { icon: UserCircle, label: 'Edit Name', action: () => { setNameInput(userName); setEditingName(true); } },
              { icon: Bell, label: 'Reminders', action: () => toast({ title: 'Coming soon' }) },
              { icon: Palette, label: 'Appearance', action: () => toast({ title: 'Coming soon' }) },
              { icon: Download, label: 'Export Data', action: () => toast({ title: 'Coming soon' }) },
              { icon: Shield, label: 'Privacy', action: () => toast({ title: 'Your data is stored locally on this device only' }) },
              { icon: Info, label: 'About JFB', action: () => { setSettingsOpen(false); setAboutOpen(true); } },
            ].map((row, i) => {
              const Icon = row.icon;
              return (
                <button key={i} onClick={row.action}
                  className="w-full h-[52px] rounded-2xl flex items-center gap-3 px-4"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                    <Icon className="w-4 h-4 text-purple-400" strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-left text-sm text-white">{row.label}</span>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              );
            })}
            {editingName && (
              <div className="flex gap-2 px-1 pt-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                  className="flex-1 h-10 rounded-xl bg-white/10 px-3 text-white outline-none border border-white/15" />
                <button onClick={handleSaveName} className="h-10 px-4 rounded-xl gradient-primary text-white text-sm font-semibold">Save</button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── About Sheet ── */}
      <Sheet open={aboutOpen} onOpenChange={setAboutOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-transparent p-0">
          <div className="jfb-bg rounded-t-3xl p-6 space-y-3">
            <SheetHeader>
              <SheetTitle className="text-white text-lg">Johnny F. Banks</SheetTitle>
              <SheetDescription className="text-white/50">JFB v0.1 MVP</SheetDescription>
            </SheetHeader>
            <p className="text-sm text-white/60">Built with love to help you take control of your money through gamification and visual budgeting.</p>
            <p className="text-sm text-white/40">All data stays on your device. No accounts, no tracking, no ads.</p>
          </div>
        </SheetContent>
      </Sheet>

      <EditBudgetSheet open={editBudgetOpen} onClose={() => setEditBudgetOpen(false)} />

      {/* ── Questionnaire Overlay ── */}
      <AnimatePresence>
        {activeQuest && (
          <QuestionnaireOverlay
            moduleKey={activeQuest}
            onComplete={handleQuestComplete}
            onClose={() => setActiveQuest(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes avatar-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes node-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes rotating-border { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes sparkle-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes line-pulse { 0%, 100% { opacity: 0.05; } 50% { opacity: 0.15; } }
        @keyframes star-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .profile-slider { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 4px; outline: none; }
        .profile-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; background: white; border: 3px solid #8B5CF6; cursor: pointer; }
        .profile-slider::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; background: white; border: 3px solid #8B5CF6; cursor: pointer; }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// Exported wrapper with BudgetProvider
// ══════════════════════════════════════════════
export function ProfileScreen() {
  return (
    <BudgetProvider>
      <ProfileScreenContent />
    </BudgetProvider>
  );
}
