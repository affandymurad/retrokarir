import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './FormPage.module.css';

const LOADING_TIPS = {
  id: [
    {
      icon: '💡',
      text: '"Investasi terbaik yang bisa kamu lakukan adalah investasi pada diri sendiri."',
      author: '— Warren Buffett'
    },
    {
      icon: '🌱',
      text: '"Pendidikan adalah senjata paling ampuh yang bisa kamu gunakan untuk mengubah dunia."',
      author: '— Nelson Mandela'
    },
    {
      icon: '🎯',
      text: '"Jangan takut melepaskan yang baik demi mengejar yang jauh lebih besar."',
      author: '— John D. Rockefeller'
    },
    {
      icon: '🔥',
      text: '"Orang-orang yang luar biasa memiliki satu kesamaan: mereka memanfaatkan waktu sebaik mungkin."',
      author: '— Carl Sandburg'
    },
    {
      icon: '🚀',
      text: '"Kesuksesan adalah jumlah dari usaha-usaha kecil yang diulang hari demi hari."',
      author: '— Robert Collier'
    },
    {
      icon: '✨',
      text: '"Kamu tidak perlu menjadi hebat untuk memulai, tapi kamu harus memulai untuk menjadi hebat."',
      author: '— Zig Ziglar'
    },
  ],
  en: [
    {
      icon: '💡',
      text: '"The only way to do great work is to love what you do. If you haven\'t found it yet, keep looking."',
      author: '— Steve Jobs'
    },
    {
      icon: '🌱',
      text: '"Education is the most powerful weapon which you can use to change the world."',
      author: '— Nelson Mandela'
    },
    {
      icon: '🎯',
      text: '"The future belongs to those who learn more skills and combine them in creative ways."',
      author: '— Robert Greene'
    },
    {
      icon: '🔥',
      text: '"It always seems impossible until it\'s done."',
      author: '— Nelson Mandela'
    },
    {
      icon: '🚀',
      text: '"An investment in knowledge pays the best interest."',
      author: '— Benjamin Franklin'
    },
    {
      icon: '✨',
      text: '"You don\'t have to be great to start, but you have to start to be great."',
      author: '— Zig Ziglar'
    },
  ],
};

function LoadingOverlay({ aiMode, modelName, outputLang }) {
  const [tipIdx, setTipIdx] = useState(0);
  const tips = LOADING_TIPS[outputLang] || LOADING_TIPS.id;

  useEffect(() => {
    setTipIdx(0);
  }, [outputLang]);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 3500);
    return () => clearInterval(t);
  }, [tips]);

  const tip = tips[tipIdx];
  const label = modelName || (aiMode === 'gemini' ? 'Gemini AI' : 'Sonnet AI');

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
        <div className={styles.loadingTipWrap} key={tipIdx}>
          <span className={styles.loadingTipIcon}>{tip.icon}</span>
          <div>
            <p className={styles.loadingTipText}>{tip.text}</p>
            <p className={styles.loadingTipAuthor}>{tip.author}</p>
          </div>
        </div>

        <p className={styles.loadingNote}>
          Proses ini membutuhkan 30–90 detik tergantung kompleksitas CV Anda.
        </p>
      </div>
    </div>
  );
}

const WORK_TYPES = ['Full Time', 'Part Time', 'Remote', 'Hybrid'];

export default function FormPage({ onSubmit, aiMode }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [modelName, setModelName] = useState('');
  const [gender, setGender] = useState('');
  const [intention, setIntention] = useState('');
  const [workTypes, setWorkTypes] = useState([]);
  const [outputLang, setOutputLang] = useState('id');
  const [locationInput, setLocationInput] = useState('');
  const [locations, setLocations] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrors(e => ({ ...e, pdf: 'Hanya file PDF yang diterima' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, pdf: 'Ukuran file maksimum 10 MB' }));
      return;
    }
    setPdfFile(file);
    setErrors(e => ({ ...e, pdf: null }));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
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
    if (!fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi';
    if (!birthDate) errs.birthDate = 'Tanggal lahir wajib diisi';
    if (!gender) errs.gender = 'Jenis kelamin wajib dipilih';
if (intention.trim().length < 50) errs.intention = `Minimal 50 karakter (saat ini: ${intention.trim().length})`;
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
    const formData = new FormData();
    formData.append('cv', pdfFile);
    formData.append('aiMode', aiMode);
    formData.append('outputLang', outputLang);
    formData.append('userData', JSON.stringify({
      fullName, birthDate, gender, intention, workTypes, dreamLocations: finalLocations, outputLang
    }));

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      onSubmit(data.data, { fullName, birthDate, gender, aiMode, modelName: data.modelName || aiMode, outputLang });
      setModelName(data.modelName || aiMode);
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

const isValid = pdfFile && fullName && birthDate && gender && intention.trim().length >= 50 && workTypes.length > 0 && (locations.length > 0 || locationInput.trim());

  return (
    <>
      {loading && <LoadingOverlay aiMode={aiMode} modelName={modelName} outputLang={outputLang} />}
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
            <input type="file" ref={fileInputRef} accept=".pdf" hidden onChange={e => handleFile(e.target.files[0])} />
            {pdfFile ? (
              <div className={styles.fileInfo}>
                <PdfIcon />
                <div>
                  <div className={styles.fileName}>{pdfFile.name}</div>
                  <div className={styles.fileSize}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button className={styles.removeFile} onClick={e => { e.stopPropagation(); setPdfFile(null); }}>
                  <XIcon />
                </button>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <UploadIcon />
                <div className={styles.dropText}>Seret & lepas PDF di sini, atau <span className={styles.dropLink}>klik untuk pilih</span></div>
                <div className={styles.dropHint}>Format PDF · Maks. 10 MB</div>
              </div>
            )}
          </div>
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
            <input
              className={`${styles.input} ${errors.birthDate ? styles.inputError : ''}`}
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
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

        {/* Intention */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>
            Tujuan Menggunakan Retrokarir <span className={styles.required}>*</span>
          </label>
          <div className={styles.textareaWrap}>
            <textarea
              className={`${styles.textarea} ${errors.intention ? styles.inputError : ''}`}
              placeholder="Ceritakan tujuan dan harapan Anda menggunakan Retrokarir... (mis: ingin berpindah karier dari akuntansi ke data science, ingin tahu celah skill untuk posisi product manager, dll)"
              value={intention}
              onChange={e => intention.length < 500 || e.target.value.length < intention.length ? setIntention(e.target.value) : null}
              maxLength={500}
              rows={4}
            />
            <div className={`${styles.charCount} ${intention.length < 50 ? styles.charLow : ''}`}>
              {intention.length}/500
            </div>
          </div>
          {errors.intention && <span className={styles.error}>{errors.intention}</span>}
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

        {/* Output Language */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>
            Bahasa Output Laporan <span className={styles.required}>*</span>
          </label>
          <div className={styles.radioGroup}>
            {[
              { value: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩', desc: 'Default' },
              { value: 'en', label: 'English', flag: '🇬🇧', desc: 'Bahasa Inggris' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`${styles.radioItem} ${outputLang === opt.value ? styles.radioActive : ''}`}
              >
                <input
                  type="radio"
                  name="outputLang"
                  value={opt.value}
                  checked={outputLang === opt.value}
                  onChange={() => setOutputLang(opt.value)}
                  hidden
                />
                <span className={styles.radioCircle}>
                  {outputLang === opt.value && <span className={styles.radioInner} />}
                </span>
                <span className={styles.radioFlag}>{opt.flag}</span>
                <span className={styles.radioLabel}>{opt.label}</span>
                {opt.value === 'id' && (
                  <span className={styles.radioDefault}>Default</span>
                )}
              </label>
            ))}
          </div>
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

        <div className={styles.comingSoonBtn}>
          🚧 Segera Hadir
        </div>
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