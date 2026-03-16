import React, { useState } from 'react';
import styles from './LandingPage.module.css';

const stats = [
  {
    icon: '⚡',
    label: 'Atasi Krisis Skill Mismatch',
    headline: 'Hanya 13% pekerja muda bekerja sesuai kualifikasinya',
    body: 'Di Indonesia, 60% pekerja terjebak dalam pekerjaan tidak relevan dengan latar belakang pendidikan mereka. Retrokarir membantu Anda menemukan jalur yang tepat.',
    tag: 'Relevansi',
    color: '#C45C26'
  },
  {
    icon: '🖥️',
    label: 'Siap Hadapi Disrupsi Digital',
    headline: '80% industri butuh tenaga digital — baru 50% siap',
    body: 'Retrokarir mengidentifikasi celah literasi digital Anda untuk memenuhi standar industri 2026 yang terus berkembang.',
    tag: 'Literasi Digital',
    color: '#2D7A4F'
  },
  {
    icon: '🤖',
    label: 'Adaptasi Cepat Terhadap Otomasi',
    headline: '44% keterampilan akan berubah pada 2027',
    body: 'Percepatan otomasi dan AI mengubah lanskap kerja. Kami membantu Anda tetap relevan melalui peta jalan reskilling yang presisi.',
    tag: 'Future-Ready',
    color: '#7C3AED'
  },
  {
    icon: '📋',
    label: 'Analisis Berbasis Standar Nasional',
    headline: 'Mengacu KBJI 2014 & Proyeksi Ketenagakerjaan 2026',
    body: 'Evaluasi ilmiah dan aplikatif di pasar lokal Indonesia — bukan sekadar saran generik, tapi rekomendasi yang benar-benar berlaku.',
    tag: 'Standar KBJI',
    color: '#B87333'
  },
  {
    icon: '🧠',
    label: 'Pengembangan Profil Holistik',
    headline: 'Kognitif, Interpersonal, Self-leadership & Digital',
    body: 'Kami tidak hanya menilai keterampilan teknis, tapi memetakan potensi Anda pada 4 pilar kompetensi yang sangat dihargai pemberi kerja.',
    tag: 'Holistik',
    color: '#0891B2'
  }
];

const outlookSectors = [
  {
    icon: '🌾', name: 'Pertanian, Kehutanan & Perikanan',
    share: 28.15, absorb: '±41,5 juta orang',
    jobs: 'Petani tanaman pangan, manajer produksi pertanian, pekerja kehutanan',
    formal: 'Dominan Informal', formalColor: '#B87333',
    highlight: 'Tetap penyerap terbesar, namun menghadapi krisis regenerasi. Fokus bergeser ke pertanian presisi, modernisasi alsintan, dan food estate untuk ketahanan pangan.',
    tag: 'Tradisional → Modern', tagColor: '#B87333'
  },
  {
    icon: '🛒', name: 'Perdagangan Besar & Eceran, Reparasi',
    share: 18.73, absorb: '±28,4 juta orang',
    jobs: 'Tenaga penjualan, kasir, mekanik kendaraan listrik',
    formal: 'Campuran (Banyak Informal)', formalColor: '#0891B2',
    highlight: 'Penyerap terbesar kedua. Pertumbuhan didorong e-commerce; mekanik mengalami transisi besar ke teknologi kendaraan listrik (EV).',
    tag: 'Transisi EV', tagColor: '#0891B2'
  },
  {
    icon: '🏭', name: 'Industri Pengolahan (Manufaktur)',
    share: 13.86, absorb: '±21 juta orang (2026)',
    jobs: 'Operator mesin produksi, perakit, operator pengolahan plastik',
    formal: 'Dominan Formal', formalColor: '#2D7A4F',
    highlight: 'Motor hilirisasi mineral; risiko substitusi tinggi oleh otomatisasi pada pekerjaan rutin.',
    tag: 'Hilirisasi + Otomasi', tagColor: '#2D7A4F'
  },
  {
    icon: '🍽️', name: 'Akomodasi & Makan Minum',
    share: 7.98, absorb: null,
    jobs: 'Koki, pelayan restoran, pengelola penginapan',
    formal: 'Dominan Informal', formalColor: '#B87333',
    highlight: 'Tumbuh seiring pemulihan pariwisata dan pola konsumsi masyarakat yang berkelanjutan.',
    tag: 'Pariwisata', tagColor: '#B87333'
  },
  {
    icon: '🏗️', name: 'Konstruksi & Infrastruktur',
    share: 6.51, absorb: null,
    jobs: 'Pekerja bangunan, operator alat berat, mandor',
    formal: 'Campuran (Berbasis Proyek)', formalColor: '#C45C26',
    highlight: 'Permintaan tinggi didorong pembangunan infrastruktur strategis dan kawasan industri hilirisasi.',
    tag: 'Infrastruktur', tagColor: '#C45C26'
  },
  {
    icon: '🎓', name: 'Jasa Pendidikan',
    share: 5.06, absorb: null,
    jobs: 'Guru, dosen, instruktur pelatihan vokasi',
    formal: 'Formal', formalColor: '#F59E0B',
    highlight: 'Fokus pada peningkatan kualitas SDM; permintaan tinggi untuk tenaga pendidik yang memiliki kualifikasi digital.',
    tag: 'EdTech', tagColor: '#F59E0B'
  },
  {
    icon: '🎨', name: 'Jasa Lainnya',
    share: 4.45, absorb: '±30,9 juta orang',
    jobs: 'Pekerja seni, terapis kecantikan, jasa perorangan',
    formal: 'Dominan Informal', formalColor: '#B87333',
    highlight: 'Tetap menyerap tenaga kerja besar di sektor jasa perorangan dan kreatif dengan potensi formalisasi bertahap.',
    tag: 'Ekonomi Kreatif', tagColor: '#B87333'
  },
  {
    icon: '🚚', name: 'Transportasi & Pergudangan',
    share: 4.28, absorb: null,
    jobs: 'Kurir logistik, pengemudi, spesialis rantai pasok',
    formal: 'Campuran (Gig Economy)', formalColor: '#7C3AED',
    highlight: 'Tumbuh pesat didorong digitalisasi logistik dan efisiensi rantai pasok nasional.',
    tag: 'Logistik Digital', tagColor: '#7C3AED'
  },
  {
    icon: '🏛️', name: 'Administrasi Pemerintahan',
    share: 3.50, absorb: null,
    jobs: 'Pegawai negeri, staf administrasi publik, aparat keamanan',
    formal: 'Formal', formalColor: '#C45C26',
    highlight: 'Fokus pada penguatan kapasitas institusi dan digitalisasi layanan publik.',
    tag: 'Digitalisasi', tagColor: '#C45C26'
  },
  {
    icon: '🔬', name: 'Jasa Profesional, Ilmiah & Teknis',
    share: 1.76, absorb: null,
    jobs: 'Konsultan bisnis, analis proses, perencana produksi',
    formal: 'Formal (Knowledge)', formalColor: '#7C3AED',
    highlight: 'Sektor berbasis pengetahuan; permintaan meningkat untuk tenaga kerja berkemampuan analitis tinggi.',
    tag: 'Knowledge Economy', tagColor: '#7C3AED'
  },
  {
    icon: '🏥', name: 'Jasa Kesehatan & Sosial',
    share: 1.68, absorb: null,
    jobs: 'Perawat, tenaga pendukung kesehatan, pekerja sosial',
    formal: 'Formal', formalColor: '#2D7A4F',
    highlight: 'Ekspansi signifikan seiring penuaan penduduk dan peningkatan kesadaran kesehatan pascapandemi.',
    tag: 'HealthTech', tagColor: '#2D7A4F'
  },
  {
    icon: '⛏️', name: 'Pertambangan & Penggalian',
    share: 1.18, absorb: null,
    jobs: 'Insinyur pertambangan, operator alat berat tambang',
    formal: 'Formal', formalColor: '#2D7A4F',
    highlight: 'Motor utama melalui kebijakan hilirisasi nikel, tembaga, dan bauksit. Butuh tenaga ahli teknis bersertifikasi.',
    tag: 'Hilirisasi', tagColor: '#2D7A4F'
  },
  {
    icon: '🏦', name: 'Jasa Keuangan & Asuransi',
    share: 1.12, absorb: null,
    jobs: 'Analis keuangan, agen asuransi, spesialis manajemen risiko',
    formal: 'Formal', formalColor: '#2D7A4F',
    highlight: 'Produktivitas tinggi; berfokus pada inovasi layanan keuangan digital dan manajemen risiko.',
    tag: 'Fintech', tagColor: '#2D7A4F'
  },
  {
    icon: '💻', name: 'Informasi & Komunikasi',
    share: 0.73, absorb: null,
    jobs: 'Pengembang perangkat lunak, analis data, ahli keamanan siber',
    formal: 'Formal + Gig', formalColor: '#7C3AED',
    highlight: 'Pilar transformasi digital; kebutuhan tenaga terampil digital melonjak drastis hingga target lebih dari 80%.',
    tag: 'Tumbuh Pesat', tagColor: '#7C3AED'
  },
  {
    icon: '🏢', name: 'Real Estat',
    share: 0.41, absorb: null,
    jobs: 'Agen properti, pengelola aset, penilai tanah',
    formal: 'Formal', formalColor: '#0891B2',
    highlight: 'Tumbuh selaras pengembangan kawasan industri terpadu dan hunian di pusat pertumbuhan baru.',
    tag: 'Properti', tagColor: '#0891B2'
  },
  {
    icon: '♻️', name: 'Pengadaan Air & Pengelolaan Sampah',
    share: 0.35, absorb: null,
    jobs: 'Penyortir sampah, teknisi pengolahan limbah',
    formal: 'Transformasi ke Formal', formalColor: '#2D7A4F',
    highlight: 'Sektor inti green jobs; didorong industri daur ulang dan ekonomi sirkular.',
    tag: 'Green Jobs', tagColor: '#2D7A4F'
  },
  {
    icon: '⚡', name: 'Pengadaan Listrik, Gas & Energi',
    share: 0.25, absorb: null,
    jobs: 'Teknisi listrik, operator pembangkit energi terbarukan',
    formal: 'Formal', formalColor: '#F59E0B',
    highlight: 'Fokus pada ketahanan energi nasional dan akselerasi transisi energi hijau.',
    tag: 'Transisi Energi', tagColor: '#F59E0B'
  }
];

const outlookStats = [
  { num: '7,46 jt', label: 'Pengangguran 2025', sub: 'Turun dari tahun sebelumnya' },
  { num: '±58%', label: 'Pekerja Informal', sub: 'Masih dominan di pasar kerja' },
  { num: '47 jt', label: 'Butuh Reskilling', sub: 'Proyeksi hingga 2030' },
  { num: '2030', label: 'Target Net Zero', sub: 'Dorong 3,88 jt green jobs' },
];

export default function LandingPage({ onStart }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>AI-Powered · Indonesia · 2026</div>
          <h1 className={styles.heroTitle}>
            Temukan Celah<br />
            <span className={styles.heroAccent}>Karier Anda</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Retrokarir menganalisis CV Anda secara mendalam menggunakan AI dan standar kompetensi nasional — memberikan peta jalan pengembangan karier yang presisi dan aplikatif.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.ctaBtn} onClick={onStart}>
              Mulai Analisis Gratis
              <ArrowIcon />
            </button>
            <a 
              href="https://affandymurad.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.portfolioBtn}
              style={{textDecoration: 'none'}}
            >
              👤 Affandy Murad
            </a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.visualCard}>
            <div className={styles.visualDot} style={{'--c': '#C45C26'}} />
            <div className={styles.visualDot} style={{'--c': '#2D7A4F'}} />
            <div className={styles.visualDot} style={{'--c': '#7C3AED'}} />
            <div className={styles.visualLines}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.visualLine} style={{animationDelay: `${i * 0.2}s`, '--w': `${60 + Math.random() * 30}%`}} />
              ))}
            </div>
            <div className={styles.visualLabel}>Skill Gap Analysis</div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className={styles.statsRow}>
        <div className={styles.stat}><span className={styles.statNum}>13%</span><span className={styles.statLabel}>Kesesuaian Kerja</span></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><span className={styles.statNum}>44%</span><span className={styles.statLabel}>Skills Berubah 2027</span></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><span className={styles.statNum}>80%</span><span className={styles.statLabel}>Butuh Kompetensi Digital</span></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><span className={styles.statNum}>KBJI</span><span className={styles.statLabel}>Standar Nasional 2014</span></div>
      </section>

      {/* Cards */}
      <section className={styles.cards}>
        <h2 className={styles.sectionTitle}>Mengapa Retrokarir?</h2>
        <div className={styles.cardGrid}>
          {stats.map((s, i) => (
            <div key={i} className={styles.card} style={{'--accent-color': s.color, animationDelay: `${i * 0.1}s`}}>
              <div className={styles.cardIcon}>{s.icon}</div>
              <div className={styles.cardTag} style={{color: s.color, background: `${s.color}18`}}>{s.tag}</div>
              <h3 className={styles.cardHeadline}>{s.headline}</h3>
              <p className={styles.cardBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Outlook Section */}
      <section className={styles.outlook}>
        <div className={styles.outlookHeader}>
          <div className={styles.outlookBadge}>Berdasarkan Data · 17 Sektor KBLI 2020</div>
          <h2 className={styles.outlookTitle}>Outlook Pasar Kerja Indonesia 2026</h2>
          <p className={styles.outlookSubtitle}>
            Pasar kerja Indonesia sedang bergeser dari sektor tradisional menuju jasa modern dan industri bernilai tambah. Kenali sektor Anda dan posisikan diri dengan tepat.
          </p>
        </div>

        {/* Outlook Mini Stats */}
        <div className={styles.outlookStats}>
          {outlookStats.map((o, i) => (
            <div key={i} className={styles.outlookStat}>
              <span className={styles.outlookStatNum}>{o.num}</span>
              <span className={styles.outlookStatLabel}>{o.label}</span>
              <span className={styles.outlookStatSub}>{o.sub}</span>
            </div>
          ))}
        </div>

        {/* Sector Tabs */}
        <div className={styles.sectorTabs}>
          {outlookSectors.map((s, i) => (
            <button
              key={i}
              className={`${styles.sectorTab} ${activeTab === i ? styles.sectorTabActive : ''}`}
              style={activeTab === i ? {'--tab-color': s.tagColor} : {}}
              onClick={() => setActiveTab(i)}
              title={s.name}
            >
              <span>{s.icon}</span>
              <span className={styles.sectorTabName}>{s.name}</span>
            </button>
          ))}
        </div>

{/* Active Sector Detail */}
        {(() => {
          const s = outlookSectors[activeTab];
          return (
            <div className={styles.sectorDetail} style={{'--sector-color': s.tagColor}}>
              <div className={styles.sectorDetailLeft}>
                <div className={styles.sectorDetailIcon}>{s.icon}</div>
                <div>
                  <h3 className={styles.sectorDetailName}>{s.name}</h3>
                  <span className={styles.sectorDetailTag} style={{color: s.tagColor, background: `${s.tagColor}18`}}>
                    {s.tag}
                  </span>
                </div>
              </div>
              <div className={styles.sectorDetailRight}>
                {s.share && (
                  <div className={styles.sectorShare}>
                    <div className={styles.sectorShareRow}>
                      <span className={styles.sectorShareNum}>{s.share}%</span>
                      {s.absorb && <span className={styles.sectorAbsorbBadge}>{s.absorb}</span>}
                    </div>
                    <span className={styles.sectorShareLabel}>Proporsi Tenaga Kerja Nasional (Sakernas 2025)</span>
                    <div className={styles.sectorShareBar}>
                      <div className={styles.sectorShareFill} style={{width: `${Math.min(s.share * 3, 100)}%`, background: s.tagColor}} />
                    </div>
                  </div>
                )}
                {s.absorb && !s.share && (
                  <div className={styles.sectorAbsorb}>
                    <span className={styles.sectorAbsorbNum}>{s.absorb}</span>
                    <span className={styles.sectorShareLabel}>Estimasi Serapan</span>
                  </div>
                )}
                <div className={styles.sectorFormal} style={{color: s.formalColor, background: `${s.formalColor}18`}}>
                  {s.formal}
                </div>
                {s.jobs && (
                  <div className={styles.sectorJobs}>
                    <span className={styles.sectorJobsLabel}>Contoh Pekerjaan</span>
                    <span className={styles.sectorJobsText}>{s.jobs}</span>
                  </div>
                )}
                <p className={styles.sectorHighlight}>{s.highlight}</p>
              </div>
            </div>
          );
        })()}

        <div className={styles.outlookFootnote}>
          Sumber: Outlook Ketenagakerjaan 2026 · Sakernas 2024/2025 · Statistik Indonesia 2025 · KBLI 2020
        </div>
      </section>

{/* Privacy Notice */}
      <section className={styles.privacyNotice}>
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
      
      {/* CTA Bottom */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Siap Mengambil Langkah Pertama?</h2>
        <p className={styles.ctaBody}>Upload CV Anda sekarang dan dapatkan analisis mendalam dalam hitungan menit.</p>
        <button className={styles.ctaBtn} onClick={onStart}>
          Mulai Analisis Sekarang
          <ArrowIcon />
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