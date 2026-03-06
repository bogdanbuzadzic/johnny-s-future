import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, getDay, getDaysInMonth, parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { JohnnyMessage } from '@/components/ui/JohnnyMessage';
import type { Transaction, Category } from '@/context/BudgetContext';

// Brand logos
import spotifyLogo from '@/assets/brands/spotify.png';
import netflixLogo from '@/assets/brands/netflix.png';
import amazonPrimeLogo from '@/assets/brands/amazon-prime.png';
import appleTvLogo from '@/assets/brands/appletv.png';
import icloudLogo from '@/assets/brands/icloud.png';

interface BrandInfo {
  logo: string | null;
  fallbackColor: string;
  fallbackLetter: string;
}

const BRAND_LOGOS: Record<string, BrandInfo> = {
  'Spotify': { logo: spotifyLogo, fallbackColor: '#1DB954', fallbackLetter: 'S' },
  'Netflix': { logo: netflixLogo, fallbackColor: '#E50914', fallbackLetter: 'N' },
  'Amazon Prime': { logo: amazonPrimeLogo, fallbackColor: '#FF9900', fallbackLetter: 'P' },
  'Apple TV+': { logo: appleTvLogo, fallbackColor: '#333333', fallbackLetter: 'A' },
  'iCloud+': { logo: icloudLogo, fallbackColor: '#3693F3', fallbackLetter: 'iC' },
  'iCloud': { logo: icloudLogo, fallbackColor: '#3693F3', fallbackLetter: 'iC' },
  'Adobe CC': { logo: null, fallbackColor: '#FF0000', fallbackLetter: 'Ai' },
  'Discord Nitro': { logo: null, fallbackColor: '#5865F2', fallbackLetter: 'D' },
};

function getBrandInfo(name: string): BrandInfo {
  for (const [key, info] of Object.entries(BRAND_LOGOS)) {
    if (name.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
      return info;
    }
  }
  return { logo: null, fallbackColor: '#9575CD', fallbackLetter: name.charAt(0).toUpperCase() };
}

function BrandIcon({ name, size }: { name: string; size: number }) {
  const brand = getBrandInfo(name);
  const borderRadius = size > 24 ? 8 : 6;

  if (brand.logo) {
    return (
      <img
        src={brand.logo}
        alt={name}
        style={{
          width: size, height: size, borderRadius, objectFit: 'cover', flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius,
      background: brand.fallbackColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 24 ? 12 : 9, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {brand.fallbackLetter}
    </div>
  );
}

interface SubInfo {
  name: string;
  amount: number;
  dayOfMonth: number;
  isPaid: boolean;
  categoryId: string;
}

interface SubscriptionCalendarSheetProps {
  open: boolean;
  onClose: () => void;
  subscriptions: SubInfo[];
  monthlyTotal: number;
  allExpenseCategories?: Category[];
  categorySpentMap?: Record<string, number>;
}

function getCatColor(icon: string): string {
  const map: Record<string, string> = {
    UtensilsCrossed: '#F97316', ShoppingBag: '#EF4444', Film: '#8B5CF6',
    Heart: '#06B6D4', RefreshCw: '#2D1F54', CreditCard: '#6C3483',
  };
  return map[icon] || '#8B5CF6';
}

export function SubscriptionCalendarSheet({
  open, onClose, subscriptions, monthlyTotal, allExpenseCategories = [], categorySpentMap = {},
}: SubscriptionCalendarSheetProps) {
  const now = new Date();
  const todayDate = now.getDate();
  const daysInMonth = getDaysInMonth(now);
  const firstDayOfWeek = getDay(startOfMonth(now));

  const totalAllSpent = useMemo(() =>
    allExpenseCategories.reduce((s, c) => s + (categorySpentMap[c.id] || 0), 0),
    [allExpenseCategories, categorySpentMap]);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const subsByDay = useMemo(() => {
    const map: Record<number, SubInfo[]> = {};
    subscriptions.forEach(s => {
      const day = s.dayOfMonth;
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [subscriptions]);

  const upcoming = subscriptions.filter(s => !s.isPaid);
  // Filter out income transactions from paid list
  const paid = subscriptions.filter(s =>
    s.isPaid &&
    s.name.toLowerCase() !== 'monthly salary' &&
    s.name.toLowerCase() !== 'salary'
  );
  const remainingCharges = upcoming.reduce((s, sub) => s + sub.amount, 0);

  // Correct annual calculation: monthly total * 12
  const totalAnnual = Math.round(monthlyTotal * 12);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              maxHeight: '88vh',
              background: 'linear-gradient(180deg, #1A1525 0%, #2D1F3D 100%)',
              borderRadius: '24px 24px 0 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            <div className="px-5 pb-6">
              {/* 1. Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'repeating-linear-gradient(135deg, #D4A017, #D4A017 4px, #C49000 4px, #C49000 8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <RefreshCw size={18} style={{ color: 'white' }} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Subscriptions</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* 2. Stacked Spending Bar */}
              {allExpenseCategories.length > 0 && totalAllSpent > 0 && (
                <div style={{ marginBottom: 12, position: 'relative' }}>
                  <div style={{
                    height: 10, borderRadius: 5, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                  }}>
                    {allExpenseCategories.map(cat => {
                      const catSpent = categorySpentMap[cat.id] || 0;
                      if (catSpent === 0) return null;
                      const pct = (catSpent / totalAllSpent) * 100;
                      const color = getCatColor(cat.icon);
                      return (
                        <div key={cat.id} style={{
                          width: `${pct}%`, height: '100%',
                          background: color,
                          opacity: 0.35,
                          transition: 'opacity 0.3s',
                        }} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'white', fontFamily: 'JetBrains Mono, monospace' }}>
                  €{Math.round(monthlyTotal)}/mo
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
                  €{totalAnnual}/yr
                </span>
              </div>

              {/* 4. Calendar Grid */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={i} />;
                    const daySubs = subsByDay[day] || [];
                    const isPast = day < todayDate;
                    const isToday = day === todayDate;
                    const dayTotal = daySubs.reduce((s, sub) => s + sub.amount, 0);

                    return (
                      <div key={i} style={{
                        padding: '4px 2px',
                        borderRadius: 8,
                        minHeight: 44,
                        background: isToday ? 'rgba(139,92,246,0.08)' : 'transparent',
                        border: isToday ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        opacity: isPast ? 0.4 : 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}>
                        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.3)' }}>{day}</span>
                        {daySubs.map((sub, si) => (
                          <BrandIcon key={si} name={sub.name} size={22} />
                        ))}
                        {dayTotal > 0 && (
                          <span style={{
                            fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                            color: 'rgba(255,255,255,0.25)',
                            textDecoration: isPast ? 'line-through' : 'none',
                          }}>€{Math.round(dayTotal)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Johnny Insight (between calendar and upcoming) */}
              <div style={{ marginBottom: 16 }}>
                <JohnnyMessage variant="dark" from="Johnny">
                  {upcoming.length > 0 ? (
                    <>You have <strong style={{ color: '#C4B5FD' }}>€{Math.round(remainingCharges)}</strong> in subscriptions still to come this month ({upcoming.length} renewal{upcoming.length !== 1 ? 's' : ''}).
                    {monthlyTotal > 50 && <> That's <strong style={{ color: '#FBBF24' }}>€{totalAnnual}/yr</strong> — worth a review.</>}
                    </>
                  ) : (
                    <>All subscriptions paid for this month. Total: €{Math.round(monthlyTotal)}/mo.</>
                  )}
                </JohnnyMessage>
              </div>

              {/* 6. Upcoming */}
              {upcoming.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    UPCOMING
                  </div>
                  {upcoming.map((sub, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <BrandIcon name={sub.name} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>{sub.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Day {sub.dayOfMonth}</div>
                      </div>
                      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#C4B5FD', fontWeight: 600 }}>
                        -€{sub.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 7. Paid This Month */}
              {paid.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    PAID THIS MONTH
                  </div>
                  {paid.map((sub, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ opacity: 0.5 }}>
                        <BrandIcon name={sub.name} size={32} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{sub.name}</span>
                        <span style={{
                          background: 'rgba(34,197,94,0.1)', color: '#22C55E',
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        }}>Paid</span>
                      </div>
                      <span style={{
                        fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                        color: 'rgba(255,255,255,0.15)', fontWeight: 600,
                        textDecoration: 'line-through',
                      }}>-€{sub.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
