
# My Money - Complete Tetris Redesign

## Overview
Rebuild `MyMoneyScreen.tsx` from scratch while keeping all existing data infrastructure (`BudgetContext`, `AddTransactionSheet`, `personaMessaging`, `AppContext`). The new design introduces a nested parent-block architecture where 4 parent blocks (Spending, Fixed, Goals, Savings) contain their sub-items inline, replacing the current flat macro grid + separate sub-Tetris overlay approach.

## Architecture

The screen layout (top to bottom):
1. Header: "My Money" + Settings icon (48px)
2. "Can I Afford" input bar (48px)
3. Mode toggle (My Month | What If) + Time zoom (Month | Year | 5 Year)
4. Income Container (~62vh) with nested parent blocks
5. Impact summary bar (40px)
6. FAB (fixed bottom-right)

## Detailed Implementation

### 1. Income Container
- Outer rounded box (`border: 2px solid white/12`, `border-radius: 20px`, `background: white/4`, `min-height: 62vh`)
- Income header row inside top: Wallet icon + "Income" label left, bold amount right (updates with zoom)
- CSS grid for parent blocks: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`, gap 8px
- Empty space shows dot-grid pattern (`radial-gradient`), Johnny avatar, free amount + daily allowance
- Proportional sizing via `getSpans()` based on amount/income ratio

### 2. Parent Blocks (4 types)
Each parent block:
- Frosted glass background (`white/5`), rounded-16, 8px padding
- 4px left accent stripe via `::before` pseudo-element (CSS) or absolute-positioned div
- Header: icon (16px) + label (13px bold white/60) left, amount (16px bold white) + ChevronRight right
- Contains a mini sub-grid of its child items

**Spending Parent** (accent: `#8E44AD`):
- Sub-grid: `grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))`, gap 6px
- Sub-blocks use SOLID category colors as backgrounds
- Each sub-block: icon in 24px circle badge, name 11px, "spent/budget" 10px, health bar, "X% - Y left" 9px
- Dark spending fill overlay rising from bottom (`rgba(0,0,0,0.08)`)
- Subscription block with diagonal stripe pattern (`repeating-linear-gradient 135deg`)

**Fixed Parent** (accent: `#5D6D7E`):
- Same mini-grid, cool blue/gray sub-block colors
- No health bars (fixed costs are static)
- "fixed" label on each sub-block

**Goals Parent** (accent: `#E91E63`):
- Shows compact preview rows (icon + name + saved/target + mini progress bar), max 3
- Tapping navigates to My World (not expandable)

**Savings Parent** (accent: `#27AE60`):
- Single block with PiggyBank, amount, % of income
- Tappable to expand with slider

### 3. Health Bars (Contrasting Colors)
Color map for maximum contrast against block backgrounds:
- `#E67E22` (orange) -> `#FFD700` (gold bar)
- `#9B59B6` (purple) -> `#FF69B4` (hot pink bar)
- `#E74C3C` (red) -> `#FFA500` (bright orange bar)
- `#1ABC9C` (teal) -> `#87CEEB` (sky blue bar)
- `#7F8C8D` (gray) -> `#DDDDDD` (light gray bar)

Track: `rgba(0,0,0,0.15)` (dark, visible on any color). Fill transitions at 80% to amber `#FFC107`, at 100% to red `#FF5252`.

### 4. Tapping Sub-Blocks (Expand In Place)
When a spending sub-block is tapped, it expands to full parent width (`gridColumn: 1/-1`, `gridRow: span 3`):
- Shows budget slider, impact text, recent transactions list (max 5 + "See all")
- Other sub-blocks collapse. Spring animation 300ms.
- Save/Cancel buttons at bottom.

### 5. Full-Income Context Bar (Sub-Screen Header)
When expanding into a detailed view, the header shows a multi-segment bar representing all income allocations:
- Current category at full opacity, others dimmed to 20%
- Free space shown as empty/dotted segment
- "X of Y - Z% of income" text

### 6. What If Mode
- Container border becomes dashed + pulsing
- Scenario suggestion cards (Cheaper rent, Save more, Income drops)
- Income drop: header shows strikethrough, blocks maintain size but overflow container with amber glow
- Impact banners with consequences

### 7. Can I Afford
- Input at top, ghost section on spending parent's health bars
- Category picker dropdown
- Answer text + "Buy it" / "Clear" buttons

### 8. Time Zoom
- Month/Year/5Year toggle
- All amounts scale by multiplier
- Income header updates label
- At 5 Year: Goals parent block becomes large (full target amounts)

## Technical Details

### Files Modified
- `src/components/screens/MyMoneyScreen.tsx` - Complete rewrite (~1100 lines)

### Files Preserved (No Changes)
- `src/context/BudgetContext.tsx` - Data engine unchanged
- `src/components/budget/AddTransactionSheet.tsx` - FAB sheet unchanged
- `src/lib/personaMessaging.ts` - Messaging helpers unchanged
- `src/context/AppContext.tsx` - Goals/tabs unchanged

### Key Data Dependencies
All data comes from existing hooks:
- `useBudget()`: config, categories, transactions, computed values, CRUD methods
- `useApp()`: goals, addGoal, updateGoal, setActiveTab

### New Constants
- `healthBarColors` map for contrasting bar fills
- `fixedSubColors` for fixed expense sub-block backgrounds
- Subscription stripe pattern CSS via `repeating-linear-gradient`

### Preserved Functionality
- Empty state (Clarity not done) -> "Go to Profile" CTA
- Can I Afford with category picker and persona-adaptive answers
- What If mode with scenario simulations (rent, savings, income drop)
- FAB for adding transactions/goals
- Mock bank import card
- Subscription management (manage/cancel)
- Budget slider with impact text
- Transaction list in expanded blocks
- Time zoom (Month/Year/5Year)
- Goals block -> navigates to My World
