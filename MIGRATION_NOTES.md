# BLOCKVERSE Gemini Canvas → GitHub → Vercel migration

**Source:** `blockverse_one_click_zip_packager.html` furnished by the user. Extracted all 12 entries, then refactored into a version-controllable source tree. Original single-file HTML from V1 is not used as a drop-in browser file because production bundling is required.

## Refactors

1. Pulled game module into `src/game.js` without rebuilding world geometry or changing world progression.
2. Extracted the *same* Validator implementation into `src/schema.mjs`, imported by game and automated tests.
3. Removed Tailwind runtime CDN and Three.js runtime CDN; Vite builds dependencies from npm.
4. Moved inline custom CSS into `src/styles.css`, retaining the UI structure.
5. Removed Canvas-specific injected Firebase global bridge; uses Vite public config (`VITE_APP_ID`, `VITE_FIREBASE_CONFIG`), no custom token compiled into frontend.
6. Firebase anonymous auth now resolves before initial world load; cloud UID is canonical playerId.
7. Cloud profile writes only name/avatar. Do not send Stars/achievement client claims to Firestore.
8. Firestore presence writes only the authenticated UID. Validate packet transforms, quick-chat and avatars before rendering; sanitize dynamic nametags.
9. Cloud world saves use atomic Firestore transaction with revision conflict rejection, **no silent local success on cloud failure**.
10. Firestore rules now explicitly constrain paths, owner IDs, profile schema, avatar shape, presence fields, room codes, and revision increment; unrelated reads/writes denied.
11. Replaced duplicated mock validators in Node tests with tests of actual imported source; added rule emulator tests and CI job definitions.
12. Added a portable ZIP generator, security headers, documentation, `.gitignore`, and production release gate checklist.

## Unresolved migration caveats

- Firebase credentials/project are not in the export, so live cloud behavior cannot be fully verified here.
- Server-authoritative earning/leaderboard, rate limiting, room capacity admission, lobby moderation, public-world sharing and real anti-cheat are separate back-end features NOT provided by this migration.
- Run `npm install` in an internet-connected environment, commit the generated `package-lock.json`, and switch CI to `npm ci` before a production release. Dependencies could not be downloaded during preparation.
- Validate license/terms for external asset CDNs, performance and accessibility on desktop/mobile.
- Test Vite production build, Cloud Firestore emulator, cross-device gameplay and real security rules deployment before public launch.

## Required environment mapping

| Gemini Canvas | Vite + Firebase |
|---|---|
| `window.__app_id` | `VITE_APP_ID` |
| `window.__firebase_config` | `VITE_FIREBASE_CONFIG` JSON |
| `window.__initial_auth_token` | Removed: never expose privileged token client-side |

## Safety warning

Do not treat Firebase public web `apiKey` as a server secret; restrict the Firebase project and rules properly. Keep admin credentials outside GitHub and Vercel frontend env. A client-side test result cannot establish that rewards are impossible to forge.
