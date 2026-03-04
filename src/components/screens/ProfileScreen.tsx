import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Lock, ChevronRight, Settings, Check, X, Plus, Trophy, Gift, Sparkles,
  UserCircle, Bell, Palette, Download, Shield, Info, Flame, Hourglass, Users, BookOpen, BookHeart, Eye, Zap, PiggyBank, AlertTriangle, Target, TrendingUp, Clock, Heart, Trash2, Building2, BarChart3
} from 'lucide-react';
import { getPersonaObservation } from '@/lib/personaMessaging';
import { BADGE_IMAGES } from '@/lib/badgeImages';
import { useApp } from '@/context/AppContext';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { useToast } from '@/hooks/use-toast';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { QuestionnaireOverlay } from '@/components/profile/QuestionnaireOverlay';
import { MyWorldScreen } from '@/components/screens/MyWorldScreen';
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
  const { goals, setActiveTab, setGoals } = useApp();
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
  const [worldOpen, setWorldOpen] = useState(false);

  // Listen for openMyWorld event from Goals macro block
  useEffect(() => {
    const handler = () => setWorldOpen(true);
    window.addEventListener('openMyWorld', handler);
    return () => window.removeEventListener('openMyWorld', handler);
  }, []);

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

  // ── Find first current node ──
  const firstCurrentKey = useMemo(() => {
    for (const node of QUEST_NODES) {
      if (node.status === 'coming-soon') continue;
      if (doneFlags[node.key]) continue;
      const prereqsMet = node.prereqs.every(p => doneFlags[p]);
      if (prereqsMet) return node.key;
    }
    return null;
  }, [doneFlags]);

  // ── Node status (no locks — all 7 modules always available) ──
  const getNodeStatus = useCallback((node: typeof QUEST_NODES[0]) => {
    if (node.status === 'coming-soon') return 'coming-soon' as const;
    if (doneFlags[node.key]) return 'completed' as const;
    return node.key === firstCurrentKey ? 'current' as const : 'available' as const;
  }, [doneFlags, firstCurrentKey]);

  const nextQuestName = useMemo(() => {
    const next = QUEST_NODES.find(n => getNodeStatus(n) === 'current');
    return next?.name || '';
  }, [getNodeStatus]);

  const handleNodeTap = useCallback((node: typeof QUEST_NODES[0], status: string) => {
    if (status === 'coming-soon') { toast({ title: `${node.name} coming soon!` }); return; }
    if (status === 'completed') {
      toast({ title: `${node.name} ✓`, description: 'Already completed!' });
      return;
    }
    // Both 'current' and 'available' open the questionnaire
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

                  let strokeColor = 'rgba(45,36,64,0.08)';
                  let dashArray: string | undefined = '8 6';
                  if (bothCompleted) { strokeColor = 'rgba(139,92,246,0.25)'; dashArray = undefined; }
                  else if (hasCompleted && hasCurrent) { strokeColor = 'rgba(139,92,246,0.15)'; dashArray = undefined; }
                  else if (hasCurrent) { strokeColor = 'rgba(45,36,64,0.12)'; }

                  return (
                    <path key={i}
                      d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                      fill="none" stroke={strokeColor} strokeWidth="3"
                      strokeDasharray={dashArray}
                    />
                  );
                })}
              </svg>

              {/* Avatar center - tap to open My World */}
              <button
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ zIndex: 2 }}
                onClick={() => setWorldOpen(true)}
              >
                <img src={avatarImg} alt="Avatar" className="w-[100px] h-[100px] object-contain" style={{ animation: 'avatar-bob 2s ease-in-out infinite' }} />
                <span className="text-lg font-bold mt-1" style={{ color: '#2D2440' }}>{userName}</span>
                <span className="text-xs" style={{ color: '#5C4F6E' }}>◆ {levelTitle} ◆</span>
              </button>

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
                const isAvailable = status === 'available';
                const nodeSize = status === 'current' ? 80 : status === 'coming-soon' ? 60 : 72;
                const iconSize = status === 'current' ? 28 : isCompleted ? 28 : status === 'coming-soon' ? 20 : 26;
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
                            : status === 'coming-soon' ? '#E8EAED'
                            : '#C9CCD1',
                          boxShadow: isCompleted ? `0 5px 0 ${colors.shadow}`
                            : status === 'current' ? '0 6px 0 #A0A4AA'
                            : status === 'coming-soon' ? '0 3px 0 #D1D4D8'
                            : '0 5px 0 #A0A4AA',
                          border: status === 'current' ? '3px solid #FFD700'
                            : status === 'coming-soon' ? '2px dashed #D1D4D8'
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
                              color: status === 'coming-soon' ? 'rgba(255,255,255,0.20)' : 'white',
                            }} />
                        )}

                        {/* No lock icons — all modules available */}

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
                          fontSize: isCompleted ? 11 : status === 'coming-soon' ? 9 : 12,
                          fontWeight: 600,
                          color: isCompleted ? 'white'
                            : status === 'coming-soon' ? 'rgba(45,36,64,0.2)'
                            : '#2D2440',
                          lineHeight: '1.2',
                          textShadow: isCompleted ? '0 1px 3px rgba(0,0,0,0.25)' : status !== 'coming-soon' ? '0 1px 3px rgba(255,255,255,0.5)' : undefined,
                        }}>{node.name}</p>
                        {isCompleted && resultContent?.sub && (
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1, textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{resultContent.sub}</p>
                        )}
                        {isCompleted && node.key === 'clarity' && (
                          <div className="flex justify-center"><ClarityMiniBar /></div>
                        )}
                        {!isCompleted && status !== 'coming-soon' && (
                          <p style={{ fontSize: 10, color: '#8A7FA0', marginTop: 2 }}>{node.subtitle}</p>
                        )}
                        {status === 'coming-soon' && <p style={{ fontSize: 8, color: 'rgba(45,36,64,0.15)' }}>Coming soon</p>}
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
          <div className="flex items-center gap-2 rounded-full px-5 h-9 frosted-card" style={{ borderRadius: 999 }}>
            <Star className="w-4 h-4 text-[#FFD700]" fill="#FFD700" style={{ animation: 'star-pulse 2s ease-in-out infinite' }} />
            <span className="text-sm font-bold" style={{ color: '#2D2440' }}>Score: {animatedScore}/100</span>
          </div>
        </div>

        {/* ═══ LEVEL PROGRESS ═══ */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold" style={{ color: '#2D2440' }}>{levelTitle}</span>
            <span style={{ color: '#8A7FA0' }}>{tier.next || 'Max Level'}</span>
          </div>
          <div className="w-full h-2.5 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
            <motion.div className="h-full rounded" style={{ background: 'linear-gradient(90deg, #8B5CF6, #EC4899)' }} initial={{ width: 0 }} animate={{ width: `${tierProgress}%` }} transition={{ delay: 0.3, duration: 0.6 }} />
          </div>
          {nextQuestName && <p className="text-xs" style={{ color: '#8A7FA0' }}>Next: Complete {nextQuestName} to level up</p>}
        </div>

        {/* ═══ JOHNNY'S NOTES (above badges) ═══ */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 4px 20px rgba(45,36,64,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <img src={johnnyImg} alt="Johnny" className="w-8 h-8 rounded-full" style={{ objectFit: 'contain' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#2D1F4E', margin: 0 }}>Johnny's Notes</h3>
          </div>
          {(() => {
            const personaObs = persona ? getPersonaObservation(persona.n) : null;
            const allObs = personaObs ? [personaObs, ...observations] : observations;
            const dotColors = ['#22C55E', '#FBBF24', '#EC4899', '#3B82F6', '#8B5CF6'];
            if (allObs.length > 0) {
              return allObs.map((obs: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < allObs.length - 1 ? 10 : 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: dotColors[i % dotColors.length],
                    marginTop: 6, flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: 14, color: '#4A3D63', lineHeight: 1.5, margin: 0 }}>{obs.text}</p>
                    {obs.action && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#8B5CF6', cursor: 'pointer' }}>
                        {obs.action} →
                      </span>
                    )}
                  </div>
                </div>
              ));
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                <img src={johnnyImg} alt="Johnny" className="w-12 h-12" />
                <p style={{ fontSize: 14, color: '#5C4F6E', margin: 0 }}>I'm still getting to know you!</p>
                <p style={{ fontSize: 12, color: '#8A7FA0', margin: 0 }}>Complete your first quest and I'll share what I learn.</p>
              </div>
            );
          })()}
        </div>

        {/* ═══ ALL BADGES (compact) ═══ */}
        <div style={{
          background: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 14,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2D1F4E' }}>🏆 All Badges</span>
            <span style={{ fontSize: 11, color: '#8A7FA0' }}>{totalEarned}/{BADGES.length} collected</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {BADGES.map((b, i) => {
              const unlocked = allBadgeUnlocks[b.key];
              const badgeImg = BADGE_IMAGES[b.key];
              return (
                <motion.button key={b.key} onClick={() => handleBadgeTap(b)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 + i * 0.03 }}
                  className="shrink-0 flex flex-col items-center gap-0.5">
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: unlocked ? 'rgba(139,92,246,0.06)' : 'rgba(0,0,0,0.02)',
                    border: unlocked ? '1px solid rgba(139,92,246,0.1)' : '1px solid rgba(0,0,0,0.04)',
                  }}>
                    {unlocked && badgeImg ? (
                      <img src={badgeImg} alt={b.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(45,36,64,0.12)' }}>?</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 8, width: 40, textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: unlocked ? '#8B5CF6' : 'rgba(45,36,64,0.15)',
                    opacity: unlocked ? 0.6 : 1,
                  }}>
                    {unlocked ? b.name : '???'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ═══ SETTINGS BUTTON ═══ */}
        <button onClick={() => setSettingsOpen(true)}
          className="w-full h-12 rounded-2xl flex items-center gap-3 px-4 frosted-card" style={{ borderRadius: 16 }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.3)' }}>
            <Settings className="w-4 h-4" strokeWidth={1.5} style={{ color: '#5C4F6E' }} />
          </div>
          <span className="flex-1 text-left text-sm" style={{ color: '#5C4F6E' }}>Settings</span>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: '#8A7FA0' }} />
        </button>

        {/* ═══ SPACER ═══ */}
        <div className="h-20" />
      </div>

      {/* ── Settings Sheet ── */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-transparent p-0" style={{ maxHeight: '85vh' }}>
          <div className="jfb-bg rounded-t-3xl p-5 space-y-2 overflow-y-auto" style={{ maxHeight: '85vh', paddingBottom: 40 }}>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-lg" style={{ color: '#2D2440' }}>Settings</SheetTitle>
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
                  style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.4)' }}>
                    <RowIcon className="w-4 h-4" strokeWidth={1.5} style={{ color: '#5C4F6E' }} />
                  </div>
                  <span className="flex-1 text-left text-sm" style={{ color: '#2D2440' }}>{row.label}</span>
                  <ChevronRight className="w-4 h-4" style={{ color: '#8A7FA0' }} />
                </button>
              );
            })}
            {editingName && (
              <div className="flex gap-2 px-1 pt-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                  className="flex-1 h-10 rounded-xl px-3 outline-none frosted-input" />
                <button onClick={handleSaveName} className="h-10 px-4 rounded-xl gradient-primary text-white text-sm font-semibold">Save</button>
              </div>
            )}

            {/* Demo Mode: Load Demo Goals */}
            {/* Demo Mode: Load Demo Goals */}
              <div className="pt-3 border-t border-white/[0.15] mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px]" style={{ color: '#8A7FA0' }}>🎬 Demo Mode</span>
                </div>
                <button onClick={() => {
  // ═══════════════════════════════════════════════
  // JFB DEMO DATA LOADER v2
  // Populates: Goals, Transactions (2 months), Subscriptions,
  // Assessment scores, Previous month snapshot, Income
  // ═══════════════════════════════════════════════

  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const prevMonth = new Date(yr, now.getMonth() - 1, 1);
  const prevYr = prevMonth.getFullYear();
  const prevMo = String(prevMonth.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = now.getDate();

  // ── 1. GOALS ──
  const demoGoals = [
    { id: crypto.randomUUID(), name: 'Dream House', icon: 'Home', target: 40000, saved: 30000, monthlyContribution: 200, targetDate: '', monthIndex: -1 },
    { id: crypto.randomUUID(), name: 'New Car', icon: 'Car', target: 10000, saved: 5000, monthlyContribution: 150, targetDate: '', monthIndex: -1 },
    { id: crypto.randomUUID(), name: 'Vacation', icon: 'Plane', target: 2000, saved: 1000, monthlyContribution: 75, targetDate: '', monthIndex: -1 },
    { id: crypto.randomUUID(), name: 'New Laptop', icon: 'Laptop', target: 2500, saved: 1875, monthlyContribution: 50, targetDate: '', monthIndex: -1 },
  ];
  setGoals(demoGoals);

  // ── 2. SEED TRANSACTIONS ──
  try {
    const bd = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
    const cats = bd.categories || [];
    const foodCat = cats.find((c: any) => c.name === 'Food');
    const entCat = cats.find((c: any) => c.name === 'Entertainment');
    const shopCat = cats.find((c: any) => c.name === 'Shopping');
    const lifeCat = cats.find((c: any) => c.name === 'Lifestyle' || c.name === 'Personal');
    const subsCat = cats.find((c: any) => c.name === 'Subscriptions' || c.name === 'Subs');

    if (!foodCat || !entCat || !shopCat) {
      toast({ title: 'Complete Clarity first', description: 'Spending categories need to exist before loading demo data.' });
      return;
    }

    // Helper to create a transaction
    const tx = (amt: number, catId: string, desc: string, day: number, month: string, year: number | string, recurring = false): any => ({
      id: crypto.randomUUID(),
      amount: amt,
      type: 'expense' as const,
      categoryId: catId,
      description: desc,
      date: `${year}-${month}-${String(day).padStart(2, '0')}`,
      isRecurring: recurring,
    });

    // ── CURRENT MONTH transactions (spread across full month up to today) ──
    const currentTxs: any[] = [];

    // Food - frequent, realistic grocery pattern
    if (dayOfMonth >= 1) currentTxs.push(tx(52, foodCat.id, 'Weekly Groceries', 1, mo, yr));
    if (dayOfMonth >= 3) currentTxs.push(tx(4, foodCat.id, 'Coffee Shop', 3, mo, yr));
    if (dayOfMonth >= 4) currentTxs.push(tx(18, foodCat.id, 'Uber Eats', 4, mo, yr));
    if (dayOfMonth >= 5) currentTxs.push(tx(6, foodCat.id, 'Bakery', 5, mo, yr));
    if (dayOfMonth >= 7) currentTxs.push(tx(45, foodCat.id, 'Grocery Store', 7, mo, yr));
    if (dayOfMonth >= 8) currentTxs.push(tx(12, foodCat.id, 'Coffee Shop', 8, mo, yr));
    if (dayOfMonth >= 9) currentTxs.push(tx(15, foodCat.id, 'Uber Eats', 9, mo, yr));
    if (dayOfMonth >= 11) currentTxs.push(tx(8, foodCat.id, 'Bakery', 11, mo, yr));
    if (dayOfMonth >= 12) currentTxs.push(tx(5, foodCat.id, 'Coffee Shop', 12, mo, yr));
    if (dayOfMonth >= 14) currentTxs.push(tx(60, foodCat.id, 'Weekly Groceries', 14, mo, yr));
    if (dayOfMonth >= 16) currentTxs.push(tx(22, foodCat.id, 'Restaurant', 16, mo, yr));
    if (dayOfMonth >= 18) currentTxs.push(tx(7, foodCat.id, 'Coffee Shop', 18, mo, yr));
    if (dayOfMonth >= 20) currentTxs.push(tx(48, foodCat.id, 'Grocery Store', 20, mo, yr));
    if (dayOfMonth >= 22) currentTxs.push(tx(14, foodCat.id, 'Uber Eats', 22, mo, yr));
    if (dayOfMonth >= 24) currentTxs.push(tx(5, foodCat.id, 'Coffee Shop', 24, mo, yr));
    if (dayOfMonth >= 26) currentTxs.push(tx(55, foodCat.id, 'Weekly Groceries', 26, mo, yr));
    if (dayOfMonth >= 28) currentTxs.push(tx(9, foodCat.id, 'Bakery', 28, mo, yr));

    // Entertainment - lumpy, weekend-heavy
    if (dayOfMonth >= 2) currentTxs.push(tx(35, entCat.id, 'Cinema', 2, mo, yr));
    if (dayOfMonth >= 9) currentTxs.push(tx(25, entCat.id, 'Concert Tickets', 9, mo, yr));
    if (dayOfMonth >= 15) currentTxs.push(tx(18, entCat.id, 'Bowling', 15, mo, yr));
    if (dayOfMonth >= 20) currentTxs.push(tx(35, entCat.id, 'Cinema', 20, mo, yr));
    if (dayOfMonth >= 25) currentTxs.push(tx(15, entCat.id, 'Escape Room', 25, mo, yr));

    // Shopping - a few bigger purchases
    if (dayOfMonth >= 3) currentTxs.push(tx(89, shopCat.id, 'Zara', 3, mo, yr));
    if (dayOfMonth >= 8) currentTxs.push(tx(45, shopCat.id, 'Amazon', 8, mo, yr));
    if (dayOfMonth >= 14) currentTxs.push(tx(32, shopCat.id, 'H&M', 14, mo, yr));
    if (dayOfMonth >= 19) currentTxs.push(tx(67, shopCat.id, 'Nike', 19, mo, yr));
    if (dayOfMonth >= 27) currentTxs.push(tx(28, shopCat.id, 'Amazon', 27, mo, yr));

    // Lifestyle
    if (lifeCat) {
      if (dayOfMonth >= 2) currentTxs.push(tx(25, lifeCat.id, 'Pharmacy', 2, mo, yr));
      if (dayOfMonth >= 10) currentTxs.push(tx(35, lifeCat.id, 'Haircut', 10, mo, yr));
      if (dayOfMonth >= 18) currentTxs.push(tx(15, lifeCat.id, 'Dry Cleaning', 18, mo, yr));
      if (dayOfMonth >= 23) currentTxs.push(tx(25, lifeCat.id, 'Pharmacy', 23, mo, yr));
    }

    // Subscriptions (recurring, 1st of month or specific billing dates)
    const subTarget = subsCat || entCat; // fallback to entertainment if no subs category
    if (dayOfMonth >= 1) currentTxs.push(tx(10, subTarget.id, 'Spotify', 1, mo, yr, true));
    if (dayOfMonth >= 1) currentTxs.push(tx(13, subTarget.id, 'Netflix', 1, mo, yr, true));
    if (dayOfMonth >= 4) currentTxs.push(tx(8, subTarget.id, 'Amazon Prime', 4, mo, yr, true));
    if (dayOfMonth >= 7) currentTxs.push(tx(10, subTarget.id, 'Apple TV+', 7, mo, yr, true));
    if (dayOfMonth >= 15) currentTxs.push(tx(12, subTarget.id, 'Adobe CC', 15, mo, yr, true));
    if (dayOfMonth >= 22) currentTxs.push(tx(3, subTarget.id, 'iCloud+', 22, mo, yr, true));
    if (dayOfMonth >= 28) currentTxs.push(tx(10, subTarget.id, 'Discord Nitro', 28, mo, yr, true));

    // Income transaction
    currentTxs.push({
      id: crypto.randomUUID(),
      amount: bd.config?.monthlyIncome || 2500,
      type: 'income',
      categoryId: '',
      description: 'Monthly Salary',
      date: `${yr}-${mo}-01`,
      isRecurring: true,
    });

    // ── PREVIOUS MONTH transactions (full month for comparison) ──
    const prevTxs: any[] = [
      // Food
      tx(48, foodCat.id, 'Weekly Groceries', 1, prevMo, prevYr),
      tx(5, foodCat.id, 'Coffee Shop', 2, prevMo, prevYr),
      tx(12, foodCat.id, 'Uber Eats', 4, prevMo, prevYr),
      tx(42, foodCat.id, 'Grocery Store', 7, prevMo, prevYr),
      tx(8, foodCat.id, 'Coffee Shop', 9, prevMo, prevYr),
      tx(55, foodCat.id, 'Weekly Groceries', 14, prevMo, prevYr),
      tx(18, foodCat.id, 'Restaurant', 16, prevMo, prevYr),
      tx(6, foodCat.id, 'Coffee Shop', 18, prevMo, prevYr),
      tx(50, foodCat.id, 'Grocery Store', 21, prevMo, prevYr),
      tx(15, foodCat.id, 'Uber Eats', 23, prevMo, prevYr),
      tx(52, foodCat.id, 'Weekly Groceries', 28, prevMo, prevYr),
      // Entertainment
      tx(30, entCat.id, 'Cinema', 5, prevMo, prevYr),
      tx(22, entCat.id, 'Bowling', 12, prevMo, prevYr),
      tx(40, entCat.id, 'Concert', 19, prevMo, prevYr),
      // Shopping
      tx(65, shopCat.id, 'Zara', 3, prevMo, prevYr),
      tx(38, shopCat.id, 'Amazon', 10, prevMo, prevYr),
      tx(55, shopCat.id, 'H&M', 22, prevMo, prevYr),
      // Lifestyle
      ...(lifeCat ? [
        tx(20, lifeCat.id, 'Pharmacy', 5, prevMo, prevYr),
        tx(30, lifeCat.id, 'Haircut', 15, prevMo, prevYr),
      ] : []),
      // Subs (previous month)
      tx(10, subTarget.id, 'Spotify', 1, prevMo, prevYr, true),
      tx(13, subTarget.id, 'Netflix', 1, prevMo, prevYr, true),
      tx(8, subTarget.id, 'Amazon Prime', 4, prevMo, prevYr, true),
      tx(10, subTarget.id, 'Apple TV+', 7, prevMo, prevYr, true),
      tx(12, subTarget.id, 'Adobe CC', 15, prevMo, prevYr, true),
      tx(3, subTarget.id, 'iCloud+', 22, prevMo, prevYr, true),
      tx(10, subTarget.id, 'Discord Nitro', 28, prevMo, prevYr, true),
      // Previous month income
      {
        id: crypto.randomUUID(),
        amount: bd.config?.monthlyIncome || 2500,
        type: 'income',
        categoryId: '',
        description: 'Monthly Salary',
        date: `${prevYr}-${prevMo}-01`,
        isRecurring: true,
      },
    ];

    // Merge into existing data (clear old mock, keep imported bank data)
    const existingNonMock = (bd.transactions || []).filter((t: any) =>
      t.description && t.description.startsWith('IMPORTED:')
    );
    bd.transactions = [...existingNonMock, ...prevTxs, ...currentTxs];

    // ── 3. PREVIOUS MONTH SNAPSHOT (for Month vs Month) ──
    const prevMonthKey = `${prevYr}-${prevMo}`;
    const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
    const expenseCats = cats.filter((c: any) => c.type === 'expense');
    const prevCatSpending: Record<string, number> = {};
    prevTxs.forEach((t: any) => {
      if (t.type === 'expense') {
        prevCatSpending[t.categoryId] = (prevCatSpending[t.categoryId] || 0) + t.amount;
      }
    });
    snapshots[prevMonthKey] = {
      month: prevMonthKey,
      income: bd.config?.monthlyIncome || 2500,
      categories: expenseCats.map((c: any) => ({
        id: c.id,
        name: c.name,
        budget: c.monthlyBudget || 0,
        spent: prevCatSpending[c.id] || 0,
      })),
      totalSpent: Object.values(prevCatSpending).reduce((a: number, b: any) => a + (b as number), 0),
      timestamp: Date.now(),
    };
    localStorage.setItem('jfb_month_snapshots', JSON.stringify(snapshots));

    // ── FIX CATEGORY BUDGETS to match demo spending ──
    const catBudgetMap: Record<string, number> = {
      'Food': 334,
      'Entertainment': 191,
      'Shopping': 241,
      'Lifestyle': 170,
      'Subscriptions': 66,
      'Subs': 66,
    };

    bd.categories = (bd.categories || []).map((c: any) => {
      if (c.type === 'expense' && catBudgetMap[c.name]) {
        return { ...c, monthlyBudget: catBudgetMap[c.name] };
      }
      return c;
    });

    // Also ensure income and savings are set
    bd.config = {
      ...bd.config,
      monthlyIncome: 2500,
      monthlySavingsTarget: 200,
      setupComplete: true,
    };

    localStorage.setItem('jfb-budget-data', JSON.stringify(bd));

  } catch (e) {
    console.error('Demo transaction error:', e);
  }

  // ── 4. SEED ASSESSMENT DATA ──
  // Clarity score
  localStorage.setItem('jfb_clarityScore', JSON.stringify({
    total: 63,
    spending: 22,
    saving: 18,
    planning: 23,
  }));
  localStorage.setItem('jfb_clarity_done', 'true');

  // Know Yourself (Module 0) - Steady Builder persona
  localStorage.setItem('jfb_module0_answers', JSON.stringify({
    q1: 'b', q2: 'a', q3: 'c', q4: 'b', q5: 'a', q6: 'b',
  }));
  localStorage.setItem('jfb_module0_done', 'true');

  // Risk Pulse (Module 1)
  localStorage.setItem('jfb_module1_answers', JSON.stringify({
    q1: 3, q2: 2, q3: 3, q4: 2, q5: 3,
  }));
  localStorage.setItem('jfb_module1_done', 'true');

  // Time Lens (Module 2)
  localStorage.setItem('jfb_module2_answers', JSON.stringify({
    q1: 4, q2: 3, q3: 3, q4: 4, q5: 3, q6: 4,
  }));
  localStorage.setItem('jfb_module2_done', 'true');

  // Badges
  localStorage.setItem('jfb_badges', JSON.stringify([
    'know-thyself', 'first-step', 'tracker',
  ]));

  // Misc flags
  localStorage.setItem('jfb_import_shown', 'true');
  localStorage.setItem('jfb_hasUsedWhatIf', 'true');
  localStorage.setItem('jfb_userName', 'Explorer');

  toast({ title: '🎬 Demo data loaded!', description: 'Goals, transactions (2 months), assessments, and subscriptions added. Reloading...' });
  setSettingsOpen(false);
  setTimeout(() => window.location.reload(), 500);
                }}
                  className="w-full h-[44px] rounded-2xl flex items-center justify-center gap-2 text-[13px] font-medium"
                  style={{ background: 'rgba(245,158,11,0.10)', border: '1.5px solid rgba(245,158,11,0.20)', color: '#5C4F6E' }}>
                  🎬 Load Demo Goals
                </button>
              </div>

            {/* Reset button */}
            <div className="pt-4 border-t border-white/[0.15] mt-2">
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
                      className="flex-1 h-10 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.35)', color: '#5C4F6E' }}>Cancel</button>
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
              <SheetTitle className="text-lg" style={{ color: '#2D2440' }}>Johnny F. Banks</SheetTitle>
              <SheetDescription style={{ color: '#5C4F6E' }}>JFB v0.1 MVP</SheetDescription>
            </SheetHeader>
            <p className="text-sm" style={{ color: '#5C4F6E' }}>Built with love to help you take control of your money through gamification and visual budgeting.</p>
            <p className="text-sm" style={{ color: '#8A7FA0' }}>All data stays on your device. No accounts, no tracking, no ads.</p>
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

      {/* My World overlay */}
      <AnimatePresence>
        {worldOpen && <MyWorldScreen onClose={() => setWorldOpen(false)} />}
      </AnimatePresence>
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
