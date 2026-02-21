import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { LucideIcon, ShieldCheck, Laptop, Plane, Car, GraduationCap, Heart, Home, Target, Dumbbell, Gamepad2 } from 'lucide-react';

// Types
export interface Goal {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  monthlyContribution: number;
  targetDate: string;
  monthIndex: number; // Position on timeline
}

export interface DataPoint {
  month: string;
  value: number;
  label: string;
}

export interface Scenario {
  id: string;
  type: string;
  name: string;
  amount: number;
  frequency: 'one-time' | 'monthly' | 'yearly';
  startDate: string;
  startMonthIndex: number;
}

interface AppState {
  activeTab: number;
  timelineOpen: boolean;
  todayDrawerOpen: boolean;
  whatIfFocused: boolean;
  planVsActualMode: boolean;
  selectedTimeRange: '1Y' | '3Y' | '5Y';
  baselineData: DataPoint[];
  simulatedData: DataPoint[] | null;
  activeScenarios: Scenario[];
  goals: Goal[];
  scrubberIndex: number;
  selectedGoalId: string | null;
  highlightedGoalId: string | null;
}

interface AppContextType extends AppState {
  setActiveTab: (tab: number) => void;
  openTimeline: (focusWhatIf?: boolean) => void;
  closeTimeline: () => void;
  openTodayDrawer: (planVsActual?: boolean) => void;
  closeTodayDrawer: () => void;
  setPlanVsActualMode: (v: boolean) => void;
  setTimeRange: (range: '1Y' | '3Y' | '5Y') => void;
  setScrubberIndex: (index: number) => void;
  addScenario: (scenario: Omit<Scenario, 'id'>) => void;
  removeScenario: (id: string) => void;
  clearScenarios: () => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setGoals: (goals: Goal[]) => void;
  setSelectedGoalId: (id: string | null) => void;
  viewGoalOnTimeline: (id: string) => void;
  getFilteredData: () => DataPoint[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Generate baseline data from Feb 2026 to Feb 2031 (5 years)
function generateBaselineData(): DataPoint[] {
  const data: DataPoint[] = [];
  const startDate = new Date(2026, 1, 1); // Feb 2026
  let value = 12450;
  
  for (let i = 0; i < 60; i++) { // 5 years = 60 months
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    
    data.push({
      month: `${monthName} ${year}`,
      value: Math.round(value),
      label: date.getMonth() % 3 === 0 ? `Q${quarter} ${year}` : '',
    });
    
    // Growth with some variation
    const baseGrowth = 500 + (i * 10); // Increasing growth over time
    const variation = (Math.random() - 0.3) * 200; // Some randomness
    value += baseGrowth + variation;
  }
  
  return data;
}

// Calculate simulation effects
function applyScenarios(baseData: DataPoint[], scenarios: Scenario[]): DataPoint[] {
  if (scenarios.length === 0) return baseData;
  
  const simData = baseData.map(d => ({ ...d, value: d.value }));
  
  scenarios.forEach(scenario => {
    const startIdx = scenario.startMonthIndex;
    
    for (let i = startIdx; i < simData.length; i++) {
      const monthsFromStart = i - startIdx;
      
      switch (scenario.type) {
        case 'raise':
          // 20% more growth each month
          if (i > 0) {
            const originalGrowth = baseData[i].value - baseData[i - 1].value;
            simData[i].value = simData[i - 1].value + (originalGrowth * 1.2);
          }
          break;
        case 'invest':
          // Add investment amount monthly, compounding at 7% annually
          const monthlyReturn = Math.pow(1.07, 1/12) - 1;
          const compoundedAmount = scenario.amount * monthsFromStart * (1 + monthlyReturn * monthsFromStart / 2);
          simData[i].value += compoundedAmount;
          break;
        case 'car':
          // One-time expense at start, then monthly payments
          if (i === startIdx) {
            simData[i].value -= scenario.amount;
          }
          simData[i].value -= 200 * monthsFromStart; // Monthly payments
          break;
        case 'baby':
          // Monthly expense increase
          simData[i].value -= scenario.amount * monthsFromStart;
          break;
        case 'cut-spending':
          // Monthly savings
          simData[i].value += scenario.amount * monthsFromStart;
          break;
        case 'custom-income':
          if (scenario.frequency === 'one-time' && i === startIdx) {
            simData[i].value += scenario.amount;
          } else if (scenario.frequency === 'monthly') {
            simData[i].value += scenario.amount * monthsFromStart;
          } else if (scenario.frequency === 'yearly' && monthsFromStart % 12 === 0) {
            simData[i].value += scenario.amount * (monthsFromStart / 12);
          }
          break;
        case 'custom-expense':
          if (scenario.frequency === 'one-time' && i === startIdx) {
            simData[i].value -= scenario.amount;
          } else if (scenario.frequency === 'monthly') {
            simData[i].value -= scenario.amount * monthsFromStart;
          } else if (scenario.frequency === 'yearly' && monthsFromStart % 12 === 0) {
            simData[i].value -= scenario.amount * (monthsFromStart / 12);
          }
          break;
      }
    }
  });
  
  return simData.map(d => ({ ...d, value: Math.round(d.value) }));
}

// Load goals from localStorage (no hardcoded defaults)
function loadGoals(): Goal[] {
  try {
    const stored = localStorage.getItem('jfb_goals');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Laptop,
  Plane,
  Car,
  GraduationCap,
  Heart,
  Home,
  Target,
  Dumbbell,
  Gamepad2,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const baselineData = useMemo(() => generateBaselineData(), []);
  
  const [state, setState] = useState<AppState>({
    activeTab: 0,
    timelineOpen: false,
    todayDrawerOpen: false,
    whatIfFocused: false,
    planVsActualMode: false,
    selectedTimeRange: '3Y',
    baselineData,
    simulatedData: null,
    activeScenarios: [],
    goals: loadGoals(),
    scrubberIndex: 0,
    selectedGoalId: null,
    highlightedGoalId: null,
  });

  const setActiveTab = (tab: number) => {
    setState(s => ({ ...s, activeTab: tab, timelineOpen: false, todayDrawerOpen: false }));
  };

  const openTimeline = (focusWhatIf = false) => {
    setState(s => ({ ...s, timelineOpen: true, whatIfFocused: focusWhatIf, todayDrawerOpen: false }));
  };

  const closeTimeline = () => {
    setState(s => ({ ...s, timelineOpen: false, whatIfFocused: false, highlightedGoalId: null }));
  };

  const openTodayDrawer = (planVsActual = false) => {
    setState(s => ({ ...s, todayDrawerOpen: true, timelineOpen: false, planVsActualMode: planVsActual }));
  };

  const closeTodayDrawer = () => {
    setState(s => ({ ...s, todayDrawerOpen: false, planVsActualMode: false }));
  };

  const setPlanVsActualMode = (v: boolean) => {
    setState(s => ({ ...s, planVsActualMode: v }));
  };

  const setTimeRange = (range: '1Y' | '3Y' | '5Y') => {
    setState(s => ({ ...s, selectedTimeRange: range, scrubberIndex: 0 }));
  };

  const setScrubberIndex = (index: number) => {
    setState(s => ({ ...s, scrubberIndex: index }));
  };

  const addScenario = (scenario: Omit<Scenario, 'id'>) => {
    const newScenario = { ...scenario, id: Date.now().toString() };
    setState(s => {
      const newScenarios = [...s.activeScenarios, newScenario];
      const simulatedData = applyScenarios(s.baselineData, newScenarios);
      return { ...s, activeScenarios: newScenarios, simulatedData };
    });
  };

  const removeScenario = (id: string) => {
    setState(s => {
      const newScenarios = s.activeScenarios.filter(sc => sc.id !== id);
      const simulatedData = newScenarios.length > 0 
        ? applyScenarios(s.baselineData, newScenarios) 
        : null;
      return { ...s, activeScenarios: newScenarios, simulatedData };
    });
  };

  const clearScenarios = () => {
    setState(s => ({ ...s, activeScenarios: [], simulatedData: null }));
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    setState(s => {
      const newGoals = [...s.goals, { ...goal, id: Date.now().toString() }];
      localStorage.setItem('jfb_goals', JSON.stringify(newGoals));
      return { ...s, goals: newGoals };
    });
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setState(s => {
      const newGoals = s.goals.map(g => g.id === id ? { ...g, ...updates } : g);
      localStorage.setItem('jfb_goals', JSON.stringify(newGoals));
      return { ...s, goals: newGoals };
    });
  };

  const deleteGoal = (id: string) => {
    setState(s => {
      const newGoals = s.goals.filter(g => g.id !== id);
      localStorage.setItem('jfb_goals', JSON.stringify(newGoals));
      return {
        ...s,
        goals: newGoals,
        selectedGoalId: s.selectedGoalId === id ? null : s.selectedGoalId,
      };
    });
  };

  const setGoals = (goals: Goal[]) => {
    localStorage.setItem('jfb_goals', JSON.stringify(goals));
    setState(s => ({ ...s, goals }));
  };

  const setSelectedGoalId = (id: string | null) => {
    setState(s => ({ ...s, selectedGoalId: id }));
  };

  const viewGoalOnTimeline = (id: string) => {
    setState(s => ({
      ...s,
      selectedGoalId: null,
      activeTab: 0,
      timelineOpen: true,
      highlightedGoalId: id,
    }));
  };

  const getFilteredData = (): DataPoint[] => {
    const ranges = { '1Y': 12, '3Y': 36, '5Y': 60 };
    const count = ranges[state.selectedTimeRange];
    return state.baselineData.slice(0, count);
  };

  const value: AppContextType = {
    ...state,
    setActiveTab,
    openTimeline,
    closeTimeline,
    openTodayDrawer,
    closeTodayDrawer,
    setPlanVsActualMode,
    setTimeRange,
    setScrubberIndex,
    addScenario,
    removeScenario,
    clearScenarios,
    addGoal,
    updateGoal,
    deleteGoal,
    setGoals,
    setSelectedGoalId,
    viewGoalOnTimeline,
    getFilteredData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
