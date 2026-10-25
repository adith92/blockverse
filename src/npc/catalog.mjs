// One audited catalog shared by browser and local server. No user-submitted NPC personas.
export const EDUCATION_TOPICS = Object.freeze({
  literasi:'membaca, menulis dan kosa kata Indonesia',
  matematika:'bilangan dasar, operasi aritmetika, pola dan bentuk',
  sains:'IPA dasar yang aman, air, tumbuhan, cuaca dan tubuh',
  geografi:'Indonesia, Jakarta, lingkungan dan peta',
  sejarah:'budaya Indonesia dan sejarah dasar nonpartisan',
  lingkungan:'kebersihan, sampah, ekologi dan konservasi',
  etika:'sopan santun, empati, persahabatan dan keselamatan sosial',
  seni:'warna, musik, imajinasi dan berkarya',
  keselamatan:'keselamatan lalu lintas dan perlindungan diri',
  logika:'pola, teka-teki ringan dan pemecahan masalah'
});
export const NPC_CATALOG=Object.freeze([
  {
    "id": "maya",
    "name": "Kak Maya",
    "role": "Sahabat Belajar",
    "world": "hub",
    "districtId": null,
    "position": [
      5,
      0,
      8
    ],
    "color": "#ffb86b",
    "topic": "literasi",
    "greeting": "Halo, petualang hebat! Yuk belajar sambil bermain.",
    "lesson": "Membaca melatih imajinasi. Coba sebutkan tiga kata yang dimulai dari huruf B.",
    "focus": "Membaca dan menulis",
    "topics": [
      "literasi",
      "matematika",
      "sains"
    ]
  },
  {
    "id": "bima",
    "name": "Bima Si Penjelajah",
    "role": "Pemandu Geografi",
    "world": "cengkareng",
    "districtId": "kapuk",
    "position": [
      -434,
      0,
      -293
    ],
    "color": "#ffcc55",
    "topic": "geografi",
    "greeting": "Selamat datang di Kapuk Raya! Siap menjelajah?",
    "lesson": "Jakarta Barat adalah salah satu wilayah administrasi di DKI Jakarta. Kita harus menghargai tempat tinggal dan lingkungan.",
    "focus": "Geografi Indonesia",
    "topics": [
      "geografi",
      "lingkungan",
      "sejarah"
    ]
  },
  {
    "id": "lila",
    "name": "Kak Lila",
    "role": "Guru Bahasa",
    "world": "cengkareng",
    "districtId": "ruko",
    "position": [
      -143,
      0,
      -293
    ],
    "color": "#9be6c2",
    "topic": "literasi",
    "greeting": "Hai! Kita belajar kata-kata baik, yuk.",
    "lesson": "Kata tolong, maaf, dan terima kasih membuat teman merasa dihargai.",
    "focus": "Bahasa dan sopan santun",
    "topics": [
      "literasi",
      "etika",
      "matematika"
    ]
  },
  {
    "id": "rio",
    "name": "Rio Berhitung",
    "role": "Pemandu Angka",
    "world": "cengkareng",
    "districtId": "market",
    "position": [
      157,
      0,
      -293
    ],
    "color": "#ffa6a4",
    "topic": "matematika",
    "greeting": "Halo, mau berhitung sambil berbelanja imajinasi?",
    "lesson": "Tiga mangga ditambah dua mangga menjadi lima mangga. Hebat!",
    "focus": "Matematika dasar",
    "topics": [
      "matematika",
      "literasi",
      "etika"
    ]
  },
  {
    "id": "nila",
    "name": "Nila Si Ilmuwan",
    "role": "Penjelajah Air",
    "world": "cengkareng",
    "districtId": "canal",
    "position": [
      427,
      0,
      -293
    ],
    "color": "#7ed9e9",
    "topic": "sains",
    "greeting": "Hai! Yuk jaga sungai kita tetap bersih.",
    "lesson": "Air adalah sumber kehidupan. Sampah harus dibuang ke tempatnya agar saluran air tidak tersumbat.",
    "focus": "Sains air dan lingkungan",
    "topics": [
      "sains",
      "lingkungan",
      "matematika"
    ]
  },
  {
    "id": "rara",
    "name": "Rara Ramah",
    "role": "Sahabat Sosial",
    "world": "cengkareng",
    "districtId": "kampung",
    "position": [
      -433,
      0,
      7
    ],
    "color": "#9fe59c",
    "topic": "etika",
    "greeting": "Halo teman baru! Kita bisa saling menolong.",
    "lesson": "Berteman itu menyenangkan kalau kita bergiliran, mendengarkan, dan menghargai orang lain.",
    "focus": "Budi pekerti",
    "topics": [
      "etika",
      "literasi",
      "lingkungan"
    ]
  },
  {
    "id": "farhan",
    "name": "Farhan Ceria",
    "role": "Cerita Budaya",
    "world": "cengkareng",
    "districtId": "fajar",
    "position": [
      -143,
      0,
      7
    ],
    "color": "#f6d47c",
    "topic": "sejarah",
    "greeting": "Selamat datang! Yuk mengenal kebudayaan Indonesia.",
    "lesson": "Indonesia memiliki beragam budaya dan tradisi. Kita saling menghormati walaupun berbeda.",
    "focus": "Budaya Nusantara",
    "topics": [
      "sejarah",
      "etika",
      "geografi"
    ]
  },
  {
    "id": "caca",
    "name": "Caca Kreatif",
    "role": "Guru Seni",
    "world": "cengkareng",
    "districtId": "plaza",
    "position": [
      157,
      0,
      7
    ],
    "color": "#c9adff",
    "topic": "seni",
    "greeting": "Halo, seniman muda! Yuk berkreasi.",
    "lesson": "Warna merah, kuning, dan biru adalah warna primer dalam seni rupa tradisional.",
    "focus": "Warna dan kreativitas",
    "topics": [
      "seni",
      "matematika",
      "literasi"
    ]
  },
  {
    "id": "tama",
    "name": "Tama Tertib",
    "role": "Sahabat Lalu Lintas",
    "world": "cengkareng",
    "districtId": "transit",
    "position": [
      427,
      0,
      7
    ],
    "color": "#99caff",
    "topic": "keselamatan",
    "greeting": "Hai! Ingat jalan harus aman, ya.",
    "lesson": "Sebelum menyeberang, berhenti dan lihat kanan-kiri bersama pendamping dewasa.",
    "focus": "Keselamatan di jalan",
    "topics": [
      "keselamatan",
      "etika",
      "geografi"
    ]
  },
  {
    "id": "dinda",
    "name": "Kak Dinda",
    "role": "Guru Sains",
    "world": "cengkareng",
    "districtId": "school",
    "position": [
      -433,
      0,
      307
    ],
    "color": "#b8ecb5",
    "topic": "sains",
    "greeting": "Halo kelas petualang! Siap eksperimen aman?",
    "lesson": "Tumbuhan membutuhkan air, cahaya, dan udara untuk hidup. Yuk rawat tanaman di sekitar kita.",
    "focus": "IPA untuk anak",
    "topics": [
      "sains",
      "matematika",
      "literasi"
    ]
  },
  {
    "id": "bayu",
    "name": "Bayu Penjaga Taman",
    "role": "Teman Lingkungan",
    "world": "cengkareng",
    "districtId": "park",
    "position": [
      -143,
      0,
      307
    ],
    "color": "#8bdfab",
    "topic": "lingkungan",
    "greeting": "Selamat datang di taman, yuk rawat bersama!",
    "lesson": "Pohon membantu menghasilkan oksigen, memberi naungan, dan menjadi rumah bagi banyak hewan.",
    "focus": "Peduli lingkungan",
    "topics": [
      "lingkungan",
      "sains",
      "etika"
    ]
  },
  {
    "id": "sasa",
    "name": "Sasa Pemberani",
    "role": "Pelatih Logika",
    "world": "cengkareng",
    "districtId": "rooftop",
    "position": [
      157,
      0,
      307
    ],
    "color": "#ffd5ac",
    "topic": "logika",
    "greeting": "Halo! Ayo belajar memecahkan masalah dengan aman.",
    "lesson": "Kalau langkah pertama belum berhasil, kita coba cara lain. Kesalahan adalah kesempatan untuk belajar.",
    "focus": "Logika dan ketekunan",
    "topics": [
      "logika",
      "matematika",
      "keselamatan"
    ]
  },
  {
    "id": "juno",
    "name": "Juno Penjelajah",
    "role": "Pemandu Transportasi",
    "world": "cengkareng",
    "districtId": "daan-mogot",
    "position": [
      427,
      0,
      307
    ],
    "color": "#fff0a3",
    "topic": "geografi",
    "greeting": "Hai! Ayo mengenal kendaraan dan perjalanan aman.",
    "lesson": "Bus dapat mengangkut banyak penumpang. Transportasi umum membantu mengurangi jumlah kendaraan pribadi.",
    "focus": "Transportasi dan kota",
    "topics": [
      "geografi",
      "keselamatan",
      "lingkungan"
    ]
  }
].map(n=>Object.freeze(n)));
export function getNpc(id){return NPC_CATALOG.find(n=>n.id===id)||null;}
