import React, { useRef, useState } from 'react';
import styles from './ResultPage.module.css';

const RISK_COLOR = { Rendah: '#22c55e', Sedang: '#f59e0b', Tinggi: '#ef4444' };
const PILLAR_LABELS = {
  kognitif: 'Kognitif', interpersonal: 'Interpersonal',
  selfLeadership: 'Self-Leadership', digital: 'Digital'
};
const FP_LABELS = {
  aiResistance:          { label: 'AI Resistance',          icon: '🤖' },
  leadershipPotential:   { label: 'Leadership Potential',   icon: '👥' },
  globalMobility:        { label: 'Global Mobility',        icon: '🌏' },
  technicalDepth:        { label: 'Technical Depth',        icon: '⚡' },
};
const SMART_CAT_COLOR = {
  'Pelatihan':'#22c55e','Kompetisi':'#f59e0b','Sertifikasi':'#8b5cf6',
  'Aksi Jangka Pendek':'#22c55e','Aksi Jangka Menengah':'#f59e0b','Aksi Jangka Panjang':'#8b5cf6'
};
const SMART_CAT_ICON = {
  'Pelatihan':'📚','Kompetisi':'🏆','Sertifikasi':'📜',
  'Aksi Jangka Pendek':'⚡','Aksi Jangka Menengah':'📈','Aksi Jangka Panjang':'🎯'
};

const CONFIDENCE_COLOR = {
  Tinggi: '#22c55e',
  Sedang: '#f59e0b',
  Rendah: '#ef4444',
};

const ROLE_STATUS_COLOR = {
  'Realistis Sekarang': '#22c55e',
  'Dekat / Perlu Pembuktian': '#f59e0b',
  Aspiratif: '#8b5cf6',
};

function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    return Object.values(value).filter(v => typeof v === 'string').join(' ');
  }
  return String(value);
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
    const riskColor = RISK_COLOR[r.analisisRisiko?.level] || '#f59e0b';
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
                ${safeString(val)}
              </div>
            </div>
          `).join('')
      : '';

    const fpRows = r.futureProofScore
      ? Object.entries(FP_LABELS).map(([key, { label, icon }]) => {
          const d = r.futureProofScore[key]; if (!d) return '';
          return `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;"><span style="font-size:12px;font-weight:600;">${icon} ${label}</span><strong style="color:${sc(d.skor)};font-size:13px;">${d.skor}/100</strong></div>${bar(d.skor,sc(d.skor))}${d.keterangan?`<p style="font-size:11px;color:#64748b;margin:0;">${d.keterangan}</p>`:''}</div>`;
        }).join('')
      : '';
    
        const evidenceRows = Array.isArray(r.evidenceMapping)
      ? r.evidenceMapping.map(item => {
          const c = CONFIDENCE_COLOR[item.tingkatKeyakinan] || '#64748b';
          return `
            <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;break-inside:avoid;page-break-inside:avoid;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px;">
                <strong style="font-size:12px;color:#0f172a;line-height:1.4;">${safeString(item.klaim)}</strong>
                <span style="background:${c}18;color:${c};border:1px solid ${c}44;border-radius:999px;padding:2px 8px;font-size:9px;font-weight:800;white-space:nowrap;">${safeString(item.tingkatKeyakinan)}</span>
              </div>
              <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 3px;"><strong>Bukti CV:</strong> ${safeString(item.buktiCV)}</p>
              ${item.catatanKalibrasi ? `<p style="font-size:11px;color:#64748b;line-height:1.55;margin:0;"><strong>Kalibrasi:</strong> ${safeString(item.catatanKalibrasi)}</p>` : ''}
            </div>
          `;
        }).join('')
      : '';

    const roleFitRows = Array.isArray(r.roleFitMatrix)
      ? r.roleFitMatrix.map(item => {
          const score = clampScore(item.kecocokan);
          const c = ROLE_STATUS_COLOR[item.status] || sc(score);
          return `
            <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;break-inside:avoid;page-break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:5px;">
                <div>
                  <strong style="font-size:12px;color:#0f172a;line-height:1.4;">${safeString(item.role)}</strong>
                  <div style="margin-top:3px;">
                    <span style="background:${c}18;color:${c};border:1px solid ${c}44;border-radius:999px;padding:2px 8px;font-size:9px;font-weight:800;">${safeString(item.status)}</span>
                  </div>
                </div>
                <strong style="font-size:14px;color:${sc(score)};white-space:nowrap;">${score}%</strong>
              </div>
              ${bar(score, sc(score))}
              <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 3px;">${safeString(item.alasan)}</p>
              <p style="font-size:11px;color:#64748b;line-height:1.55;margin:0;"><strong>Syarat naik level:</strong> ${safeString(item.syaratNaikLevel)}</p>
            </div>
          `;
        }).join('')
      : '';

    const gapRows = Array.isArray(r.actionableGap)
      ? r.actionableGap.map(item => `
        <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;break-inside:avoid;page-break-inside:avoid;">
          <strong style="font-size:12px;color:#0f172a;display:block;margin-bottom:4px;line-height:1.4;">${safeString(item.area)}</strong>
          <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 3px;"><strong>Dampak:</strong> ${safeString(item.dampak)}</p>
          <p style="font-size:11px;color:#475569;line-height:1.55;margin:0 0 3px;"><strong>Bukti perlu ditambah:</strong> ${safeString(item.buktiYangPerluDitambah)}</p>
          <p style="font-size:11px;color:#64748b;line-height:1.55;margin:0;"><strong>6 bulan:</strong> ${safeString(item.langkah6Bulan)}</p>
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

${r.kataKunciJobSeeker?h2('🔍 Kata Kunci Job Seeker')+`<div style="display:flex;flex-direction:column;gap:10px;">${
  [['posisi','Posisi / Jabatan','#22c55e','#f0fdf4','#bbf7d0'],['keahlian','Keahlian & Skill','#8b5cf6','#f5f3ff','#ddd6fe']]
  .map(([k,l,c,bg,b])=>{const items=r.kataKunciJobSeeker[k];if(!items?.length)return'';return`<div><div style="font-size:10px;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;">${l}</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${items.map(it=>pill(it,c,bg,b)).join('')}</div></div>`}).join('')
}</div>`:''}

${r.futureProofScore?h2('🛡 Future-Proof & Risiko Otomasi')+`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:10px;">${fpRows}</div>${
  r.analisisRisiko?`<div style="
    border:1px solid #e2e8f0;
    border-top:3px solid ${riskColor};
    border-radius:10px;
    padding:16px;
    break-inside:avoid;
    page-break-inside:avoid;
  ">
    <div style="
      font-size:10px;
      font-weight:900;
      color:#64748b;
      text-transform:uppercase;
      letter-spacing:.9px;
      margin-bottom:10px;
    ">
      Risiko Otomasi
    </div>

    <div style="
      display:flex;
      align-items:flex-start;
      gap:12px;
      margin-bottom:10px;
      flex-wrap:wrap;
    ">
      <span style="
        background:${riskColor}18;
        color:${riskColor};
        border:1px solid ${riskColor}44;
        border-radius:999px;
        padding:3px 12px;
        font-weight:800;
        font-size:11px;
        line-height:1.4;
      ">
        ${r.analisisRisiko.level}
      </span>

      <div style="display:flex;flex-direction:column;gap:3px;">
        <span style="
          font-size:24px;
          font-weight:900;
          color:${riskColor};
          letter-spacing:-1px;
          line-height:1;
        ">
          ${r.analisisRisiko.persentaseRisiko}%
        </span>

        ${r.analisisRisiko.konteksBenchmark ? `
          <span style="
            font-size:10px;
            color:#94a3b8;
            font-style:italic;
            line-height:1.35;
          ">
            📊 ${r.analisisRisiko.konteksBenchmark}
          </span>
        ` : ''}
      </div>
    </div>

    <div style="
      height:6px;
      background:#e2e8f0;
      border-radius:999px;
      overflow:hidden;
      margin:4px 0 10px;
    ">
      <div style="
        width:${r.analisisRisiko.persentaseRisiko}%;
        height:100%;
        background:${riskColor};
        border-radius:999px;
      "></div>
    </div>

    <p style="
      font-size:12px;
      color:#475569;
      line-height:1.6;
      margin:0 0 8px;
    ">
      ${r.analisisRisiko.penjelasan}
    </p>

    <div>
      ${r.analisisRisiko.faktorRisiko?.map(f => {
        const t = typeof f === 'string'
          ? f
          : Object.values(f).filter(v => typeof v === 'string').join(' ');
        return pill(t, '#92400e', '#fffbeb', '#fde68a');
      }).join('') || ''}
    </div>
  </div>`:''
}`:''}

${r.careerRisk?h2('⚠ Strategic Career Risk & Solusi')+`<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
  <div style="display:grid;grid-template-columns:1fr 1fr;">
    <div style="padding:14px 16px;border-right:1px solid #f1f5f9;"><div style="font-size:10px;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;">Salary Ceiling Risk</div><p style="font-size:12px;color:#334155;line-height:1.6;margin:0;">${r.careerRisk.salaryCeilingRisk}</p></div>
    <div style="padding:14px 16px;"><div style="font-size:10px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;">Stagnation Risk</div><p style="font-size:12px;color:#334155;line-height:1.6;margin:0;">${r.careerRisk.stagnationRisk}</p></div>
  </div>
  ${r.careerRisk.penyebab?.length?`<div style="padding:12px 16px;border-top:1px solid #f1f5f9;"><div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;">Faktor Penyebab</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${r.careerRisk.penyebab.map(f=>pill(f,'#92400e','#fffbeb','#fde68a')).join('')}</div></div>`:''}
  ${r.careerRisk.solusiStrategis?.length?`<div style="padding:14px 16px;border-top:1px solid #f1f5f9;"><div style="font-size:10px;font-weight:800;color:#22c55e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Solusi Strategis</div>${r.careerRisk.solusiStrategis.map((s,i)=>`<div style="display:flex;gap:10px;margin-bottom:8px;${i<r.careerRisk.solusiStrategis.length-1?'padding-bottom:8px;border-bottom:1px solid #f1f5f9;':''}"><span style="width:20px;height:20px;border-radius:50%;background:#22c55e;color:white;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i+1}</span><p style="font-size:12px;color:#334155;line-height:1.6;margin:0;">${s}</p></div>`).join('')}</div>`:''}
</div>`:''}

${evidenceRows ? h2('🧾 Evidence Mapping') + `
  <div style="
    border:1px solid #e2e8f0;
    border-radius:10px;
    overflow:visible;
    padding:0 16px;
  ">
    ${evidenceRows}
  </div>
` : ''}

${roleFitRows ? h2('🎯 Role Fit Matrix') + `
  <div style="
    border:1px solid #e2e8f0;
    border-radius:10px;
    overflow:visible;
    padding:0 16px;
  ">
    ${roleFitRows}
  </div>
` : ''}

${gapRows ? h2('🧩 Actionable Gap') + `
  <div style="
    border:1px solid #e2e8f0;
    border-radius:10px;
    overflow:visible;
    padding:0 16px;
  ">
    ${gapRows}
  </div>
` : ''}

${cvRows ? h2('📝 Saran Perbaikan CV') + `
  <div style="
    border:1px solid #e2e8f0;
    border-radius:10px;
    overflow:visible;
    padding:0 16px;
  ">
    ${cvRows}
  </div>
` : ''}

${r.marketValue && Object.keys(r.marketValue).length > 1 ? h2('💰 Estimasi Market Value') + `
  <div style="
    border:1px solid #e2e8f0;
    border-radius:10px;
    overflow:visible;
    padding:0 16px;
    break-inside:auto;
    page-break-inside:auto;
  ">
    ${mvRows}
  </div>
  ${r.marketValue.catatan ? `
    <p style="
      font-size:10.5px;
      color:#94a3b8;
      font-style:italic;
      line-height:1.55;
      margin-top:6px;
      overflow-wrap:anywhere;
      word-break:break-word;
    ">
      ${r.marketValue.catatan}
    </p>
  ` : ''}
` : ''}

${r.rekomendasiAkhir?`<div style="background:linear-gradient(135deg,#eff6ff,#f8fafc);border:2px solid #3b82f6;border-radius:14px;padding:22px 26px;margin-top:28px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><span style="font-size:18px;">💡</span><span style="font-size:13px;font-weight:900;color:#3b82f6;letter-spacing:-.3px;white-space:nowrap;">Rekomendasi Akhir</span></div><p style="font-size:13px;line-height:1.8;color:#0f172a;">${r.rekomendasiAkhir}</p></div>`:''}

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

  const p = result.pemetaanKompetensi;
  const riskColor = RISK_COLOR[result.analisisRisiko?.level] || '#f59e0b';

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

        {/* 2 — Kata Kunci Job Seeker */}
        {result.kataKunciJobSeeker && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🔍 Kata Kunci Job Seeker</h2>
            <p className={styles.kataKunciHint}>Klik tiap item untuk menyalin — tempel langsung ke LinkedIn, Jobstreet, Glints.</p>
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

        {/* 3 — Future-Proof + Risiko Otomasi */}
        {result.futureProofScore && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🛡 Future-Proof & Risiko Otomasi</h2>
            <div className={styles.fpGrid}>
              {Object.entries(FP_LABELS).map(([key, { label, icon }]) => {
                const d = result.futureProofScore[key];
                if (!d) return null;
                const scoreC = getScoreColor(d.skor);
                return (
                  <div key={key} className={styles.fpCard}>
                    <div className={styles.fpHeader}>
                      <span className={styles.fpIcon}>{icon}</span>
                      <span className={styles.fpLabel}>{label}</span>
                      <span className={styles.fpScore} style={{color: scoreC}}>{d.skor}</span>
                    </div>
                    <ScoreBar value={d.skor} color={scoreC} />
                    {d.keterangan && <p className={styles.fpNote}>{d.keterangan}</p>}
                  </div>
                );
              })}
            </div>

            {result.analisisRisiko && (
              <div className={styles.riskOtomasiCard} style={{'--risk-color': riskColor}}>
                <div className={styles.riskOtomasiLabel}>Risiko Otomasi</div>
                <div className={styles.riskHeader}>
                  <span className={styles.riskBadge} style={{background:`${riskColor}18`, color:riskColor}}>
                    {result.analisisRisiko.level}
                  </span>
                  <div className={styles.riskPctWrap}>
                    <span className={styles.riskPct}>{result.analisisRisiko.persentaseRisiko}%</span>
                    {result.analisisRisiko.konteksBenchmark && (
                      <span className={styles.riskBenchmark}>📊 {result.analisisRisiko.konteksBenchmark}</span>
                    )}
                  </div>
                </div>
                <div className={styles.riskBar}>
                  <div className={styles.riskBarFill} style={{width:`${result.analisisRisiko.persentaseRisiko}%`, background:riskColor}} />
                </div>
                <p className={styles.riskDesc}>{result.analisisRisiko.penjelasan}</p>
                {result.analisisRisiko.faktorRisiko?.length > 0 && (
                  <div className={styles.riskFactors}>
                    {result.analisisRisiko.faktorRisiko.map((f, i) => {
                      const text = typeof f==='string' ? f : Object.values(f).filter(v=>typeof v==='string').join(' ');
                      return <span key={i} className={styles.riskFactor}>{text}</span>;
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 4 — Strategic Career Risk */}
        {result.careerRisk && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>⚠ Strategic Career Risk & Solusi</h2>
            <div className={styles.riskFullCard}>
              <div className={styles.riskRiskRow}>
                <div className={styles.riskRiskItem} style={{'--risk-accent':'#ef4444'}}>
                  <div className={styles.riskRiskLabel}>Salary Ceiling Risk</div>
                  <p className={styles.riskRiskText}>{result.careerRisk.salaryCeilingRisk}</p>
                </div>
                <div className={styles.riskRiskItem} style={{'--risk-accent':'#f59e0b'}}>
                  <div className={styles.riskRiskLabel}>Stagnation Risk</div>
                  <p className={styles.riskRiskText}>{result.careerRisk.stagnationRisk}</p>
                </div>
              </div>
              {result.careerRisk.penyebab?.length > 0 && (
                <div className={styles.riskPenyebab}>
                  <div className={styles.riskPenyebabLabel}>Faktor Penyebab</div>
                  <div className={styles.riskFactors}>
                    {result.careerRisk.penyebab.map((f, i) => (
                      <span key={i} className={styles.riskFactor}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.careerRisk.solusiStrategis?.length > 0 && (
                <div className={styles.solusiList}>
                  <div className={styles.solusiLabel}>Solusi Strategis</div>
                  {result.careerRisk.solusiStrategis.map((s, i) => (
                    <div key={i} className={styles.solusiItem}>
                      <div className={styles.solusiNum}>{i + 1}</div>
                      <p className={styles.solusiText}>{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

                {/* 5 — Evidence Mapping */}
        {Array.isArray(result.evidenceMapping) && result.evidenceMapping.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🧾 Evidence Mapping</h2>
            <p className={styles.objectiveHint}>
              Bagian ini memisahkan klaim karier, bukti dari CV, dan tingkat keyakinannya agar laporan tidak sekadar terasa memuji.
            </p>

            <div className={styles.evidenceList}>
              {result.evidenceMapping.map((item, i) => {
                const color = CONFIDENCE_COLOR[item.tingkatKeyakinan] || '#64748b';

                return (
                  <div key={i} className={styles.evidenceItem} style={{ '--ev-color': color }}>
                    <div className={styles.evidenceHeader}>
                      <strong>{safeString(item.klaim)}</strong>
                      <span className={styles.confidenceBadge}>{safeString(item.tingkatKeyakinan)}</span>
                    </div>
                    <p><span>Bukti CV:</span> {safeString(item.buktiCV)}</p>
                    {item.catatanKalibrasi && (
                      <p><span>Kalibrasi:</span> {safeString(item.catatanKalibrasi)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6 — Role Fit Matrix */}
        {Array.isArray(result.roleFitMatrix) && result.roleFitMatrix.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🎯 Role Fit Matrix</h2>
            <p className={styles.objectiveHint}>
              Matriks ini membedakan role yang realistis saat ini, role dekat yang perlu pembuktian, dan role aspiratif.
            </p>

            <div className={styles.roleFitList}>
              {result.roleFitMatrix.map((item, i) => {
                const score = clampScore(item.kecocokan);
                const scoreColor = getScoreColor(score);
                const statusColor = ROLE_STATUS_COLOR[item.status] || scoreColor;

                return (
                  <div key={i} className={styles.roleFitItem} style={{ '--status-color': statusColor }}>
                    <div className={styles.roleFitTop}>
                      <div>
                        <div className={styles.roleFitRole}>{safeString(item.role)}</div>
                        <span className={styles.roleFitStatus}>{safeString(item.status)}</span>
                      </div>
                      <div className={styles.roleFitScore} style={{ color: scoreColor }}>{score}%</div>
                    </div>

                    <ScoreBar value={score} color={scoreColor} />

                    <p className={styles.roleFitReason}>{safeString(item.alasan)}</p>
                    <p className={styles.roleFitNeed}>
                      <strong>Syarat naik level:</strong> {safeString(item.syaratNaikLevel)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7 — Actionable Gap */}
        {Array.isArray(result.actionableGap) && result.actionableGap.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🧩 Actionable Gap</h2>
            <p className={styles.objectiveHint}>
              Gap berikut bukan kelemahan permanen, tetapi bukti tambahan yang perlu dibangun agar nilai pasar lebih kuat.
            </p>

            <div className={styles.gapGrid}>
              {result.actionableGap.map((item, i) => (
                <div key={i} className={styles.gapCard}>
                  <div className={styles.gapNum}>{i + 1}</div>
                  <div className={styles.gapBody}>
                    <div className={styles.gapArea}>{safeString(item.area)}</div>
                    <p><strong>Dampak:</strong> {safeString(item.dampak)}</p>
                    <p><strong>Bukti perlu ditambah:</strong> {safeString(item.buktiYangPerluDitambah)}</p>
                    <p><strong>Langkah 6 bulan:</strong> {safeString(item.langkah6Bulan)}</p>
                  </div>
                </div>
              ))}
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
            <div className={styles.marketCard}>
              {Object.entries(result.marketValue)
                .filter(([k]) => k !== 'catatan')
                .map(([loc, val], i) => (
                  <div key={i} className={styles.marketRow}>
                    <span className={styles.marketLoc}>{loc}</span>
                    <div className={styles.marketVal}>{val}</div>
                  </div>
                ))}
              {result.marketValue.catatan && (
                <p className={styles.marketNote}>{result.marketValue.catatan}</p>
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

        <div className={styles.privacyNotice}>
          <span className={styles.privacyIcon}>🔒</span>
          <div>
            <span className={styles.privacyTitle}>Catatan Privasi</span>
            <span className={styles.privacyText}>
              Data CV dan informasi pribadi Anda <strong>tidak disimpan</strong> di server manapun. Semua pemrosesan bersifat sementara dan langsung dibuang setelah analisis selesai.
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