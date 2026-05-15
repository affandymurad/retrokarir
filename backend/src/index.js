import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Hanya file PDF yang diizinkan'));
  },
});

function cleanJsonResponse(text) {
  const cleaned = String(text || '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Respons AI bukan JSON yang valid');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function parseJsonField(value, fieldName) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} harus berupa JSON valid`);
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeUserData(rawUserData) {
  const userData = rawUserData || {};

  return {
    ...userData,
    fullName: userData.fullName || 'Pengguna',
    birthDate: userData.birthDate || new Date().toISOString(),
    gender: userData.gender || '-',
    workTypes: normalizeArray(userData.workTypes),
    dreamLocations: normalizeArray(userData.dreamLocations),
    outputLang: userData.outputLang || 'id',
  };
}

// Gemini kadang menghasilkan nilai per-lokasi sebagai nested object
// { "rentangGaji": "...", "posisiAcuan": "..." } alih-alih string.
// Fungsi ini meratakan SEMUA bentuk nilai menjadi string agar aman di-render React.
function normalizeMarketValue(marketValue) {
  if (!marketValue || typeof marketValue !== 'object') return { catatan: '' };

  const normalized = {};

  for (const [key, val] of Object.entries(marketValue)) {
    if (key === 'catatan') {
      normalized.catatan = typeof val === 'string' ? val : '';
    } else if (typeof val === 'string') {
      normalized[key] = val;
    } else if (typeof val === 'number') {
      normalized[key] = String(val);
    } else if (Array.isArray(val)) {
      // Array of strings — join them
      normalized[key] = val
        .filter(v => v != null)
        .map(v => (typeof v === 'string' ? v : safeStringValue(v)))
        .join(' ');
    } else if (typeof val === 'object' && val !== null) {
      // Nested object — flatten all known fields in priority order
      const parts = [];
      const knownKeys = [
        'baseline', 'baselineRealistis', 'rentangGaji', 'gaji',
        'upperMarket', 'upper', 'upperMarketNote',
        'posisiAcuan', 'level', 'levelRole',
        'catatan', 'konteks', 'note', 'keterangan',
        'syaratNaik', 'kondisi',
      ];

      // First, try known keys in order
      for (const k of knownKeys) {
        if (val[k] && typeof val[k] === 'string' && val[k].trim()) {
          parts.push(val[k].trim());
        }
      }

      // Then, collect any remaining string values not yet included
      if (parts.length === 0) {
        for (const v of Object.values(val)) {
          if (typeof v === 'string' && v.trim()) {
            parts.push(v.trim());
          }
        }
      }

      normalized[key] = parts.join(' ') || JSON.stringify(val);
    }
  }

  if (!normalized.catatan) normalized.catatan = '';
  return normalized;
}

function safeStringValue(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return Object.values(v)
      .filter(x => typeof x === 'string')
      .join(' ');
  }
  return String(v);
}

// ── SHARED buildPrompt ────────────────────────────────────────
function buildPrompt(cvText, userData) {
  const {
    fullName,
    birthDate,
    gender,
    workTypes,
    dreamLocations,
    outputLang = 'id',
  } = userData;

  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  const workTypesStr = Array.isArray(workTypes)
    ? workTypes.join(', ')
    : workTypes || '-';

  const locationsStr = Array.isArray(dreamLocations)
    ? dreamLocations.join(', ')
    : dreamLocations || '-';

  const level =
    age <= 26
      ? 'Fresh Graduate / Early Career'
      : age <= 32
        ? 'Mid-level Professional'
        : 'Senior Professional';

  const scoreGuide =
    age <= 26
      ? 'Fresh grad: 40-65. Skor di atas 65 hanya boleh jika ada bukti kerja nyata yang sangat kuat.'
      : age <= 32
        ? 'Mid-level: 55-75. Skor di atas 75 hanya boleh jika ada bukti kepemimpinan, dampak bisnis, atau pengalaman global yang jelas.'
        : 'Senior: 65-85. Jangan melewati 85. Skor 80-85 hanya untuk area yang benar-benar terbukti kuat dari CV, bukan sekadar sertifikasi.';

  const langInstruction =
    outputLang === 'en'
      ? 'Write ALL JSON field values in English. Keep field keys unchanged.'
      : 'Tulis SEMUA nilai field JSON dalam Bahasa Indonesia formal, natural, dan mudah dipahami. Field keys tidak diubah.';

  return `
Anda adalah Retrokarir AI Career Intelligence Advisor: mentor karier senior, enterprise recruiter, talent market analyst, dan career positioning consultant.

TUGAS UTAMA:
Buat laporan karier personal yang objektif, realistis, tidak generik, dan berbasis CV. Laporan harus membantu pemilik CV memahami:
1. posisi karier saat ini,
2. kekuatan yang benar-benar terbukti,
3. potensi yang masih perlu dibuktikan,
4. gap yang harus ditutup,
5. role yang paling realistis,
6. estimasi market value yang rasional dan tidak berlebihan,
7. langkah konkret 6-12 bulan.

INPUT CV:
${cvText}

DATA PENGGUNA DARI FORM:
Nama: ${fullName}
Usia: ${age} tahun (${level})
Gender: ${gender}
Tipe Kerja Diinginkan: ${workTypesStr}
Lokasi Target: ${locationsStr}

ATURAN OUTPUT:
- Output HANYA JSON valid. Tanpa markdown, tanpa teks pembuka, tanpa teks penutup.
- ${langInstruction}
- Field keys dan struktur JSON WAJIB valid.
- Jangan mengarang fakta yang tidak ada di CV.
- Jangan memakai gaya motivator berlebihan.
- Jangan memakai frasa hiperbolik seperti: "talenta langka", "panggung dunia", "sangat aman dari otomasi", "sudah pasti", "jaminan", "kelas dunia", "tech-giant", atau "professional student".
- Jika ingin menyebut keunikan profil, gunakan bahasa terukur seperti "kombinasi yang cukup berbeda", "diferensiasi yang kuat", atau "nilai tambah yang terlihat dari CV".
- Gunakan ejaan lokasi yang benar: "San Francisco", bukan "San Fransisco".
- Hindari frasa terlalu berat seperti "open-source tingkat dunia". Gunakan "kontribusi open-source yang konsisten dan relevan secara teknis".
- Untuk proyek publik seperti eHAC, gunakan istilah "proyek layanan publik berskala luas" atau "aplikasi sektor publik berdampak luas", bukan klaim yang terlalu dramatis.
- JANGAN gunakan frasa seperti "proyek pemerintah yang kritis", "kepentingan nasional", "proyek sebesar eHAC", "infrastruktur kritis", atau "vital bagi negara" kecuali CV menyebutkan skala/kekritisan tersebut secara eksplisit.
- Jika CV menyebut eHAC atau proyek publik serupa tanpa menyebut jumlah pengguna secara eksplisit, JANGAN tulis "digunakan jutaan orang" atau klaim skala pengguna apapun. Gunakan framing yang defensible seperti: "aplikasi eHAC iOS yang digunakan sebagai bagian dari layanan perjalanan nasional selama pandemi COVID-19 di Indonesia."
- Klaim skala hanya boleh ditulis jika angka atau ukuran tersebut tercantum secara eksplisit di CV.
- Bedakan secara eksplisit antara:
  a) bukti kuat dari CV,
  b) indikasi/potensi,
  c) target pengembangan.
- Sertifikasi boleh dianggap sebagai sinyal kesiapan, tetapi bukan bukti pengalaman produksi kecuali CV menunjukkan penerapan nyata.
- Jika CV tidak menyebut metrik seperti jumlah pengguna, revenue, SLA, ukuran tim, atau dampak bisnis, nyatakan sebagai gap, bukan diasumsikan.
- Semua skor harus integer 0-100.
- Panduan skor: ${scoreGuide}
- Jangan memberi skor lebih dari 85 untuk Senior Professional.
- Untuk role AI Engineer, Cybersecurity Specialist, Engineering Manager, atau Solution Architect, jangan jadikan klaim utama jika CV hanya menunjukkan sertifikasi atau pengalaman parsial. Jadikan sebagai jalur transisi atau target bersyarat.
- Nada ringkasan awam: hangat, semi-formal, profesional, dan jujur. Hindari slang seperti "keren banget", "coba deh", "jarang lho", "mantap", "yuk", "nih".

PRINSIP ANALISIS:
- Baca pola karier, bukan hanya daftar skill.
- Hubungkan pengalaman kerja, proyek, sertifikasi, organisasi, dan target lokasi.
- Nilai CV berdasarkan bukti, bukan asumsi.
- Berikan saran yang dapat dilakukan dalam 6-12 bulan.
- Jangan membuat laporan terlalu memuji; pemilik CV harus tahu apa yang sudah kuat dan apa yang belum kuat.
- Jangan menggunakan diksi yang terlalu menghakimi. Hindari frasa seperti "professional student". Gunakan versi profesional seperti "profil terlihat lebih kuat di pembelajaran daripada bukti delivery" jika sertifikasi banyak tetapi penerapan proyek belum terlihat.
- Jangan menyarankan "tech-giant" sebagai satu-satunya jalan naik gaji. Gunakan pilihan yang lebih realistis seperti perusahaan teknologi, digital banking, product company, regional tech company, enterprise software company, atau consulting/solution provider.
- Untuk kemampuan bahasa Inggris, berikan target bertahap. Jangan langsung menyarankan IELTS 7.0 sebagai target utama kecuali CV sudah menunjukkan kemampuan mendekati level tersebut. Gunakan target awal TOEFL ITP 550+ atau IELTS 6.5, lalu IELTS 7.0 sebagai target lanjutan.
- Jika ada pengalaman publik/enterprise, sebut sebagai "proyek sektor publik/enterprise", "proyek layanan publik berskala luas", atau "aplikasi sektor publik berdampak luas". JANGAN gunakan "vital negara", "kepentingan nasional", atau "infrastruktur kritis" kecuali CV menyebut skala atau kekritisan tersebut secara eksplisit dengan data.

KETENTUAN FIELD LAMA:
- profilRingkas.bidangKarier: maksimal 6 kata, tanpa kode sektor.
- careerArchetype.nama: memorable, personal, tetapi tidak hiperbolik.
- careerArchetype.deskripsi: 2-3 kalimat, realistis, berbasis pola CV.
- careerArchetype.arahMasaDepan: 2-3 jalur karier konkret dan bersyarat.
- careerTrajectory.arahKarier: satu narasi singkat tentang arah karier saat ini.
- careerTrajectory.transisiTerbesar: jelaskan transisi terbesar yang terlihat dari CV.
- careerTrajectory.fase: 2-4 fase, tiap deskripsi 1-2 kalimat.
- hiddenAdvantage.kombinasiLangka: 2-3 kombinasi skill/experience yang benar-benar didukung CV.
- hiddenAdvantage.kenapaLangka: jelaskan tanpa hiperbola.
- hiddenAdvantage.dampakKarier: jelaskan dampak terhadap positioning pasar.
- marketPositioning.posisiUtama: role paling realistis saat ini, bukan role aspiratif.
- marketPositioning.nilaiPasar: ringkas, objektif, sebut kelebihan dan batasannya.
- marketPositioning.roleCocok: 3-5 role realistis sekarang atau dekat.
- marketPositioning.roleHindari: 2-3 role yang kurang cocok + alasan singkat.
- futureProofScore: setiap keterangan maksimal 2 kalimat dan wajib menyebut dasar CV atau gap.
- careerRisk.salaryCeilingRisk dan stagnationRisk: masing-masing 2-3 kalimat, realistis.
- careerRisk.penyebab: 2-3 item, maksimal 12 kata per item.
- careerRisk.solusiStrategis: tepat 3 paragraf naratif SMART, bukan tabel, masing-masing 2-3 kalimat.
  Paragraf solusi harus realistis, tidak menggurui, dan tidak memakai istilah keras seperti "professional student".
  Jika membahas sertifikasi yang banyak, arahkan ke bukti penerapan proyek nyata, metrik dampak, portfolio, atau studi kasus.
- marketValue: hanya untuk lokasi target: ${locationsStr}.
- Nama lokasi harus bersih dan terbaca. Contoh: "Jakarta", "Singapura", "Kuala Lumpur", "San Francisco".
- KRITIS: Nilai tiap lokasi di marketValue HARUS berupa STRING BIASA (bukan object, bukan array, bukan nested JSON).
- DILARANG KERAS: jangan pernah menulis { "rentangGaji": "...", "posisiAcuan": "...", "baseline": "...", "upperMarket": "..." } atau bentuk object apapun sebagai nilai lokasi.
- CONTOH FORMAT YANG BENAR (ikuti persis pola ini):
  "Jakarta": "Baseline realistis Rp 18–25 juta/bulan untuk level mid-senior di product company atau digital banking. Upper-market Rp 28–35 juta/bulan dapat dicapai jika ada metrik dampak bisnis dan kepemimpinan tim yang terbukti. Software house atau perusahaan non-tech umumnya berada di rentang Rp 12–18 juta/bulan.",
  "Singapura": "Baseline realistis SGD 5.500–7.000/bulan untuk posisi mid-senior di perusahaan regional. Upper-market SGD 8.000–9.500/bulan dapat dicapai jika portofolio arsitektur dan komunikasi Inggris kuat. Estimasi berlaku untuk onsite/relokasi, bukan remote dari Indonesia."
- CONTOH FORMAT YANG SALAH (jangan lakukan ini):
  "Jakarta": { "rentangGaji": "Rp 18-25 juta", "posisiAcuan": "Mid-senior" }
- marketValue wajib berisi rentang gaji realistis, level role, alasan/rationale, dan kondisi peningkatan salary jika ada.
- marketValue harus membedakan baseline realistis vs upper-market. Jangan menampilkan angka atas seolah-olah standar umum.
- Jangan membuat format pendek seperti hanya "Rp 18-30 juta/bulan". Tulis kalimat lengkap dengan konteks.
- INGAT: marketValue adalah flat object. Setiap key adalah nama lokasi, setiap value adalah satu string panjang. Tidak ada nesting apapun kecuali key "catatan".
- ringkasanAwam: setiap sub-field maksimal 3 kalimat.
- kataKunciJobSeeker.posisi: 6-10 jabatan, tanpa lokasi.
- kataKunciJobSeeker.keahlian: 8-12 skill teknis dan non-teknis.
- pemetaanKompetensi: tiap pilar berisi 2-3 kekuatan dan 1-2 celah, tiap item maksimal 12 kata.
- analisisRisiko.level: hanya "Rendah", "Sedang", atau "Tinggi".
- analisisRisiko.persentaseRisiko: realistis. Untuk profil senior multi-skill, biasanya 20-45; jangan terlalu rendah jika ada gap bahasa, metrik, atau spesialisasi.
- analisisRisiko.faktorRisiko: 2-3 item, maksimal 15 kata per item.
- analisisRisiko.penjelasan: 2-3 kalimat.
- rekomendasiAkhir: sebut nama, 1-2 keunggulan unik, 1 gap utama, dan 1 target konkret 6-12 bulan.
- rekomendasiAkhir maksimal 4 kalimat agar tidak mudah terpotong di PDF.

ATURAN MARKET VALUE / ESTIMASI GAJI:
- Estimasi gaji harus konservatif-rasional, bukan angka promosi.
- Jangan memakai angka upper-market sebagai baseline.
- WAJIB: angka baseline yang kamu tulis harus mencerminkan median pasar, bukan median premium. Lebih baik terlalu rendah dan disebutkan syarat naik, daripada terlalu tinggi tanpa dasar bukti.
- Jika CV belum menunjukkan metrik dampak bisnis, ukuran tim, system design, atau pengalaman production-scale yang jelas, turunkan estimasi 15-30% dari rentang senior/lead ideal.
- Jika CV banyak berisi sertifikasi tetapi minim bukti deployment ke production atau dampak bisnis terukur, gunakan rentang level "mid-senior", bukan "senior penuh" atau "lead".
- Untuk role leadership seperti Engineering Manager, IT Manager, Solution Architect, atau Mobile Lead, berikan angka tinggi hanya jika CV membuktikan people management, ownership roadmap, system architecture, stakeholder management, dan dampak bisnis.
- Jika bukti leadership belum lengkap, gunakan label "berpotensi menuju" atau "upper-market jika bukti ditambahkan".
- Untuk lokasi global, bedakan antara:
  1. local hire/onsite,
  2. relocation dengan visa,
  3. remote contractor dari Indonesia.
- Untuk San Francisco atau pasar Amerika Serikat, jangan membuat angka onsite seolah otomatis berlaku untuk kandidat remote dari Indonesia. Remote contractor harus jauh lebih konservatif daripada local onsite senior engineer.
- Untuk Singapura, bedakan antara perusahaan lokal/regional, multinational company, dan big tech. Jangan langsung memakai angka big tech.
- Untuk Jakarta, bedakan antara perusahaan non-tech/internal IT, software house, digital banking, product company, dan unicorn.
- Untuk Timur Tengah seperti Doha, Dubai, Kuwait, atau Saudi, pertimbangkan paket total compensation, benefit, housing, dan pajak. Jangan hanya menaikkan angka karena wilayah tersebut dianggap kaya.
- Untuk Kuala Lumpur, jangan terlalu tinggi hanya karena pernah bekerja di Malaysia; pengalaman tersebut adalah nilai tambah, bukan jaminan masuk rentang tertinggi.
- Jika data CV belum menunjukkan bahasa Inggris kuat, global interview readiness, atau portfolio architecture, turunkan estimasi untuk Singapura, Eropa, Amerika Serikat, dan remote global.
- Market value wajib memuat kalimat syarat peningkatan, misalnya: "dapat naik jika memiliki metrik dampak, portfolio arsitektur, dan komunikasi Inggris yang lebih kuat."
- Gunakan kata "baseline realistis", "upper-market", dan "syarat naik" secara konsisten.
- JANGAN pernah menampilkan hanya angka upper-market saja. Selalu sertakan baseline realistis terlebih dahulu.
- Jika rentang yang kamu tulis terasa seperti iklan lowongan bukan realita pasar, itu sinyal bahwa angkamu terlalu tinggi — turunkan.

PANDUAN RASIONALISASI GAJI:
Jangan hardcode angka berdasarkan nama kota. Gunakan framework dua sumbu berikut: (1) level kandidat berdasarkan bukti CV, dan (2) tier pasar lokasi berdasarkan daya beli dan standar industri tech setempat. Kalikan keduanya untuk mendapat estimasi yang tidak bias terhadap kota tertentu.

LANGKAH 1 — TENTUKAN LEVEL KANDIDAT DARI CV:
Baca bukti nyata di CV, bukan sekadar tahun pengalaman atau jumlah sertifikasi.

  Level 1 — Junior/Early (baseline rendah):
  Ciri: 0-3 tahun pengalaman, atau pengalaman lebih tapi minim bukti produksi, banyak sertifikasi tanpa deployment nyata, belum ada metrik dampak.
  Kalikan faktor: 0.5–0.7 dari median senior lokasi tersebut.

  Level 2 — Mid (baseline menengah):
  Ciri: 3-6 tahun, ada 1-2 proyek produksi yang bisa dijelaskan, mulai ada ownership fitur, belum ada kepemimpinan tim.
  Kalikan faktor: 0.7–0.85 dari median senior.

  Level 3 — Senior (baseline utama):
  Ciri: 5+ tahun dengan bukti produksi konsisten, pernah ownership end-to-end, ada dampak terukur atau bisa dijelaskan secara teknis mendalam.
  Ini adalah angka baseline yang ditulis pertama. Jangan naikkan tanpa bukti tambahan.

  Level 4 — Lead/Principal (syarat ketat):
  Ciri: ada bukti eksplisit people management atau mentoring tim, ownership roadmap atau arsitektur sistem, dampak bisnis lintas tim.
  Kalikan faktor: 1.2–1.5 dari median senior. HANYA jika semua syarat terpenuhi dari CV.

  Level 5 — Manager/Architect (jarang, syarat sangat ketat):
  Ciri: P&L ownership, atau arsitektur skala enterprise yang terbukti, atau manajemen tim 5+ orang dengan deliverable bisnis jelas.
  Kalikan faktor: 1.5–2.0 dari median senior. Jangan diasumsikan dari sertifikasi saja.

LANGKAH 2 — TENTUKAN TIER PASAR LOKASI:
Klasifikasikan lokasi target ke dalam salah satu tier berikut. Jika lokasi tidak dikenal, gunakan Tier C sebagai default konservatif.

  Tier A — Pasar global premium (biaya hidup sangat tinggi, standar tech ketat):
  Contoh tipikal: San Francisco/Bay Area, New York, London, Zurich, Amsterdam, Sydney.
  Karakteristik: kandidat bersaing langsung dengan talent lokal, visa/relokasi menjadi faktor besar, remote dari Indonesia jauh lebih rendah dari onsite.
  Median senior tech onsite: setara USD 8.000–12.000/bulan (gross, sebelum pajak tinggi).
  Remote contractor dari Indonesia ke klien Tier A: potong 40–60% dari angka onsite karena tidak menanggung biaya hidup setempat.

  Tier B — Pasar regional maju (biaya hidup tinggi-menengah, tech ecosystem berkembang):
  Contoh tipikal: Singapura, Hong Kong, Tokyo, Seoul, Dubai, Abu Dhabi, Stockholm, Copenhagen.
  Karakteristik: demand tech tinggi, ada campuran expat dan lokal, benefit seperti housing allowance perlu diperhitungkan terpisah.
  Median senior tech: setara USD 4.000–7.000/bulan gross.
  Jangan jadikan angka big tech atau MNC sebagai baseline umum; itu outlier.

  Tier C — Pasar regional menengah (biaya hidup menengah, tech ecosystem tumbuh):
  Contoh tipikal: Kuala Lumpur, Bangkok, Manila, Jakarta (product company/digital banking), Doha, Riyadh, Kuwait City.
  Karakteristik: standar gaji lebih bervariasi antar sektor, perusahaan non-tech membayar jauh lebih rendah dari product company.
  Median senior tech: setara USD 2.000–4.000/bulan gross.
  Untuk Timur Tengah di tier ini: hitung total compensation termasuk benefit, bukan hanya gaji pokok.

  Tier D — Pasar lokal (biaya hidup menengah-rendah, tech ecosystem berkembang):
  Contoh tipikal: Jakarta (software house/perusahaan non-tech), Bandung, Surabaya, kota-kota tier-2 Indonesia, kota-kota tier-2 Asia Tenggara.
  Median senior tech: setara USD 800–2.000/bulan gross.
  Jangan naikkan ke Tier C hanya karena nama kota terdengar besar; lihat tipe perusahaan target.

LANGKAH 3 — FAKTOR KOREKSI (turunkan estimasi jika berlaku):
Terapkan setiap faktor yang relevan. Tiap faktor menurunkan estimasi 10–20%.
  - CV tidak menunjukkan bahasa Inggris aktif atau portofolio komunikasi global → -15% untuk Tier A dan B.
  - Tidak ada metrik dampak bisnis yang bisa disebutkan (jumlah user, revenue impact, SLA, ukuran tim) → -10%.
  - Pengalaman mayoritas di sektor non-tech atau internal IT, bukan product/engineering company → -15%.
  - Banyak sertifikasi tapi minim bukti deployment ke production → -20%.
  - Target lokasi adalah remote dari Indonesia ke klien Tier A/B → -40 hingga -50% dari angka onsite tier tersebut.
  - Tidak ada rekam jejak interview atau kerja di pasar target → -10 hingga -15% sebagai risk discount.

LANGKAH 4 — TULIS ESTIMASI DENGAN FORMAT WAJIB INI:
Setiap entri market value HARUS memuat tiga bagian:
  1. Baseline realistis: angka untuk level kandidat saat ini berdasarkan bukti CV, bukan aspirasi.
  2. Upper-market: angka yang bisa dicapai jika syarat tertentu dipenuhi — sebutkan syaratnya eksplisit.
  3. Catatan konteks: sebutkan tipe perusahaan, mode kerja (onsite/remote/relokasi), atau faktor lokal yang relevan.

JANGAN:
- Menulis hanya satu angka tanpa syarat.
- Menjadikan angka upper-market sebagai angka pertama yang disebutkan.
- Menaikkan estimasi hanya karena lokasi terdengar makmur (Dubai, Qatar, dll) tanpa melihat level kandidat.
- Menulis angka onsite untuk kandidat yang statusnya remote dari Indonesia.
- Membuat estimasi untuk lokasi yang tidak ada di dreamLocations user.

FORMAT CONTOH (gunakan mata uang dan satuan yang lazim untuk lokasi tersebut):
"[Nama Lokasi]": "Baseline realistis [angka–angka mata uang/bulan] untuk [level role]. Upper-market [angka lebih tinggi] dapat dicapai jika [syarat eksplisit dari CV yang perlu ditambah]. [Kalimat konteks: tipe perusahaan, mode kerja, atau faktor lokal]."

FIELD BARU YANG WAJIB DIISI:
- evidenceMapping: peta klaim terhadap bukti CV.
  - klaim: klaim karier yang muncul dalam laporan.
  - buktiCV: bukti ringkas dari CV, bukan kutipan panjang.
  - tingkatKeyakinan: "Tinggi", "Sedang", atau "Rendah".
  - catatanKalibrasi: jelaskan jika klaim masih perlu dibatasi.
  - Buat 5-7 item.
- roleFitMatrix: matriks kecocokan role.
  - role: nama role.
  - kecocokan: integer 0-100.
  - status: "Realistis Sekarang", "Dekat / Perlu Pembuktian", atau "Aspiratif".
  - alasan: 1 kalimat berbasis CV.
  - syaratNaikLevel: 1 kalimat tindakan/skill/bukti yang perlu ditambah.
  - Buat 5-7 role.
- actionableGap: gap yang paling penting untuk ditutup.
  - area: nama area gap.
  - dampak: dampak terhadap karier/market value.
  - buktiYangPerluDitambah: bukti konkret yang harus muncul di CV/portfolio.
  - langkah6Bulan: aksi konkret 6 bulan.
  - Buat 4-6 item. Jangan kurang dari 4.
- cvRewriteAdvice: saran praktis untuk memperbaiki CV.
  - prioritas: "Tinggi", "Sedang", atau "Rendah".
  - bagianCV: bagian CV yang perlu diperbaiki.
  - masalah: masalah yang terlihat.
  - saranPerbaikan: perbaikan konkret.
  - contohKalimat: contoh kalimat siap pakai, maksimal 1 kalimat.
  - PENTING untuk contohKalimat: jangan mengarang angka atau metrik spesifik yang tidak ada di CV (misal: "30%", "50 pengguna", "2x lebih cepat"). Jika ingin menunjukkan format metrik, gunakan placeholder eksplisit seperti [X%], [N pengguna], atau [hasil pengukuran]. Contoh benar: "Memimpin migrasi sistem pembayaran yang meningkatkan efisiensi proses sebesar [X%] berdasarkan hasil pengukuran internal." Contoh salah: "Meningkatkan efisiensi administrasi sebesar 30%."
  - Buat 4-6 item. Jangan kurang dari 4.
- Semua field baru harus tetap muncul meskipun isinya singkat.
- Jika bukti CV tidak cukup, jangan kosongkan field; tulis gap atau catatan kalibrasi.
- Hindari mengulang isi yang sama antar section. evidenceMapping fokus pada bukti, roleFitMatrix fokus pada kecocokan role, actionableGap fokus pada gap yang bisa dikerjakan, cvRewriteAdvice fokus pada perbaikan CV.

OUTPUT JSON:
{
  "profilRingkas": {
    "nama": "",
    "usia": 0,
    "bidangKarier": ""
  },
  "careerArchetype": {
    "nama": "",
    "deskripsi": "",
    "arahMasaDepan": []
  },
  "careerTrajectory": {
    "arahKarier": "",
    "transisiTerbesar": "",
    "fase": [{ "periode": "", "judul": "", "deskripsi": "" }]
  },
  "hiddenAdvantage": {
    "kombinasiLangka": [],
    "kenapaLangka": "",
    "dampakKarier": ""
  },
  "marketPositioning": {
    "posisiUtama": "",
    "nilaiPasar": "",
    "roleCocok": [],
    "roleHindari": []
  },
  "futureProofScore": {
    "aiResistance": { "skor": 0, "keterangan": "" },
    "leadershipPotential": { "skor": 0, "keterangan": "" },
    "globalMobility": { "skor": 0, "keterangan": "" },
    "technicalDepth": { "skor": 0, "keterangan": "" }
  },
  "careerRisk": {
    "salaryCeilingRisk": "",
    "stagnationRisk": "",
    "penyebab": [],
    "solusiStrategis": []
  },
  "marketValue": {
    "catatan": ""
  },
  "ringkasanAwam": {
    "situasiSekarang": "",
    "kelebihanUtama": "",
    "yangPerluDitambah": "",
    "langkahPertama": "",
    "pesanPenyemangat": ""
  },
  "kataKunciJobSeeker": {
    "posisi": [],
    "keahlian": []
  },
  "pemetaanKompetensi": {
    "kognitif": { "skor": 0, "kekuatan": [], "celah": [] },
    "interpersonal": { "skor": 0, "kekuatan": [], "celah": [] },
    "selfLeadership": { "skor": 0, "kekuatan": [], "celah": [] },
    "digital": { "skor": 0, "kekuatan": [], "celah": [] }
  },
  "analisisRisiko": {
    "level": "",
    "persentaseRisiko": 0,
    "konteksBenchmark": "",
    "faktorRisiko": [],
    "penjelasan": ""
  },
  "evidenceMapping": [
    {
      "klaim": "",
      "buktiCV": "",
      "tingkatKeyakinan": "",
      "catatanKalibrasi": ""
    }
  ],
  "roleFitMatrix": [
    {
      "role": "",
      "kecocokan": 0,
      "status": "",
      "alasan": "",
      "syaratNaikLevel": ""
    }
  ],
  "actionableGap": [
    {
      "area": "",
      "dampak": "",
      "buktiYangPerluDitambah": "",
      "langkah6Bulan": ""
    }
  ],
  "cvRewriteAdvice": [
    {
      "prioritas": "",
      "bagianCV": "",
      "masalah": "",
      "saranPerbaikan": "",
      "contohKalimat": ""
    }
  ],
  "rekomendasiAkhir": ""
}`;
}

async function analyzeWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di file .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      temperature: 0.35,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: 16000,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  return cleanJsonResponse(result.response.text());
}

app.post('/api/analyze', upload.single('cv'), async (req, res) => {
  res.setHeader('X-Data-Policy', 'no-storage');

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File PDF wajib diunggah' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const cvText = pdfData.text;

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({
        error: 'Teks dalam PDF tidak dapat dibaca atau terlalu singkat',
      });
    }

    if (!req.body.userData) {
      return res.status(400).json({ error: 'userData wajib diisi' });
    }

    const userData = normalizeUserData(
      typeof req.body.userData === 'string'
        ? parseJsonField(req.body.userData, 'userData')
        : req.body.userData
    );

    const prompt = buildPrompt(cvText, userData);
    const result = await analyzeWithGemini(prompt);

    // Normalisasi marketValue — Gemini kadang menghasilkan nested object
    // per lokasi alih-alih string, yang menyebabkan crash di React renderer.
    if (result.marketValue) {
      result.marketValue = normalizeMarketValue(result.marketValue);
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    return res.json({
      success: true,
      data: result,
      modelName,
    });
  } catch (err) {
    console.error('Error:', err);

    const raw = err.message || 'Terjadi kesalahan server';
    const clean = raw
      .split('[{')[0]
      .split('\n')[0]
      .trim()
      .replace(/\s+/g, ' ');

    const friendly = clean.length > 200 ? `${clean.slice(0, 200)}...` : clean;

    return res.status(500).json({ error: friendly });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured:
      !!process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE',
  });
});

app.listen(PORT, () => {
  console.log(`Retrokarir Backend running on http://localhost:${PORT}`);
});