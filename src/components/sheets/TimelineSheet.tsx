import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  ArrowUpRight, X, TrendingUp, LineChart, Car, Baby, Scissors, Plus,
  Laptop, ShieldCheck, Plane
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceDot
} from 'recharts';
import { useApp, iconMap, DataPoint } from '@/context/AppContext';
import { WhatIfConfigSheet } from './WhatIfConfigSheet';

const whatIfCards = [
  { type: 'raise', icon: TrendingUp, title: 'Get a Raise', subtitle: '+20%', defaultAmount: 500, frequency: 'monthly' as const },
  { type: 'invest', icon: LineChart, title: 'Invest', subtitle: '€100/mo', defaultAmount: 100, frequency: 'monthly' as const },
  { type: 'car', icon: Car, title: 'Buy a Car', subtitle: '€15,000', defaultAmount: 15000, frequency: 'one-time' as const },
  { type: 'baby', icon: Baby, title: 'Have a Baby', subtitle: 'New costs', defaultAmount: 500, frequency: 'monthly' as const },
  { type: 'cut-spending', icon: Scissors, title: 'Cut Spending', subtitle: '€50/mo', defaultAmount: 50, frequency: 'monthly' as const },
  { type: 'custom', icon: Plus, title: 'Custom', subtitle: '', defaultAmount: 0, frequency: 'monthly' as const },
];

interface TimelineSheetProps {
  open: boolean;
  onClose: () => void;
}

export function TimelineSheet({ open, onClose }: TimelineSheetProps) {
  const { 
    selectedTimeRange, setTimeRange, 
    baselineData, simulatedData, activeScenarios,
    scrubberIndex, setScrubberIndex,
    goals, highlightedGoalId, clearScenarios, removeScenario,
    whatIfFocused
  } = useApp();

  const [selectedWhatIf, setSelectedWhatIf] = useState<typeof whatIfCards[0] | null>(null);
  const [selectedGoalPopover, setSelectedGoalPopover] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const whatIfRef = useRef<HTMLDivElement>(null);

  // Filter data based on time range
  const ranges = { '1Y': 12, '3Y': 36, '5Y': 60 };
  const filteredData = baselineData.slice(0, ranges[selectedTimeRange]);
  const filteredSimData = simulatedData?.slice(0, ranges[selectedTimeRange]);

  // Calculate chart dimensions for scrubber positioning
  const currentData = filteredData[scrubberIndex] || filteredData[0];
  const todayValue = filteredData[0]?.value || 0;
  const deltaFromToday = currentData ? currentData.value - todayValue : 0;
  
  const endDelta = simulatedData 
    ? (filteredSimData?.[filteredSimData.length - 1]?.value || 0) - (filteredData[filteredData.length - 1]?.value || 0)
    : 0;

  // Scroll to what-if section if focused
  useEffect(() => {
    if (open && whatIfFocused && whatIfRef.current) {
      setTimeout(() => {
        whatIfRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, [open, whatIfFocused]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  const handleChartInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = clientX - rect.left;
    const percentage = relativeX / rect.width;
    const index = Math.round(percentage * (filteredData.length - 1));
    const clampedIndex = Math.max(0, Math.min(filteredData.length - 1, index));
    
    setScrubberIndex(clampedIndex);
  };

  // Get goals that fall within the current time range
  const visibleGoals = goals.filter(g => g.monthIndex >= 0 && g.monthIndex < ranges[selectedTimeRange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl overflow-hidden"
            style={{ height: '90vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            <div className="h-full overflow-auto pb-24 px-5">
              {/* Simulation Mode Banner */}
              <AnimatePresence>
                {activeScenarios.length > 0 && (
                  <motion.div
                    className="glass rounded-2xl p-3 mb-4 flex items-center justify-between"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-jfb-purple text-sm font-medium">Simulation Mode</span>
                      <span className="text-white/60 text-xs">({activeScenarios.length} scenario{activeScenarios.length > 1 ? 's' : ''})</span>
                    </div>
                    <motion.button
                      className="w-6 h-6 rounded-full glass flex items-center justify-center"
                      whileTap={{ scale: 0.95 }}
                      onClick={clearScenarios}
                    >
                      <X size={12} strokeWidth={2} className="text-white" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title text-white">Your Financial Future</h2>
                
                {/* Time range pills */}
                <div className="flex gap-1">
                  {(['1Y', '3Y', '5Y'] as const).map(range => (
                    <motion.button
                      key={range}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        selectedTimeRange === range 
                          ? 'gradient-primary text-white' 
                          : 'glass text-white/60'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Today card */}
              <div className="glass rounded-3xl p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs">Today</p>
                    <p className="text-3xl font-bold text-white">€{todayValue.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-jfb-green/20 rounded-full px-3 py-1.5">
                    <ArrowUpRight size={14} strokeWidth={1.5} className="text-jfb-green" />
                    <span className="text-jfb-green text-sm font-medium">+€580</span>
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              <div className="glass rounded-3xl p-4 mb-6">
                <div 
                  ref={chartRef}
                  className="h-[200px] relative touch-none"
                  onMouseMove={handleChartInteraction}
                  onTouchMove={handleChartInteraction}
                  onClick={handleChartInteraction}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(262 80% 66%)" />
                          <stop offset="100%" stopColor="hsl(342 100% 71%)" />
                        </linearGradient>
                        <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(262 80% 66%)" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="hsl(262 80% 66%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'white', opacity: 0.4, fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'white', opacity: 0.4, fontSize: 10 }}
                        tickFormatter={(value) => `€${(value/1000).toFixed(0)}k`}
                        width={40}
                      />
                      
                      {/* Original line (dashed when simulation active) */}
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={simulatedData ? "rgba(255,255,255,0.2)" : "url(#colorValue)"}
                        strokeWidth={2}
                        strokeDasharray={simulatedData ? "4 4" : undefined}
                        fill={simulatedData ? "transparent" : "url(#fillValue)"}
                      />
                      
                      {/* Simulated line */}
                      {filteredSimData && (
                        <Area
                          data={filteredSimData}
                          type="monotone"
                          dataKey="value"
                          stroke="url(#colorValue)"
                          strokeWidth={2}
                          fill="url(#fillValue)"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Scrubber tooltip */}
                  <motion.div
                    className="absolute glass rounded-xl px-3 py-2 pointer-events-none"
                    style={{
                      left: `${(scrubberIndex / (filteredData.length - 1)) * 100}%`,
                      top: '5px',
                      transform: 'translateX(-50%)',
                    }}
                    animate={{ opacity: 1 }}
                  >
                    <p className="text-white/60 text-[10px]">{currentData?.month}</p>
                    <p className="text-white text-sm font-bold">€{currentData?.value.toLocaleString()}</p>
                    <p className={`text-[10px] font-medium ${deltaFromToday >= 0 ? 'text-jfb-green' : 'text-jfb-pink'}`}>
                      {deltaFromToday >= 0 ? '+' : ''}€{deltaFromToday.toLocaleString()}
                    </p>
                  </motion.div>

                  {/* Scrubber circle */}
                  <motion.div
                    className="absolute w-6 h-6 rounded-full bg-white border-2 border-jfb-purple pointer-events-none shadow-lg"
                    style={{
                      left: `calc(${(scrubberIndex / (filteredData.length - 1)) * 100}% + 40px)`,
                      bottom: '20px',
                      transform: 'translate(-50%, 50%)',
                    }}
                  />

                  {/* Goal markers */}
                  {visibleGoals.map(goal => {
                    const Icon = iconMap[goal.icon] || iconMap.Target;
                    const xPos = (goal.monthIndex / (filteredData.length - 1)) * 100;
                    const isHighlighted = highlightedGoalId === goal.id;
                    
                    return (
                      <motion.button
                        key={goal.id}
                        className={`absolute w-8 h-8 rounded-full glass flex items-center justify-center ${
                          isHighlighted ? 'ring-2 ring-jfb-purple' : ''
                        }`}
                        style={{
                          left: `calc(${xPos}% + 40px)`,
                          bottom: '40px',
                          transform: 'translateX(-50%)',
                        }}
                        whileTap={{ scale: 0.95 }}
                        animate={isHighlighted ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: isHighlighted ? 3 : 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGoalPopover(selectedGoalPopover === goal.id ? null : goal.id);
                        }}
                      >
                        <Icon size={14} strokeWidth={1.5} className="text-white" />
                      </motion.button>
                    );
                  })}

                  {/* Goal popover */}
                  <AnimatePresence>
                    {selectedGoalPopover && (
                      <motion.div
                        className="absolute glass rounded-xl p-3 z-10"
                        style={{
                          left: '50%',
                          top: '40px',
                          transform: 'translateX(-50%)',
                          minWidth: '180px',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(() => {
                          const goal = goals.find(g => g.id === selectedGoalPopover);
                          if (!goal) return null;
                          const progress = Math.round((goal.saved / goal.target) * 100);
                          return (
                            <>
                              <p className="text-white font-medium text-sm">{goal.name}</p>
                              <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden">
                                <div 
                                  className="h-full gradient-primary rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="flex justify-between mt-2">
                                <span className="text-white/60 text-xs">€{goal.saved}</span>
                                <span className="text-white/60 text-xs">€{goal.target}</span>
                              </div>
                              <p className="text-white/50 text-xs mt-1">{goal.targetDate}</p>
                            </>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* End delta for simulations */}
                {simulatedData && endDelta !== 0 && (
                  <div className="flex justify-end mt-2">
                    <span className={`text-sm font-medium ${endDelta >= 0 ? 'text-jfb-green' : 'text-jfb-pink'}`}>
                      {endDelta >= 0 ? '+' : ''}€{endDelta.toLocaleString()} by end
                    </span>
                  </div>
                )}
              </div>

              {/* What-If Section */}
              <div ref={whatIfRef}>
                <h3 className="text-white font-semibold mb-3">What would happen if...</h3>
                
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
                  {whatIfCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <motion.button
                        key={card.type}
                        className="glass rounded-2xl p-4 flex-shrink-0 w-[100px] h-[120px] flex flex-col items-center justify-center gap-2"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedWhatIf(card)}
                      >
                        <div className="w-10 h-10 rounded-xl glass-light flex items-center justify-center">
                          <Icon size={20} strokeWidth={1.5} className="text-white" />
                        </div>
                        <span className="text-white text-xs font-medium text-center">{card.title}</span>
                        {card.subtitle && (
                          <span className="text-white/50 text-[10px]">{card.subtitle}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Active scenarios list */}
              {activeScenarios.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-white/60 text-sm">Active Scenarios</h4>
                  {activeScenarios.map(scenario => (
                    <div key={scenario.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-white text-sm">{scenario.name}</span>
                      <motion.button
                        className="w-6 h-6 rounded-full glass flex items-center justify-center"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => removeScenario(scenario.id)}
                      >
                        <X size={12} strokeWidth={2} className="text-white" />
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* What-If Config Sheet */}
      <WhatIfConfigSheet
        config={selectedWhatIf}
        open={!!selectedWhatIf}
        onClose={() => setSelectedWhatIf(null)}
      />
    </AnimatePresence>
  );
}
