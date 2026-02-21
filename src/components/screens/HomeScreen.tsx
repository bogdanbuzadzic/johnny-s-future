import { useState } from 'react';
import { Settings, MessageCircle, Pencil, ChevronUp, Sparkles, Coins, ArrowRight } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { tipsByPersona } from '@/lib/personaMessaging';
import { getPersona } from '@/lib/profileData';
import johnnyImage from '@/assets/johnny.png';

export function HomeScreen() {
  const { openTimeline, openTodayDrawer, setActiveTab } = useApp();
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

  const handleCanIAfford = () => {
    setActiveTab(1); // Navigate to My Money tab
  };

  const handleAskJohnny = () => {
    toast({
      title: "Johnny AI coming soon!",
      description: "I'll be able to answer your financial questions soon."
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
      onDragEnd={handleDragEnd}>

      {/* Top Bar */}
      <div className="flex items-center justify-between pt-12 pb-6">
        {/* Settings pill */}
        <motion.button
          className="frosted-button rounded-full px-4 py-2 flex items-center gap-2"
          whileTap={{ scale: 0.97 }}>
          <Settings size={18} strokeWidth={1.5} style={{ color: '#2D2440' }} />
          <MessageCircle size={18} strokeWidth={1.5} style={{ color: '#2D2440' }} />
        </motion.button>
        
        {/* Today pill */}
        <motion.button
          className="rounded-full px-4 py-2 text-label font-semibold"
          style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#5C2D91' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openTodayDrawer()}>
          Today: €1,340 left
        </motion.button>
        
        {/* Edit pill */}
        <motion.button
          className="frosted-button rounded-full px-4 py-2 flex items-center gap-2"
          whileTap={{ scale: 0.97 }}>
          <Pencil size={18} strokeWidth={1.5} style={{ color: '#2D2440' }} />
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
          }}>
          <img
            src={johnnyImage}
            alt="Johnny the piggy bank"
            className="w-[120px] h-[120px] object-contain" />
        </motion.div>
        
        <h1 className="text-xl font-bold mt-4" style={{ color: '#2D2440' }}>Johnny</h1>
        <p className="text-sm mt-1" style={{ color: '#5C4F6E' }}>Your Best Financial Friend</p>
      </div>

      {/* Johnny's Notes Card */}
      <div className="px-4 mb-4">
      </div>

      {/* Bottom Action Area */}
      <div className="pb-6 space-y-4">
        {/* Swipe hint */}
        <div className="flex justify-center">
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronUp size={24} strokeWidth={1.5} style={{ color: '#8A7FA0' }} />
          </motion.div>
        </div>

        {/* Action chips */}
        <div className="flex gap-3 justify-center">
          <motion.button
            className="frosted-button rounded-full px-4 py-3 flex items-center gap-2 text-sm font-medium"
            whileTap={{ scale: 0.97 }}
            onClick={() => openTodayDrawer()}>
            <Sparkles size={18} strokeWidth={1.5} />
            What if?
          </motion.button>
          
          <motion.button
            className="frosted-button rounded-full px-4 py-3 flex items-center gap-2 text-sm font-medium"
            whileTap={{ scale: 0.97 }}
            onClick={handleCanIAfford}>
            <Coins size={18} strokeWidth={1.5} />
            Can I afford?
          </motion.button>
        </div>

        {/* Ask Johnny input */}
        <div className="frosted-input rounded-full flex items-center px-4 py-2">
          <input
            type="text"
            placeholder="Ask Johnny..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskJohnny()}
            className="flex-1 bg-transparent placeholder:text-[#8A7FA0] text-sm outline-none"
            style={{ color: '#2D2440' }} />

          <motion.button
            className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center ml-2"
            whileTap={{ scale: 0.95 }}
            onClick={handleAskJohnny}>
            <ArrowRight size={16} strokeWidth={2} className="text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>);
}