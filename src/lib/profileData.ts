import {
  UserCircle, BarChart3, Flame, Hourglass, Shield, Users, BookOpen,
  Building2, Footprints, Brain, ClipboardCheck, PiggyBank,
  Compass, TrendingUp, Trophy, Clock
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──
export type QuestNode = {
  key: string; name: string; Icon: LucideIcon; subtitle: string;
  lsDone: string; lsAnswers: string;
  status: 'required' | 'optional' | 'coming-soon';
  prereqs: string[]; badgeKey: string;
};

export type Badge = {
  key: string; name: string; desc: string; hint: string;
  Icon: LucideIcon; tint: string;
};

export type QOption = string | { label: string; correct?: boolean };
export type QField = { key: string; label: string; icon?: string; prefix?: string };

export type ProfileQ = {
  id: string; text: string;
  type: 'text' | 'number' | 'slider' | 'single' | 'multi' | 'quiz' | 'scale5' | 'statements' | 'expenses' | 'compound';
  options?: QOption[];
  min?: number; max?: number; step?: number;
  minLabel?: string; maxLabel?: string;
  prefix?: string;
  statements?: string[];
  fields?: QField[];
  showIf?: (a: Record<string, any>) => boolean;
};

// ── Quest Nodes ──
export const QUEST_NODES: QuestNode[] = [
  { key: 'module0', name: 'Know Yourself', Icon: UserCircle, subtitle: '6 questions · 3 min', lsDone: 'jfb_module0_done', lsAnswers: 'jfb_module0_answers', status: 'required', prereqs: [], badgeKey: 'first-step' },
  { key: 'clarity', name: 'Financial Clarity', Icon: BarChart3, subtitle: '11 steps · 7 min', lsDone: 'jfb_clarity_done', lsAnswers: 'jfb_clarity_answers', status: 'required', prereqs: ['module0'], badgeKey: 'know-thyself' },
  { key: 'module1', name: 'Risk Pulse', Icon: Flame, subtitle: '6 questions · 3 min', lsDone: 'jfb_module1_done', lsAnswers: 'jfb_module1_answers', status: 'optional', prereqs: ['clarity'], badgeKey: 'risk-taker' },
  { key: 'module2', name: 'Time Lens', Icon: Hourglass, subtitle: '6 questions · 3 min', lsDone: 'jfb_module2_done', lsAnswers: 'jfb_module2_answers', status: 'optional', prereqs: ['clarity'], badgeKey: 'time-keeper' },
  { key: 'module3', name: 'Confidence', Icon: Shield, subtitle: '6 questions · 3 min', lsDone: 'jfb_module3_done', lsAnswers: 'jfb_module3_answers', status: 'optional', prereqs: ['clarity'], badgeKey: 'self-aware' },
  { key: 'module4', name: 'Social Mirror', Icon: Users, subtitle: '5 questions · 2 min', lsDone: 'jfb_module4_done', lsAnswers: 'jfb_module4_answers', status: 'optional', prereqs: ['clarity'], badgeKey: 'mirror' },
  { key: 'module5', name: 'Money Story', Icon: BookOpen, subtitle: '6 questions · 3 min', lsDone: 'jfb_module5_done', lsAnswers: 'jfb_module5_answers', status: 'optional', prereqs: ['clarity'], badgeKey: 'deep-diver' },
  { key: 'knowledge', name: 'Knowledge Tower', Icon: BookOpen, subtitle: 'Coming soon', lsDone: '', lsAnswers: '', status: 'coming-soon', prereqs: [], badgeKey: '' },
  { key: 'execution', name: 'Execution Hub', Icon: Building2, subtitle: 'Coming soon', lsDone: '', lsAnswers: '', status: 'coming-soon', prereqs: [], badgeKey: '' },
];

// ── Badges ──
export const BADGES: Badge[] = [
  { key: 'first-step', name: 'First Step', desc: 'Completed Know Yourself', hint: 'Complete the Know Yourself quest', Icon: Footprints, tint: '#8B5CF6' },
  { key: 'know-thyself', name: 'Know Thyself', desc: 'Completed Financial Clarity', hint: 'Complete the Financial Clarity quest', Icon: Brain, tint: '#5AC8FA' },
  { key: 'risk-taker', name: 'Risk Taker', desc: 'Completed Risk Pulse', hint: 'Complete the Risk Pulse quest', Icon: Flame, tint: '#FF9F0A' },
  { key: 'time-keeper', name: 'Time Keeper', desc: 'Completed Time Lens', hint: 'Complete the Time Lens quest', Icon: Hourglass, tint: '#14B8A6' },
  { key: 'self-aware', name: 'Self Aware', desc: 'Completed Confidence Check', hint: 'Complete the Confidence quest', Icon: Shield, tint: '#6366F1' },
  { key: 'mirror', name: 'Mirror Mirror', desc: 'Completed Social Mirror', hint: 'Complete the Social Mirror quest', Icon: Users, tint: '#FF6B9D' },
  { key: 'deep-diver', name: 'Deep Diver', desc: 'Completed Money Story', hint: 'Complete the Money Story quest', Icon: BookOpen, tint: '#3B82F6' },
  { key: 'tracker', name: 'Tracker', desc: '10+ transactions logged', hint: 'Log 10 or more transactions', Icon: ClipboardCheck, tint: '#FF9F0A' },
  { key: 'goal-getter', name: 'Goal Getter', desc: 'Fully funded a goal', hint: 'Save until a goal reaches 100%', Icon: Trophy, tint: '#FFD700' },
  { key: 'explorer', name: 'Explorer', desc: 'Used What If mode', hint: 'Try the What If simulation', Icon: Compass, tint: '#34C759' },
  { key: 'on-track', name: 'On Track', desc: 'Month finished on track', hint: 'Stay on budget for a full month', Icon: TrendingUp, tint: '#14B8A6' },
  { key: 'time-traveler', name: 'Time Traveler', desc: 'Used 5Y time zoom', hint: 'Try the 5 Year time view', Icon: Clock, tint: '#8B5CF6' },
];

// ── Module 0: Know Yourself ──
const MODULE_0: ProfileQ[] = [
  { id: 'q3', text: "How would you describe your financial situation right now?", type: 'slider', min: 1, max: 10, step: 1, minLabel: 'Struggling', maxLabel: 'Thriving' },
  { id: 'q4', text: "What's your biggest money frustration?", type: 'single', options: [
    "I don't know where my money goes", "I can't seem to save consistently",
    "I have debt I want to pay off", "I make impulsive purchases I regret",
    "I avoid thinking about money entirely", "I don't know if I'm making good decisions", "Something else"
  ]},
  { id: 'q5', text: "How often did you check your bank balance this past month?", type: 'single', options: [
    "Daily or more", "A few times a week", "Once a week",
    "A few times a month", "Rarely -- I avoid looking", "Only when I absolutely have to"
  ]},
  { id: 'q6', text: "How consistently have you saved in the past 6 months?", type: 'single', options: [
    "Every month without fail", "Most months", "Some months", "Rarely", "I haven't been able to save"
  ]},
  { id: 'q7a', text: "Quick knowledge check!\n\n€100 at 2% interest for 5 years. After 5 years, you'd have...", type: 'quiz', options: [
    { label: 'More than €102', correct: true }, { label: 'Exactly €102' }, { label: 'Less than €102' }, { label: "Don't know" }
  ]},
  { id: 'q7b', text: "If interest rate is 1% and inflation is 2%, after a year you can buy...", type: 'quiz', options: [
    { label: 'More than today' }, { label: 'Same as today' }, { label: 'Less than today', correct: true }, { label: "Don't know" }
  ]},
  { id: 'q7c', text: "A single company stock is generally safer than a mutual fund.", type: 'quiz', options: [
    { label: 'True' }, { label: 'False', correct: true }, { label: "Don't know" }
  ]},
  { id: 'q7d', text: "How many of the 3 questions do you think you got right?", type: 'single', options: ['0', '1', '2', '3'] },
  { id: 'q8', text: "How connected do you feel to your future self in 20 years?", type: 'slider', min: 1, max: 7, step: 1, minLabel: 'Complete stranger', maxLabel: "That's still me" },
];

// ── Clarity Report ──
const CLARITY: ProfileQ[] = [
  { id: 'step1', text: "Completing for yourself or household?", type: 'single', options: ['Just myself', 'My household'] },
  { id: 'step2', text: "How often do you pay bills on time?", type: 'single', options: ['Always', 'Sometimes late', 'Often late'] },
  { id: 'step3', text: "What are your financial goals?", type: 'multi', options: [
    'Better budgeting', 'Manage debt', 'Grow my money', 'Save for a purchase', 'Start investing', 'Save for retirement'
  ]},
  { id: 'step4', text: "Monthly income after tax?", type: 'number', prefix: '€' },
  { id: 'step5', text: "Monthly expenses", type: 'expenses', fields: [
    { key: 'rent', label: 'Rent/Mortgage', icon: 'Home', prefix: '€' },
    { key: 'utilities', label: 'Utilities', icon: 'Zap', prefix: '€' },
    { key: 'tax', label: 'Council/Property tax', icon: 'Landmark', prefix: '€' },
    { key: 'car', label: 'Car costs', icon: 'Car', prefix: '€' },
    { key: 'transport', label: 'Public transport', icon: 'Bus', prefix: '€' },
    { key: 'subs', label: 'Subscriptions', icon: 'Tv', prefix: '€' },
    { key: 'insurance', label: 'Insurance & medical', icon: 'Shield', prefix: '€' },
    { key: 'groceries', label: 'Groceries', icon: 'ShoppingCart', prefix: '€' },
    { key: 'childcare', label: 'Childcare', icon: 'Baby', prefix: '€' },
    { key: 'other', label: 'Other essentials', icon: 'MoreHorizontal', prefix: '€' },
  ]},
  { id: 'step6a', text: "Any debt?", type: 'single', options: ['Yes', 'No'] },
  { id: 'step6b', text: "Credit card debt", type: 'compound', fields: [
    { key: 'cc_balance', label: 'Balance', prefix: '€' }, { key: 'cc_payment', label: 'Monthly payment', prefix: '€' },
  ], showIf: (a) => a.step6a === 'Yes' },
  { id: 'step6c', text: "Personal loans", type: 'compound', fields: [
    { key: 'pl_balance', label: 'Balance', prefix: '€' }, { key: 'pl_payment', label: 'Monthly payment', prefix: '€' },
  ], showIf: (a) => a.step6a === 'Yes' },
  { id: 'step6d', text: "Other debt", type: 'compound', fields: [
    { key: 'od_balance', label: 'Balance', prefix: '€' }, { key: 'od_payment', label: 'Monthly payment', prefix: '€' },
  ], showIf: (a) => a.step6a === 'Yes' },
  { id: 'step7', text: "How much do you save monthly?", type: 'number', prefix: '€' },
  { id: 'step8', text: "Available cash", type: 'compound', fields: [
    { key: 'bank', label: 'Bank accounts', prefix: '€' }, { key: 'savings', label: 'Savings accounts', prefix: '€' },
  ]},
  { id: 'step9', text: "Contributing to pension?", type: 'single', options: ['Yes', 'No'] },
  { id: 'step10', text: "Total investment value (excl. pension)?", type: 'number', prefix: '€' },
  { id: 'step11', text: "Insurance?", type: 'multi', options: ['Life', 'Critical illness', 'Income protection', 'Home', 'Other', 'None'] },
];

// ── Module 1: Risk Pulse ──
const MODULE_1: ProfileQ[] = [
  { id: 'r1', text: "Guaranteed €500 or a 50% chance of winning more?\n\nWhat's the minimum you'd gamble for?", type: 'slider', min: 500, max: 2000, step: 50, minLabel: '€500 (safe)', maxLabel: '€2,000 (risky)' },
  { id: 'r2', text: "How would you split €10,000 across risk levels?", type: 'statements', statements: ['Safe (3-5% return) %', 'Balanced (7-15% return) %', 'Aggressive (12-30% return) %'] },
  { id: 'r3', text: "Your portfolio drops 20% in a month. You...", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Sell everything', maxLabel: 'Buy more' },
  { id: 'r4', text: "Have you ever sold investments after a big drop?", type: 'single', options: ['Yes', 'No', 'Never invested'] },
  { id: 'r5', text: "Would you take a 10% pay cut for your dream job?", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Never', maxLabel: 'Absolutely' },
  { id: 'r6', text: "How would you describe your income stability?", type: 'single', options: ['Steady paycheck', 'Mostly stable', 'Variable', 'Irregular'] },
];

// ── Module 2: Time Lens ──
const MODULE_2: ProfileQ[] = [
  { id: 't1', text: "€100 today or more in 1 year?\n\nWhat's the minimum you'd wait for?", type: 'slider', min: 100, max: 200, step: 5, minLabel: '€100 (now)', maxLabel: '€200 (wait)' },
  { id: 't2', text: "How often do you think about retirement?", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Never', maxLabel: 'Regularly' },
  { id: 't3', text: "How often do you achieve your financial goals?", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Rarely', maxLabel: 'Almost always' },
  { id: 't4', text: "'I live for today, not tomorrow'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Not me at all', maxLabel: "That's totally me" },
  { id: 't5', text: "How similar will you be to yourself in 20 years?", type: 'slider', min: 1, max: 7, step: 1, minLabel: 'Very different person', maxLabel: 'Same person' },
  { id: 't6', text: "What's your primary financial goal timeframe?", type: 'single', options: ['Less than 6 months', '6-12 months', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
];

// ── Module 3: Confidence ──
const MODULE_3: ProfileQ[] = [
  { id: 'c1', text: "How confident are you in your financial decisions?", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Not at all', maxLabel: 'Very confident' },
  { id: 'c2', text: "'I can find solutions to money problems'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' },
  { id: 'c3', text: "'I feel in control of my finances'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' },
  { id: 'c4', text: "Test your knowledge! Estimate these values:", type: 'compound', fields: [
    { key: 'eurusd', label: 'EUR/USD exchange rate' },
    { key: 'sp500', label: 'Avg annual S&P 500 return (%)' },
    { key: 'inflation', label: 'Current inflation (%)' },
    { key: 'mortgage', label: 'Typical mortgage rate (%)' },
    { key: 'housing', label: 'Recommended % income on housing' },
  ]},
  { id: 'c5', text: "How much do you research before financial decisions?", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'No research', maxLabel: 'Extensive research' },
  { id: 'c6', text: "'My financial outcomes are due to my actions, not luck'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' },
];

// ── Module 4: Social Mirror ──
const MODULE_4: ProfileQ[] = [
  { id: 's1', text: "'I compare my finances to friends/family'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Never', maxLabel: 'Always' },
  { id: 's2', text: "'I feel pressure to keep up with others'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Never', maxLabel: 'Always' },
  { id: 's3', text: "'What others think of my purchases matters to me'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' },
  { id: 's4', text: "'I'd buy luxury items to impress others'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' },
  { id: 's5', text: "'I discuss money openly with close friends'", type: 'slider', min: 1, max: 5, step: 1, minLabel: 'Strongly disagree', maxLabel: 'Strongly agree' },
];

// ── Module 5: Money Story ──
const MODULE_5: ProfileQ[] = [
  { id: 'm1', text: "Rate these statements about money avoidance:", type: 'statements', statements: [
    'Rich people are greedy', "I don't deserve to have money", 'Money is the root of all evil'
  ]},
  { id: 'm2', text: "Rate these statements about money worship:", type: 'statements', statements: [
    'Money would solve all my problems', 'Things would be better with more money', 'You can never have enough money'
  ]},
  { id: 'm3', text: "Rate these statements about money status:", type: 'statements', statements: [
    'Self-worth equals net worth', 'Success is measured by earnings', "I'm embarrassed about how much I earn"
  ]},
  { id: 'm4', text: "Rate these statements about money vigilance:", type: 'statements', statements: [
    'Always save for a rainy day', "It's wrong to ask what others earn", 'Money should be saved, not spent'
  ]},
  { id: 'm5', text: "What message did you hear most growing up?", type: 'single', options: [
    "Money doesn't grow on trees", 'Save for a rainy day', "Money isn't everything",
    'Work hard and you\'ll succeed', 'Enjoy life now', "We didn't talk about money"
  ]},
  { id: 'm6', text: "What emotion most drives your spending?", type: 'single', options: [
    'Stress/anxiety', 'Boredom', 'Celebration/reward', 'Guilt', 'Fear of missing out', 'Not emotion-driven'
  ]},
];

export function getModuleQuestions(key: string): ProfileQ[] {
  switch (key) {
    case 'module0': return MODULE_0;
    case 'clarity': return CLARITY;
    case 'module1': return MODULE_1;
    case 'module2': return MODULE_2;
    case 'module3': return MODULE_3;
    case 'module4': return MODULE_4;
    case 'module5': return MODULE_5;
    default: return [];
  }
}

// ── Scoring ──
export function getLevelTitle(pct: number) {
  if (pct >= 80) return 'Financial Master';
  if (pct >= 60) return 'Wealth Architect';
  if (pct >= 40) return 'Budget Builder';
  if (pct >= 20) return 'Money Explorer';
  return 'Financial Newcomer';
}

export function getLevelTier(pct: number) {
  if (pct >= 80) return { min: 80, max: 100, next: '' };
  if (pct >= 60) return { min: 60, max: 80, next: 'Financial Master' };
  if (pct >= 40) return { min: 40, max: 60, next: 'Wealth Architect' };
  if (pct >= 20) return { min: 20, max: 40, next: 'Budget Builder' };
  return { min: 0, max: 20, next: 'Money Explorer' };
}

export function calculateCompleteness(done: Record<string, boolean>): number {
  let score = 0;
  if (done['module0']) score += 30;
  if (done['clarity']) score += 30;
  if (done['module1']) score += 8;
  if (done['module2']) score += 8;
  if (done['module3']) score += 8;
  if (done['module4']) score += 8;
  if (done['module5']) score += 8;
  return Math.min(score, 100);
}

export function calculateClarityScore(a: Record<string, any>) {
  const income = Number(a.step4) || 1;
  const exp = a.step5 || {};
  const totalExp = Object.values(exp).reduce((s: number, v: any) => s + (Number(v) || 0), 0) as number;
  const expRatio = totalExp / income;
  const expScore = expRatio <= 0.5 ? 20 : expRatio <= 0.6 ? 15 : expRatio <= 0.7 ? 10 : expRatio <= 0.8 ? 5 : 0;
  const billScore = a.step2 === 'Always' ? 15 : a.step2 === 'Sometimes late' ? 8 : 0;
  const debtPay = (Number(a.step6b?.cc_payment) || 0) + (Number(a.step6c?.pl_payment) || 0) + (Number(a.step6d?.od_payment) || 0);
  const debtRatio = debtPay / income;
  const debtScore = debtRatio <= 0.1 ? 5 : debtRatio <= 0.2 ? 3 : debtRatio <= 0.3 ? 1 : 0;
  const spending = expScore + billScore + debtScore;

  const savRate = (Number(a.step7) || 0) / income;
  const savRateScore = savRate >= 0.2 ? 20 : savRate >= 0.15 ? 16 : savRate >= 0.1 ? 12 : savRate >= 0.05 ? 8 : savRate > 0 ? 4 : 0;
  const cash = (Number(a.step8?.bank) || 0) + (Number(a.step8?.savings) || 0);
  const emergMo = totalExp > 0 ? cash / totalExp : 0;
  const emergScore = emergMo >= 6 ? 15 : emergMo >= 3 ? 10 : emergMo >= 1 ? 5 : 0;
  const saving = savRateScore + emergScore;

  const goals = a.step3 || [];
  const ins = (a.step11 || []).filter((x: string) => x !== 'None');
  const planning = (goals.length > 0 ? 5 : 0) + (goals.length >= 2 ? 5 : 0) +
    (a.step9 === 'Yes' ? 5 : 0) + (Number(a.step10) > 0 ? 5 : 0) + (ins.length >= 2 ? 5 : 0);

  return { total: spending + saving + planning, spending, saving, planning };
}

export function getPersona(m0: Record<string, any> | null) {
  if (!m0) return null;
  if (m0.q4 === 'I avoid thinking about money entirely') return { n: 'Money Avoider', d: 'You avoid financial decisions. Small steps work best.', s: 'Gentle, celebrate wins' };
  if (m0.q4 === 'I make impulsive purchases I regret') return { n: 'Impulsive Optimist', d: 'Optimistic but impulsive. Simulation is your friend.', s: 'Reality checks' };
  if (m0.q4 === "I can't seem to save consistently") return { n: 'Present Hedonist', d: 'You enjoy the moment. Visual future tools help.', s: 'Immediate benefits' };
  if (m0.q5 === 'Daily or more') return { n: 'Vigilant Saver', d: "Careful with money. Optimize, don't just save.", s: 'Validate caution' };
  if (Number(m0.q3) >= 7) return { n: 'Confident Controller', d: 'In charge of finances. Data tools let you fine-tune.', s: 'Data-driven' };
  return { n: 'Steady Saver', d: 'Building solid habits. Keep going!', s: 'Balanced, incremental' };
}

export function getJohnnyObservations(m0: Record<string, any> | null, clarity: Record<string, any> | null): { icon: string; text: string }[] {
  const obs: { icon: string; text: string }[] = [];
  if (m0) {
    if (m0.q5 === 'Rarely -- I avoid looking' || m0.q5 === 'Only when I absolutely have to')
      obs.push({ icon: 'Eye', text: "You avoid checking finances. Johnny's here to make it less scary." });
    if (m0.q4 === 'I make impulsive purchases I regret')
      obs.push({ icon: 'Zap', text: "Impulse spending is your challenge. Try the 'Can I Afford' tool." });
    if (m0.q4 === "I can't seem to save consistently")
      obs.push({ icon: 'PiggyBank', text: 'Consistent saving is tough. Start with a tiny goal.' });
    if (Number(m0.q8) <= 3) obs.push({ icon: 'Clock', text: 'Future self feels distant. The 5-Year zoom might change that.' });
    if (Number(m0.q8) >= 6) obs.push({ icon: 'Clock', text: 'Strong future-self connection — that\'s a financial superpower.' });
    const correct = [
      m0.q7a === 'More than €102',
      m0.q7b === 'Less than today',
      m0.q7c === 'False',
    ].filter(Boolean).length;
    const estimated = Number(m0.q7d) || 0;
    if (estimated > correct) obs.push({ icon: 'AlertTriangle', text: 'Slightly overconfident on financial knowledge. Quests will help!' });
    if (estimated < correct) obs.push({ icon: 'Star', text: 'You know more than you think. Trust your instincts more.' });
  }
  if (clarity) {
    const rate = (Number(clarity.step7) || 0) / (Number(clarity.step4) || 1);
    if (rate >= 0.2) obs.push({ icon: 'TrendingUp', text: `Saving ${Math.round(rate * 100)}% is excellent. Ahead of most people.` });
    else if (rate > 0 && rate < 0.1) obs.push({ icon: 'Target', text: `Saving ${Math.round(rate * 100)}%. Reaching 10% would make a big difference.` });
  }
  return obs.slice(0, 3);
}

export function getDimensionScore(moduleKey: string, answers: Record<string, any> | null): number {
  if (!answers) return 0;
  const sliderKeys: Record<string, string[]> = {
    module1: ['r1', 'r3', 'r5'],
    module2: ['t1', 't2', 't3', 't4', 't5'],
    module3: ['c1', 'c2', 'c3', 'c5', 'c6'],
    module4: ['s1', 's2', 's3', 's4', 's5'],
    module5: [],
  };
  const keys = sliderKeys[moduleKey] || [];
  if (keys.length === 0) {
    // Module 5: compute from statements
    const groups = ['m1', 'm2', 'm3', 'm4'];
    let total = 0, count = 0;
    groups.forEach(g => {
      const v = answers[g];
      if (v && typeof v === 'object') {
        Object.values(v).forEach((val: any) => { total += Number(val) || 0; count++; });
      }
    });
    return count > 0 ? Math.round((total / count / 5) * 100) : 50;
  }
  let total = 0, count = 0;
  keys.forEach(k => {
    const v = Number(answers[k]);
    if (!isNaN(v) && v > 0) {
      const q = getModuleQuestions(moduleKey).find(q => q.id === k);
      const min = q?.min || 1, max = q?.max || 5;
      total += ((v - min) / (max - min)) * 100;
      count++;
    }
  });
  return count > 0 ? Math.round(total / count) : 50;
}
