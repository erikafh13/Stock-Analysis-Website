<template>
  <div>
    <h1>📥 Input Data</h1>
    <p class="text-muted mb-3">
      Muat data yang diperlukan untuk analisis dari Google Drive atau upload file lokal.
    </p>

    <!-- ── Toggle Sumber Data ───────────────────────────────────────────────── -->
    <div class="card">
      <div class="flex gap-3 flex-wrap" style="align-items:center;">
        <span class="form-label" style="margin:0; font-weight:600;">Sumber Data:</span>
        <label style="cursor:pointer; display:flex; align-items:center; gap:0.4rem;">
          <input type="radio" v-model="sourceMode" value="drive" />
          ☁️ Google Drive
        </label>
        <label style="cursor:pointer; display:flex; align-items:center; gap:0.4rem;">
          <input type="radio" v-model="sourceMode" value="local" />
          💻 Upload File Lokal
        </label>
      </div>

      <!-- Status koneksi Drive -->
      <div v-if="sourceMode === 'drive'" class="mt-2">
        <div v-if="loadingList" class="loading-overlay" style="padding:0.5rem 0;">
          <span class="spinner"></span> Menghubungi Google Drive...
        </div>
        <div v-else-if="driveConnected" class="alert alert-success" style="margin:0.5rem 0 0;">
          ☁️ Terhubung ke Google Drive
        </div>
        <div v-else-if="driveError" class="alert alert-danger" style="margin:0.5rem 0 0;">
          ❌ {{ driveError }}
          <br />
          <small>Pastikan backend berjalan dan <code>GOOGLE_CREDENTIALS</code> sudah di-set.</small>
        </div>
      </div>
    </div>

    <!-- ── 1. Data Penjualan ─────────────────────────────────────────────── -->
    <div class="card">
      <h2>1. Data Penjualan</h2>
      <p class="text-muted mb-2" style="font-size:0.875rem;">
        Semua file penjualan di folder Drive akan digabungkan otomatis. Atau upload multi-file lokal.
      </p>

      <!-- Mode Drive -->
      <template v-if="sourceMode === 'drive'">
        <div v-if="loadingList" class="loading-overlay">
          <span class="spinner"></span> Mencari file...
        </div>
        <template v-else-if="driveConnected">
          <div v-if="driveFiles.penjualan.length === 0" class="alert alert-warning">
            ⚠️ Tidak ada file ditemukan di folder Penjualan Drive.
          </div>
          <div v-else>
            <details class="mb-2">
              <summary>{{ driveFiles.penjualan.length }} file ditemukan di Drive</summary>
              <div>
                <ul style="font-size:0.8rem; margin:0.5rem 0; padding-left:1.2rem;">
                  <li v-for="f in driveFiles.penjualan" :key="f.id">{{ f.name }}</li>
                </ul>
              </div>
            </details>
            <button
              class="btn btn-primary"
              @click="loadPenjualanFromDrive"
              :disabled="loadingPenjualan"
            >
              <span v-if="loadingPenjualan">
                <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                Memuat dari Drive...
              </span>
              <span v-else>☁️ Muat / Muat Ulang Data Penjualan</span>
            </button>
          </div>
        </template>
      </template>

      <!-- Mode Lokal -->
      <template v-else>
        <label
          class="upload-zone"
          @dragover.prevent="dragover1 = true"
          @dragleave="dragover1 = false"
          @drop.prevent="handleDropPenjualan"
          :class="{ dragover: dragover1 }"
        >
          <input type="file" multiple accept=".xlsx,.csv" @change="handlePenjualanFiles" />
          <div>📂 Klik atau drag & drop file Penjualan (.xlsx / .csv)</div>
          <div style="font-size:0.8rem; margin-top:0.3rem;">Multi-file diperbolehkan</div>
        </label>
      </template>

      <div v-if="loadingPenjualan && sourceMode === 'local'" class="loading-overlay">
        <span class="spinner"></span> Memproses file penjualan...
      </div>

      <div v-if="store.dfPenjualan.length > 0 && !loadingPenjualan" class="mt-2">
        <div class="alert alert-success">
          ✅ Data penjualan dimuat: <strong>{{ store.dfPenjualan.length.toLocaleString('id-ID') }} baris</strong>
          <span v-if="dupeCount > 0"> — {{ dupeCount }} duplikat dihapus</span>
        </div>
        <details>
          <summary>Lihat preview data penjualan (20 baris pertama)</summary>
          <div>
            <DataTable
              :rows="store.dfPenjualan.slice(0, 20)"
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
        File produk referensi (.xlsx) — sheet "Sheet1 (2)", mulai baris ke-7.
      </p>

      <!-- Mode Drive -->
      <template v-if="sourceMode === 'drive'">
        <div v-if="loadingList" class="loading-overlay">
          <span class="spinner"></span> Mencari file...
        </div>
        <template v-else-if="driveConnected">
          <div v-if="driveFiles.produk.length === 0" class="alert alert-warning">
            ⚠️ Tidak ada file ditemukan di folder Produk Drive.
          </div>
          <div v-else>
            <div class="form-group mt-2">
              <label class="form-label">Pilih file Produk dari Drive:</label>
              <select v-model="selectedProdukFile" class="form-control">
                <option :value="null">— Pilih file —</option>
                <option v-for="f in driveFiles.produk" :key="f.id" :value="f">
                  {{ f.name }}
                </option>
              </select>
            </div>
            <button
              class="btn btn-primary"
              @click="loadProdukFromDrive"
              :disabled="!selectedProdukFile || loadingProduk"
            >
              <span v-if="loadingProduk">
                <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                Memuat...
              </span>
              <span v-else>☁️ Muat Produk Referensi</span>
            </button>
          </div>
        </template>
      </template>

      <!-- Mode Lokal -->
      <template v-else>
        <label
          class="upload-zone"
          @dragover.prevent="dragover2 = true"
          @dragleave="dragover2 = false"
          @drop.prevent="handleDropProduk"
          :class="{ dragover: dragover2 }"
        >
          <input type="file" accept=".xlsx" @change="handleProdukFile" />
          <div>📂 Klik atau drag & drop file Produk Referensi (.xlsx)</div>
        </label>
      </template>

      <div v-if="loadingProduk && sourceMode === 'local'" class="loading-overlay">
        <span class="spinner"></span> Memproses file produk...
      </div>

      <div v-if="store.produkRef.length > 0 && !loadingProduk" class="mt-2">
        <div class="alert alert-success">
          ✅ Produk referensi dimuat: <strong>{{ store.produkRef.length.toLocaleString('id-ID') }} produk</strong>
        </div>
        <details>
          <summary>Lihat preview produk referensi (10 baris)</summary>
          <div>
            <DataTable
              :rows="store.produkRef.slice(0, 10)"
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
        File stock (.xlsx) — sheet "Sheet1", mulai baris ke-10. Nama file sebaiknya mengandung tanggal (ddmmyyyy).
      </p>

      <!-- Mode Drive -->
      <template v-if="sourceMode === 'drive'">
        <div v-if="loadingList" class="loading-overlay">
          <span class="spinner"></span> Mencari file...
        </div>
        <template v-else-if="driveConnected">
          <div v-if="driveFiles.stock.length === 0" class="alert alert-warning">
            ⚠️ Tidak ada file ditemukan di folder Stock Drive.
          </div>
          <div v-else>
            <div class="form-group mt-2">
              <label class="form-label">Pilih file Stock dari Drive:</label>
              <select v-model="selectedStockFile" class="form-control">
                <option :value="null">— Pilih file —</option>
                <option v-for="f in driveFiles.stock" :key="f.id" :value="f">
                  {{ f.name }}
                </option>
              </select>
            </div>
            <button
              class="btn btn-primary"
              @click="loadStockFromDrive"
              :disabled="!selectedStockFile || loadingStock"
            >
              <span v-if="loadingStock">
                <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
                Memuat...
              </span>
              <span v-else>☁️ Muat Data Stock</span>
            </button>
          </div>
        </template>
      </template>

      <!-- Mode Lokal -->
      <template v-else>
        <label
          class="upload-zone"
          @dragover.prevent="dragover3 = true"
          @dragleave="dragover3 = false"
          @drop.prevent="handleDropStock"
          :class="{ dragover: dragover3 }"
        >
          <input type="file" accept=".xlsx" @change="handleStockFile" />
          <div>📂 Klik atau drag & drop file Stock (.xlsx)</div>
        </label>
      </template>

      <div v-if="loadingStock && sourceMode === 'local'" class="loading-overlay">
        <span class="spinner"></span> Memproses file stock...
      </div>

      <div v-if="store.dfStock.length > 0 && !loadingStock" class="mt-2">
        <div class="alert alert-success">
          ✅ Data stock dimuat: <strong>{{ store.dfStock.length.toLocaleString('id-ID') }} SKU</strong>
          <span v-if="store.stockFilename"> — {{ store.stockFilename }}</span>
        </div>
        <details>
          <summary>Lihat preview data stock (5 baris)</summary>
          <div>
            <DataTable
              :rows="store.dfStock.slice(0, 5)"
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

    <!-- Error global -->
    <div v-if="errorMsg" class="alert alert-danger">❌ {{ errorMsg }}</div>

    <!-- Semua loaded -->
    <div class="card" v-if="allLoaded">
      <div class="alert alert-success" style="margin:0;">
        🎉 Semua data berhasil dimuat! Silakan pilih menu analisis di sidebar.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { readPenjualanFile, readProdukFile, readStockFile } from '@/utils/fileReader'
import { deduplicatePenjualan, mapNamaDept, mapCity } from '@/utils/analysis'
import {
  listFilesInFolder, downloadFile,
  FOLDER_PENJUALAN, FOLDER_PRODUK, FOLDER_STOCK,
} from '@/utils/gdrive'
import DataTable from '@/components/DataTable.vue'

const store = useDataStore()

// ── State ──────────────────────────────────────────────────────────────────────
const sourceMode   = ref('drive')   // 'drive' | 'local'
const loadingList  = ref(false)
const driveConnected = ref(false)
const driveError   = ref('')
const driveFiles   = ref({ penjualan: [], produk: [], stock: [] })

const selectedProdukFile = ref(null)
const selectedStockFile  = ref(null)

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

// ── Dynamic table columns ─────────────────────────────────────────────────────
const penjualanCols = computed(() => {
  if (!store.dfPenjualan.length) return []
  return Object.keys(store.dfPenjualan[0]).slice(0, 8).map(k => ({ key: k, label: k }))
})
const produkCols = computed(() =>
  ['No. Barang', 'BRAND Barang', 'Kategori Barang', 'Nama Barang'].map(k => ({ key: k, label: k })))
const stockCols = computed(() => {
  if (!store.dfStock.length) return []
  return Object.keys(store.dfStock[0]).slice(0, 6).map(k => ({ key: k, label: k }))
})

// ── Watch: saat mode Drive dipilih, langsung list semua folder ────────────────
watch(sourceMode, async (val) => {
  if (val !== 'drive') return
  if (driveConnected.value) return   // sudah pernah connect, skip re-fetch
  await connectDrive()
}, { immediate: true })

async function connectDrive() {
  loadingList.value = true
  driveError.value  = ''
  driveConnected.value = false
  try {
    const [p, pr, s] = await Promise.all([
      listFilesInFolder(FOLDER_PENJUALAN),
      listFilesInFolder(FOLDER_PRODUK),
      listFilesInFolder(FOLDER_STOCK),
    ])
    driveFiles.value = { penjualan: p, produk: pr, stock: s }
    driveConnected.value = true
  } catch (e) {
    driveError.value = `Gagal terhubung ke Google Drive: ${e.message}`
  } finally {
    loadingList.value = false
  }
}

// ── Helper: ArrayBuffer → File-like object ────────────────────────────────────
function bufToFile(buf, name) {
  return new File([new Blob([buf])], name)
}

// ── Shared processor functions (dipakai oleh Drive & Lokal) ───────────────────
async function processPenjualanRows(allRows) {
  for (const r of allRows) {
    if (r['No. Barang'] !== undefined) r['No. Barang'] = String(r['No. Barang']).trim()
    if (r.Qty !== undefined && r['Kuantitas'] === undefined) r['Kuantitas'] = r.Qty
    if (r['Tgl Faktur']) r['Tgl Faktur'] = new Date(r['Tgl Faktur'])
  }
  const { clean, dupes } = deduplicatePenjualan(allRows)
  dupeCount.value = dupes.length
  for (const r of clean) {
    r['Nama Dept'] = mapNamaDept(r)
    r['City']      = mapCity(r['Nama Dept'])
  }
  store.setPenjualan(clean)
}

async function processProdukRows(rows) {
  for (const r of rows) {
    if (r['Kategori Barang'])
      r['Kategori Barang'] = String(r['Kategori Barang']).trim().toUpperCase()
  }
  store.setProdukRef(rows)
}

// ── Drive loaders ─────────────────────────────────────────────────────────────
async function loadPenjualanFromDrive() {
  loadingPenjualan.value = true
  errorMsg.value = ''
  try {
    const allRows = []
    for (const f of driveFiles.value.penjualan) {
      const buf  = await downloadFile(f.id)
      const file = bufToFile(buf, f.name)
      const rows = await readPenjualanFile(file)
      allRows.push(...rows)
    }
    await processPenjualanRows(allRows)
  } catch (e) {
    errorMsg.value = `Gagal muat penjualan dari Drive: ${e.message}`
  } finally {
    loadingPenjualan.value = false
  }
}

async function loadProdukFromDrive() {
  if (!selectedProdukFile.value) return
  loadingProduk.value = true
  errorMsg.value = ''
  try {
    const buf  = await downloadFile(selectedProdukFile.value.id)
    const file = bufToFile(buf, selectedProdukFile.value.name)
    const rows = await readProdukFile(file)
    await processProdukRows(rows)
  } catch (e) {
    errorMsg.value = `Gagal muat produk dari Drive: ${e.message}`
  } finally {
    loadingProduk.value = false
  }
}

async function loadStockFromDrive() {
  if (!selectedStockFile.value) return
  loadingStock.value = true
  errorMsg.value = ''
  try {
    const buf  = await downloadFile(selectedStockFile.value.id)
    const file = bufToFile(buf, selectedStockFile.value.name)
    const rows = await readStockFile(file)
    store.setDfStock(rows, selectedStockFile.value.name)
  } catch (e) {
    errorMsg.value = `Gagal muat stock dari Drive: ${e.message}`
  } finally {
    loadingStock.value = false
  }
}

// ── Local upload handlers ─────────────────────────────────────────────────────
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
    await processPenjualanRows(allRows)
  } catch (e) {
    errorMsg.value = `Gagal membaca file penjualan: ${e.message}`
  } finally {
    loadingPenjualan.value = false
  }
}

async function handleProdukFile(e) { await processProduk(e.target.files[0]) }
async function handleDropProduk(e) { dragover2.value = false; await processProduk(e.dataTransfer.files[0]) }
async function processProduk(file) {
  if (!file) return
  loadingProduk.value = true
  errorMsg.value = ''
  try {
    const rows = await readProdukFile(file)
    await processProdukRows(rows)
  } catch (e) {
    errorMsg.value = `Gagal membaca file produk: ${e.message}`
  } finally {
    loadingProduk.value = false
  }
}

async function handleStockFile(e) { await processStock(e.target.files[0]) }
async function handleDropStock(e) { dragover3.value = false; await processStock(e.dataTransfer.files[0]) }
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
