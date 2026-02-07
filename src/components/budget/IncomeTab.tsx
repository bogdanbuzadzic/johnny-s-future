import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wallet, ArrowDownLeft, PiggyBank, Plus, Check, X, Trash2 } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { format, addMonths, subMonths, parseISO } from 'date-fns';

export function IncomeTab() {
  const {
    savingsTarget,
    transactions,
    getMonthIncome,
    getMonthExpenses,
    getMonthTransactions,
    addTransaction,
    deleteTransaction,
  } = useBudget();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [swipingId, setSwipingId] = useState<string | null>(null);

  const monthIncome = getMonthIncome(selectedMonth);
  const monthExpenses = getMonthExpenses(selectedMonth);
  const netResult = monthIncome - monthExpenses - savingsTarget;

  const incomeTransactions = useMemo(() => {
    return getMonthTransactions(selectedMonth)
      .filter(t => t.type === 'income')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMonth, getMonthTransactions]);

  const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  const handleAddIncome = () => {
    if (!newSource || !newAmount) return;
    addTransaction({
      amount: parseFloat(newAmount) || 0,
      type: 'income',
      categoryId: 'income',
      description: newSource,
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
    });
    setNewSource('');
    setNewAmount('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevMonth}
          className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-white font-semibold text-lg min-w-[140px] text-center">
          {format(selectedMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={handleNextMonth}
          className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-5"
      >
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <Wallet className="w-4 h-4 text-positive" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white">Income</span>
          <span className="text-positive font-medium">€{monthIncome.toFixed(0)}</span>
        </div>

        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white">Expenses</span>
          <span className="text-white/80">−€{monthExpenses.toFixed(0)}</span>
        </div>

        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full glass-light flex items-center justify-center">
            <PiggyBank className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="flex-1 text-white">Savings</span>
          <span className="text-primary">−€{savingsTarget.toFixed(0)}</span>
        </div>

        <div className="border-t border-white/10 my-2" />

        <div className="flex items-center justify-between py-2">
          <span className="text-white font-semibold">Net</span>
          <span className={`text-lg font-bold ${netResult >= 0 ? 'text-positive' : 'text-destructive'}`}>
            €{netResult.toFixed(0)}
          </span>
        </div>
      </motion.div>

      {/* Income entries */}
      <div>
        <h3 className="text-white/60 text-sm font-medium mb-3 px-1">Income entries</h3>
        
        {incomeTransactions.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-white/40 text-sm mb-3">No income recorded</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary text-sm font-medium"
            >
              Add income
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {incomeTransactions.map((t) => (
              <div
                key={t.id}
                className="glass rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden"
                onTouchStart={() => setSwipingId(t.id)}
                onTouchEnd={() => setSwipingId(null)}
              >
                <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-positive" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{t.description}</p>
                  <p className="text-white/40 text-xs">{format(parseISO(t.date), 'MMM d, yyyy')}</p>
                </div>
                <span className="text-positive font-medium">+€{t.amount.toFixed(0)}</span>
                <button
                  onClick={() => deleteTransaction(t.id)}
                  className="p-2 -mr-2"
                >
                  <Trash2 className="w-4 h-4 text-white/40 hover:text-destructive transition-colors" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add income form */}
      {showAddForm ? (
        <div className="glass rounded-3xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Income source"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="flex-1 glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
            />
            <button
              onClick={handleAddIncome}
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
      ) : incomeTransactions.length > 0 && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-white/60"
        >
          <Plus className="w-5 h-5" />
          Add income
        </button>
      )}
    </div>
  );
}
