<template>
  <div>
    <h1>📥 Input Data</h1>
    <p class="text-muted mb-3">Muat atau muat ulang data yang diperlukan dari Google Drive.</p>

    <!-- ── Toggle Sumber Data ───────────────────────────────────────────────── -->
    <div class="card">
      <div class="flex gap-3 flex-wrap" style="align-items:center;">
        <span class="form-label" style="margin:0; font-weight:600;">Sumber Data:</span>
        <label style="cursor:pointer; display:flex; align-items:center; gap:0.4rem;">
          <input type="radio" v-model="sourceMode" value="drive" /> ☁️ Google Drive
        </label>
        <label style="cursor:pointer; display:flex; align-items:center; gap:0.4rem;">
          <input type="radio" v-model="sourceMode" value="local" /> 💻 Upload File Lokal
        </label>
      </div>

      <div v-if="sourceMode === 'drive'" class="mt-2">
        <div v-if="loadingList" class="loading-overlay" style="padding:0.5rem 0;">
          <span class="spinner"></span> Menghubungi Google Drive...
        </div>
        <div v-else-if="driveConnected" class="alert alert-success" style="margin:0.5rem 0 0;">☁️ Terhubung ke Google Drive</div>
        <div v-else-if="driveError" class="alert alert-danger" style="margin:0.5rem 0 0;">
          ❌ {{ driveError }}<br/><small>Pastikan backend berjalan dan <code>GOOGLE_CREDENTIALS</code> sudah di-set.</small>
        </div>
      </div>
    </div>

    <!-- ── 1. Data Penjualan ─────────────────────────────────────────────── -->
    <h2>1. Data Penjualan</h2>
    <div class="card">
      <template v-if="sourceMode === 'drive'">
        <div v-if="loadingList" class="loading-overlay"><span class="spinner"></span> Mencari file penjualan di Google Drive...</div>
        <template v-else-if="driveConnected">
          <div v-if="driveFiles.penjualan.length === 0" class="alert alert-warning">⚠️ Tidak ada file penjualan ditemukan di folder Google Drive.</div>
          <button v-else class="btn btn-primary" @click="loadPenjualanFromDrive" :disabled="loadingPenjualan">
            <span v-if="loadingPenjualan"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Menggabungkan semua file penjualan...</span>
            <span v-else>Muat / Muat Ulang Data Penjualan</span>
          </button>
        </template>
      </template>
      <template v-else>
        <label class="upload-zone" @dragover.prevent="dragover1=true" @dragleave="dragover1=false"
               @drop.prevent="handleDropPenjualan" :class="{dragover:dragover1}">
          <input type="file" multiple accept=".xlsx,.csv" @change="handlePenjualanFiles" />
          <div>📂 Klik atau drag &amp; drop file Penjualan (.xlsx / .csv)</div>
        </label>
      </template>

      <div v-if="store.dfPenjualan.length > 0" class="mt-2">
        <div class="alert alert-success">✅ Data penjualan telah dimuat.</div>
        <PivotTable :rows="store.dfPenjualan" :columns="penjualanCols" export-name="data_penjualan_gabungan.xlsx" max-height="350px" />
      </div>
    </div>

    <!-- ── 2. Produk Referensi ──────────────────────────────────────────── -->
    <h2>2. Produk Referensi</h2>
    <div class="card">
      <template v-if="sourceMode === 'drive'">
        <div v-if="loadingList" class="loading-overlay"><span class="spinner"></span> Mencari file produk di Google Drive...</div>
        <template v-else-if="driveConnected">
          <div class="form-group">
            <label class="form-label">Pilih file Produk dari Google Drive (pilih 1 file):</label>
            <select v-model="selectedProdukFile" class="form-control" @change="loadProdukFromDrive">
              <option :value="null">Pilih file</option>
              <option v-for="f in driveFiles.produk" :key="f.id" :value="f">{{ f.name }}</option>
            </select>
          </div>
          <div v-if="loadingProduk" class="loading-overlay"><span class="spinner"></span> Memuat file...</div>
        </template>
      </template>
      <template v-else>
        <label class="upload-zone" @dragover.prevent="dragover2=true" @dragleave="dragover2=false"
               @drop.prevent="handleDropProduk" :class="{dragover:dragover2}">
          <input type="file" accept=".xlsx" @change="handleProdukFile" />
          <div>📂 Klik atau drag &amp; drop file Produk Referensi (.xlsx)</div>
        </label>
      </template>

      <div v-if="store.produkRef.length > 0" class="mt-2">
        <PivotTable :rows="store.produkRef.slice(0,5)" :columns="produkCols" :exportable="false" max-height="200px" />
      </div>
    </div>

    <!-- ── 3. Data Stock ────────────────────────────────────────────────── -->
    <h2>3. Data Stock</h2>
    <div class="card">
      <template v-if="sourceMode === 'drive'">
        <div v-if="loadingList" class="loading-overlay"><span class="spinner"></span> Mencari file stock di Google Drive...</div>
        <template v-else-if="driveConnected">
          <div class="form-group">
            <label class="form-label">Pilih file Stock dari Google Drive (pilih 1 file):</label>
            <select v-model="selectedStockFile" class="form-control" @change="loadStockFromDrive">
              <option :value="null">Pilih file</option>
              <option v-for="f in driveFiles.stock" :key="f.id" :value="f">{{ f.name }}</option>
            </select>
          </div>
          <div v-if="loadingStock" class="loading-overlay"><span class="spinner"></span> Memuat file...</div>
        </template>
      </template>
      <template v-else>
        <label class="upload-zone" @dragover.prevent="dragover3=true" @dragleave="dragover3=false"
               @drop.prevent="handleDropStock" :class="{dragover:dragover3}">
          <input type="file" accept=".xlsx" @change="handleStockFile" />
          <div>📂 Klik atau drag &amp; drop file Stock (.xlsx)</div>
        </label>
      </template>

      <div v-if="store.dfStock.length > 0" class="mt-2">
        <PivotTable :rows="store.dfStock.slice(0,5)" :columns="stockCols" :exportable="false" max-height="200px" />
      </div>
    </div>

    <div v-if="errorMsg" class="alert alert-danger">❌ {{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { readPenjualanFile, readProdukFile, readStockFile } from '@/utils/fileReader'
import { mapNamaDept, mapCity } from '@/utils/analysis'
import {
  listFilesInFolder, downloadFile,
  FOLDER_PENJUALAN, FOLDER_PRODUK, FOLDER_STOCK,
} from '@/utils/gdrive'
import PivotTable from '@/components/PivotTable.vue'

const store = useDataStore()

const sourceMode     = ref('drive')
const loadingList    = ref(false)
const driveConnected = ref(false)
const driveError     = ref('')
const driveFiles     = ref({ penjualan: [], produk: [], stock: [] })

const selectedProdukFile = ref(null)
const selectedStockFile  = ref(null)

const loadingPenjualan = ref(false)
const loadingProduk    = ref(false)
const loadingStock     = ref(false)
const errorMsg         = ref('')

const dragover1 = ref(false), dragover2 = ref(false), dragover3 = ref(false)

const penjualanCols = computed(() => {
  if (!store.dfPenjualan.length) return []
  return Object.keys(store.dfPenjualan[0]).slice(0, 8).map(k => ({ key: k, label: k }))
})
const produkCols = computed(() =>
  ['No. Barang','BRAND Barang','Kategori Barang','Nama Barang'].map(k => ({ key: k, label: k })))
const stockCols = computed(() => {
  if (!store.dfStock.length) return []
  return Object.keys(store.dfStock[0]).slice(0, 6).map(k => ({ key: k, label: k }))
})

watch(sourceMode, async (val) => {
  if (val !== 'drive' || driveConnected.value) return
  await connectDrive()
}, { immediate: true })

async function connectDrive() {
  loadingList.value = true
  driveError.value  = ''
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

function bufToFile(buf, name) { return new File([new Blob([buf])], name) }

async function processPenjualanRows(allRows) {
  for (const r of allRows) {
    if (r['No. Barang'] !== undefined) r['No. Barang'] = String(r['No. Barang']).trim()
    if (r.Qty !== undefined && r['Kuantitas'] === undefined) r['Kuantitas'] = r.Qty
    if (r['Tgl Faktur']) r['Tgl Faktur'] = new Date(r['Tgl Faktur'])
  }
  for (const r of allRows) {
    r['Nama Dept'] = mapNamaDept(r)
    r.City = mapCity(r['Nama Dept']).toUpperCase()
  }
  store.setPenjualan(allRows)
}

async function processProdukRows(rows) {
  for (const r of rows) {
    if (r['Kategori Barang']) r['Kategori Barang'] = String(r['Kategori Barang']).trim().toUpperCase()
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

// ── Local upload ──────────────────────────────────────────────────────────────
async function handlePenjualanFiles(e) { await processPenjualan([...e.target.files]) }
async function handleDropPenjualan(e) { dragover1.value = false; await processPenjualan([...e.dataTransfer.files]) }
async function processPenjualan(files) {
  if (!files.length) return
  loadingPenjualan.value = true
  errorMsg.value = ''
  try {
    const allRows = []
    for (const f of files) { allRows.push(...await readPenjualanFile(f)) }
    await processPenjualanRows(allRows)
  } catch (e) { errorMsg.value = `Gagal membaca file penjualan: ${e.message}` }
  finally { loadingPenjualan.value = false }
}

async function handleProdukFile(e) { await processProduk(e.target.files[0]) }
async function handleDropProduk(e) { dragover2.value = false; await processProduk(e.dataTransfer.files[0]) }
async function processProduk(file) {
  if (!file) return
  loadingProduk.value = true
  errorMsg.value = ''
  try { await processProdukRows(await readProdukFile(file)) }
  catch (e) { errorMsg.value = `Gagal membaca file produk: ${e.message}` }
  finally { loadingProduk.value = false }
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
  } catch (e) { errorMsg.value = `Gagal membaca file stock: ${e.message}` }
  finally { loadingStock.value = false }
}
</script>
