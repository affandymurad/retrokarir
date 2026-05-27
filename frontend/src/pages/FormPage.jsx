import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './FormPage.module.css';

const QUOTES = [
  { text: 'Berikan aku 1000 orang tua, niscaya akan kucabut Semeru dari akarnya. Berikan aku 10 pemuda, niscaya akan kuguncangkan dunia.', author: 'Ir. Soekarno', role: 'Proklamator & Presiden ke-1 RI' },
  { text: 'Ilmu yang tidak diamalkan bagaikan pohon yang tidak berbuah.', author: 'Mohammad Hatta', role: 'Proklamator & Wakil Presiden ke-1 RI' },
  { text: 'Tidak penting apa agama atau sukumu, kalau kamu bisa melakukan sesuatu yang baik untuk semua orang, orang tidak pernah tanya apa agamamu.', author: 'KH. Abdurrahman Wahid (Gus Dur)', role: 'Presiden ke-4 RI & Tokoh Pluralisme' },
  { text: 'Reformasi bukan hanya tentang perubahan sistem, tapi perubahan cara kita berpikir dan bertindak.', author: 'Sri Mulyani Indrawati', role: 'Mantan Direktur Pelaksana Bank Dunia' },
  { text: 'Diplomasi yang baik bukan hanya tentang berbicara, tetapi tentang mendengar dan memahami.', author: 'Retno Marsudi', role: 'Utusan Khusus Sekjen PBB' },
  { text: 'Kalau tidak berani, jangan mimpi jadi pemimpin.', author: 'Susi Pudjiastuti', role: 'Tokoh Maritim & Mantan Menteri Kelautan' },
  { text: 'Jadilah pelopor, jangan hanya menjadi penonton.', author: 'Tri Rismaharini', role: 'Birokrat & Mantan Menteri Sosial' },
  { text: 'Berjuanglah untuk hidup, karena dengan berjuang maka hidup menjadi bermakna.', author: 'Pramoedya Ananta Toer', role: 'Sastrawan & Intelektual Humanis' },
  { text: 'Habis gelap terbitlah terang.', author: 'R.A. Kartini', role: 'Tokoh Emansipasi & Pemikir Pendidikan Perempuan' },
  { text: 'Jika seseorang memiliki kemauan dan ia mencoba, ia sering kali akan meraihnya.', author: 'B.J. Habibie', role: 'Bapak Teknologi Indonesia & Presiden ke-3 RI' },
  { text: 'Ilmu pengetahuan tanpa agama adalah pincang. Agama tanpa ilmu pengetahuan adalah buta.', author: 'Buya Hamka', role: 'Ulama, Sastrawan & Intelektual Islam' },
  { text: 'Kerja keras adalah cara terbaik untuk membuktikan bahwa kamu layak.', author: 'Nadiem Makarim', role: 'Teknokrat & Pendiri Gojek' },
  { text: 'Najwa percaya bahwa jurnalisme yang baik bukan hanya menyampaikan fakta, tetapi juga menginspirasi perubahan.', author: 'Najwa Shihab', role: 'Jurnalis, Presenter & Pendiri Narasi' },
  { text: 'Sains adalah bahasa universal yang menghubungkan kita semua.', author: 'Prof. Adi Utarini', role: 'Peneliti & Ilmuwan Kesehatan Dunia' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela', role: 'Mantan Presiden Afrika Selatan & Pejuang Kemanusiaan' },
  { text: 'Be the change you wish to see in the world.', author: 'Mahatma Gandhi', role: 'Pemimpin Spiritual & Tokoh Perdamaian India' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill', role: 'Mantan Perdana Menteri Britania Raya' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Barack Obama', role: 'Mantan Presiden Amerika Serikat' },
  { text: 'Hard work is the foundation of everything. Talent alone is not enough.', author: 'Lee Kuan Yew', role: 'Bapak Bangsa & Perdana Menteri Pertama Singapura' },
  { text: 'Watch your thoughts, for they will become actions. Watch your actions, for they become habits.', author: 'Margaret Thatcher', role: 'Mantan Perdana Menteri Britania Raya' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs', role: 'Pendiri Apple' },
  { text: "It's fine to celebrate success, but it is more important to heed the lessons of failure.", author: 'Bill Gates', role: 'Pendiri Microsoft & Filantropis' },
  { text: 'When something is important enough, you do it even if the odds are not in your favor.', author: 'Elon Musk', role: 'Pendiri SpaceX & Tesla' },
  { text: "We're in the business of helping people change their lives.", author: 'Tim Cook', role: 'CEO Apple' },
  { text: "What we want is to see the child in pursuit of knowledge, and not knowledge in pursuit of the child.", author: 'Sundar Pichai', role: 'CEO Google & Alphabet' },
  { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein', role: 'Fisikawan Teoretis' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie', role: 'Fisikawan & Kimiawan Perintis Radiasi' },
  { text: 'Genius is one percent inspiration, ninety-nine percent perspiration.', author: 'Thomas Edison', role: 'Penemu & Pengusaha Teknologi Klasik' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds', role: 'Pencipta Sistem Operasi Linux' },
  { text: 'Carina percaya bahwa ilmu pengetahuan tidak mengenal batas negara.', author: 'Carina Joe', role: 'Ilmuwan Indonesia & Pemegang Paten Vaksin Global' },
  { text: 'Listrik bukan kemewahan, listrik adalah hak dasar setiap manusia.', author: 'Tri Mumpuni', role: 'Teknokrat Pemberdaya Listrik Pedesaan' },
];

function LoadingOverlay({ modelName }) {
  const [qIdx, setQIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setQIdx(i => (i + 1) % QUOTES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const q = QUOTES[qIdx];
  const label = modelName || 'Gemini AI';

  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingContent}>
        {/* Spinner ring */}
        <div className={styles.spinnerWrap}>
          <div className={styles.spinnerRing} />
          <div className={styles.spinnerIcon}>✦</div>
        </div>

        {/* Title */}
        <h2 className={styles.loadingTitle}>Menganalisis CV...</h2>

        {/* Model badge */}
        <div className={styles.loadingBadge}>
          <span className={styles.loadingBadgeDot} />
          {label}
        </div>

        {/* Rotating quote */}
        <div className={styles.loadingQuoteWrap} key={qIdx}>
          <p className={styles.loadingQuoteText}>"{q.text}"</p>
          <div className={styles.loadingQuoteAuthor}>
            <span className={styles.loadingQuoteName}>{q.author}</span>
            <span className={styles.loadingQuoteRole}>{q.role}</span>
          </div>
        </div>

        <p className={styles.loadingNote}>
          Agar stabil di Netlify, unggah CV PDF maksimal 3 halaman.
        </p>
      </div>
    </div>
  );
}

const WORK_TYPES = ['Full Time', 'Part Time', 'Remote', 'Hybrid'];
const MAX_PDF_PAGES = 3;

async function countPdfPages(file) {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  const pageMatches = text.match(/\/Type\s*\/Page(?!s)\b/g);
  if (pageMatches?.length) return pageMatches.length;

  const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)]
    .map(match => Number(match[1]))
    .filter(n => Number.isFinite(n) && n > 0);

  return countMatches.length ? Math.max(...countMatches) : 0;
}

// Konversi string tanggal dari berbagai format ke ISO yyyy-mm-dd.
// Safari iOS tidak support input[type=date] — user ketik manual dengan format bervariasi.
function parseBirthDateToISO(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  // Sudah yyyy-mm-dd (format standar dari input[type=date] yang support)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy atau dd-mm-yyyy atau dd.mm.yyyy
  const dmy = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  // Fallback: parse generik, ambil komponen manual untuk hindari timezone shift
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return null;
}

// Deteksi apakah browser support input[type=date] natively.
// Safari iOS tidak support — value selalu '' sehingga user harus ketik manual.
function supportsDateInput() {
  if (typeof document === 'undefined') return true;
  const i = document.createElement('input');
  i.setAttribute('type', 'date');
  i.setAttribute('value', 'x');
  return i.value !== 'x';
}

export default function FormPage({ onSubmit }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPageCount, setPdfPageCount] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [modelName, setModelName] = useState('');
  const [gender, setGender] = useState('');
  const [workTypes, setWorkTypes] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [locations, setLocations] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasDateSupport, setHasDateSupport] = useState(true);
  const fileInputRef = useRef();

  useEffect(() => {
    setHasDateSupport(supportsDateInput());
  }, []);

  const handleFile = async (file) => {
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

    setPdfFile(null);
    setPdfPageCount(null);

    if (!isPdf) {
      setErrors(e => ({ ...e, pdf: 'Hanya file PDF yang diterima' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, pdf: 'Ukuran file maksimum 10 MB' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const pages = await countPdfPages(file);

      if (!pages) {
        setErrors(e => ({
          ...e,
          pdf: 'Jumlah halaman PDF tidak dapat dibaca. Coba ekspor ulang CV sebagai PDF standar.',
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (pages > MAX_PDF_PAGES) {
        setErrors(e => ({
          ...e,
          pdf: `CV maksimal ${MAX_PDF_PAGES} halaman agar analisis tidak timeout di Netlify. PDF ini terdeteksi ${pages} halaman.`,
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPdfFile(file);
      setPdfPageCount(pages);
      setErrors(e => ({ ...e, pdf: null, submit: null }));
    } catch (err) {
      setErrors(e => ({
        ...e,
        pdf: 'Gagal membaca jumlah halaman PDF. Coba gunakan PDF hasil export ulang.',
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);
    await handleFile(e.dataTransfer.files[0]);
  }, []);

  const toggleWorkType = (wt) => {
    setWorkTypes(prev => prev.includes(wt) ? prev.filter(x => x !== wt) : [...prev, wt]);
  };

  const handleLocationKey = (e) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const val = locationInput.trim().replace(/,$/, '');
      if (val && !locations.includes(val)) {
        setLocations(prev => [...prev, val]);
      }
      setLocationInput('');
    }
  };

  const handleLocationChange = (e) => {
    const val = e.target.value;
    if (val.endsWith(',')) {
      const trimmed = val.slice(0, -1).trim();
      if (trimmed && !locations.includes(trimmed)) {
        setLocations(prev => [...prev, trimmed]);
      }
      setLocationInput('');
    } else {
      setLocationInput(val);
    }
  };

  const removeLocation = (loc) => setLocations(prev => prev.filter(l => l !== loc));

  const validate = () => {
    const errs = {};
    if (!pdfFile) errs.pdf = 'CV wajib diunggah';
    if (pdfFile && pdfPageCount > MAX_PDF_PAGES) errs.pdf = `CV maksimal ${MAX_PDF_PAGES} halaman`; 
    if (!fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi';
    if (!birthDate) {
      errs.birthDate = 'Tanggal lahir wajib diisi';
    } else if (!parseBirthDateToISO(birthDate)) {
      errs.birthDate = 'Format tanggal tidak valid. Gunakan DD/MM/YYYY';
    }
    if (!gender) errs.gender = 'Jenis kelamin wajib dipilih';
    if (workTypes.length === 0) errs.workTypes = 'Pilih minimal satu tipe kerja';
    if (locations.length === 0 && !locationInput.trim()) errs.locations = 'Tambahkan minimal satu lokasi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    // add any lingering locationInput
    let finalLocations = [...locations];
    if (locationInput.trim() && !finalLocations.includes(locationInput.trim())) {
      finalLocations.push(locationInput.trim());
      setLocations(finalLocations);
      setLocationInput('');
    }
    if (!validate()) return;

    setLoading(true);

    // Normalisasi birthDate ke format ISO yyyy-mm-dd agar aman di semua browser termasuk Safari iOS
    const isoDate = parseBirthDateToISO(birthDate) || birthDate;

    const formData = new FormData();
    formData.append('cv', pdfFile);
    formData.append('userData', JSON.stringify({
      fullName, birthDate: isoDate, gender, workTypes, dreamLocations: finalLocations
    }));

    try {
      // Gunakan absolute URL agar aman di Safari iOS PWA/standalone mode
      const apiUrl = `${window.location.origin}/api/analyze`;
      const res = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      onSubmit(data.data, { fullName, birthDate: isoDate, gender, modelName: data.modelName || 'Gemini AI' });
      setModelName(data.modelName || 'Gemini AI');
    } catch (err) {
      // Sanitize raw API error — ambil kalimat pertama sebelum tanda kurung siku
      const raw = err.message || 'Terjadi kesalahan server';
      const clean = raw.split('[{')[0].split('\n')[0].trim().replace(/\s+/g, ' ');
      const friendly = clean.length > 200 ? clean.slice(0, 200) + '...' : clean;
      setErrors(e => ({ ...e, submit: friendly }));
    } finally {
      setLoading(false);
    }
  };

const isValid = pdfFile && pdfPageCount && pdfPageCount <= MAX_PDF_PAGES && fullName && birthDate && gender && workTypes.length > 0 && (locations.length > 0 || locationInput.trim());

  return (
    <>
      {loading && <LoadingOverlay modelName={modelName} />}
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Upload CV & Isi Data Diri</h1>
          <p className={styles.subtitle}>Lengkapi semua informasi berikut untuk analisis yang akurat</p>
        </div>

        {/* PDF Upload */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>
            Dokumen CV <span className={styles.required}>*</span>
          </label>
          <div
            className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${pdfFile ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} accept=".pdf" hidden onChange={async e => handleFile(e.target.files[0])} />
            {pdfFile ? (
              <div className={styles.fileInfo}>
                <PdfIcon />
                <div>
                  <div className={styles.fileName}>{pdfFile.name}</div>
                  <div className={styles.fileSize}>
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    {pdfPageCount ? ` · ${pdfPageCount} halaman` : ''}
                  </div>
                </div>
                <button className={styles.removeFile} onClick={e => { e.stopPropagation(); setPdfFile(null); setPdfPageCount(null); }}>
                  <XIcon />
                </button>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <UploadIcon />
                <div className={styles.dropText}>Seret & lepas PDF di sini, atau <span className={styles.dropLink}>klik untuk pilih</span></div>
                <div className={styles.dropHint}>Format PDF · Maks. 3 halaman · Maks. 10 MB</div>
              </div>
            )}
          </div>
          <div className={styles.pdfLimitHint}>CV panjang sebaiknya diringkas ke 1–3 halaman agar proses analisis stabil di Netlify.</div>
          {errors.pdf && <span className={styles.error}>{errors.pdf}</span>}
        </div>

        {/* Personal Info */}
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nama Lengkap <span className={styles.required}>*</span></label>
            <input
              className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
              type="text"
              placeholder="Masukkan nama lengkap Anda"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            {errors.fullName && <span className={styles.error}>{errors.fullName}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tanggal Lahir <span className={styles.required}>*</span></label>
            {hasDateSupport ? (
              <input
                className={`${styles.input} ${errors.birthDate ? styles.inputError : ''}`}
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            ) : (
              /* Fallback untuk Safari iOS yang tidak support input[type=date] */
              <input
                className={`${styles.input} ${errors.birthDate ? styles.inputError : ''}`}
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                maxLength={10}
              />
            )}
            {!hasDateSupport && (
              <span className={styles.hint}>Contoh: 15/08/1995</span>
            )}
            {errors.birthDate && <span className={styles.error}>{errors.birthDate}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Jenis Kelamin <span className={styles.required}>*</span></label>
            <div className={styles.genderGroup}>
              {['Laki-laki', 'Perempuan'].map(g => (
                <button
                  key={g}
                  className={`${styles.genderBtn} ${gender === g ? styles.genderActive : ''}`}
                  onClick={() => setGender(g)}
                  type="button"
                >
                  {g === 'Laki-laki' ? '♂' : '♀'} {g}
                </button>
              ))}
            </div>
            {errors.gender && <span className={styles.error}>{errors.gender}</span>}
          </div>
        </div>

        {/* Work Types */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>
            Preferensi Tipe Kerja <span className={styles.required}>*</span>
          </label>
          <div className={styles.checkboxGroup}>
            {WORK_TYPES.map(wt => (
              <label key={wt} className={`${styles.checkItem} ${workTypes.includes(wt) ? styles.checkActive : ''}`}>
                <input
                  type="checkbox"
                  checked={workTypes.includes(wt)}
                  onChange={() => toggleWorkType(wt)}
                  hidden
                />
                <span className={styles.checkBox}>{workTypes.includes(wt) ? <CheckIcon /> : null}</span>
                {wt}
              </label>
            ))}
          </div>
          {errors.workTypes && <span className={styles.error}>{errors.workTypes}</span>}
        </div>

        {/* Locations */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>
            Lokasi Impian <span className={styles.required}>*</span>
          </label>
          <div className={`${styles.chipInput} ${errors.locations ? styles.inputError : ''}`}>
            {locations.map(loc => (
              <span key={loc} className={styles.chip}>
                {loc}
                <button onClick={() => removeLocation(loc)} className={styles.chipRemove}><XIcon /></button>
              </span>
            ))}
            <input
              type="text"
              className={styles.chipInputField}
              placeholder={locations.length === 0 ? 'Ketik lokasi, tekan Enter atau koma untuk tambah...' : 'Tambah lokasi...'}
              value={locationInput}
              onChange={handleLocationChange}
              onKeyDown={handleLocationKey}
            />
          </div>
          <div className={styles.hint}>Bisa berupa kota atau negara. Tekan Enter atau koma untuk menambahkan.</div>
          {errors.locations && <span className={styles.error}>{errors.locations}</span>}
        </div>

        {errors.submit && (
          <div className={styles.submitError}>
            <span className={styles.submitErrorIcon}>⚠️</span>
            <span className={styles.submitErrorText}>{errors.submit}</span>
          </div>
        )}

        {/* Privacy Notice */}
        <div className={styles.privacyNotice}>
          <span className={styles.privacyIcon}>🔒</span>
          <div>
            <span className={styles.privacyTitle}>Privasi & Keamanan Data</span>
            <span className={styles.privacyText}>
              CV dan data pribadi Anda <strong>tidak disimpan</strong> di server kami. Semua data hanya diproses sementara dalam memori selama analisis berlangsung, kemudian langsung dibuang. Tidak ada data yang digunakan untuk keperluan selain analisis skill gap yang Anda minta.
            </span>
          </div>
        </div>

        {/* TODO: Uncomment button di bawah dan hapus label "Segera Hadir" saat sudah siap */}
        <button
          className={`${styles.submitBtn} ${!isValid ? styles.submitDisabled : ''}`}
          onClick={handleSubmit}
          disabled={loading}
        >
          Analisa Sekarang
          <ArrowIcon />
        </button>


      </div>
    </div>
    </>
  );
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
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