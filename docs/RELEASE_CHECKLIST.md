# Production release acceptance gates (NO unearned 10/10 scores)

Mark each item [x] **only after a reproducible test is actually performed**. Items below are [ ] until demonstrated.

## Repository & build (must pass)
- [ ] `npm install` on clean Node 20/22 environment and a generated committed `package-lock.json`.
- [ ] `npm run test:unit` pass on clean checkout.
- [ ] `npm run build` and `npm run preview` serve fully working 3D game.
- [ ] GitHub Actions `test-and-build` and `firestore-rules` pass.
- [ ] No high/critical known dependency vulnerabilities after `npm audit`.
- [ ] Source stored in private GitHub repo, branch protection, secret scanning, license review.

## Cloud security (must pass if cloud is enabled)
- [ ] Firebase project configured with correct anonymous auth and Firestore rules deployed.
- [ ] Security-rule emulator tests pass on two distinct authenticated identities.
- [ ] Cannot write Stars, rewards, achievements via client; only player-owned world/avatar stored.
- [ ] Invalid world payload, malicious player-name and oversized presence are rejected.
- [ ] Save same world from two browsers simultaneously -> revision conflicts rejected without losing data.
- [ ] Firestore global room listener cost/quotas measured; document room size policy.

## Gameplay and devices (must pass)
- [ ] Desktop Chromium and Firefox: start/play/restart Obby without collision softlocks.
- [ ] All 15 obstacles and both intermediate checkpoints can be completed manually.
- [ ] Builder place, select, paint, undo, redo, test, JSON import and save/reload work.
- [ ] Two physical devices on different networks can see each other with Firebase configured.
- [ ] Observe mobile FPS, touch sensitivity, layout and memory; meet a documented hardware target.
- [ ] Offline mode UI clearly says local-only; cloud failures are visible to user.
- [ ] Accessibility keyboard controls, dialogs and responsive sizing manually checked.

## Operations & governance (must pass before public launch)
- [ ] Terms/privacy, user reporting and world moderation plan for a youth-oriented multiplayer game.
- [ ] Rate limiting/abuse-cost budget and monitoring/alerts configured.
- [ ] Backup, rollback and incident response runbooks tested.
- [ ] Server authoritative rewards implemented OR all Stars visibly confined to demo/local-only.
- [ ] Public security review and load/performance test completed.

### Verified locally during package preparation
- [x] JavaScript static syntax checks (`node --check src/game.js`, schema, Vite config).
- [x] Node tests import actual Validator and validate security invariants: 10 tests, 10 pass.
- [x] Complete source extract from supplied HTML into repository tree; ZIP generated and contents verified.

**Approval decision:** HOLD FOR STAGING. Public production readiness is not 10/10 until all must-pass gates are proven.

## BLOCKVERSE VPS v1.2 additional release gates
- [ ] `npm ci` works with a committed verified frontend `package-lock.json` (unavailable in offline build environment).
- [ ] `npm ci` in server/ and server WebSocket integration tests work on clean Node 22.
- [ ] WSS TLS and exact Origin allowlist validated on **actual** VPS with DNS name and Vercel frontend domain.
- [ ] Two different devices on different networks see real realtime avatars and emotes, not BroadcastChannel-only.
- [ ] Room 17th client rejected, max 16 validated in automatic and manual scenarios.
- [ ] Penetration tests: invalid payload, flood limits, deny foreign origins, reject XSS displayName.
- [ ] Children-facing launch safeguards completed: parent/privacy/abuse reporting, data retention, age policy.
- [ ] Client-to-server physics and game reward verification added before official competitive leaderboards or tradable economy.
- [ ] Generated 3D asset rendering and performance tested on mobile 30+ FPS target hardware.
