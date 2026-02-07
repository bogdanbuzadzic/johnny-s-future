import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/context/AppContext";
import { TabBar } from "@/components/TabBar";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { PlaceholderScreen } from "@/components/screens/PlaceholderScreen";
import { GoalsScreen } from "@/components/screens/GoalsScreen";
import { TimelineSheet } from "@/components/sheets/TimelineSheet";
import { TodayDrawer } from "@/components/sheets/TodayDrawer";

const queryClient = new QueryClient();

function AppContent() {
  const { activeTab, timelineOpen, todayDrawerOpen, closeTimeline, closeTodayDrawer } = useApp();

  const renderScreen = () => {
    switch (activeTab) {
      case 0:
        return <HomeScreen />;
      case 1:
        return <PlaceholderScreen title="Financial Tetris" message="Financial Tetris coming soon" />;
      case 2:
        return <PlaceholderScreen title="Budget" message="Budget tool coming soon" />;
      case 3:
        return <GoalsScreen />;
      case 4:
        return <PlaceholderScreen title="Profile" message="Profile coming soon" />;
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
