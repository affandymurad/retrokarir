# 🎯 Retrokarir — AI Skill Gap Advisor

Website analisis kesenjangan keterampilan (Skill Gap Analysis) berbasis AI untuk pasar tenaga kerja Indonesia.

🌐 **Live:** [retrokarir.netlify.app](https://retrokarir.netlify.app)

---

## 🏗️ Struktur Proyek

```
retrokarir/
├── netlify/
│   └── functions/
│       ├── analyze.js    # Serverless function — AI analysis
│       └── health.js     # Health check endpoint
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── styles/
│   └── package.json
├── netlify.toml          # Konfigurasi build & functions
├── package.json          # Dependencies untuk functions
└── .env                  # API Key lokal (JANGAN di-commit!)
```

---

## 🚀 Langkah Setup Lokal

### 1. Prasyarat
- Node.js v20+
- npm v10+
- API Key Gemini dari https://aistudio.google.com/app/apikey
- Netlify CLI: `npm install -g netlify-cli`

---

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/affandymurad/retrokarir.git
cd retrokarir

# Install dependencies functions (root)
npm install

# Install dependencies frontend
cd frontend && npm install && cd ..
```

---

### 3. Konfigurasi API Key

Buat file `.env` di root folder:

```env
GEMINI_API_KEY=AIzaSy_YOUR_ACTUAL_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash-preview-04-17

# Opsional — Ollama lokal
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

> ⚠️ Jangan pernah commit file `.env` ke Git!

---

### 4. Menjalankan Development Server

**Terminal 1 — Vite:**
```bash
cd frontend
npm run dev
# Frontend berjalan di http://localhost:5173
```

**Terminal 2 — Netlify Dev (Functions + Proxy):**
```bash
cd retrokarir   # root
netlify dev --target-port 5173
# Buka http://localhost:8888
```

> Gunakan http://localhost:8888 (bukan 5173) agar `/api/*` terhubung ke Netlify Functions.

---

### 5. (Opsional) Menggunakan Ollama

1. Install Ollama: https://ollama.com/download
2. `ollama pull llama3`
3. `ollama serve`
4. Di website, klik tombol AI Mode di navbar untuk switch ke Ollama

---

## ☁️ Deploy ke Netlify

### Otomatis via GitHub

1. Push ke GitHub:
```bash
git add .
git commit -m "feat: deploy Retrokarir"
git push
```

2. Buka app.netlify.com → Add new site → Import from Git → GitHub
3. Pilih repo `retrokarir` — build settings otomatis terbaca dari `netlify.toml`
4. Tambah Environment Variables di Netlify Dashboard:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | API Key Anda |
| `GEMINI_MODEL` | `gemini-2.5-flash-preview-04-17` |

5. Klik Deploy site ✅

---

## 🎮 Cara Penggunaan

1. Buka website
2. Klik "Mulai Analisis Gratis"
3. Upload CV dalam format PDF (maks 10MB)
4. Isi semua data diri
5. Klik "Analisa Sekarang"
6. Klik "Download PDF" untuk simpan laporan

---

## 🔧 Troubleshooting

| Error | Solusi |
|-------|--------|
| `GEMINI_API_KEY belum dikonfigurasi` | Set env var di Netlify Dashboard atau file `.env` |
| `404 Not Found` di `/api/analyze` | Pastikan Netlify Dev berjalan di port 8888 |
| `Teks PDF tidak dapat dibaca` | Pastikan PDF berisi teks (bukan scan/image) |
| `Function timeout` | Gemini butuh waktu — timeout diset 26 detik |
| `Ollama error` | Pastikan Ollama berjalan (`ollama serve`) |

---

## 📦 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Serverless Functions | Netlify Functions (esbuild) |
| AI (Cloud) | Google Gemini 2.5 Flash |
| AI (Local) | Ollama (llama3/mistral/dll) |
| PDF Parsing | pdf-parse |
| Styling | CSS Modules + Custom Properties |
| Deploy | Netlify |

---

## 🎨 Fitur

- ✅ Dark/Light mode (auto-detect dari device)
- ✅ Toggle AI: Gemini ↔ Ollama
- ✅ Drag & drop PDF upload
- ✅ Analisis 4 pilar kompetensi (Kognitif, Interpersonal, Self-leadership, Digital)
- ✅ Saran pengembangan skill (pelatihan, kompetisi, sertifikasi)
- ✅ Standar KBJI 4-digit
- ✅ Risk assessment otomasi
- ✅ Action plan 3 horizon waktu
- ✅ Download laporan sebagai PDF
- ✅ Zero data retention — CV tidak disimpan
- ✅ Responsive (mobile-friendly)

---

## 🔒 Privasi & Keamanan

CV dan data pribadi pengguna **tidak disimpan** di server manapun. Semua data hanya diproses sementara dalam memori selama analisis berlangsung, kemudian langsung dibuang. Tidak ada data yang digunakan untuk keperluan selain analisis skill gap yang diminta pengguna.

---

*Dibuat oleh [Affandy Murad](https://affandymurad.github.io) @ 2026*