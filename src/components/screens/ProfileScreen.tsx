import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Lock, ChevronRight, Settings, Check, X, Plus, Trophy, Gift, Sparkles,
  UserCircle, Bell, Palette, Download, Shield, Info, Flame, Hourglass, Users, BookOpen, BookHeart, Eye, Zap, PiggyBank, AlertTriangle, Target, TrendingUp, Clock, Heart, Trash2, Building2, BarChart3
} from 'lucide-react';
import { getPersonaObservation } from '@/lib/personaMessaging';
import { useApp } from '@/context/AppContext';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { useToast } from '@/hooks/use-toast';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { QuestionnaireOverlay } from '@/components/profile/QuestionnaireOverlay';
import {
  QUEST_NODES, BADGES, getLevelTitle, getLevelTier, calculateCompleteness,
  getPersona, getJohnnyObservations, getDimensionScore, getModuleQuestions,
  getRiskLabel, getTimeLabel, getConfidenceLabel, getSocialLabel, getDominantScript, getPersonaAbbrev, calculateClarityScore,
} from '@/lib/profileData';
import avatarImg from '@/assets/avatar.png';
import johnnyImg from '@/assets/johnny.png';

// ── Observation icon map ──
const OBS_ICONS: Record<string, any> = { Eye, Zap, PiggyBank, Clock, AlertTriangle, Star, TrendingUp, Target };
const OBS_COLORS: Record<string, string> = {
  Eye: '#3B82F6', Zap: '#F97316', PiggyBank: '#34C759', Clock: '#14B8A6',
  Star: '#EAB308', AlertTriangle: '#F97316', TrendingUp: '#34C759', Target: '#EC4899',
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

// Orbital layout constants
const ORBIT_RADIUS = 140;
const START_ANGLE = -90;

// Node color map
const NODE_COLORS: Record<string, { bg: string; shadow: string }> = {
  clarity: { bg: '#3B82F6', shadow: '#1D4ED8' },
  module0: { bg: '#8B5CF6', shadow: '#6D28D9' },
  module1: { bg: '#F97316', shadow: '#C2410C' },
  module2: { bg: '#14B8A6', shadow: '#0D9488' },
  module3: { bg: '#6366F1', shadow: '#4338CA' },
  module4: { bg: '#EC4899', shadow: '#BE185D' },
  module5: { bg: '#EAB308', shadow: '#A16207' },
  knowledge: { bg: '#E5E7EB', shadow: '#D1D5DB' },
  execution: { bg: '#E5E7EB', shadow: '#D1D5DB' },
};

// Node icon map for badge overlays on completed nodes
const NODE_ICON_MAP: Record<string, any> = {
  clarity: BarChart3, module0: UserCircle, module1: Flame, module2: Hourglass,
  module3: Shield, module4: Users, module5: BookHeart, knowledge: BookOpen, execution: Building2,
};

// ══════════════════════════════════════════════
// Result node content renderer
// ══════════════════════════════════════════════
function getResultContent(nodeKey: string, refreshKey: number): { main: React.ReactNode; sub: string } | null {
  if (nodeKey === 'clarity') {
    try {
      const cs = JSON.parse(localStorage.getItem('jfb_clarityScore') || 'null');
      if (!cs) return null;
      return {
        main: <><span style={{ fontSize: 24, fontWeight: 700 }}>{cs.total}</span><span style={{ fontSize: 11, opacity: 0.5 }}>/ 100</span></>,
        sub: '',
      };
    } catch { return null; }
  }
  if (nodeKey === 'module0') {
    try {
      const a = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      const p = getPersona(a);
      if (!p) return null;
      return {
        main: <span style={{ fontSize: 14, fontWeight: 700 }}>{getPersonaAbbrev(p.n)}</span>,
        sub: p.n,
      };
    } catch { return null; }
  }
  // Modules 1-5: score + label
  const scoreModules: Record<string, { suffix: string; labelFn: (s: number) => string }> = {
    module1: { suffix: 'risk', labelFn: getRiskLabel },
    module2: { suffix: 'time', labelFn: getTimeLabel },
    module3: { suffix: 'conf.', labelFn: getConfidenceLabel },
    module4: { suffix: 'social', labelFn: getSocialLabel },
  };
  if (scoreModules[nodeKey]) {
    try {
      const a = JSON.parse(localStorage.getItem(`jfb_${nodeKey}_answers`) || 'null');
      const score = getDimensionScore(nodeKey, a);
      const { suffix, labelFn } = scoreModules[nodeKey];
      return {
        main: <><span style={{ fontSize: 24, fontWeight: 700 }}>{score}</span><span style={{ fontSize: 11, opacity: 0.5 }}> {suffix}</span></>,
        sub: labelFn(score),
      };
    } catch { return null; }
  }
  if (nodeKey === 'module5') {
    try {
      const a = JSON.parse(localStorage.getItem('jfb_module5_answers') || 'null');
      const script = getDominantScript(a);
      const emotion = a?.m6 || '';
      return {
        main: <span style={{ fontSize: 14, fontWeight: 700 }}>{script}</span>,
        sub: emotion,
      };
    } catch { return null; }
  }
  return null;
}

// Clarity mini bar
function ClarityMiniBar() {
  try {
    const cs = JSON.parse(localStorage.getItem('jfb_clarityScore') || 'null');
    if (!cs) return null;
    const total = cs.spending + cs.saving + cs.planning;
    if (total === 0) return null;
    return (
      <div className="flex gap-0.5 mt-1" style={{ width: 48, height: 4 }}>
        <div style={{ flex: cs.spending, background: '#F97316', borderRadius: 2 }} />
        <div style={{ flex: cs.saving, background: '#34C759', borderRadius: 2 }} />
        <div style={{ flex: cs.planning, background: '#8B5CF6', borderRadius: 2 }} />
      </div>
    );
  } catch { return null; }
}

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
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetAll = useCallback(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('jfb_') || k === 'jfb-budget-data');
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }, []);

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

  // ── Badge unlocks ──
  const earnedBadges: string[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('jfb_badges') || '[]'); } catch { return []; }
  }, [refreshKey]);

  const allBadgeUnlocks = useMemo(() => {
    const u: Record<string, boolean> = {};
    BADGES.forEach(b => { u[b.key] = earnedBadges.includes(b.key); });
    if (config.setupComplete) u['know-thyself'] = true;
    if (transactions.length >= 10) u['tracker'] = true;
    if (goals.some(g => g.saved >= g.target && g.target > 0)) u['goal-getter'] = true;
    if (hasUsedWhatIf) u['explorer'] = true;
    if (hasCompletedMonth) u['on-track'] = true;
    if (hasUsed5YearZoom) u['time-traveler'] = true;
    return u;
  }, [earnedBadges, config, transactions.length, goals, hasUsedWhatIf, hasCompletedMonth, hasUsed5YearZoom]);

  const featuredBadges = useMemo(() => BADGES.filter(b => allBadgeUnlocks[b.key]).slice(0, 3), [allBadgeUnlocks]);
  const totalEarned = BADGES.filter(b => allBadgeUnlocks[b.key]).length;

  // ── Node status ──
  const getNodeStatus = useCallback((node: typeof QUEST_NODES[0]) => {
    if (node.status === 'coming-soon') return 'coming-soon' as const;
    if (doneFlags[node.key]) return 'completed' as const;
    const prereqsMet = node.prereqs.every(p => doneFlags[p]);
    if (prereqsMet) return 'current' as const;
    return 'locked' as const;
  }, [doneFlags]);

  const nextQuestName = useMemo(() => {
    const next = QUEST_NODES.find(n => getNodeStatus(n) === 'current');
    return next?.name || '';
  }, [getNodeStatus]);

  const handleNodeTap = useCallback((node: typeof QUEST_NODES[0], status: string) => {
    if (status === 'coming-soon') { toast({ title: `${node.name} coming soon!` }); return; }
    if (status === 'locked') {
      const prereqName = QUEST_NODES.find(n => n.key === node.prereqs[0])?.name || 'previous quest';
      toast({ title: `Complete ${prereqName} first` });
      return;
    }
    if (status === 'completed') {
      // Tap completed node to view results (toast for now)
      toast({ title: `${node.name} ✓`, description: 'Already completed!' });
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

  return (
    <div className="h-full overflow-auto pb-0">
      <div className="px-5 pt-10 pb-2 space-y-6">

        {/* ═══ 1. ORBITAL LAYOUT ═══ */}
        {(() => {
          const totalNodes = QUEST_NODES.length;

          return (
            <div className="relative w-full" style={{ height: 420 }}>
              {/* SVG arc connections */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 420" preserveAspectRatio="xMidYMid meet" style={{ zIndex: 0 }}>
                {QUEST_NODES.map((node, i) => {
                  if (i === totalNodes - 1) return null;
                  const angle1 = START_ANGLE + (i * (360 / totalNodes));
                  const angle2 = START_ANGLE + ((i + 1) * (360 / totalNodes));
                  const rad1 = (angle1 * Math.PI) / 180;
                  const rad2 = (angle2 * Math.PI) / 180;
                  const cx = 210, cy = 210, r = ORBIT_RADIUS;
                  const x1 = cx + Math.cos(rad1) * r;
                  const y1 = cy + Math.sin(rad1) * r;
                  const x2 = cx + Math.cos(rad2) * r;
                  const y2 = cy + Math.sin(rad2) * r;

                  const s1 = getNodeStatus(node);
                  const s2 = getNodeStatus(QUEST_NODES[i + 1]);
                  const bothCompleted = s1 === 'completed' && s2 === 'completed';
                  const hasCompleted = s1 === 'completed' || s2 === 'completed';
                  const hasCurrent = s1 === 'current' || s2 === 'current';

                  let strokeColor = 'rgba(255,255,255,0.05)';
                  let dashArray: string | undefined = '8 6';
                  if (bothCompleted) { strokeColor = 'rgba(255,255,255,0.20)'; dashArray = undefined; }
                  else if (hasCompleted && hasCurrent) { strokeColor = 'rgba(255,255,255,0.15)'; dashArray = undefined; }
                  else if (hasCurrent) { strokeColor = 'rgba(255,255,255,0.08)'; }

                  return (
                    <path key={i}
                      d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                      fill="none" stroke={strokeColor} strokeWidth="3"
                      strokeDasharray={dashArray}
                    />
                  );
                })}
              </svg>

              {/* Avatar center */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ zIndex: 2 }}>
                <img src={avatarImg} alt="Avatar" className="w-[100px] h-[100px] object-contain" style={{ animation: 'avatar-bob 2s ease-in-out infinite' }} />
                <span className="text-lg font-bold text-white mt-1">{userName}</span>
                <span className="text-xs text-white/40">◆ {levelTitle} ◆</span>
              </div>

              {/* Orbital nodes */}
              {QUEST_NODES.map((node, i) => {
                const status = getNodeStatus(node);
                const Icon = node.Icon;
                const colors = NODE_COLORS[node.key] || { bg: '#D1D5DB', shadow: '#9CA3AF' };
                const angle = START_ANGLE + (i * (360 / totalNodes));
                const radians = (angle * Math.PI) / 180;
                const x = Math.cos(radians) * ORBIT_RADIUS;
                const y = Math.sin(radians) * ORBIT_RADIUS;

                const isCompleted = status === 'completed';
                const nodeSize = status === 'current' ? 80 : isCompleted ? 72 : status === 'coming-soon' ? 60 : 68;
                const iconSize = status === 'current' ? 30 : isCompleted ? 28 : status === 'coming-soon' ? 20 : 24;
                const half = nodeSize / 2;

                // Get result content for completed nodes
                const resultContent = isCompleted ? getResultContent(node.key, refreshKey) : null;
                const NodeBadgeIcon = NODE_ICON_MAP[node.key] || Icon;

                return (
                  <motion.div key={node.key}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `calc(50% + ${x}px - ${half}px)`,
                      top: `calc(50% + ${y}px - ${half}px)`,
                      zIndex: 1,
                      animation: status === 'current' ? 'node-bounce 1.5s ease-in-out infinite' : undefined,
                    }}
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}>

                    {/* START bubble for current node */}
                    {status === 'current' && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ zIndex: 3 }}>
                        <div className="px-3 py-1 rounded-[10px] bg-white shadow-lg">
                          <span className="text-[11px] font-bold" style={{ color: '#8B5CF6' }}>START</span>
                        </div>
                        <div className="w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid white' }} />
                      </div>
                    )}

                    <button onClick={() => handleNodeTap(node, status)} className="flex flex-col items-center">
                      {/* Circle */}
                      <div className="relative rounded-full flex items-center justify-center"
                        style={{
                          width: nodeSize, height: nodeSize,
                          background: isCompleted ? colors.bg
                            : status === 'current' ? '#A855F7'
                            : status === 'coming-soon' ? '#E5E7EB'
                            : '#D1D5DB',
                          boxShadow: isCompleted ? `0 5px 0 ${colors.shadow}`
                            : status === 'current' ? '0 6px 0 #7C3AED'
                            : status === 'coming-soon' ? '0 3px 0 #D1D5DB'
                            : '0 4px 0 #9CA3AF',
                          border: status === 'current' ? '3px solid #FFD700'
                            : status === 'coming-soon' ? '2px dashed #D1D5DB'
                            : 'none',
                          ...(status === 'current' ? { animation: 'gold-pulse 1.5s ease-in-out infinite' } : {}),
                        }}>

                        {/* Content: result data for completed, icon for others */}
                        {isCompleted && resultContent ? (
                          <div className="flex flex-col items-center justify-center text-white leading-none">
                            {resultContent.main}
                          </div>
                        ) : (
                          <Icon className="relative z-10" strokeWidth={2.5}
                            style={{
                              width: iconSize, height: iconSize,
                              color: isCompleted ? 'white'
                                : status === 'current' ? 'white'
                                : status === 'coming-soon' ? '#D1D5DB'
                                : '#9CA3AF',
                            }} />
                        )}

                        {status === 'locked' && <Lock className="w-3.5 h-3.5 absolute z-20" style={{ color: '#6B7280' }} />}

                        {/* Icon badge top-left for completed */}
                        {isCompleted && (
                          <div className="absolute w-6 h-6 rounded-full flex items-center justify-center z-20"
                            style={{ background: colors.shadow, top: -4, left: -4, border: '2px solid rgba(255,255,255,0.2)' }}>
                            <NodeBadgeIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        )}

                        {/* Green check badge bottom-right for completed */}
                        {isCompleted && (
                          <div className="absolute w-5 h-5 rounded-full flex items-center justify-center z-20" style={{ background: '#16A34A', bottom: -2, right: -2, border: '2px solid rgba(255,255,255,0.2)' }}>
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Label below node */}
                      <div className="mt-1 text-center" style={{ width: 80 }}>
                        <p style={{
                          fontSize: isCompleted ? 11 : status === 'coming-soon' ? 9 : status === 'locked' ? 10 : 12,
                          fontWeight: (isCompleted || status === 'current') ? 700 : 400,
                          color: isCompleted ? 'white'
                            : status === 'current' ? 'white'
                            : status === 'locked' ? 'rgba(255,255,255,0.2)'
                            : 'rgba(255,255,255,0.12)',
                          lineHeight: '1.2',
                        }}>{node.name}</p>
                        {/* Subtitle for completed result */}
                        {isCompleted && resultContent?.sub && (
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{resultContent.sub}</p>
                        )}
                        {/* Clarity mini bar */}
                        {isCompleted && node.key === 'clarity' && (
                          <div className="flex justify-center"><ClarityMiniBar /></div>
                        )}
                        {status === 'current' && (
                          <p className="text-[9px] text-white/30 mt-0.5">{node.subtitle}</p>
                        )}
                        {status === 'locked' && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)' }}>Locked</p>}
                        {status === 'coming-soon' && <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.08)' }}>Soon</p>}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}

        {/* ═══ SCORE BADGE ═══ */}
        <div className="flex justify-center -mt-2">
          <div className="flex items-center gap-2 rounded-full px-5 h-9" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <Star className="w-4 h-4 text-[#FFD700]" fill="#FFD700" style={{ animation: 'star-pulse 2s ease-in-out infinite' }} />
            <span className="text-sm font-bold text-white">Score: {animatedScore}/100</span>
          </div>
        </div>

        {/* ═══ LEVEL PROGRESS ═══ */}
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

        {/* ═══ BADGE SHOWCASE ═══ */}
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

        {/* ═══ JOHNNY'S OBSERVATIONS ═══ */}
        <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2 mb-3">
            <img src={johnnyImg} alt="Johnny" className="w-8 h-8" />
            <h3 className="text-sm font-bold text-white">Johnny's Notes</h3>
            <BookOpen className="w-3.5 h-3.5 text-white/25" />
          </div>
          {(() => {
            const personaObs = persona ? getPersonaObservation(persona.n) : null;
            const allObs = personaObs ? [personaObs, ...observations] : observations;
            if (allObs.length > 0) {
              return allObs.map((obs: any, i: number) => {
                const ObsIcon = OBS_ICONS[obs.icon] || Star;
                const obsColor = OBS_COLORS[obs.icon] || obs.color || '#fff';
                return (
                  <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${obsColor}33` }}>
                      <ObsIcon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: obsColor, opacity: 0.6 }} />
                    </div>
                    <p className="text-[13px] text-white/50 leading-relaxed">{obs.text}</p>
                  </div>
                );
              });
            }
            return (
              <div className="flex flex-col items-center gap-2 py-3">
                <img src={johnnyImg} alt="Johnny" className="w-12 h-12" />
                <p className="text-sm text-white/30">I'm still getting to know you!</p>
                <p className="text-xs text-white/20">Complete your first quest and I'll share what I learn.</p>
              </div>
            );
          })()}
        </div>

        {/* ═══ SETTINGS BUTTON ═══ */}
        <button onClick={() => setSettingsOpen(true)}
          className="w-full h-12 rounded-2xl flex items-center gap-3 px-4"
          style={{ background: 'rgba(255,255,255,0.10)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Settings className="w-4 h-4 text-white/40" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-left text-sm text-white/40">Settings</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/15" />
        </button>

        {/* ═══ SPACER ═══ */}
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
              const RowIcon = row.icon;
              return (
                <button key={i} onClick={row.action}
                  className="w-full h-[52px] rounded-2xl flex items-center gap-3 px-4"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <RowIcon className="w-4 h-4 text-white/50" strokeWidth={1.5} />
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

            {/* Reset button */}
            <div className="pt-4 border-t border-white/[0.06] mt-2">
              {!confirmReset ? (
                <button onClick={() => setConfirmReset(true)}
                  className="w-full h-[52px] rounded-2xl flex items-center gap-3 px-4"
                  style={{ background: 'rgba(239,68,68,0.10)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                    <Trash2 className="w-4 h-4 text-red-400/70" strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-left text-sm text-red-400/70">Reset &amp; Start Over</span>
                  <ChevronRight className="w-4 h-4 text-red-400/30" />
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-400 text-center">This will permanently delete all your data.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmReset(false)}
                      className="flex-1 h-10 rounded-xl text-sm text-white/50"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>Cancel</button>
                    <button onClick={handleResetAll}
                      className="flex-1 h-10 rounded-xl text-sm font-semibold text-white"
                      style={{ background: 'rgba(239,68,68,0.5)' }}>Delete Everything</button>
                  </div>
                </div>
              )}
            </div>
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
        @keyframes node-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes gold-pulse { 0%, 100% { border-color: rgba(255,215,0,0.5); } 50% { border-color: rgba(255,215,0,1); } }
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
