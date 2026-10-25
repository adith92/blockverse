# Staging and production deployment runbook

## 1. GitHub
- Extract ZIP to an empty directory, initialize Git, create private `blockverse` repository.
- Run `npm install`; commit `package-lock.json` after validating `npm run test:unit` and `npm run build`.
- Protect `main`: require PR and passing CI, prevent force-push, enable secret scanning and Dependabot.
- Switch GitHub workflow install steps to `npm ci` once the lockfile exists.

## 2. Firebase staging project
- Create **separate** staging Firebase project.
- Enable anonymous authentication (optional Google login is not implemented).
- Provision Firestore, configure rules using `firebase deploy --only firestore:rules,firestore:indexes --project YOUR_STAGING_PROJECT`.
- Set Firebase Authentication authorized domains.
- Run `npm run test:rules:emulator`. Verify with two real browsers/devices: bob cannot modify Alice's presence/profile/world.
- Do not treat public `VITE_FIREBASE_CONFIG` as secret; configure Firebase security rules independently.

## 3. Vercel
- Import GitHub repo; root `/`; build `npm run build`; output `dist`.
- Set `VITE_APP_ID=blockverse-staging` and `VITE_FIREBASE_CONFIG` as a one-line JSON string.
- Deploy preview and verify response security headers and that assets load without script CSP violations.
- Test Obby and Builder with a real 3D-capable browser. Test anonymous auth and Firestore persistence across full page reload.
- Validate two different devices and two different browsers join same room.

## 4. Public rollout
- Evaluate privacy obligations, user-generated content policy, abuse reporting, data retention, basic security review and incident response.
- Limit Firestore reads/costs; global presence collection does not scale indefinitely.
- Decide whether to disable Stars for the public release or build backend-verified scoring; **never award tradeable public economy credits from client-only actions**.
- Run release checklist. Only publish after all must-pass items show evidence.

## Rollback
- Rollback front end to the last known-good Vercel deployment.
- If Firestore rules deployment breaks auth or owner saves, deploy the prior secure rules version; NEVER temporarily use `allow read, write: if true`.
- Restore cloud data from Firebase backups if enabled; local IndexedDB is not a backup strategy for cloud world changes.


## VPS realtime WebSocket (v1.2)

See `docs/VPS_MULTIPLAYER.md`. Server source is `server/server.mjs`, config sample `infra/.env.example`, orchestration `infra/docker-compose.yml`. `VITE_MULTIPLAYER_URL=wss://<YOUR_SUBDOMAIN>/ws` in Vercel is required for VPS multiplayer. Do not deploy server on Vercel serverless functions. DNS + Caddy TLS + true client smoke tests are mandatory. Local guest gameplay works without VPS.
