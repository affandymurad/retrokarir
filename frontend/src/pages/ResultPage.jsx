import React, { useState } from 'react';
import styles from './ResultPage.module.css';
import {
  safeString,
  injectIdrConversion,
  clampScore,
  getScoreColor,
  RISK_COLOR,
  CONFIDENCE_COLOR,
  PILLAR_LABELS,
} from '../utils/reportFormat';
import { downloadReportPdf } from '../utils/generateReportPdf';

// URL resmi tiap penyedia kursus di kataKunciJobSeeker.rekomendasiKursus.
// Kalau AI mengembalikan nama platform di luar daftar ini, pill tetap
// tampil tapi tidak diklik (bukan link ke sembarang tujuan).
const COURSE_PLATFORM_URLS = {
  Dicoding: 'https://www.dicoding.com',
  Coursera: 'https://www.coursera.org',
  Skillhub: 'https://skillhub.kemnaker.go.id',
  Karirhub: 'https://karirhub.kemnaker.go.id',
  Prakerja: 'https://www.prakerja.go.id',
};

function ScoreBar({ value, color }) {
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarFill} style={{ width: `${value}%`, '--color': color }} />
    </div>
  );
}

export default function ResultPage({ result, meta, onBack }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const handleDownload = () => {
    downloadReportPdf(result, meta);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={onBack}><BackIcon /> Analisis Baru</button>
          <button className={styles.downloadBtn} onClick={handleDownload}><DownloadIcon /> Download PDF</button>
        </div>
      </div>

      <div className={styles.container}>
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
            <p className={styles.objectiveHint}>Berdasarkan 4 pilar Global Skills Taxonomy (WEF).</p>
            <div className={styles.pillarGrid}>
              {Object.entries(PILLAR_LABELS).map(([key, { label, labelId, desc, icon }]) => {
                const d = result.pemetaanKompetensi[key];
                if (!d) return null;
                const scoreC = getScoreColor(clampScore(d.skor));
                return (
                  <div key={key} className={styles.pillarCard}>
                    <div className={styles.pillarHeader}>
                      <span className={styles.pillarIcon}>{icon}</span>
                      <span className={styles.pillarLabel}>{labelId}</span>
                      <span className={styles.pillarScore} style={{color: scoreC}}>{d.skor}</span>
                    </div>
                    <span className={styles.pillarLabelEn}>{label}</span>
                    <p className={styles.pillarDesc}>{desc}</p>
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
            <p className={styles.objectiveHint}>Persentase di bawah mengukur seberapa besar kemungkinan tugas-tugas di pekerjaanmu tergantikan otomasi/AI dalam beberapa tahun ke depan — bukan peluang kehilangan pekerjaan sekarang juga.</p>
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
                    <span className={styles.riskPercentNum} style={{color: RISK_COLOR[result.analisisRisiko.level]}}>{result.analisisRisiko.persentaseRisiko}% risiko tergantikan otomasi</span>
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
              {result.analisisRisiko.sumberKerangka && (
                <p className={styles.riskBenchmark}>{safeString(result.analisisRisiko.sumberKerangka)}</p>
              )}
            </div>
          </section>
        )}

        {/* 2g — Prakiraan Pekerjaan Permintaan Tinggi */}
        {Array.isArray(result.prakiraanPekerjaan?.posisiPermintaanTinggi) && result.prakiraanPekerjaan.posisiPermintaanTinggi.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📈 Prakiraan Pekerjaan Permintaan Tinggi</h2>
            <p className={styles.objectiveHint}>
              Posisi yang permintaannya diproyeksikan naik dalam 2–3 tahun ke depan, relevan dengan profil dan bidang kamu.
            </p>
            <div className={styles.forecastPills}>
              {result.prakiraanPekerjaan.posisiPermintaanTinggi.map((item, i) => (
                <span key={i} className={styles.forecastPill}>{safeString(item?.posisi)}</span>
              ))}
            </div>
            <div className={styles.forecastList}>
              {result.prakiraanPekerjaan.posisiPermintaanTinggi.map((item, i) => (
                item?.alasan ? (
                  <p key={i} className={styles.forecastItem}>
                    <strong>{safeString(item.posisi)}:</strong> {safeString(item.alasan)}
                  </p>
                ) : null
              ))}
            </div>
            {result.prakiraanPekerjaan.catatan && (
              <p className={styles.forecastNote}>{safeString(result.prakiraanPekerjaan.catatan)}</p>
            )}
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
              {Array.isArray(result.kataKunciJobSeeker.rekomendasiKursus) && result.kataKunciJobSeeker.rekomendasiKursus.length > 0 && (
                <div className={styles.kataKunciGroup}>
                  <div className={styles.kataKunciGroupLabel} style={{ color: 'var(--course-color)' }}>🎓 Rekomendasi Kursus</div>
                  <div className={styles.forecastPills} style={{ '--course-color': '#0891b2' }}>
                    {result.kataKunciJobSeeker.rekomendasiKursus.map((item, i) => {
                      const topik = safeString(item?.topik);
                      const platform = safeString(item?.platform);
                      if (!topik) return null;
                      const label = platform ? `${topik} - ${platform}` : topik;
                      const url = COURSE_PLATFORM_URLS[platform];
                      if (url) {
                        return (
                          <a
                            key={i}
                            className={styles.coursePill}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Buka ${platform} di tab baru`}
                          >
                            {label}
                          </a>
                        );
                      }
                      return <span key={i} className={styles.coursePill}>{label}</span>;
                    })}
                  </div>
                </div>
              )}
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
          Dibuat oleh Retrokarir · AI Career Intelligence & Skill Gap Analysis · {new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})} · oleh{' '}
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