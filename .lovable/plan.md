

# JFB (Johnny F. Banks) Prototype - Implementation Plan

## Overview
A fully interactive mobile-first personal finance prototype featuring Johnny the pixel-art piggy bank as your financial co-pilot. Complete with a draggable timeline chart, what-if financial simulations, and goal tracking.

---

## Phase 1: Foundation & Design System

### Setup
- Install Framer Motion for spring animations and gestures
- Copy Johnny mascot image to project assets
- Configure Inter font via Google Fonts

### Global Design System
- Fixed full-viewport gradient background (#B4A6B8 → #9B80B4)
- Frosted glass utility classes (white 20-30% opacity + backdrop blur)
- Custom Tailwind colors: primary purple (#8B5CF6), pink accent (#FF6B9D), green positive (#34C759), amber attention (#FF9F0A)
- Typography scale matching spec (40px hero, 18px titles, 14px body, 12px labels)

---

## Phase 2: App Shell & Navigation

### State Management
- Central AppContext with all app state (activeTab, sheet visibility, timeline data, goals, simulations)
- Generated baseline net worth data from Feb 2026 → Feb 2029

### Bottom Tab Bar
- 5 tabs: Home, Tetris, Budget, Goals, Profile
- Frosted glass styling, fixed bottom position
- Active/inactive icon states (full white vs 40% opacity)
- Placeholder screens for Tetris, Budget, and Profile tabs

---

## Phase 3: HomeScreen

### Layout Components
- Top bar with settings pill (left), "Today: €1,340 left" tappable pill (center), edit pill (right)
- Johnny mascot (120x120px) with gentle bobbing animation (translateY keyframes)
- "Your Financial Co-pilot" subtitle

### Action Area
- Pulsing chevron-up hint for swipe gesture
- Two action chips: "Plan my future" and "What can I afford?"
- Ask Johnny input bar with toast feedback

### Gestures
- Swipe up detection → opens TimelineSheet
- Swipe down detection → opens TodayDrawer
- Tap handlers on all interactive elements

---

## Phase 4: TimelineSheet (The Core Feature)

### Sheet Mechanics
- Bottom sheet sliding up to 90% viewport
- Drag handle to dismiss with Framer Motion drag gestures
- Frosted glass overlay

### Header & Today Card
- Time range toggle pills (1Y / 3Y / 5Y) affecting chart data
- Current net worth display (€12,450) with positive change pill

### Interactive Timeline Chart (Recharts)
- AreaChart with gradient stroke (purple → pink) and 15% fill
- Monthly data points with realistic growth patterns
- Quarter labels on X-axis, € values on Y-axis

### Draggable Scrubber
- 24px circle that follows the curve
- Horizontal drag/touch mapped to data points
- Floating tooltip showing month, projected value, and delta from today
- Smooth vertical positioning along the curve

### Goal Markers on Curve
- Icon circles at specific dates (Laptop Aug 2026, Emergency Fund Oct 2026, Vacation Apr 2027)
- Tap to show goal popover with progress details

### What-If Simulation Cards
- Horizontally scrollable row: Get a Raise, Invest, Buy a Car, Have a Baby, Cut Spending, Custom
- Each card opens configuration bottom sheet with:
  - Amount input (pre-filled defaults)
  - Frequency pills (One-time / Monthly / Yearly)
  - Date picker
  - Apply button

### Simulation Engine
- Apply scenarios to recalculate timeline data
- Render two chart lines: original (dashed, faded) vs simulated (solid gradient)
- End-point delta display
- "Simulation Mode" banner with scenario list and individual removal
- Multiple stacking scenarios supported

---

## Phase 5: TodayDrawer

### Sheet Mechanics
- Top sheet sliding down to ~80% viewport
- Bottom drag handle to dismiss

### Content Sections
- **Month Pulse**: €1,340 available, 65% progress bar, "On track" status
- **Daily Allowance**: €44/day for next 7 days
- **Coming Up**: Upcoming bills list (Rent, Phone, Spotify with dates)
- **Recent Transactions**: Latest spending/income entries with icons and amounts
- **Johnny's Tip**: Auto-cycling tips every 5 seconds with fade transitions

---

## Phase 6: GoalsScreen

### Goals List
- Vertical scrollable list of goal cards
- Each card shows: icon, name, progress bar, amounts, projected date, monthly contribution
- Circular progress ring animation (SVG arc)

### Goal Detail Sheet
- Large icon and progress ring
- Full goal details
- "View on Timeline" button (navigates to TimelineSheet and highlights goal)
- Edit and Delete actions

### Add Goal Flow
- Icon picker grid (10 icons)
- Name, target amount, target date inputs
- Auto-calculated monthly contribution
- Creates new goal in state

---

## Key Interactions Summary

| Action | Result |
|--------|--------|
| Tap "Plan my future" | Opens TimelineSheet |
| Tap "What can I afford?" | Opens TimelineSheet scrolled to What-If |
| Tap "Today" pill | Opens TodayDrawer |
| Swipe up on home | Opens TimelineSheet |
| Swipe down on home | Opens TodayDrawer |
| Drag scrubber on chart | Shows real-time data tooltip |
| Tap What-If card | Opens config sheet |
| Apply scenario | Updates chart with two lines |
| Tap goal on GoalsScreen | Opens detail sheet |
| "View on Timeline" | Jumps to TimelineSheet, highlights goal |
| Tab bar taps | Switches between all 5 screens |

---

## Technical Highlights

- **Framer Motion**: Spring physics on all interactions, gesture detection for swipes, drag controls for scrubber and sheets
- **Recharts**: Custom AreaChart with gradient strokes, dual-line rendering for simulations, interactive elements overlay
- **State Management**: React Context for global state (no backend needed for prototype)
- **Mobile-First**: 375px base, responsive to 768px
- **Zero Dead Buttons**: Every UI element has a working interaction

