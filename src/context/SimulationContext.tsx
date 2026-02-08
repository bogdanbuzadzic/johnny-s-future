import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// Simulation type for "what if" scenarios
export type Simulation = {
  id: string;
  type: 'spend' | 'cancel-bill';
  amount: number;
  date: string;           // ISO date string
  description: string;    // "Concert tickets" or "Skip Spotify"
  targetDayIndex: number; // Index in days array
};

interface SimulationContextType {
  activeSimulations: Simulation[];
  isSimulating: boolean;
  addSimulation: (sim: Omit<Simulation, 'id'>) => void;
  removeSimulation: (id: string) => void;
  clearAllSimulations: () => void;
  
  // Base values (from real data)
  flexRemaining: number;
  dailyAllowance: number;
  daysRemaining: number;
  
  // Computed values layered on top of real data
  simulatedFlexRemaining: number;
  simulatedDailyAllowance: number;
  getSimulatedDaySpending: (dayIndex: number) => number;
  getDayHasSimulation: (dayIndex: number) => boolean;
  getDaySimulations: (dayIndex: number) => Simulation[];
  isBillSkipped: (billName: string, dayIndex: number) => boolean;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

interface SimulationProviderProps {
  children: ReactNode;
  flexRemaining: number;
  dailyAllowance: number;
  daysRemaining: number;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({
  children,
  flexRemaining,
  dailyAllowance,
  daysRemaining,
}) => {
  const [activeSimulations, setActiveSimulations] = useState<Simulation[]>([]);

  const isSimulating = activeSimulations.length > 0;

  const addSimulation = (sim: Omit<Simulation, 'id'>) => {
    setActiveSimulations(prev => [...prev, { ...sim, id: crypto.randomUUID() }]);
  };

  const removeSimulation = (id: string) => {
    setActiveSimulations(prev => prev.filter(s => s.id !== id));
  };

  const clearAllSimulations = () => {
    setActiveSimulations([]);
  };

  // Calculate simulated values
  const simulatedFlexRemaining = useMemo(() => {
    const spendSims = activeSimulations.filter(s => s.type === 'spend');
    const cancelSims = activeSimulations.filter(s => s.type === 'cancel-bill');
    
    const totalSpend = spendSims.reduce((sum, s) => sum + s.amount, 0);
    const totalCancelled = cancelSims.reduce((sum, s) => sum + s.amount, 0);
    
    return flexRemaining - totalSpend + totalCancelled;
  }, [activeSimulations, flexRemaining]);

  const simulatedDailyAllowance = useMemo(() => {
    return Math.max(0, simulatedFlexRemaining / Math.max(1, daysRemaining));
  }, [simulatedFlexRemaining, daysRemaining]);

  const getSimulatedDaySpending = (dayIndex: number): number => {
    const daySpendSims = activeSimulations.filter(
      s => s.type === 'spend' && s.targetDayIndex === dayIndex
    );
    return daySpendSims.reduce((sum, s) => sum + s.amount, 0);
  };

  const getDayHasSimulation = (dayIndex: number): boolean => {
    return activeSimulations.some(s => s.targetDayIndex === dayIndex);
  };

  const getDaySimulations = (dayIndex: number): Simulation[] => {
    return activeSimulations.filter(s => s.targetDayIndex === dayIndex);
  };

  const isBillSkipped = (billName: string, dayIndex: number): boolean => {
    return activeSimulations.some(
      s => s.type === 'cancel-bill' && 
           s.targetDayIndex === dayIndex && 
           s.description.toLowerCase().includes(billName.toLowerCase())
    );
  };

  const value: SimulationContextType = {
    activeSimulations,
    isSimulating,
    addSimulation,
    removeSimulation,
    clearAllSimulations,
    flexRemaining,
    dailyAllowance,
    daysRemaining,
    simulatedFlexRemaining,
    simulatedDailyAllowance,
    getSimulatedDaySpending,
    getDayHasSimulation,
    getDaySimulations,
    isBillSkipped,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
