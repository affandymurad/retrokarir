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
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30000);
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 7200);

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

// ── Jangkar ekonomi per lokasi (diperbarui manual berkala) ─────
// Nama variabel masih "SALARY_BENCHMARKS" untuk histori. Field marketValue di
// prompt SUDAH TIDAK menampilkan rentang gaji atau indeks/peringkat numerik apa
// pun ke pengguna (dihapus karena tidak ada legend penjelasnya di UI) — data di
// bawah ini sekarang dipakai HANYA sebagai referensi kualitatif untuk fakta
// Cost of Living dan Pajak (lihat ATURAN MARKET VALUE / PROFIL KOTA di
// buildPrompt), bukan untuk dicetak ulang sebagai angka.
// Kota baru cukup ditambahkan di tabel ini tanpa menyentuh teks prompt.
// PENTING: satu entri = satu mata uang lokal. Jangan gabung kota lintas
// negara dengan mata uang berbeda ke satu guidance USD — itu penyebab bug
// "semua kota dikutip USD" (mis. Stockholm/Singapura ikut USD padahal
// seharusnya SEK/SGD). Tiap guidance eksplisit menyebut kode mata uang yang
// WAJIB dipakai; model dilarang menerjemahkannya balik ke USD.
const SALARY_BENCHMARKS = [
  {
    aliases: ['jakarta', 'jabodetabek', 'jakarta selatan', 'jakarta pusat', 'tangerang', 'bekasi', 'depok', 'indonesia'],
    guidance: 'Gunakan IDR (Rp). Jangkar ekonomi 2026 (Sakernas/BPS): rata-rata upah Jakarta Rp 5,23 jt/bln (tertinggi nasional), rata-rata nasional Rp 3,29 jt/bln, UMP Jakarta 2026 Rp 5,73 jt (floor legal). Fresh grad product/tech Rp 6-10 juta/bln; L3 product Rp 18-30 juta/bln; L4/L5 kuat maks Rp 50 juta/bln; non-product/internal IT L3 maks Rp 20 juta/bln. Non-teknologi: junior Rp 5-8 juta, mid Rp 8-15 juta, senior Rp 15-25 juta/bln (manajerial boleh lebih tinggi jika ada bukti kuat di CV). Sektor Keuangan & Asuransi atau Informasi & Telekomunikasi: naikkan 30-60% di atas median role setara (anchor sektor tertinggi BPS: Rp 5,05-5,37 juta).',
  },
  {
    aliases: ['bandung', 'surabaya', 'yogyakarta', 'jogja', 'semarang', 'medan', 'makassar', 'denpasar', 'bali', 'malang', 'solo', 'surakarta', 'batam', 'balikpapan', 'palembang', 'pekanbaru'],
    guidance: 'Gunakan IDR (Rp). Kota Indonesia di luar Jakarta: pakai 60-85% dari angka Jakarta yang setara, dan tidak di bawah UMP/UMK kota tersebut (mis. UMK Kota Bekasi Rp 5,99 juta adalah salah satu UMK tertinggi nasional — pakai sebagai floor untuk kota penyangga Jabodetabek). Rata-rata upah terendah nasional ada di Jawa Tengah (Rp 2,46 jt) — untuk kota di provinsi berupah rendah, pakai sisi bawah rentang 60-85%.',
  },
  {
    aliases: ['san francisco', 'new york', 'seattle', 'boston', 'amerika serikat', 'amerika', 'usa'],
    guidance: 'Gunakan USD. Jangkar rata-rata upah nasional AS 2026 (semua profesi): $6.228/bln. Onsite L3 USD 7K-11K/bln; remote dari Indonesia L3 maks USD 5K/bln.',
  },
  {
    aliases: ['london', 'inggris', 'united kingdom', 'uk'],
    guidance: 'Gunakan GBP (bukan USD). Jangkar rata-rata upah Inggris 2026 (semua profesi): £3.253/bln. Onsite L3 GBP 5.5K-8.5K/bln; remote dari Indonesia L3 maks GBP 4K/bln.',
  },
  {
    aliases: ['zurich', 'swiss', 'switzerland'],
    guidance: 'Gunakan CHF (bukan USD). Jangkar rata-rata upah Swiss 2026 (semua profesi, tertinggi Eropa): CHF 7.800/bln — sebut catatan pajak progresif cukup tinggi. Onsite L3 CHF 6K-9.5K/bln.',
  },
  {
    aliases: ['amsterdam', 'dublin', 'berlin', 'munich', 'jerman', 'belanda', 'germany', 'netherlands'],
    guidance: 'Gunakan EUR (bukan USD). Tier 1 Eropa berupah tinggi. Jangkar rata-rata upah 2026 (semua profesi): Jerman €4.784/bln, Belanda €3.900/bln. Onsite L3 EUR 6K-9.5K/bln.',
  },
  {
    aliases: ['lisbon', 'portugal', 'barcelona', 'madrid', 'spanyol', 'spain', 'paris', 'prancis', 'france', 'italia', 'italy', 'roma', 'rome', 'milan'],
    guidance: 'Gunakan EUR (bukan USD). Tier 2 Eropa (Mediterania/Eropa Tengah): rentang median rata-rata upah €1.800-3.500/bln (semua profesi). Onsite L3 EUR 3K-5K/bln.',
  },
  {
    aliases: ['sydney', 'melbourne', 'australia'],
    guidance: 'Gunakan AUD (bukan USD). Jangkar rata-rata upah Australia 2026 (semua profesi): A$7.833/bln. Onsite L3 AUD 10K-16K/bln.',
  },
  {
    aliases: ['auckland', 'wellington', 'new zealand', 'selandia baru'],
    guidance: 'Gunakan NZD (bukan USD). Jangkar rata-rata upah Selandia Baru 2026 (semua profesi): NZ$5.667/bln. Belum ada kurasi kota spesifik: onsite L3 estimasi konservatif NZD 8K-12K/bln, sebut sebagai estimasi indikatif.',
  },
  {
    aliases: ['toronto', 'kanada', 'canada'],
    guidance: 'Gunakan CAD (bukan USD). Jangkar rata-rata upah Kanada 2026 (semua profesi): C$5.708/bln. Onsite L3 CAD 9.5K-15K/bln.',
  },
  {
    aliases: ['mexico', 'meksiko', 'mexico city'],
    guidance: 'Gunakan MXN. Belum ada kurs MXN terkurasi — sebut nominal lokal apa adanya dan padanan USD sebagai referensi, tanpa konversi Rupiah pasti. Jangkar rata-rata upah Meksiko 2026 (semua profesi): ~USD 941/bln. Onsite L3 estimasi konservatif setara USD 1.8K-3K/bln karena biaya hidup jauh di bawah AS.',
  },
  {
    aliases: ['singapura', 'singapore'],
    guidance: 'Gunakan SGD (bukan USD). Jangkar rata-rata upah Singapura 2026 (semua profesi): S$5.800/bln (~USD 4.473). Onsite L3 SGD 6K-13K/bln; L4/L5 kuat maks SGD 15K/bln. Remote dari Indonesia ke hub Asia (termasuk Singapura): maks USD 4K/bln.',
  },
  {
    aliases: ['hong kong', 'hongkong'],
    guidance: 'Gunakan HKD (bukan USD). Jangkar rata-rata upah Hong Kong 2026 (semua profesi): ~USD 2.613/bln. Onsite L3 HKD 31K-50K/bln; L4/L5 kuat maks HKD 70K/bln.',
  },
  {
    aliases: ['tokyo', 'osaka', 'jepang', 'japan'],
    guidance: 'Gunakan JPY (bukan USD). Nominal besar karena nilai per-unit JPY kecil: L3 JPY 610.000-990.000/bln; L4/L5 kuat maks JPY 1.400.000/bln.',
  },
  {
    aliases: ['seoul', 'korea', 'korea selatan', 'south korea'],
    guidance: 'Gunakan KRW (bukan USD). Nominal besar karena nilai per-unit KRW kecil: L3 KRW 5.300.000-8.700.000/bln; L4/L5 kuat maks KRW 12.000.000/bln.',
  },
  {
    aliases: ['stockholm', 'sweden', 'swedia'],
    guidance: 'Gunakan SEK (bukan EUR — Swedia bukan anggota zona Euro — dan bukan USD). L3 SEK 43.000-69.000/bln; L4/L5 kuat maks SEK 95.000/bln.',
  },
  {
    aliases: ['dubai', 'abu dhabi', 'uae', 'uni emirat arab'],
    guidance: 'Gunakan AED (bukan USD). L3 AED 11K-18K/bln; L4/L5 maks AED 24K/bln. Sebut bahwa gaji umumnya bebas pajak penghasilan.',
  },
  {
    aliases: ['doha', 'qatar'],
    guidance: 'Gunakan QAR (bukan USD). L3 QAR 11K-18K/bln; L4/L5 maks QAR 24K/bln. Sebut bahwa gaji umumnya bebas pajak penghasilan.',
  },
  {
    aliases: ['riyadh', 'jeddah', 'arab saudi', 'saudi'],
    guidance: 'Gunakan SAR (bukan USD). L3 SAR 11K-18K/bln; L4/L5 maks SAR 24K/bln. Sebut bahwa gaji umumnya bebas pajak penghasilan.',
  },
  {
    aliases: ['kuwait'],
    guidance: 'Gunakan KWD (bukan USD). Nominal kecil karena nilai per-unit KWD tinggi: L3 KWD 900-1.500/bln; L4/L5 maks KWD 2.000/bln. Sebut bahwa gaji umumnya bebas pajak penghasilan.',
  },
  {
    aliases: ['kuala lumpur', 'malaysia', 'penang'],
    guidance: 'Gunakan MYR (bukan USD). Jangkar rata-rata upah Malaysia 2026 (semua profesi): RM4.000/bln (~USD 977). Onsite L3 MYR 6.000-10.000/bln; L4/L5 kuat maks MYR 15.000/bln.',
  },
  {
    aliases: ['bangkok', 'thailand'],
    guidance: 'Gunakan THB (bukan USD). Jangkar rata-rata upah Thailand 2026 (semua profesi): ~USD 470/bln. Onsite L3 THB 60.000-100.000/bln; L4/L5 maks THB 150.000/bln.',
  },
  {
    aliases: ['manila', 'filipina', 'philippines'],
    guidance: 'Gunakan PHP (bukan USD). L3 PHP 80.000-140.000/bln; L4/L5 maks PHP 200.000/bln.',
  },
  {
    aliases: ['ho chi minh', 'hanoi', 'vietnam'],
    guidance: 'Gunakan VND (bukan USD). Jangkar rata-rata upah Vietnam 2026 (semua profesi): ~USD 315/bln. Nominal besar karena nilai per-unit VND kecil: L3 VND 25.000.000-45.000.000/bln; L4/L5 maks VND 65.000.000/bln.',
  },
  {
    aliases: ['warsaw', 'polandia', 'poland', 'romania', 'rumania', 'bucharest', 'bukares'],
    guidance: 'Gunakan PLN untuk Polandia atau RON untuk Rumania (keduanya bukan anggota zona Euro — jangan pakai EUR atau USD). Eropa Timur: rentang median rata-rata upah setara USD 1.500-2.300/bln (semua profesi). Tech Polandia: L3 PLN 9.000-15.000/bln; L4/L5 maks PLN 22.000/bln. Tech Rumania: estimasi konservatif RON 8.000-13.000/bln, sebut sebagai estimasi indikatif.',
  },
  {
    aliases: ['india', 'bangalore', 'bengaluru', 'mumbai', 'delhi'],
    guidance: 'Gunakan INR (bukan USD). Belum ada kurasi kota spesifik — perkirakan konservatif memakai biaya hidup relatif terhadap hub tech Asia lain (mis. Kuala Lumpur/Bangkok), sebutkan eksplisit bahwa ini estimasi indikatif, bukan hasil kurasi.',
  },
  {
    aliases: ['china', 'shanghai', 'beijing', 'shenzhen', 'guangzhou'],
    guidance: 'Gunakan CNY (bukan USD). Belum ada kurasi kota spesifik — perkirakan konservatif memakai biaya hidup relatif terhadap Hong Kong/Singapura sebagai acuan atas, sebutkan eksplisit bahwa ini estimasi indikatif, bukan hasil kurasi.',
  },
  {
    aliases: ['brazil', 'brasil', 'sao paulo', 'argentina', 'buenos aires', 'chile', 'santiago'],
    guidance: 'Gunakan mata uang lokal (BRL, ARS, CLP — bukan USD, boleh sebut padanan USD sebagai referensi). Jangkar rata-rata upah 2026 (semua profesi): Chile ~USD 817/bln, Brazil ~USD 617/bln. Untuk Argentina, ARS sangat volatil/inflasi tinggi — jangan pakai kurs tetap, sebut nominal lokal apa adanya tanpa konversi Rupiah pasti. Role teknis/profesional biasanya 3-6x rata-rata nasional — pakai jangkar ini sebagai batas bawah realistis.',
  },
  {
    aliases: ['south africa', 'afrika selatan', 'johannesburg', 'cape town', 'morocco', 'maroko', 'nigeria', 'lagos', 'egypt', 'mesir', 'cairo'],
    guidance: 'Gunakan mata uang lokal (ZAR, MAD, NGN, EGP — bukan USD, boleh sebut padanan USD sebagai referensi). Jangkar rata-rata upah 2026 (semua profesi): Afrika Selatan R26.500/bln (~USD 1.613), Maroko ~USD 613/bln. Untuk Nigeria, NGN sangat volatil/inflasi tinggi — jangan pakai kurs tetap, sebut nominal lokal apa adanya tanpa konversi Rupiah pasti. Role teknis/profesional biasanya di atas jangkar ini — pakai sebagai batas bawah realistis.',
  },
];

const SALARY_FALLBACK =
  'tidak ada patokan kurasi untuk lokasi ini: gunakan mata uang resmi negara kota tersebut (JANGAN default ke USD kecuali kotanya benar-benar di Amerika Serikat), perkirakan nilainya secara konservatif dari biaya hidup relatif terhadap kota acuan yang paling mirip secara ekonomi; untuk kota Indonesia jangan di bawah UMP setempat.';

function salaryGuidanceFor(dreamLocations) {
  const locations = (Array.isArray(dreamLocations) ? dreamLocations : [dreamLocations])
    .map(loc => String(loc || '').trim())
    .filter(Boolean);

  if (locations.length === 0) {
    return `- Lokasi target tidak disebut: gunakan patokan Jakarta — ${SALARY_BENCHMARKS[0].guidance}`;
  }

  return locations
    .map(loc => {
      const norm = loc.toLowerCase();
      const entry = SALARY_BENCHMARKS.find(b =>
        // Alias pendek (<4 huruf, mis. "usa") hanya cocok jika sama persis,
        // untuk mencegah salah tangkap substring (mis. "kl" di "Klaten").
        b.aliases.some(a => norm === a || (a.length >= 4 && norm.includes(a)))
      );
      return `- ${loc}: ${entry ? entry.guidance : SALARY_FALLBACK}`;
    })
    .join('\n');
}

// ── SHARED buildPrompt ────────────────────────────────────────
function buildPrompt(cvText, userData) {
  const { fullName, birthDate, workTypes, dreamLocations, outputLang = 'id' } = userData;
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

  const salaryGuidance = salaryGuidanceFor(dreamLocations);
  const compactCv = compactCvText(cvText);

  return `Anda adalah Retrokarir, platform AI Career Intelligence dan Skill Gap Analysis untuk job seeker umum.
Peran: mentor karier senior, recruiter, analis pasar talenta, dan reviewer CV.

DATA PENGGUNA
Nama: ${fullName}
Usia: ${age} tahun (${level})
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
- Jika CV tidak menyebut metrik seperti jumlah user, revenue, SLA, ukuran tim, efisiensi, atau skala sistem, nyatakan sebagai gap. Aturan ini berlaku juga untuk contohKalimat di cvRewriteAdvice — dilarang menulis angka atau skala pasti (mis. "15%", "jutaan pengguna", "1000 karyawan") kecuali angka itu tertulis eksplisit di CV asli; jika tidak ada, wajib pakai placeholder berkurung siku seperti [X%], [N pengguna], [Rp X juta].
- Hindari hiperbola dan klaim absolut.
- Jika memakai istilah teknis, singkatan, atau jargon industri yang mungkin tidak familiar bagi pembaca awam (di luar bagian kataKunciJobSeeker), beri penjelasan singkat dalam tanda kurung saat pertama kali disebut. Contoh: "ISO 8583 (standar pesan transaksi kartu pembayaran)".
- Dilarang memakai frasa: "talenta langka", "kelas dunia", "panggung dunia", "sangat aman dari otomasi", "tech-giant", "jaminan", "sudah pasti", "professional student".
- Untuk proyek layanan publik atau proyek berskala luas, jangan klaim jumlah pengguna atau skala jika tidak ada data eksplisit di CV.
- Selalu tulis nama kota/negara dengan ejaan baku bahasa Inggris resmi (mis. "San Francisco" bukan "San Fransisco", "Kuala Lumpur" bukan "Kualalumpur"), termasuk saat mengutip lokasi target di marketValue.
- Jika bahasa Inggris relevan untuk target role: sarankan target bertahap (TOEFL ITP 550+ atau IELTS 6.5 dulu, IELTS 7.0 jika mengejar pasar global).
- Rekomendasi harus realistis untuk 6–12 bulan.

PRINSIP ANALISIS
- Baca pola karier, bukan hanya daftar skill.
- Nilai berdasarkan bukti CV.
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
- analisisRisiko.level hanya "Rendah", "Sedang", atau "Tinggi". Tentukan level dan persentaseRisiko dengan menimbang posisi kerja pengguna pada kerangka task-biased technological change (Autor, Levy & Murnane, 2003): tugas rutin (routine) berisiko lebih tinggi tergantikan otomasi dibanding tugas tidak rutin (non-routine), dan pekerjaan berbasis cognitive/knowledge labor (analisis, keputusan, kreativitas) lebih tahan otomasi dibanding manual/physical labor yang rutin. persentaseRisiko: 20–45 untuk profil senior multi-skill, 30–55 untuk fresh graduate/early career dengan tugas dominan rutin. faktorRisiko 2 item. penjelasan wajib konsisten dengan level yang dipilih (jangan menyebut risiko "rendah" jika level Sedang/Tinggi). Jika level Sedang/Tinggi, penjelasan wajib memuat jalur transisi peran. analisisRisiko.sumberKerangka wajib diisi persis: "Kerangka Task-Based Automation Risk (Autor, Levy & Murnane, 2003) — posisi rutin/tidak-rutin dan cognitive/manual labor."
- prakiraanPekerjaan.posisiPermintaanTinggi: 3–5 posisi yang permintaannya diproyeksikan naik dalam 2–3 tahun ke depan, relevan dengan bidang dan level pengguna (bukan daftar generik lintas industri). Tiap item wajib berisi "posisi" (nama jabatan) dan "alasan" (maks 1 kalimat, konkret — sebutkan tren/kebutuhan pasar spesifik, bukan alasan umum seperti "permintaan tinggi"). prakiraanPekerjaan.catatan wajib menyebutkan sifatnya indikatif (bukan jaminan) dan basis pertimbangan singkat (mis. tren industri, kerangka task-based automation risk).
- kataKunciJobSeeker.posisi: 6–8 jabatan.
- kataKunciJobSeeker.keahlian: 8–10 skill teknis/non-teknis.
- kataKunciJobSeeker.rekomendasiKursus: WAJIB selalu diisi 3–5 item, TIDAK kondisional (isi terlepas dari seberapa kuat profil pengguna). Tiap item wajib berisi "platform" (pilih salah satu: Skillhub, Karirhub, Prakerja, Dicoding, Coursera — sesuaikan jenis kursus: Skillhub/Karirhub untuk pelatihan vokasi dan sertifikasi kompetensi nasional, Prakerja untuk upskilling dasar/pemula, Dicoding untuk skill teknis pemrograman/IT, Coursera untuk skill lanjutan atau sertifikasi bertaraf internasional), "topik" (nama kursus/skill spesifik maks 6 kata, harus menjawab langsung salah satu celah di pemetaanKompetensi atau gap di cvRewriteAdvice — dilarang topik generik), dan "alasan" (maks 1 kalimat, kaitkan eksplisit ke celah/gap spesifik yang ditemukan di CV).
- cvRewriteAdvice: tepat 4 item. prioritas hanya "Tinggi", "Sedang", atau "Rendah". contohKalimat maksimal 1 kalimat. Dilarang keras menulis angka/skala konkret yang tidak ada di CV; wajib pakai placeholder [X%], [N pengguna], atau [N karyawan].
- rekomendasiAkhir: sebut nama, 1–2 keunggulan unik, 1 gap utama, dan 1 target 6–12 bulan. Maks 3 kalimat.
- quickWins: tepat 3 langkah minggu ini, berjenjang — langkah 1 ±15 menit, langkah 2 ±1 jam, langkah 3 ±3 jam; isi estimasiWaktu sesuai jenjang itu. aksi maks 12 kata dan bisa dilakukan tanpa biaya besar. Jika ada kebutuhan pelatihan, arahkan ke kanal resmi: Skillhub/Karirhub (SIAPkerja Kemnaker) atau Digital Talent Scholarship (Komdigi).
- marketValue.catatan wajib berisi metodologi singkat.

ATURAN MARKET VALUE (PROFIL KOTA)
Field ini BUKAN LAGI rentang gaji — isinya adalah profil kota/lokasi target, supaya pengguna paham konteks tempat kerja, bukan cuma angka nominal.
Buat profil hanya untuk lokasi target: ${locationsStr}.
marketValue harus flat object: key = nama lokasi, value = string (satu paragraf, bukan nested object). Satu-satunya key non-lokasi adalah "catatan".
Data ekonomi dasar per lokasi (dipakai sebagai referensi kasar untuk fakta Cost of Living dan Pajak di bawah — JANGAN diubah jadi angka indeks atau peringkat):
${salaryGuidance}
Setiap value lokasi WAJIB memuat 5 fakta berikut, satu kalimat per fakta, urut sesuai nomor:
1. Cost of living — sebutkan estimasi biaya hidup satu orang per bulan dalam RENTANG ANGKA YANG LEBAR memakai mata uang lokal lokasi itu sesuai data ekonomi dasar di atas, mencakup dari gaya hidup hemat (kos/kontrakan sederhana, makan seadanya, transportasi umum) sampai nyaman (tempat tinggal lebih baik, makan lebih fleksibel, transportasi pribadi/ride-hailing rutin) — mis. "Rp 5-15 juta/bln" atau "SGD 1.800-4.000/bln", JANGAN satu titik angka sempit. Tambahkan 1 kata sifat kualitatif untuk konteks (Rendah/Sedang/Tinggi dibanding kota besar lain di negara yang sama). Angka ini estimasi kasar biaya hidup, BUKAN indeks/skor relatif ke kota lain — jangan tulis dalam skala 0-100 atau bentuk peringkat apa pun.
2. Pajak — sebutkan karakter pajak penghasilan yang relevan di lokasi itu (mis. progresif tinggi, flat rate, atau bebas pajak penghasilan untuk beberapa negara Teluk), berdasarkan data ekonomi dasar di atas kalau tersedia; jangan mengarang persentase pasti kalau tidak yakin — cukup gambarkan karakternya secara umum.
3. Karakter industri dominan — sebutkan 2-3 sektor paling menonjol di kota/lokasi itu (mis. Jakarta = korporat/HQ/keuangan, Surabaya = manufaktur/trading/logistik, Bandung = kreatif/startup/edukasi, Singapura = fintech/regional HQ). Kaitkan dengan bidang karier pengguna jika relevan.
4. Budaya kerja umum — jam kerja, prevalensi WFH/hybrid, dan tingkat komuter/kemacetan yang umum di kota tersebut secara realistis, bukan generalisasi klise.
5. Kompetisi talent — level kompetisi kandidat untuk role sejenis pengguna di kota itu (Rendah/Sedang/Tinggi) beserta alasan singkat (mis. banyak kampus/talent pool besar, hub industri spesifik, banyak talent asing/ekspatriat).
Aturan penulisan:
- Satu paragraf per lokasi, maksimal 5 kalimat, satu kalimat per fakta, urutan persis sesuai poin 1-5 di atas.
- Cost of living BOLEH memakai angka nominal dalam mata uang lokal (estimasi biaya hidup layak per bulan) karena itu satuan nyata yang langsung bisa dipahami pengguna. DILARANG memakai indeks/skor abstrak tanpa satuan nyata (mis. "75/100", "peringkat 3 dari 10", "indeks 130") untuk fakta manapun, termasuk Cost of Living dan Pajak — gunakan label kualitatif (Rendah/Sedang/Tinggi) atau deskripsi naratif untuk selain angka nominal.
- Jangan pakai format lama "Baseline realistis .../ Upper-market ..." — field ini bukan lagi tentang rentang gaji per level role.
- Hindari generalisasi kosong seperti "kota ini dinamis dan berkembang" — tiap kalimat wajib berisi fakta spesifik yang membedakan kota itu dari kota lain.
marketValue.catatan wajib menjelaskan metodologi singkat: estimasi biaya hidup dan karakter pajak berasal dari data ekonomi dasar di atas (estimasi kasar, bukan indeks resmi pihak ketiga seperti Numbeo/Mercer), sementara karakter industri/budaya kerja/kompetisi talent berbasis pengetahuan umum tentang kota tersebut, bukan survei primer Retrokarir.

OUTPUT JSON
{
  "profilRingkas": { "nama": "", "usia": 0, "bidangKarier": "" },
  "pemetaanKompetensi": {
    "analyticalThinking": { "skor": 0, "kekuatan": [], "celah": [] },
    "resilienceAgility": { "skor": 0, "kekuatan": [], "celah": [] },
    "aiAndDigital": { "skor": 0, "kekuatan": [], "celah": [] },
    "interpersonalLeadership": { "skor": 0, "kekuatan": [], "celah": [] }
  },
  "analisisRisiko": { "level": "", "persentaseRisiko": 0, "konteksBenchmark": "", "faktorRisiko": [], "penjelasan": "", "sumberKerangka": "" },
  "marketValue": { "catatan": "" },
  "ringkasanAwam": { "situasiSekarang": "", "kelebihanUtama": "", "yangPerluDitambah": "", "langkahPertama": "", "pesanPenyemangat": "" },
  "kataKunciJobSeeker": { "posisi": [], "keahlian": [], "rekomendasiKursus": [{ "platform": "", "topik": "", "alasan": "" }] },
  "prakiraanPekerjaan": { "posisiPermintaanTinggi": [{ "posisi": "", "alasan": "" }], "catatan": "" },
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

// Kata kunci bagian yang lazim muncul di CV/resume (ID & EN). fileFilter
// multer hanya mengecek header Content-Type yang mudah dipalsukan client,
// jadi ini lapisan kedua: memastikan ISI dokumen memang CV, bukan berkas
// lain (invoice, artikel, ebook, dsb.) yang tidak sengaja terunggah.
const CV_SECTION_KEYWORDS = [
  'curriculum vitae', 'daftar riwayat hidup', 'riwayat hidup', 'resume',
  'pengalaman kerja', 'riwayat pekerjaan', 'riwayat organisasi',
  'riwayat pendidikan', 'pendidikan', 'keahlian', 'keterampilan',
  'kemampuan', 'organisasi', 'pelatihan', 'sertifikasi', 'referensi',
  'ringkasan profil', 'profil singkat', 'data pribadi', 'informasi pribadi',
  'kontak', 'work experience', 'professional experience',
  'employment history', 'education', 'skills', 'certifications',
  'summary', 'objective', 'references', 'projects', 'achievements',
  'qualifications', 'work history',
];

const CV_CONTACT_PATTERNS = [
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, // email
  /(?:\+?\d[\d\s().-]{7,}\d)/, // nomor telepon
  /linkedin\.com\/in\//i,
];

// Butuh minimal 1 sinyal kontak (email/telepon/LinkedIn) DAN minimal 2 kata
// kunci bagian CV yang lazim. Dua syarat ini mengurangi risiko dokumen lain
// yang kebetulan menyebut satu-dua kata (mis. "pendidikan" di artikel berita)
// lolos sebagai CV.
function looksLikeCv(text) {
  const lower = text.toLowerCase();
  const keywordHits = CV_SECTION_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const contactHits = CV_CONTACT_PATTERNS.filter(re => re.test(text)).length;
  return contactHits >= 1 && keywordHits >= 2;
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

    // Content-Type dari client (dicek fileFilter multer) gampang dipalsukan;
    // pastikan byte awal file memang signature PDF asli sebelum diparse.
    if (req.file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({
        error: 'File yang diunggah bukan PDF yang valid. Pastikan Anda mengunggah CV dalam format PDF asli.',
        code: 'NOT_A_PDF',
      });
    }

    let pdfData;
    try {
      pdfData = await parsePdfQuietly(req.file.buffer);
    } catch (parseErr) {
      console.error('PDF parse error:', parseErr);
      return res.status(400).json({
        error: 'File PDF tidak dapat dibaca. Pastikan file tidak rusak dan bukan hasil scan/gambar tanpa teks.',
        code: 'PDF_UNREADABLE',
      });
    }

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

    if (!looksLikeCv(cvText)) {
      return res.status(400).json({
        error: 'File yang diunggah sepertinya bukan CV/Resume. Pastikan dokumen berisi bagian seperti pengalaman kerja, pendidikan, dan kontak, lalu unggah ulang.',
        code: 'NOT_A_CV',
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