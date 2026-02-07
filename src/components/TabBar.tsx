import { Home, LayoutGrid, BarChart3, Target, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

const tabs = [
  { icon: Home, label: 'Home' },
  { icon: LayoutGrid, label: 'Tetris' },
  { icon: BarChart3, label: 'Budget' },
  { icon: Target, label: 'Goals' },
  { icon: User, label: 'Profile' },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="glass border-t border-white/10">
        <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === index;
            
            return (
              <motion.button
                key={tab.label}
                onClick={() => setActiveTab(index)}
                className="flex flex-col items-center gap-1 py-2 px-3"
                whileTap={{ scale: 0.95 }}
              >
                <Icon 
                  size={22} 
                  strokeWidth={1.5}
                  className={isActive ? 'text-white' : 'text-white/40'}
                />
                <span 
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      {/* Safe area spacer for mobile */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black/20" />
    </div>
  );
}
