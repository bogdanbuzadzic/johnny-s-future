import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Lock, ChevronRight, Settings, Check, X, Plus, Trophy, Gift, Sparkles,
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
const OBS_COLORS: Record<string, string> = {
  Eye: '#3B82F6', Zap: '#F97316', PiggyBank: '#34C759', Clock: '#14B8A6',
  Star: '#EAB308', AlertTriangle: '#F97316', TrendingUp: '#34C759', Target: '#EC4899',
};

const DIMENSION_COLORS: Record<string, string> = {
  module1: '#F97316', module2: '#14B8A6', module3: '#6366F1', module4: '#EC4899', module5: '#EAB308',
};

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

const ROW_H = 56;

// Node color map for completed states
const NODE_COLORS: Record<string, { bg: string; shadow: string }> = {
  module0: { bg: '#8B5CF6', shadow: '#6D28D9' },
  clarity: { bg: '#3B82F6', shadow: '#1D4ED8' },
  module1: { bg: '#F97316', shadow: '#C2410C' },
  module2: { bg: '#14B8A6', shadow: '#0D9488' },
  module3: { bg: '#6366F1', shadow: '#4338CA' },
  module4: { bg: '#EC4899', shadow: '#BE185D' },
  module5: { bg: '#EAB308', shadow: '#A16207' },
  knowledge: { bg: '#E5E7EB', shadow: '#D1D5DB' },
  execution: { bg: '#E5E7EB', shadow: '#D1D5DB' },
};

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
        {/* Progress bar */}
        <div className="rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/50">Quests</span>
            <span className="text-sm font-bold text-white/50">{QUEST_NODES.filter((n, i) => getNodeStatus(n, i) === 'completed').length}/7</span>
          </div>
          <div className="w-full h-1.5 rounded bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded" style={{
              width: `${(QUEST_NODES.filter((n, i) => getNodeStatus(n, i) === 'completed').length / 7) * 100}%`,
              background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
              transition: 'width 0.6s ease-out',
            }} />
          </div>
        </div>

        <div className="relative" style={{ height: QUEST_NODES.length * ROW_H + 2 * 48 }}>
          {/* Center vertical line - locked */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2" style={{ borderLeft: '4px dashed rgba(255,255,255,0.08)' }} />
          {/* Completed segment overlay */}
          {lastCompletedIdx >= 0 && (
            <div className="absolute left-1/2 top-0 w-1 -translate-x-1/2" style={{ height: (lastCompletedIdx + 1) * ROW_H + 28, background: 'rgba(255,255,255,0.25)', width: '4px' }} />
          )}

          {QUEST_NODES.map((node, i) => {
            const status = getNodeStatus(node, i);
            const Icon = node.Icon;
            const xOffset = Math.sin(i * 0.65) * 12;
            const colors = NODE_COLORS[node.key] || { bg: '#D1D5DB', shadow: '#9CA3AF' };

            // Dividers
            const showBonusDivider = i === 2; // Before Risk Pulse
            const showComingSoonDivider = i === 7; // Before Knowledge Tower

            const nodeSize = status === 'current' ? 88 : status === 'completed' ? 76 : status === 'coming-soon' ? 64 : 72;
            const iconSize = status === 'current' ? 32 : status === 'completed' ? 30 : status === 'coming-soon' ? 22 : 26;

            return (
              <motion.div key={node.key} className="absolute w-full" style={{ top: i * ROW_H + (i >= 2 ? 48 : 0) + (i >= 7 ? 48 : 0) }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}>

                {/* Bonus Quests divider */}
                {showBonusDivider && (
                  <div className="absolute w-full flex justify-center" style={{ top: -40 }}>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(254,243,199,0.6)', border: '1.5px solid #FCD34D' }}>
                      <Gift className="w-3.5 h-3.5" style={{ color: '#EAB308' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#92400E' }}>BONUS QUESTS</span>
                    </div>
                  </div>
                )}

                {/* Coming Soon divider */}
                {showComingSoonDivider && (
                  <div className="absolute w-full flex justify-center" style={{ top: -40 }}>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(229,231,235,0.4)' }}>
                      <Lock className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#6B7280' }}>COMING SOON</span>
                    </div>
                  </div>
                )}

                {/* Node circle */}
                <button onClick={() => handleNodeTap(node, status)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `calc(50% + ${xOffset}%)`, animation: status === 'current' ? 'node-bounce 1.5s ease-in-out infinite' : undefined }}>

                  {/* Circle */}
                  <div className="relative rounded-full flex items-center justify-center"
                    style={{
                      width: nodeSize, height: nodeSize,
                      background: status === 'completed' ? colors.bg
                        : status === 'current' ? '#A855F7'
                        : status === 'coming-soon' ? '#E5E7EB'
                        : '#D1D5DB',
                      boxShadow: status === 'completed' ? `0 6px 0 ${colors.shadow}`
                        : status === 'current' ? '0 8px 0 #7C3AED'
                        : status === 'coming-soon' ? '0 4px 0 #D1D5DB'
                        : '0 5px 0 #9CA3AF',
                      border: status === 'current' ? '4px solid #FFD700'
                        : status === 'coming-soon' ? '2px dashed #D1D5DB'
                        : 'none',
                      ...(status === 'current' ? { animation: 'gold-pulse 1.5s ease-in-out infinite' } : {}),
                    }}>
                    <Icon className="relative z-10" strokeWidth={2.5}
                      style={{
                        width: iconSize, height: iconSize,
                        color: status === 'completed' ? 'white'
                          : status === 'current' ? 'white'
                          : status === 'coming-soon' ? '#D1D5DB'
                          : '#9CA3AF',
                      }} />
                    {status === 'locked' && <Lock className="w-4 h-4 absolute z-20" style={{ color: '#6B7280' }} />}
                  </div>

                  {/* Completed check */}
                  {status === 'completed' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center z-20" style={{ background: '#16A34A' }}>
                      <Check className="w-[11px] h-[11px] text-white" strokeWidth={3} />
                    </div>
                  )}

                  {/* Label */}
                  <div className="mt-2 text-center" style={{ width: 110 }}>
                    <p style={{
                      fontSize: status === 'coming-soon' ? 12 : status === 'locked' ? 13 : 14,
                      fontWeight: (status === 'completed' || status === 'current') ? 700 : 400,
                      color: status === 'completed' ? 'white'
                        : status === 'current' ? 'white'
                        : status === 'locked' ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.15)',
                    }}>{node.name}</p>
                    {status === 'locked' && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Locked</p>}
                    {status === 'coming-soon' && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)' }}>Coming soon</p>}
                    {status === 'current' && (
                      <div className="mt-1 mx-auto flex items-center justify-center rounded-full" style={{
                        width: 90, height: 30,
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                      }}>
                        <span className="text-[13px] font-bold text-white">START</span>
                      </div>
                    )}
                    {(status === 'completed' || status === 'current') && (
                      <p className="text-[10px] text-white/30 mt-0.5">{node.subtitle}</p>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ═══ 3. FINANCIAL DNA CARD ═══ */}
        <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Financial DNA</h3>
            <Info className="w-4 h-4 text-white/25" />
          </div>

          {/* Radar Pentagon */}
          <div className="flex justify-center mb-4">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0.30" />
                </linearGradient>
                <linearGradient id="radar-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map(pct => {
                const pts = Array.from({ length: 5 }, (_, i) => radarPoint(100, 100, 75 * pct, i));
                return <polygon key={pct} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />;
              })}
              {/* Axis lines */}
              {Array.from({ length: 5 }, (_, i) => {
                const p = radarPoint(100, 100, 75, i);
                return <line key={i} x1={100} y1={100} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />;
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
                    fill="url(#radar-fill)" stroke="url(#radar-stroke)" strokeWidth="2.5" />
                );
              })()}
              {/* Axis labels with colored icons */}
              {DIMENSION_LABELS.map((d, i) => {
                const p = radarPoint(100, 100, 92, i);
                const done = doneFlags[d.key];
                const dimColor = DIMENSION_COLORS[d.key] || '#fff';
                const score = done && dimensionAnswers[d.key] ? getDimensionScore(d.key, dimensionAnswers[d.key]) : null;
                return (
                  <g key={d.key}>
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={done ? dimColor : 'rgba(255,255,255,0.3)'} fontSize="9" opacity={done ? 0.7 : 1}>{d.label}</text>
                    {done && score !== null ? (
                      <text x={p.x} y={p.y + 12} textAnchor="middle" fill={dimColor} fontSize="9" fontWeight="bold">{score}</text>
                    ) : (
                      <text x={p.x} y={p.y + 12} textAnchor="middle" fill="rgba(255,255,255,0.20)" fontSize="8">?</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Stat pills */}
          <div className="flex gap-2 justify-center flex-wrap">
            {DIMENSION_LABELS.map((d, i) => {
              const done = doneFlags[d.key];
              const DIcon = d.Icon;
              const dimColor = DIMENSION_COLORS[d.key] || '#fff';
              const score = done && dimensionAnswers[d.key] ? getDimensionScore(d.key, dimensionAnswers[d.key]) : null;
              return (
                <motion.div key={d.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-1 px-2 h-7 rounded-full text-xs"
                  style={{ background: done ? `${dimColor}40` : 'rgba(255,255,255,0.05)', color: done ? 'white' : 'rgba(255,255,255,0.3)' }}>
                  <DIcon className="w-3 h-3" strokeWidth={1.5} />
                  <span>{done ? score : '?'}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Persona */}
          {persona && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <p className="text-[11px] text-white/25 mb-1">Your Persona</p>
              <p className="text-lg font-bold text-white">{persona.n}</p>
              <p className="text-xs text-white/40 mt-1">{persona.d}</p>
              <p className="text-[11px] text-white/25 mt-1">Style: {persona.s}</p>
            </div>
          )}
          {!persona && (
            <p className="text-sm text-white/30 text-center mt-3">Complete quests to reveal your DNA</p>
          )}
        </div>

        {/* ═══ 4. LEVEL PROGRESS ═══ */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-white">{levelTitle}</span>
            <span className="text-white/30">{tier.next || 'Max Level'}</span>
          </div>
          <div className="w-full h-2.5 rounded bg-white/[0.12] overflow-hidden">
            <motion.div className="h-full rounded" style={{ background: 'linear-gradient(90deg, #8B5CF6, #EC4899)' }} initial={{ width: 0 }} animate={{ width: `${tierProgress}%` }} transition={{ delay: 0.3, duration: 0.6 }} />
          </div>
          {nextQuestName && <p className="text-xs text-white/25">Next: Complete {nextQuestName} to level up</p>}
        </div>

        {/* ═══ 5. BADGE SHOWCASE ═══ */}
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4" style={{ color: '#FFD700' }} />
            <h3 className="text-base font-bold text-white">Trophy Case</h3>
          </div>

          {/* Featured badges */}
          <div className="flex gap-3 justify-center mb-4">
            {[0, 1, 2].map(i => {
              const badge = featuredBadges[i];
              if (badge) {
                return (
                  <button key={badge.key} onClick={() => handleBadgeTap(badge)} className="flex flex-col items-center gap-1.5">
                    <div className="w-16 h-16 rounded-[14px] flex items-center justify-center relative overflow-hidden"
                      style={{ background: badge.tint + '4D', border: `2px solid ${badge.tint}66` }}>
                      <badge.Icon className="w-7 h-7 text-white/90" strokeWidth={1.5} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.10) 50%, transparent 70%)', animation: 'shimmer 4s infinite' }} />
                    </div>
                    <span className="text-[10px] w-16 text-center truncate" style={{ color: badge.tint, opacity: 0.7 }}>{badge.name}</span>
                  </button>
                );
              }
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-16 h-16 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.12)' }}>
                    <Sparkles className="w-5 h-5 text-white/15" style={{ animation: 'sparkle-pulse 3s ease-in-out infinite' }} />
                  </div>
                  <span className="text-[9px] text-white/15">Earn a badge!</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/30">All Badges</span>
              <span className="text-xs text-white/20">{totalEarned}/{BADGES.length} collected</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {BADGES.map((b, i) => {
                const unlocked = allBadgeUnlocks[b.key];
                return (
                  <motion.button key={b.key} onClick={() => handleBadgeTap(b)}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.04 }}
                    className="shrink-0 flex flex-col items-center gap-0.5">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center relative"
                      style={{
                        background: unlocked ? b.tint + '40' : 'rgba(255,255,255,0.04)',
                        border: unlocked ? `1.5px solid ${b.tint}4D` : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <b.Icon className="w-5 h-5" strokeWidth={1.5} style={{ color: unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.08)' }} />
                      {!unlocked && <Lock className="w-2.5 h-2.5 absolute bottom-0.5 right-0.5" style={{ color: 'rgba(255,255,255,0.12)' }} />}
                    </div>
                    <span className="text-[8px] w-11 text-center truncate" style={{ color: unlocked ? b.tint : 'rgba(255,255,255,0.08)', opacity: unlocked ? 0.6 : 1 }}>
                      {unlocked ? b.name : '???'}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ 6. JOHNNY'S OBSERVATIONS ═══ */}
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2 mb-3">
            <img src={johnnyImg} alt="Johnny" className="w-8 h-8" />
            <h3 className="text-sm font-bold text-white">Johnny's Notes</h3>
            <BookOpen className="w-3.5 h-3.5 text-white/25" />
          </div>
          {observations.length > 0 ? observations.map((obs, i) => {
            const ObsIcon = OBS_ICONS[obs.icon] || Star;
            const obsColor = OBS_COLORS[obs.icon] || '#fff';
            return (
              <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${obsColor}33` }}>
                  <ObsIcon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: obsColor, opacity: 0.6 }} />
                </div>
                <p className="text-[13px] text-white/50 leading-relaxed">{obs.text}</p>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center gap-2 py-3">
              <img src={johnnyImg} alt="Johnny" className="w-12 h-12" />
              <p className="text-sm text-white/30">I'm still getting to know you!</p>
              <p className="text-xs text-white/20">Complete your first quest and I'll share what I learn.</p>
            </div>
          )}
        </div>

        {/* ═══ 7. SETTINGS BUTTON ═══ */}
        <button onClick={() => setSettingsOpen(true)}
          className="w-full h-12 rounded-2xl flex items-center gap-3 px-4"
          style={{ background: 'rgba(255,255,255,0.10)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Settings className="w-4 h-4 text-white/40" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-left text-sm text-white/40">Settings</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/15" />
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
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <Icon className="w-4 h-4 text-white/50" strokeWidth={1.5} />
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
        @keyframes node-bounce { 0%, 100% { transform: translateY(0) translateX(-50%); } 50% { transform: translateY(-6px) translateX(-50%); } }
        @keyframes gold-pulse { 0%, 100% { border-color: rgba(255,215,0,0.6); } 50% { border-color: rgba(255,215,0,1); } }
        @keyframes node-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes sparkle-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes star-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes sparkle-pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.2; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
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
