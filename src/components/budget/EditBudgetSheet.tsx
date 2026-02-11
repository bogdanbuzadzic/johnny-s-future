import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Wallet, PiggyBank, RefreshCw, Trash2 } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface EditBudgetSheetProps {
  open: boolean;
  onClose: () => void;
}

export function EditBudgetSheet({ open, onClose }: EditBudgetSheetProps) {
  const { config, updateConfig, resetMonth, resetAll, expenseCategories, deleteCategory } = useBudget();

  const [editingField, setEditingField] = useState<'income' | 'savings' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  const handleStartEdit = (field: 'income' | 'savings') => {
    setEditingField(field);
    setEditValue(field === 'income' ? config.monthlyIncome.toString() : config.monthlySavingsTarget.toString());
  };

  const handleSaveEdit = () => {
    if (editingField === 'income') {
      updateConfig({ monthlyIncome: parseFloat(editValue) || 0 });
    } else if (editingField === 'savings') {
      updateConfig({ monthlySavingsTarget: parseFloat(editValue) || 0 });
    }
    setEditingField(null);
  };

  const handleReset = () => {
    resetMonth();
    setShowResetConfirm(false);
  };

  const handleResetAll = () => {
    resetAll();
    setShowResetAllConfirm(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh] rounded-t-3xl border-0 bg-transparent p-0"
        >
          <div className="h-full jfb-bg rounded-t-3xl overflow-auto">
            <SheetHeader className="p-5 pb-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-white text-lg font-semibold">Budget Settings</SheetTitle>
                <button onClick={onClose} className="p-2 -mr-2">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </SheetHeader>

            <div className="p-5 space-y-4">
              {/* Monthly income */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-white">Monthly income</span>
                  
                  {editingField === 'income' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">€</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 bg-transparent text-white text-right outline-none border-b border-white/30"
                        autoFocus
                      />
                      <button onClick={handleSaveEdit} className="p-1.5 rounded-lg bg-primary/20">
                        <Check className="w-4 h-4 text-primary" />
                      </button>
                      <button onClick={() => setEditingField(null)} className="p-1.5 rounded-lg bg-white/10">
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit('income')}
                      className="text-white/80"
                    >
                      €{config.monthlyIncome}
                    </button>
                  )}
                </div>
              </div>

              {/* Savings target */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-white">Savings target</span>
                  
                  {editingField === 'savings' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">€</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 bg-transparent text-white text-right outline-none border-b border-white/30"
                        autoFocus
                      />
                      <button onClick={handleSaveEdit} className="p-1.5 rounded-lg bg-primary/20">
                        <Check className="w-4 h-4 text-primary" />
                      </button>
                      <button onClick={() => setEditingField(null)} className="p-1.5 rounded-lg bg-white/10">
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit('savings')}
                      className="text-white/80"
                    >
                      €{config.monthlySavingsTarget}
                    </button>
                  )}
                </div>
              </div>

              {/* Reset month */}
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-attention" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-white font-medium">Reset month</p>
                  <p className="text-white/50 text-sm">Clear all transactions for this month</p>
                </div>
              </button>

              {/* Categories list */}
              {expenseCategories.length > 0 && (
                <div>
                  <h3 className="text-white/60 text-sm font-medium mb-3 px-1">Spending categories</h3>
                  <div className="space-y-2">
                    {expenseCategories.map((cat) => (
                      <div key={cat.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                        <span className="flex-1 text-white">{cat.name}</span>
                        <span className="text-white/60">€{cat.monthlyBudget}</span>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-2 -mr-2"
                        >
                          <Trash2 className="w-4 h-4 text-white/40 hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start from scratch */}
              <button
                onClick={() => setShowResetAllConfirm(true)}
                className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-white font-medium">Start from scratch</p>
                  <p className="text-white/50 text-sm">Delete everything and restart setup</p>
                </div>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="glass border-0 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reset {format(new Date(), 'MMMM')}?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will clear all transactions for {format(new Date(), 'MMMM')}. Categories and budgets will stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-light border-0 text-white hover:bg-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-white hover:bg-destructive/90">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Reset All confirmation */}
      <AlertDialog open={showResetAllConfirm} onOpenChange={setShowResetAllConfirm}>
        <AlertDialogContent className="glass border-0 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Start from scratch?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete all your categories, transactions, and settings. You'll go back to the setup wizard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-light border-0 text-white hover:bg-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAll} className="bg-destructive text-white hover:bg-destructive/90">
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
