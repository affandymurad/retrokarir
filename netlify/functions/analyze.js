import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'X-Data-Policy': 'no-storage',
};

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
    intention: userData.intention || '-',
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

function buildPrompt(cvText, userData) {
  const {
    fullName,
    birthDate,
    gender,
    intention,
    workTypes,
    dreamLocations,
    outputLang,
  } = userData;

  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  const workTypesStr = workTypes.join(', ');
  const locationsStr = dreamLocations.join(', ');
  const level =
    age <= 26
      ? 'Fresh Graduate / Early Career'
      : age <= 32
        ? 'Mid-level Professional'
        : 'Senior Professional';

  const langInstruction =
    outputLang === 'en'
      ? 'OUTPUT LANGUAGE: Write the entire JSON output in English. All field values must be in English. Field keys remain unchanged.'
      : 'OUTPUT LANGUAGE: Tulis seluruh output JSON dalam Bahasa Indonesia formal. Semua nilai field harus dalam Bahasa Indonesia.';

  return `
SYSTEM ROLE:
Anda adalah Retrokarir AI Advisor, pakar HR dan analisis tenaga kerja berbasis data Outlook Ketenagakerjaan 2026, Sakernas 2025, dan standar kompetensi nasional KBJI 2014.

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

TASK INSTRUCTIONS:
1. Identifikasi latar belakang teknis dari CV.
2. Petakan kompetensi ke 4 pilar: kognitif, interpersonal, self-leadership, digital.
3. Buat rencana SMART tepat 4 item.
4. Buat analisis risiko otomasi.
5. Buat kata kunci job seeker.
6. Buat ringkasan awam.
7. Rekomendasi harus spesifik berdasarkan isi CV, bukan generik.

OUTPUT FORMAT:
- ${langInstruction}
- HANYA JSON, tanpa markdown, tanpa teks di luar JSON.
- Skor kompetensi integer 0-100.
- rencanaSMART wajib array of objects tepat 4 item.

{
  "profilRingkas": {
    "nama": "",
    "usia": 0,
    "kekuatanUtama": [],
    "bidangKarier": ""
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
  "rekomendasiAkhir": ""
}
`;
}

async function analyzeWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di environment variables Netlify');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const result = await model.generateContent(prompt);
  return cleanJsonResponse(result.response.text());
}

async function analyzeWithSonnet(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    throw new Error('ANTHROPIC_API_KEY belum dikonfigurasi di environment variables Netlify');
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return cleanJsonResponse(text);
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
    const aiModePart = parts.find(part => part.name === 'aiMode');

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

    const pdfData = await pdfParse(pdfPart.data);
    const cvText = pdfData.text;

    if (!cvText || cvText.trim().length < 50) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Teks dalam PDF tidak dapat dibaca atau terlalu singkat',
        }),
      };
    }

    const userData = normalizeUserData(
      parseJsonField(userDataPart.value, 'userData')
    );

    const aiMode = (aiModePart?.value || 'gemini').toLowerCase();
    const prompt = buildPrompt(cvText, userData);

    const result =
      aiMode === 'sonnet'
        ? await analyzeWithSonnet(prompt)
        : await analyzeWithGemini(prompt);

    const modelName =
      aiMode === 'sonnet'
        ? process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
        : process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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