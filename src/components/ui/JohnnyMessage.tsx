import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import johnnyImage from '@/assets/johnny.png';

type Variant = 'light' | 'dark' | 'glass';

interface JohnnyMessageProps {
  variant: Variant;
  from?: string;
  children: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  show?: boolean;
}

const variantStyles: Record<Variant, {
  bg: string; border: string; extra?: React.CSSProperties;
  fromColor: string; textColor: string; pigBg: string; dismissColor: string;
}> = {
  light: {
    bg: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.6)',
    extra: { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(45,36,64,0.08)' },
    fromColor: '#8A7FA0', textColor: '#5C4F6E',
    pigBg: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.06))',
    dismissColor: 'rgba(0,0,0,0.15)',
  },
  dark: {
    bg: '#1E1730', border: '1px solid rgba(139,92,246,0.12)',
    fromColor: 'rgba(139,92,246,0.5)', textColor: 'rgba(255,255,255,0.7)',
    pigBg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
    dismissColor: 'rgba(255,255,255,0.15)',
  },
  glass: {
    bg: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
    extra: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
    fromColor: 'rgba(255,255,255,0.3)', textColor: 'rgba(255,255,255,0.75)',
    pigBg: 'rgba(255,255,255,0.1)',
    dismissColor: 'rgba(255,255,255,0.15)',
  },
};

export function JohnnyMessage({ variant, from, children, actions, onDismiss, show = true }: JohnnyMessageProps) {
  const s = variantStyles[variant];
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            background: s.bg,
            border: s.border,
            borderRadius: 14,
            padding: '12px 14px',
            position: 'relative',
            ...s.extra,
          }}
        >
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'none', border: 'none',
                color: s.dismissColor, fontSize: 14, cursor: 'pointer',
                lineHeight: 1,
              }}
            >✕</button>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: s.pigBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img src={johnnyImage} alt="Johnny" style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated' as any }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {from && (
                <div style={{ fontSize: 10, color: s.fromColor, fontWeight: 600, marginBottom: 2 }}>{from}</div>
              )}
              <div style={{ fontSize: 13, color: s.textColor, lineHeight: 1.45 }}>
                {children}
              </div>
            </div>
          </div>
          {actions && <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>{actions}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function JohnnyPrimaryBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
        color: 'white', border: 'none', borderRadius: 8,
        padding: '7px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer',
      }}
    >{children}</button>
  );
}

export function JohnnySecondaryBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '7px 14px', fontSize: 12, fontWeight: 500,
        cursor: 'pointer',
      }}
    >{children}</button>
  );
}
