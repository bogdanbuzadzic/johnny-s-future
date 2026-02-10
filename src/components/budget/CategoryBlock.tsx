import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import {
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Transaction } from '@/context/BudgetContext';
import { format, parseISO } from 'date-fns';

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
  onUpdateBudget: (id: string, budget: number) => void;
}

export function CategoryBlock({
  id, name, icon, tintColor, budget, spent, width, height, transactions, onUpdateBudget,
}: CategoryBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editValue, setEditValue] = useState('');

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

  const handleSaveBudget = () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) onUpdateBudget(id, val);
    setEditingBudget(false);
  };

  return (
    <motion.div
      layout
      style={{ width }}
      className="flex-shrink-0 cursor-pointer select-none"
      onClick={() => !editingBudget && setExpanded(!expanded)}
    >
      <div
        className="rounded-2xl overflow-hidden backdrop-blur-sm relative"
        style={{
          background: `${blockBg}`,
          border: `1px solid ${blockBorder}`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
          minHeight: height,
        }}
      >
        {/* Spending fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-2xl transition-all duration-300"
          style={{
            width: `${Math.min(pct * 100, 100)}%`,
            background: `rgba(${hexToRgb(fillColor)},${fillOpacity})`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-2.5 flex flex-col justify-center h-full" style={{ minHeight: height }}>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon size={16} className="text-white/70 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[13px] text-white truncate">{name}</span>
            </div>
            <span className="text-[12px] text-white/50 flex-shrink-0">
              €{Math.round(spent)}/€{Math.round(budget)}
            </span>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative z-10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
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

              {/* Edit budget */}
              <div className="px-2.5 pb-2.5">
                {editingBudget ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-[12px]">€</span>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-16 bg-transparent text-white text-[13px] outline-none border-b border-white/30"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={handleSaveBudget} className="p-1 rounded bg-white/10">
                      <Check size={12} className="text-white/60" />
                    </button>
                    <button onClick={() => setEditingBudget(false)} className="p-1 rounded bg-white/10">
                      <X size={12} className="text-white/60" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditValue(budget.toString()); setEditingBudget(true); }}
                    className="text-[11px] text-white/25 hover:text-white/40 transition-colors"
                  >
                    Edit budget
                  </button>
                )}
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
