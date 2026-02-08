

# Today Drawer Redesign - Implementation Plan

## Overview

Redesign the TodayDrawer component to replace the separate "Coming Up" and "Recent Transactions" sections with a unified financial timeline card. The Month Pulse and Daily Allowance cards remain unchanged.

---

## What Changes

### Remove
- Separate "Coming Up" section with individual cards
- Separate "Recent Transactions" section with individual cards

### Add
- Single unified timeline card containing all financial events in chronological order
- Date group headers ("Today", "Yesterday", "Feb 1") with daily totals
- "Upcoming" visual separator dividing past from future
- Visual distinction between past transactions and upcoming bills
- "See all" link below the timeline card
- Total upcoming row at bottom of card

### Keep Unchanged
- Month Pulse hero card (€1,340 available, progress bar, "On track" status)
- Daily Allowance card (€44/day)
- Johnny's Tip card (cycling tips)
- All sheet mechanics (slide down, drag to dismiss)

---

## Component Structure

### Unified Timeline Card Layout

```text
┌─────────────────────────────────────────────┐
│ ● Today                    €16.30 spent     │
├─────────────────────────────────────────────┤
│ [Icon] Uber Eats                   -€12.50  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ [Icon] Coffee Shop                  -€3.80  │
├─────────────────────────────────────────────┤
│ ● Yesterday                €35.00 spent     │
├─────────────────────────────────────────────┤
│ [Icon] Bus Pass                    -€35.00  │
├─────────────────────────────────────────────┤
│ ● Feb 1                   €2,400 received   │ (green)
├─────────────────────────────────────────────┤
│ [Icon] Salary                    +€2,400.00 │ (green)
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ [Icon] Rent                        -€450.00 │
├─────────────────────────────────────────────┤
│ ─────────── UPCOMING ───────────            │
├─────────────────────────────────────────────┤
│ [◌Icon] Rent                         €450   │
│         in 20 days                          │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ [◌Icon] Phone Plan                    €25   │
│         in 21 days                          │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ [◌Icon] Spotify                       €10   │
│         in 23 days                          │
├─────────────────────────────────────────────┤
│                     €485 due this month     │
└─────────────────────────────────────────────┘

        View all transactions →
```

---

## Visual Design Specifications

### Date Group Headers
- Small dot indicator: 6px white circle
- Label: 12px `text-white/50`
- Daily total: 12px `text-white/70` (green if net positive)
- Right-aligned total with prefix text ("spent" or "received")

### Past Transaction Rows
- Icon container: 36px circle with `bg-white/10` (solid)
- Icon: 18px Lucide icon
- Merchant name: 14px white
- Amount: 14px white with "-€" prefix
- Income: green text with "+€" prefix
- Thin divider between rows: 1px `bg-white/[0.08]`

### Upcoming Bills Section
- Separator line: full-width `bg-white/20` with "UPCOMING" label centered (11px, `text-white/40`, uppercase tracking)
- Icon container: 36px circle with dashed border (`border border-dashed border-white/15`)
- Bill name: 14px white
- Relative time: 12px `text-white/40` below name ("in X days")
- Amount: 14px `text-white/60` (dimmer, no +/- prefix)
- Urgent state (within 3 days): dashed border turns amber, time text turns amber

### Total Upcoming Row
- Subtle top divider: 1px `bg-white/10`
- Text: 12px `text-white/50`, right-aligned
- Format: "€485 due this month"

### "See All" Link
- Centered below card
- Purple text (`text-jfb-purple/80`) 
- ArrowRight icon
- 13px font size

---

## Data Structure

The component will use static mock data (matching the prototype nature of the app):

```typescript
// Transaction with date grouping info
interface TimelineTransaction {
  icon: LucideIcon;
  name: string;
  amount: number; // positive for income, negative for expense
  date: Date;
  dateGroup: string; // "Today", "Yesterday", or formatted date
}

// Upcoming bill
interface UpcomingBill {
  icon: LucideIcon;
  name: string;
  amount: number;
  dueDate: Date;
  daysUntil: number;
  isUrgent: boolean; // true if ≤3 days
}
```

### Mock Data (static, grouped by date)
- Today: Uber Eats -€12.50, Coffee Shop -€3.80
- Yesterday: Bus Pass -€35.00
- Feb 1: Salary +€2,400.00, Rent -€450.00
- Upcoming: Rent €450 (20 days), Phone €25 (21 days), Spotify €10 (23 days)

---

## Implementation Details

### File Modified
- `src/components/sheets/TodayDrawer.tsx`

### Helper Functions
- `getDayTotal(transactions)`: Sum amounts for a date group, determine if net positive
- `formatDayTotal(total)`: Returns "€X spent" or "€X received" based on sign
- Calculate `daysUntil` for upcoming bills from current date

### Animations
- Use existing Framer Motion setup for drawer
- Rows can have subtle stagger animation on open

---

## Technical Notes

- Keep existing drawer mechanics (slide from top, drag to dismiss)
- Keep existing Johnny's Tip cycling logic
- Use existing `glass` class for frosted card styling
- Import icons: Home, Smartphone, Music, UtensilsCrossed, Coffee, Bus, Wallet, ArrowRight
- All styling follows existing design system (no new CSS needed)

