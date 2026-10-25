# 🖥️ BLOCKVERSE VPS Multiplayer Runbook

## Scope and trust boundaries

The independent Node WebSocket service relays avatars and safe emote codes across **different devices** on the internet. Server assigns player IDs, validates room code / avatar / movement shape, enforces a hard **16-player room capacity** and a ~18 Hz movement relay rate. It does **not** run authoritative player physics, item ownership, verified score or anti-cheat. Do not describe DEMO coins/stars as secure multiplayer currency.

## Requirements

- VPS with current Ubuntu LTS, public IP, SSH key auth, Docker Engine + Compose plugin
- Domain/subdomain for websocket, DNS A record to VPS
- Ports 80 and 443 public; SSH limited to trusted IP or protected access
- Frontend deployed on separate HTTPS origin, such as Vercel
- A private clone of the repository on the VPS (or pinned OCI image)

## Docker / Caddy TLS deployment

```bash
cd blockverse/infra
cp .env.example .env
```

Set `.env`:

```dotenv
MULTIPLAYER_DOMAIN=multiplayer.your-real-domain.com
ALLOWED_ORIGINS=https://blockverse.your-real-domain.com,https://your-staging.vercel.app
```

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f multiplayer
curl -sS https://multiplayer.your-real-domain.com/healthz
```

Set **Vercel environment variable** `VITE_MULTIPLAYER_URL=wss://multiplayer.your-real-domain.com/ws`, **rebuild** frontend (Vite env vars are bundled at build time), and amend `vercel.json` `connect-src` to allow only the exact chosen WSS domain before launch. Restart the service with `docker compose up -d --build` after release. Keep `.env` out of Git history.

## Security measures included

- `ALLOWED_ORIGINS` allowlist on every upgrade request, no wildcard fallback
- WebSocket messages capped at 2KB; per-IP simultaneous connection limit of 24
- Room code, world, username, avatar and movement shape validation
- Rate limiting of movement and preset chat; no arbitrary chat text
- Ping/pong heartbeat to drop dead connections
- On disconnect remove presence and close empty rooms
- Docker non-root, read-only root filesystem, dropped Linux capabilities
- Caddy automatic HTTPS/WSS termination, Node service not exposed directly

## Limits / further hardening before public release

- No authentication. Players are guests. Only an ephemeral connection ID is trusted. To prevent room abuse add authenticated sessions, gateway-level IP rate limiting and ban controls.
- No authoritative collision, anti-teleport physics, trusted race timing or anti-cheat.
- No Redis adapter or cross-VPS room sharding. Keep **one VPS Node instance** while in MVP; load-balanced replicas would split room state.
- In-memory room membership will reset on restart; coordinate planned maintenance.
- For child safety add report/block, moderation, privacy and parental protections before open public launch.
- Test UDP/TCP not required: WebSocket uses TCP 443.

## Smoke test (after deployment)

1. Open frontend on two **different networks/devices**. Select the same room code and world.
2. Player A walks; verify Player B sees A within a perceptually acceptable delay, and vice versa.
3. Confirm safe emote bubbles appear, and unsupported free text is rejected.
4. Open 16 clients into same room; client 17 must see a room-full error.
5. Close a tab; corresponding avatar disappears in other browser.
6. Disconnect VPS temporarily; UI must indicate offline (not fake `1 online`).
7. Attempt connections from non-allowlisted Origin; WebSocket upgrade should return HTTP 403.
8. Confirm HTTPS valid certificates and no mixed-content errors in browser console.
9. Run healthz and monitor CPU/RAM, latency, close codes, log volume under a representative load.

## Updates & rollbacks

Keep the server image tagged per release and ensure you can redeploy the previous tag. Configure automatic log rotation, resource limits and VPS monitoring before production. Do not store credentials in image layers or repository.
