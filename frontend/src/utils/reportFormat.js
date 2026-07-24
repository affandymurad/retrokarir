export const RISK_COLOR = { Rendah: '#22c55e', Sedang: '#f59e0b', Tinggi: '#ef4444' };
// Warna prioritas saran CV: prioritas Tinggi = paling mendesak (merah).
export const CONFIDENCE_COLOR = { Tinggi: '#ef4444', Sedang: '#f59e0b', Rendah: '#22c55e' };

export const PILLAR_LABELS = {
  analyticalThinking:      { label: 'Analytical Thinking',       labelId: 'Kemampuan Berpikir Analitis',  desc: 'Seberapa baik kamu memecahkan masalah dan mengambil keputusan berdasarkan data/logika.', icon: '🧠' },
  resilienceAgility:       { label: 'Resilience & Agility',       labelId: 'Ketahanan & Kelincahan',       desc: 'Seberapa cepat kamu beradaptasi saat kondisi kerja berubah atau di bawah tekanan.', icon: '🔄' },
  aiAndDigital:            { label: 'AI & Digital Literacy',      labelId: 'Melek AI & Digital',           desc: 'Seberapa terbiasa kamu memakai tools digital dan AI dalam pekerjaan sehari-hari.', icon: '💻' },
  interpersonalLeadership: { label: 'Interpersonal & Leadership', labelId: 'Kerja Sama & Kepemimpinan',    desc: 'Seberapa baik kamu bekerja dengan orang lain dan memimpin/mengoordinasikan tim.', icon: '🤝' },
};

export function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    return Object.values(value).filter(v => typeof v === 'string').join(' ');
  }
  return String(value);
}

export function clampScore(value) {
  const n = Number(value || 0);
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

export function getScoreColor(s) {
  return s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
}