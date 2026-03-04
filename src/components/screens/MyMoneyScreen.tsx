import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sliders, Lock, PiggyBank, ShoppingBag, Target, Wallet, ChevronRight, ArrowRight,
  Sparkles, RotateCcw, Check, X, Coins,
  UtensilsCrossed, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark,
  Car, Tv, Shield, Baby, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2,
  RefreshCw, User, BarChart2,
} from 'lucide-react';
import { TransferSheet } from '@/components/budget/TransferSheet';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { useApp, Goal } from '@/context/AppContext';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { CanIAffordSheet } from '@/components/budget/CanIAffordSheet';
import { BlockDetailSheet } from '@/components/budget/BlockDetailSheet';
import { SubscriptionCalendarSheet } from '@/components/budget/SubscriptionCalendarSheet';
import { JohnnyMessage } from '@/components/ui/JohnnyMessage';
import { TodayDrawer } from '@/components/sheets/TodayDrawer';
import { CompareSheet } from '@/components/budget/CompareSheet';
import { tipsByPersona, getImpactText, getAffordText } from '@/lib/personaMessaging';
import { getPersona } from '@/lib/profileData';
import johnnyImage from '@/assets/johnny.png';

// ── Icon Maps ──
const allIcons: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt, Wrench, Heart, Home, Zap, Landmark, Car, Tv,
  Shield, Baby, Lock, PiggyBank, Target, Wallet, Plus, TrendingUp, LineChart, Sunset,
  ShieldCheck, Plane, Laptop, GraduationCap, Gamepad2,
};

const iconTintMap: Record<string, string> = {
  UtensilsCrossed: '#E67E22', ShoppingBag: '#E74C3C', Bus: '#34495E', Film: '#9B59B6',
  Dumbbell: '#7F8C8D', CreditCard: '#6C3483', Coffee: '#795548', Smartphone: '#E91E63',
  Gift: '#F1C40F', BookOpen: '#8E44AD', Shirt: '#D35400', Wrench: '#5AC8FA',
  Heart: '#1ABC9C', MoreHorizontal: '#7F8C8D', Home: '#5D6D7E', Zap: '#2E86C1',
  Landmark: '#1A5276', Car: '#3498DB', Tv: '#6C3483', Shield: '#1A5276', Baby: '#EC4899',
  TrendingUp: '#8B5CF6', LineChart: '#3498DB', Sunset: '#F39C12',
  Target: '#1ABC9C', ShieldCheck: '#8B5CF6', Plane: '#F39C12', Laptop: '#8E44AD',
  GraduationCap: '#8E44AD', Gamepad2: '#3498DB', PiggyBank: '#2980B9', Wallet: '#FFFFFF',
};

const fixedColors: Record<string, string> = {
  'Rent': '#607D8B', 'Utilities': '#5C9DC4', 'Transport': '#78909C',
  'Subscriptions': '#9575CD', 'Insurance': '#7986CB', 'Tax': '#7986CB',
  'Childcare': '#90A4AE', 'Other Fixed': '#90A4AE', 'Car': '#78909C',
};
const fixedColorFallbacks = ['#607D8B', '#5C9DC4', '#78909C', '#9575CD', '#7986CB'];

const goalIconColors: Record<string, string> = {
  ShieldCheck: '#8B5CF6', Plane: '#F39C12', Car: '#3498DB',
  Home: '#5D6D7E', Laptop: '#8E44AD', GraduationCap: '#8E44AD',
  Heart: '#E74C3C', TrendingUp: '#8B5CF6', LineChart: '#3498DB',
  Target: '#1ABC9C', Gamepad2: '#3498DB',
};

const goalFillColors: Record<string, string> = {
  Home: 'linear-gradient(135deg, #E91E63, #F06292)',
  Car: 'linear-gradient(135deg, #FF9800, #FFB74D)',
  Plane: 'linear-gradient(135deg, #AB47BC, #CE93D8)',
  Laptop: 'linear-gradient(135deg, #FFC107, #FFD54F)',
  GraduationCap: 'linear-gradient(135deg, #5C6BC0, #7986CB)',
  Heart: 'linear-gradient(135deg, #EF5350, #E57373)',
  ShieldCheck: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  Target: 'linear-gradient(135deg, #26A69A, #4DB6AC)',
  Gamepad2: 'linear-gradient(135deg, #42A5F5, #64B5F6)',
};

// Health bar contrasting colors
const healthBarColors: Record<string, string> = {
  '#E67E22': '#FFD700', // orange → gold
  '#9B59B6': '#FF69B4', // purple → hot pink
  '#E74C3C': '#FFA500', // red → bright orange
  '#1ABC9C': '#87CEEB', // teal → sky blue
  '#7F8C8D': '#DDDDDD', // gray → light gray
};

function getIcon(name: string): LucideIcon { return allIcons[name] || MoreHorizontal; }
function getTint(iconName: string): string { return iconTintMap[iconName] || '#FFFFFF'; }

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type TimeZoom = 'Month' | 'Year' | '5 Year';
const zoomMult: Record<TimeZoom, number> = { 'Month': 1, 'Year': 12, '5 Year': 60 };

function getSpans(amount: number, income: number) {
  if (income <= 0) return { col: 1, row: 1 };
  const ratio = amount / income;
  if (ratio > 0.35) return { col: 2, row: 2 };
  if (ratio > 0.25) return { col: 2, row: 2 };
  if (ratio > 0.15) return { col: 2, row: 1 };
  return { col: 1, row: 1 };
}

function getSubSpans(amount: number, parentTotal: number) {
  if (parentTotal <= 0) return { col: 1, row: 1, minH: 70 };
  const ratio = amount / parentTotal;
  const minH = Math.max(70, Math.round(ratio * 220));
  if (ratio >= 0.40) return { col: 3, row: 2, minH };
  if (ratio >= 0.20) return { col: 2, row: 1, minH };
  return { col: 1, row: 1, minH: 70 };
}

// Goal progress bar colors (contrasting on pink)
const goalBarColors: Record<string, string> = {
  Home: '#87CEEB',    // sky blue
  Car: '#FFD700',     // gold
  Plane: '#FF69B4',   // hot pink
  Laptop: '#FFA500',  // orange
};

// ── Add Block Inline Component ──
function AddBlockInline({ parentType, onAdd }: { parentType: 'spending' | 'fixed'; onAdd: (item: { name: string; icon: string; monthlyBudget: number }) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('MoreHorizontal');

  const icons = parentType === 'fixed'
    ? ['Home', 'Zap', 'Car', 'Bus', 'Shield', 'Tv', 'Landmark', 'MoreHorizontal']
    : ['UtensilsCrossed', 'Film', 'ShoppingBag', 'Heart', 'Coffee', 'Shirt', 'Gift', 'MoreHorizontal'];

  if (!isOpen) {
    return (
      <div onClick={() => setIsOpen(true)} className="rounded-xl flex items-center justify-center cursor-pointer"
        style={{ flex: '1 1 100%', border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: 10, minHeight: 40, maxHeight: 44 }}>
        <Plus size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.1)' }}>
      <div className="flex gap-1.5 mb-2 overflow-x-auto">
        {icons.map(ic => {
          const IC = allIcons[ic] || MoreHorizontal;
          return (
            <div key={ic} onClick={() => setSelectedIcon(ic)} className="flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: selectedIcon === ic ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                border: selectedIcon === ic ? '1.5px solid rgba(139,92,246,0.5)' : '1.5px solid transparent',
              }}>
              <IC size={16} className="text-white/60" />
            </div>
          );
        })}
      </div>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)}
        className="w-full h-9 rounded-[10px] text-white text-[13px] px-3 outline-none placeholder:text-white/25 mb-1.5"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)' }} />
      <input placeholder="€ Amount" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal"
        className="w-full h-9 rounded-[10px] text-white text-[13px] px-3 outline-none placeholder:text-white/25 mb-2"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)' }} />
      <div className="flex gap-2">
        <button onClick={() => {
          if (name && Number(amount) > 0) {
            onAdd({ name, icon: selectedIcon, monthlyBudget: Number(amount) });
            setIsOpen(false); setName(''); setAmount('');
          }
        }} className="flex-1 h-9 rounded-[10px] text-white text-[13px] font-semibold border-none"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>Create</button>
        <button onClick={() => setIsOpen(false)} className="h-9 px-4 rounded-[10px] text-[13px] border-none"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main Content ──
function MyMoneyContent() {
  const {
    config, expenseCategories, fixedCategories, flexBudget, flexSpent, flexRemaining,
    dailyAllowance, paceStatus, getCategorySpent, totalFixed, transactions,
    updateCategory, updateConfig, daysRemaining, daysInMonth, dayOfMonth, addCategory, addTransaction,
    savingsTarget,
  } = useBudget();
  const { goals, addGoal, updateGoal, setActiveTab } = useApp();

  const clarityDone = localStorage.getItem('jfb_clarity_done') === 'true';

  const persona = useMemo(() => {
    try {
      const m0 = JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null');
      return getPersona(m0);
    } catch { return null; }
  }, []);
  const personaName = persona?.n || null;

  const totalIncome = Number(config.monthlyIncome) || 0;
  const totalSpendingBudget = useMemo(() => expenseCategories.reduce((s, c) => s + (Number(c.monthlyBudget) || 0), 0), [expenseCategories]);
  const totalGoalContributions = useMemo(() => goals.reduce((s, g) => s + (Number(g.monthlyContribution) || 0), 0), [goals]);
  const freeAmount = totalIncome - totalFixed - savingsTarget - totalSpendingBudget - totalGoalContributions;

  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenseCategories.forEach(c => { map[c.id] = getCategorySpent(c.id, 'month'); });
    return map;
  }, [expenseCategories, getCategorySpent]);

  // State
  const [zoom, setZoom] = useState<TimeZoom>('Month');
  const mult = zoomMult[zoom];
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [sliderOriginal, setSliderOriginal] = useState(0);
  const [showFab, setShowFab] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [fabMode, setFabMode] = useState<'expense' | 'income' | 'goal' | undefined>(undefined);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillCatId, setPrefillCatId] = useState<string | undefined>();
  const [manageSubscriptions, setManageSubscriptions] = useState(false);
  const [cancellingSubName, setCancellingSubName] = useState<string | null>(null);
  const [importShown, setImportShown] = useState(() => localStorage.getItem('jfb_import_shown') === 'true');
  const [importing, setImporting] = useState(false);
  const [savingsExpanded, setSavingsExpanded] = useState(false);
  const [savingsSlider, setSavingsSlider] = useState(savingsTarget);
  const [detailCatId, setDetailCatId] = useState<string | null>(null);
  const [showSubsSheet, setShowSubsSheet] = useState(false);
  const [showMyMoneyIntro, setShowMyMoneyIntro] = useState(
    () => localStorage.getItem('jfb_myMoney_introduced') !== 'true'
  );

  // Purchase Decision Engine
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [showDecisionSheet, setShowDecisionSheet] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // ── Drag-and-Drop Money Flow ──
  type DragBlockInfo = { id: string; type: 'spending' | 'goals' | 'savings' | 'fixed'; name: string; color: string; budget: number };
  const [isDragging, setIsDragging] = useState(false);
  const [dragSource, setDragSource] = useState<DragBlockInfo | null>(null);
  const [dragTarget, setDragTarget] = useState<DragBlockInfo | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showQuickTransfer, setShowQuickTransfer] = useState(false);
  const [quickTransferPos, setQuickTransferPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showDragTutorial, setShowDragTutorial] = useState(false);
  const [coinTrail, setCoinTrail] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartTimeRef = useRef(0);
  const dragSourceRef = useRef<DragBlockInfo | null>(null);

  // Build block info map for drag targets
  const blockInfoMap = useMemo(() => {
    const map: Record<string, DragBlockInfo> = {};
    expenseCategories.forEach(c => {
      const tint = iconTintMap[c.icon] || '#7F8C8D';
      map[c.id] = { id: c.id, type: 'spending', name: c.name, color: tint, budget: c.monthlyBudget };
    });
    map['goals'] = { id: 'goals', type: 'goals', name: 'Goals', color: '#E91E63', budget: totalGoalContributions };
    map['savings'] = { id: 'savings', type: 'savings', name: 'Savings', color: '#2980B9', budget: savingsTarget };
    fixedCategories.forEach(c => {
      map[c.id] = { id: c.id, type: 'fixed', name: c.name, color: fixedColors[c.name] || '#5D6D7E', budget: c.monthlyBudget };
    });
    map['fixed'] = { id: 'fixed', type: 'fixed', name: 'Fixed', color: '#5D6D7E', budget: totalFixed };
    return map;
  }, [expenseCategories, fixedCategories, totalGoalContributions, savingsTarget, totalFixed]);

  const isValidTransfer = useCallback((sourceType: string, targetType: string, sourceId: string, targetId: string) => {
    if (sourceType === 'fixed') return false;
    if (targetType === 'fixed') return false;
    if (sourceId === targetId) return false;
    return true;
  }, []);

  const handleDragTouchStart = useCallback((e: React.TouchEvent, blockInfo: DragBlockInfo) => {
    if (blockInfo.type === 'fixed') return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    pressTimerRef.current = setTimeout(() => {
      setIsDragging(true);
      setDragSource(blockInfo);
      dragSourceRef.current = blockInfo;
      dragStartTimeRef.current = Date.now();
      setDragCurrent({ x: startX, y: startY });
      navigator.vibrate?.(50);
      // Tutorial
      if (!localStorage.getItem('jfb_dragTutorialShown')) {
        setShowDragTutorial(true);
        localStorage.setItem('jfb_dragTutorialShown', 'true');
        setTimeout(() => setShowDragTutorial(false), 3000);
      }
    }, 500);
  }, []);

  const handleDragTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) {
      // Cancel press if finger moved before 500ms
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    setDragCurrent({ x: touch.clientX, y: touch.clientY });

    // Coin trail
    setCoinTrail(prev => [...prev.slice(-4), { id: Date.now(), x: touch.clientX, y: touch.clientY }]);

    // Find target via elementsFromPoint
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const targetEl = elements.find(el => {
      const bid = (el as HTMLElement).dataset?.blockId;
      return bid && bid !== dragSourceRef.current?.id;
    });
    if (targetEl) {
      const bid = (targetEl as HTMLElement).dataset.blockId!;
      setDragTarget(blockInfoMap[bid] || null);
    } else {
      setDragTarget(null);
    }
  }, [isDragging, blockInfoMap]);

  const handleDragTouchEnd = useCallback(() => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    if (!isDragging) return;

    const dragDuration = Date.now() - dragStartTimeRef.current;
    const src = dragSourceRef.current;

    if (src && dragTarget) {
      if (isValidTransfer(src.type, dragTarget.type, src.id, dragTarget.id)) {
        if (dragDuration < 1000) {
          // Quick drag
          setQuickTransferPos(dragCurrent || { x: 0, y: 0 });
          setShowQuickTransfer(true);
        } else {
          setShowTransferSheet(true);
        }
      } else {
        toast("Fixed costs can't be moved. Use What If to simulate changes.");
      }
    }

    setIsDragging(false);
    setDragCurrent(null);
    setCoinTrail([]);
  }, [isDragging, dragTarget, isValidTransfer, dragCurrent]);

  const handleTransferApply = useCallback((sourceId: string, targetId: string, amount: number, makePermanent: boolean) => {
    const src = blockInfoMap[sourceId];
    const tgt = blockInfoMap[targetId];
    if (!src || !tgt) return;

    if (src.type === 'spending') {
      const cat = expenseCategories.find(c => c.id === sourceId);
      if (cat) updateCategory(sourceId, { monthlyBudget: Math.max(0, cat.monthlyBudget - amount) });
    } else if (src.type === 'savings') {
      updateConfig({ monthlySavingsTarget: Math.max(0, savingsTarget - amount) });
    } else if (src.type === 'goals') {
      // Reduce proportionally from all goals
      const activeGoals = goals.filter(g => g.monthlyContribution > 0);
      const total = activeGoals.reduce((s, g) => s + g.monthlyContribution, 0);
      activeGoals.forEach(g => {
        const reduction = total > 0 ? (g.monthlyContribution / total) * amount : 0;
        updateGoal(g.id, { monthlyContribution: Math.max(0, g.monthlyContribution - reduction) });
      });
    }

    if (tgt.type === 'spending') {
      const cat = expenseCategories.find(c => c.id === targetId);
      if (cat) updateCategory(targetId, { monthlyBudget: cat.monthlyBudget + amount });
    } else if (tgt.type === 'savings') {
      updateConfig({ monthlySavingsTarget: savingsTarget + amount });
    } else if (tgt.type === 'goals') {
      // Distribute proportionally
      const activeGoals = goals.filter(g => g.monthlyContribution > 0);
      if (activeGoals.length > 0) {
        const perGoal = amount / activeGoals.length;
        activeGoals.forEach(g => {
          updateGoal(g.id, { monthlyContribution: g.monthlyContribution + perGoal });
        });
      }
    }

    toast(`Moved €${Math.round(amount)} from ${src.name} to ${tgt.name}`);
    setShowTransferSheet(false);
    setShowQuickTransfer(false);
    setDragSource(null);
    setDragTarget(null);
  }, [blockInfoMap, expenseCategories, updateCategory, updateConfig, savingsTarget, goals, updateGoal]);

  const handleQuickAmount = useCallback((amt: number) => {
    if (dragSource && dragTarget) {
      handleTransferApply(dragSource.id, dragTarget.id, amt, false);
    }
  }, [dragSource, dragTarget, handleTransferApply]);


  // Reminder banner logic
  const [activeReminder, setActiveReminder] = useState<{ amount: number; description: string; type: string } | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jfb_reminder');
      if (stored) {
        const reminder = JSON.parse(stored);
        if (Date.now() >= reminder.date) {
          setActiveReminder(reminder);
        }
      }
    } catch {}
  }, []);

  const handleBuyIt = useCallback((amount: number, description: string, categoryId: string) => {
    addTransaction({ amount, type: 'expense', categoryId, description, date: new Date().toISOString().split('T')[0], isRecurring: false });
    const cat = expenseCategories.find(c => c.id === categoryId);
    setPurchaseAmount('');
    setPurchaseDesc('');
    // Show a simple alert as toast feedback
    import('sonner').then(({ toast }) => {
      toast(`€${amount} ${description} added to ${cat?.name || 'Spending'}`);
    });
  }, [addTransaction, expenseCategories]);

  const handleWait24h = useCallback((amount: number, description: string, purchaseType: string) => {
    localStorage.setItem('jfb_reminder', JSON.stringify({ amount, description, type: purchaseType, date: Date.now() + 86400000 }));
    import('sonner').then(({ toast }) => {
      toast("We'll check in tomorrow");
    });
  }, []);

  const handleReminderBuy = useCallback(() => {
    if (!activeReminder) return;
    // Find best category
    let best = expenseCategories[0];
    let bestRem = best ? best.monthlyBudget - (categorySpentMap[best.id] || 0) : 0;
    expenseCategories.forEach(c => {
      const rem = c.monthlyBudget - (categorySpentMap[c.id] || 0);
      if (rem > bestRem) { best = c; bestRem = rem; }
    });
    if (best) handleBuyIt(activeReminder.amount, activeReminder.description, best.id);
    localStorage.removeItem('jfb_reminder');
    setActiveReminder(null);
  }, [activeReminder, expenseCategories, categorySpentMap, handleBuyIt]);

  const handleReminderSkip = useCallback(() => {
    localStorage.removeItem('jfb_reminder');
    setActiveReminder(null);
  }, []);

  const sortedFixed = useMemo(() =>
    [...fixedCategories].sort((a, b) => b.monthlyBudget - a.monthlyBudget).map((c, i) => ({
      ...c, _color: fixedColors[c.name] || fixedColorFallbacks[Math.min(i, fixedColorFallbacks.length - 1)]
    })), [fixedCategories]);

  const sortedGoals = useMemo(() =>
    [...goals].sort((a, b) => b.monthlyContribution - a.monthlyContribution).map((g) => ({
      ...g, _color: goalIconColors[g.icon] || '#8B5CF6'
    })), [goals]);

  // (What If handlers moved to WhatIfSheet)

  // Mock bank import
  const handleMockImport = useCallback(() => {
    setImporting(true);
    setTimeout(() => {
      const foodCat = expenseCategories.find(c => c.name === 'Food');
      const entCat = expenseCategories.find(c => c.name === 'Entertainment');
      const shopCat = expenseCategories.find(c => c.name === 'Shopping');
      const persCat = expenseCategories.find(c => c.name === 'Lifestyle');
      const mockTxs = [
        { amount: 45, categoryId: foodCat?.id, description: 'Grocery Store', date: '2026-02-10' },
        { amount: 12, categoryId: foodCat?.id, description: 'Coffee Shop', date: '2026-02-11' },
        { amount: 35, categoryId: entCat?.id, description: 'Cinema', date: '2026-02-09' },
        { amount: 89, categoryId: shopCat?.id, description: 'H&M', date: '2026-02-08' },
        { amount: 15, categoryId: foodCat?.id, description: 'Uber Eats', date: '2026-02-12' },
        { amount: 25, categoryId: persCat?.id, description: 'Pharmacy', date: '2026-02-07' },
        { amount: 60, categoryId: foodCat?.id, description: 'Weekly Groceries', date: '2026-02-14' },
        { amount: 10, categoryId: entCat?.id, description: 'Spotify', date: '2026-02-01', isRecurring: true },
        { amount: 50, categoryId: shopCat?.id, description: 'Amazon', date: '2026-02-05' },
      ];
      mockTxs.forEach(tx => {
        if (tx.categoryId) {
          addTransaction({ amount: tx.amount, type: 'expense', categoryId: tx.categoryId, description: tx.description, date: tx.date, isRecurring: (tx as any).isRecurring || false });
        }
      });
      localStorage.setItem('jfb_import_shown', 'true');
      setImportShown(true);
      setImporting(false);
    }, 2000);
  }, [expenseCategories, addTransaction]);

  // (Quick scenarios moved to WhatIfSheet)

  // Expand item
  const handleExpandItem = (id: string, budget: number) => {
    if (expandedItemId === id) { setExpandedItemId(null); return; }
    setExpandedItemId(id);
    setSliderVal(budget);
    setSliderOriginal(budget);
  };

  const handleSliderSave = (catId: string) => {
    updateCategory(catId, { monthlyBudget: Math.round(sliderVal) });
    setExpandedItemId(null);
  };

  const incomeLabel = zoom === 'Month' ? `€${totalIncome.toLocaleString()}/month` : zoom === 'Year' ? `€${(totalIncome * 12).toLocaleString()}/year` : `€${(totalIncome * 60).toLocaleString()}/5yr`;

  // Parent blocks
  const parentBlocks = useMemo(() => {
    const goalsDisplay = zoom === '5 Year' ? goals.reduce((s, g) => s + g.target, 0) : totalGoalContributions;
    return [
      { id: 'spending', label: 'Spending', icon: 'ShoppingBag', amount: totalSpendingBudget, color: '#8E44AD' },
      { id: 'fixed', label: 'Fixed', icon: 'Lock', amount: totalFixed, color: '#5D6D7E' },
      { id: 'goals', label: 'Goals', icon: 'Target', amount: goalsDisplay, color: '#E91E63' },
      { id: 'savings', label: 'Savings', icon: 'PiggyBank', amount: savingsTarget, color: '#2980B9' },
    ].filter(b => b.amount > 0);
  }, [totalSpendingBudget, totalFixed, totalGoalContributions, savingsTarget, goals, zoom]);

  // Get recent transactions for a category
  const getRecentTxs = useCallback((catId: string) => {
    const now = new Date();
    const ms = startOfMonth(now);
    const me = endOfMonth(now);
    return transactions
      .filter(t => t.categoryId === catId && t.type === 'expense' && isWithinInterval(parseISO(t.date), { start: ms, end: me }))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // ── Full-Income Context Bar ──
  const renderContextBar = (currentId: string) => {
    const all = [
      { id: 'spending', label: 'Spending', amount: totalSpendingBudget, color: '#8E44AD' },
      { id: 'fixed', label: 'Fixed', amount: totalFixed, color: '#5D6D7E' },
      { id: 'goals', label: 'Goals', amount: totalGoalContributions, color: '#E91E63' },
      { id: 'savings', label: 'Savings', amount: savingsTarget, color: '#2980B9' },
    ].filter(s => s.amount > 0);
    const currentBlock = all.find(s => s.id === currentId);
    const pct = totalIncome > 0 && currentBlock ? Math.round((currentBlock.amount / totalIncome) * 100) : 0;

    return (
      <div className="mb-3">
        <div className="text-[13px] mb-1.5" style={{ color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
          €{Math.round((currentBlock?.amount || 0) * mult).toLocaleString()} of €{Math.round(totalIncome * mult).toLocaleString()} · {pct}% of income
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ height: 10, background: 'rgba(255,255,255,0.06)' }}>
          {all.map((seg, i) => {
            const w = totalIncome > 0 ? (seg.amount / totalIncome) * 100 : 0;
            return (
              <div key={seg.id} style={{
                width: `${w}%`, background: seg.color,
                opacity: seg.id === currentId ? 1 : 0.2,
                borderRight: i < all.length - 1 ? '1px solid rgba(255,255,255,0.3)' : undefined,
              }} />
            );
          })}
          {freeAmount > 0 && totalIncome > 0 && (
            <div style={{
              width: `${(freeAmount / totalIncome) * 100}%`,
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)',
            }} />
          )}
        </div>
      </div>
    );
  };

  // ── Spending Health Bar ──
  const renderHealthBar = (spent: number, budget: number, blockColor: string) => {
    const fillPct = budget > 0 ? Math.min((spent / budget) * 100, 120) : 0;
    const remaining = Math.max(0, budget - spent);
    const usedPct = Math.round(budget > 0 ? (spent / budget) * 100 : 0);
    const barFill = fillPct > 100 ? '#FF5252' : fillPct > 80 ? '#FFC107' : (healthBarColors[blockColor] || '#DDDDDD');

    return (
      <div className="mt-auto">
        <div style={{
          height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'rgba(0,0,0,0.15)',
          marginTop: 4,
          boxShadow: fillPct > 100 ? `0 0 8px ${hexToRgba('#FF5252', 0.4)}` : undefined,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(fillPct, 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 4, background: barFill }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {usedPct}%
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            €{Math.round(remaining)} left
          </span>
        </div>
      </div>
    );
  };

  // ── Render Spending Parent Internals ──
  const renderSpendingChildren = () => {
    const visibleCats = expenseCategories.filter(c => 
      Number(c.monthlyBudget) > 0 && 
      !['Other', 'other', 'Personal', 'personal'].includes(c.name)
    );
    const spendingFillPct = totalSpendingBudget > 0 ? Math.min((flexSpent / totalSpendingBudget) * 100, 100) : 0;

    // Subscription block
    const recurringTxs = transactions.filter(t => t.isRecurring === true);
    const subscriptionMap: Record<string, { name: string; amount: number; categoryId: string }> = {};
    recurringTxs.forEach(t => {
      const key = (t.description || 'Unknown').trim();
      if (!subscriptionMap[key]) subscriptionMap[key] = { name: key, amount: Number(t.amount) || 0, categoryId: t.categoryId };
    });
    const subscriptions = Object.values(subscriptionMap);
    const monthlySubTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);

    return (
      <div className="relative">
        {/* Dark spending fill overlay */}
        {spendingFillPct > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-0 pointer-events-none"
            initial={{ height: 0 }}
            animate={{ height: `${spendingFillPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '0 0 16px 16px' }}
          />
        )}

        {/* Sub-grid */}
        <div className="relative z-10" style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: 6,
        }}>
          {/* Subscription block */}
          {subscriptions.length > 0 && (
            <div className="relative rounded-xl p-2 cursor-pointer" style={{
              gridColumn: visibleCats.length <= 2 ? '1 / -1' : undefined,
              background: 'repeating-linear-gradient(135deg, #D4A017, #D4A017 4px, #C49000 4px, #C49000 8px)',
              boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
            }}
              onClick={() => setShowSubsSheet(true)}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <RefreshCw size={14} className="text-white" />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Subs</span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>€{Math.round(monthlySubTotal)}/mo</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>€{Math.round(monthlySubTotal * 12)}/yr</span>
            </div>
          )}

          {visibleCats.map(cat => {
            const CatIcon = getIcon(cat.icon);
            const tint = getTint(cat.icon);
            const spent = categorySpentMap[cat.id] || 0;
            const budget = cat.monthlyBudget;
            const isExpanded = expandedItemId === cat.id;
            const subSpans = getSubSpans(budget, totalSpendingBudget);

            if (isExpanded) {
              const recentTxs = getRecentTxs(cat.id);
              return (
                <motion.div key={cat.id} layout
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    gridColumn: '1 / -1', gridRow: 'span 3',
                    background: tint, border: `1.5px solid ${hexToRgba(tint, 0.30)}`,
                    boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
                    minHeight: 280,
                  }}
                  transition={{ type: 'spring', duration: 0.3 }}
                >
                  <div className="relative z-10 p-3 flex flex-col h-full" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <CatIcon size={14} className="text-white" />
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                      €{Math.round(spent)} of €{Math.round(budget * mult)}
                    </span>
                    {renderHealthBar(spent, budget, tint)}
                    <div className="h-px bg-white/10 my-3" />
                    <div className="text-center mb-1">
                      <span className="text-[16px] font-bold text-white">€{Math.round(sliderVal)}</span>
                    </div>
                    <input type="range" min={0} max={Math.round(budget + Math.max(freeAmount, 0))} value={Math.round(sliderVal)}
                      onChange={e => setSliderVal(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, rgba(255,255,255,0.35) ${(sliderVal / Math.max(budget + Math.max(freeAmount, 0), 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
                    />
                    <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Budget: €{sliderOriginal} → €{Math.round(sliderVal)}. Daily: €{Math.round(dailyAllowance)}/day
                    </div>
                    {recentTxs.length > 0 && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <span className="text-[11px] text-white/30 mb-1">Recent</span>
                        {recentTxs.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between py-1">
                            <span className="text-[12px] text-white/70">{tx.description}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-white/40">{format(parseISO(tx.date), 'MMM d')}</span>
                              <span className="text-[12px] text-white font-medium">-€{tx.amount}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {Math.round(sliderVal) !== Math.round(sliderOriginal) && (
                      <div className="flex justify-center gap-3 mt-3">
                        <button onClick={() => handleSliderSave(cat.id)}
                          style={{ height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
                          className="text-white font-medium text-[13px] px-6">Save</button>
                        <button onClick={() => setExpandedItemId(null)}
                          style={{ height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.10)' }}
                          className="text-white/40 font-medium text-[13px] px-6">Cancel</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }

            const ratio = budget / totalSpendingBudget;
            const flexBasis = ratio >= 0.30 ? '65%' : ratio >= 0.20 ? '48%' : '28%';

            return (
              <motion.div key={cat.id} layout
                data-block-id={cat.id}
                className="relative rounded-xl overflow-hidden cursor-pointer"
                style={{
                  flex: `1 1 ${flexBasis}`,
                  background: tint, border: `1.5px solid ${hexToRgba(tint, 0.30)}`,
                  boxShadow: isDragging && dragSource?.id !== cat.id ? undefined : 'inset 0 -3px 6px rgba(0,0,0,0.12)',
                  minHeight: 65, padding: 8,
                  transform: isDragging && dragSource?.id === cat.id ? 'scale(1.05)' : undefined,
                  zIndex: isDragging && dragSource?.id === cat.id ? 100 : undefined,
                  borderStyle: isDragging && dragSource?.id !== cat.id && dragSource?.type !== 'fixed' ? 'dashed' : undefined,
                  borderColor: isDragging && dragTarget?.id === cat.id ? 'rgba(45,36,64,0.3)' : undefined,
                  transition: 'transform 150ms ease, border 200ms ease',
                }}
                onClick={() => { if (!isDragging) setDetailCatId(cat.id); }}
                onTouchStart={(e) => handleDragTouchStart(e, { id: cat.id, type: 'spending', name: cat.name, color: tint, budget: cat.monthlyBudget })}
                onTouchMove={handleDragTouchMove}
                onTouchEnd={handleDragTouchEnd}
                whileTap={isDragging ? undefined : { scale: 0.96 }}
                transition={{ type: 'spring', duration: 0.3 }}
              >
                <div className="flex flex-col h-full">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <CatIcon size={14} className="text-white" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{cat.name === 'Personal' ? 'Lifestyle' : cat.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.80)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    €{Math.round(spent)} / €{Math.round(budget * mult)}
                  </span>
                  {renderHealthBar(spent, budget, tint)}
                </div>
              </motion.div>
            );
          })}

          {/* + Add block removed -- FAB replaces it */}
        </div>
      </div>
    );
  };

  // ── Render Fixed Parent Internals ──
  const renderFixedChildren = () => (
    <div className="relative z-10" style={{
      display: 'flex', flexWrap: 'wrap' as const, gap: 4, paddingLeft: 4,
    }}>
      {sortedFixed.map(cat => {
        const CatIcon = getIcon(cat.icon);
        const isLargest = cat.monthlyBudget === Math.max(...fixedCategories.map(c => c.monthlyBudget));
        return (
          <div key={cat.id} data-block-id={cat.id} style={{
            flex: isLargest ? '1 1 100%' : '1 1 45%',
            background: cat._color,
            borderRadius: 10,
            padding: '7px 8px',
            minHeight: isLargest ? 55 : 44,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column' as const,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CatIcon size={11} style={{ color: 'rgba(255,255,255,0.9)' }} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {cat.name}
              </span>
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              €{Math.round(cat.monthlyBudget * mult)}
            </span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>fixed</span>
          </div>
        );
      })}
    </div>
  );

  // ── Render Goals Parent Internals ──
  const renderGoalsChildren = () => {
    const maxTarget = Math.max(...sortedGoals.map(g => g.target), 1);

    return (
      <div className="relative z-10" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {sortedGoals.slice(0, 4).map((goal, i) => {
          const GoalIcon = getIcon(goal.icon);
          const pctFunded = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
          const fillGradient = goalFillColors[goal.icon] || goalFillColors['Target'];
          const isComplete = pctFunded >= 100;

          const ratio = goal.target / maxTarget;
          const flexBasisGoal = ratio >= 0.5 ? '100%' : ratio >= 0.2 ? '48%' : '23%';
          const minH = ratio >= 0.5 ? 68 : ratio >= 0.2 ? 56 : 50;
          const isCompact = minH <= 50;
          const isMedium = minH > 50 && minH < 68;

          return (
            <div key={goal.id} className="group" style={{ flex: `1 1 ${flexBasisGoal}`, position: 'relative' }}>
              <div
                style={{
                  borderRadius: ratio >= 0.5 ? 12 : 10,
                  minHeight: minH,
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setActiveTab(2);
                  setTimeout(() => { window.dispatchEvent(new CustomEvent('openMyWorld')); }, 100);
                }}
              >
                {/* Dark unfunded background */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: 'inherit',
                }} />

                {/* Vibrant funded fill from left */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctFunded}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0,
                    background: fillGradient,
                    borderRadius: pctFunded >= 100
                      ? 'inherit'
                      : `${ratio >= 0.5 ? 12 : 10}px 0 0 ${ratio >= 0.5 ? 12 : 10}px`,
                  }}
                />

                {/* Content on top */}
                <div style={{
                  position: 'relative', zIndex: 1,
                  padding: isCompact ? '6px 8px' : isMedium ? '8px 10px' : '10px 12px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  height: '100%', minHeight: minH,
                }}>
                  {/* Large block */}
                  {!isCompact && !isMedium && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <GoalIcon size={14} style={{ color: 'rgba(255,255,255,0.8)' }} strokeWidth={1.5} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'white', flex: 1, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{goal.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{Math.round(pctFunded)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>€{goal.saved >= 1000 ? `${Math.round(goal.saved/1000)}k` : goal.saved} saved</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>€{goal.target >= 1000 ? `${Math.round(goal.target/1000)}k` : goal.target} target</span>
                      </div>
                    </>
                  )}

                  {/* Medium block */}
                  {isMedium && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <GoalIcon size={12} style={{ color: 'rgba(255,255,255,0.8)' }} strokeWidth={1.5} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'white', flex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{goal.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{Math.round(pctFunded)}%</span>
                      </div>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        €{goal.saved >= 1000 ? `${Math.round(goal.saved/1000)}k` : goal.saved} / €{goal.target >= 1000 ? `${Math.round(goal.target/1000)}k` : goal.target}
                      </span>
                    </>
                  )}

                  {/* Compact block */}
                  {isCompact && (
                    <>
                      <GoalIcon size={14} style={{ color: 'rgba(255,255,255,0.8)' }} strokeWidth={1.5} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'white', marginTop: 2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{goal.name}</span>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>{Math.round(pctFunded)}%</span>
                    </>
                  )}
                </div>

                {/* Completion glow */}
                {isComplete && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.15)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            </div>
          );
        })}

        {sortedGoals.length > 4 && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)' }}>+{sortedGoals.length - 4} more</span>
        )}
        {sortedGoals.length === 0 && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Tap to add goals</span>
        )}
      </div>
    );
  };

  // ── Render Savings Parent Internals ──
  const renderSavingsChildren = () => {
    const pctOfIncome = totalIncome > 0 ? Math.round((savingsTarget / totalIncome) * 100) : 0;
    const targetPct = 20;
    const fillPct = Math.min((pctOfIncome / targetPct) * 100, 100);
    const ringSize = 60;
    const sw = 5;
    const r = (ringSize - sw) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (fillPct / 100) * circ;

    return (
      <div className="relative z-10">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 8px 8px',
        }}>
          {/* Ring */}
          <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
            <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={ringSize/2} cy={ringSize/2} r={r}
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
              <circle cx={ringSize/2} cy={ringSize/2} r={r}
                fill="none" stroke="url(#savRingG)" strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              <defs>
                <linearGradient id="savRingG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#29B6F6" />
                  <stop offset="100%" stopColor="#66BB6A" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>
                €{Math.round(savingsTarget * mult)}
              </span>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)' }}>/mo</span>
            </div>
          </div>

          {/* Text info beside ring */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              {pctOfIncome}% of income
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              Target: {targetPct}%
            </div>
            {/* Mini progress bar */}
            <div style={{
              height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 6,
            }}>
              <div style={{
                width: `${fillPct}%`, height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #29B6F6, #66BB6A)',
                boxShadow: fillPct > 50 ? '0 0 6px rgba(102,187,106,0.3)' : undefined,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>{pctOfIncome}%</span>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>{targetPct}%</span>
            </div>
          </div>
        </div>

        {/* Expandable slider -- KEEP existing functionality */}
        {savingsExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            style={{ padding: '0 8px 8px' }}>
            <input type="range" min={0} max={Math.round(savingsTarget + Math.max(freeAmount, 0))}
              value={Math.round(savingsSlider)}
              onChange={e => setSavingsSlider(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, rgba(41,128,185,0.5) ${(savingsSlider / Math.max(savingsTarget + Math.max(freeAmount, 0), 1)) * 100}%, rgba(255,255,255,0.10) 0)` }}
            />
            <div className="text-[11px] mt-1 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              €{Math.round(savingsSlider)}/mo
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // ── Render Parent Block ──
  // Parent accent colors for header text
  const parentHeaderColors: Record<string, string> = {
    spending: '#8E44AD',
    fixed: '#B0BEC5',
    goals: 'rgba(255,255,255,0.95)',
    savings: '#29B6F6',
  };

  const renderParentBlock = (block: typeof parentBlocks[0]) => {
    const { id, label, icon, amount, color } = block;
    const Icon = getIcon(icon);
    const displayAmount = Math.round(amount * mult);
    const isGhosting = false;
    const headerColor = parentHeaderColors[id] || color;

    // Proportional sizing
    const spendingAmt = parentBlocks.find(b => b.id === 'spending')?.amount || 0;
    const fixedAmt = parentBlocks.find(b => b.id === 'fixed')?.amount || 0;
    const goalsAmt = parentBlocks.find(b => b.id === 'goals')?.amount || 0;
    const savingsAmt = parentBlocks.find(b => b.id === 'savings')?.amount || 0;
    const topTotal = spendingAmt + fixedAmt;
    const spendingPct = topTotal > 0 ? Math.round((spendingAmt / topTotal) * 96) : 50;
    const fixedPct = 96 - spendingPct;
    const bottomTotal = goalsAmt + savingsAmt;
    const goalsPct = bottomTotal > 0 ? Math.max(35, Math.round((goalsAmt / bottomTotal) * 96)) : 48;
    const savingsPct = 96 - goalsPct;

    const flexBasis = id === 'spending' ? `${spendingPct}%`
      : id === 'fixed' ? `${fixedPct}%`
      : id === 'goals' ? `${goalsPct}%`
      : id === 'savings' ? `${savingsPct}%`
      : '48%';

    const parentBg = id === 'goals'
      ? 'linear-gradient(145deg, #880E4F 0%, #AD1457 40%, #C2185B 100%)'
      : id === 'savings'
        ? 'linear-gradient(160deg, #0A1628 0%, #0F1D30 50%, #0D1B2A 100%)'
        : 'rgba(255,255,255,0.06)';

    const parentBorder = id === 'goals'
      ? 'none'
      : id === 'savings'
        ? '1px solid rgba(33, 150, 243, 0.2)'
        : isDragging && dragSource?.id !== id && id !== 'fixed' && dragSource?.type !== 'fixed'
          ? '2px dashed rgba(45,36,64,0.15)'
          : isDragging && dragTarget?.id === id
            ? '2px dashed rgba(45,36,64,0.25)'
            : '1px solid rgba(255,255,255,0.12)';

    return (
      <motion.div
        key={id}
        layout
        data-block-id={id}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{
          flex: id === 'goals' ? undefined : `1 1 ${flexBasis}`,
          background: parentBg,
          backdropFilter: (id === 'goals' || id === 'savings') ? undefined : 'blur(4px)',
          WebkitBackdropFilter: (id === 'goals' || id === 'savings') ? undefined : 'blur(4px)',
          border: parentBorder,
          borderRadius: 16,
          padding: (id === 'goals' || id === 'savings') ? '8px 8px 4px 8px' : 8,
          minHeight: undefined,
          alignSelf: id === 'fixed' ? 'stretch' : 'flex-start',
          transition: 'all 400ms ease',
          transform: isDragging && dragSource?.id === id ? 'scale(1.05)' : undefined,
          zIndex: isDragging && dragSource?.id === id ? 100 : undefined,
          boxShadow: isDragging && dragSource?.id === id ? '0 8px 24px rgba(45,36,64,0.2)' : undefined,
        }}
        onTouchStart={(id === 'goals' || id === 'savings') ? (e) => handleDragTouchStart(e, {
          id, type: id as 'goals' | 'savings', name: label, color, budget: amount,
        }) : undefined}
        onTouchMove={(id === 'goals' || id === 'savings') ? handleDragTouchMove : undefined}
        onTouchEnd={(id === 'goals' || id === 'savings') ? handleDragTouchEnd : undefined}
        onClick={() => {
          if (id === 'goals') {
            setActiveTab(2);
            setTimeout(() => { window.dispatchEvent(new CustomEvent('openMyWorld')); }, 100);
            return;
          }
          if (id === 'savings') {
            setSavingsExpanded(!savingsExpanded);
            return;
          }
          setExpandedParent(expandedParent === id ? null : id);
        }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Left accent stripe */}
        <div className="absolute left-0 top-0 bottom-0 rounded-l-2xl" style={{
          width: 4,
          background: id === 'goals' ? '#FF80AB' : id === 'savings' ? '#29B6F6' : color,
        }} />

        {/* Ghost for Can I Afford */}
        {isGhosting && (
          <div className="absolute inset-0 pointer-events-none z-0"
            style={{ background: 'rgba(255,255,255,0.06)', animation: 'ghostPulse 2s ease-in-out infinite' }} />
        )}

        {/* Parent header */}
        <div className="relative z-10 flex items-center justify-between mb-1.5 pl-2">
          <div className="flex items-center gap-1.5">
            <Icon size={16} style={{ color: headerColor }} strokeWidth={1.5} />
            <span style={{ fontSize: 13, fontWeight: 700, color: headerColor }}>{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>€{displayAmount.toLocaleString()}</span>
            <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.20)' }} />
          </div>
        </div>

        {/* Children */}
        <div className="relative pl-2">
          {id === 'spending' && renderSpendingChildren()}
          {id === 'fixed' && renderFixedChildren()}
          {id === 'goals' && renderGoalsChildren()}
          {id === 'savings' && renderSavingsChildren()}
        </div>
      </motion.div>
    );
  };

  // ── Empty state ──
  if (!clarityDone) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(180deg, #C4B5D0 0%, #D8C8E8 25%, #E8D8F0 50%, #F2E8F5 75%, #FAF4FC 100%)' }}>
        <motion.img src={johnnyImage} alt="Johnny" className="w-16 h-16 object-contain mb-4"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <h2 className="text-xl font-bold mb-2 text-center" style={{ color: '#2D2440' }}>Set up your finances</h2>
        <p className="text-sm text-center max-w-[260px] mb-6" style={{ color: '#8A7FA0' }}>Complete the Financial Clarity quest on your Profile to unlock your budget</p>
        <button onClick={() => setActiveTab(2)}
          className="flex items-center gap-2 px-6 rounded-2xl text-sm font-medium frosted-button"
          style={{ height: 48, width: 200, justifyContent: 'center' }}>
          <User size={18} />
          Go to Profile
        </button>
      </div>
    );
  }

  // Compare and What If are now handled by their own sheets

  // ── Main Render ──
  return (
    <div className="h-full overflow-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <span className="text-[22px] font-bold" style={{ color: '#2D2440' }}>My Money</span>
        <Sliders size={20} style={{ color: '#8A7FA0' }} />
      </div>

      {/* Reminder Banner */}
      {activeReminder && !reminderDismissed && (
        <div className="px-4 mb-3">
          <div className="rounded-[14px] p-3.5 flex items-center justify-between" style={{
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
          }}>
            <span className="text-[13px] flex-1" style={{ color: '#2D2440' }}>
              Still thinking about that €{activeReminder.amount} {activeReminder.description}?
            </span>
            <div className="flex items-center gap-2 ml-2">
              <button onClick={handleReminderBuy} className="text-[13px] font-semibold" style={{ color: '#8B5CF6' }}>Yes, buy it</button>
              <button onClick={handleReminderSkip} className="text-[13px]" style={{ color: '#8A7FA0' }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Mode + Zoom toggles */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWhatIf(true)}
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '8px 14px', color: '#5C4F6E', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} />What if?
          </button>
          <button onClick={() => setShowCompare(true)}
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '8px 14px', color: '#5C4F6E', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart2 size={14} />Compare
          </button>
        </div>
        <div className="flex items-center rounded-full p-0.5 frosted-button" style={{ padding: 2 }}>
          {(['Month', 'Year', '5 Year'] as TimeZoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-2 py-1 rounded-full text-[11px] font-medium ${zoom === z ? 'bg-white/40' : ''}`}
              style={{ color: zoom === z ? '#2D2440' : '#8A7FA0' }}>{z}</button>
          ))}
        </div>
      </div>

      {/* SUMMARY BAR -- above green container */}
      <div style={{
        display: 'flex',
        margin: '8px 16px 0',
        background: 'rgba(45,36,64,0.9)',
        borderRadius: 10,
        padding: '8px 0',
      }}>
        {[
          { label: 'Income', value: `€${Math.round(totalIncome * mult).toLocaleString()}`, color: 'white' },
          { label: 'Committed', value: `€${Math.round((totalIncome - freeAmount) * mult).toLocaleString()}`, color: 'white' },
          { label: 'Free', value: freeAmount < 0 ? `Over €${Math.abs(Math.round(freeAmount * mult)).toLocaleString()}` : `€${Math.round(freeAmount * mult).toLocaleString()}`, color: freeAmount >= 0 ? '#86EFAC' : '#FF6B6B' },
          { label: `€${Math.round(flexBudget / daysInMonth)}/d`, value: paceStatus === 'on-track' ? '✓' : '⚠', color: paceStatus === 'on-track' ? '#86EFAC' : '#FFC107' },
        ].map((item, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{item.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* CAN I AFFORD INPUT -- above green container */}
      <div style={{
        margin: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: 12,
        padding: '0 12px',
        height: 40,
        border: '1px solid rgba(255,255,255,0.6)',
        gap: 8,
      }}>
        <span style={{ fontSize: 13, color: '#5C4F6E' }}>EUR</span>
        <input type="number" inputMode="decimal" placeholder="0" value={purchaseAmount}
          onChange={e => setPurchaseAmount(e.target.value)}
          className="bg-transparent outline-none text-[13px]"
          style={{ width: 60, color: '#2D2440' }}
        />
        <div style={{ width: 1, height: 18, background: 'rgba(45,36,64,0.12)' }} />
        <input type="text" placeholder="What is it?" value={purchaseDesc}
          onChange={e => setPurchaseDesc(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
          style={{ color: '#2D2440' }}
          onKeyDown={e => { if (e.key === 'Enter' && parseFloat(purchaseAmount) > 0) setShowDecisionSheet(true); }}
        />
        <button
          disabled={!(parseFloat(purchaseAmount) > 0)}
          onClick={() => setShowDecisionSheet(true)}
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 28, height: 28,
            background: parseFloat(purchaseAmount) > 0 ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'rgba(45,36,64,0.1)',
            transition: 'all 200ms',
          }}>
          <ArrowRight size={14} style={{ color: parseFloat(purchaseAmount) > 0 ? 'white' : '#8A7FA0' }} />
        </button>
      </div>

      {/* THE INCOME CONTAINER -- ONLY blocks inside */}
      <div className="px-4 mb-3">
        <div className="relative rounded-[20px] overflow-hidden" style={{
          background: '#27AE60',
          border: freeAmount < 0 ? '2px solid rgba(245,158,11,0.4)' : 'none',
          padding: 10,
          boxShadow: freeAmount < 0 ? '0 0 24px rgba(245,158,11,0.2)' : undefined,
        }}>
          {/* INCOME watermark */}
          <div className="absolute z-0" style={{ top: 8, left: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 2 }}>INCOME</span>
          </div>

          {/* Parent blocks: TWO COLUMNS, no Goals */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 18 }}>
            {/* Left column: Spending */}
            <div style={{ flex: '1 1 55%' }}>
              {parentBlocks.filter(b => b.id === 'spending').map(renderParentBlock)}
            </div>

            {/* Right column: Fixed + Savings stacked */}
            <div style={{ flex: '1 1 43%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parentBlocks.filter(b => b.id === 'fixed').map(renderParentBlock)}
              {parentBlocks.filter(b => b.id === 'savings').map(renderParentBlock)}
            </div>
          </div>

          {/* FAB button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 2px 0' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFab(true)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', cursor: 'pointer',
              }}
            >
              <Plus size={18} style={{ color: 'white' }} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* GOALS SECTION -- Outside the green container */}
      <div className="px-4 mb-3">
        {parentBlocks.filter(b => b.id === 'goals').length > 0 && (
          <div>
            {parentBlocks.filter(b => b.id === 'goals').map(renderParentBlock)}
          </div>
        )}
      </div>

      {/* JOHNNY MESSAGE -- below goals, outside green */}
      {showMyMoneyIntro && (
        <div style={{
          margin: '0 16px 12px',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 14,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <img src={johnnyImage} alt="Johnny" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' as any }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: '#2D2440', margin: 0, lineHeight: 1.5 }}>
              <strong>The green is your income.</strong> Everything inside = where your money goes. The green that's left? That's €{Math.round(freeAmount * mult).toLocaleString()} — yours. Tap any block to explore.
            </p>
            <button onClick={() => { setShowMyMoneyIntro(false); localStorage.setItem('jfb_myMoney_introduced', 'true'); }}
              style={{ fontSize: 11, color: '#8A7FA0', background: 'none', border: 'none', marginTop: 4, cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* FAB Menu */}
      <AnimatePresence>
        {showFab && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFab(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 60 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 10 }}
              style={{
                position: 'fixed', bottom: 140, right: 24, zIndex: 61,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.6)', borderRadius: 16,
                padding: '6px', boxShadow: '0 8px 24px rgba(45,36,64,0.15)', minWidth: 190,
              }}
            >
              {[
                { label: 'Add transaction', icon: CreditCard, action: () => { setShowFab(false); setShowAddTransaction(true); } },
                { label: 'New spending category', icon: ShoppingBag, action: () => { setShowFab(false); addCategory({ name: 'New Category', icon: 'MoreHorizontal', monthlyBudget: 100, type: 'expense' }); } },
                { label: 'New fixed expense', icon: Lock, action: () => { setShowFab(false); addCategory({ name: 'New Fixed', icon: 'Home', monthlyBudget: 50, type: 'fixed' }); } },
                { label: 'New goal', icon: Target, action: () => { setShowFab(false); setActiveTab(2); setTimeout(() => window.dispatchEvent(new CustomEvent('openMyWorld')), 100); } },
              ].map((item, i) => (
                <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10,
                    cursor: 'pointer', fontSize: 13, color: '#2D2440', fontWeight: 500,
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <item.icon size={14} style={{ color: '#8B5CF6' }} strokeWidth={1.5} />
                  </div>
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
      />

      {/* What If -- reuse the Home terrain drawer */}
      <TodayDrawer open={showWhatIf} onClose={() => setShowWhatIf(false)} autoOpenWhatIf={true} />

      {/* Compare Sheet */}
      <CompareSheet open={showCompare} onClose={() => setShowCompare(false)} />

      {/* Can I Afford Sheet */}
      <CanIAffordSheet
        open={showDecisionSheet}
        onClose={() => setShowDecisionSheet(false)}
        amount={parseFloat(purchaseAmount) || 0}
        description={purchaseDesc}
        income={totalIncome}
        flexBudget={flexBudget}
        flexSpent={flexSpent}
        flexRemaining={flexRemaining}
        freeAmount={freeAmount}
        daysRemaining={daysRemaining}
        daysInMonth={daysInMonth}
        expenseCategories={expenseCategories}
        categorySpentMap={categorySpentMap}
        goals={goals}
        onBuyIt={handleBuyIt}
        onWait24h={handleWait24h}
      />

      {/* Block Detail Sheet */}
      <BlockDetailSheet
        open={!!detailCatId}
        onClose={() => setDetailCatId(null)}
        category={expenseCategories.find(c => c.id === detailCatId) || null}
        spent={detailCatId ? categorySpentMap[detailCatId] || 0 : 0}
        transactions={transactions.filter(t => t.categoryId === detailCatId && t.type === 'expense')}
        daysInMonth={daysInMonth}
        dayOfMonth={dayOfMonth}
        onUpdateBudget={(id, budget) => updateCategory(id, { monthlyBudget: budget })}
        allExpenseCategories={expenseCategories}
        categorySpentMap={categorySpentMap}
      />

      {/* Subscription Calendar Sheet */}
      <SubscriptionCalendarSheet
        open={showSubsSheet}
        onClose={() => setShowSubsSheet(false)}
        subscriptions={(() => {
          const recurringTxs = transactions.filter(t => t.isRecurring === true);
          const subMap: Record<string, { name: string; amount: number; dayOfMonth: number; isPaid: boolean; categoryId: string }> = {};
          recurringTxs.forEach(t => {
            const key = (t.description || 'Unknown').trim();
            if (!subMap[key]) {
              const txDay = parseInt(t.date.split('-')[2], 10) || 1;
              subMap[key] = { name: key, amount: Number(t.amount) || 0, dayOfMonth: txDay, isPaid: txDay <= dayOfMonth, categoryId: t.categoryId };
            }
          });
          return Object.values(subMap);
        })()}
        monthlyTotal={(() => {
          const recurringTxs = transactions.filter(t => t.isRecurring === true);
          const subMap: Record<string, number> = {};
          recurringTxs.forEach(t => { const k = (t.description || '').trim(); if (!subMap[k]) subMap[k] = Number(t.amount) || 0; });
          return Object.values(subMap).reduce((s, v) => s + v, 0);
        })()}
        allExpenseCategories={expenseCategories}
        categorySpentMap={categorySpentMap}
      />

      {/* Drag-and-Drop Overlay: coin at finger + coin trail */}
      {isDragging && dragCurrent && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
          {/* Coin at finger */}
          <div style={{
            position: 'absolute',
            left: dragCurrent.x - 8,
            top: dragCurrent.y - 8,
            width: 16, height: 16, borderRadius: '50%',
            background: '#FFD700',
            boxShadow: '0 2px 8px rgba(255,215,0,0.5)',
          }} />
          {/* Coin trail particles */}
          {coinTrail.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                left: c.x - 2,
                top: c.y - 2,
                width: 4, height: 4, borderRadius: '50%',
                background: '#FFD700',
              }}
            />
          ))}
        </div>
      )}

      {/* Drag Tutorial Tooltip */}
      <AnimatePresence>
        {showDragTutorial && dragCurrent && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed z-[100] pointer-events-none"
            style={{
              left: dragCurrent.x - 120,
              top: dragCurrent.y - 50,
              background: 'rgba(45, 36, 64, 0.85)',
              color: 'white',
              fontSize: 12,
              padding: '8px 14px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            Drag money between blocks! Long-press and drag to move budget.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Transfer Popup */}
      <AnimatePresence>
        {showQuickTransfer && dragSource && dragTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.15)' }}
              onClick={() => { setShowQuickTransfer(false); setDragSource(null); setDragTarget(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-50"
              style={{
                left: Math.min(quickTransferPos.x - 100, window.innerWidth - 220),
                top: Math.max(quickTransferPos.y - 80, 80),
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                borderRadius: 14,
                padding: '12px 14px',
                boxShadow: '0 4px 16px rgba(45, 36, 64, 0.12)',
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 12, color: '#5C4F6E', marginBottom: 8 }}>
                Move from {dragSource.name} to {dragTarget.name}:
              </div>
              <div className="flex gap-2 flex-wrap">
                {[25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleQuickAmount(Math.min(amt, dragSource.budget))}
                    className="rounded-[10px]"
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.5)',
                      border: '1.5px solid rgba(255,255,255,0.6)',
                      color: '#2D2440',
                      fontSize: 13, fontWeight: 500,
                    }}
                  >€{amt}</button>
                ))}
                <button
                  onClick={() => { setShowQuickTransfer(false); setShowTransferSheet(true); }}
                  className="rounded-[10px]"
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(139,92,246,0.08)',
                    border: '1.5px solid rgba(139,92,246,0.2)',
                    color: '#8B5CF6',
                    fontSize: 13, fontWeight: 500,
                  }}
                >More...</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Transfer Sheet */}
      <TransferSheet
        open={showTransferSheet}
        source={dragSource}
        target={dragTarget}
        isWhatIf={false}
        onApply={handleTransferApply}
        onClose={() => { setShowTransferSheet(false); setDragSource(null); setDragTarget(null); }}
      />
    </div>
  );
}

// ── Wrapper with BudgetProvider ──
export function MyMoneyScreen() {
  return (
    <BudgetProvider>
      <MyMoneyContent />
    </BudgetProvider>
  );
}
