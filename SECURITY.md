# Security scope

## Reporting
Privately contact the repository maintainer about suspected vulnerabilities. Do not post exploit instructions affecting public player data.

## Trust boundary
- Everything inside a browser is attacker-controlled. Do not treat client physics, Stars, Obby time, game-profile stats, or DOM tests as verified authority.
- Firestore rules are the **only** data permission boundary for anonymous-auth owner profile/world/presence. Correctly deploy the supplied rules or do not enable cloud.
- Revisions are checked atomically on world writes. Local offline game uses IndexedDB without server trust.
- User content imported via JSON is only renderable geometry with a validated schema; no eval or arbitrary JavaScript execution.
- Realtime presence is not a robust authoritative game server; a client can forge its own avatar's position.
- No purchase transactions, user-script execution or public currency are supported.

## Future security work
Enable App Check, server-side rate limiting, moderation tools, data retention cleanup, security monitoring and a server-authoritative session system before high-scale public multiplayer.
