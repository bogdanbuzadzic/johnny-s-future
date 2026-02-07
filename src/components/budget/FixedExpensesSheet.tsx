import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Plus, Trash2, Home, Zap, Wifi, Shield, GraduationCap, Car, Smartphone, Heart, CreditCard, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const iconMap: Record<string, LucideIcon> = {
  Home,
  Zap,
  Wifi,
  Shield,
  GraduationCap,
  Car,
  Smartphone,
  Heart,
  CreditCard,
  Lock,
};

const iconList = Object.keys(iconMap);

interface FixedExpensesSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FixedExpensesSheet({ open, onClose }: FixedExpensesSheetProps) {
  const { fixedCategories, totalFixed, addCategory, updateCategory, deleteCategory } = useBudget();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIcon, setNewIcon] = useState('Home');

  const handleStartEdit = (id: string, currentBudget: number) => {
    setEditingId(id);
    setEditValue(currentBudget.toString());
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateCategory(editingId, { monthlyBudget: parseFloat(editValue) || 0 });
      setEditingId(null);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory(deleteId);
      setDeleteId(null);
    }
  };

  const handleAdd = () => {
    if (!newName) return;
    addCategory({
      name: newName,
      icon: newIcon,
      monthlyBudget: parseFloat(newAmount) || 0,
      type: 'fixed',
    });
    setNewName('');
    setNewAmount('');
    setShowAddForm(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent 
          side="bottom" 
          className="h-[80vh] rounded-t-3xl border-0 bg-transparent p-0"
        >
          <div className="h-full jfb-bg rounded-t-3xl overflow-auto">
            <SheetHeader className="p-5 pb-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-white text-lg font-semibold">Fixed Expenses</SheetTitle>
                <button onClick={onClose} className="p-2 -mr-2">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </SheetHeader>

            <div className="p-5 space-y-3">
              {fixedCategories.map((cat) => {
                const Icon = iconMap[cat.icon] || Lock;
                const isEditing = editingId === cat.id;

                return (
                  <div key={cat.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full glass-light flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <span className="flex-1 text-white font-medium">{cat.name}</span>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">€</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 bg-transparent text-white text-right outline-none border-b border-white/30"
                          autoFocus
                        />
                        <button onClick={handleSaveEdit} className="p-1.5 rounded-lg bg-primary/20">
                          <Check className="w-4 h-4 text-primary" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-white/10">
                          <X className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(cat.id, cat.monthlyBudget)}
                          className="text-white/80"
                        >
                          €{cat.monthlyBudget}/month
                        </button>
                        <button
                          onClick={() => setDeleteId(cat.id)}
                          className="p-2 -mr-2"
                        >
                          <Trash2 className="w-4 h-4 text-white/40 hover:text-destructive transition-colors" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Total */}
              <div className="glass rounded-2xl p-4 flex justify-between items-center">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-bold text-lg">€{totalFixed}/month</span>
              </div>

              {/* Add form */}
              {showAddForm ? (
                <div className="glass rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {iconList.map((iconName) => {
                      const IconComp = iconMap[iconName];
                      return (
                        <button
                          key={iconName}
                          onClick={() => setNewIcon(iconName)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            newIcon === iconName ? 'bg-white/30' : 'glass-light'
                          }`}
                        >
                          <IconComp className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    placeholder="Expense name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
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
                    <button onClick={handleAdd} className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => setShowAddForm(false)} className="w-12 h-12 rounded-xl glass-light flex items-center justify-center">
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
                  Add expense
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="glass border-0 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete expense?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will remove this fixed expense from your budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-light border-0 text-white hover:bg-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
