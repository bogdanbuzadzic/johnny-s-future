import { Home, LayoutGrid, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

const tabs = [
  { icon: Home, label: 'Home' },
  { icon: LayoutGrid, label: 'My Money' },
  { icon: User, label: 'Profile' },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.4)',
      }}>
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
                  style={{ color: isActive ? '#8B5CF6' : '#5C4F6E' }}
                />
                <span 
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? '#8B5CF6' : '#5C4F6E' }}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      {/* Safe area spacer for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" style={{ background: 'rgba(255, 255, 255, 0.6)' }} />
    </div>
  );
}
