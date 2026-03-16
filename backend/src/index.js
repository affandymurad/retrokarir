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
  }
});

function buildPrompt(cvText, userData) {
  const { fullName, birthDate, gender, intention, workTypes, dreamLocations } = userData;
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  const workTypesStr = workTypes.join(', ');
  const locationsStr = dreamLocations.join(', ');
  const level = age <= 26 ? 'Fresh Graduate / Early Career' : age <= 32 ? 'Mid-level Professional' : 'Senior Professional';

  return `SYSTEM ROLE:
Anda adalah Retrokarir AI Advisor, pakar HR dan analisis tenaga kerja berbasis data Outlook Ketenagakerjaan 2026, Sakernas 2025, dan standar kompetensi nasional KBJI 2014. Tugas Anda adalah melakukan Skill Gap Analysis mendalam dengan membandingkan profil pengguna terhadap kebutuhan 17 sektor lapangan usaha Indonesia (KBLI 2020).

REFERENSI 17 SEKTOR LAPANGAN USAHA INDONESIA (Sakernas 2025):
1.  Pertanian, Kehutanan & Perikanan (28,15%) — Informal — Fokus: pertanian presisi, food estate
2.  Perdagangan Besar & Eceran, Reparasi (18,73%) — Campuran — Fokus: e-commerce, transisi EV
3.  Industri Pengolahan/Manufaktur (13,86%) — Formal — Fokus: hilirisasi, risiko otomasi tinggi
4.  Akomodasi & Makan Minum (7,98%) — Informal — Fokus: pariwisata berkelanjutan
5.  Konstruksi & Infrastruktur (6,51%) — Campuran/Proyek — Fokus: infrastruktur strategis
6.  Jasa Pendidikan (5,06%) — Formal — Fokus: digitalisasi pembelajaran, EdTech
7.  Jasa Lainnya (4,45%) — Informal — Fokus: ekonomi kreatif, jasa perorangan
8.  Transportasi & Pergudangan (4,28%) — Campuran/Gig — Fokus: logistik digital, rantai pasok
9.  Administrasi Pemerintahan & Jaminan Sosial (3,50%) — Formal — Fokus: layanan publik digital
10. Jasa Profesional, Ilmiah & Teknis (1,76%) — Formal — Fokus: knowledge economy, analitik
11. Jasa Kesehatan & Kegiatan Sosial (1,68%) — Formal — Fokus: HealthTech, penuaan penduduk
12. Pertambangan & Penggalian (1,18%) — Formal — Fokus: hilirisasi nikel, tembaga, bauksit
13. Jasa Keuangan & Asuransi (1,12%) — Formal — Fokus: Fintech, manajemen risiko digital
14. Informasi & Komunikasi (0,73%) — Formal/Gig — Fokus: transformasi digital, skill gap >80%
15. Real Estat (0,41%) — Formal — Fokus: kawasan industri baru, hunian modern
16. Pengadaan Air & Pengelolaan Sampah (0,35%) — Transformasi Formal — Fokus: green jobs, daur ulang
17. Pengadaan Listrik, Gas & Energi (0,25%) — Formal — Fokus: transisi energi hijau, EBT

KONTEKS PASAR KERJA 2026:
- 60% pekerja Indonesia mengalami skill mismatch; hanya 13% bekerja sesuai kualifikasi
- 44% keterampilan pekerja akan berubah pada 2027 akibat otomasi dan digitalisasi
- Industri membutuhkan >80% tenaga digital, baru 50% yang tersedia
- 47 juta pekerja membutuhkan reskilling hingga 2030
- Sektor strategis tumbuh: Informasi & Komunikasi, Green Jobs, Hilirisasi, HealthTech

INPUT CONTEXT:
Berikut adalah data yang diekstraksi dari CV pengguna:
${cvText}

Data Pengguna:
- Nama: ${fullName}
- Usia: ${age} tahun (${level})
- Jenis Kelamin: ${gender}
- Tujuan & Preferensi: ${intention}
- Preferensi Tipe Kerja: ${workTypesStr}
- Lokasi Target: ${locationsStr}

TASK INSTRUCTIONS — ikuti dengan ketat:

1. IDENTIFIKASI LATAR BELAKANG TEKNIS dari CV terlebih dahulu.
   - Tentukan tech stack utama (misal: React, Kotlin, Swift, Python, dsb.)
   - Tentukan domain keahlian (Frontend, Mobile, Backend, Data, dsb.)
   - Petakan ke sektor yang paling relevan dari 17 sektor di atas.
   - Semua rekomendasi HARUS relevan dengan domain dan sektor tersebut.
   - JANGAN merekomendasikan cloud/DevOps jika background frontend/mobile kecuali relevan.

2. PEMETAAN KOMPETENSI — 4 pilar, skor WAJIB realistis 0-100:
   - Kognitif: berpikir kritis, analitis, pemecahan masalah.
   - Interpersonal: komunikasi, kolaborasi, negosiasi.
   - Self-leadership: manajemen waktu, tekanan, inisiatif, pengembangan diri.
   - Digital: keterampilan teknis sesuai domain dan kebutuhan sektor terkait.
   - Panduan skor:
     * Fresh graduate (0-2 tahun): 40-65
     * Mid-level (3-5 tahun): 55-75
     * Senior (lebih dari 5 tahun): 65-85
   - JANGAN beri skor di bawah 30 tanpa alasan kuat dari CV.
   - Celah harus spesifik dan realistis, BUKAN aspirasi generik.

3. ANALISIS SKILL GAP — bandingkan profil terhadap persyaratan jabatan target:
   - Gunakan standar KBJI 4-digit yang relevan dengan domain dan sektor CV.
   - Field kesesuaian SINGKAT maksimal 3 kata: "Sangat Sesuai", "Sesuai", "Cukup Sesuai", atau "Kurang Sesuai".

4. SARAN PENGEMBANGAN — spesifik berdasarkan tech stack, domain, dan sektor:
   - Pelatihan/kursus: 2-3 rekomendasi dengan nama platform (Dicoding, Coursera, Udemy, Kartu Prakerja, dsb.)
   - Kompetisi/hackathon: 2-3 yang relevan untuk profil (misal: hackathon hilirisasi, kompetisi fintech, dsb.)
   - Sertifikasi: 2-3 yang relevan dengan domain (Meta Front-End, Associate Android Developer, dsb.)
   - Setiap item WAJIB berupa string tunggal yang menyertakan nama dan alasan singkat mengapa
     relevan untuk profil ini. Contoh: "React Native Advanced — Udemy (bridge gap antara ReactJS
     web dan mobile native untuk membuka posisi cross-platform lead)"

5. STRATEGI AKSI — WAJIB relevan dengan tech stack dan sektor dari CV:
   - Jangka Pendek 1-3 bulan: 2 langkah nyata untuk memperbaiki profil secara instan.
   - Jangka Menengah 6-12 bulan: reskilling/upskilling spesifik sesuai domain dan tren sektor.
   - Jangka Panjang lebih dari 1 tahun: transformasi karier, termasuk peluang di sektor strategis.
   - Jika fresh graduate: mulai dari portofolio, networking, kontribusi open source, Kartu Prakerja.
   - Pertimbangkan mobilitas ke sektor bernilai tambah tinggi jika relevan dengan profil.

6. ANALISIS RISIKO OTOMASI — berdasarkan sifat pekerjaan dan sektor target:
   - Berikan persentase risiko 0-100 dan level: "Rendah", "Sedang", atau "Tinggi".
   - Sertakan faktor risiko spesifik sesuai tren otomasi di sektor terkait.
   - Penjelasan singkat mengapa posisi ini berisiko atau tidak terhadap otomasi.

GAYA PENULISAN OUTPUT — wajib diterapkan di seluruh bagian:
- Setiap aksi dalam actionPlan WAJIB menyertakan konteks spesifik dari CV pengguna,
  bukan saran generik. Contoh SALAH: "Perkuat skill React". Contoh BENAR: "Manfaatkan
  pengalaman ReactJS di Korindo untuk membangun 1 project showcase open source di GitHub
  yang mensimulasikan dashboard internal — ini akan menarik perhatian recruiter remote."
- Sertakan angka konkret jika relevan: estimasi range gaji, persentase peningkatan,
  jumlah target (misal: 3-5 PR, 2 project showcase, dll).
- Hubungkan pengalaman spesifik dari CV ke peluang masa depan. Jika ada pengalaman
  luar negeri atau lintas industri, jadikan itu sebagai leverage eksplisit.
- rekomendasiAkhir WAJIB menyebut nama pengguna, menyebut 1-2 keunggulan unik yang
  langka dari kombinasi skill mereka, dan memberikan 1 target konkret yang realistis
  dalam 6-12 bulan.
- saranPengembangan harus menyertakan alasan singkat mengapa platform/kompetisi/
  sertifikasi tersebut dipilih sesuai profil, ditulis dalam satu string.

OUTPUT FORMAT:
- Bahasa Indonesia formal, ringkas, persuasif, dan langsung ke inti.
- HANYA JSON, tanpa markdown, tanpa teks di luar JSON.
- Skor kompetensi: integer 0-100, BUKAN desimal, BUKAN di bawah 30 tanpa alasan kuat.
- saranPengembangan.pelatihan, kompetisi, sertifikasi: WAJIB array of strings biasa.
- Output siap dikonversi menjadi laporan PDF profesional.
{
  "profilRingkas": {
    "nama": "",
    "usia": 0,
    "kekuatanUtama": [],
    "bidangKarier": ""
  },
  "pemetaanKompetensi": {
    "kognitif":       { "skor": 0, "kekuatan": [], "celah": [] },
    "interpersonal":  { "skor": 0, "kekuatan": [], "celah": [] },
    "selfLeadership": { "skor": 0, "kekuatan": [], "celah": [] },
    "digital":        { "skor": 0, "kekuatan": [], "celah": [] }
  },
  "saranPengembangan": {
    "pelatihan":   [],
    "kompetisi":   [],
    "sertifikasi": []
  },
  "standarKBJI": {
    "kodeJabatan": "",
    "namaJabatan": "",
    "kesesuaian":  "",
    "deskripsi":   ""
  },
  "analisisRisiko": {
    "level": "",
    "persentaseRisiko": 0,
    "faktorRisiko": [],
    "penjelasan": ""
  },
  "actionPlan": {
    "jangkaPendek":   { "periode": "1-3 bulan",  "aksi": [] },
    "jangkaMenengah": { "periode": "6-12 bulan", "aksi": [] },
    "jangkaPanjang":  { "periode": ">1 tahun",   "aksi": [] }
  },
  "rekomendasiAkhir": ""
}`;
}

async function analyzeWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di file .env');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
  const model = genAI.getGenerativeModel({ model: geminiModel });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function analyzeWithOllama(prompt) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3';
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false })
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
  const data = await response.json();
  const cleaned = data.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

app.post('/api/analyze', upload.single('cv'), async (req, res) => {
  res.setHeader('X-Data-Policy', 'no-storage');
  try {
    if (!req.file) return res.status(400).json({ error: 'File PDF wajib diunggah' });
    const pdfData = await pdfParse(req.file.buffer);
    const cvText = pdfData.text;
    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Teks dalam PDF tidak dapat dibaca atau terlalu singkat' });
    }
    const userData = JSON.parse(req.body.userData);
    const aiMode = req.body.aiMode || 'gemini';
    const prompt = buildPrompt(cvText, userData);
    const result = aiMode === 'ollama' ? await analyzeWithOllama(prompt) : await analyzeWithGemini(prompt);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan server' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE'
  });
});

app.listen(PORT, () => {
  console.log(`Retrokarir Backend running on http://localhost:${PORT}`);
});