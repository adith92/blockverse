# BLOCKVERSE: Supabase migration (SAFE / NOT APPLIED)

**Target project supplied:** `uicpfqvmcubycuqafdqb` (`NgajiYuk`). It was reported **INACTIVE** and could not be inspected. We have NOT created, deleted, or changed any database tables. No Firebase records have been deleted.

## What moves
- Firebase Web SDK → `@supabase/supabase-js` (published SDK pinned)
- Anonymous login → `supabase.auth.signInAnonymously()`, only when publishable key is configured.
- Profile and world saves → owner-only `bv_profiles` and `bv_worlds` tables and `bv_save_world` compare-and-swap RPC.
- Local IndexedDB stays intact for offline/guest play. Original WebSocket multiplayer and 125+ asset GLBs are unchanged.
- Network room presence remains on the existing WebSocket server (not Supabase Realtime).

## Critical: don't destroy the NgajiYuk project
1. Restore/resume the database in Supabase Dashboard if the owner wants to reuse this project.
2. Take a full verified DB backup and record row counts and existing table names.
3. Review and approve the new **prefixed** `bv_*` schema in `supabase/preview_blockverse_schema.sql`; it has not been applied.
4. Prefer a **new dedicated BLOCKVERSE Supabase project** rather than sharing the education app's database.
5. Enable anonymous sign-ins if guest persistence is desired. Anonymous players use the `authenticated` role; RLS owner checks use `auth.uid()`.
6. Use **only** `sb_publishable_...` in `VITE_SUPABASE_PUBLISHABLE_KEY`. Personal `sbp_`, service-role or `sb_secret_` credentials MUST NEVER go into browser code, Git or Vite environments.
7. Validate RLS using two real test accounts: user A cannot list/update B's worlds; unauthenticated session has no access; invalid revision rejected.
8. Set Render staging env vars, rebuild, run smoke tests, then get owner approval for production deployment.
9. Keep Firebase databases and backups until owner explicitly approves decommissioning.

## Local use
Without Supabase credentials, game still runs with IndexedDB and WebSocket multiplayer. Supabase persistence remains intentionally disabled.

## Important limitations
- Current game stores stars / badges in local profile; these are **not authoritative economy rewards**.
- Local-only cached save is not automatically transferred between device accounts.
- Database function checks array size and revision; full semantic validation of object geometry is currently on the client only. Public authoring should use stricter server-side validation.
- Cloud storage and profile save cannot be verified until the target database is running, backed up, schema reviewed/applied and publishable key configured.

Official docs: https://supabase.com/docs/guides/auth/auth-anonymous ; https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/getting-started/api-keys
