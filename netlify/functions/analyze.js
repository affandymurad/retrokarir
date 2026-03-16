import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'X-Data-Policy': 'no-storage',
};

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
   - Pelatihan/kursus: 2-3 rekomendasi dengan nama platform.
   - Kompetisi/hackathon: 2-3 yang relevan untuk profil.
   - Sertifikasi: 2-3 yang relevan dengan domain.
   - Setiap item WAJIB berupa string tunggal dengan nama dan alasan singkat.
     Contoh: "React Native Advanced — Udemy (bridge gap antara ReactJS web dan mobile native)"

5. STRATEGI AKSI — WAJIB relevan dengan tech stack dan sektor dari CV:
   - Jangka Pendek 1-3 bulan: 2 langkah nyata untuk memperbaiki profil secara instan.
   - Jangka Menengah 6-12 bulan: reskilling/upskilling spesifik sesuai domain dan tren sektor.
   - Jangka Panjang lebih dari 1 tahun: transformasi karier ke sektor strategis.
   - Jika fresh graduate: mulai dari portofolio, networking, kontribusi open source.

6. ANALISIS RISIKO OTOMASI — berdasarkan sifat pekerjaan dan sektor target:
   - Berikan persentase risiko 0-100 dan level: "Rendah", "Sedang", atau "Tinggi".
   - Sertakan faktor risiko spesifik dan penjelasan singkat.

GAYA PENULISAN OUTPUT — wajib diterapkan di seluruh bagian:
- Setiap aksi dalam actionPlan WAJIB menyertakan konteks spesifik dari CV pengguna, bukan saran generik.
- Sertakan angka konkret jika relevan: estimasi range gaji, persentase peningkatan, jumlah target.
- Hubungkan pengalaman spesifik dari CV ke peluang masa depan secara eksplisit.
- rekomendasiAkhir WAJIB menyebut nama pengguna, 1-2 keunggulan unik yang langka, dan 1 target konkret 6-12 bulan.

OUTPUT FORMAT:
- Bahasa Indonesia formal, ringkas, persuasif, langsung ke inti.
- HANYA JSON, tanpa markdown, tanpa teks di luar JSON.
- Skor kompetensi: integer 0-100, BUKAN desimal.
- actionPlan.aksi: WAJIB array of strings biasa, BUKAN array of objects.
- saranPengembangan semua field: WAJIB array of strings biasa, BUKAN array of objects.
- faktorRisiko: WAJIB array of strings biasa.
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
        throw new Error('GEMINI_API_KEY belum dikonfigurasi di environment variables Netlify');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-04-17';
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

// Manual multipart parser — tidak butuh multer
function parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const CRLFCRLF = Buffer.from('\r\n\r\n');

    function indexOf(buf, search, start = 0) {
        for (let i = start; i <= buf.length - search.length; i++) {
            let found = true;
            for (let j = 0; j < search.length; j++) {
                if (buf[i + j] !== search[j]) { found = false; break; }
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
        if (buffer[pos] === 45 && buffer[pos + 1] === 45) break; // '--' = final boundary
        if (buffer[pos] === 13 && buffer[pos + 1] === 10) pos += 2; // skip CRLF

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

export const handler = async (event) => {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const contentType = event.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Content type harus multipart/form-data' }) };
        }

        const boundary = contentType.split('boundary=')[1]?.trim();
        if (!boundary) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Boundary tidak ditemukan' }) };
        }

        const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        const parts = parseMultipart(bodyBuffer, boundary);

        const pdfPart = parts.find(p => p.name === 'cv');
        const userDataPart = parts.find(p => p.name === 'userData');
        const aiModePart = parts.find(p => p.name === 'aiMode');

        if (!pdfPart?.data) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'File PDF wajib diunggah' }) };
        }
        if (pdfPart.data.length > 10 * 1024 * 1024) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Ukuran file maksimum 10 MB' }) };
        }

        const pdfData = await pdfParse(pdfPart.data);
        const cvText = pdfData.text;

        if (!cvText || cvText.trim().length < 50) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Teks dalam PDF tidak dapat dibaca atau terlalu singkat' }) };
        }

        const userData = JSON.parse(userDataPart.value);
        const aiMode = aiModePart?.value || 'gemini';
        const prompt = buildPrompt(cvText, userData);

        const result = aiMode === 'ollama'
            ? await analyzeWithOllama(prompt)
            : await analyzeWithGemini(prompt);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ success: true, data: result }),
        };

    } catch (err) {
        console.error('Function error:', err);
        const raw = err.message || 'Terjadi kesalahan server';
        const clean = raw.split('[{')[0].split('\n')[0].trim().replace(/\s+/g, ' ');
        const friendly = clean.length > 200 ? clean.slice(0, 200) + '...' : clean;
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: friendly }),
        };
    }
};