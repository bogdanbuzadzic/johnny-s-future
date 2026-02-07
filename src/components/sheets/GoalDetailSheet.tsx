import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useApp, iconMap, Goal } from '@/context/AppContext';

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeOpacity={0.2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#detailProgressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="detailProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(262 80% 66%)" />
            <stop offset="100%" stopColor="hsl(342 100% 71%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{progress}%</span>
      </div>
    </div>
  );
}

interface GoalDetailSheetProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
}

export function GoalDetailSheet({ goal, open, onClose }: GoalDetailSheetProps) {
  const { deleteGoal, viewGoalOnTimeline } = useApp();
  
  if (!goal) return null;
  
  const Icon = iconMap[goal.icon] || iconMap.Target;
  const progress = Math.round((goal.saved / goal.target) * 100);

  const handleDelete = () => {
    deleteGoal(goal.id);
    onClose();
  };

  const handleViewOnTimeline = () => {
    viewGoalOnTimeline(goal.id);
  };

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
            className="fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl max-h-[80vh] overflow-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            <div className="px-6 pb-8">
              {/* Close button */}
              <motion.button
                className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center"
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
              >
                <X size={16} strokeWidth={1.5} className="text-white" />
              </motion.button>

              {/* Content */}
              <div className="flex flex-col items-center pt-4">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
                  <Icon size={32} strokeWidth={1.5} className="text-white" />
                </div>

                <h2 className="text-xl font-bold text-white mb-4">{goal.name}</h2>

                {/* Progress ring */}
                <ProgressRing progress={progress} size={120} />

                {/* Details */}
                <div className="w-full mt-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Saved</span>
                    <span className="text-white font-medium">€{goal.saved.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Target</span>
                    <span className="text-white font-medium">€{goal.target.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Target Date</span>
                    <span className="text-white font-medium">{goal.targetDate}</span>
                  </div>
                  {goal.monthlyContribution > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Monthly Contribution</span>
                      <span className="text-white font-medium">€{goal.monthlyContribution}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="w-full mt-6 space-y-3">
                  <motion.button
                    className="w-full py-3 rounded-2xl gradient-primary text-white font-medium flex items-center justify-center gap-2"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleViewOnTimeline}
                  >
                    <TrendingUp size={18} strokeWidth={1.5} />
                    View on Timeline
                  </motion.button>
                  
                  <div className="flex gap-3">
                    <motion.button
                      className="flex-1 py-3 rounded-2xl glass text-white font-medium flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Pencil size={16} strokeWidth={1.5} />
                      Edit
                    </motion.button>
                    <motion.button
                      className="flex-1 py-3 rounded-2xl glass text-white font-medium flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDelete}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                      Delete
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
