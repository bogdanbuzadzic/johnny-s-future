import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RefreshCw, Scissors } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
} from 'lucide-react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import type { LucideIcon } from 'lucide-react';
import type { Transaction } from '@/context/BudgetContext';
import { format, parseISO, getDaysInMonth, getDate } from 'date-fns';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
};

export const CATEGORY_TINTS: Record<string, string> = {
  Food: '#FF9F0A',
  Shopping: '#FF6B9D',
  Transport: '#007AFF',
  Entertainment: '#8B5CF6',
  Health: '#34C759',
  Subscriptions: '#5AC8FA',
  Coffee: '#C4956A',
  Other: '#FFFFFF',
};

export function getTintColor(name: string): string {
  return CATEGORY_TINTS[name] || '#FFFFFF';
}

interface CategoryBlockProps {
  id: string;
  name: string;
  icon: string;
  tintColor: string;
  budget: number;
  spent: number;
  width: number;
  height: number;
  transactions: Transaction[];
  monthTransactions?: Transaction[];
  onUpdateBudget: (id: string, budget: number) => void;
  hasRecurring?: boolean;
  monthlyIncome?: number;
  flexRemaining?: number;
  dailyAllowance?: number;
  previewDailyAllowance?: number;
  daysRemaining?: number;
  onSliderChange?: (id: string, newBudget: number) => void;
  onSliderConfirm?: (id: string, newBudget: number) => void;
  onSliderCancel?: (id: string) => void;
  sliderActive?: boolean;
  onExpandToggle?: (id: string) => void;
  ghostAmount?: number;
  autoBalanceSuggestion?: { categoryId: string; categoryName: string; categoryIcon: string; amount: number } | null;
  onSuggestRebalance?: (targetCategoryId: string, suggestedAmount: number) => void;
  expandedFromParent?: boolean;
  presetSliderValue?: number;
}

export function CategoryBlock({
  id, name, icon, tintColor, budget, spent, width, height, transactions, monthTransactions,
  onUpdateBudget, hasRecurring = false, monthlyIncome = 0,
  flexRemaining = 0, dailyAllowance = 0, previewDailyAllowance, daysRemaining = 1,
  onSliderChange, onSliderConfirm, onSliderCancel, sliderActive = false, onExpandToggle,
  ghostAmount = 0,
  autoBalanceSuggestion, onSuggestRebalance,
  expandedFromParent, presetSliderValue,
}: CategoryBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [cancelSimActive, setCancelSimActive] = useState(false);
  const [sliderValue, setSliderValue] = useState(budget);
  const [hasSliderChange, setHasSliderChange] = useState(false);
  const [originalBudget, setOriginalBudget] = useState(budget);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync slider when budget changes externally
  useEffect(() => {
    if (!hasSliderChange) {
      setSliderValue(budget);
      setOriginalBudget(budget);
    }
  }, [budget, hasSliderChange]);

  // External expand control (for auto-balance)
  useEffect(() => {
    if (expandedFromParent !== undefined) {
      setExpanded(expandedFromParent);
    }
  }, [expandedFromParent]);

  // Preset slider value (from auto-balance suggestion)
  useEffect(() => {
    if (presetSliderValue !== undefined && expanded) {
      setSliderValue(presetSliderValue);
      setHasSliderChange(true);
      setOriginalBudget(budget);
      onSliderChange?.(id, presetSliderValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSliderValue]);

  // Auto-cancel confirmation after 3 seconds
  useEffect(() => {
    if (showConfirmation) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        handleSliderCancelAction();
        setShowConfirmation(false);
      }, 3000);
      return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
    }
  }, [showConfirmation]);

  const Icon = iconMap[icon] || MoreHorizontal;
  const pct = budget > 0 ? spent / budget : 0;
  const isOver80 = pct > 0.8;
  const isOver100 = pct > 1;
  const isOther = name === 'Other' || tintColor === '#FFFFFF';

  const bgOpacity = isOther ? 0.15 : 0.30;
  const borderOpacity = isOther ? 0.12 : 0.25;
  const fillOpacity = isOver100 ? 0.35 : 0.45;
  const fillColor = isOver80 ? '#FF9F0A' : tintColor;
  const blockBg = isOver100 ? `rgba(255,159,10,0.35)` : `rgba(${hexToRgb(tintColor)},${bgOpacity})`;
  const blockBorder = isOver100 ? `rgba(255,159,10,0.40)` : `rgba(${hexToRgb(tintColor)},${borderOpacity})`;

  const sortedTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const visibleTx = sortedTx.slice(0, 4);
  const moreTx = sortedTx.length - 4;

  const annualCost = budget * 12;
  const dailyCost = budget / 30;
  const hoursPerYear = monthlyIncome > 0 ? annualCost / (monthlyIncome / 160) : 0;

  const timelineTxs = monthTransactions || transactions;
  const timelineData = useMemo(() => {
    const now = new Date();
    const dim = getDaysInMonth(now);
    const dom = getDate(now);
    const data: { day: number; total: number }[] = [];
    let cumTotal = 0;
    for (let d = 1; d <= dom; d++) {
      const dayTxs = timelineTxs.filter(tx => {
        const txDate = parseISO(tx.date);
        return txDate.getDate() === d && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      });
      dayTxs.forEach(tx => (cumTotal += tx.amount));
      data.push({ day: d, total: cumTotal });
    }
    return { data, daysInMonth: dim, dayOfMonth: dom };
  }, [timelineTxs]);

  const handleCancelConfirm = () => {
    onUpdateBudget(id, 0);
    setCancelSimActive(false);
    setExpanded(false);
  };

  // Slider handlers
  const maxPossible = budget + flexRemaining;

  const handleSliderValueChange = (val: number[]) => {
    const newVal = val[0];
    setSliderValue(newVal);
    if (!hasSliderChange) {
      setOriginalBudget(budget);
      setHasSliderChange(true);
    }
    onSliderChange?.(id, newVal);
  };

  const handleSliderCommit = () => {
    setIsDragging(false);
    if (hasSliderChange && Math.round(sliderValue) !== Math.round(originalBudget)) {
      setShowConfirmation(true);
    }
  };

  const handleSliderSave = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    onSliderConfirm?.(id, sliderValue);
    setHasSliderChange(false);
    setOriginalBudget(sliderValue);
    setShowConfirmation(false);
  };

  const handleSliderCancelAction = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setSliderValue(originalBudget);
    setHasSliderChange(false);
    setShowConfirmation(false);
    onSliderCancel?.(id);
  };

  const handleToggleExpand = () => {
    if (cancelSimActive) return;
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded) {
      onExpandToggle?.(id);
    }
  };

  // Impact text
  const currentDaily = dailyAllowance;
  const previewDaily = previewDailyAllowance ?? dailyAllowance;
  const dailyImproving = previewDaily > currentDaily;

  // Build SVG path for spending timeline
  const buildTimelinePath = (chartWidth: number, chartHeight: number) => {
    const { data, daysInMonth: dim, dayOfMonth } = timelineData;
    if (data.length === 0) return { linePath: '', fillPath: '', budgetY: chartHeight, todayX: 0, todayY: chartHeight };
    const maxVal = Math.max(budget, ...data.map(d => d.total), 1);
    const xScale = chartWidth / dim;
    const yScale = (chartHeight - 4) / maxVal;
    let linePath = `M 0 ${chartHeight}`;
    let prevY = chartHeight;
    data.forEach((pt) => {
      const x = (pt.day - 0.5) * xScale;
      const y = chartHeight - pt.total * yScale;
      linePath += ` L ${x} ${prevY} L ${x} ${y}`;
      prevY = y;
    });
    const todayX = (dayOfMonth - 0.5) * xScale;
    linePath += ` L ${todayX} ${prevY}`;
    const fillPath = linePath + ` L ${todayX} ${chartHeight} L 0 ${chartHeight} Z`;
    const budgetY = Math.max(0, chartHeight - budget * yScale);
    return { linePath, fillPath, budgetY, todayX, todayY: prevY };
  };

  // Ghost fill calculations
  const ghostFillStart = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const ghostFillWidth = budget > 0 ? Math.min((ghostAmount / budget) * 100, 100 - ghostFillStart) : 0;

  // Slider thumb position percentage for floating label
  const sliderPct = maxPossible > 0 ? (sliderValue / maxPossible) * 100 : 0;

  return (
    <motion.div
      layout
      style={{ width }}
      className="flex-shrink-0 select-none"
    >
      <div
        className="rounded-2xl overflow-hidden backdrop-blur-sm relative"
        style={{
          background: cancelSimActive ? `rgba(${hexToRgb(tintColor)},0.08)` : blockBg,
          border: cancelSimActive ? `2px dashed rgba(${hexToRgb(tintColor)},0.20)` : `1px solid ${blockBorder}`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
          minHeight: height,
          opacity: cancelSimActive ? 0.4 : 1,
          transition: 'opacity 0.3s, border 0.3s',
        }}
      >
        {/* Subscription pulse animation */}
        {hasRecurring && !cancelSimActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: `rgba(${hexToRgb(tintColor)},1)` }}
          />
        )}

        {/* Spending fill */}
        {!cancelSimActive && (
          <div
            className="absolute inset-y-0 left-0 rounded-l-2xl transition-all duration-300"
            style={{
              width: `${Math.min(pct * 100, 100)}%`,
              background: `rgba(${hexToRgb(fillColor)},${fillOpacity})`,
            }}
          />
        )}

        {/* Ghost fill overlay */}
        {ghostAmount > 0 && !cancelSimActive && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              left: `${ghostFillStart}%`,
              width: `${ghostFillWidth}%`,
              background: `rgba(${hexToRgb(tintColor)},0.15)`,
              borderRight: `2px dashed rgba(${hexToRgb(tintColor)},0.4)`,
              borderTop: `2px dashed rgba(${hexToRgb(tintColor)},0.4)`,
              borderBottom: `2px dashed rgba(${hexToRgb(tintColor)},0.4)`,
              animation: 'ghostPulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Content - clickable for expand */}
        <div
          className="relative z-10 px-2.5 pt-2.5 pb-1 flex flex-col justify-center cursor-pointer"
          style={{ minHeight: height - 24 }}
          onClick={handleToggleExpand}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon size={16} className="text-white/70 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[13px] text-white truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1">
              {hasRecurring && (
                <RefreshCw size={10} className="text-white/20 flex-shrink-0" strokeWidth={1.5} />
              )}
              {showConfirmation ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40">Set to €{Math.round(sliderValue)}?</span>
                  <button onClick={(e) => { e.stopPropagation(); handleSliderSave(); }} className="p-0.5">
                    <Check size={14} className="text-green-400" strokeWidth={2} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleSliderCancelAction(); }} className="p-0.5">
                    <X size={14} className="text-white/30" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <span className="text-[12px] text-white/50 flex-shrink-0">
                  €{Math.round(spent)}/€{Math.round(sliderValue)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Always-visible slim slider at bottom */}
        <div
          className="relative z-10 px-3 pb-2"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Floating label during drag */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute z-20 flex flex-col items-center pointer-events-none"
                style={{
                  left: `calc(${sliderPct}% + ${12 - sliderPct * 0.24}px)`,
                  top: -36,
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  className="px-2 py-0.5 rounded-lg text-center"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                >
                  <p className="text-[14px] font-bold text-white leading-tight">€{Math.round(sliderValue)}</p>
                  <p className="text-[10px] text-white/30 leading-tight">€{Math.round(previewDaily)}/day</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SliderPrimitive.Root
            value={[sliderValue]}
            min={0}
            max={Math.max(maxPossible, 1)}
            step={5}
            onValueChange={handleSliderValueChange}
            onValueCommit={handleSliderCommit}
            onPointerDown={() => setIsDragging(true)}
            className="relative flex w-full touch-none select-none items-center h-4"
          >
            <SliderPrimitive.Track
              className="relative h-[3px] w-full grow overflow-hidden rounded-full"
              style={{ background: `rgba(${hexToRgb(tintColor)},0.20)` }}
            >
              <SliderPrimitive.Range
                className="absolute h-full rounded-full"
                style={{ background: `rgba(${hexToRgb(fillColor)},0.5)` }}
              />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
              className="block h-4 w-4 rounded-full bg-white focus:outline-none"
              style={{
                border: `2px solid ${tintColor}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </SliderPrimitive.Root>
        </div>

        {/* Cancel simulation overlay */}
        {cancelSimActive && (
          <div className="relative z-10 px-2.5 pb-2.5" onClick={e => e.stopPropagation()}>
            <p className="text-[12px] text-green-400 mb-1">
              +€{Math.round(budget)}/month freed up · +€{Math.round(annualCost)}/year saved
            </p>
            <p className="text-[11px] text-white/30 mb-2">
              Daily budget increases by €{(budget / 30).toFixed(1)}/day
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelConfirm}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: 'rgba(52,199,89,0.2)', color: 'rgba(52,199,89,0.8)', border: '1px solid rgba(52,199,89,0.3)' }}
              >
                Actually cancel
              </button>
              <button
                onClick={() => setCancelSimActive(false)}
                className="text-[11px] text-white/40"
              >
                Just checking
              </button>
            </div>
          </div>
        )}

        {/* Expanded content - NO slider here, just transactions etc */}
        <AnimatePresence>
          {expanded && !cancelSimActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative z-10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Auto-balance suggestion */}
              <AnimatePresence>
                {autoBalanceSuggestion && hasSliderChange && sliderValue > originalBudget && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => onSuggestRebalance?.(autoBalanceSuggestion.categoryId, autoBalanceSuggestion.amount)}
                    className="mx-2.5 mb-2 w-[calc(100%-20px)] text-left flex items-center gap-1.5 text-[12px] text-amber-300/70 hover:text-amber-300 transition-colors"
                  >
                    {(() => {
                      const SugIcon = iconMap[autoBalanceSuggestion.categoryIcon] || MoreHorizontal;
                      return <SugIcon size={12} strokeWidth={1.5} />;
                    })()}
                    <span className="truncate">
                      Reduce {autoBalanceSuggestion.categoryName} by €{Math.round(autoBalanceSuggestion.amount)} to balance?
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Subscription annual cost reveal */}
              {hasRecurring && (
                <div className="mx-2.5 mb-2 pt-1">
                  <p className="text-[14px] text-white">
                    €{Math.round(budget)}<span className="text-white/40 text-[12px]">/month</span>
                    {' = '}
                    <span className="text-[16px] font-semibold">€{Math.round(annualCost)}</span>
                    <span className="text-white/40 text-[12px]">/year</span>
                  </p>
                  <p className="text-[12px] text-white/40">€{dailyCost.toFixed(2)} every single day</p>
                  {monthlyIncome > 0 && (
                    <p className="text-[12px] text-white/30">= {Math.round(hoursPerYear)} hours of work per year</p>
                  )}
                </div>
              )}

              {/* Mini spending timeline */}
              {timelineTxs.length > 0 && (() => {
                const chartW = Math.max(width - 20, 60);
                const chartH = 48;
                const { linePath, fillPath, budgetY, todayX, todayY } = buildTimelinePath(chartW, chartH);
                const crossedBudget = timelineData.data.some(d => d.total > budget);

                return (
                  <div className="mx-2.5 mb-2">
                    <svg width={chartW} height={chartH} className="overflow-visible">
                      <defs>
                        <clipPath id={`overBudget-${id}`}>
                          <rect x={0} y={0} width={chartW} height={budgetY} />
                        </clipPath>
                      </defs>
                      <path d={fillPath} fill={`rgba(${hexToRgb(tintColor)},0.20)`} />
                      {crossedBudget && (
                        <path d={fillPath} fill="rgba(255,159,10,0.15)" clipPath={`url(#overBudget-${id})`} />
                      )}
                      <line
                        x1={0} y1={budgetY} x2={chartW} y2={budgetY}
                        stroke={crossedBudget ? 'rgba(255,159,10,0.4)' : 'rgba(255,255,255,0.15)'}
                        strokeDasharray="4 3"
                        strokeWidth={1}
                      />
                      <path d={linePath} fill="none" stroke={`rgba(${hexToRgb(tintColor)},0.6)`} strokeWidth={1.5} />
                      <circle cx={todayX} cy={todayY} r={3} fill={tintColor} opacity={0.8} />
                    </svg>
                  </div>
                );
              })()}

              {/* Progress bar */}
              <div className="mx-2.5 mb-2">
                <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct * 100, 100)}%`,
                      background: `rgba(${hexToRgb(fillColor)},0.5)`,
                    }}
                  />
                </div>
              </div>

              {/* Transactions */}
              <div className="px-2.5 pb-2 space-y-1">
                {visibleTx.length === 0 && (
                  <p className="text-[11px] text-white/30">No transactions yet</p>
                )}
                {visibleTx.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[12px] text-white/40 truncate">{tx.description}</span>
                      <span className="text-[10px] text-white/20 flex-shrink-0">
                        {format(parseISO(tx.date), 'MMM d')}
                      </span>
                    </div>
                    <span className="text-[12px] text-white/40 flex-shrink-0">-€{tx.amount}</span>
                  </div>
                ))}
                {moreTx > 0 && (
                  <p className="text-[11px] text-white/25">and {moreTx} more</p>
                )}
              </div>

              {/* Cancel simulation button (for subscriptions) */}
              {hasRecurring && (
                <div className="px-2.5 pb-1">
                  <button
                    onClick={() => setCancelSimActive(true)}
                    className="flex items-center gap-1.5 text-[13px] text-purple-300/70 hover:text-purple-300 transition-colors"
                  >
                    <Scissors size={13} strokeWidth={1.5} />
                    What if I cancel?
                  </button>
                </div>
              )}

              {/* Edit name link */}
              <div className="px-2.5 pb-2.5">
                <span className="text-[11px] text-white/25">Edit name</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : '255,255,255';
}
