# 🎯 Retrokarir — AI Skill Gap Advisor

Website analisis kesenjangan keterampilan (Skill Gap Analysis) berbasis AI untuk pasar tenaga kerja Indonesia.

---

## 🏗️ Struktur Proyek

```
retrokarir/
├── backend/          # Express.js API Server
│   ├── src/
│   │   └── index.js  # Main server
│   ├── .env          # Konfigurasi API Key (EDIT INI!)
│   └── package.json
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── styles/
│   └── package.json
└── README.md
```

---

## 🚀 Langkah Setup & Menjalankan

### 1. Prasyarat
- Node.js v20+ (sudah terpenuhi: v20.19.6)
- npm v10+ (sudah terpenuhi: 10.8.2)
- API Key Gemini (dari https://aistudio.google.com/app/apikey) **ATAU** Ollama terinstall lokal

---

### 2. Install Dependencies

**Backend:**
```bash
cd retrokarir/backend
npm install
```

**Frontend:**
```bash
cd retrokarir/frontend
npm install
```

---

### 3. Konfigurasi API Key Gemini

Edit file `backend/.env`:

```env
PORT=3001

# Ganti dengan API Key asli Anda
GEMINI_API_KEY=AIzaSy_YOUR_ACTUAL_KEY_HERE

# Untuk Ollama (opsional)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

> ⚠️ **Penting:** Jangan pernah commit file `.env` ke Git!

---

### 4. Menjalankan Development Server

Buka **dua terminal terpisah**:

**Terminal 1 — Backend:**
```bash
cd retrokarir/backend
npm run dev
# Server berjalan di http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd retrokarir/frontend
npm run dev
# Website berjalan di http://localhost:5173
```

Buka browser ke **http://localhost:5173** ✅

---

### 5. (Opsional) Menggunakan Ollama

Jika ingin menggunakan AI lokal tanpa biaya:

1. Install Ollama: https://ollama.com/download
2. Jalankan: `ollama pull llama3` (atau model lain)
3. Pastikan Ollama berjalan: `ollama serve`
4. Di website, klik tombol AI Mode di navbar untuk switch ke Ollama

---

## 🎮 Cara Penggunaan

1. Buka http://localhost:5173
2. Klik **"Mulai Analisis Gratis"**
3. Upload CV dalam format **PDF** (maks 10MB)
4. Isi semua data diri:
   - Nama lengkap
   - Tanggal lahir
   - Jenis kelamin
   - Tujuan menggunakan Retrokarir (min 100 karakter)
   - Preferensi tipe kerja (bisa pilih beberapa)
   - Lokasi impian (tekan Enter/koma untuk tambah)
5. Klik **"Analisa Sekarang"**
6. Tunggu beberapa saat, hasil akan muncul
7. Klik **"Download PDF"** untuk simpan laporan

---

## 🔧 Troubleshooting

| Error | Solusi |
|-------|--------|
| `GEMINI_API_KEY belum dikonfigurasi` | Edit file `backend/.env` dan isi API Key |
| `Cannot connect to server` | Pastikan backend sudah berjalan di port 3001 |
| `Teks PDF tidak dapat dibaca` | Pastikan PDF berisi teks (bukan scan/image) |
| `Ollama error` | Pastikan Ollama berjalan (`ollama serve`) |

---

## 📦 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Backend | Express.js |
| AI (Cloud) | gemini-2.0-flash |
| AI (Local) | Ollama (llama3/mistral/dll) |
| PDF Parsing | pdf-parse |
| Styling | CSS Modules + Custom Properties |

---

## 🎨 Fitur

- ✅ Dark/Light mode (auto-detect dari device)
- ✅ Toggle AI: Gemini ↔ Ollama
- ✅ Drag & drop PDF upload
- ✅ Validasi form lengkap
- ✅ Chip input untuk lokasi
- ✅ Analisis 4 pilar kompetensi
- ✅ Risk assessment otomasi
- ✅ Action plan 3 horizon waktu
- ✅ Download laporan sebagai PDF
- ✅ Responsive (mobile-friendly)
