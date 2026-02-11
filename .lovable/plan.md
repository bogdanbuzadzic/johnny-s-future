
# My Money Screen - Container Shell Rebuild (Prompt 1 of 7)

## What This Does

Strips the My Money screen down to a clean, empty shell: just the container with its three zones (fixed bar, empty main area with dotted grid, savings bar), a header, an impact summary row, and a FAB. No blocks, no sliders, no What If mode, no "Can I Afford" input, no Johnny tips.

## Changes

### 1. Rewrite `MyMoneyScreen.tsx`

Remove all current content and replace with:

- **Header row** (48px): "My Money" 22px bold white (left) + Sliders icon button 24px white/50 (right). Bottom margin 12px.
- **Container** (the game board):
  - Width: 100% minus 32px (16px padding each side)
  - Height: 55vh
  - Background: white/5, border 2px solid white/20, rounded 20px, inner glow
  - **Fixed Expenses Bar** (top, 36px): Lock icon 12px + "No fixed expenses" 11px white/20, right "Fixed: EUR0" 11px white/20, bottom border white/8
  - **Main Area** (remaining height, empty state): dotted grid pattern (white/3, 24px spacing) via CSS background-image, centered text "Your budget blocks will appear here" 16px white/20, sub-text "Add categories in Settings to get started" 12px white/15
  - **Savings Bar** (bottom, 36px): PiggyBank icon 12px green/30 + "Savings EUR0/mo" 11px white/25, right ShieldCheck icon 12px white/15, green/8 background, green/12 top border
- **Impact Summary Row** (12px below container, 40px): frosted glass white/10, "EUR0 remaining" left, "Set up budget" pill center, "EUR0/day" right
- **FAB** (fixed bottom-right, 20px from right, 20px above tab bar): purple-to-pink gradient (#8B5CF6 to #FF6B9D), 56px, Plus icon, shows toast "Add Transaction coming soon" on tap

Still wraps in `BudgetProvider` and checks `config.setupComplete` to show `SetupWizard` if needed. Keeps `EditBudgetSheet` wired to the Sliders icon. Removes all other imports and state (mode toggle, afford input, TetrisContainer, JohnnyTip, SimulationProvider, category picker, etc.).

### 2. No other files changed

`TetrisContainer.tsx`, `CategoryBlock.tsx`, and `JohnnyTip.tsx` remain in the codebase but are simply not imported. They will be rebuilt in later prompts.

## Technical Notes

- The dotted grid pattern uses CSS `background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)` with `background-size: 24px 24px`
- The container uses `display: flex; flex-direction: column` so the fixed bar and savings bar stick to top/bottom with the main area taking `flex: 1`
- FAB gradient changes from the current purple-only to purple-to-pink (#8B5CF6 to #FF6B9D) per spec
- Toast uses the existing `sonner` toast for the FAB tap
