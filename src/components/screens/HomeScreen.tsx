import { useState, useMemo } from 'react';
import { Settings, MessageCircle, Pencil, ChevronUp, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { tipsByPersona } from '@/lib/personaMessaging';
import { getPersona } from '@/lib/profileData';
import johnnyImage from '@/assets/johnny.png';

export function HomeScreen() {
  const { openTimeline, openTodayDrawer } = useApp();
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50) {
      openTimeline();
    } else if (info.offset.y > 50) {
      openTodayDrawer();
    }
  };

  const handleAskJohnny = () => {
    toast({
      title: "Johnny AI coming soon!",
      description: "I'll be able to answer your financial questions soon.",
    });
    setInputValue('');
  };

  return (
    <motion.div 
      className="flex flex-col min-h-screen pb-20 px-5"
      style={{ y, opacity }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-12 pb-6">
        {/* Settings pill */}
        <motion.button 
          className="jfb-pill"
          whileTap={{ scale: 0.97 }}
        >
          <Settings size={18} strokeWidth={1.5} />
          <MessageCircle size={18} strokeWidth={1.5} />
        </motion.button>
        
        {/* Today pill */}
        <motion.button 
          className="jfb-pill text-label"
          whileTap={{ scale: 0.97 }}
          onClick={openTodayDrawer}
        >
          Today: €1,340 left
        </motion.button>
        
        {/* Edit pill */}
        <motion.button 
          className="jfb-pill"
          whileTap={{ scale: 0.97 }}
        >
          <Pencil size={18} strokeWidth={1.5} />
        </motion.button>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-10">
        {/* Johnny */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <img 
            src={johnnyImage} 
            alt="Johnny the piggy bank" 
            className="w-[120px] h-[120px] object-contain"
          />
        </motion.div>
        
        <h1 className="text-xl font-bold text-white mt-4">Johnny</h1>
        {(() => {
          const m0 = (() => { try { return JSON.parse(localStorage.getItem('jfb_module0_answers') || 'null'); } catch { return null; } })();
          const p = getPersona(m0);
          const tips = tipsByPersona[p?.n || 'default'] || tipsByPersona['default'];
          const tip = tips[new Date().getDate() % tips.length];
          return <p className="text-sm text-white/60 mt-1">{tip}</p>;
        })()}
      </div>

      {/* Bottom Action Area */}
      <div className="pb-6 space-y-4">
        {/* Swipe hint */}
        <div className="flex justify-center">
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronUp size={24} strokeWidth={1.5} className="text-white/30" />
          </motion.div>
        </div>

        {/* Action chips */}
        <div className="flex gap-3 justify-center">
          <motion.button
            className="glass rounded-full px-4 py-3 flex items-center gap-2 text-white text-sm font-medium"
            whileTap={{ scale: 0.97 }}
            onClick={() => openTimeline(false)}
          >
            <TrendingUp size={18} strokeWidth={1.5} />
            Plan my future
          </motion.button>
          
          <motion.button
            className="glass rounded-full px-4 py-3 flex items-center gap-2 text-white text-sm font-medium"
            whileTap={{ scale: 0.97 }}
            onClick={() => openTimeline(true)}
          >
            <Sparkles size={18} strokeWidth={1.5} />
            What can I afford?
          </motion.button>
        </div>

        {/* Ask Johnny input */}
        <div className="glass rounded-full flex items-center px-4 py-2">
          <input
            type="text"
            placeholder="Ask Johnny..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskJohnny()}
            className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm outline-none"
          />
          <motion.button
            className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center ml-2"
            whileTap={{ scale: 0.95 }}
            onClick={handleAskJohnny}
          >
            <ArrowRight size={16} strokeWidth={2} className="text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
