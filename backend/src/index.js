import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

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
  const { fullName, birthDate, gender, intention, workTypes, dreamLocations, outputLang } = userData;
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  const workTypesStr = workTypes.join(', ');
  const locationsStr = dreamLocations.join(', ');
  const level = age <= 26 ? 'Fresh Graduate / Early Career' : age <= 32 ? 'Mid-level Professional' : 'Senior Professional';

  const langInstruction = outputLang === 'en'
    ? `OUTPUT LANGUAGE: Write the entire JSON output in English. All field values (strings, arrays, descriptions) must be in English. Field keys remain unchanged.`
    : `OUTPUT LANGUAGE: Tulis seluruh output JSON dalam Bahasa Indonesia formal. Semua nilai field (string, array, deskripsi) harus dalam Bahasa Indonesia.`;

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
   - Untuk setiap pilar: cukup 2-3 kekuatan terpenting dan 1-2 celah paling kritis saja. WAJIB maksimal 12 kata per item — langsung ke inti, tanpa elaborasi panjang.

3. RENCANA PENGEMBANGAN & AKSI SMART — gabungan saran pengembangan dan rencana aksi dalam satu kerangka SMART (Specific, Measurable, Achievable, Relevant, Time-bound):
   Buat TEPAT 4 item rencana yang paling berdampak dan tidak tumpang tindih, mencakup campuran dari: pelatihan/kursus, sertifikasi, dan langkah aksi strategis. Setiap item WAJIB memiliki:
   - judul: nama singkat rencana/aksi (contoh: "SwiftUI Bootcamp — Udemy")
   - kategori: salah satu dari "Pelatihan", "Kompetisi", "Sertifikasi", "Aksi Jangka Pendek", "Aksi Jangka Menengah", "Aksi Jangka Panjang"
   - spesifik: apa yang tepat akan dilakukan, dikaitkan langsung dengan pengalaman nyata di CV
   - terukur: indikator keberhasilan yang bisa diukur (angka, sertifikat, jumlah PR, rating, dll)
   - dapatDicapai: mengapa ini realistis untuk profil ini (level, waktu, sumber daya yang dimiliki)
   - relevan: mengapa ini penting untuk tujuan karier pengguna secara spesifik
   - batasWaktu: target waktu konkret (contoh: "90 hari", "6 bulan", "12 bulan")
   - Pilih 4 yang paling berbeda satu sama lain dan paling berdampak. Jangan duplikasi tema.
   - Gunakan bahasa Indonesia yang jelas. Sertakan angka konkret di setiap field bila relevan.

4. ANALISIS RISIKO OTOMASI — berdasarkan sifat pekerjaan dan sektor target:
   - Berikan persentase risiko 0-100 dan level: "Rendah", "Sedang", atau "Tinggi".
   - persentaseRisiko WAJIB disertai konteks perbandingan: bandingkan dengan rata-rata profesi sejenis atau rata-rata nasional (misal: "lebih rendah dari rata-rata nasional 45%", "lebih tinggi dari rata-rata sektor manufaktur 60%").
   - Sertakan 2-3 faktor risiko spesifik sesuai tren otomasi di sektor terkait.
   - Penjelasan 2-3 kalimat: mengapa posisi ini berisiko atau justru diuntungkan, dan apa yang perlu dilakukan untuk tetap relevan.

5. KATA KUNCI JOB SEEKER — khusus untuk dipakai di platform seperti LinkedIn, Jobstreet, Glints, dll:
   - posisi: 6-10 judul posisi/jabatan yang relevan dengan profil (misal: "Frontend Developer", "React Native Engineer", "Mobile App Developer"). Tanpa menyebut kota/negara.
   - keahlian: 8-12 skill teknis dan non-teknis yang relevan untuk dicantumkan di profil (misal: "React.js", "TypeScript", "Agile", "REST API"). Tanpa lokasi.
   - Semua item WAJIB dalam Bahasa Indonesia atau istilah teknis internasional yang umum dipakai di job posting. JANGAN menyebut nama kota, provinsi, atau negara manapun.

6. RINGKASAN AWAM — versi bahasa sederhana untuk pengguna yang belum familiar dengan istilah teknis karier:
   - Tulis ulang temuan utama laporan dalam bahasa sehari-hari yang bisa dipahami siapa saja, termasuk orang tua, saudara, atau teman non-IT yang membaca laporan ini.
   - Hindari akronim teknis tanpa penjelasan (KBJI, SDLC, CEFR, ISO 8583, dll). Kalau terpaksa disebut, beri penjelasan singkat dalam tanda kurung.
   - Gunakan analogi konkret dan kalimat pendek. Bukan "skill gap", tapi "kemampuan yang perlu ditambah". Bukan "otomasi", tapi "pekerjaan yang bisa digantikan mesin/AI".
   - Nada: hangat, memotivasi, seperti saran dari kakak atau mentor yang peduli — bukan konsultan formal.
   - Struktur WAJIB:
     * situasiSekarang: 2-3 kalimat menggambarkan posisi pengguna saat ini dalam bahasa sederhana.
     * kelebihanUtama: 2-3 kalimat tentang apa yang sudah dimiliki pengguna yang bernilai di pasar kerja, tanpa jargon.
     * yangPerluDitambah: 2-3 kalimat tentang celah paling penting, ditulis sebagai peluang bukan kekurangan.
     * langkahPertama: 1-2 kalimat saran paling konkret dan mudah dilakukan dalam waktu dekat.
     * pesanPenyemangat: 1 kalimat motivasi yang personal dan spesifik untuk profil pengguna ini.

GAYA PENULISAN OUTPUT — wajib diterapkan di seluruh bagian:
- rencanaSMART: setiap item WAJIB mengaitkan spesifik pengalaman di CV — bukan saran generik.
- Sertakan angka konkret jika relevan: estimasi range gaji, persentase peningkatan, jumlah target.
- Hubungkan pengalaman spesifik dari CV ke peluang masa depan.
- rekomendasiAkhir WAJIB menyebut nama pengguna, menyebut 1-2 keunggulan unik yang
  langka dari kombinasi skill mereka, dan memberikan 1 target konkret yang realistis
  dalam 6-12 bulan. Maksimal 5 kalimat, padat dan langsung ke inti.

OUTPUT FORMAT:
- ${outputLang === 'en' ? 'English, formal, concise, persuasive, and direct.' : 'Bahasa Indonesia formal, ringkas, persuasif, dan langsung ke inti.'}
- HANYA JSON, tanpa markdown, tanpa teks di luar JSON.
- ${langInstruction}
- HANYA JSON, tanpa markdown, tanpa teks di luar JSON.
- Skor kompetensi: integer 0-100, BUKAN desimal, BUKAN di bawah 30 tanpa alasan kuat.
- rencanaSMART: WAJIB array of objects tepat 4 item, bukan array of strings.
- Output siap dikonversi menjadi laporan PDF profesional.
{
  "profilRingkas": {
    "nama": "",
    "usia": 0,
    "kekuatanUtama": [],
    "bidangKarier": "WAJIB singkat maksimal 6 kata, contoh: 'Mobile Application Development & IT Leadership'. JANGAN sertakan kode KBLI, nomor sektor, atau referensi teknis apapun."
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
  "rencanaSMART": [
    {
      "judul": "",
      "kategori": "",
      "spesifik": "",
      "terukur": "",
      "dapatDicapai": "",
      "relevan": "",
      "batasWaktu": ""
    }
  ],
  "pemetaanKompetensi": {
    "kognitif":       { "skor": 0, "kekuatan": [], "celah": [] },
    "interpersonal":  { "skor": 0, "kekuatan": [], "celah": [] },
    "selfLeadership": { "skor": 0, "kekuatan": [], "celah": [] },
    "digital":        { "skor": 0, "kekuatan": [], "celah": [] }
  },
  "analisisRisiko": {
    "level": "",
    "persentaseRisiko": 0,
    "konteksBenchmark": "",
    "faktorRisiko": [],
    "penjelasan": ""
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
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: geminiModel });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function analyzeWithOpus(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    throw new Error('ANTHROPIC_API_KEY belum dikonfigurasi di file .env');
  }
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
    const result = aiMode === 'sonnet' ? await analyzeWithOpus(prompt) : await analyzeWithGemini(prompt);
    const modelName = aiMode === 'sonnet'
      ? (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6')
      : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    res.json({ success: true, data: result, modelName });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan server' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE',
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'YOUR_ANTHROPIC_API_KEY_HERE'
  });
});

app.listen(PORT, () => {
  console.log(`Retrokarir Backend running on http://localhost:${PORT}`);
});