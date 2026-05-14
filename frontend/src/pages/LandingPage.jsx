import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './LandingPage.module.css';

const WHY_CARDS = [
  { icon: '⚡', tag: 'Relevansi',        color: '#3b82f6',
    headline: 'Hanya 13% pekerja muda bekerja sesuai kualifikasinya',
    body: '60% pekerja Indonesia terjebak dalam pekerjaan tidak relevan. Retrokarir membantu menemukan jalur yang tepat.' },
  { icon: '🖥️', tag: 'Literasi Digital', color: '#6366f1',
    headline: '80% industri butuh tenaga digital — baru 50% siap',
    body: 'Kami mengidentifikasi celah literasi digital Anda untuk memenuhi standar industri 2026 yang terus berkembang.' },
  { icon: '🤖', tag: 'Future-Ready',     color: '#8b5cf6',
    headline: '44% keterampilan akan berubah pada 2027',
    body: 'Percepatan otomasi dan AI mengubah lanskap kerja. Kami bantu Anda tetap relevan lewat peta reskilling yang presisi.' },
  { icon: '📋', tag: 'Standar KBJI',     color: '#0ea5e9',
    headline: 'Mengacu KBJI 2014 & Proyeksi Ketenagakerjaan 2026',
    body: 'Evaluasi berbasis standar nasional — bukan saran generik, tapi rekomendasi yang benar-benar berlaku di pasar lokal.' },
  { icon: '🧠', tag: 'Holistik',         color: '#14b8a6',
    headline: 'Kognitif, Interpersonal, Self-leadership & Digital',
    body: 'Kami memetakan 4 pilar kompetensi yang sangat dihargai pemberi kerja, bukan hanya keterampilan teknis.' },
];

const OUTLOOK_SECTORS = [
  { icon: '🌾', name: 'Pertanian, Kehutanan & Perikanan', share: 28.15, absorb: '±41,5 juta orang', jobs: 'Petani tanaman pangan, manajer produksi pertanian, pekerja kehutanan', formal: 'Dominan Informal', formalColor: '#f59e0b', highlight: 'Penyerap terbesar namun menghadapi krisis regenerasi. Fokus bergeser ke pertanian presisi, modernisasi alsintan, dan food estate.', tag: 'Tradisional → Modern', tagColor: '#f59e0b' },
  { icon: '🛒', name: 'Perdagangan Besar & Eceran', share: 18.73, absorb: '±28,4 juta orang', jobs: 'Tenaga penjualan, kasir, mekanik kendaraan listrik', formal: 'Campuran', formalColor: '#0ea5e9', highlight: 'Pertumbuhan didorong e-commerce; mekanik mengalami transisi besar ke teknologi kendaraan listrik (EV).', tag: 'Transisi EV', tagColor: '#0ea5e9' },
  { icon: '🏭', name: 'Industri Pengolahan (Manufaktur)', share: 13.86, absorb: '±21 juta orang', jobs: 'Operator mesin produksi, perakit, operator pengolahan', formal: 'Dominan Formal', formalColor: '#22c55e', highlight: 'Motor hilirisasi mineral; risiko substitusi tinggi oleh otomatisasi pada pekerjaan rutin.', tag: 'Hilirisasi + Otomasi', tagColor: '#22c55e' },
  { icon: '🍽️', name: 'Akomodasi & Makan Minum', share: 7.98, absorb: null, jobs: 'Koki, pelayan restoran, pengelola penginapan', formal: 'Dominan Informal', formalColor: '#f59e0b', highlight: 'Tumbuh seiring pemulihan pariwisata dan pola konsumsi masyarakat yang berkelanjutan.', tag: 'Pariwisata', tagColor: '#f59e0b' },
  { icon: '🏗️', name: 'Konstruksi & Infrastruktur', share: 6.51, absorb: null, jobs: 'Pekerja bangunan, operator alat berat, mandor', formal: 'Campuran (Proyek)', formalColor: '#f97316', highlight: 'Permintaan tinggi didorong pembangunan infrastruktur strategis dan kawasan industri hilirisasi.', tag: 'Infrastruktur', tagColor: '#f97316' },
  { icon: '🎓', name: 'Jasa Pendidikan', share: 5.06, absorb: null, jobs: 'Guru, dosen, instruktur pelatihan vokasi', formal: 'Formal', formalColor: '#eab308', highlight: 'Permintaan tinggi untuk tenaga pendidik yang memiliki kualifikasi digital dan kemampuan EdTech.', tag: 'EdTech', tagColor: '#eab308' },
  { icon: '🚚', name: 'Transportasi & Pergudangan', share: 4.28, absorb: null, jobs: 'Kurir logistik, pengemudi, spesialis rantai pasok', formal: 'Campuran (Gig)', formalColor: '#8b5cf6', highlight: 'Tumbuh pesat didorong digitalisasi logistik dan efisiensi rantai pasok nasional.', tag: 'Logistik Digital', tagColor: '#8b5cf6' },
  { icon: '🏥', name: 'Jasa Kesehatan & Sosial', share: 1.68, absorb: null, jobs: 'Perawat, tenaga pendukung kesehatan, pekerja sosial', formal: 'Formal', formalColor: '#22c55e', highlight: 'Ekspansi signifikan seiring penuaan penduduk dan peningkatan kesadaran kesehatan.', tag: 'HealthTech', tagColor: '#22c55e' },
  { icon: '💻', name: 'Informasi & Komunikasi', share: 0.73, absorb: null, jobs: 'Pengembang perangkat lunak, analis data, ahli keamanan siber', formal: 'Formal + Gig', formalColor: '#6366f1', highlight: 'Pilar transformasi digital; kebutuhan tenaga terampil digital melonjak drastis hingga target lebih dari 80%.', tag: 'Tumbuh Pesat', tagColor: '#6366f1' },
  { icon: '🏦', name: 'Jasa Keuangan & Asuransi', share: 1.12, absorb: null, jobs: 'Analis keuangan, agen asuransi, spesialis manajemen risiko', formal: 'Formal', formalColor: '#22c55e', highlight: 'Produktivitas tinggi; berfokus pada inovasi layanan keuangan digital dan manajemen risiko.', tag: 'Fintech', tagColor: '#22c55e' },
  { icon: '♻️', name: 'Pengadaan Air & Pengelolaan Sampah', share: 0.35, absorb: null, jobs: 'Teknisi pengolahan limbah, penyortir sampah', formal: 'Transformasi ke Formal', formalColor: '#22c55e', highlight: 'Sektor inti green jobs; didorong industri daur ulang dan ekonomi sirkular.', tag: 'Green Jobs', tagColor: '#22c55e' },
];

const OUTLOOK_STATS = [
  { num: '7,46 jt', label: 'Pengangguran 2025',  sub: 'Turun dari tahun sebelumnya' },
  { num: '±58%',   label: 'Pekerja Informal',     sub: 'Masih dominan di pasar kerja' },
  { num: '47 jt',  label: 'Butuh Reskilling',     sub: 'Proyeksi hingga 2030' },
  { num: '2030',   label: 'Target Net Zero',       sub: 'Dorong 3,88 jt green jobs' },
];

/* ── Carousel hook ─────────────────────────────────────────── */
function useCarousel(total, autoMs = 0) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const go = useCallback((n) => setIdx((n + total) % total), [total]);
  const prev = useCallback(() => go(idx - 1), [idx, go]);
  const next = useCallback(() => go(idx + 1), [idx, go]);

  useEffect(() => {
    if (!autoMs) return;
    timerRef.current = setInterval(() => go(idx + 1), autoMs);
    return () => clearInterval(timerRef.current);
  }, [idx, autoMs, go]);

  return { idx, go, prev, next };
}

export default function LandingPage({ onStart }) {
  const why    = useCarousel(WHY_CARDS.length, 4500);
  const sector = useCarousel(OUTLOOK_SECTORS.length);

  return (
    <div className={styles.page}>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.badge}>AI-Powered · Indonesia · 2026</div>
        <h1 className={styles.heroTitle}>
          Temukan Celah<br />
          <span className={styles.heroAccent}>Karier Anda</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Retrokarir menganalisis CV Anda secara mendalam menggunakan AI dan standar kompetensi nasional — memberikan peta jalan pengembangan karier yang presisi.
        </p>
        <div className={styles.heroBtns}>
          <button className={styles.ctaBtn} onClick={onStart}>
            Mulai Analisis Gratis <ArrowIcon />
          </button>
          <a href="https://affandymurad.github.io/" target="_blank" rel="noopener noreferrer" className={styles.portfolioBtn}>
            👤 Affandy Murad
          </a>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────── */}
      <section className={styles.statsRow}>
        {OUTLOOK_STATS.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className={styles.statDivider} />}
            <div className={styles.stat}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </section>

      {/* ── Mengapa Retrokarir — carousel ─────────────────── */}
      <section className={styles.carouselSection}>
        <div className={styles.carouselHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Mengapa Retrokarir?</h2>
            <p className={styles.sectionSub}>5 alasan berdasarkan data ketenagakerjaan Indonesia 2026</p>
          </div>
          <div className={styles.carouselNav}>
            <button className={styles.navBtn} onClick={why.prev} aria-label="Prev"><ChevronIcon dir="left" /></button>
            <span className={styles.navCount}>{why.idx + 1} / {WHY_CARDS.length}</span>
            <button className={styles.navBtn} onClick={why.next} aria-label="Next"><ChevronIcon dir="right" /></button>
          </div>
        </div>

        <div className={styles.carouselTrack}>
          {WHY_CARDS.map((c, i) => (
            <div
              key={i}
              className={`${styles.carouselCard} ${i === why.idx ? styles.carouselCardActive : ''}`}
              style={{ '--card-color': c.color }}
              aria-hidden={i !== why.idx}
            >
              <div className={styles.carouselCardInner}>
                <div className={styles.carouselIcon}>{c.icon}</div>
                <span className={styles.carouselTag} style={{ color: c.color, background: `${c.color}18` }}>{c.tag}</span>
                <h3 className={styles.carouselHeadline}>{c.headline}</h3>
                <p className={styles.carouselBody}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.carouselDots}>
          {WHY_CARDS.map((_, i) => (
            <button key={i} className={`${styles.dot} ${i === why.idx ? styles.dotActive : ''}`} onClick={() => why.go(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </section>

      {/* ── Outlook Pasar Kerja — carousel ────────────────── */}
      <section className={styles.carouselSection}>
        <div className={styles.carouselHeader}>
          <div>
            <div className={styles.outlookBadge}>Berdasarkan Data · 17 Sektor KBLI 2020</div>
            <h2 className={styles.sectionTitle}>Outlook Pasar Kerja Indonesia 2026</h2>
            <p className={styles.sectionSub}>Kenali sektor Anda dan posisikan diri dengan tepat</p>
          </div>
          <div className={styles.carouselNav}>
            <button className={styles.navBtn} onClick={sector.prev} aria-label="Prev"><ChevronIcon dir="left" /></button>
            <span className={styles.navCount}>{sector.idx + 1} / {OUTLOOK_SECTORS.length}</span>
            <button className={styles.navBtn} onClick={sector.next} aria-label="Next"><ChevronIcon dir="right" /></button>
          </div>
        </div>

        <div className={styles.carouselTrack}>
          {OUTLOOK_SECTORS.map((s, i) => (
            <div
              key={i}
              className={`${styles.carouselCard} ${styles.carouselCardSector} ${i === sector.idx ? styles.carouselCardActive : ''}`}
              style={{ '--card-color': s.tagColor }}
              aria-hidden={i !== sector.idx}
            >
              <div className={styles.carouselCardInner}>
                <div className={styles.sectorCardTop}>
                  <span className={styles.sectorIcon}>{s.icon}</span>
                  <div className={styles.sectorMeta}>
                    <h3 className={styles.sectorName}>{s.name}</h3>
                    <span className={styles.sectorTag} style={{ color: s.tagColor, background: `${s.tagColor}18` }}>{s.tag}</span>
                  </div>
                </div>

                <div className={styles.sectorStats}>
                  <div className={styles.sectorStatItem}>
                    <span className={styles.sectorStatNum} style={{ color: s.tagColor }}>{s.share}%</span>
                    <span className={styles.sectorStatLabel}>Proporsi Tenaga Kerja</span>
                    <div className={styles.sectorBar}>
                      <div className={styles.sectorBarFill} style={{ width: `${Math.min(s.share * 3, 100)}%`, background: s.tagColor }} />
                    </div>
                  </div>
                  {s.absorb && (
                    <div className={styles.sectorStatItem}>
                      <span className={styles.sectorStatNum} style={{ color: s.tagColor }}>{s.absorb}</span>
                      <span className={styles.sectorStatLabel}>Estimasi Serapan</span>
                    </div>
                  )}
                </div>

                <div className={styles.sectorFormalBadge} style={{ color: s.formalColor, background: `${s.formalColor}18` }}>
                  {s.formal}
                </div>

                <p className={styles.sectorHighlight} style={{ borderColor: s.tagColor }}>{s.highlight}</p>

                {s.jobs && (
                  <div className={styles.sectorJobs}>
                    <span className={styles.sectorJobsLabel}>Contoh Pekerjaan</span>
                    <span className={styles.sectorJobsText}>{s.jobs}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.carouselDots}>
          {OUTLOOK_SECTORS.map((_, i) => (
            <button key={i} className={`${styles.dot} ${i === sector.idx ? styles.dotActive : ''}`} onClick={() => sector.go(i)} aria-label={`Sektor ${i + 1}`} />
          ))}
        </div>

        <p className={styles.outlookFootnote}>
          Sumber: Outlook Ketenagakerjaan 2026 · Sakernas 2024/2025 · Statistik Indonesia 2025 · KBLI 2020
        </p>
      </section>

      {/* ── Privacy ───────────────────────────────────────── */}
      <section className={styles.privacySection}>
        <div className={styles.privacyInner}>
          <span className={styles.privacyIcon}>🔒</span>
          <div>
            <span className={styles.privacyTitle}>Privasi & Keamanan Data Anda</span>
            <span className={styles.privacyText}>
              CV dan data pribadi Anda <strong>tidak disimpan</strong> di server kami. Semua data hanya diproses sementara untuk keperluan analisis, kemudian langsung dibuang. Kunci API dienkripsi dan tidak pernah dikirim ke klien.
            </span>
          </div>
        </div>
      </section>

      {/* ── CTA bottom ────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Siap Mengambil Langkah Pertama?</h2>
        <p className={styles.ctaBody}>Upload CV Anda sekarang dan dapatkan analisis mendalam dalam hitungan menit.</p>
        <button className={styles.ctaBtn} onClick={onStart}>
          Mulai Analisis Sekarang <ArrowIcon />
        </button>
      </section>

    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12,5 19,12 12,19"/>
    </svg>
  );
}

function ChevronIcon({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === 'left' ? 'rotate(180deg)' : 'none' }}>
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
}