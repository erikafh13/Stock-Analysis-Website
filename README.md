# Stock Analysis & ABC — Vue 3

Konversi penuh dari aplikasi Streamlit "Analisis Stock dan ABC" ke Vue 3 + Vite,
dengan backend Google Drive sebagai Vercel Serverless Functions.

## Struktur

```
stock-analysis-vue/
├── api/drive/           # Serverless functions (list & download dari Google Drive)
├── src/
│   ├── components/      # CityExpanderTable, PivotTable, SimpleBarChart
│   ├── views/            # 6 halaman: InputData, StockAnalysis(V1/V2), StockDonor,
│   │                      NewProductAnalysis, AbcAnalysisV3
│   ├── stores/            # Pinia store (pengganti st.session_state)
│   ├── utils/             # analysis.js (semua logika kalkulasi), gdrive.js, fileReader.js
│   ├── router/
│   ├── App.vue            # Sidebar + layout utama
│   └── main.js
├── vercel.json
├── vite.config.js
└── package.json
```

## Setup Lokal

```bash
npm install
npm install -g vercel   # sekali saja
vercel login
vercel dev               # menjalankan frontend + serverless functions sekaligus
```

Buat `.env.local` (tidak ikut di-push) berisi:
```
GOOGLE_CREDENTIALS={"type":"service_account", ...isi lengkap JSON service account...}
```

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import project di [vercel.com](https://vercel.com).
3. Di Environment Variables, tambahkan `GOOGLE_CREDENTIALS` (paste seluruh isi JSON, boleh multiline).
4. Deploy.
5. Share folder Google Drive (Penjualan/Produk/Stock) ke email `client_email` yang ada di JSON credential, dengan akses Viewer.

## Halaman

1. **Input Data** — pilih sumber Google Drive atau upload file lokal.
2. **Hasil Analisa Stock** — WMA 90 hari, klasifikasi ABC Log-Benchmark, Min/Max/Add Stock, Suggested PO proporsional.
3. **Hasil Analisa Stock V2** — 3 skenario distribusi PO (KURANG/TERBATAS/OVER) berbasis urgency.
4. **Analisis Donor Stock** — distribusi lateral antar cabang dengan aturan kirim & prioritas jarak yang bisa diatur.
5. **Analisis Produk Baru** — identifikasi SKU baru dan proyeksi kebutuhan stok awal dari produk serupa.
6. **Analisis ABC V3 (Platform)** — ABC Log-Benchmark dipecah per platform Online/Offline.
