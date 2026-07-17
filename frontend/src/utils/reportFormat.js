export const RISK_COLOR = { Rendah: '#22c55e', Sedang: '#f59e0b', Tinggi: '#ef4444' };
// Warna prioritas saran CV: prioritas Tinggi = paling mendesak (merah).
export const CONFIDENCE_COLOR = { Tinggi: '#ef4444', Sedang: '#f59e0b', Rendah: '#22c55e' };

export const PILLAR_LABELS = {
  analyticalThinking:      { label: 'Analytical Thinking',       labelId: 'Kemampuan Berpikir Analitis',  desc: 'Seberapa baik kamu memecahkan masalah dan mengambil keputusan berdasarkan data/logika.', icon: '🧠' },
  resilienceAgility:       { label: 'Resilience & Agility',       labelId: 'Ketahanan & Kelincahan',       desc: 'Seberapa cepat kamu beradaptasi saat kondisi kerja berubah atau di bawah tekanan.', icon: '🔄' },
  aiAndDigital:            { label: 'AI & Digital Literacy',      labelId: 'Melek AI & Digital',           desc: 'Seberapa terbiasa kamu memakai tools digital dan AI dalam pekerjaan sehari-hari.', icon: '💻' },
  interpersonalLeadership: { label: 'Interpersonal & Leadership', labelId: 'Kerja Sama & Kepemimpinan',    desc: 'Seberapa baik kamu bekerja dengan orang lain dan memimpin/mengoordinasikan tim.', icon: '🤝' },
};

export function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    return Object.values(value).filter(v => typeof v === 'string').join(' ');
  }
  return String(value);
}

// Kurs perkiraan ke Rupiah. Disinkronkan dengan kurs di prompt backend.
// Safety net: jika Gemini lupa menyisipkan konversi Rupiah inline,
// helper ini akan mendeteksi angka mata uang asing dan menambahkan
// konversi otomatis dalam tanda kurung.
export const IDR_RATES = {
  USD: 16000,
  SGD: 11500,
  MYR: 3500,
  AED: 4350,
  QAR: 4400,
  KWD: 52000,
  SEK: 1500,
  EUR: 17500,
  GBP: 20500,
  HKD: 2050,
  JPY: 105,
  KRW: 12,
  THB: 450,
  PHP: 285,
  CHF: 18500,
  AUD: 10500,
  CAD: 11800,
  NZD: 9700,
  CNY: 2200,
  INR: 190,
  SAR: 4270,
  VND: 0.65,
  PLN: 4070,
};

// Format angka rupiah ke "juta" atau "miliar" yang mudah dibaca.
// Bulatkan ke nilai yang masuk akal untuk komunikasi gaji.
export function formatIdrShort(rupiah) {
  const n = Number(rupiah);
  if (!Number.isFinite(n) || n <= 0) return '';

  if (n >= 1_000_000_000) {
    const miliar = n / 1_000_000_000;
    return `${miliar.toFixed(miliar < 10 ? 1 : 0).replace('.', ',')} miliar`;
  }

  if (n >= 1_000_000) {
    const juta = n / 1_000_000;
    return `${Math.round(juta)} juta`;
  }

  if (n >= 1_000) {
    return `${Math.round(n / 1_000)} ribu`;
  }

  return String(Math.round(n));
}

// Deteksi pola mata uang asing + rentang angka dalam string market value.
// Tambahkan konversi Rupiah dalam tanda kurung jika belum ada.
// Contoh input:  "Baseline realistis SGD 5.500–7.000/bulan untuk..."
// Contoh output: "Baseline realistis SGD 5.500-7.000/bulan (~Rp 63-80 juta) untuk..."
//
// CATATAN FONT: jsPDF memakai font standar (helvetica) dengan WinAnsiEncoding,
// yang TIDAK punya glyph untuk simbol "≈" (U+2248). Menyisipkan "≈" bikin
// karakternya salah gambar DAN bikin kalkulasi lebar teks (splitTextToSize)
// meleset sehingga sebagian kata di baris tersebut hilang saat di-wrap.
// Karena itu dipakai "~" (ASCII, aman) sebagai pengganti "≈" di seluruh fungsi ini.
export function injectIdrConversion(text) {
  if (typeof text !== 'string' || !text) return text;

  const currencyCodes = Object.keys(IDR_RATES).join('|');
  // Match: KODE_MATA_UANG + spasi opsional + angka(rentang opsional)
  // Angka boleh pakai titik/koma sebagai ribuan: 5.500, 5,500, 12.000
  // Rentang dipisah – atau - atau ke
  const pattern = new RegExp(
    `\\b(${currencyCodes})\\s*([\\d.,]+(?:\\s*[–\\-]\\s*[\\d.,]+)?)`,
    'g'
  );

  // Cari semua match terlebih dahulu. Lalu insert konversi setelah satuan
  // (mis. "/bulan" atau "/tahun") jika ada, agar kalimat tetap natural.
  // Strategi sederhana: insert tepat setelah match jika belum ada "Rp" atau
  // "~" dalam 50 karakter berikutnya.
  return text.replace(pattern, (match, code, numbers, offset, fullStr) => {
    // Cek apakah sudah ada konversi Rupiah dalam ~60 karakter setelah match
    const lookAhead = fullStr.slice(offset + match.length, offset + match.length + 80);
    if (/\(\s*[~≈]?\s*Rp/i.test(lookAhead) || /Rp\s*[\d.,]/i.test(lookAhead.slice(0, 40))) {
      return match; // Sudah ada konversi, jangan double
    }

    const rate = IDR_RATES[code];
    if (!rate) return match;

    // Parse angka — bisa rentang atau tunggal
    const parsed = numbers
      .split(/[–\-]/)
      .map(s => s.trim().replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'))
      .map(s => parseFloat(s))
      .filter(n => Number.isFinite(n));

    if (parsed.length === 0) return match;

    if (parsed.length === 1) {
      const idr = parsed[0] * rate;
      return `${match} (~Rp ${formatIdrShort(idr)})`;
    }

    const idrLow = parsed[0] * rate;
    const idrHigh = parsed[1] * rate;
    const lowStr = formatIdrShort(idrLow).replace(/\s*juta$/, '');
    const highStr = formatIdrShort(idrHigh);
    return `${match} (~Rp ${lowStr}-${highStr})`;
  });
}

export function clampScore(value) {
  const n = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

export function getScoreColor(s) {
  return s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
}