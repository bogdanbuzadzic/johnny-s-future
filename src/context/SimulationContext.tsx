import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// Terrain simulation type for "what if" playground
export type TerrainSimulation = {
  id: string;
  type: 'add-expense' | 'add-income' | 'cancel-bill';
  amount: number;
  dayIndex: number;
  description: string;
  originalBillId?: string;
};

interface SimulationContextType {
  // Terrain simulations
  terrainSimulations: TerrainSimulation[];
  addTerrainSimulation: (sim: Omit<TerrainSimulation, 'id'>) => void;
  removeTerrainSimulation: (id: string) => void;
  clearAllSimulations: () => void;
  isSimulating: boolean;

  // Playground mode
  playgroundMode: boolean;
  selectedTool: 'income' | 'expense';
  setPlaygroundMode: (on: boolean) => void;
  setSelectedTool: (tool: 'income' | 'expense') => void;

  // Base values
  flexRemaining: number;
  dailyAllowance: number;
  daysRemaining: number;
  monthlyIncome: number;
  averageDailySpend: number;

  // Computed simulated values
  simulatedFlexRemaining: number;
  simulatedDailyAllowance: number;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

interface SimulationProviderProps {
  children: ReactNode;
  flexRemaining: number;
  dailyAllowance: number;
  daysRemaining: number;
  monthlyIncome: number;
  averageDailySpend: number;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({
  children,
  flexRemaining,
  dailyAllowance,
  daysRemaining,
  monthlyIncome,
  averageDailySpend,
}) => {
  const [terrainSimulations, setTerrainSimulations] = useState<TerrainSimulation[]>([]);
  const [playgroundMode, setPlaygroundMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'income' | 'expense'>('expense');

  const isSimulating = terrainSimulations.length > 0;

  const addTerrainSimulation = (sim: Omit<TerrainSimulation, 'id'>) => {
    setTerrainSimulations(prev => [...prev, { ...sim, id: crypto.randomUUID() }]);
  };

  const removeTerrainSimulation = (id: string) => {
    setTerrainSimulations(prev => prev.filter(s => s.id !== id));
  };

  const clearAllSimulations = () => {
    setTerrainSimulations([]);
  };

  const handleSetPlaygroundMode = (on: boolean) => {
    setPlaygroundMode(on);
    if (!on) {
      clearAllSimulations();
    }
  };

  const simulatedFlexRemaining = useMemo(() => {
    const expenses = terrainSimulations
      .filter(s => s.type === 'add-expense')
      .reduce((sum, s) => sum + s.amount, 0);
    const income = terrainSimulations
      .filter(s => s.type === 'add-income')
      .reduce((sum, s) => sum + s.amount, 0);
    const cancelled = terrainSimulations
      .filter(s => s.type === 'cancel-bill')
      .reduce((sum, s) => sum + s.amount, 0);
    return flexRemaining - expenses + income + cancelled;
  }, [terrainSimulations, flexRemaining]);

  const simulatedDailyAllowance = useMemo(() => {
    return Math.max(0, simulatedFlexRemaining / Math.max(1, daysRemaining));
  }, [simulatedFlexRemaining, daysRemaining]);

  const value: SimulationContextType = {
    terrainSimulations,
    addTerrainSimulation,
    removeTerrainSimulation,
    clearAllSimulations,
    isSimulating,
    playgroundMode,
    selectedTool,
    setPlaygroundMode: handleSetPlaygroundMode,
    setSelectedTool,
    flexRemaining,
    dailyAllowance,
    daysRemaining,
    monthlyIncome,
    averageDailySpend,
    simulatedFlexRemaining,
    simulatedDailyAllowance,
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
