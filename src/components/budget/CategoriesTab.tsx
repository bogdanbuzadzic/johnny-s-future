import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Check, X, Info, AlertTriangle,
  UtensilsCrossed, ShoppingBag, Bus, Film, Dumbbell, CreditCard, Coffee, MoreHorizontal
} from 'lucide-react';
import { useBudget, Transaction } from '@/context/BudgetContext';
import { ProgressRing } from './ProgressRing';
import { format, parseISO } from 'date-fns';

import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBag,
  Bus,
  Film,
  Dumbbell,
  CreditCard,
  Coffee,
  MoreHorizontal,
};

export function CategoriesTab() {
  const {
    expenseCategories,
    flexBudget,
    transactions,
    getCategorySpent,
    getCategoryRemaining,
    updateCategory,
    addCategory,
    deleteCategory,
  } = useBudget();

  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('ShoppingBag');
  const [newCatBudget, setNewCatBudget] = useState('');

  const totalAllocated = expenseCategories.reduce((sum, c) => sum + c.monthlyBudget, 0);
  const unallocated = flexBudget - totalAllocated;

  const getTransactionsForCategory = (categoryId: string): Transaction[] => {
    return transactions
      .filter(t => t.categoryId === categoryId && t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleStartEdit = (id: string, currentBudget: number) => {
    setEditingId(id);
    setEditValue(currentBudget.toString());
  };

  const handleSaveEdit = (id: string) => {
    const newBudget = parseFloat(editValue) || 0;
    updateCategory(id, { monthlyBudget: newBudget });
    setEditingId(null);
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    addCategory({
      name: newCatName,
      icon: newCatIcon,
      monthlyBudget: parseFloat(newCatBudget) || 0,
      type: 'expense',
    });
    setNewCatName('');
    setNewCatBudget('');
    setShowAddForm(false);
  };

  const iconOptions = Object.keys(iconMap);

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex justify-center">
        <div className="glass-light rounded-full p-1 flex">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === 'week' ? 'bg-white/20 text-white' : 'text-white/60'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === 'month' ? 'bg-white/20 text-white' : 'text-white/60'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Category cards */}
      {expenseCategories.map((category) => {
        const Icon = iconMap[category.icon] || MoreHorizontal;
        const budget = period === 'week' ? category.monthlyBudget / 4.33 : category.monthlyBudget;
        const spent = getCategorySpent(category.id, period);
        const remaining = budget - spent;
        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
        const isExpanded = expandedId === category.id;
        const categoryTransactions = getTransactionsForCategory(category.id);

        return (
          <motion.div
            key={category.id}
            layout
            className="glass rounded-3xl overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : category.id)}
              className="w-full p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">{category.name}</p>
                <p className="text-white/60 text-sm">
                  €{spent.toFixed(0)} / €{budget.toFixed(0)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${
                  remaining < 0 ? 'text-destructive' : remaining < budget * 0.2 ? 'text-attention' : 'text-positive'
                }`}>
                  €{remaining.toFixed(0)} left
                </span>
                <ProgressRing progress={percentUsed} size={36} strokeWidth={3} />
              </div>
            </button>

            {/* Progress bar */}
            <div className="px-4 pb-4">
              <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    percentUsed >= 100 ? 'bg-destructive' : percentUsed >= 75 ? 'bg-attention' : 'bg-positive'
                  }`}
                  style={{ width: `${Math.min(100, percentUsed)}%` }}
                />
              </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10"
                >
                  <div className="p-4 space-y-3">
                    {categoryTransactions.length === 0 ? (
                      <p className="text-white/40 text-sm text-center py-2">No spending yet</p>
                    ) : (
                      categoryTransactions.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-white text-sm">{t.description || 'Expense'}</p>
                            <p className="text-white/40 text-xs">{format(parseISO(t.date), 'MMM d')}</p>
                          </div>
                          <span className="text-white/80">€{t.amount.toFixed(2)}</span>
                        </div>
                      ))
                    )}

                    {/* Edit budget */}
                    <div className="pt-2 border-t border-white/10">
                      {editingId === category.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-sm">Monthly budget:</span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 glass-light rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(category.id)}
                            className="p-1.5 rounded-lg bg-primary/20"
                          >
                            <Check className="w-4 h-4 text-primary" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-white/10"
                          >
                            <X className="w-4 h-4 text-white/60" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(category.id, category.monthlyBudget)}
                          className="text-primary text-sm"
                        >
                          Edit budget
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Unallocated row */}
      {unallocated !== 0 && (
        <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${
          unallocated < 0 ? 'border border-attention/30' : ''
        }`}>
          {unallocated > 0 ? (
            <>
              <Info className="w-5 h-5 text-white/60" />
              <span className="text-white/60 text-sm">€{unallocated.toFixed(0)} unallocated</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-attention" />
              <span className="text-attention text-sm">€{Math.abs(unallocated).toFixed(0)} over-allocated</span>
            </>
          )}
        </div>
      )}

      {/* Add category */}
      {showAddForm ? (
        <div className="glass rounded-3xl p-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {iconOptions.map((iconName) => {
              const IconComp = iconMap[iconName];
              return (
                <button
                  key={iconName}
                  onClick={() => setNewCatIcon(iconName)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    newCatIcon === iconName ? 'bg-white/30' : 'glass-light'
                  }`}
                >
                  <IconComp className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Monthly budget"
              value={newCatBudget}
              onChange={(e) => setNewCatBudget(e.target.value)}
              className="flex-1 glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
            />
            <button
              onClick={handleAddCategory}
              className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"
            >
              <Check className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="w-12 h-12 rounded-xl glass-light flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-white/60"
        >
          <Plus className="w-5 h-5" />
          Add category
        </button>
      )}
    </div>
  );
}
