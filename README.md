# Stock Analysis — Vue 3

Aplikasi analisis stock dan ABC dikonversi dari Streamlit ke **Vue 3 + Vite**.  
Semua kalkulasi berjalan di browser (client-side), tidak ada server diperlukan.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev

# 3. Build untuk production
npm run build
```

Buka `http://localhost:5173` setelah `npm run dev`.

---

## 📁 Struktur Proyek

```
stock-analysis-vue/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js               # Entry point
    ├── App.vue               # Layout + sidebar navigasi
    ├── router/
    │   └── index.js          # Vue Router (hash mode)
    ├── stores/
    │   └── dataStore.js      # Pinia store (pengganti session_state Streamlit)
    ├── utils/
    │   ├── analysis.js       # Semua logika kalkulasi (port dari analysis.py)
    │   └── fileReader.js     # Baca file Excel/CSV di browser (port dari gdrive.py)
    ├── components/
    │   └── DataTable.vue     # Tabel reusable dengan sort, filter, export
    ├── views/
    │   ├── InputData.vue         # Halaman upload file
    │   ├── StockAnalysis.vue     # Hasil Analisa Stock V1
    │   ├── StockAnalysisV2.vue   # Hasil Analisa Stock V2
    │   ├── StockDonor.vue        # Analisis Donor Stock
    │   ├── NewProductAnalysis.vue# Analisis Produk Baru
    │   └── AbcAnalysisV3.vue     # Analisis ABC V3 (Platform)
    └── assets/
        └── main.css          # Global styles
```

---

## 📥 Format File

### Data Penjualan (`.xlsx` atau `.csv`)
Kolom yang diperlukan:
- `No. Faktur`, `Tgl Faktur`, `No. Barang`, `Nama Pelanggan`, `Dept.`, `Qty`

### Produk Referensi (`.xlsx`)
- Sheet: **"Sheet1 (2)"**, mulai baris ke-7
- Kolom: `No. Barang`, `BRAND Barang`, `Kategori Barang`, `Nama Barang`

### Data Stock (`.xlsx`)
- Sheet: **"Sheet1"**, mulai baris ke-10
- Kolom gudang: `A - ITC`, `AT - TRANSIT ITC`, `B`, `BT - TRANSIT JKT`, dll.
- Nama file sebaiknya mengandung tanggal format `ddmmyyyy` (contoh: `stock_01052025.xlsx`)

### File Items — Produk Baru (`.xlsx`)
- Kolom: `No. Barang`, `Nama Barang`, `BRAND Barang`, `Kategori Barang`

---

## 🗺️ Alur Penggunaan

1. **Input Data** → Upload ketiga file (Penjualan + Produk Ref + Stock)
2. **Hasil Analisa Stock** → Set tanggal → Jalankan analisis V1
3. **Hasil Analisa Stock V2** → Set tanggal → Jalankan analisis V2 *(wajib sebelum halaman 4 & 5)*
4. **Analisis Donor Stock** → Klik hitung (butuh hasil V2)
5. **Analisis Produk Baru** → Upload file items → Hitung (butuh hasil V2)
6. **Analisis ABC V3** → Set tanggal → Jalankan (butuh Penjualan + Produk Ref)

---

## 🌐 Deploy ke GitHub Pages

```bash
# 1. Build
npm run build

# 2. Install gh-pages (sekali saja)
npm install -D gh-pages

# 3. Deploy folder dist/
npx gh-pages -d dist
```

Atau gunakan GitHub Actions — lihat `.github/workflows/deploy.yml` jika tersedia.

---

## 🔄 Perbedaan dengan Versi Streamlit

| Fitur | Streamlit | Vue 3 |
|---|---|---|
| Runtime | Python server | Browser (JS) |
| Data storage | `st.session_state` | Pinia store |
| File input | Google Drive | Upload lokal |
| Export | `st.download_button` | SheetJS (XLSX) |
| Styling | Streamlit theme | CSS custom |
| Deploy | Streamlit Cloud | Static hosting / GitHub Pages |

> **Catatan:** Koneksi Google Drive dihapus karena Vue berjalan sebagai static app.  
> Jika diperlukan integrasi GDrive, tambahkan backend API (FastAPI / Express) sebagai proxy.

---

## 🛠️ Tech Stack

- [Vue 3](https://vuejs.org/) + Composition API
- [Vite 5](https://vitejs.dev/) — build tool
- [Pinia](https://pinia.vuejs.org/) — state management
- [Vue Router 4](https://router.vuejs.org/) — routing
- [SheetJS (xlsx)](https://sheetjs.com/) — baca/tulis Excel di browser
- [Chart.js](https://www.chartjs.org/) + [vue-chartjs](https://vue-chartjs.org/) — grafik

---

## 📝 Lisensi

Internal use — PT [Nama Perusahaan]
