# BLOCKVERSE V2: Dependency & Framework Upgrade (25 October 2026)

**Branch:** `feature/modern-dependencies-context7-20261025` (based on Argon's `feature/argon-v2-art-ux`). Do NOT merge into `main` or deploy to Render without owner approval.

## Versions (verified from npm pages and Context7 migration documentation)
| Item | Before | Proposed/installed |
|---|---|---|
| Vite | 5.4.8 | 8.3.5 (Rolldown) |
| Three.js | 0.168.0 | 0.186.1 |
| Firebase Web SDK | 11.6.1 | 13.0.0 |
| Tailwind CSS | 3.4.17 | 4.3.3 |
| @tailwindcss/vite | absent | 4.3.3 |
| Firebase CLI | 13.35.1 | 15.34.1 |
| @firebase/rules-unit-testing | 4.0.1 | 6.0.0 |
| PostCSS/Autoprefixer (direct) | 8.4.49 / 10.4.20 | removed: handled by official Tailwind v4/Vite pipeline |
| ws | 8.22.0 | 8.22.0 (already latest) |
| Font Awesome Icons | 6.5.1 (CDN) | 7.3.1 (self-hosted npm bundle) |
| Node.js minimum | >=20 | >=22.12; CI Node 24 |
| GitHub Actions | checkout/setup-node v4, setup-java v4, upload-artifact v4 | checkout/setup-node/upload-artifact v7, setup-java v6 |

## Code migration
- `src/styles.css`: replaced obsolete `@tailwind` v3 directives with `@import "tailwindcss"`; added a CSS-first `@theme` mapping that retains all existing `bv*` class names and Fredoka/Plus Jakarta Sans fonts; explicitly restored dark-class selector.
- `vite.config.js`: registered `@tailwindcss/vite` plugin. Kept output `dist/`, ES2022 browser target, and static serving assumptions.
- Icon framework Font Awesome v7 bundled with Vite rather than the old external v6 CDN; no runtime reliance on cdnjs for icon CSS/fonts.
- Exact top-level library versions, no `@latest` wildcard. The WebSocket protocol remains unchanged.
- The existing 125 Argon GLB assets, OSM overlay, 12 Cengkareng districts and server code are carried forward untouched.

## Acceptance / release gates
- [ ] GitHub Actions: `npm run test:unit`, `npm run build`, Firestore emulator rules suite and server integration tests **all green**
- [ ] `npm audit --omit=dev --audit-level=high` and server audit **green**
- [ ] Browser smoke test: Tailwind v4 classes (`bg-bvSky`, `text-bvCyan`, `font-display`, dark variant), Three.js `GLTFLoader`, 125 GLB loads
- [ ] Firebase v13 Auth / Firestore with real configured project, no privileged tokens in frontend
- [ ] Phone, tablet, desktop viewport and gamepad visual QA
- [ ] Generate, review, commit lockfiles for repeatable npm installs
- [ ] Obtain explicit owner approval before merging upstream or deploying

## Official migration references
- https://vite.dev/guide/migration
- https://tailwindcss.com/docs/upgrade-guide
- https://firebase.google.com/support/release-notes/js
- https://www.npmjs.com/package/three
- https://www.npmjs.com/package/ws

**Note:** Configured dependency version is NOT equivalent to verified working version. GitHub CI results determine actual upgrade status.
