# 📚 BLOCKVERSE Documentation Hub

Semua konten **untuk dibaca manusia** berada di folder `docs/`; root hanya berisi kode, konfigurasi build dan README singkat pengarah.

| Dokumen | Isi |
|---|---|
| [README.md](README.md) | 🎮 Panduan pemain, 3D, gameplay, galeri |
| [NPC_LOCAL_AI_TTS.md](NPC_LOCAL_AI_TTS.md) | 👩‍🏫 13 guru virtual, Ollama LLM, Piper WAV TTS, konfigurasi VPS |
| [NPC_SAFETY.md](NPC_SAFETY.md) | 🛡️ Keselamatan, privasi anak, moderation dan batasan |
| [UPGRADE_ROADMAP.md](UPGRADE_ROADMAP.md) | 🧩 Ide upgrade berikutnya dan prioritas |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 🚀 Operasi, server, staging dan rollback |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | ✅ Gate kelulusan produksi |
| [SECURITY.md](SECURITY.md) | 🔐 Kebijakan dan laporan keamanan |
| [VPS_MULTIPLAYER.md](VPS_MULTIPLAYER.md) | 🌐 Multiplayer antarpemain |
| [V2_RELEASE_HANDOFF.md](V2_RELEASE_HANDOFF.md) | 🔀 Handoff development V2 |
| [ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md](ARGON_ANTIGRAVITY_MASTER_PROMPT_V2.md) | 🤝 Prompt Argon |
| [DEPENDENCY_UPGRADE_CONTEXT7_2026-10-25.md](DEPENDENCY_UPGRADE_CONTEXT7_2026-10-25.md) | 📦 Library dan framework |
| [CHANGELOG.md](CHANGELOG.md) | 🧾 Riwayat perubahan |
| [MIGRATION_NOTES.md](MIGRATION_NOTES.md) | 🗂️ Migrasi dari Gemini |
| [visual/PERFORMANCE_REPORT.md](visual/PERFORMANCE_REPORT.md) | 🖼️ Visual dan performa Argon |
| [argon/ARCHITECTURE_AND_COLLISIONS.md](argon/ARCHITECTURE_AND_COLLISIONS.md) | 🧱 Detail teknis Argon |

## Struktur kerja
- `src/`: game, dunia, UI, NPC
- `server/`: WebSocket, API NPC, server Node
- `tests/`: tes frontend dan server
- `public/assets/`: model GLB dan geodata
- `infra/`: Docker + network deployment
- `docs/`: **semua panduan, laporan, kebijakan dan contoh untuk manusia**

Jangan menganggap nilai GitHub CI saja sebagai bukti lolos QA game anak. Rilis butuh uji manual pada HP/tablet, autentikasi, rate limits, kualitas TTS bahasa Indonesia, interaksi suara dan keselamatan.
