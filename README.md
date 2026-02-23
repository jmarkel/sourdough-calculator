# Sourdough Ingredient Calculator

A small React + Vite app for calculating sourdough ingredient weights using baker’s percentages.

## Features

- Inputs:
  - Total dough weight (g)
  - Hydration %
  - Salt %
  - Levain % (treated as a **black-box** ingredient)
  - Levain hydration % (used only for the optional levain build split + effective hydration)
- Outputs (rounded to whole grams):
  - Flour, water, salt, levain
  - Optional levain build split (levain flour + levain water)
  - Effective hydration including levain
- Rounding reconciliation:
  - After rounding, the app adjusts values so the final grams add up exactly to the target dough weight.

## Definitions (Baker’s Math)

All percentages are based on **main dough flour**, where flour = 100%.

- `water = hydration% × flour`
- `salt = salt% × flour`
- `levain = levain% × flour` (total levain weight; black-box for dough math)
- `total dough = flour + water + salt + levain`

Effective hydration (optional display) includes levain contents:

`(main water + levain water) ÷ (main flour + levain flour)`

Levain flour/water split is derived from levain hydration.

## Getting Started

```bash
npm install
npm run dev
