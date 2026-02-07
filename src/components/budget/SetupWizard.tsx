import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Lock, PiggyBank, ShoppingBag, Check, X, Plus,
  Home, Zap, Wifi, Shield, GraduationCap, Car, Smartphone, Heart, CreditCard,
  UtensilsCrossed, Bus, Film, Dumbbell, Coffee, MoreHorizontal, ChevronRight
} from 'lucide-react';
import { useBudget, Category } from '@/context/BudgetContext';
import { NumberKeypad } from './NumberKeypad';
import { icons } from 'lucide-react';

const fixedIcons = [
  { name: 'Home', icon: Home },
  { name: 'Zap', icon: Zap },
  { name: 'Wifi', icon: Wifi },
  { name: 'Shield', icon: Shield },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Car', icon: Car },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Heart', icon: Heart },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Lock', icon: Lock },
];

const categoryPresets = [
  { name: 'Food', icon: 'UtensilsCrossed', IconComponent: UtensilsCrossed },
  { name: 'Shopping', icon: 'ShoppingBag', IconComponent: ShoppingBag },
  { name: 'Transport', icon: 'Bus', IconComponent: Bus },
  { name: 'Entertainment', icon: 'Film', IconComponent: Film },
  { name: 'Health', icon: 'Dumbbell', IconComponent: Dumbbell },
  { name: 'Subscriptions', icon: 'CreditCard', IconComponent: CreditCard },
  { name: 'Coffee', icon: 'Coffee', IconComponent: Coffee },
  { name: 'Other', icon: 'MoreHorizontal', IconComponent: MoreHorizontal },
];

type FixedExpense = {
  id: string;
  name: string;
  icon: string;
  amount: number;
};

type SpendingCategory = {
  id: string;
  name: string;
  icon: string;
  budget: number;
};

export function SetupWizard() {
  const { updateConfig, addCategory, config, totalFixed } = useBudget();
  const [step, setStep] = useState(1);
  const [incomeValue, setIncomeValue] = useState('');
  const [savingsValue, setSavingsValue] = useState('');
  
  // Step 2: Fixed expenses
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newFixedIcon, setNewFixedIcon] = useState('Home');

  // Step 4: Spending categories
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategory[]>([]);

  const income = parseFloat(incomeValue) || 0;
  const savings = parseFloat(savingsValue) || 0;
  const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const flexBudgetPreview = income - fixedTotal - savings;
  const allocatedTotal = spendingCategories.reduce((sum, c) => sum + c.budget, 0);

  const handleNext = () => {
    if (step === 1) {
      updateConfig({ monthlyIncome: income });
    } else if (step === 2) {
      // Add fixed expenses as categories
      fixedExpenses.forEach(expense => {
        addCategory({
          name: expense.name,
          icon: expense.icon,
          monthlyBudget: expense.amount,
          type: 'fixed',
        });
      });
    } else if (step === 3) {
      updateConfig({ monthlySavingsTarget: savings });
    } else if (step === 4) {
      // Add spending categories
      spendingCategories.forEach(cat => {
        addCategory({
          name: cat.name,
          icon: cat.icon,
          monthlyBudget: cat.budget,
          type: 'expense',
        });
      });
      updateConfig({ setupComplete: true });
      return;
    }
    setStep(step + 1);
  };

  const addFixedExpense = () => {
    if (!newFixedName || !newFixedAmount) return;
    setFixedExpenses([
      ...fixedExpenses,
      {
        id: crypto.randomUUID(),
        name: newFixedName,
        icon: newFixedIcon,
        amount: parseFloat(newFixedAmount) || 0,
      },
    ]);
    setNewFixedName('');
    setNewFixedAmount('');
    setShowAddFixed(false);
  };

  const removeFixedExpense = (id: string) => {
    setFixedExpenses(fixedExpenses.filter(e => e.id !== id));
  };

  const addSpendingCategory = (preset: typeof categoryPresets[0]) => {
    if (spendingCategories.some(c => c.name === preset.name)) return;
    setSpendingCategories([
      ...spendingCategories,
      {
        id: crypto.randomUUID(),
        name: preset.name,
        icon: preset.icon,
        budget: 0,
      },
    ]);
  };

  const updateCategoryBudget = (id: string, budget: number) => {
    setSpendingCategories(cats =>
      cats.map(c => (c.id === id ? { ...c, budget } : c))
    );
  };

  const removeSpendingCategory = (id: string) => {
    setSpendingCategories(cats => cats.filter(c => c.id !== id));
  };

  const getIconComponent = (iconName: string) => {
    const preset = categoryPresets.find(p => p.icon === iconName);
    if (preset) return preset.IconComponent;
    const fixed = fixedIcons.find(f => f.name === iconName);
    if (fixed) return fixed.icon;
    return MoreHorizontal;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 jfb-bg flex flex-col"
    >
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-12 pb-6">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              s === step ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-auto px-5 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 1: Income */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">What's your monthly income?</h2>
              <p className="text-white/60 text-sm mb-8">After taxes, the total you receive each month</p>

              <div className="text-4xl font-bold text-white mb-8">
                €{incomeValue || '0'}
              </div>

              <NumberKeypad value={incomeValue} onChange={setIncomeValue} />
            </motion.div>
          )}

          {/* Step 2: Fixed Expenses */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Add your fixed costs</h2>
              <p className="text-white/60 text-sm mb-6 text-center">
                Rent, bills, loans — things that stay the same each month
              </p>

              {/* Fixed expenses list */}
              <div className="w-full space-y-2 mb-4">
                {fixedExpenses.map((expense) => {
                  const IconComponent = getIconComponent(expense.icon);
                  return (
                    <div key={expense.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="flex-1 text-white font-medium">{expense.name}</span>
                      <span className="text-white/80">€{expense.amount}</span>
                      <button onClick={() => removeFixedExpense(expense.id)} className="p-1">
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add expense form */}
              {showAddFixed ? (
                <div className="w-full glass rounded-2xl p-4 space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {fixedIcons.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        onClick={() => setNewFixedIcon(name)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          newFixedIcon === name ? 'bg-white/30' : 'glass-light'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Expense name"
                    value={newFixedName}
                    onChange={(e) => setNewFixedName(e.target.value)}
                    className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={newFixedAmount}
                      onChange={(e) => setNewFixedAmount(e.target.value)}
                      className="flex-1 glass-light rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none"
                    />
                    <button
                      onClick={addFixedExpense}
                      className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddFixed(true)}
                  className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-white/80"
                >
                  <Plus className="w-5 h-5" />
                  Add expense
                </button>
              )}

              {/* Total */}
              <div className="w-full mt-4 flex justify-between items-center px-2">
                <span className="text-white/60">Total fixed costs</span>
                <span className="text-white font-bold text-lg">€{fixedTotal}</span>
              </div>
            </motion.div>
          )}

          {/* Step 3: Savings */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <PiggyBank className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Monthly savings target</h2>
              <p className="text-white/60 text-sm mb-8">How much do you want to save each month?</p>

              <div className="text-4xl font-bold text-white mb-4">
                €{savingsValue || '0'}
              </div>

              <div className={`text-sm mb-8 ${flexBudgetPreview < 0 ? 'text-attention' : 'text-white/60'}`}>
                {flexBudgetPreview < 0 
                  ? 'Your savings + fixed costs exceed your income'
                  : `This leaves €${flexBudgetPreview.toFixed(0)} for spending`
                }
              </div>

              <NumberKeypad value={savingsValue} onChange={setSavingsValue} />
            </motion.div>
          )}

          {/* Step 4: Spending Categories */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Where does your money go?</h2>
              <p className="text-white/60 text-sm mb-6">Add categories and set budgets</p>

              {/* Quick-add pills */}
              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {categoryPresets.map((preset) => {
                  const isAdded = spendingCategories.some(c => c.name === preset.name);
                  const Icon = preset.IconComponent;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => addSpendingCategory(preset)}
                      disabled={isAdded}
                      className={`jfb-pill text-sm ${isAdded ? 'opacity-40' : ''}`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      {preset.name}
                    </button>
                  );
                })}
              </div>

              {/* Added categories */}
              <div className="w-full space-y-2 mb-4">
                {spendingCategories.map((cat) => {
                  const Icon = getIconComponent(cat.icon);
                  return (
                    <div key={cat.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="flex-1 text-white font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">€</span>
                        <input
                          type="number"
                          value={cat.budget || ''}
                          onChange={(e) => updateCategoryBudget(cat.id, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 bg-transparent text-white text-right outline-none"
                        />
                      </div>
                      <button onClick={() => removeSpendingCategory(cat.id)} className="p-1">
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Allocation indicator */}
              {flexBudgetPreview > 0 && (
                <div className="w-full glass rounded-2xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Allocated</span>
                    <span className="text-white">€{allocatedTotal} of €{flexBudgetPreview.toFixed(0)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full gradient-primary transition-all"
                      style={{ width: `${Math.min(100, (allocatedTotal / flexBudgetPreview) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Next button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          disabled={step === 1 && income === 0}
          className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {step === 4 ? 'Done' : 'Next'}
          {step < 4 && <ChevronRight className="w-5 h-5" />}
        </motion.button>
      </div>
    </motion.div>
  );
}
