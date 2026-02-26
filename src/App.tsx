import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/context/AppContext";
import { TabBar } from "@/components/TabBar";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { MyMoneyScreen } from "@/components/screens/MyMoneyScreen";
import { TimelineSheet } from "@/components/sheets/TimelineSheet";
import { TodayDrawer } from "@/components/sheets/TodayDrawer";

const queryClient = new QueryClient();

function AppContent() {
  const { activeTab, timelineOpen, todayDrawerOpen, closeTimeline, closeTodayDrawer } = useApp();

  // Auto-snapshot current month budget data on every app load
  useEffect(() => {
    try {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const budgetData = JSON.parse(localStorage.getItem('jfb-budget-data') || '{}');
      if (!budgetData.config?.setupComplete) return;

      const categories = (budgetData.categories || []).filter((c: any) => c.type === 'expense');
      const transactions = (budgetData.transactions || []).filter((t: any) => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const snapshot = {
        month: key,
        categories: categories.map((c: any) => ({
          id: c.id, name: c.name, color: c.icon || 'default',
          budget: c.monthlyBudget || 0,
          spent: transactions.filter((t: any) => t.categoryId === c.id).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0),
        })),
        totalSpent: transactions.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0),
        income: budgetData.config?.monthlyIncome || 0,
        timestamp: Date.now(),
      };

      const snapshots = JSON.parse(localStorage.getItem('jfb_month_snapshots') || '{}');
      snapshots[key] = snapshot;

      // Create synthetic previous month if it doesn't exist (for demo)
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      if (!snapshots[prevKey]) {
        snapshots[prevKey] = {
          month: prevKey,
          categories: categories.map((c: any) => ({
            id: c.id, name: c.name, color: c.icon || 'default',
            budget: c.monthlyBudget || 0,
            spent: Math.round((c.monthlyBudget || 0) * (0.7 + Math.random() * 0.5)),
          })),
          totalSpent: categories.reduce((s: number, c: any) => s + Math.round((c.monthlyBudget || 0) * (0.7 + Math.random() * 0.5)), 0),
          income: budgetData.config?.monthlyIncome || 0,
          timestamp: Date.now(),
        };
      }

      localStorage.setItem('jfb_month_snapshots', JSON.stringify(snapshots));
    } catch (e) {
      console.error('Snapshot save error:', e);
    }
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 0:
        return <HomeScreen />;
      case 1:
        return <MyMoneyScreen />;
      case 2:
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="jfb-bg fixed inset-0 overflow-hidden">
      {renderScreen()}
      <TabBar />
      <TimelineSheet open={timelineOpen} onClose={closeTimeline} />
      <TodayDrawer open={todayDrawerOpen} onClose={closeTodayDrawer} />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
