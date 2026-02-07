import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Plus } from 'lucide-react';
import { BudgetProvider, useBudget } from '@/context/BudgetContext';
import { SetupWizard } from '@/components/budget/SetupWizard';
import { OverviewTab } from '@/components/budget/OverviewTab';
import { CategoriesTab } from '@/components/budget/CategoriesTab';
import { IncomeTab } from '@/components/budget/IncomeTab';
import { AddTransactionSheet } from '@/components/budget/AddTransactionSheet';
import { FixedExpensesSheet } from '@/components/budget/FixedExpensesSheet';
import { EditBudgetSheet } from '@/components/budget/EditBudgetSheet';

function BudgetScreenContent() {
  const { config } = useBudget();
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'income'>('overview');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showFixedExpenses, setShowFixedExpenses] = useState(false);
  const [showEditBudget, setShowEditBudget] = useState(false);

  // Show setup wizard if not complete
  if (!config.setupComplete) {
    return <SetupWizard />;
  }

  const handleSwitchTab = (tab: string) => {
    if (tab === 'categories' || tab === 'income' || tab === 'overview') {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {/* Tab pills */}
        <div className="glass-light rounded-full p-1 flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-white/20 text-white' : 'text-white/60'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'categories' ? 'bg-white/20 text-white' : 'text-white/60'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'income' ? 'bg-white/20 text-white' : 'text-white/60'
            }`}
          >
            Income
          </button>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setShowEditBudget(true)}
          className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
        >
          <Sliders className="w-5 h-5 text-white" strokeWidth={1.5} />
        </button>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <OverviewTab 
            onOpenFixedExpenses={() => setShowFixedExpenses(true)}
            onSwitchTab={handleSwitchTab}
          />
        )}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'income' && <IncomeTab />}
      </motion.div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddTransaction(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg z-40"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2} />
      </motion.button>

      {/* Sheets */}
      <AddTransactionSheet 
        open={showAddTransaction} 
        onClose={() => setShowAddTransaction(false)} 
      />
      <FixedExpensesSheet 
        open={showFixedExpenses} 
        onClose={() => setShowFixedExpenses(false)} 
      />
      <EditBudgetSheet 
        open={showEditBudget} 
        onClose={() => setShowEditBudget(false)} 
      />
    </div>
  );
}

export function BudgetScreen() {
  return (
    <BudgetProvider>
      <BudgetScreenContent />
    </BudgetProvider>
  );
}
