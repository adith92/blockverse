# 🛡️ Edukasi Anak • Keamanan dan Privasi NPC BLOCKVERSE

Fitur NPC diperuntukkan sebagai **contoh untuk staging**, bukan layanan AI bebas kepada anak tanpa pendamping. Default hanya 13 NPC dan topik pelajaran tetap, dengan jawaban fallback edukatif.

## Kontrol yang telah diimplementasikan
- 13 persona dan tema dibuat pemilik, **tidak bisa disetel pengguna**.
- Server menerima ukuran body maksimal 2 KB, membatasi 12 permintaan per menit per IP dan paling banyak dua respons LLM serentak.
- Local LLM hanya dikontak lewat alamat localhost/Docker internal dari ENV yang dipilih admin, tidak dapat diubah lewat HTTP pengunjung.
- Freeform dimatikan secara default; bila diaktifkan, teks disaring dan dibatasi 180 karakter.
- Output dipotong maksimal 380 karakter dan disaring dari pola sensitif; respons tidak aman diganti contoh pelajaran tetap.
- Suara server menggunakan ID acak sekali pakai dengan TTL 60 detik; tidak menyediakan endpoint synthesizer berbasis teks bebas.
- Tidak ada pelacakan nama, alamat rumah, email, foto, nomor HP, atau rekaman mikrofon anak sebagai kebutuhan fitur ini.
- Tidak ada reward atau monetisasi dari percakapan NPC.

## Hal yang **belum** aman sepenuhnya
- Filter kata kunci dan system prompt dapat ditembus oleh serangan prompt injection atau pertanyaan ambigu.
- Belum ada moderation classifier eksternal, tinjauan manusia, audit bias, manajemen persetujuan orang tua, atau sistem pelaporan insiden.
- Tanpa autentikasi anak dan batasan perangkat, IP rate limit bisa terlalu ketat untuk sekolah satu NAT.
- Tidak ada verifikasi model suara apakah terdengar ramah, alami, bebas pelanggaran lisensi atau cocok Bahasa Indonesia.
- Pengucapan sebuah materi salah tetap mungkin terjadi meski dibatasi prompt.
- LLM dan TTS harus dipasang pada server pribadi; Render Free hanya memberikan konten fallback apabila belum dikonfigurasi.

## Gerbang sebelum membuka ke publik
- [ ] Uji percakapan dengan ratusan pertanyaan adversarial Bahasa Indonesia.
- [ ] Moderasi output tambahan, bukan hanya regex.
- [ ] Review materi oleh pendidik, orang tua, dan tenaga profesional perlindungan anak.
- [ ] Uji model Bahasa Indonesia dan output Piper pada perangkat mobile.
- [ ] Audit pengumpulan data, kebijakan privasi serta regulasi anak yang berlaku.
- [ ] Validasi keamanan CI, HTTPS, load-test, pemantauan error tanpa merekam isi chat.
- [ ] Persetujuan pemilik sebelum fitur freeform dan produksi diaktifkan.

**Hindari klaim 'child-safe guaranteed'. Ini prototipe edukatif dengan guardrail dasar.**
