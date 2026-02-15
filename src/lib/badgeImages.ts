// Badge pixel art image imports
import badge_know_thyself from '@/assets/badges/badge_know_thyself.png';
import badge_first_step from '@/assets/badges/badge_first_step.png';
import badge_risk_taker from '@/assets/badges/badge_risk_taker.png';
import badge_time_keeper from '@/assets/badges/badge_time_keeper.png';
import badge_self_aware from '@/assets/badges/badge_self_aware.png';
import badge_mirror_mirror from '@/assets/badges/badge_mirror_mirror.png';
import badge_deep_diver from '@/assets/badges/badge_deep_diver.png';
import badge_tracker from '@/assets/badges/badge_tracker.png';
import badge_goal_getter from '@/assets/badges/badge_goal_getter.png';
import badge_explorer from '@/assets/badges/badge_explorer.png';

// Badge key → image mapping
export const BADGE_IMAGES: Record<string, string> = {
  'know-thyself': badge_know_thyself,
  'first-step': badge_first_step,
  'risk-taker': badge_risk_taker,
  'time-keeper': badge_time_keeper,
  'self-aware': badge_self_aware,
  'mirror': badge_mirror_mirror,
  'deep-diver': badge_deep_diver,
  'tracker': badge_tracker,
  'goal-getter': badge_goal_getter,
  'explorer': badge_explorer,
};

// Module key → badge key mapping
export const BADGE_FOR_MODULE: Record<string, string> = {
  'clarity': 'know-thyself',
  'module0': 'first-step',
  'module1': 'risk-taker',
  'module2': 'time-keeper',
  'module3': 'self-aware',
  'module4': 'mirror',
  'module5': 'deep-diver',
};

// Badge tint colors
export const BADGE_TINTS: Record<string, string> = {
  'know-thyself': '#3B82F6',
  'first-step': '#8B5CF6',
  'risk-taker': '#F97316',
  'time-keeper': '#14B8A6',
  'self-aware': '#6366F1',
  'mirror': '#EC4899',
  'deep-diver': '#EAB308',
  'tracker': '#F97316',
  'goal-getter': '#FFD700',
  'explorer': '#34C759',
};
