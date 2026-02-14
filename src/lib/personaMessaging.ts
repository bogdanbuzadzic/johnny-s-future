// ── Persona-Adaptive Messaging ──

export const tipsByPersona: Record<string, string[]> = {
  "Money Avoider": [
    "Small steps count. Even opening the app is progress.",
    "No judgment here. Let's just look at one number together.",
    "You checked in today. That's already a win.",
    "Financial clarity starts with curiosity, not perfection.",
  ],
  "Impulsive Optimist": [
    "Before buying — try the 'Can I Afford' tool. Takes 3 seconds.",
    "Your energy is a strength. Channel it into your goals.",
    "Quick check: want-now or want-always?",
    "That savings goal is growing. Don't derail it for a moment.",
  ],
  "Present Hedonist": [
    "Today matters AND tomorrow. Try the 5 Year zoom.",
    "Small sacrifice today = big freedom tomorrow. Literally.",
    "What if this month's leftover went to your dream?",
    "The future you will thank the present you.",
  ],
  "Vigilant Saver": [
    "You're doing great. It's OK to enjoy some money too.",
    "Your savings rate is strong. Consider optimizing, not just saving.",
    "Have you considered accelerating your top goal?",
    "Efficiency tip: review your subscriptions for hidden waste.",
  ],
  "Confident Controller": [
    "Your data this month is ready. Check the numbers.",
    "The 5 Year zoom shows interesting patterns. Checked lately?",
    "Try What If mode to optimize your allocation.",
    "Your spending efficiency is trackable now. Use it.",
  ],
  "Steady Saver": [
    "Consistency is your superpower. Real momentum building.",
    "At this pace, your goals are getting closer every day.",
    "Your spending is well-balanced. Nice work.",
    "Even €25 more/month toward savings compounds fast.",
  ],
  "default": [
    "Complete the Know Yourself quest for personalized tips!",
    "Every financial decision is a vote for the life you want.",
    "Small changes compound into big results.",
    "Check your spending trends in My Money.",
  ],
};

export function getImpactText(diff: number, newDaily: number, goalText: string, persona: string | null): string {
  const p = persona || '';
  if (diff < 0) {
    const abs = Math.abs(diff);
    const map: Record<string, string> = {
      "Money Avoider": `Small move: €${abs} freed up. ${goalText}`,
      "Impulsive Optimist": `€${abs} redirected! Smart. Daily: €${newDaily}. ${goalText}`,
      "Present Hedonist": `€${abs} freed for what matters. ${goalText}`,
      "Vigilant Saver": `Optimized by €${abs}. Efficient. ${goalText}`,
      "Confident Controller": `Reallocation: -€${abs}. Rate: €${newDaily}/day. ${goalText}`,
      "Steady Saver": `€${abs} shifted. Steady progress. ${goalText}`,
    };
    return map[p] || `Reducing by €${abs}. Daily: €${newDaily}/day. ${goalText}`;
  } else {
    const map: Record<string, string> = {
      "Money Avoider": `Adding €${diff}. That's OK — just notice how it feels.`,
      "Impulsive Optimist": `+€${diff} here = less elsewhere. Sure about this?`,
      "Vigilant Saver": `+€${diff} reduces your buffer. Daily: €${newDaily}.`,
      "Confident Controller": `+€${diff}. New rate: €${newDaily}/day. ${goalText}`,
    };
    return map[p] || `Adding €${diff}. Daily: €${newDaily}/day. ${goalText}`;
  }
}

export function getAffordText(result: string, persona: string | null, daily: number, days: number, shortage: number): string {
  const p = persona || '';
  if (result === 'comfortable') {
    const map: Record<string, string> = {
      "Money Avoider": "Yes, and it's totally OK to spend this.",
      "Impulsive Optimist": "Yes! But quick — planned or impulse?",
      "Vigilant Saver": "Yes, comfortably. You've earned it.",
      "Confident Controller": "Confirmed: within budget parameters.",
    };
    return map[p] || "Yes, comfortably.";
  }
  if (result === 'tight') {
    const map: Record<string, string> = {
      "Money Avoider": `Doable, but snug. €${daily}/day left.`,
      "Impulsive Optimist": `Possible. Think it through? €${daily}/day remaining.`,
      "Present Hedonist": `Fits today. But check next week too.`,
    };
    return map[p] || `Yes, but tighter. €${daily}/day for ${days} days.`;
  }
  if (result === 'over') {
    const map: Record<string, string> = {
      "Money Avoider": `Over budget by €${shortage}. No stress — let's find options.`,
      "Impulsive Optimist": `€${shortage} over. Tempting, I know. Sleep on it?`,
      "Vigilant Saver": `€${shortage} over. You already knew that, right?`,
    };
    return map[p] || `€${shortage} over budget.`;
  }
  return '';
}

export function getCelebration(moduleName: string, persona: string | null): string {
  const p = persona || '';
  const map: Record<string, string> = {
    "Money Avoider": `You did it! ${moduleName} complete. That took courage.`,
    "Impulsive Optimist": `${moduleName} crushed! What's next?`,
    "Vigilant Saver": `${moduleName} done. Another insight for your toolkit.`,
    "Confident Controller": `${moduleName} complete. New data unlocked.`,
    "Steady Saver": `${moduleName} done. Building deeper understanding.`,
  };
  return map[p] || `Quest Complete! ${moduleName} done.`;
}

export function getPersonaObservation(persona: string | null): { icon: string; color: string; text: string } | null {
  if (!persona) return null;
  const map: Record<string, { icon: string; color: string; text: string }> = {
    "Money Avoider": { icon: 'Heart', color: '#EC4899', text: "Your style: gentle progress. We'll never push too hard." },
    "Impulsive Optimist": { icon: 'Zap', color: '#F97316', text: "Your style: big energy. We'll help you channel it." },
    "Present Hedonist": { icon: 'Star', color: '#EAB308', text: "Your style: live in the moment. We'll connect today to tomorrow." },
    "Vigilant Saver": { icon: 'Shield', color: '#6366F1', text: "Your style: careful and thorough. We'll optimize with you." },
    "Confident Controller": { icon: 'TrendingUp', color: '#3B82F6', text: "Your style: data-driven. We'll give you the numbers." },
    "Steady Saver": { icon: 'TrendingUp', color: '#14B8A6', text: "Your style: consistent builder. We'll keep the momentum." },
  };
  return map[persona] || null;
}
