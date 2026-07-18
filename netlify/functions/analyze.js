import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'X-Data-Policy': 'no-storage',
};

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

function getHeader(headers, name) {
  const lower = name.toLowerCase();
  const foundKey = Object.keys(headers || {}).find(
    key => key.toLowerCase() === lower
  );

  return foundKey ? headers[foundKey] : '';
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

// ── Patokan gaji hasil kurasi (diperbarui manual berkala) ─────
// Prompt market value dirakit dinamis: hanya patokan untuk lokasi yang
// diminta pengguna yang disuntikkan, bukan daftar semua tier. Kota baru
// cukup ditambahkan di tabel ini tanpa menyentuh teks prompt.
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
- analisisRisiko.level hanya "Rendah", "Sedang", atau "Tinggi". Tentukan level dan persentaseRisiko dengan menimbang posisi kerja pengguna pada kerangka Future of Job (Na, 2016): tugas rutin (routine) berisiko lebih tinggi tergantikan otomasi dibanding tugas tidak rutin (non-routine), dan pekerjaan berbasis knowledge labor (analisis, keputusan, kreativitas) lebih tahan otomasi dibanding physical/manual labor yang rutin. persentaseRisiko: 20–45 untuk profil senior multi-skill, 30–55 untuk fresh graduate/early career dengan tugas dominan rutin. faktorRisiko 2 item. penjelasan wajib konsisten dengan level yang dipilih (jangan menyebut risiko "rendah" jika level Sedang/Tinggi). Jika level Sedang/Tinggi, penjelasan wajib memuat jalur transisi peran. analisisRisiko.sumberKerangka wajib diisi persis: "Matriks Future of Job (Na, 2016) — posisi rutin/tidak-rutin dan knowledge/physical labor."
- prakiraanPekerjaan.posisiPermintaanTinggi: 3–5 posisi yang permintaannya diproyeksikan naik dalam 2–3 tahun ke depan, relevan dengan bidang dan level pengguna (bukan daftar generik lintas industri). Tiap item wajib berisi "posisi" (nama jabatan) dan "alasan" (maks 1 kalimat, konkret — sebutkan tren/kebutuhan pasar spesifik, bukan alasan umum seperti "permintaan tinggi"). prakiraanPekerjaan.catatan wajib menyebutkan sifatnya indikatif (bukan jaminan) dan basis pertimbangan singkat (mis. tren industri, kerangka Future of Job).
- kataKunciJobSeeker.posisi: 6–8 jabatan.
- kataKunciJobSeeker.keahlian: 8–10 skill teknis/non-teknis.
- kataKunciJobSeeker.rekomendasiKursus: WAJIB selalu diisi 3–5 item, TIDAK kondisional (isi terlepas dari seberapa kuat profil pengguna). Tiap item wajib berisi "platform" (pilih salah satu: Skillhub, Karirhub, Prakerja, Dicoding, Coursera — sesuaikan jenis kursus: Skillhub/Karirhub untuk pelatihan vokasi dan sertifikasi kompetensi nasional, Prakerja untuk upskilling dasar/pemula, Dicoding untuk skill teknis pemrograman/IT, Coursera untuk skill lanjutan atau sertifikasi bertaraf internasional), "topik" (nama kursus/skill spesifik maks 6 kata, harus menjawab langsung salah satu celah di pemetaanKompetensi atau gap di cvRewriteAdvice — dilarang topik generik), dan "alasan" (maks 1 kalimat, kaitkan eksplisit ke celah/gap spesifik yang ditemukan di CV).
- cvRewriteAdvice: tepat 4 item. prioritas hanya "Tinggi", "Sedang", atau "Rendah". contohKalimat maksimal 1 kalimat. Dilarang keras menulis angka/skala konkret yang tidak ada di CV; wajib pakai placeholder [X%], [N pengguna], atau [N karyawan].
- rekomendasiAkhir: sebut nama, 1–2 keunggulan unik, 1 gap utama, dan 1 target 6–12 bulan. Maks 3 kalimat.
- quickWins: tepat 3 langkah minggu ini, berjenjang — langkah 1 ±15 menit, langkah 2 ±1 jam, langkah 3 ±3 jam; isi estimasiWaktu sesuai jenjang itu. aksi maks 12 kata dan bisa dilakukan tanpa biaya besar. Jika ada kebutuhan pelatihan, arahkan ke kanal resmi: Skillhub/Karirhub (SIAPkerja Kemnaker) atau Digital Talent Scholarship (Komdigi).
- marketValue.catatan wajib berisi metodologi singkat.

ATURAN MARKET VALUE
Buat estimasi hanya untuk lokasi target: ${locationsStr}.
marketValue harus flat object: key = nama lokasi, value = string. Satu-satunya key non-lokasi adalah "catatan".
Patokan gaji per lokasi target (baseline = angka umum pasar, bukan maksimum; hasil kurasi berkala, mencampur jangkar rata-rata upah 2026 semua profesi dengan pita gaji role teknis/profesional):
${salaryGuidance}
Jangkar nasional Indonesia (Sakernas 2026): rata-rata upah nasional Rp 3,29 juta/bln — pakai sebagai batas bawah sanity-check untuk estimasi "Junior" di lokasi Indonesia manapun, jangan sampai di bawah ini tanpa alasan eksplisit.
Aturan umum:
- Level L3/L4/L5 hanya untuk role teknologi/product. Untuk role non-teknologi (administrasi, pendidikan, layanan, operasional, dsb.), gunakan jenjang junior/mid/senior dengan acuan pasar lokal yang wajar dan konservatif.
- Rentang harus masuk akal: lebar baseline maksimal sekitar ±30% dari titik tengah, upper-market maksimal 1.5x batas atas baseline, dan angka harus konsisten dengan level yang disebut.
- Penulisan rentang WAJIB memakai tanda hubung "-" biasa di antara dua angka, contoh: "Rp 18-30 juta/bln" atau "MYR 7.000-11.000/bln". Jangan memakai simbol lain untuk rentang.
- WAJIB pakai HANYA mata uang lokal resmi yang disebutkan pada patokan gaji lokasi tersebut di atas. DILARANG memakai USD sebagai default untuk kota di luar Amerika Serikat — setiap patokan sudah eksplisit menyebut kode mata uangnya, ikuti persis (mis. Singapura = SGD, Stockholm = SEK, Kuala Lumpur = MYR, Doha = QAR), jangan diterjemahkan balik ke USD. Untuk lokasi yang patokannya menyebut "belum ada kurs terkurasi" atau volatil (mis. Meksiko, Argentina, Nigeria): sebut nominal lokal apa adanya, jangan mengarang kurs tetap, dan lewati konversi Rupiah.
Aturan kalkulasi (anchor 2026, berbasis WEF Future of Jobs 2025 dan Sakernas 2026):
1. Premium pendidikan: pemilik gelar S1/S2/S3 layak diberi estimasi sekitar 2,1x lebih tinggi dibanding upah rata-rata pendidikan dasar di wilayah tersebut — pakai sebagai sanity-check arah, bukan formula matematis presisi.
2. Premium sektor: jika CV menunjukkan pengalaman di sektor Keuangan & Asuransi atau Informasi & Telekomunikasi, naikkan estimasi 30-60% di atas median pasar lokal untuk role setara.
3. Koreksi bahasa Inggris: kurangi hingga 15% dari estimasi khusus untuk lokasi internasional jika skor TOEFL/IELTS tidak tercantum atau kemampuan bahasa Inggris profesional tidak terbukti di CV. Ini bagian dari faktor koreksi umum di bawah, jangan dihitung dobel.
4. Batas remote: untuk skema remote dari Indonesia ke perusahaan luar negeri, batas atas (cap) adalah setara USD 5.000/bln (~Rp 80 juta) kecuali CV menunjukkan spesialisasi langka (mis. arsitektur sistem pembayaran ISO 8583, AI/ML tingkat lanjut) — sebutkan cap ini eksplisit di catatan lokasi remote.
5. Risiko otomasi vs rentang: jika analisisRisiko.level "Rendah" (persentaseRisiko di bawah 25%), beri rentang upper-market yang lebih lebar (potensi kenaikan gaji lebih tinggi) dibanding profil dengan risiko Sedang/Tinggi, supaya kedua field saling konsisten.
Faktor koreksi umum: kurangi 10–20% jika tidak ada metrik dampak bisnis, mayoritas pengalaman internal IT/non-product, banyak sertifikasi tetapi minim bukti deployment, atau belum ada rekam jejak pasar target (koreksi bahasa Inggris mengikuti aturan poin 3 di atas).
Kurs: IDR sebagai acuan — USD×16.000, GBP×20.500, CHF×18.500, EUR×17.500, AUD×10.500, NZD×9.700, CAD×11.800, SGD×11.500, HKD×2.050, JPY×105, KRW×12, SEK×1.500, AED×4.350, QAR×4.400, SAR×4.270, KWD×52.000, MYR×3.500, THB×450, PHP×285, VND×0,65, PLN×4.070, RON×3.520, INR×190, CNY×2.220, BRL×3.080, CLP×17, ZAR×865, MAD×1.650, EGP×325. Tidak ada kurs tetap untuk MXN, ARS, dan NGN karena belum terkurasi/terlalu volatil — ikuti instruksi khusus di masing-masing patokan lokasi.
Format value lokasi: "Baseline realistis [rentang mata uang/bln] untuk [level role]. Upper-market [angka] dapat dicapai jika [syarat eksplisit]. [Catatan onsite/remote/pajak/total compensation]."
Untuk luar Indonesia, tambahkan konversi Rupiah dalam tanda kurung memakai kurs di atas, mis. "SGD 6.000/bln (~Rp 69 juta)". Untuk lokasi tanpa kurs di daftar (mis. Meksiko, Argentina, Nigeria), lewati konversi Rupiah dan sebut alasannya singkat di catatan (nilai tukar terlalu volatil/belum terkurasi untuk dipatok).

OUTPUT JSON
Urutan field di bawah ini disengaja: analisisRisiko WAJIB ditulis sebelum marketValue, karena aturan poin 5 di ATURAN MARKET VALUE mengharuskan rentang gaji mengacu ke analisisRisiko.level yang sudah ditentukan.
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

// Kata kunci bagian yang lazim muncul di CV/resume (ID & EN). Parser
// multipart di atas hanya percaya nama field ("cv"), jadi ini lapisan kedua:
// memastikan ISI dokumen memang CV, bukan berkas lain (invoice, artikel,
// ebook, dsb.) yang tidak sengaja terunggah.
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

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const CRLFCRLF = Buffer.from('\r\n\r\n');

  function indexOf(buf, search, start = 0) {
    for (let i = start; i <= buf.length - search.length; i++) {
      let found = true;

      for (let j = 0; j < search.length; j++) {
        if (buf[i + j] !== search[j]) {
          found = false;
          break;
        }
      }

      if (found) return i;
    }

    return -1;
  }

  let pos = 0;

  while (pos < buffer.length) {
    const bStart = indexOf(buffer, boundaryBuf, pos);
    if (bStart === -1) break;

    pos = bStart + boundaryBuf.length;

    if (buffer[pos] === 45 && buffer[pos + 1] === 45) break;
    if (buffer[pos] === 13 && buffer[pos + 1] === 10) pos += 2;

    const headerEnd = indexOf(buffer, CRLFCRLF, pos);
    if (headerEnd === -1) break;

    const headerStr = buffer.slice(pos, headerEnd).toString('utf8');
    pos = headerEnd + 4;

    const nextBoundary = indexOf(buffer, boundaryBuf, pos);
    const dataEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2;
    const data = buffer.slice(pos, dataEnd);

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);

    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch?.[1] || null,
        data,
        value: filenameMatch ? null : data.toString('utf8'),
      });
    }

    pos = nextBoundary === -1 ? buffer.length : nextBoundary;
  }

  return parts;
}

export const handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const contentType = getHeader(event.headers, 'content-type');

    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Content type harus multipart/form-data' }),
      };
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch?.[1] || boundaryMatch?.[2]?.trim();

    if (!boundary) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Boundary tidak ditemukan' }),
      };
    }

    const bodyBuffer = Buffer.from(
      event.body,
      event.isBase64Encoded ? 'base64' : 'utf8'
    );

    const parts = parseMultipart(bodyBuffer, boundary);

    const pdfPart = parts.find(part => part.name === 'cv');
    const userDataPart = parts.find(part => part.name === 'userData');

    if (!pdfPart?.data) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'File PDF wajib diunggah' }),
      };
    }

    if (pdfPart.data.length > 10 * 1024 * 1024) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Ukuran file maksimum 10 MB' }),
      };
    }

    if (!userDataPart?.value) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'userData wajib diisi' }),
      };
    }

    // Nama field multipart mudah dipalsukan; pastikan byte awal file
    // memang signature PDF asli sebelum diparse.
    if (pdfPart.data.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'File yang diunggah bukan PDF yang valid. Pastikan Anda mengunggah CV dalam format PDF asli.',
          code: 'NOT_A_PDF',
        }),
      };
    }

    let pdfData;
    try {
      pdfData = await parsePdfQuietly(pdfPart.data);
    } catch (parseErr) {
      console.error('PDF parse error:', parseErr);
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'File PDF tidak dapat dibaca. Pastikan file tidak rusak dan bukan hasil scan/gambar tanpa teks.',
          code: 'PDF_UNREADABLE',
        }),
      };
    }

    if (pdfData.numpages > MAX_PDF_PAGES) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `PDF CV maksimal ${MAX_PDF_PAGES} halaman agar analisis tidak timeout di Netlify`,
          code: 'PDF_TOO_MANY_PAGES',
        }),
      };
    }

    const cvText = compactCvText(pdfData.text);

    if (!cvText || cvText.trim().length < 50) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Teks dalam PDF tidak dapat dibaca atau terlalu singkat',
        }),
      };
    }

    if (!looksLikeCv(cvText)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'File yang diunggah sepertinya bukan CV/Resume. Pastikan dokumen berisi bagian seperti pengalaman kerja, pendidikan, dan kontak, lalu unggah ulang.',
          code: 'NOT_A_CV',
        }),
      };
    }

    const userData = normalizeUserData(
      parseJsonField(userDataPart.value, 'userData')
    );

    const prompt = buildPrompt(cvText, userData);
    const result = await analyzeWithGemini(prompt);

    // Normalisasi marketValue — Gemini kadang menghasilkan nested object
    // per lokasi alih-alih string, yang menyebabkan crash di React renderer.
    if (result.marketValue) {
      result.marketValue = normalizeMarketValue(result.marketValue);
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: result,
        modelName,
      }),
    };
  } catch (err) {
    console.error('Function error:', err);

    const raw = err.message || 'Terjadi kesalahan server';
    const isTimeout = raw.toLowerCase().includes('timeout') || raw.toLowerCase().includes('terlalu lama');

    if (isTimeout) {
      return {
        statusCode: 504,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Analisis terlalu lama diproses. Gunakan PDF CV maksimal 3 halaman, ringkas bagian sertifikasi, atau ulangi beberapa saat lagi.',
          code: 'AI_TIMEOUT',
        }),
      };
    }

    const clean = raw
      .split('[{')[0]
      .split('\n')[0]
      .trim()
      .replace(/\s+/g, ' ');

    const friendly = clean.length > 200 ? `${clean.slice(0, 200)}...` : clean;

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: friendly }),
    };
  }
};