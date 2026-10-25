# Proposed Diffs for ChatGPT-Owned Files (`src/schema.mjs`, `server/`)

Per the **File Ownership Protocol** in [`docs/ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/docs/ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md), Argon has **not** modified `src/schema.mjs`, `server/`, `tests/`, `.github/workflows/`, or `render.yaml`. During integration testing of the 12-district Cengkareng Explorer world, we identified one coordinate bound discrepancy and one optional IP rate-limit consideration for local QA scripts:

---

## 1. Align Client Move Validator Bounds (`src/schema.mjs`) with Server Validator (`server/validation.mjs`)

- **Context**:
  - [`server/validation.mjs`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/server/validation.mjs#L15-L18) permits player coordinates up to `Math.abs(n) <= 1000` (`[-1000, 1000]`).
  - [`src/schema.mjs`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/src/schema.mjs#L83-L91) (`validatePlayerMovePacket`) currently restricts client move packets to `this.isFiniteNumber(n, -500, 500)`.
- **Argon Workaround Applied on `feature/argon-v2-art-ux`**:
  - We compacted the 12 Cengkareng Timur district centers into `cx ∈ [-440, 420]` and `cz ∈ [-300, 300]` and added a soft horizontal clamp (`[-495, 495]` X, `[-485, 485]` Z) in `src/game.js` so all 12 districts work within `[-500, 500]` today without touching `src/schema.mjs`.
- **Proposed Diff for `src/schema.mjs` (Owner: ChatGPT)**:

```diff
--- a/src/schema.mjs
+++ b/src/schema.mjs
@@ -84,7 +84,7 @@ export const Validator = {
   validatePlayerMovePacket(pkt) {
     if (!pkt || typeof pkt !== 'object') return false;
     if (!Array.isArray(pkt.position) || pkt.position.length !== 3) return false;
-    if (!pkt.position.every((n) => this.isFiniteNumber(n, -500, 500))) return false;
+    if (!pkt.position.every((n) => this.isFiniteNumber(n, -1000, 1000))) return false;
     if (!this.isFiniteNumber(pkt.rotY, -Math.PI * 4, Math.PI * 4)) return false;
     return true;
   },
```

---

## 2. Optional: Per-IP WebSocket Connection Cap (`server/server.mjs`) Behind Reverse Proxies / Local Load Tests

- **Context**:
  - [`server/server.mjs`](file:///Users/adith92/Desktop/Tas%20Panglima/Roblox/server/server.mjs#L53-L55) tracks `connectionsByIp` using `req.socket.remoteAddress` with a hard cap of `24` concurrent connections per IP.
  - Behind Render's L7 proxy (or a campus NAT where 25+ students share one public IPv4), `req.socket.remoteAddress` may resolve to the proxy/NAT IP unless `x-forwarded-for` is parsed when `TRUST_PROXY=1`.
- **Proposed Diff for `server/server.mjs` (Owner: ChatGPT)**:

```diff
--- a/server/server.mjs
+++ b/server/server.mjs
@@ -50,7 +50,9 @@ function snapshot(s){return {playerId:s.id,roomKey:s.roomKey,displayName:s.name,
 server.on('upgrade',(req,socket,head)=>{
  const origin=req.headers.origin;
  if(req.url?.split('?')[0]!=='/ws'|| !originAllowed(origin,allowedOrigins)) {socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
- const ip=req.socket.remoteAddress||'unknown';const count=connectionsByIp.get(ip)||0;
+ const forwarded=process.env.TRUST_PROXY==='1'?req.headers['x-forwarded-for']?.split(',')[0]?.trim():null;
+ const ip=forwarded||req.socket.remoteAddress||'unknown';
+ const count=connectionsByIp.get(ip)||0;
  if(count>=24){socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{connectionsByIp.set(ip,count+1);ws.ip=ip;wss.emit('connection',ws,req);});
 });
```
