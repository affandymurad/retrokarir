import React, { useState } from 'react';
import styles from './LandingPage.module.css';

// ── Data ─────────────────────────────────────────────────────

const STATS = [
  { num: '44%', label: 'keterampilan kerja inti akan berubah pada 2027 (WEF Future of Jobs)' },
  { num: '22,6%', label: 'pemuda Indonesia berstatus NEET (tidak kerja/sekolah)' },
  { num: '<1%', label: 'tenaga kerja dengan keterampilan digital tingkat lanjut' },
  { num: '43%', label: 'pekerja dengan skill digital dasar berada di sektor informal' },
];

const INSIGHTS = [
  {
    icon: '🧠',
    tag: 'Skill Instability',
    tagColor: '#ef4444',
    tagBg: '#fef2f2',
    headline: 'Era "Belajar Sekali, Bekerja Selamanya" Sudah Berakhir',
    body: 'World Economic Forum (Future of Jobs Report) memproyeksikan 44% keterampilan kerja inti akan berubah pada 2027. Keterampilan paling dicari bukan lagi hanya coding — melainkan Analytical Thinking, AI & Big Data Literacy, dan Resilience & Agility.',
  },
  {
    icon: '🤖',
    tag: 'AI Augmentation',
    tagColor: '#6366f1',
    tagBg: '#eef2ff',
    headline: 'AI Bukan Pengganti — Tapi Amplifier bagi yang Siap',
    body: 'Studi MIT dan Stanford (2023) membuktikan GenAI meningkatkan produktivitas pekerja secara signifikan. Yang akan tertinggal bukan yang digantikan AI, melainkan yang tidak tahu cara menggunakannya. Retrokarir menganalisis sejauh mana CV kamu sudah mencerminkan AI literacy yang sesungguhnya.',
  },
  {
    icon: '🌿',
    tag: 'Green Economy',
    tagColor: '#16a34a',
    tagBg: '#f0fdf4',
    headline: 'Ekonomi Hijau Membuka Kategori Karier Baru',
    body: 'Indonesia menargetkan 20.000 pekerja bersertifikat green skills pada 2029. Sektor EBT, manufaktur berkelanjutan, dan ESG menjadi frontier baru. Apakah profilmu sudah relevan untuk transisi ini?',
  },
  {
    icon: '🏢',
    tag: 'Kesenjangan Pelatihan',
    tagColor: '#f59e0b',
    tagBg: '#fffbeb',
    headline: 'Kurang dari 8% Perusahaan Melatih Karyawannya',
    body: 'Data menunjukkan kurang dari 8% perusahaan Indonesia menyediakan pelatihan formal. Artinya, pertumbuhan karier tidak bisa hanya mengandalkan tempat kerja. Inisiatif upskilling mandiri — yang terstandarisasi dan demand-driven seperti SKKNI atau DTS — menjadi semakin kritis.',
  },
  {
    icon: '🧰',
    tag: 'Informal Economy',
    tagColor: '#0ea5e9',
    tagBg: '#f0f9ff',
    headline: 'Sektor Informal Bukan Pinggiran — Justru Medan Upskilling Terbesar',
    body: 'Banyak pekerja Indonesia tidak berada dalam jalur karier formal yang rapi. Karena itu, analisis CV perlu membaca pengalaman freelance, usaha mikro, kerja proyek, komunitas, dan portofolio sebagai sinyal keterampilan yang bisa ditingkatkan menuju pekerjaan lebih produktif.',
  },
  {
    icon: '📍',
    tag: 'Disparitas Regional',
    tagColor: '#8b5cf6',
    tagBg: '#f5f3ff',
    headline: 'Peluang Karier Tidak Merata di Seluruh Indonesia',
    body: 'Pengangguran Bali 1,5% vs Banten 8,1% — disparitas ini nyata. Retrokarir tidak hanya merekomendasikan jalur Jakarta-sentris, tapi menyesuaikan analisis dengan konteks industri lokal: nikel di Morowali, pariwisata di NTB, digital di Jabodetabek.',
  },
];

const SECTORS = [
  {
    icon: '💻',
    name: 'Teknologi & Digital',
    tag: 'Sangat Tinggi',
    tagColor: '#3b82f6',
    tagBg: '#eff6ff',
    demandLabel: 'Langka & Kritis',
    demandColor: '#3b82f6',
    formal: '↑ Tumbuh pesat',
    formalColor: '#22c55e',
    formalBg: '#f0fdf4',
    highlight: 'Big Data Specialist, Fintech Engineer, dan AI/ML Specialist dinyatakan langka oleh Kemenaker 2025. Keterampilan digital tingkat lanjut masih di bawah 1% tenaga kerja — gap terbesar di industri.',
    jobs: 'Big Data Specialist · Fintech Engineer · AI/ML Specialist · Cloud Architect · Cybersecurity Analyst',
  },
  {
    icon: '🌱',
    name: 'Energi Hijau & Keberlanjutan',
    tag: 'Berkembang Cepat',
    tagColor: '#16a34a',
    tagBg: '#f0fdf4',
    demandLabel: 'Frontier Baru',
    demandColor: '#16a34a',
    formal: '↑ Target 20.000 tenaga bersertifikat 2029',
    formalColor: '#16a34a',
    formalBg: '#f0fdf4',
    highlight: 'Indonesia mendorong transisi ke EBT, EV, dan pertanian berkelanjutan. Green skills menjadi diferensiasi kompetitif yang masih sangat jarang dimiliki kandidat lokal.',
    jobs: 'Sustainability Analyst · ESG Specialist · Energy Transition Engineer · Green Project Manager',
  },
  {
    icon: '💰',
    name: 'Keuangan & Fintech',
    tag: 'Permintaan Tinggi',
    tagColor: '#f59e0b',
    tagBg: '#fffbeb',
    demandLabel: 'Terpolarisasi',
    demandColor: '#f59e0b',
    formal: '⚠ Risiko otomasi untuk peran manual',
    formalColor: '#f59e0b',
    formalBg: '#fffbeb',
    highlight: 'Peran konvensional (teller, kasir, admin keuangan) berisiko tinggi terdisrupsi otomasi. Namun Fintech Engineer dan Digital Finance Analyst justru menjadi peran paling dicari.',
    jobs: 'Fintech Engineer · Digital Banking Analyst · Risk & Compliance Tech · Payment System Specialist',
  },
  {
    icon: '🏥',
    name: 'Kesehatan & HealthTech',
    tag: 'Stabil & Tumbuh',
    tagColor: '#6366f1',
    tagBg: '#eef2ff',
    demandLabel: 'Stabil Pasca-Pandemi',
    demandColor: '#6366f1',
    formal: '↑ Pasca-pandemi demand meningkat',
    formalColor: '#6366f1',
    formalBg: '#eef2ff',
    highlight: 'Digitalisasi layanan kesehatan membuka peluang bagi profesional dengan kombinasi domain kesehatan + keterampilan digital, terutama di telemedicine dan health data analytics.',
    jobs: 'Health Data Analyst · HealthTech Product Manager · Telemedicine Specialist · Medical Informatics',
  },
];

const OUTLOOKS = [
  {
    icon: '⚡',
    tag: 'Peluang 2025–2026',
    tagColor: '#3b82f6',
    tagBg: '#eff6ff',
    headline: 'Target 82% Penetrasi Internet Membuka Lapangan Kerja Digital Baru',
    body: 'Indonesia Digital Nation Roadmap 2021–2024 menargetkan 82% penetrasi internet dan 50% tenaga kerja dengan keterampilan digital menengah-atas. Ini membuka peluang besar bagi siapapun yang mau naik level dari keterampilan dasar ke lanjutan — mengingat hanya <1% tenaga kerja saat ini sudah di level advanced.',
    footnote: 'Sumber: Indonesia Digital Nation Roadmap 2021–2024 & Making Indonesia 4.0',
  },
  {
    icon: '🔄',
    tag: 'Risiko 2025–2027',
    tagColor: '#ef4444',
    tagBg: '#fef2f2',
    headline: 'Just Transition: Tidak Ada yang Ditinggalkan',
    body: 'WEF memproyeksikan 44% keterampilan kerja inti akan berubah pada 2027. Otomasi tidak harus berarti pengangguran — pekerja administrasi, teller, dan kasir yang proaktif upskilling ke peran augmented, menggabungkan pengalaman domain dengan AI literacy, justru menjadi profil paling berharga di era transisi ini.',
    footnote: 'Sumber: WEF Future of Jobs Report · Konsep Just Transition: ILO & Kemenaker Indonesia 2025',
  },
  {
    icon: '🎯',
    tag: 'Standar Validasi',
    tagColor: '#16a34a',
    tagBg: '#f0fdf4',
    headline: 'SKKNI & DTS: Pastikan Pelatihanmu Diakui Industri',
    body: 'Banyak platform kursus online bermunculan, tapi tidak semua diakui industri atau pemerintah. SKKNI (ditetapkan Kemenaker, terakhir diatur melalui Permenaker No. 3 Tahun 2016) menjamin standar kompetensi yang demand driven. Untuk pelatihan digital, program Digital Talent Scholarship (DTS) dari Komdigi (dahulu Kominfo) adalah jalur yang terverifikasi.',
    footnote: 'SKKNI: Kemenaker RI · DTS: Kementerian Komunikasi dan Digital (Komdigi)',
  },
];

const SKILL_GAP_SUPPORTS = [
  {
    icon: '🧩',
    tag: 'Mismatch nyata',
    title: 'Skill gap bukan hanya “kurang kursus”',
    body: 'Masalah utama pasar kerja bukan sekadar jumlah lowongan, tetapi kecocokan antara skill nyata, bukti pengalaman, dan kebutuhan industri. Ijazah penting, namun employer semakin mencari practical knowledge, komunikasi, problem solving, dan kemampuan memakai tools kerja modern.',
    metric: 'Actual skills > gelar saja',
  },
  {
    icon: '🛠️',
    tag: 'Job upgrading',
    title: 'Indonesia perlu naik dari job creation ke job upgrading',
    body: 'Pekerjaan yang tercipta perlu makin produktif, aman, dan punya ruang mobilitas. Retrokarir mendukung arah ini dengan mengubah CV menjadi peta: skill yang sudah kuat, skill yang belum terlihat, dan langkah 6–12 bulan untuk naik kelas.',
    metric: 'Produktif · layak · adaptif',
  },
  {
    icon: '🏪',
    tag: 'Sektor informal',
    title: 'Pengalaman informal tetap bisa menjadi modal karier',
    body: 'UMKM, kerja mandiri, freelance, gig work, dan usaha keluarga sering tidak tertulis rapi di CV, padahal memuat bukti sales, operasional, layanan pelanggan, logistik, digital marketing, dan administrasi. Retrokarir membantu menerjemahkannya menjadi bahasa kompetensi.',
    metric: 'UMKM = 99% aktivitas usaha',
  },
  {
    icon: '📲',
    tag: 'Digital adoption',
    title: 'Skill digital dasar harus naik menjadi skill kerja',
    body: 'Bisa memakai internet belum otomatis berarti siap kerja digital. Gap berikutnya adalah menerapkan tools untuk administrasi, analisis data sederhana, pemasaran, e-commerce, kolaborasi, dan produktivitas harian — terutama bagi pekerja informal dan UMKM.',
    metric: 'Basic → intermediate',
  },
];

// ── Component ─────────────────────────────────────────────────

export default function LandingPage({ onStart }) {
  const [insightIdx, setInsightIdx] = useState(0);
  const [sectorIdx, setSectorIdx] = useState(0);
  const [outlookIdx, setOutlookIdx] = useState(0);

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.badge}>✦ AI Career Intelligence · 2025–2026</div>
        <h1 className={styles.heroTitle}>
          Karier kamu di<br />
          <span className={styles.heroAccent}>era AI & transisi hijau</span>
        </h1>
        <p className={styles.heroSubtitle}>
          44% keterampilan kerja inti akan berubah pada 2027 (WEF). Analisis CV berbasis AI yang membaca skill gap, bukti pengalaman, dan peluang naik kelas — termasuk dari sektor informal, freelance, UMKM, dan proyek mandiri.
        </p>
        <div className={styles.heroBtns}>
          <button className={styles.ctaBtn} onClick={onStart}>
            Analisis CV Sekarang →
          </button>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <div className={styles.statsRow}>
        {STATS.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className={styles.statDivider} />}
            <div className={styles.stat}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── Skill Gap Support Section ── */}
      <section className={styles.supportSection}>
        <div className={styles.supportIntro}>
          <span className={styles.supportEyebrow}>Mengapa Retrokarir relevan?</span>
          <h2 className={styles.supportTitle}>Skill gap Indonesia tidak cukup dijawab dengan daftar kursus.</h2>
          <p className={styles.supportLead}>
            Tantangannya adalah membaca skill yang benar-benar terlihat dari CV, pengalaman informal, portofolio, dan bukti kerja — lalu mengubahnya menjadi rute upskilling yang realistis untuk pasar kerja Indonesia.
          </p>
        </div>
        <div className={styles.supportGrid}>
          {SKILL_GAP_SUPPORTS.map((item, i) => (
            <article className={styles.supportCard} key={i}>
              <div className={styles.supportIconWrap}>
                <span className={styles.supportIcon}>{item.icon}</span>
              </div>
              <span className={styles.supportTag}>{item.tag}</span>
              <h3 className={styles.supportCardTitle}>{item.title}</h3>
              <p className={styles.supportBody}>{item.body}</p>
              <span className={styles.supportMetric}>{item.metric}</span>
            </article>
          ))}
        </div>
        <p className={styles.supportSource}>
          Disarikan dari Bappenas Working Papers 2026, World Bank Skills for the Labor Market in Indonesia, dan SMERU Digital Skills Landscape/Strategy Primer.
        </p>
      </section>

      {/* ── Insight Carousel ── */}
      <section className={styles.carouselSection}>
        <div className={styles.carouselHeader}>
          <div>
            <p className={styles.sectionTitle}>Lanskap Pasar Kerja 2025</p>
            <p className={styles.sectionSub}>Data & tren yang membentuk karier kamu berikutnya</p>
          </div>
          <div className={styles.carouselNav}>
            <button
              className={styles.navBtn}
              onClick={() => setInsightIdx(i => (i - 1 + INSIGHTS.length) % INSIGHTS.length)}
            >‹</button>
            <span className={styles.navCount}>{insightIdx + 1}/{INSIGHTS.length}</span>
            <button
              className={styles.navBtn}
              onClick={() => setInsightIdx(i => (i + 1) % INSIGHTS.length)}
            >›</button>
          </div>
        </div>
        <div className={styles.carouselTrack}>
          {INSIGHTS.map((item, i) => (
            <div
              key={i}
              className={`${styles.carouselCard} ${i === insightIdx ? styles.carouselCardActive : ''}`}
            >
              <div
                className={styles.carouselCardInner}
                style={{ '--card-color': item.tagColor }}
              >
                <div className={styles.carouselIcon}>{item.icon}</div>
                <span
                  className={styles.carouselTag}
                  style={{ color: item.tagColor, background: item.tagBg }}
                >{item.tag}</span>
                <p className={styles.carouselHeadline}>{item.headline}</p>
                <p className={styles.carouselBody}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.carouselDots}>
          {INSIGHTS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === insightIdx ? styles.dotActive : ''}`}
              onClick={() => setInsightIdx(i)}
            />
          ))}
        </div>
      </section>

      {/* ── Sector Carousel ── */}
      <section className={styles.carouselSection}>
        <div className={styles.carouselHeader}>
          <div>
            <p className={styles.sectionTitle}>Sektor Prioritas 2025–2029</p>
            <p className={styles.sectionSub}>Industri dengan permintaan talenta tertinggi</p>
          </div>
          <div className={styles.carouselNav}>
            <button
              className={styles.navBtn}
              onClick={() => setSectorIdx(i => (i - 1 + SECTORS.length) % SECTORS.length)}
            >‹</button>
            <span className={styles.navCount}>{sectorIdx + 1}/{SECTORS.length}</span>
            <button
              className={styles.navBtn}
              onClick={() => setSectorIdx(i => (i + 1) % SECTORS.length)}
            >›</button>
          </div>
        </div>
        <div className={styles.carouselTrack}>
          {SECTORS.map((s, i) => (
            <div
              key={i}
              className={`${styles.carouselCard} ${styles.carouselCardSector} ${i === sectorIdx ? styles.carouselCardActive : ''}`}
            >
              <div
                className={styles.carouselCardInner}
                style={{ '--card-color': s.tagColor }}
              >
                <div className={styles.sectorCardTop}>
                  <span className={styles.sectorIcon}>{s.icon}</span>
                  <div className={styles.sectorMeta}>
                    <p className={styles.sectorName}>{s.name}</p>
                    <span
                      className={styles.sectorTag}
                      style={{ color: s.tagColor, background: s.tagBg }}
                    >{s.tag}</span>
                  </div>
                </div>
                <div className={styles.sectorStats}>
                  <div className={styles.sectorStatItem}>
                    <span className={styles.sectorStatNum} style={{ color: s.demandColor }}>{s.demandLabel}</span>
                    <span className={styles.sectorStatLabel}>status permintaan</span>
                  </div>
                </div>
                <span
                  className={styles.sectorFormalBadge}
                  style={{ color: s.formalColor, background: s.formalBg }}
                >{s.formal}</span>
                <div
                  className={styles.sectorHighlight}
                  style={{ borderColor: s.tagColor }}
                >{s.highlight}</div>
                <div className={styles.sectorJobs}>
                  <span className={styles.sectorJobsLabel}>Peran kunci</span>
                  <span className={styles.sectorJobsText}>{s.jobs}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.carouselDots}>
          {SECTORS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === sectorIdx ? styles.dotActive : ''}`}
              onClick={() => setSectorIdx(i)}
            />
          ))}
        </div>
      </section>

      {/* ── Outlook Carousel ── */}
      <section className={styles.carouselSection}>
        <div className={styles.carouselHeader}>
          <div>
            <p className={styles.sectionTitle}>Konteks & Kebijakan Nasional</p>
            <p className={styles.sectionSub}>Mengapa analisis berbasis data lebih penting dari sebelumnya</p>
          </div>
          <div className={styles.carouselNav}>
            <button
              className={styles.navBtn}
              onClick={() => setOutlookIdx(i => (i - 1 + OUTLOOKS.length) % OUTLOOKS.length)}
            >‹</button>
            <span className={styles.navCount}>{outlookIdx + 1}/{OUTLOOKS.length}</span>
            <button
              className={styles.navBtn}
              onClick={() => setOutlookIdx(i => (i + 1) % OUTLOOKS.length)}
            >›</button>
          </div>
        </div>
        <div className={styles.carouselTrack}>
          {OUTLOOKS.map((item, i) => (
            <div
              key={i}
              className={`${styles.carouselCard} ${i === outlookIdx ? styles.carouselCardActive : ''}`}
            >
              <div
                className={styles.carouselCardInner}
                style={{ '--card-color': item.tagColor }}
              >
                <div className={styles.carouselIcon}>{item.icon}</div>
                <span
                  className={styles.outlookBadge}
                >{item.tag}</span>
                <p className={styles.carouselHeadline}>{item.headline}</p>
                <p className={styles.carouselBody}>{item.body}</p>
                <p className={styles.outlookFootnote}>{item.footnote}</p>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.carouselDots}>
          {OUTLOOKS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === outlookIdx ? styles.dotActive : ''}`}
              onClick={() => setOutlookIdx(i)}
            />
          ))}
        </div>
      </section>

      {/* ── Privacy ── */}
      <section className={styles.privacySection}>
        <div className={styles.privacyInner}>
          <span className={styles.privacyIcon}>🔒</span>
          <div>
            <span className={styles.privacyTitle}>Privasi & Keamanan Data</span>
            <span className={styles.privacyText}>
              CV kamu <strong>tidak disimpan</strong> di server kami. Analisis dilakukan secara real-time dan data langsung dihapus setelah laporan digenerate. Tidak ada penyimpanan permanen, tidak ada iklan, tidak ada pihak ketiga.
            </span>
          </div>
        </div>
      </section>

      {/* ── CTA Bottom ── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Siap tahu posisi kariermu sebenarnya?</h2>
        <p className={styles.ctaBody}>
          Upload CV, isi data singkat, dan dapatkan laporan karier berbasis AI dalam hitungan menit. Gratis, privat, dan relevan dengan kondisi pasar kerja Indonesia 2025–2026 — dari jalur formal, informal, freelance, hingga transisi karier digital.
        </p>
        <button className={styles.ctaBtn} onClick={onStart}>
          Mulai Analisis CV →
        </button>
      </section>
    </div>
  );
}