import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import johnnyImage from '@/assets/johnny.png';

interface JohnnyTipProps {
  tips: string[];
}

export function JohnnyTip({ tips }: JohnnyTipProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
    >
      <img src={johnnyImage} alt="Johnny" className="w-9 h-9 flex-shrink-0" />
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-[13px] text-white/60"
        >
          {tips[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
