# 👩‍🏫 BLOCKVERSE NPC School • Local LLM + Local TTS

## Apa yang dibuat?
Game menampilkan **13 NPC**: Kak Maya di Hub serta 12 sahabat belajar yang dapat ditemui di 12 distrik Cengkareng. Tiap NPC punya nama, warna, persona tetap, sapaan, dan tiga pilihan tema pelajaran. Tekan **N** di dekat guru virtual atau tombol "💬 Bicara dengan guru". Semua materi ditulis dengan Bahasa Indonesia sederhana.

NPC bertindak sebagai **karakter fiksi**, bukan anak manusia atau pengganti guru. Semua balasan tetap ditampilkan sebagai teks; audio memerlukan konfigurasi server Piper. Jika Ollama tidak aktif, NPC memberikan contoh pelajaran tetap dan tidak mengarang jawaban.

## Arsitektur satu server
```text
Browser BLOCKVERSE ──HTTPS──▶ server Node /api/npc/talk
                                    │
                     ┌──────────────┴─────────────────┐
                     ▼                                ▼
            Ollama lokal :11434               Piper CLI lokal (WAV)
            qwen3:4b misalnya                  model .onnx berlisensi
                     │                                │
                     ▼                                ▼
              balasan disaring          /api/npc/speech/<one-time-UUID>
                     │                                │
                     └────────────────┬───────────────┘
                                      ▼
                              Teks dan suara NPC
```

**Ollama dan Piper berjalan di VPS pribadi yang sama (atau jaringan Docker internal yang diamankan), bukan di browser.** Model LLM dan model suara **tidak disertakan di repo**. Tidak perlu API key AI cloud.

### API
- `GET /api/npc/catalog`: daftar NPC dan topik tanpa data pribadi.
- `POST /api/npc/talk`: `{"npcId":"rio","mode":"lesson","topic":"matematika"}`.
- `POST /api/npc/talk`: mode `greeting` untuk sapaan.
- `POST /api/npc/talk`: mode `question` hanya jika `NPC_FREEFORM_ENABLED=1` (tidak direkomendasikan tanpa moderasi manusia).
- `GET /api/npc/speech/<speechId>`: WAV TTS dari Piper, ID sekali pakai, kedaluwarsa 60 detik.

### Menjalankan Ollama lokal
Ikuti petunjuk Ollama resmi: https://docs.ollama.com/api/chat
```bash
ollama serve
ollama pull qwen3:4b
```
**Konfigurasi contoh server Node** (set di process manager VPS, jangan memasukkan ke file publik atau variabel `VITE_`):
```bash
PORT=3001
ALLOWED_ORIGINS=https://game.contoh-domain.id,http://127.0.0.1:5173
NPC_LLM_ENABLED=1
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
NPC_FREEFORM_ENABLED=0
NPC_TTS_ENABLED=0
# Setelah memasang voice berlisensi:
PIPER_VOICE_MODEL=/opt/blockverse/voices/VOICE_YANG_SUDAH_DIVERIFIKASI.onnx
```
`OLLAMA_BASE_URL` hanya diperbolehkan loopback/localhost atau internal Docker `http://ollama:11434`, bukan URL bebas dari pengunjung.

### Piper TTS di server
Dokumentasi terbaru: https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/CLI.md

Piper perlu paket runtime lokal, model `.onnx` beserta `.onnx.json`, file pendukung phonemizer, dan lisensi suara yang sesuai. Pastikan model mendukung **Bahasa Indonesia** secara natural sebelum memilihnya. **Jangan mengklaim suara anak kecil tersedia** sebelum ada model sintetis bernuansa muda yang legal dan pengujian suara. Jangan meniru/mengkloning suara anak nyata.

Contoh penggunaan Piper resmi:
```bash
python3 -m piper -m /opt/blockverse/voices/model.onnx -f test.wav -- 'Halo! Hari ini kita belajar bersama.'
```
Jika model tersedia dan sesuai bahasa, barulah aktifkan `NPC_TTS_ENABLED=1`; tombol 🔊 akan muncul. Tidak ada audio sintetis tanpa model terpasang. Sistem melaksanakan satu sintesis sekaligus dan membersihkan berkas WAV sementara. Audio dibatasi sekitar 2MB per jawaban.

**Catatan deployment:** Render Free lama **tidak menyediakan model lokal Ollama/Piper secara otomatis**. Jangan mengaktifkan tanpa memastikan CPU/RAM/GPU, penyimpanan model, dan lisensi pada VPS. Untuk LLM 4B biasanya butuh beberapa GB RAM tambahan; ukur nyata. Piper akan menambah latensi jika dimuat setiap permintaan; opsi server Piper persistent dapat menjadi upgrade berikutnya.

## Uji coba
```bash
npm install
npm --prefix server install
npm run build
ALLOWED_ORIGINS=http://127.0.0.1:3001,http://127.0.0.1:5173 NPC_LLM_ENABLED=0 NPC_TTS_ENABLED=0 npm start
```
Buka http://127.0.0.1:3001, main Cengkareng, dekatkan avatar ke NPC, tekan N. Di komputer pengembangan, `npm run dev` mem-proxy API NPC ke port server `3001`.

## Batas keamanan yang harus disadari
- Default **pilihan topik terkurasi saja**, freeform mati.
- Jawaban Ollama menggunakan prompt pengajaran, filter input/output dan fallback tetap.
- Filter regex **tidak cukup** untuk menjamin semua jawaban LLM aman bagi anak. Wajib moderation model tambahan, pengujian red-team, dan pengawasan.
- Tidak ada penyimpanan rekaman mikrofon; fase ini **teks → suara TTS**, belum speech-to-text microphone.
- Tidak ada penyimpanan riwayat anak di server. IP hanya dipakai rate limit sementara dalam memori.
- Semua ucapan dihasilkan di server; jangan aktifkan freeform di lingkungan anak publik sampai ada kontrol usia dan moderasi manusia.

## Sumber Context7
- Ollama `/ollama/ollama`, `POST /api/chat`, `stream:false`
- Piper `/ohf-voice/piper1-gpl`, CLI `-m ... -f ... -- 'text'`

## Docker Compose ops (VPS only)
`infra/docker-compose.yml` provides an **opt-in internal Ollama service** via Docker profile `ai`.
```bash
cd infra
cp .env.example .env
# Edit ALLOWED_ORIGINS and MULTIPLAYER_DOMAIN for your HTTPS game domain.
docker compose --profile ai up -d --build
# Download the desired local model (not bundled):
docker compose exec ollama ollama pull qwen3:4b
# Enable AI by setting NPC_LLM_ENABLED=1 in .env; recreate multiplayer container.
docker compose --profile ai up -d --force-recreate multiplayer
```
**Do not run this on Render Free** without capacity checks. Ollama has no public published port in this Compose stack. The Docker build bundles frontend, WebSocket and NPC API into one service. Piper voice in Docker requires a separate compatible installation, container runtime or a later reviewed IPC integration; for now use direct VPS host installation for TTS. Never enable `NPC_TTS_ENABLED=1` on an image lacking Piper and voice models.
