<template>
  <div>
    <h1>📥 Input Data</h1>
    <p class="text-muted mb-3">
      Upload file data yang diperlukan untuk analisis. File diproses langsung di browser (tidak dikirim ke server).
    </p>

    <div class="alert alert-info">
      <strong>ℹ️ Catatan:</strong> Versi Vue ini menggunakan upload file lokal. Format file sama persis dengan versi Streamlit.
    </div>

    <!-- ── 1. Data Penjualan ─────────────────────────────────────────────── -->
    <div class="card">
      <h2>1. Data Penjualan</h2>
      <p class="text-muted mb-2" style="font-size:0.875rem;">
        Upload satu atau beberapa file penjualan (.xlsx atau .csv). Semua file akan digabungkan otomatis.
      </p>

      <label class="upload-zone" @dragover.prevent="dragover1=true" @dragleave="dragover1=false"
             @drop.prevent="handleDropPenjualan" :class="{ dragover: dragover1 }">
        <input type="file" multiple accept=".xlsx,.csv" @change="handlePenjualanFiles" ref="inputPenjualan" />
        <div>📂 Klik atau drag & drop file Penjualan (.xlsx / .csv)</div>
        <div style="font-size:0.8rem; margin-top:0.3rem;">Multi-file diperbolehkan</div>
      </label>

      <div v-if="loadingPenjualan" class="loading-overlay">
        <span class="spinner"></span> Memproses file penjualan...
      </div>

      <div v-if="store.dfPenjualan.length > 0 && !loadingPenjualan">
        <div class="alert alert-success">
          ✅ Data penjualan dimuat: <strong>{{ store.dfPenjualan.length.toLocaleString('id-ID') }} baris</strong>
          <span v-if="dupeCount > 0"> — {{ dupeCount }} duplikat dihapus</span>
        </div>
        <details>
          <summary>Lihat preview data penjualan (20 baris pertama)</summary>
          <div>
            <DataTable
              :rows="store.dfPenjualan.slice(0,20)"
              :columns="penjualanCols"
              :searchable="false"
              :exportable="true"
              export-name="data_penjualan_gabungan.xlsx"
              max-height="300px"
              :initial-page-size="20"
            />
          </div>
        </details>
      </div>
    </div>

    <!-- ── 2. Produk Referensi ──────────────────────────────────────────── -->
    <div class="card">
      <h2>2. Produk Referensi</h2>
      <p class="text-muted mb-2" style="font-size:0.875rem;">
        Upload file referensi produk (.xlsx). Dibaca dari sheet "Sheet1 (2)", mulai baris ke-7.
      </p>

      <label class="upload-zone" @dragover.prevent="dragover2=true" @dragleave="dragover2=false"
             @drop.prevent="handleDropProduk" :class="{ dragover: dragover2 }">
        <input type="file" accept=".xlsx" @change="handleProdukFile" ref="inputProduk" />
        <div>📂 Klik atau drag & drop file Produk Referensi (.xlsx)</div>
      </label>

      <div v-if="loadingProduk" class="loading-overlay">
        <span class="spinner"></span> Memproses file produk...
      </div>

      <div v-if="store.produkRef.length > 0 && !loadingProduk">
        <div class="alert alert-success">
          ✅ Produk referensi dimuat: <strong>{{ store.produkRef.length.toLocaleString('id-ID') }} produk</strong>
        </div>
        <details>
          <summary>Lihat preview produk referensi (10 baris)</summary>
          <div>
            <DataTable
              :rows="store.produkRef.slice(0,10)"
              :columns="produkCols"
              :searchable="false"
              :exportable="false"
              max-height="250px"
              :initial-page-size="10"
            />
          </div>
        </details>
      </div>
    </div>

    <!-- ── 3. Data Stock ────────────────────────────────────────────────── -->
    <div class="card">
      <h2>3. Data Stock</h2>
      <p class="text-muted mb-2" style="font-size:0.875rem;">
        Upload file stock (.xlsx). Dibaca dari sheet "Sheet1", mulai baris ke-10.
      </p>

      <label class="upload-zone" @dragover.prevent="dragover3=true" @dragleave="dragover3=false"
             @drop.prevent="handleDropStock" :class="{ dragover: dragover3 }">
        <input type="file" accept=".xlsx" @change="handleStockFile" ref="inputStock" />
        <div>📂 Klik atau drag & drop file Stock (.xlsx)</div>
        <div style="font-size:0.8rem; margin-top:0.3rem;">Nama file sebaiknya mengandung tanggal (ddmmyyyy)</div>
      </label>

      <div v-if="loadingStock" class="loading-overlay">
        <span class="spinner"></span> Memproses file stock...
      </div>

      <div v-if="store.dfStock.length > 0 && !loadingStock">
        <div class="alert alert-success">
          ✅ Data stock dimuat: <strong>{{ store.dfStock.length.toLocaleString('id-ID') }} SKU</strong>
          <span v-if="store.stockFilename"> — {{ store.stockFilename }}</span>
        </div>
        <details>
          <summary>Lihat preview data stock (5 baris)</summary>
          <div>
            <DataTable
              :rows="store.dfStock.slice(0,5)"
              :columns="stockCols"
              :searchable="false"
              :exportable="false"
              max-height="200px"
              :initial-page-size="5"
            />
          </div>
        </details>
      </div>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" class="alert alert-danger">
      ❌ {{ errorMsg }}
    </div>

    <!-- Status summary -->
    <div class="card" v-if="allLoaded">
      <div class="alert alert-success" style="margin:0;">
        🎉 Semua data berhasil dimuat! Silakan pilih menu analisis di sidebar.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { readPenjualanFile, readProdukFile, readStockFile } from '@/utils/fileReader'
import { deduplicatePenjualan, mapNamaDept, mapCity } from '@/utils/analysis'
import DataTable from '@/components/DataTable.vue'

const store = useDataStore()

const loadingPenjualan = ref(false)
const loadingProduk    = ref(false)
const loadingStock     = ref(false)
const errorMsg         = ref('')
const dupeCount        = ref(0)
const dragover1 = ref(false)
const dragover2 = ref(false)
const dragover3 = ref(false)

const allLoaded = computed(() =>
  store.dfPenjualan.length > 0 && store.produkRef.length > 0 && store.dfStock.length > 0)

// Dynamic columns based on loaded data
const penjualanCols = computed(() => {
  if (!store.dfPenjualan.length) return []
  return Object.keys(store.dfPenjualan[0]).slice(0,8).map(k => ({ key: k, label: k }))
})
const produkCols = computed(() =>
  ['No. Barang','BRAND Barang','Kategori Barang','Nama Barang'].map(k => ({ key: k, label: k })))
const stockCols = computed(() => {
  if (!store.dfStock.length) return []
  return Object.keys(store.dfStock[0]).slice(0,6).map(k => ({ key: k, label: k }))
})

// ── Penjualan ──────────────────────────────────────────────────────────────
async function handlePenjualanFiles(e) {
  await processPenjualan([...e.target.files])
}
async function handleDropPenjualan(e) {
  dragover1.value = false
  await processPenjualan([...e.dataTransfer.files])
}

async function processPenjualan(files) {
  if (!files.length) return
  loadingPenjualan.value = true
  errorMsg.value = ''
  try {
    const allRows = []
    for (const f of files) {
      const rows = await readPenjualanFile(f)
      allRows.push(...rows)
    }
    // Normalize
    for (const r of allRows) {
      if (r['No. Barang'] !== undefined) r['No. Barang'] = String(r['No. Barang']).trim()
      if (r.Qty !== undefined && r['Kuantitas'] === undefined) r['Kuantitas'] = r.Qty
      // Parse date
      if (r['Tgl Faktur']) r['Tgl Faktur'] = new Date(r['Tgl Faktur'])
    }
    const { clean, dupes } = deduplicatePenjualan(allRows)
    dupeCount.value = dupes.length

    // Map dept & city
    for (const r of clean) {
      r['Nama Dept'] = mapNamaDept(r)
      r['City']      = mapCity(r['Nama Dept'])
    }

    store.setPenjualan(clean)
  } catch (e) {
    errorMsg.value = `Gagal membaca file penjualan: ${e.message}`
  } finally {
    loadingPenjualan.value = false
  }
}

// ── Produk ─────────────────────────────────────────────────────────────────
async function handleProdukFile(e) {
  await processProduk(e.target.files[0])
}
async function handleDropProduk(e) {
  dragover2.value = false
  await processProduk(e.dataTransfer.files[0])
}
async function processProduk(file) {
  if (!file) return
  loadingProduk.value = true
  errorMsg.value = ''
  try {
    const rows = await readProdukFile(file)
    for (const r of rows) {
      if (r['Kategori Barang']) r['Kategori Barang'] = String(r['Kategori Barang']).trim().toUpperCase()
    }
    store.setProdukRef(rows)
  } catch (e) {
    errorMsg.value = `Gagal membaca file produk: ${e.message}`
  } finally {
    loadingProduk.value = false
  }
}

// ── Stock ──────────────────────────────────────────────────────────────────
async function handleStockFile(e) {
  await processStock(e.target.files[0])
}
async function handleDropStock(e) {
  dragover3.value = false
  await processStock(e.dataTransfer.files[0])
}
async function processStock(file) {
  if (!file) return
  loadingStock.value = true
  errorMsg.value = ''
  try {
    const rows = await readStockFile(file)
    store.setDfStock(rows, file.name)
  } catch (e) {
    errorMsg.value = `Gagal membaca file stock: ${e.message}`
  } finally {
    loadingStock.value = false
  }
}
</script>
