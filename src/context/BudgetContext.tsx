import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, getDaysInMonth, getDate, isWithinInterval, parseISO, format, addMonths, subMonths } from 'date-fns';

// Types
export type Transaction = {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  description: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly';
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  monthlyBudget: number;
  type: 'expense' | 'fixed' | 'savings';
  sortOrder: number;
};

export type BudgetConfig = {
  monthlyIncome: number;
  monthlySavingsTarget: number;
  setupComplete: boolean;
};

type BudgetData = {
  config: BudgetConfig;
  categories: Category[];
  transactions: Transaction[];
};

const STORAGE_KEY = 'jfb-budget-data';

const defaultConfig: BudgetConfig = {
  monthlyIncome: 0,
  monthlySavingsTarget: 0,
  setupComplete: false,
};

const defaultData: BudgetData = {
  config: defaultConfig,
  categories: [],
  transactions: [],
};

// Context type
type BudgetContextType = {
  config: BudgetConfig;
  categories: Category[];
  transactions: Transaction[];
  
  // Computed values
  totalIncome: number;
  totalFixed: number;
  savingsTarget: number;
  flexBudget: number;
  flexSpent: number;
  flexRemaining: number;
  daysInMonth: number;
  dayOfMonth: number;
  daysRemaining: number;
  dailyAllowance: number;
  percentSpent: number;
  percentMonth: number;
  paceStatus: 'on-track' | 'watch' | 'slow-down';
  
  // Helper functions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'sortOrder'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  updateConfig: (updates: Partial<BudgetConfig>) => void;
  getCategorySpent: (categoryId: string, period: 'month' | 'week') => number;
  getCategoryRemaining: (categoryId: string, period: 'month' | 'week') => number;
  getWeekTransactions: (weekStart: Date, weekEnd: Date) => Transaction[];
  getMonthTransactions: (month: Date) => Transaction[];
  getMonthIncome: (month: Date) => number;
  getMonthExpenses: (month: Date) => number;
  resetMonth: () => void;
  resetAll: () => void;
  expenseCategories: Category[];
  fixedCategories: Category[];
};

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BudgetData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          config: { ...defaultConfig, ...parsed.config },
          categories: parsed.categories || [],
          transactions: parsed.transactions || [],
        };
      }
    } catch (e) {
      console.error('Failed to load budget data:', e);
    }
    return defaultData;
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save budget data:', e);
    }
  }, [data]);

  const { config, categories, transactions } = data;

  // Computed values
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = getDaysInMonth(now);
  const dayOfMonth = getDate(now);
  const daysRemaining = daysInMonth - dayOfMonth + 1;

  const totalIncome = config.monthlyIncome;
  const totalFixed = useMemo(() => 
    categories.filter(c => c.type === 'fixed').reduce((sum, c) => sum + c.monthlyBudget, 0),
    [categories]
  );
  const savingsTarget = config.monthlySavingsTarget;
  const flexBudget = totalIncome - totalFixed - savingsTarget;

  const expenseCategories = useMemo(() => 
    categories.filter(c => c.type === 'expense').sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const fixedCategories = useMemo(() => 
    categories.filter(c => c.type === 'fixed').sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const flexSpent = useMemo(() => {
    const expenseCatIds = new Set(expenseCategories.map(c => c.id));
    return transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!expenseCatIds.has(t.categoryId)) return false;
        const date = parseISO(t.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0), 0);
  }, [transactions, expenseCategories, monthStart, monthEnd]);

  const flexRemaining = flexBudget - flexSpent;
  const dailyAllowance = Math.max(0, flexRemaining / daysRemaining);
  const percentSpent = flexBudget > 0 ? (flexSpent / flexBudget) * 100 : 0;
  const percentMonth = (dayOfMonth / daysInMonth) * 100;

  const paceStatus: 'on-track' | 'watch' | 'slow-down' = useMemo(() => {
    if (percentSpent <= percentMonth + 5) return 'on-track';
    if (percentSpent <= percentMonth + 15) return 'watch';
    return 'slow-down';
  }, [percentSpent, percentMonth]);

  // Helper functions
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      amount: typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0,
      id: crypto.randomUUID(),
    };
    setData(prev => ({
      ...prev,
      transactions: [...prev.transactions, newTransaction],
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
    }));
  }, []);

  const addCategory = useCallback((category: Omit<Category, 'id' | 'sortOrder'>) => {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      sortOrder: categories.length,
    };
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
  }, [categories.length]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
      transactions: prev.transactions.filter(t => t.categoryId !== id),
    }));
  }, []);

  const updateConfig = useCallback((updates: Partial<BudgetConfig>) => {
    setData(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  const getCategorySpent = useCallback((categoryId: string, period: 'month' | 'week') => {
    let start: Date, end: Date;
    if (period === 'month') {
      start = monthStart;
      end = monthEnd;
    } else {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    }
    
    return transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (t.categoryId !== categoryId) return false;
        const date = parseISO(t.date);
        return isWithinInterval(date, { start, end });
      })
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0), 0);
  }, [transactions, monthStart, monthEnd, now]);

  const getCategoryRemaining = useCallback((categoryId: string, period: 'month' | 'week') => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;
    const budget = period === 'week' ? category.monthlyBudget / 4.33 : category.monthlyBudget;
    return budget - getCategorySpent(categoryId, period);
  }, [categories, getCategorySpent]);

  const getWeekTransactions = useCallback((weekStart: Date, weekEnd: Date) => {
    return transactions.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
  }, [transactions]);

  const getMonthTransactions = useCallback((month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return transactions.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start, end });
    });
  }, [transactions]);

  const getMonthIncome = useCallback((month: Date) => {
    return getMonthTransactions(month)
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [getMonthTransactions]);

  const getMonthExpenses = useCallback((month: Date) => {
    return getMonthTransactions(month)
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [getMonthTransactions]);

  const resetMonth = useCallback(() => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => {
        const date = parseISO(t.date);
        return !isWithinInterval(date, { start: monthStart, end: monthEnd });
      }),
    }));
  }, [monthStart, monthEnd]);

  const resetAll = useCallback(() => {
    setData(defaultData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: BudgetContextType = {
    config,
    categories,
    transactions,
    totalIncome,
    totalFixed,
    savingsTarget,
    flexBudget,
    flexSpent,
    flexRemaining,
    daysInMonth,
    dayOfMonth,
    daysRemaining,
    dailyAllowance,
    percentSpent,
    percentMonth,
    paceStatus,
    addTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    updateConfig,
    getCategorySpent,
    getCategoryRemaining,
    getWeekTransactions,
    getMonthTransactions,
    getMonthIncome,
    getMonthExpenses,
    resetMonth,
    resetAll,
    expenseCategories,
    fixedCategories,
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
