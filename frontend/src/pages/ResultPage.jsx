import React, { useRef, useState } from 'react';
import styles from './ResultPage.module.css';

const RISK_COLOR = { Rendah: '#22c55e', Sedang: '#f59e0b', Tinggi: '#ef4444' };
// Warna prioritas saran CV: prioritas Tinggi = paling mendesak (merah).
const CONFIDENCE_COLOR = { Tinggi: '#ef4444', Sedang: '#f59e0b', Rendah: '#22c55e' };

const PILLAR_LABELS = {
  analyticalThinking:      { label: 'Analytical Thinking',       icon: '🧠' },
  resilienceAgility:       { label: 'Resilience & Agility',       icon: '🔄' },
  aiAndDigital:            { label: 'AI & Digital Literacy',      icon: '💻' },
  interpersonalLeadership: { label: 'Interpersonal & Leadership', icon: '🤝' },
};



function safeString(value) {
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
const IDR_RATES = {
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
};

// Format angka rupiah ke "juta" atau "miliar" yang mudah dibaca.
// Bulatkan ke nilai yang masuk akal untuk komunikasi gaji.
function formatIdrShort(rupiah) {
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
// Contoh output: "Baseline realistis SGD 5.500–7.000/bulan (≈ Rp 63–80 juta) untuk..."
function injectIdrConversion(text) {
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
  // "≈" dalam 50 karakter berikutnya.
  return text.replace(pattern, (match, code, numbers, offset, fullStr) => {
    // Cek apakah sudah ada konversi Rupiah dalam ~60 karakter setelah match
    const lookAhead = fullStr.slice(offset + match.length, offset + match.length + 80);
    if (/\(\s*≈?\s*Rp/i.test(lookAhead) || /Rp\s*[\d.,]/i.test(lookAhead.slice(0, 40))) {
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
      return `${match} (≈ Rp ${formatIdrShort(idr)})`;
    }

    const idrLow = parsed[0] * rate;
    const idrHigh = parsed[1] * rate;
    const lowStr = formatIdrShort(idrLow).replace(/\s*juta$/, '');
    const highStr = formatIdrShort(idrHigh);
    return `${match} (≈ Rp ${lowStr}–${highStr})`;
  });
}

function clampScore(value) {
  const n = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function getScoreColor(s) {
  return s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
}

function ScoreBar({ value, color }) {
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarFill} style={{ width: `${value}%`, '--color': color }} />
    </div>
  );
}

export default function ResultPage({ result, meta, onBack }) {
  const printRef = useRef();
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const handleDownload = () => {
    const r = result;
    const sc = s => s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
    const bar = (v, c) => `<div style="height:6px;background:#e2e8f0;border-radius:3px;margin:4px 0 8px;overflow:hidden;"><div style="height:100%;width:${v}%;background:${c};border-radius:3px;"></div></div>`;
    const pill = (t, c='#16a34a', bg='#f0fdf4', b='#bbf7d0') => `<span style="display:inline-block;background:${bg};color:${c};border:1px solid ${b};border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;">${t}</span>`;
    const h2 = txt => `<h2 style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px;margin:28px 0 12px;padding-bottom:6px;border-bottom:1.5px solid #e2e8f0;">${txt}</h2>`;

    const mvRows = r.marketValue
      ? Object.entries(r.marketValue)
          .filter(([k]) => k !== 'catatan')
          .map(([loc, val]) => `
            <div style="
              display:grid;
              grid-template-columns:120px 1fr;
              gap:14px;
              align-items:start;
              padding:12px 0;
              border-bottom:1px solid #f1f5f9;
              break-inside:avoid;
              page-break-inside:avoid;
            ">
              <div style="
                font-size:12px;
                font-weight:800;
                color:#475569;
                text-transform:none;
                line-height:1.45;
                overflow-wrap:break-word;
                word-break:normal;
              ">
                ${loc}
              </div>
              <div style="
                font-size:12px;
                font-weight:650;
                color:#2563eb;
                line-height:1.65;
                text-align:left;
                white-space:normal;
                overflow-wrap:anywhere;
                word-break:break-word;
                min-width:0;
              ">
                ${injectIdrConversion(safeString(val))}
              </div>
            </div>
          `).join('')
      : '';

    const quickWinsRows = Array.isArray(r.quickWins) && r.quickWins.length > 0
      ? r.quickWins.map((item, idx) => `
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;break-inside:avoid;page-break-inside:avoid;">
          <div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx + 1}</div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:3px;line-height:1.4;">${safeString(item.aksi)}</div>
            <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 4px;">${safeString(item.alasan)}</p>
            <span style="font-size:10px;background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe;border-radius:999px;padding:2px 8px;font-weight:600;">⏱ ${safeString(item.estimasiWaktu)}</span>
          </div>
        </div>
      `).join('')
      : '';

    const cvRows = Array.isArray(r.cvRewriteAdvice)
      ? r.cvRewriteAdvice.map(item => {
          const c = CONFIDENCE_COLOR[item.prioritas] || '#64748b';
          return `
            <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;break-inside:avoid;page-break-inside:avoid;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px;">
                <strong style="font-size:12px;color:#0f172a;line-height:1.4;">${safeString(item.bagianCV)}</strong>
                <span style="background:${c}18;color:${c};border:1px solid ${c}44;border-radius:999px;padding:2px 8px;font-size:9px;font-weight:800;white-space:nowrap;">${safeString(item.prioritas)}</span>
              </div>
              <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 3px;"><strong>Masalah:</strong> ${safeString(item.masalah)}</p>
              <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 3px;"><strong>Saran:</strong> ${safeString(item.saranPerbaikan)}</p>
              ${item.contohKalimat ? `<p style="font-size:11px;color:#64748b;line-height:1.55;margin:0;font-style:italic;">“${safeString(item.contohKalimat)}”</p>` : ''}
            </div>
          `;
        }).join('')
      : '';

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Retrokarir — Laporan ${meta.fullName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter','Segoe UI',sans-serif;color:#0f172a;background:white;padding:40px;font-size:13px;line-height:1.6;max-width:820px;margin:0 auto}
  @page{size:A4 portrait;margin:1.5cm}
  @media print{body{padding:0}}
</style></head><body>

<div style="border-left:4px solid #3b82f6;padding:18px 22px;margin-bottom:28px;background:#f8fafc;border-radius:0 12px 12px 0;">
  <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Retrokarir · AI Career Intelligence Advisor</div>
  <h1 style="font-size:22px;font-weight:900;letter-spacing:-1.5px;margin-bottom:6px;white-space:nowrap;">Laporan Analisis Karier</h1>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <span style="font-size:13px;color:#475569;font-weight:500;">${r.profilRingkas?.nama || meta.fullName}</span>
    <span style="color:#cbd5e1;">·</span><span style="font-size:13px;color:#475569;">${r.profilRingkas?.usia||''} tahun</span>
    <span style="color:#cbd5e1;">·</span>
    <span style="background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;">✦ ${meta.modelName||'Gemini AI'}</span>
    ${r.profilRingkas?.bidangKarier?`<span style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;">${r.profilRingkas.bidangKarier}</span>`:''}
  </div>
</div>

${r.ringkasanAwam?h2('💬 Penjelasan Sederhana')+`<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">${
  [['situasiSekarang','Posisi kamu saat ini','📍','#3b82f6'],['kelebihanUtama','Yang sudah kamu miliki','✨','#22c55e'],['yangPerluDitambah','Peluang yang bisa dikembangkan','🌱','#f59e0b'],['langkahPertama','Mulai dari mana?','👣','#8b5cf6'],['pesanPenyemangat','Pesan untukmu','💪','#ef4444']]
  .map(([k,l,ic,c])=>{const t=r.ringkasanAwam[k];if(!t)return'';return`<div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9;"><span style="font-size:16px;flex-shrink:0;">${ic}</span><div><div style="font-size:10px;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px;">${l}</div><p style="font-size:13px;color:#334155;line-height:1.6;margin:0;">${t}</p></div></div>`}).join('')
}</div>`:''}

${r.pemetaanKompetensi ? h2('📊 Pemetaan Kompetensi') + `<p style="font-size:11px;color:#64748b;font-style:italic;margin:0 0 12px;">Berdasarkan 4 pilar Global Skills Taxonomy (WEF) dan kerangka SKKNI bidang terkait.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${
  [['analyticalThinking','🧠','Analytical Thinking'],['resilienceAgility','🔄','Resilience & Agility'],['aiAndDigital','💻','AI & Digital Literacy'],['interpersonalLeadership','🤝','Interpersonal & Leadership']]
  .map(([k,ic,l])=>{const d=r.pemetaanKompetensi[k];if(!d)return'';const c=sc(clampScore(d.skor));return`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;break-inside:avoid;page-break-inside:avoid;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;"><span style="font-size:11px;font-weight:700;color:#0f172a;">${ic} ${l}</span><strong style="font-size:13px;color:${c};">${d.skor}</strong></div>${bar(clampScore(d.skor),c)}${Array.isArray(d.kekuatan)?d.kekuatan.map(s=>`<div style="font-size:10px;color:#16a34a;padding:1px 0;line-height:1.4;">✓ ${safeString(s)}</div>`).join(''):''}${Array.isArray(d.celah)?d.celah.map(s=>`<div style="font-size:10px;color:#d97706;padding:1px 0;line-height:1.4;">△ ${safeString(s)}</div>`).join(''):''}</div>`;}).join('')
}</div>` : ''}

${r.analisisRisiko ? (()=>{const rc={Rendah:'#22c55e',Sedang:'#f59e0b',Tinggi:'#ef4444'};const lv=r.analisisRisiko.level||'';const col=rc[lv]||'#64748b';return h2('⚠️ Analisis Risiko Karier')+`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;"><span style="background:${col}18;color:${col};border:1px solid ${col}44;border-radius:999px;padding:4px 14px;font-size:11px;font-weight:800;">${safeString(lv)}</span>${r.analisisRisiko.persentaseRisiko?`<span style="font-size:16px;font-weight:900;color:${col};">${r.analisisRisiko.persentaseRisiko}%</span>`:''} ${r.analisisRisiko.konteksBenchmark?`<span style="font-size:10px;color:#94a3b8;font-style:italic;">${safeString(r.analisisRisiko.konteksBenchmark)}</span>`:''}</div>${r.analisisRisiko.persentaseRisiko?bar(r.analisisRisiko.persentaseRisiko,col):''}${r.analisisRisiko.penjelasan?`<p style="font-size:12px;color:#475569;line-height:1.65;margin:8px 0 10px;">${safeString(r.analisisRisiko.penjelasan)}</p>`:''}${Array.isArray(r.analisisRisiko.faktorRisiko)?r.analisisRisiko.faktorRisiko.map(f=>`<div style="font-size:11px;color:#ef4444;padding:3px 8px;background:#fef2f2;border-radius:6px;margin-bottom:4px;">⚠ ${safeString(f)}</div>`).join(''):''}`;})() : ''}

${r.kataKunciJobSeeker?h2('🔍 Kata Kunci Job Seeker')+`<div style="display:flex;flex-direction:column;gap:10px;">${
  [['posisi','Posisi / Jabatan','#22c55e','#f0fdf4','#bbf7d0'],['keahlian','Keahlian & Skill','#8b5cf6','#f5f3ff','#ddd6fe']]
  .map(([k,l,c,bg,b])=>{const items=r.kataKunciJobSeeker[k];if(!items?.length)return'';return`<div><div style="font-size:10px;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;">${l}</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${items.map(it=>pill(it,c,bg,b)).join('')}</div></div>`}).join('')
}</div>`:''}

${cvRows ? h2('📝 Saran Perbaikan CV') + `
  <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:visible;padding:0 16px;">
    ${cvRows}
  </div>
` : ''}

${r.marketValue && Object.keys(r.marketValue).length > 1 ? h2('💰 Estimasi Market Value') + `
  <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:visible;padding:0 16px;break-inside:auto;page-break-inside:auto;">
    ${mvRows}
  </div>
  ${r.marketValue.catatan ? `<p style="font-size:10.5px;color:#94a3b8;font-style:italic;line-height:1.55;margin-top:6px;overflow-wrap:anywhere;word-break:break-word;">${r.marketValue.catatan}</p>` : ''}
` : ''}

${r.rekomendasiAkhir?`<div style="background:linear-gradient(135deg,#eff6ff,#f8fafc);border:2px solid #3b82f6;border-radius:14px;padding:22px 26px;margin-top:28px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><span style="font-size:18px;">💡</span><span style="font-size:13px;font-weight:900;color:#3b82f6;letter-spacing:-.3px;white-space:nowrap;">Rekomendasi Akhir</span></div><p style="font-size:13px;line-height:1.8;color:#0f172a;">${r.rekomendasiAkhir}</p></div>`:''}

${quickWinsRows ? h2('⚡ Mulai Minggu Ini') + `
  <p style="font-size:11px;color:#64748b;margin:0 0 10px;font-style:italic;line-height:1.55;">Tiga langkah kecil yang bisa dilakukan sekarang — tanpa menunggu kondisi sempurna.</p>
  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:0 16px;">
    ${quickWinsRows}
  </div>
` : ''}

<div style="text-align:center;font-size:10px;color:#94a3b8;margin-top:36px;padding-top:14px;border-top:1px solid #e2e8f0;">
  Dibuat oleh <strong style="color:#475569;">Retrokarir</strong> · AI Career Intelligence Advisor · ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})} · oleh <a href="https://affandymurad.github.io/" style="color:#3b82f6;text-decoration:none;font-weight:700;">Affandy Murad</a> @ 2026
</div></body></html>`;

    // Gunakan Blob URL agar browser tidak menampilkan "about:blank" atau
    // URL di header/footer cetak. Title dikosongkan via JS setelah load.
    // Ini pendekatan terbaik dari sisi kode; user tetap perlu uncheck
    // "Headers and footers" di dialog print Chrome untuk PDF yang bersih.
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    const cleanup = () => URL.revokeObjectURL(blobUrl);
    if (!win) { cleanup(); return; }
    win.addEventListener('load', () => {
      win.document.title = '';
      setTimeout(() => {
        win.print();
        win.addEventListener('afterprint', () => { win.close(); cleanup(); }, { once: true });
        // fallback close jika afterprint tidak fired (Safari)
        setTimeout(() => { try { win.close(); } catch(_) {} cleanup(); }, 2000);
      }, 200);
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={onBack}><BackIcon /> Analisis Baru</button>
          <button className={styles.downloadBtn} onClick={handleDownload}><DownloadIcon /> Download PDF</button>
        </div>
      </div>

      <div className={styles.container} ref={printRef}>
        <div className={styles.reportHeader}>
          <h1>Laporan Analisis Karier</h1>
          <div className={styles.metaLine}>
            <span>{result.profilRingkas?.nama || meta.fullName}</span>
            <span>·</span>
            <span>{result.profilRingkas?.usia || ''} tahun</span>
            <span>·</span>
            <span className={styles.aiBadge}>
              ✦ {meta.modelName || 'Gemini AI'}
            </span>
          </div>
          {result.profilRingkas?.bidangKarier && (
            <div className={styles.bidangChip}>{result.profilRingkas.bidangKarier}</div>
          )}
        </div>

        {/* 1 — Penjelasan Sederhana */}
        {result.ringkasanAwam && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>💬 Penjelasan Sederhana</h2>
            <p className={styles.awamIntro}>Versi ringkas dalam bahasa sehari-hari — cocok dibagikan ke keluarga atau teman.</p>
            <div className={styles.awamCard}>
              {[
                { key:'situasiSekarang',   label:'Posisi kamu saat ini',          icon:'📍', color:'#3b82f6' },
                { key:'kelebihanUtama',    label:'Yang sudah kamu miliki',         icon:'✨', color:'#22c55e' },
                { key:'yangPerluDitambah', label:'Peluang yang bisa dikembangkan', icon:'🌱', color:'#f59e0b' },
                { key:'langkahPertama',    label:'Mulai dari mana?',               icon:'👣', color:'#8b5cf6' },
                { key:'pesanPenyemangat',  label:'Pesan untukmu',                  icon:'💪', color:'#ef4444' },
              ].map(({ key, label, icon, color }) => {
                const text = result.ringkasanAwam[key];
                if (!text) return null;
                return (
                  <div key={key} className={styles.awamRow} style={{'--awam-color': color}}>
                    <div className={styles.awamIcon}>{icon}</div>
                    <div className={styles.awamContent}>
                      <div className={styles.awamLabel}>{label}</div>
                      <p className={styles.awamText}>{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {/* 2e — Pemetaan Kompetensi */}
        {result.pemetaanKompetensi && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📊 Pemetaan Kompetensi</h2>
            <p className={styles.objectiveHint}>Berdasarkan 4 pilar Global Skills Taxonomy (WEF) dan kerangka SKKNI bidang terkait.</p>
            <div className={styles.pillarGrid}>
              {Object.entries(PILLAR_LABELS).map(([key, { label, icon }]) => {
                const d = result.pemetaanKompetensi[key];
                if (!d) return null;
                const scoreC = getScoreColor(clampScore(d.skor));
                return (
                  <div key={key} className={styles.pillarCard}>
                    <div className={styles.pillarHeader}>
                      <span className={styles.pillarIcon}>{icon}</span>
                      <span className={styles.pillarLabel}>{label}</span>
                      <span className={styles.pillarScore} style={{color: scoreC}}>{d.skor}</span>
                    </div>
                    <ScoreBar value={clampScore(d.skor)} color={scoreC} />
                    {Array.isArray(d.kekuatan) && d.kekuatan.length > 0 && (
                      <div className={styles.pillarItems}>
                        {d.kekuatan.map((k, i) => <div key={i} className={styles.pillarStrength}>✓ {safeString(k)}</div>)}
                      </div>
                    )}
                    {Array.isArray(d.celah) && d.celah.length > 0 && (
                      <div className={styles.pillarItems}>
                        {d.celah.map((c, i) => <div key={i} className={styles.pillarGap}>△ {safeString(c)}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2f — Analisis Risiko */}
        {result.analisisRisiko && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>⚠️ Analisis Risiko Karier</h2>
            <div className={styles.riskCard}>
              <div className={styles.riskTop}>
                <div className={styles.riskLevelWrap}>
                  <span className={styles.riskLevelLabel}>Tingkat Risiko</span>
                  <span className={styles.riskLevelBadge} style={{background: `${RISK_COLOR[result.analisisRisiko.level]}18`, color: RISK_COLOR[result.analisisRisiko.level], border: `1px solid ${RISK_COLOR[result.analisisRisiko.level]}44`}}>
                    {safeString(result.analisisRisiko.level)}
                  </span>
                </div>
                {result.analisisRisiko.persentaseRisiko > 0 && (
                  <div className={styles.riskPercent}>
                    <span className={styles.riskPercentNum} style={{color: RISK_COLOR[result.analisisRisiko.level]}}>{result.analisisRisiko.persentaseRisiko}%</span>
                    <ScoreBar value={result.analisisRisiko.persentaseRisiko} color={RISK_COLOR[result.analisisRisiko.level]} />
                    {result.analisisRisiko.konteksBenchmark && <p className={styles.riskBenchmark}>{safeString(result.analisisRisiko.konteksBenchmark)}</p>}
                  </div>
                )}
              </div>
              {result.analisisRisiko.penjelasan && (
                <p className={styles.riskExplain}>{safeString(result.analisisRisiko.penjelasan)}</p>
              )}
              {Array.isArray(result.analisisRisiko.faktorRisiko) && result.analisisRisiko.faktorRisiko.length > 0 && (
                <div className={styles.riskFactors}>
                  {result.analisisRisiko.faktorRisiko.map((f, i) => (
                    <div key={i} className={styles.riskFactor}>⚠ {safeString(f)}</div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3 — Kata Kunci Job Seeker */}
        {result.kataKunciJobSeeker && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🔍 Kata Kunci untuk LinkedIn & Job Portal</h2>
            <p className={styles.kataKunciHint}>
              Tempel kata kunci ini ke headline LinkedIn, deskripsi Jobstreet/Glints, atau ringkasan CV kamu agar lebih mudah ditemukan recruiter. Klik untuk menyalin.
            </p>
            <div className={styles.kataKunciGroups}>
              {[
                { key:'posisi',   label:'Posisi / Jabatan', icon:'💼', color:'#22c55e' },
                { key:'keahlian', label:'Keahlian & Skill',  icon:'⚡', color:'#8b5cf6' },
              ].map(({ key, label, icon, color }) => {
                const items = result.kataKunciJobSeeker[key];
                if (!items?.length) return null;
                return (
                  <div key={key} className={styles.kataKunciGroup}>
                    <div className={styles.kataKunciGroupLabel} style={{ color }}>{icon} {label}</div>
                    <div className={styles.kataKunciPills}>
                      {items.map((item, i) => {
                        const uid = `${key}-${i}`;
                        const copied = copiedKey === uid;
                        return (
                          <button key={i}
                            className={`${styles.kataKunciPill} ${copied ? styles.kataKunciPillCopied:''}`}
                            style={{'--kk-color': color}}
                            onClick={() => handleCopy(item, uid)}
                            title="Klik untuk menyalin"
                          >
                            {copied ? <CopyCheckIcon /> : <CopyIcon />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 8 — Saran Perbaikan CV */}
        {Array.isArray(result.cvRewriteAdvice) && result.cvRewriteAdvice.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📝 Saran Perbaikan CV</h2>
            <p className={styles.objectiveHint}>
              Saran ini diarahkan agar CV lebih mudah dibaca recruiter dan lebih kuat untuk target role berikutnya.
            </p>

            <div className={styles.cvAdviceList}>
              {result.cvRewriteAdvice.map((item, i) => {
                const color = CONFIDENCE_COLOR[item.prioritas] || '#64748b';

                return (
                  <div key={i} className={styles.cvAdviceItem} style={{ '--priority-color': color }}>
                    <div className={styles.cvAdviceHeader}>
                      <strong>{safeString(item.bagianCV)}</strong>
                      <span>{safeString(item.prioritas)}</span>
                    </div>
                    <p><strong>Masalah:</strong> {safeString(item.masalah)}</p>
                    <p><strong>Saran:</strong> {safeString(item.saranPerbaikan)}</p>
                    {item.contohKalimat && (
                      <blockquote>{safeString(item.contohKalimat)}</blockquote>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* 9 — Market Value */}
        {result.marketValue && Object.keys(result.marketValue).length > 1 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>💰 Estimasi Market Value</h2>
            <p className={styles.objectiveHint}>
              Estimasi konservatif-rasional berdasarkan bukti CV, bukan angka ideal. Konversi Rupiah dalam tanda kurung memakai kurs perkiraan dan bisa berubah — gunakan sebagai gambaran kasar, bukan angka final.
            </p>
            <div className={styles.marketCard}>
              {Object.entries(result.marketValue)
                .filter(([k]) => k !== 'catatan')
                .map(([loc, val], i) => (
                  <div key={i} className={styles.marketRow}>
                    <span className={styles.marketLoc}>{safeString(loc)}</span>
                    <div className={styles.marketVal}>{injectIdrConversion(safeString(val))}</div>
                  </div>
                ))}
              {result.marketValue.catatan && (
                <p className={styles.marketNote}>{safeString(result.marketValue.catatan)}</p>
              )}
            </div>
          </section>
        )}

        {/* 10 — Rekomendasi Akhir */}
        {result.rekomendasiAkhir && (
          <section className={styles.section}>
            <div className={styles.finalCard}>
              <div className={styles.finalIcon}>💡</div>
              <div className={styles.finalBody}>
                <div className={styles.finalLabel}>Rekomendasi Akhir</div>
                <p className={styles.finalText}>{result.rekomendasiAkhir}</p>
              </div>
            </div>
          </section>
        )}

        {/* 11 — Quick Wins */}
        {Array.isArray(result.quickWins) && result.quickWins.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>⚡ Mulai Minggu Ini</h2>
            <p className={styles.objectiveHint}>
              Tiga langkah kecil yang bisa kamu lakukan sekarang — tanpa harus menunggu kondisi sempurna.
            </p>
            <div className={styles.quickWinsList}>
              {result.quickWins.map((item, i) => (
                <div key={i} className={styles.quickWinItem}>
                  <div className={styles.quickWinNum}>{i + 1}</div>
                  <div className={styles.quickWinBody}>
                    <div className={styles.quickWinAksi}>{safeString(item.aksi)}</div>
                    <p className={styles.quickWinAlasan}>{safeString(item.alasan)}</p>
                    <span className={styles.quickWinTime}>⏱ {safeString(item.estimasiWaktu)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className={styles.privacyNotice}>
          <span className={styles.privacyIcon}>🔒</span>
          <div>
            <span className={styles.privacyTitle}>Catatan Privasi</span>
            <span className={styles.privacyText}>
              Data CV dan informasi pribadi Anda <strong>tidak disimpan</strong> di server kami. Semua pemrosesan bersifat sementara — teks CV hanya diteruskan ke API Google Gemini untuk analisis, lalu langsung dibuang setelah laporan selesai.
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          Dibuat oleh Retrokarir · AI Career Intelligence Advisor · {new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})} · oleh{' '}
          <a href="https://affandymurad.github.io/" target="_blank" rel="noopener noreferrer"
            style={{color:'var(--accent)',textDecoration:'none',fontWeight:600}}>Affandy Murad</a> @ 2026
        </div>
      </div>
    </div>
  );
}

function CopyIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function CopyCheckIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>; }
function BackIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,5 5,12 12,19"/></svg>; }
function DownloadIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }