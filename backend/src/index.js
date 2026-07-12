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

function repairJson(raw) {
  let s = raw;

  // 1. Remove control characters that break JSON parsers (except \t \n \r)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Replace curly/smart quotes with straight quotes
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // 3. Remove trailing commas before } or ]  (Gemini produces these frequently)
  s = s.replace(/,\s*([}\]])/g, '$1');

  // 4. If the JSON is truncated (Gemini hit token limit mid-output),
  //    close all open structures so JSON.parse has a chance.
  try {
    JSON.parse(s);
    return s; // already valid
  } catch {
    // Count unclosed braces/brackets and close them
    const opens = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') opens.push('}');
      else if (ch === '[') opens.push(']');
      else if (ch === '}' || ch === ']') opens.pop();
    }

    // If we ended mid-string, close the string first
    if (inString) s += '"';

    // Remove trailing comma before we close
    s = s.replace(/,\s*$/, '');

    // Close all open structures in reverse
    s += opens.reverse().join('');

    return s;
  }
}

// Cari objek JSON teratas dimulai dari brace pertama, dengan menghitung
// kedalaman { } sambil menghormati string/escape. Ini menghindari bug
// lastIndexOf('}') yang salah ambil brace dari teks tambahan yang kadang
// disisipkan Gemini setelah objek JSON valid selesai.
function extractJsonObject(text, firstBrace) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }

  // Tidak ketemu penutup — kemungkinan output terpotong (token limit).
  // Kembalikan sampai akhir teks agar repairJson bisa menutup strukturnya.
  return text.slice(firstBrace);
}

function cleanJsonResponse(text) {
  const cleaned = String(text || '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');

  if (firstBrace === -1) {
    throw new Error('Respons AI bukan JSON yang valid');
  }

  const candidate = extractJsonObject(cleaned, firstBrace);

  // First try: parse as-is
  try {
    return JSON.parse(candidate);
  } catch (firstErr) {
    // Second try: repair then parse
    try {
      const repaired = repairJson(candidate);
      const parsed = JSON.parse(repaired);
      console.warn('[cleanJsonResponse] Used repairJson. Original error:', firstErr.message);
      return parsed;
    } catch (secondErr) {
      // Log first 500 chars of the raw response to help diagnose future issues
      console.error('[cleanJsonResponse] Parse failed. Raw snippet:', candidate.slice(0, 500));
      throw new Error(`Respons AI bukan JSON yang valid: ${firstErr.message}`);
    }
  }
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


const MAX_PDF_PAGES = Number(process.env.MAX_PDF_PAGES || 3);
const MAX_CV_CHARS = Number(process.env.MAX_CV_CHARS || 14000);
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 18000);
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 6500);

function compactCvText(text = '') {
  const clean = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (clean.length <= MAX_CV_CHARS) return clean;

  const headSize = Math.floor(MAX_CV_CHARS * 0.72);
  const tailSize = Math.floor(MAX_CV_CHARS * 0.28);
  const head = clean.slice(0, headSize).trim();
  const tail = clean.slice(-tailSize).trim();

  return `${head}\n\n[...CV DIPERSINGKAT OTOMATIS UNTUK MENCEGAH TIMEOUT NETLIFY...]\n\n${tail}`;
}

function withTimeout(promise, ms = AI_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Analisis membutuhkan waktu terlalu lama. Coba gunakan PDF CV maksimal 3 halaman atau ulangi beberapa saat lagi.'));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ── SHARED buildPrompt ────────────────────────────────────────
function buildPrompt(cvText, userData) {
  const { fullName, birthDate, gender, workTypes, dreamLocations, outputLang = 'id' } = userData;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;

  const workTypesStr = Array.isArray(workTypes) ? workTypes.join(', ') : workTypes || '-';
  const locationsStr = Array.isArray(dreamLocations) ? dreamLocations.join(', ') : dreamLocations || '-';

  const level = age <= 26
    ? 'Fresh Graduate / Early Career'
    : age <= 32
      ? 'Mid-level Professional'
      : 'Senior Professional';

  const scoreGuide = age <= 26
    ? 'Fresh grad: 40–65. >65 hanya jika bukti kerja nyata sangat kuat.'
    : age <= 32
      ? 'Mid-level: 55–75. >75 hanya jika ada bukti leadership, dampak bisnis, atau pengalaman global.'
      : 'Senior: 65–85. Jangan >85. Skor 80–85 hanya untuk bukti sangat kuat.';

  const langInstruction = outputLang === 'en'
    ? 'Write ALL JSON values in English. Keep field keys unchanged.'
    : 'Tulis SEMUA nilai JSON dalam Bahasa Indonesia formal, natural, dan mudah dipahami. Field keys jangan diubah.';

  const compactCv = compactCvText(cvText);

  return `Anda adalah Retrokarir, AI Career Intelligence Advisor untuk job seeker umum.
Peran: mentor karier senior, recruiter, analis pasar talenta, dan reviewer CV.

DATA PENGGUNA
Nama: ${fullName}
Usia: ${age} tahun (${level})
Gender: ${gender}
Tipe kerja target: ${workTypesStr}
Lokasi target: ${locationsStr}

CV
${compactCv}

BAHASA
${langInstruction}

ATURAN UTAMA
- Output hanya JSON valid. Tanpa markdown, tanpa teks pembuka/penutup.
- Jangan mengarang fakta yang tidak ada di CV.
- Bedakan bukti kuat, indikasi/potensi, dan target pengembangan.
- Sertifikasi adalah sinyal kompetensi, bukan bukti produksi, kecuali CV menunjukkan implementasi nyata.
- Jika CV tidak menyebut metrik seperti jumlah user, revenue, SLA, ukuran tim, efisiensi, atau skala sistem, nyatakan sebagai gap.
- Hindari hiperbola dan klaim absolut.
- Dilarang memakai frasa: "talenta langka", "kelas dunia", "panggung dunia", "sangat aman dari otomasi", "tech-giant", "jaminan", "sudah pasti", "professional student".
- Untuk proyek layanan publik atau proyek berskala luas, jangan klaim jumlah pengguna atau skala jika tidak ada data eksplisit di CV.
- Jika bahasa Inggris relevan untuk target role: sarankan target bertahap (TOEFL ITP 550+ atau IELTS 6.5 dulu, IELTS 7.0 jika mengejar pasar global).
- Rekomendasi harus realistis untuk 6–12 bulan.

PRINSIP ANALISIS
- Baca pola karier, bukan hanya daftar skill.
- Nilai berdasarkan bukti CV.
- Acu kerangka Standar Kompetensi Kerja Nasional Indonesia (SKKNI) untuk bidang yang relevan. Jika SKKNI bidang tersebut belum tersedia atau tidak merata, gunakan praktik pasar umum sebagai acuan.
- Baca pengalaman informal, freelance, UMKM, kerja proyek, dan komunitas sebagai bukti kompetensi yang sah — terjemahkan ke bahasa kompetensi formal.
- Gunakan konteks pasar kerja 2026: AI literacy, analytical thinking, resilience, leadership, green skills, dan kebutuhan upskilling mandiri.
- Jika posisi rentan otomasi, beri jalur transisi konkret ke peran yang lebih augmented.
- Jangan Jakarta-sentris: sesuaikan dengan konteks industri lokal lokasi target. Singgung peluang green economy hanya jika relevan dengan profil.

SKOR
Semua skor integer 0–100.
Panduan skor: ${scoreGuide}
Skor dan estimasi gaji harus stabil antar-generasi. Gunakan kelipatan 5 terdekat.

KETENTUAN FIELD
- profilRingkas.bidangKarier: maks 6 kata.
- ringkasanAwam: setiap sub-field maks 2 kalimat. pesanPenyemangat wajib menyebut minimal 1 proyek/perusahaan/pencapaian spesifik dari CV.
- pemetaanKompetensi: 4 pilar. Tiap pilar berisi 2 kekuatan dan 1 celah. Maks 12 kata per item.
- analisisRisiko.level hanya "Rendah", "Sedang", atau "Tinggi". persentaseRisiko: 20–45 untuk profil senior multi-skill, 30–55 untuk fresh graduate/early career dengan tugas dominan rutin. faktorRisiko 2 item. Jika level Sedang/Tinggi, penjelasan wajib memuat jalur transisi peran.
- kataKunciJobSeeker.posisi: 6–8 jabatan.
- kataKunciJobSeeker.keahlian: 8–10 skill teknis/non-teknis.
- cvRewriteAdvice: tepat 4 item. prioritas hanya "Tinggi", "Sedang", atau "Rendah". contohKalimat maksimal 1 kalimat. Jangan karang metrik; gunakan [X%], [N pengguna], atau [N karyawan] jika perlu.
- rekomendasiAkhir: sebut nama, 1–2 keunggulan unik, 1 gap utama, dan 1 target 6–12 bulan. Maks 3 kalimat.
- quickWins: tepat 3 langkah minggu ini, berjenjang — langkah 1 ±15 menit, langkah 2 ±1 jam, langkah 3 ±3 jam; isi estimasiWaktu sesuai jenjang itu. aksi maks 12 kata dan bisa dilakukan tanpa biaya besar. Jika ada kebutuhan pelatihan, arahkan ke kanal resmi: Skillhub/Karirhub (SIAPkerja Kemnaker) atau Digital Talent Scholarship (Komdigi).
- marketValue.catatan wajib berisi metodologi singkat.

ATURAN MARKET VALUE
Buat estimasi hanya untuk lokasi target: ${locationsStr}.
marketValue harus flat object: key = nama lokasi, value = string. Satu-satunya key non-lokasi adalah "catatan".
Tier ringkas:
- Tier A: San Francisco, New York, London, Zurich, Amsterdam, Sydney, Toronto, Seattle, Boston.
- Tier B: Singapura, Hong Kong, Tokyo, Seoul, Dublin, Stockholm, Copenhagen, Tel Aviv.
- Tier C: Dubai, Riyadh, Doha, Kuala Lumpur, Bangkok, Manila, Warsaw, Lisbon, Barcelona.
- Tier D: Jakarta, Bandung, Surabaya, Yogyakarta, Bali, kota Indonesia lain.
Batas atas konservatif:
- Tier A onsite L3 maks USD 12K/bln; remote dari Indonesia L3 maks USD 5K/bln.
- Tier B L3 maks USD 7K/bln; L4/L5 kuat maks USD 10K/bln.
- Tier C L3 maks USD 4.5K/bln; L4/L5 maks USD 6K/bln.
- Tier D Jakarta product L3 maks Rp 30 juta/bln; L4/L5 kuat maks Rp 50 juta/bln.
- Tier D non-product L3 maks Rp 20 juta/bln.
Level L3/L4/L5 hanya untuk role teknologi/product. Untuk role non-teknologi (administrasi, pendidikan, layanan, operasional, dsb.), gunakan jenjang junior/mid/senior dengan acuan gaji pasar lokal yang wajar dan konservatif.
Faktor koreksi: kurangi 10–20% jika bahasa Inggris belum kuat, tidak ada metrik dampak bisnis, mayoritas pengalaman internal IT/non-product, banyak sertifikasi tetapi minim bukti deployment, atau belum ada rekam jejak pasar target.
Kurs: USD×16.000, SGD×11.500, MYR×3.500, AED×4.350, QAR×4.400, EUR×17.500, GBP×20.500, JPY×105, AUD×10.500.
Format value lokasi: "Baseline realistis [rentang mata uang/bln] untuk [level role]. Upper-market [angka] dapat dicapai jika [syarat eksplisit]. [Catatan onsite/remote/pajak/total compensation]."
Untuk luar Indonesia, tambahkan konversi Rupiah.

OUTPUT JSON
{
  "profilRingkas": { "nama": "", "usia": 0, "bidangKarier": "" },
  "marketValue": { "catatan": "" },
  "ringkasanAwam": { "situasiSekarang": "", "kelebihanUtama": "", "yangPerluDitambah": "", "langkahPertama": "", "pesanPenyemangat": "" },
  "kataKunciJobSeeker": { "posisi": [], "keahlian": [] },
  "pemetaanKompetensi": {
    "analyticalThinking": { "skor": 0, "kekuatan": [], "celah": [] },
    "resilienceAgility": { "skor": 0, "kekuatan": [], "celah": [] },
    "aiAndDigital": { "skor": 0, "kekuatan": [], "celah": [] },
    "interpersonalLeadership": { "skor": 0, "kekuatan": [], "celah": [] }
  },
  "analisisRisiko": { "level": "", "persentaseRisiko": 0, "konteksBenchmark": "", "faktorRisiko": [], "penjelasan": "" },
  "cvRewriteAdvice": [{ "prioritas": "", "bagianCV": "", "masalah": "", "saranPerbaikan": "", "contohKalimat": "" }],
  "rekomendasiAkhir": "",
  "quickWins": [{ "aksi": "", "alasan": "", "estimasiWaktu": "" }]
}`;
}

async function analyzeWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di environment variables Netlify');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      temperature: 0.15,
      topP: 0.75,
      topK: 24,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
    },
  });

  const result = await withTimeout(model.generateContent(prompt), AI_TIMEOUT_MS);
  return cleanJsonResponse(result.response.text());
}

// pdf-parse (via pdf.js) menulis warning font non-fatal seperti
// "TT: undefined function: 32" langsung ke console.warn untuk PDF hasil
// export tertentu (mis. dari desain/Canva). Redam khusus selama parsing
// agar tidak menutupi log error yang sebenarnya penting.
async function parsePdfQuietly(buffer) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (String(args[0] || '').includes('TT: undefined function')) return;
    originalWarn(...args);
  };
  try {
    return await pdfParse(buffer);
  } finally {
    console.warn = originalWarn;
  }
}

app.post('/api/analyze', upload.single('cv'), async (req, res) => {
  res.setHeader('X-Data-Policy', 'no-storage');

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File PDF wajib diunggah' });
    }

    const pdfData = await parsePdfQuietly(req.file.buffer);

    if (pdfData.numpages > MAX_PDF_PAGES) {
      return res.status(400).json({
        error: `PDF CV maksimal ${MAX_PDF_PAGES} halaman agar analisis tidak timeout di Netlify`,
        code: 'PDF_TOO_MANY_PAGES',
      });
    }

    const cvText = compactCvText(pdfData.text);

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

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

    return res.json({
      success: true,
      data: result,
      modelName,
    });
  } catch (err) {
    console.error('Error:', err);

    const raw = err.message || 'Terjadi kesalahan server';
    const isTimeout = raw.toLowerCase().includes('timeout') || raw.toLowerCase().includes('terlalu lama');

    if (isTimeout) {
      return res.status(504).json({
        error: 'Analisis terlalu lama diproses. Gunakan PDF CV maksimal 3 halaman, ringkas bagian sertifikasi, atau ulangi beberapa saat lagi.',
        code: 'AI_TIMEOUT',
      });
    }

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