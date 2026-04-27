# Sourdough Calculator (PWA)

Mobile-first sourdough formula calculator built with React + Vite.

This app supports:
- calculator + results + recipes + settings pages (mobile navigation)
- installable PWA behavior
- saved/restorable recipes in browser storage
- JSON import/export for:
  - current recipe
  - full recipe library
- optional hydration mode where hydration input can include levain contribution

## Quick Start (60 seconds)

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite (usually `http://localhost:5173`).

Optional checks:

```bash
npm run test
npm run lint
```

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- Node built-in test runner (`node --test`)

## Features

### Formula Inputs

- Base dough weight (without inclusions)
- Hydration %
- Salt %
- Levain %
- Levain hydration %
- Flour breakdown
- Additional ingredients
- Inclusions
- Notes

### Hydration Modes

- Default mode:
  - hydration input is based on main flour only
- Optional mode:
  - hydration input targets effective hydration including levain water/flour
  - toggle: `Hydration input includes levain`

### Recipe Persistence

- Automatic local save of current working state
- Saved recipe library (load/delete/overwrite by name)
- JSON backup/restore:
  - Download/Upload current recipe
  - Download/Upload full library
  - Confirmation preview when importing current recipe

### PWA

- `manifest.webmanifest`
- Service worker caching for app shell/offline fallback
- Install prompt support when available
- iPhone install guidance in-app (Safari Add to Home Screen)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

Then open the local URL printed by Vite (usually `http://localhost:5173`).

Note: opening `index.html` directly as `file://...` is not supported for normal app operation.

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - type-check + production build
- `npm run preview` - serve production build locally
- `npm run lint` - run ESLint
- `npm run test` - run test suite
- `npm run test:watch` - watch mode tests

## Testing

Run:

```bash
npm run test
```

The suite covers core calculator logic, recipe text generation, and recipe JSON parsing/export behavior.

## Project Structure

```text
src/
  App.tsx
  components/
  hooks/
  lib/
public/
  manifest.webmanifest
  sw.js
test/
```

## Deployment (GitHub Pages)

The repo includes a GitHub Actions workflow for Pages deploy:

- `.github/workflows/deploy.yml`

Vite is configured with production `base` for this repository path:
- `/sourdough-calculator/`

For first-time setup in GitHub:
1. Repository Settings -> Pages
2. Set Source to `GitHub Actions`
3. Push to `main`

## Browser Storage Notes

- Recipes and in-progress state are stored in local browser storage.
- Clearing browser/site data removes local recipes unless exported.

## Troubleshooting

### App opens blank or broken from `file://...`

Cause:
- The app is being opened directly from `index.html` as a file URL.

Fix:
- Run via Vite instead:

```bash
npm run dev
```

- Open the localhost URL shown in terminal.

### PWA changes not appearing after deploy

Cause:
- Service worker/browser cache still serving older assets.

Fix:
1. Hard refresh the page.
2. Close and reopen the app.
3. If needed, clear site data for the domain and reload.

### Install prompt does not appear

Cause:
- Browser/platform does not expose `beforeinstallprompt` in that context.

Fix:
- iPhone/iPad: use Safari -> Share -> Add to Home Screen.
- Desktop/Android: use browser install menu or app menu install action.

### GitHub Pages assets 404 after deploy

Cause:
- Wrong Pages source or base path mismatch.

Fix:
1. Ensure Pages source is `GitHub Actions`.
2. Ensure deploy workflow runs on `main`.
3. Keep Vite production base aligned with repo path (`/sourdough-calculator/`).

### Imported recipe JSON is rejected

Cause:
- JSON shape is invalid or missing recipe fields.

Fix:
- Use JSON exported by this app as the source format.
- For current recipe import, confirm replacement in the preview step.
