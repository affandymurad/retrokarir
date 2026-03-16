import React, { useRef } from 'react';
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
      `<div style="height:8px;background:#EDE9E0;border-radius:4px;margin:6px 0 12px;">
        <div style="height:8px;width:${score}%;background:${color};border-radius:4px;"></div>
      </div>`;

    const scoreColor = s => s >= 70 ? '#2D7A4F' : s >= 50 ? '#B87333' : '#C23B3B';

    const kompetensiHtml = pillarKeys.map(([key, label]) => {
      const d = p?.[key];
      if (!d) return '';
      const sc = scoreColor(d.skor);
      return `<div style="background:#F9F7F4;border:1px solid #E0D9CE;border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:13px;">${label}</strong>
          <strong style="font-size:18px;color:${sc};">${d.skor}/100</strong>
        </div>
        ${barTag(d.skor, sc)}
        ${d.kekuatan?.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:700;color:#2D7A4F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">✓ Kekuatan</div><ul style="padding-left:16px;margin:0;">${d.kekuatan.map(k => `<li style="margin-bottom:3px;font-size:12px;">${k}</li>`).join('')}</ul></div>` : ''}
        ${d.celah?.length ? `<div><div style="font-size:11px;font-weight:700;color:#C23B3B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">✗ Celah</div><ul style="padding-left:16px;margin:0;">${d.celah.map(c => `<li style="margin-bottom:3px;font-size:12px;color:#C23B3B;">${c}</li>`).join('')}</ul></div>` : ''}
      </div>`;
    }).join('');

    const saranHtml = r.saranPengembangan ? `
      <h2>🎯 Saran Pengembangan Skill</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;">
        ${[
          ['pelatihan',   'Pelatihan & Kursus',   '#2D7A4F', '📚'],
          ['kompetisi',   'Kompetisi & Hackathon', '#B87333', '🏆'],
          ['sertifikasi', 'Sertifikasi',           '#7C3AED', '📜'],
        ].map(([key, label, color, icon]) => {
          const items = r.saranPengembangan?.[key];
          if (!items?.length) return '';
          return `<div style="background:#F9F7F4;border:1px solid #E0D9CE;border-top:3px solid ${color};border-radius:10px;padding:14px;">
            <div style="font-size:16px;margin-bottom:4px;">${icon}</div>
            <strong style="font-size:12px;color:${color};text-transform:uppercase;letter-spacing:.5px;">${label}</strong>
            <ul style="padding-left:14px;margin-top:8px;">${items.map(i => `<li style="font-size:12px;margin-bottom:4px;">${i}</li>`).join('')}</ul>
          </div>`;
        }).join('')}
      </div>` : '';

    const actionHtml = [
      ['jangkaPendek',   'Jangka Pendek',   '#2D7A4F', '⚡'],
      ['jangkaMenengah', 'Jangka Menengah', '#B87333', '📈'],
      ['jangkaPanjang',  'Jangka Panjang',  '#7C3AED', '🎯'],
    ].map(([key, label, color, icon]) => {
      const plan = r.actionPlan?.[key];
      if (!plan) return '';
      return `<div style="background:#F9F7F4;border:1px solid #E0D9CE;border-top:3px solid ${color};border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="font-size:18px;margin-bottom:4px;">${icon}</div>
        <strong style="font-size:13px;">${label}</strong>
        <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">${plan.periode}</div>
        <ul style="padding-left:16px;margin:0;">${plan.aksi?.map(a => `<li style="margin-bottom:6px;font-size:12px;">${a}</li>`).join('')}</ul>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Retrokarir — Laporan ${meta.fullName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1A1714; background: white; padding: 36px; font-size: 13px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
  h2 { font-size: 14px; font-weight: 700; margin: 28px 0 14px; border-bottom: 2px solid #C45C26; padding-bottom: 6px; color: #C45C26; text-transform: uppercase; letter-spacing: .5px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
  <div style="border-bottom:3px solid #C45C26;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="font-size:24px;font-weight:800;letter-spacing:-1px;margin-bottom:6px;">Laporan Analisis Karier</h1>
    <div style="color:#6B6560;font-size:12px;margin-bottom:10px;">
      ${r.profilRingkas?.nama || meta.fullName} · ${r.profilRingkas?.usia || ''} tahun · ${meta.aiMode === 'gemini' ? '✦ Gemini AI' : '⬡ Ollama AI'}
    </div>
    ${r.profilRingkas?.bidangKarier ? `<span style="display:inline-block;background:#F4DDD0;color:#C45C26;border:1px solid #C45C26;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600;">${r.profilRingkas.bidangKarier}</span>` : ''}
  </div>

  ${r.profilRingkas?.kekuatanUtama?.length ? `<h2>✦ Kekuatan Utama</h2>
  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
    ${r.profilRingkas.kekuatanUtama.map(k => pillTag(k)).join(' ')}
  </div>` : ''}

  <h2>⬡ Pemetaan Kompetensi</h2>
  ${kompetensiHtml}

  ${saranHtml}

  ${r.standarKBJI ? `<h2>📋 Standar KBJI</h2>
  <div style="background:#F9F7F4;border:1px solid #E0D9CE;border-radius:10px;padding:16px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:10px;">
      <div>
        <div style="font-size:22px;font-weight:800;color:#C45C26;letter-spacing:-1px;">${r.standarKBJI.kodeJabatan}</div>
        <div style="font-weight:600;font-size:14px;">${r.standarKBJI.namaJabatan}</div>
      </div>
      <span style="background:#F4DDD0;color:#C45C26;border:1px solid #C45C26;border-radius:12px;padding:4px 14px;font-size:11px;font-weight:600;white-space:normal;word-break:break-word;text-align:right;max-width:45%;display:inline-block;">${r.standarKBJI.kesesuaian}</span>
    </div>
    <p style="font-size:12px;color:#6B6560;">${r.standarKBJI.deskripsi}</p>
  </div>` : ''}

  ${r.analisisRisiko ? `<h2>⚠ Analisis Risiko Otomasi</h2>
  <div style="background:#F9F7F4;border:1px solid #E0D9CE;border-radius:10px;padding:16px;">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:10px;">
      <span style="background:${riskColor}22;color:${riskColor};border-radius:999px;padding:4px 14px;font-weight:700;font-size:13px;">${r.analisisRisiko.level}</span>
      <span style="font-size:28px;font-weight:800;color:${riskColor};">${r.analisisRisiko.persentaseRisiko}%</span>
    </div>
    ${barTag(r.analisisRisiko.persentaseRisiko, riskColor)}
    <p style="font-size:12px;color:#6B6560;margin-bottom:10px;">${r.analisisRisiko.penjelasan}</p>
    <div>${r.analisisRisiko.faktorRisiko?.map(f => pillTag(f, '#B87333', '#F5E6D3')).join(' ')}</div>
  </div>` : ''}

  <h2>🚀 Rencana Aksi Strategis</h2>
  ${actionHtml}

  ${r.rekomendasiAkhir ? `<div style="background:linear-gradient(135deg,#F4DDD0,#FFF8F5);border:1px solid #C45C26;border-radius:12px;padding:20px;display:flex;gap:16px;margin-top:8px;">
    <span style="font-size:24px;">💡</span>
    <div>
      <div style="font-weight:700;color:#C45C26;margin-bottom:6px;">Rekomendasi Akhir</div>
      <p style="font-size:13px;line-height:1.7;">${r.rekomendasiAkhir}</p>
    </div>
  </div>` : ''}

  <div style="text-align:center;font-size:11px;color:#9C9490;margin-top:32px;padding-top:16px;border-top:1px solid #E0D9CE;">
    Dibuat oleh Retrokarir · AI Skill Gap Advisor · ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} · oleh <a href="https://affandymurad.github.io/" style="color:#C45C26;text-decoration:none;font-weight:600;">Affandy Murad</a> @ 2026
  </div>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
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
              {meta.aiMode === 'gemini' ? '✦ Gemini AI' : '⬡ Ollama AI'}
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

        {/* Kompetensi */}
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

{/* Saran Pengembangan */}
        {result.saranPengembangan && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🎯 Saran Pengembangan Skill</h2>
            <div className={styles.saranGrid}>
              {[
                { key: 'pelatihan',   label: 'Pelatihan & Kursus',   icon: '📚', color: '#2D7A4F' },
                { key: 'kompetisi',   label: 'Kompetisi & Hackathon', icon: '🏆', color: '#B87333' },
                { key: 'sertifikasi', label: 'Sertifikasi',           icon: '📜', color: '#7C3AED' },
              ].map(({ key, label, icon, color }) => {
                const items = result.saranPengembangan[key];
                if (!items?.length) return null;
                return (
                  <div key={key} className={styles.saranCard} style={{'--saran-color': color}}>
                    <div className={styles.saranIcon}>{icon}</div>
                    <div className={styles.saranLabel}>{label}</div>
                    <ul className={styles.saranList}>
                      {items.map((item, i) => {
                        // Handle both string and object formats
                        const text = typeof item === 'string'
                          ? item
                          : [item.nama, item.platform, item.relevansi]
                              .filter(Boolean).join(' — ');
                        return <li key={i}>{text}</li>;
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* KBJI */}
        {result.standarKBJI && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📋 Standar KBJI</h2>
            <div className={styles.kbjiCard}>
              <div className={styles.kbjiRow}>
                <div>
                  <div className={styles.kbjiCode}>{result.standarKBJI.kodeJabatan}</div>
                  <div className={styles.kbjiName}>{result.standarKBJI.namaJabatan}</div>
                </div>
                <div className={styles.kbjiKesesuaian}>{result.standarKBJI.kesesuaian}</div>
              </div>
              <p className={styles.kbjiDesc}>{result.standarKBJI.deskripsi}</p>
            </div>
          </section>
        )}

        {/* Risk */}
        {result.analisisRisiko && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>⚠ Analisis Risiko Otomasi</h2>
            <div className={styles.riskCard} style={{'--risk-color': riskColor}}>
              <div className={styles.riskHeader}>
                <span className={styles.riskBadge} style={{background: `${riskColor}22`, color: riskColor}}>
                  {result.analisisRisiko.level}
                </span>
                <span className={styles.riskPct}>{result.analisisRisiko.persentaseRisiko}%</span>
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

        {/* Action Plan */}
{result.actionPlan && (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>🚀 Rencana Aksi Strategis</h2>

    <div className={styles.actionGrid}>
      {[
        { key: 'jangkaPendek', label: 'Jangka Pendek', color: '#2D7A4F', icon: '⚡' },
        { key: 'jangkaMenengah', label: 'Jangka Menengah', color: '#B87333', icon: '📈' },
        { key: 'jangkaPanjang', label: 'Jangka Panjang', color: '#7C3AED', icon: '🎯' }
      ].map(({ key, label, color, icon }) => {

        const rawPlan = result.actionPlan[key];
        if (!rawPlan) return null;

        // NORMALISASI DATA
        const periode = rawPlan?.periode || label;
        const aksiList = Array.isArray(rawPlan)
          ? rawPlan
          : rawPlan?.aksi || [];

        return (
          <div
            key={key}
            className={styles.actionCard}
            style={{ '--plan-color': color }}
          >
            <div className={styles.actionIcon}>{icon}</div>

            <div className={styles.actionLabel}>{label}</div>

            {periode && (
              <div className={styles.actionPeriod}>{periode}</div>
            )}

            <ul className={styles.actionList}>
              {aksiList.map((a, i) => {

                const text =
                  typeof a === 'string'
                    ? a
                    : a?.langkah ||
                      a?.aksi ||
                      a?.tindakan ||
                      a?.deskripsi ||
                      a?.detail ||
                      Object.values(a || {})
                        .filter(v => typeof v === 'string')
                        .join(' — ');

                return <li key={i}>{text}</li>;
              })}
            </ul>
          </div>
        );
      })}
    </div>
  </section>
)}

        {/* Final Rec */}
        {result.rekomendasiAkhir && (
          <section className={styles.section}>
            <div className={styles.finalCard}>
              <div className={styles.finalIcon}>💡</div>
              <div>
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

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,5 5,12 12,19"/></svg>;
}

function DownloadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}