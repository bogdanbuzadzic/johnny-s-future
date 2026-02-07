import { Plus, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, iconMap, Goal } from '@/context/AppContext';
import { useState } from 'react';
import { GoalDetailSheet } from '@/components/sheets/GoalDetailSheet';
import { AddGoalSheet } from '@/components/sheets/AddGoalSheet';

function ProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="white"
        strokeOpacity={0.2}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(262 80% 66%)" />
          <stop offset="100%" stopColor="hsl(342 100% 71%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const Icon = iconMap[goal.icon] || iconMap.Target;
  const progress = Math.round((goal.saved / goal.target) * 100);

  return (
    <motion.button
      className="glass rounded-3xl p-5 w-full text-left"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        {/* Icon and info */}
        <div className="flex-1 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl glass-light flex items-center justify-center">
            <Icon size={20} strokeWidth={1.5} className="text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">{goal.name}</h3>
            <p className="text-white/60 text-xs mt-0.5">
              €{goal.saved.toLocaleString()} / €{goal.target.toLocaleString()}
            </p>
            
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            
            <p className="text-white/50 text-xs mt-1">{progress}% complete</p>
          </div>
        </div>

        {/* Right side: date, contribution, progress ring */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-white/60 text-xs">{goal.targetDate}</span>
          {goal.monthlyContribution > 0 && (
            <span className="text-white text-xs font-medium">€{goal.monthlyContribution}/mo</span>
          )}
          <div className="mt-1">
            <ProgressRing progress={progress} size={40} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function GoalsScreen() {
  const { goals, setSelectedGoalId, selectedGoalId } = useApp();
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  
  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  return (
    <div className="min-h-screen pb-24 px-5 pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Your Goals</h1>
        <motion.button
          className="w-10 h-10 rounded-full glass flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddGoalOpen(true)}
        >
          <Plus size={20} strokeWidth={1.5} className="text-white" />
        </motion.button>
      </div>

      {/* Goals list */}
      <div className="space-y-3">
        <AnimatePresence>
          {goals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GoalCard 
                goal={goal} 
                onClick={() => setSelectedGoalId(goal.id)} 
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Goal detail sheet */}
      <GoalDetailSheet 
        goal={selectedGoal || null}
        open={!!selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
      />

      {/* Add goal sheet */}
      <AddGoalSheet 
        open={addGoalOpen}
        onClose={() => setAddGoalOpen(false)}
      />
    </div>
  );
}
