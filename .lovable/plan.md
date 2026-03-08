

# Fix: Add Fixed Categories to Both Demo Data Loaders

## Root Cause
The terrain chart's `readBudgetForTerrain()` filters categories by `type === 'fixed'` to build bill markers. But both demo data loaders (ProfileScreen's "Load Demo Goals" button AND BankConnectionScreen's `loadDemoData()`) only create `type: 'expense'` categories. Result: `fixedCats` is always empty → zero bill markers → terrain shows a flat line with no expense markers.

## Changes

### File 1: `src/components/screens/ProfileScreen.tsx`
**Before** the `catBudgetMap` block (line ~839), insert code to ensure fixed categories exist:
- Rent (€600, icon: Home)
- Utilities (€120, icon: Zap)  
- Transport (€80, icon: Car)

Each checks if it already exists before adding.

### File 2: `src/components/onboarding/BankConnectionScreen.tsx`
**Before** the `catBudgetMap` block (line ~56), insert the same fixed categories code. This ensures terrain markers work regardless of which entry point loaded the demo data.

### The inserted code (identical in both files):
```ts
const fixedCatsToEnsure = [
  { name: 'Rent', icon: 'Home', monthlyBudget: 600, type: 'fixed' as const },
  { name: 'Utilities', icon: 'Zap', monthlyBudget: 120, type: 'fixed' as const },
  { name: 'Transport', icon: 'Car', monthlyBudget: 80, type: 'fixed' as const },
];
fixedCatsToEnsure.forEach(fc => {
  const exists = bd.categories.some((c: any) => c.name === fc.name && c.type === 'fixed');
  if (!exists) {
    bd.categories.push({
      id: crypto.randomUUID(),
      name: fc.name,
      icon: fc.icon,
      monthlyBudget: fc.monthlyBudget,
      type: fc.type,
      sortOrder: bd.categories.length,
    });
  }
});
```

## Expected Result
After loading demo data, terrain chart will have 3 fixed categories → `readBudgetForTerrain()` generates bill markers at days 3 (Rent 🏠), 5 (Utilities ⚡), 15 (Transport 🚗) → red expense squares with icons appear on the terrain line.

