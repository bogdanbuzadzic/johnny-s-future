import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, XCircle } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './ghost-pulse.css';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
  Gift, BookOpen, Smartphone, Shirt,
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

export const ICON_TINT_MAP: Record<string, string> = {
  UtensilsCrossed: '#FF9F0A',
  ShoppingBag: '#FF6B9D',
  Bus: '#007AFF',
  Film: '#8B5CF6',
  Dumbbell: '#34C759',
  CreditCard: '#5AC8FA',
  Coffee: '#C4956A',
  Gift: '#FF6B9D',
  BookOpen: '#007AFF',
  Smartphone: '#5AC8FA',
  Shirt: '#8B5CF6',
  MoreHorizontal: '#FFFFFF',
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
  ghostAmount?: number;
  mode: 'month' | 'whatif';
  isSimulated?: boolean;
  flexRemaining: number;
  onSliderChange?: (id: string, newBudget: number) => void;
  onSliderConfirm?: (id: string, newBudget: number) => void;
  onSliderCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function CategoryBlock({
  id, name, icon, tintColor, budget, spent, width, height,
  ghostAmount = 0, mode, isSimulated = false, flexRemaining,
  onSliderChange, onSliderConfirm, onSliderCancel, onRemove,
}: CategoryBlockProps) {
  const [sliderValue, setSliderValue] = useState(budget);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [originalBudget, setOriginalBudget] = useState(budget);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging && !showConfirmation) {
      setSliderValue(budget);
      setOriginalBudget(budget);
    }
  }, [budget, isDragging, showConfirmation]);

  useEffect(() => {
    if (showConfirmation) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        handleCancel();
      }, 3000);
      return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
    }
  }, [showConfirmation]);

  const Icon = iconMap[icon] || MoreHorizontal;
  const pct = budget > 0 ? spent / budget : 0;
  const isOver80 = pct > 0.8;
  const isOver100 = pct > 1;

  const fillColor = isOver80 ? '#FF9F0A' : tintColor;
  const fillHeight = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const ghostFillHeight = budget > 0 ? Math.min((ghostAmount / budget) * 100, 100 - fillHeight) : 0;

  const blockBg = isOver100
    ? `rgba(255,159,10,0.35)`
    : `rgba(${hexToRgb(tintColor)},0.30)`;
  const blockBorder = isOver100
    ? `rgba(255,159,10,0.40)`
    : `rgba(${hexToRgb(tintColor)},0.25)`;

  const maxPossible = Math.max(budget + flexRemaining, budget);

  // Vertical slider drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    if (!showConfirmation) {
      setOriginalBudget(budget);
    }
    const track = trackRef.current;
    if (!track) return;

    const updateFromEvent = (clientY: number) => {
      const rect = track.getBoundingClientRect();
      const relY = clientY - rect.top;
      const pctFromTop = Math.max(0, Math.min(1, relY / rect.height));
      // Top = max, bottom = 0
      const newVal = Math.round((1 - pctFromTop) * maxPossible / 5) * 5;
      setSliderValue(newVal);
      onSliderChange?.(id, newVal);
    };

    updateFromEvent(e.clientY);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      updateFromEvent(ev.clientY);
    };
    const onUp = () => {
      setIsDragging(false);
      setShowConfirmation(true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [budget, flexRemaining, id, maxPossible, onSliderChange, showConfirmation]);

  const handleSave = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    onSliderConfirm?.(id, sliderValue);
    setShowConfirmation(false);
    setOriginalBudget(sliderValue);
  };

  const handleCancel = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setSliderValue(originalBudget);
    setShowConfirmation(false);
    onSliderCancel?.(id);
  };

  const thumbPosition = maxPossible > 0 ? (1 - sliderValue / maxPossible) * 100 : 100;

  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0"
      style={{
        width,
        height,
        background: isSimulated ? 'rgba(139,92,246,0.08)' : blockBg,
        border: isSimulated ? '2px dashed rgba(139,92,246,0.3)' : `1px solid ${blockBorder}`,
        animation: isSimulated ? 'ghostPulse 2s ease-in-out infinite' : undefined,
      }}
    >
      {/* Spending fill from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-300"
        style={{
          height: `${fillHeight}%`,
          background: `rgba(${hexToRgb(fillColor)},0.45)`,
          borderRadius: '0 0 12px 12px',
        }}
      />

      {/* Ghost fill */}
      {ghostAmount > 0 && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: `${fillHeight}%`,
            height: `${ghostFillHeight}%`,
            background: `rgba(${hexToRgb(tintColor)},0.15)`,
            borderTop: `2px dashed rgba(${hexToRgb(tintColor)},0.4)`,
            animation: 'ghostPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Content stacked vertically */}
      <div className="relative z-10 flex flex-col items-center pt-2 px-1 h-full">
        {/* What If X button */}
        {mode === 'whatif' && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            className="absolute top-1 right-1 z-20"
          >
            <XCircle size={16} className="text-white/20 hover:text-white/50 transition-colors" />
          </button>
        )}

        <Icon size={18} className="text-white/70 flex-shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] text-white text-center leading-tight mt-1 line-clamp-2 max-w-full px-0.5">
          {name}
        </span>
        <span className="text-[16px] font-bold text-white mt-1">€{Math.round(spent)}</span>
        <span className="text-[10px] text-white/40">of €{Math.round(sliderValue)}</span>

        {/* Save/Cancel confirmation */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 mt-1"
            >
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-0.5">
                <Check size={14} className="text-green-400" strokeWidth={2} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="p-0.5">
                <X size={14} className="text-white/30" strokeWidth={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vertical slider track on right edge */}
      <div
        ref={trackRef}
        className="absolute top-0 right-0 z-20 cursor-ns-resize"
        style={{ width: 16, height: '100%' }}
        onPointerDown={handlePointerDown}
      >
        {/* Track line */}
        <div
          className="absolute right-[6px] top-2 bottom-2"
          style={{
            width: 3,
            background: `rgba(${hexToRgb(tintColor)},0.20)`,
            borderRadius: 2,
          }}
        />
        {/* Thumb */}
        <div
          className="absolute right-[2px] transition-all"
          style={{
            top: `calc(${thumbPosition}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'white',
            border: `2px solid ${tintColor}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Floating label during drag */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            className="absolute z-30 pointer-events-none"
            style={{
              right: width > 80 ? 20 : -50,
              top: `calc(${thumbPosition}% - 14px)`,
            }}
          >
            <div
              className="px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            >
              <span className="text-[12px] font-bold text-white">€{Math.round(sliderValue)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : '255,255,255';
}
