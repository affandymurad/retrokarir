import jsPDF from 'jspdf';
import {
  safeString,
  injectIdrConversion,
  clampScore,
  getScoreColor,
  RISK_COLOR,
  CONFIDENCE_COLOR,
  PILLAR_LABELS,
} from './reportFormat';

// PDF dibangun sebagai teks/vektor asli (bukan hasil "cetak" halaman HTML),
// jadi tiap baris punya posisi eksplisit — tidak ada risiko spasi hilang
// atau huruf terpecah seperti pada pendekatan window.print() sebelumnya.

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;

const C = {
  text: '#0f172a',
  secondary: '#475569',
  muted: '#94a3b8',
  border: '#e2e8f0',
  accent: '#3b82f6',
  bgSoft: '#f8fafc',
};

function hexToRgb(hex) {
  let clean = hex.replace('#', '');

  // Dukung shorthand 3/4 digit (#rgb, #rgba) -> perluas ke 6/8 digit
  if (clean.length === 3 || clean.length === 4) {
    clean = clean.split('').map((c) => c + c).join('');
  }

  const n = parseInt(clean.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  // Hex 8-digit (RRGGBBAA) -> ada alpha channel di 2 digit terakhir.
  // jsPDF setFillColor/setDrawColor tidak mendukung alpha, jadi kita
  // blend manual ke atas putih supaya tetap terlihat "pucat/transparan"
  // seperti maksud aslinya, alih-alih salah dibaca sebagai bagian RGB.
  if (clean.length === 8) {
    const a = parseInt(clean.slice(6, 8), 16) / 255;
    return [
      Math.round(r * a + 255 * (1 - a)),
      Math.round(g * a + 255 * (1 - a)),
      Math.round(b * a + 255 * (1 - a)),
    ];
  }

  return [r, g, b];
}

function setTextColorHex(doc, hex) { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); }
function setFillColorHex(doc, hex) { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); }
function setDrawColorHex(doc, hex) { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); }

function ensureSpace(doc, y, needed) {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawSectionTitle(doc, y, title) {
  y = ensureSpace(doc, y, 34);
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  setTextColorHex(doc, C.secondary);
  doc.text(title.toUpperCase(), MARGIN, y);
  y += 6;
  setDrawColorHex(doc, C.border);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  return y + 14;
}

// Konvensi: y selalu mewakili batas ATAS dari elemen berikutnya.
function drawParagraph(doc, text, x, y, maxWidth, opts = {}) {
  const { fontSize = 10, style = 'normal', color = C.secondary, lineHeight = 1.45 } = opts;
  const str = safeString(text);
  if (!str) return y;
  doc.setFont('helvetica', style);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(str, maxWidth);
  const lh = fontSize * lineHeight;
  y = ensureSpace(doc, y, lines.length * lh);
  setTextColorHex(doc, color);
  lines.forEach((line, i) => doc.text(line, x, y + i * lh + fontSize * 0.85));
  return y + lines.length * lh;
}

function drawList(doc, items, x, y, maxWidth, { prefix = '- ', color = C.secondary, fontSize = 9.5 } = {}) {
  if (!Array.isArray(items) || items.length === 0) return y;
  for (const item of items) {
    const text = prefix + safeString(item);
    y = drawParagraph(doc, text, x, y, maxWidth, { fontSize, color, lineHeight: 1.4 }) + 2;
  }
  return y;
}

function drawScoreBar(doc, x, y, width, value, color) {
  const h = 5;
  y = ensureSpace(doc, y, h + 6);
  setFillColorHex(doc, '#e2e8f0');
  doc.roundedRect(x, y, width, h, 2, 2, 'F');
  const fillW = Math.max(3, (clampScore(value) / 100) * width);
  setFillColorHex(doc, color);
  doc.roundedRect(x, y, fillW, h, 2, 2, 'F');
  return y + h + 8;
}

function drawBadge(doc, text, x, y, { fontSize = 9, color = '#16a34a', bg = '#f0fdf4', border = '#bbf7d0' } = {}) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  const textW = doc.getTextWidth(text);
  const padX = 8;
  const w = textW + padX * 2;
  const h = fontSize + 8;
  setFillColorHex(doc, bg);
  setDrawColorHex(doc, border);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'FD');
  setTextColorHex(doc, color);
  doc.text(text, x + padX, y + h / 2 + fontSize * 0.32);
  return { w, h };
}

// Susun badge/pill berjajar, wrap ke baris baru bila melebihi maxWidth.
function drawPillRow(doc, items, x, y, maxWidth, colorOpts) {
  const cleaned = (items || []).map(safeString).filter(Boolean);
  if (cleaned.length === 0) return y;

  let curX = x;
  let curY = y;
  const gapX = 6;
  const gapY = 8;
  let rowH = 0;
  const fontSize = colorOpts?.fontSize || 9;

  for (const text of cleaned) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    const textW = doc.getTextWidth(text);
    const w = textW + 16;
    const h = fontSize + 8;

    if (curX + w > x + maxWidth) {
      curX = x;
      curY += rowH + gapY;
      rowH = 0;
    }

    const before = curY;
    curY = ensureSpace(doc, curY, h);
    if (curY !== before) curX = x;

    drawBadge(doc, text, curX, curY, colorOpts);
    curX += w + gapX;
    rowH = Math.max(rowH, h);
  }

  return curY + rowH + 6;
}

function drawHeader(doc, result, meta) {
  const r = result || {};
  let y = MARGIN;
  const boxH = 74;

  setFillColorHex(doc, C.bgSoft);
  doc.rect(MARGIN, y, CONTENT_W, boxH, 'F');
  setFillColorHex(doc, C.accent);
  doc.rect(MARGIN, y, 4, boxH, 'F');

  const padX = MARGIN + 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColorHex(doc, C.muted);
  doc.text('RETROKARIR - AI CAREER INTELLIGENCE & SKILL GAP ANALYSIS', padX, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  setTextColorHex(doc, C.text);
  doc.text('Laporan Analisis Karier', padX, y + 40);

  const name = r.profilRingkas?.nama || meta?.fullName || 'Pengguna';
  const age = r.profilRingkas?.usia ? `${r.profilRingkas.usia} tahun` : '';
  const modelLabel = meta?.modelName || 'Gemini AI';
  const metaLine = [name, age, modelLabel].filter(Boolean).join('   •   ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setTextColorHex(doc, C.secondary);
  doc.text(metaLine, padX, y + 58);

  if (r.profilRingkas?.bidangKarier) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    setTextColorHex(doc, C.muted);
    doc.text(safeString(r.profilRingkas.bidangKarier), padX, y + 70);
  }

  return y + boxH + 24;
}

function drawFooters(doc, generatedDate) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColorHex(doc, C.muted);
    const line = `Dibuat oleh Retrokarir - AI Career Intelligence & Skill Gap Analysis - ${generatedDate} - oleh Affandy Murad @ 2026`;
    doc.text(line, PAGE_W / 2, PAGE_H - 24, { align: 'center' });
    doc.text(`${i} / ${total}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' });
  }
}

export function generateReportPdf(result, meta) {
  const r = result || {};
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let y = drawHeader(doc, r, meta);

  // 1 — Penjelasan Sederhana
  if (r.ringkasanAwam) {
    y = drawSectionTitle(doc, y, 'Penjelasan Sederhana');
    const rows = [
      ['situasiSekarang', 'Posisi kamu saat ini'],
      ['kelebihanUtama', 'Yang sudah kamu miliki'],
      ['yangPerluDitambah', 'Peluang yang bisa dikembangkan'],
      ['langkahPertama', 'Mulai dari mana?'],
      ['pesanPenyemangat', 'Pesan untukmu'],
    ];
    for (const [key, label] of rows) {
      const text = r.ringkasanAwam[key];
      if (!text) continue;
      y = ensureSpace(doc, y, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setTextColorHex(doc, C.accent);
      doc.text(label.toUpperCase(), MARGIN, y + 8);
      y = drawParagraph(doc, text, MARGIN, y + 14, CONTENT_W, { fontSize: 10.5, color: C.text }) + 8;
    }
    y += 8;
  }

  // 2 — Pemetaan Kompetensi
  if (r.pemetaanKompetensi) {
    y = drawSectionTitle(doc, y, 'Pemetaan Kompetensi');
    y = drawParagraph(doc, 'Berdasarkan 4 pilar Global Skills Taxonomy (WEF).', MARGIN, y, CONTENT_W, { fontSize: 8.5, style: 'italic', color: C.muted }) + 8;

    for (const [key, { label, labelId, desc }] of Object.entries(PILLAR_LABELS)) {
      const d = r.pemetaanKompetensi[key];
      if (!d) continue;
      const score = clampScore(d.skor);
      const scoreColor = getScoreColor(score);

      y = ensureSpace(doc, y, 68);
      const rowTop = y;

      // Judul pilar (bahasa Indonesia) + skor sejajar di baris yang sama.
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      setTextColorHex(doc, C.text);
      doc.text(labelId, MARGIN, rowTop + 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      setTextColorHex(doc, scoreColor);
      doc.text(String(d.skor), MARGIN + CONTENT_W - 20, rowTop + 9, { align: 'right' });

      // Subtitle bahasa Inggris — jarak baseline-ke-baseline dari judul 11pt
      // bold di atasnya (rowTop+9) harus lebih dari descent-judul + ascent-
      // subtitle (~9pt) supaya tidak bertumpuk. Dipakai 13pt untuk aman.
      y = rowTop + 22;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setTextColorHex(doc, C.muted);
      doc.text(label, MARGIN, y);
      y += 12;

      y = drawParagraph(doc, desc, MARGIN, y, CONTENT_W, { fontSize: 9, color: C.secondary }) + 4;
      y = drawScoreBar(doc, MARGIN, y, CONTENT_W, score, scoreColor);
      y = drawList(doc, d.kekuatan, MARGIN, y, CONTENT_W, { prefix: '+ ', color: '#16a34a' });
      y = drawList(doc, d.celah, MARGIN, y, CONTENT_W, { prefix: '- ', color: '#d97706' });

      setDrawColorHex(doc, C.border);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y + 4, MARGIN + CONTENT_W, y + 4);
      y += 16;
    }
  }

  // 3 — Analisis Risiko Karier
  if (r.analisisRisiko) {
    const level = r.analisisRisiko.level || '';
    const col = RISK_COLOR[level] || '#64748b';
    y = drawSectionTitle(doc, y, 'Analisis Risiko Karier');
    y = drawParagraph(doc, 'Persentase di bawah mengukur seberapa besar kemungkinan tugas-tugas di pekerjaanmu tergantikan otomasi/AI dalam beberapa tahun ke depan, bukan peluang kehilangan pekerjaan sekarang juga.', MARGIN, y, CONTENT_W, { fontSize: 8.5, color: C.muted }) + 8;

    y = ensureSpace(doc, y, 24);
    const badge = drawBadge(doc, safeString(level), MARGIN, y, { color: col, bg: `${col}18`, border: `${col}66` });
    if (r.analisisRisiko.persentaseRisiko) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      setTextColorHex(doc, col);
      doc.text(`${r.analisisRisiko.persentaseRisiko}% risiko tergantikan otomasi`, MARGIN + badge.w + 10, y + badge.h / 2 + 4);
    }
    y += badge.h + 8;

    if (r.analisisRisiko.persentaseRisiko) {
      y = drawScoreBar(doc, MARGIN, y, CONTENT_W, r.analisisRisiko.persentaseRisiko, col);
    }
    if (r.analisisRisiko.konteksBenchmark) {
      y = drawParagraph(doc, safeString(r.analisisRisiko.konteksBenchmark), MARGIN, y, CONTENT_W, { fontSize: 8.5, style: 'italic', color: C.muted }) + 4;
    }
    y = drawParagraph(doc, r.analisisRisiko.penjelasan, MARGIN, y, CONTENT_W, { fontSize: 10, color: C.secondary }) + 6;
    y = drawList(doc, r.analisisRisiko.faktorRisiko, MARGIN, y, CONTENT_W, { prefix: '! ', color: '#ef4444' });
    if (r.analisisRisiko.sumberKerangka) {
      y = drawParagraph(doc, safeString(r.analisisRisiko.sumberKerangka), MARGIN, y + 4, CONTENT_W, { fontSize: 8, style: 'italic', color: C.muted });
    }
    y += 10;
  }

  // 4 — Prakiraan Pekerjaan Permintaan Tinggi
  {
    const prakiraan = r.prakiraanPekerjaan;
    const posisiPrakiraan = Array.isArray(prakiraan?.posisiPermintaanTinggi) ? prakiraan.posisiPermintaanTinggi : [];
    if (posisiPrakiraan.length > 0) {
      y = drawSectionTitle(doc, y, 'Prakiraan Pekerjaan Permintaan Tinggi');
      y = drawParagraph(doc, 'Posisi yang permintaannya diproyeksikan naik dalam 2-3 tahun ke depan, relevan dengan profil dan bidang kamu.', MARGIN, y, CONTENT_W, { fontSize: 8.5, style: 'italic', color: C.muted }) + 8;

      const posisiNames = posisiPrakiraan.map(item => safeString(item?.posisi)).filter(Boolean);
      y = drawPillRow(doc, posisiNames, MARGIN, y, CONTENT_W, { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }) + 6;

      for (const item of posisiPrakiraan) {
        if (!item?.alasan) continue;
        y = drawParagraph(doc, `${safeString(item.posisi)}: ${safeString(item.alasan)}`, MARGIN, y, CONTENT_W, { fontSize: 9, color: C.secondary }) + 2;
      }

      if (prakiraan?.catatan) {
        y = drawParagraph(doc, safeString(prakiraan.catatan), MARGIN, y + 2, CONTENT_W, { fontSize: 8, style: 'italic', color: C.muted }) + 4;
      }
      y += 6;
    }
  }

  // 5 — Kata Kunci Job Seeker
  if (r.kataKunciJobSeeker) {
    y = drawSectionTitle(doc, y, 'Kata Kunci Job Seeker');
    if (r.kataKunciJobSeeker.posisi?.length) {
      y = ensureSpace(doc, y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setTextColorHex(doc, '#16a34a');
      doc.text('POSISI / JABATAN', MARGIN, y);
      y += 8;
      y = drawPillRow(doc, r.kataKunciJobSeeker.posisi, MARGIN, y, CONTENT_W, { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }) + 16;
    }
    if (r.kataKunciJobSeeker.keahlian?.length) {
      y = ensureSpace(doc, y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setTextColorHex(doc, '#7c3aed');
      doc.text('KEAHLIAN & SKILL', MARGIN, y);
      y += 8;
      y = drawPillRow(doc, r.kataKunciJobSeeker.keahlian, MARGIN, y, CONTENT_W, { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }) + (r.kataKunciJobSeeker.rekomendasiKursus?.length ? 16 : 4);
    }
    const kursusList = Array.isArray(r.kataKunciJobSeeker.rekomendasiKursus) ? r.kataKunciJobSeeker.rekomendasiKursus : [];
    if (kursusList.length) {
      y = ensureSpace(doc, y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setTextColorHex(doc, '#0891b2');
      doc.text('REKOMENDASI KURSUS', MARGIN, y);
      y += 8;

      const kursusLabels = kursusList
        .map(item => {
          const topik = safeString(item?.topik);
          const platform = safeString(item?.platform);
          if (!topik) return '';
          return platform ? `${topik} - ${platform}` : topik;
        })
        .filter(Boolean);
      y = drawPillRow(doc, kursusLabels, MARGIN, y, CONTENT_W, { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' }) + 4;
    }
    y += 6;
  }

  // 6 — Saran Perbaikan CV
  if (Array.isArray(r.cvRewriteAdvice) && r.cvRewriteAdvice.length > 0) {
    y = drawSectionTitle(doc, y, 'Saran Perbaikan CV');
    for (const item of r.cvRewriteAdvice) {
      const col = CONFIDENCE_COLOR[item.prioritas] || '#64748b';
      y = ensureSpace(doc, y, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      setTextColorHex(doc, C.text);
      doc.text(safeString(item.bagianCV), MARGIN, y + 8);
      drawBadge(doc, safeString(item.prioritas), MARGIN + CONTENT_W - 60, y - 2, { fontSize: 8, color: col, bg: `${col}18`, border: `${col}66` });
      y += 16;

      y = drawParagraph(doc, `Masalah: ${safeString(item.masalah)}`, MARGIN, y, CONTENT_W, { fontSize: 9.5 }) + 2;
      y = drawParagraph(doc, `Saran: ${safeString(item.saranPerbaikan)}`, MARGIN, y, CONTENT_W, { fontSize: 9.5 }) + 2;
      if (item.contohKalimat) {
        y = drawParagraph(doc, `"${safeString(item.contohKalimat)}"`, MARGIN, y, CONTENT_W, { fontSize: 9.5, style: 'italic', color: C.muted }) + 2;
      }

      setDrawColorHex(doc, C.border);
      doc.setLineWidth(0.5);
      y += 4;
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
      y += 14;
    }
  }

  // 7 — Estimasi Market Value
  const mvEntries = r.marketValue ? Object.entries(r.marketValue).filter(([k]) => k !== 'catatan') : [];
  if (mvEntries.length > 0) {
    y = drawSectionTitle(doc, y, 'Estimasi Market Value');
    for (const [loc, val] of mvEntries) {
      y = ensureSpace(doc, y, 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setTextColorHex(doc, C.secondary);
      doc.text(safeString(loc), MARGIN, y + 8);
      y = drawParagraph(doc, injectIdrConversion(safeString(val)), MARGIN, y + 14, CONTENT_W, { fontSize: 9.5, color: C.accent }) + 6;
      setDrawColorHex(doc, '#f1f5f9');
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
      y += 10;
    }
    if (r.marketValue?.catatan) {
      y = drawParagraph(doc, safeString(r.marketValue.catatan), MARGIN, y, CONTENT_W, { fontSize: 8.5, style: 'italic', color: C.muted }) + 4;
    }
    y += 8;
  }

  // 8 — Rekomendasi Akhir
  if (r.rekomendasiAkhir) {
    const boxFontSize = 10.5;
    const boxLineHeight = 1.45;
    const boxPadX = 16;

    // Hitung dulu berapa baris paragraf akan makan, TANPA menggambar,
    // supaya kita tahu total tinggi box sebelum memutuskan apa pun.
    // Ini mencegah judul & border digambar di halaman lama sementara
    // isi paragraf pindah ke halaman baru (box jadi pecah/jagged).
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(boxFontSize);
    const rekomLines = doc.splitTextToSize(safeString(r.rekomendasiAkhir), CONTENT_W - boxPadX * 2);
    const paraH = rekomLines.length * (boxFontSize * boxLineHeight);
    const boxH = 32 + paraH + 16; // judul (32) + paragraf + padding bawah (16)

    // Reservasi seluruh tinggi box sekaligus — kalau tidak cukup, pindah
    // halaman DULU, baru gambar judul+border+paragraf di halaman yang sama.
    y = ensureSpace(doc, y, boxH + 10);
    y += 10;
    const boxTop = y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setTextColorHex(doc, C.accent);
    doc.text('Rekomendasi Akhir', MARGIN + boxPadX, y + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(boxFontSize);
    setTextColorHex(doc, C.text);
    const lh = boxFontSize * boxLineHeight;
    rekomLines.forEach((line, i) => doc.text(line, MARGIN + boxPadX, y + 32 + i * lh + boxFontSize * 0.85));

    setDrawColorHex(doc, C.accent);
    doc.setLineWidth(1.5);
    doc.roundedRect(MARGIN, boxTop, CONTENT_W, boxH, 8, 8, 'S');
    y = boxTop + boxH + 20;
  }

  // 9 — Mulai Minggu Ini
  if (Array.isArray(r.quickWins) && r.quickWins.length > 0) {
    y = drawSectionTitle(doc, y, 'Mulai Minggu Ini');
    y = drawParagraph(doc, 'Tiga langkah kecil yang bisa dilakukan sekarang - tanpa menunggu kondisi sempurna.', MARGIN, y, CONTENT_W, { fontSize: 8.5, style: 'italic', color: C.muted }) + 8;

    r.quickWins.forEach((item, idx) => {
      y = ensureSpace(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      setTextColorHex(doc, C.accent);
      doc.text(`${idx + 1}.`, MARGIN, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      setTextColorHex(doc, C.text);
      doc.text(safeString(item.aksi), MARGIN + 16, y + 8);
      y += 14;
      y = drawParagraph(doc, item.alasan, MARGIN + 16, y, CONTENT_W - 16, { fontSize: 9.5 }) + 2;
      y = drawParagraph(doc, `Waktu: ${safeString(item.estimasiWaktu)}`, MARGIN + 16, y, CONTENT_W - 16, { fontSize: 8.5, style: 'italic', color: C.accent }) + 10;
    });
  }

  const generatedDate = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  drawFooters(doc, generatedDate);

  return doc;
}

export function downloadReportPdf(result, meta) {
  const doc = generateReportPdf(result, meta);
  const safeName = (meta?.fullName || 'Pengguna').replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Retrokarir_Laporan_${safeName}.pdf`);
}