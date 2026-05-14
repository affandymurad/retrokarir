import React, { useRef, useState } from 'react';
import styles from './ResultPage.module.css';

const RISK_COLOR = { Rendah: '#2D7A4F', Sedang: '#B87333', Tinggi: '#C23B3B' };
const PILLAR_LABELS = {
  kognitif: 'Kognitif',
  interpersonal: 'Interpersonal',
  selfLeadership: 'Self-Leadership',
  digital: 'Digital'
};

export default function ResultPage({ result, meta, onBack }) {
  const printRef = useRef();
  const [copiedKey, setCopiedKey] = useState(null);

  const handleDownload = () => {
    const r = result;
    const p = r.pemetaanKompetensi;
    const riskColor = RISK_COLOR[r.analisisRisiko?.level] || '#B87333';
    const pillarKeys = [
      ['kognitif', 'Kognitif'], ['interpersonal', 'Interpersonal'],
      ['selfLeadership', 'Self-Leadership'], ['digital', 'Digital']
    ];

    const pillTag = (txt, color = '#2D7A4F', bg = '#D0EDDE') =>
      `<span style="display:inline-block;background:${bg};color:${color};border:1px solid ${color};border-radius:999px;padding:4px 12px;font-size:11px;font-weight:600;margin:3px 4px 3px 0;">${txt}</span>`;

    const barTag = (score, color) =>
      `<div style="height:8px;background:#e2e8f0;border-radius:4px;margin:6px 0 12px;">
        <div style="height:8px;width:${score}%;background:${color};border-radius:4px;"></div>
      </div>`;

    const scoreColor = s => s >= 70 ? '#2D7A4F' : s >= 50 ? '#B87333' : '#C23B3B';

    const kompetensiHtml = pillarKeys.map(([key, label]) => {
      const d = p?.[key];
      if (!d) return '';
      const sc = scoreColor(d.skor);
      return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13px;">${label}</strong>
          <strong style="font-size:18px;color:${sc};">${d.skor}/100</strong>
        </div>
        ${barTag(d.skor, sc)}
        ${d.kekuatan?.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:700;color:#2D7A4F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">✓ Kekuatan</div><ul style="padding-left:16px;margin:0;">${d.kekuatan.map(k => `<li style="margin-bottom:3px;font-size:12px;">${k}</li>`).join('')}</ul></div>` : ''}
        ${d.celah?.length ? `<div><div style="font-size:11px;font-weight:700;color:#C23B3B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">✗ Celah</div><ul style="padding-left:16px;margin:0;">${d.celah.map(c => `<li style="margin-bottom:3px;font-size:12px;color:#C23B3B;">${c}</li>`).join('')}</ul></div>` : ''}
      </div>`;
    }).join('');

    const smartHtml = r.rencanaSMART?.length ? (() => {
      const CAT_COLOR = {
        'Pelatihan': '#2D7A4F', 'Kompetisi': '#B87333', 'Sertifikasi': '#7C3AED',
        'Aksi Jangka Pendek': '#2D7A4F', 'Aksi Jangka Menengah': '#B87333', 'Aksi Jangka Panjang': '#7C3AED'
      };
      const CAT_ICON = {
        'Pelatihan': '📚', 'Kompetisi': '🏆', 'Sertifikasi': '📜',
        'Aksi Jangka Pendek': '⚡', 'Aksi Jangka Menengah': '📈', 'Aksi Jangka Panjang': '🎯'
      };
      return r.rencanaSMART.map(item => {
        const c = CAT_COLOR[item.kategori] || '#3b82f6';
        const ic = CAT_ICON[item.kategori] || '▶';
        return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${c};border-radius:10px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="font-size:16px;">${ic}</span>
            <span style="font-size:11px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:.5px;">${item.kategori}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:10px;">${item.judul}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            ${[
              ['S — Spesifik', item.spesifik],
              ['M — Terukur', item.terukur],
              ['A — Dapat Dicapai', item.dapatDicapai],
              ['R — Relevan', item.relevan],
              ['T — Batas Waktu', item.batasWaktu],
            ].map(([lbl, val]) => `<tr>
              <td style="padding:4px 10px 4px 0;font-weight:700;color:${c};white-space:nowrap;vertical-align:top;width:130px;">${lbl}</td>
              <td style="padding:4px 0;color:#0f172a;line-height:1.5;">${val || ''}</td>
            </tr>`).join('')}
          </table>
        </div>`;
      }).join('');
    })() : '';

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Retrokarir — Laporan ${meta.fullName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: white; padding: 36px; font-size: 13px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
  h2 { font-size: 14px; font-weight: 700; margin: 28px 0 14px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; color: #3b82f6; text-transform: uppercase; letter-spacing: .5px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
  <div style="border-bottom:3px solid #3b82f6;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="font-size:24px;font-weight:800;letter-spacing:-1px;margin-bottom:6px;">Laporan Analisis Karier</h1>
    <div style="color:#475569;font-size:12px;margin-bottom:10px;">
      ${r.profilRingkas?.nama || meta.fullName} · ${r.profilRingkas?.usia || ''} tahun · ${meta.aiMode === 'gemini' ? '✦' : '⬡'} ${meta.modelName || (meta.aiMode === 'gemini' ? 'Gemini AI' : 'Sonnet AI')}
    </div>
    ${r.profilRingkas?.bidangKarier ? `<span style="display:inline-block;background:#eff6ff;color:#3b82f6;border:1px solid #3b82f6;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600;">${r.profilRingkas.bidangKarier}</span>` : ''}
  </div>

  ${r.ringkasanAwam ? `<h2>💬 Penjelasan Sederhana</h2>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:8px;">
    ${[
      ['situasiSekarang',   'Posisi kamu saat ini',            '📍', '#5B7FA6'],
      ['kelebihanUtama',    'Yang sudah kamu miliki',           '✨', '#2D7A4F'],
      ['yangPerluDitambah', 'Peluang yang bisa dikembangkan',   '🌱', '#B87333'],
      ['langkahPertama',    'Mulai dari mana?',                 '👣', '#7C3AED'],
      ['pesanPenyemangat',  'Pesan untukmu',                    '💪', '#3b82f6'],
    ].map(([key, label, icon, color]) => {
      const text = r.ringkasanAwam?.[key];
      if (!text) return '';
      return `<div style="display:flex;gap:14px;padding:14px 18px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:18px;flex-shrink:0;margin-top:2px;">${icon}</span>
        <div>
          <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${label}</div>
          <p style="font-size:13px;color:#0f172a;line-height:1.6;margin:0;">${text}</p>
        </div>
      </div>`;
    }).join('')}
  </div>` : ''}

  ${r.profilRingkas?.kekuatanUtama?.length ? `<h2>✦ Kekuatan Utama</h2>
  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
    ${r.profilRingkas.kekuatanUtama.map(k => pillTag(k)).join(' ')}
  </div>` : ''}

  ${r.kataKunciJobSeeker ? `<h2>🔍 Kata Kunci Job Seeker</h2>
  <div style="display:flex;flex-direction:column;gap:14px;">
    ${[
      ['posisi',   'Posisi / Jabatan',  '#2D7A4F'],
      ['keahlian', 'Keahlian & Skill',  '#7C3AED'],
    ].map(([key, label, color]) => {
      const items = r.kataKunciJobSeeker?.[key];
      if (!items?.length) return '';
      return `<div>
        <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">${label}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${items.map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid ${color}44;color:#0f172a;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:500;">${it}</span>`).join('')}</div>
      </div>`;
    }).join('')}
  </div>` : ''}

  ${r.rencanaSMART?.length ? `<h2>🎯 Rencana Pengembangan & Aksi (Metode SMART)</h2>
  <p style="font-size:11px;color:#475569;margin-bottom:14px;">Setiap rencana menggunakan kerangka SMART: <strong>S</strong>pesifik · <strong>M</strong>erukur · dapat di<strong>C</strong>apai · <strong>R</strong>elevan · berbatas <strong>W</strong>aktu</p>
  ${smartHtml}` : ''}

  <h2>⬡ Pemetaan Kompetensi</h2>
  ${kompetensiHtml}

  ${r.analisisRisiko ? `<h2>⚠ Analisis Risiko Otomasi</h2>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:4px;">
      <span style="background:${riskColor}22;color:${riskColor};border-radius:999px;padding:4px 14px;font-weight:700;font-size:13px;">${r.analisisRisiko.level}</span>
      <span style="font-size:28px;font-weight:800;color:${riskColor};">${r.analisisRisiko.persentaseRisiko}%</span>
    </div>
    ${r.analisisRisiko.konteksBenchmark ? `<p style="font-size:11px;color:#475569;font-style:italic;margin-bottom:8px;">📊 ${r.analisisRisiko.konteksBenchmark}</p>` : ''}
    ${barTag(r.analisisRisiko.persentaseRisiko, riskColor)}
    <p style="font-size:12px;color:#475569;margin-bottom:10px;">${r.analisisRisiko.penjelasan}</p>
    <div>${r.analisisRisiko.faktorRisiko?.map(f => pillTag(f, '#B87333', '#F5E6D3')).join(' ')}</div>
  </div>` : ''}

  ${r.rekomendasiAkhir ? `<div style="background:linear-gradient(135deg,#eff6ff,#f8fafc);border:2px solid #3b82f6;border-radius:14px;padding:24px 28px;margin-top:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <span style="font-size:22px;">💡</span>
      <span style="font-size:15px;font-weight:800;color:#3b82f6;letter-spacing:-.3px;">Rekomendasi Akhir</span>
    </div>
    <p style="font-size:14px;line-height:1.8;color:#0f172a;">${r.rekomendasiAkhir}</p>
  </div>` : ''}

  <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">
    Dibuat oleh Retrokarir · AI Skill Gap Advisor · ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} · oleh <a href="https://affandymurad.github.io/" style="color:#3b82f6;text-decoration:none;font-weight:600;">Affandy Murad</a> @ 2026
  </div>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const p = result.pemetaanKompetensi;
  const riskColor = RISK_COLOR[result.analisisRisiko?.level] || '#B87333';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={onBack}>
            <BackIcon /> Analisis Baru
          </button>
          <button className={styles.downloadBtn} onClick={handleDownload}>
            <DownloadIcon /> Download PDF
          </button>
        </div>
      </div>

      <div className={styles.container} ref={printRef}>
        {/* Header */}
        <div className={styles.reportHeader}>
          <h1>Laporan Analisis Karier</h1>
          <div className={styles.metaLine}>
            <span>{result.profilRingkas?.nama || meta.fullName}</span>
            <span>·</span>
            <span>{result.profilRingkas?.usia || ''} tahun</span>
            <span>·</span>
            <span className={styles.aiBadge}>
              {meta.aiMode === 'gemini' ? '✦' : '⬡'} {meta.modelName || (meta.aiMode === 'gemini' ? 'Gemini AI' : 'Sonnet AI')}
            </span>
          </div>
          {result.profilRingkas?.bidangKarier && (
            <div className={styles.bidangChip}>{result.profilRingkas.bidangKarier}</div>
          )}
        </div>

        {/* Kekuatan Utama */}
        {result.profilRingkas?.kekuatanUtama?.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>✦ Kekuatan Utama</h2>
            <div className={styles.pillList}>
              {result.profilRingkas.kekuatanUtama.map((k, i) => (
                <span key={i} className={styles.pillGreen}>{k}</span>
              ))}
            </div>
          </section>
        )}

        {/* 1. Penjelasan Sederhana — PALING ATAS */}
        {result.ringkasanAwam && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>💬 Penjelasan Sederhana</h2>
            <p className={styles.awamIntro}>Versi ringkas laporan ini dalam bahasa sehari-hari — cocok dibagikan ke keluarga atau teman yang ingin memahami hasilnya.</p>
            <div className={styles.awamCard}>
              {[
                { key: 'situasiSekarang',   label: 'Posisi kamu saat ini',            icon: '📍', color: '#5B7FA6' },
                { key: 'kelebihanUtama',    label: 'Yang sudah kamu miliki',           icon: '✨', color: '#2D7A4F' },
                { key: 'yangPerluDitambah', label: 'Peluang yang bisa dikembangkan',   icon: '🌱', color: '#B87333' },
                { key: 'langkahPertama',    label: 'Mulai dari mana?',                 icon: '👣', color: '#7C3AED' },
                { key: 'pesanPenyemangat',  label: 'Pesan untukmu',                    icon: '💪', color: '#3b82f6' },
              ].map(({ key, label, icon, color }) => {
                const text = result.ringkasanAwam[key];
                if (!text) return null;
                return (
                  <div key={key} className={styles.awamRow} style={{ '--awam-color': color }}>
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

        {/* Kekuatan Utama */}
        {result.profilRingkas?.kekuatanUtama?.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>✦ Kekuatan Utama</h2>
            <div className={styles.pillList}>
              {result.profilRingkas.kekuatanUtama.map((k, i) => (
                <span key={i} className={styles.pillGreen}>{k}</span>
              ))}
            </div>
          </section>
        )}

        {/* 2. Kata Kunci Job Seeker */}
        {result.kataKunciJobSeeker && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🔍 Kata Kunci Job Seeker</h2>
            <p className={styles.kataKunciHint}>Klik tiap item untuk menyalin — langsung tempel ke LinkedIn, Jobstreet, Glints, dan platform pencarian kerja lainnya.</p>
            <div className={styles.kataKunciGroups}>
              {[
                { key: 'posisi',   label: 'Posisi / Jabatan', icon: '💼', color: '#2D7A4F' },
                { key: 'keahlian', label: 'Keahlian & Skill',  icon: '⚡', color: '#7C3AED' },
              ].map(({ key, label, icon, color }) => {
                const items = result.kataKunciJobSeeker[key];
                if (!items?.length) return null;
                return (
                  <div key={key} className={styles.kataKunciGroup}>
                    <div className={styles.kataKunciGroupLabel} style={{ color }}>
                      {icon} {label}
                    </div>
                    <div className={styles.kataKunciPills}>
                      {items.map((item, i) => {
                        const uid = `${key}-${i}`;
                        const copied = copiedKey === uid;
                        return (
                          <button
                            key={i}
                            className={`${styles.kataKunciPill} ${copied ? styles.kataKunciPillCopied : ''}`}
                            style={{ '--kk-color': color }}
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

        {/* 3. Rencana SMART */}
        {result.rencanaSMART?.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🎯 Rencana Pengembangan & Aksi</h2>
            <p className={styles.smartIntro}>Setiap rencana disusun menggunakan metode <strong>SMART</strong> — <strong>S</strong>pesifik, <strong>M</strong>erukur, dapat di<strong>C</strong>apai, <strong>R</strong>elevan, dan berbatas <strong>W</strong>aktu — agar target jelas dan bisa langsung dieksekusi.</p>
            <div className={styles.smartList}>
              {result.rencanaSMART.map((item, i) => {
                const CAT_COLOR = {
                  'Pelatihan': '#2D7A4F', 'Kompetisi': '#B87333', 'Sertifikasi': '#7C3AED',
                  'Aksi Jangka Pendek': '#2D7A4F', 'Aksi Jangka Menengah': '#B87333', 'Aksi Jangka Panjang': '#7C3AED'
                };
                const CAT_ICON = {
                  'Pelatihan': '📚', 'Kompetisi': '🏆', 'Sertifikasi': '📜',
                  'Aksi Jangka Pendek': '⚡', 'Aksi Jangka Menengah': '📈', 'Aksi Jangka Panjang': '🎯'
                };
                const color = CAT_COLOR[item.kategori] || 'var(--accent)';
                const icon = CAT_ICON[item.kategori] || '▶';
                return (
                  <div key={i} className={styles.smartCard} style={{ '--smart-color': color }}>
                    <div className={styles.smartCardHeader}>
                      <span className={styles.smartIcon}>{icon}</span>
                      <span className={styles.smartKategori}>{item.kategori}</span>
                      <span className={styles.smartWaktu}>{item.batasWaktu}</span>
                    </div>
                    <div className={styles.smartJudul}>{item.judul}</div>
                    <div className={styles.smartRows}>
                      {[
                        { label: 'S', desc: 'Spesifik',       val: item.spesifik },
                        { label: 'M', desc: 'Terukur',        val: item.terukur },
                        { label: 'A', desc: 'Dapat Dicapai',  val: item.dapatDicapai },
                        { label: 'R', desc: 'Relevan',        val: item.relevan },
                        { label: 'T', desc: 'Batas Waktu',    val: item.batasWaktu },
                      ].map(({ label, desc, val }) => (
                        <div key={label} className={styles.smartRow}>
                          <div className={styles.smartBadge}>{label}</div>
                          <div className={styles.smartRowContent}>
                            <span className={styles.smartRowDesc}>{desc}</span>
                            <span className={styles.smartRowVal}>{val}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Pemetaan Kompetensi — tanpa KBJI */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⬡ Pemetaan Kompetensi</h2>
          <div className={styles.kompGrid}>
            {Object.entries(PILLAR_LABELS).map(([key, label]) => {
              const data = p?.[key];
              if (!data) return null;
              return (
                <div key={key} className={styles.kompCard}>
                  <div className={styles.kompHeader}>
                    <span className={styles.kompLabel}>{label}</span>
                    <span className={styles.kompScore}>{data.skor}/100</span>
                  </div>
                  <div className={styles.scoreBar}>
                    <div className={styles.scoreBarFill} style={{ width: `${data.skor}%`, '--color': getScoreColor(data.skor) }} />
                  </div>
                  {data.kekuatan?.length > 0 && (
                    <div className={styles.kompSection}>
                      <div className={styles.kompSubLabel}>✓ Kekuatan</div>
                      <ul className={styles.kompList}>
                        {data.kekuatan.map((k, i) => <li key={i}>{k}</li>)}
                      </ul>
                    </div>
                  )}
                  {data.celah?.length > 0 && (
                    <div className={styles.kompSection}>
                      <div className={styles.kompSubLabel} style={{color: 'var(--danger)'}}>✗ Celah</div>
                      <ul className={styles.kompList} style={{color: 'var(--danger)'}}>
                        {data.celah.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Analisis Risiko Otomasi — dengan benchmark */}
        {result.analisisRisiko && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>⚠ Analisis Risiko Otomasi</h2>
            <div className={styles.riskCard} style={{'--risk-color': riskColor}}>
              <div className={styles.riskHeader}>
                <span className={styles.riskBadge} style={{background: `${riskColor}22`, color: riskColor}}>
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
                <div className={styles.riskBarFill} style={{ width: `${result.analisisRisiko.persentaseRisiko}%`, background: riskColor }} />
              </div>
              <p className={styles.riskDesc}>{result.analisisRisiko.penjelasan}</p>
              {result.analisisRisiko.faktorRisiko?.length > 0 && (
                <div className={styles.riskFactors}>
                  {result.analisisRisiko.faktorRisiko.map((f, i) => {
                    const text = typeof f === 'string' ? f : f.faktor || f.nama || f.risiko || Object.values(f).filter(v => typeof v === 'string').join(' ');
                    return <span key={i} className={styles.riskFactor}>{text}</span>;
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. Rekomendasi Akhir — diperbesar, jadi highlight utama */}
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

{/* Privacy Notice */}
        <div className={styles.privacyNotice}>
          <span className={styles.privacyIcon}>🔒</span>
          <div>
            <span className={styles.privacyTitle}>Catatan Privasi</span>
            <span className={styles.privacyText}>
              Data CV dan informasi pribadi Anda <strong>tidak disimpan</strong> di server manapun. Semua pemrosesan bersifat sementara dan langsung dibuang setelah analisis selesai. Laporan ini hanya tersedia di sesi browser Anda saat ini.
            </span>
          </div>
        </div>
        
        <div className={styles.footer}>
          Dibuat oleh Retrokarir · AI Skill Gap Advisor · {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} · oleh <a href="https://affandymurad.github.io/" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent)', textDecoration: 'none', fontWeight: 600}}>Affandy Murad</a> @ 2026
        </div>
      </div>
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 70) return '#2D7A4F';
  if (score >= 50) return '#B87333';
  return '#C23B3B';
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

function CopyCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,5 5,12 12,19"/></svg>;
}

function DownloadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}