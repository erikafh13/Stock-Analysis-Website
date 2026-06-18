<template>
  <div>
    <h1>🆕 Analisis Produk Baru</h1>

    <div class="alert alert-info">
      <strong>Logika:</strong>
      ✅ Produk baru = SKU di file items yang belum pernah ada di data penjualan ·
      ✅ Kategori ABC dari mode produk serupa (Kategori + Brand) di hasil V2 ·
      ✅ SO WMA awal dari rata-rata SO WMA produk serupa per kota ·
      ✅ Min/Max/Add Stock & Suggested PO menggunakan logika V2 yang sama ·
      ⚠️ Membutuhkan hasil Analisa Stock V2 dan Data Stock sudah dimuat
    </div>

    <div v-if="!v2Ready" class="alert alert-warning">
      ⚠️ Harap jalankan <strong>Hasil Analisa Stock V2</strong> terlebih dahulu.
    </div>

    <template v-else>
      <!-- Upload file items -->
      <div class="card">
        <h2>📂 Upload File Items (Daftar Produk)</h2>
        <p class="text-muted mb-2" style="font-size:0.875rem;">
          Upload file items (.xlsx) — daftar semua produk dari sistem.
        </p>
        <label class="upload-zone" @dragover.prevent="dragover=true" @dragleave="dragover=false"
               @drop.prevent="handleDrop" :class="{ dragover }">
          <input type="file" accept=".xlsx" @change="handleFile" />
          <div>📂 Klik atau drag & drop file Items (.xlsx)</div>
        </label>
        <div v-if="loadingFile" class="loading-overlay">
          <span class="spinner"></span> Membaca file...
        </div>
        <div v-if="store.itemsDf.length > 0 && !loadingFile" class="alert alert-success mt-2">
          ✅ File items dimuat: <strong>{{ store.itemsDf.length.toLocaleString('id-ID') }} baris</strong>
        </div>
      </div>

      <div class="card" v-if="store.itemsDf.length > 0">
        <button class="btn btn-primary" @click="runAnalysis" :disabled="loading">
          <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
          <span v-else>▶ Hitung Analisis Produk Baru</span>
        </button>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Menganalisis produk baru...
      </div>

      <template v-if="result && !loading">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ result.length.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Baris Hasil</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ uniqueSkus.toLocaleString('id-ID') }}</div>
            <div class="stat-label">SKU Baru</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--danger);">{{ needPoCount.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Need PO</div>
          </div>
        </div>

        <div class="card">
          <h2>Tabel Produk Baru</h2>
          <DataTable
            :rows="result"
            :columns="tableCols"
            export-name="analisis_produk_baru.xlsx"
            max-height="600px"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import DataTable from '@/components/DataTable.vue'
import { readExcelFile } from '@/utils/fileReader'
import {
  classifyAbcLogBenchmark, calcMinStock, calcMaxStock,
  calculateAddStockV2, calculateSuggestedPoV2,
  getStatusStock, calcPersentaseStock, meltStockByCity,
  colorKategoriAbc, colorStatusStock, groupBy, CITY_PREFIX_MAP,
} from '@/utils/analysis'

const store      = useDataStore()
const loading    = ref(false)
const loadingFile= ref(false)
const result     = ref(null)
const dragover   = ref(false)

const v2Ready = computed(() => store.stockV2Result && store.stockV2Result.length > 0)

const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'
const CITIES  = ['SURABAYA','JAKARTA','SEMARANG','JOGJA','MALANG','BALI']

const uniqueSkus = computed(() =>
  new Set((result.value||[]).map(r => r['No. Barang'])).size)
const needPoCount = computed(() =>
  (result.value||[]).filter(r => (r['Suggested PO V2']||0) > 0).length)

const tableCols = [
  { key: 'No. Barang',      label: 'No. Barang' },
  { key: 'Nama Barang',     label: 'Nama Barang' },
  { key: 'BRAND Barang',    label: 'Brand' },
  { key: 'Kategori Barang', label: 'Kategori' },
  { key: 'City',            label: 'Kota' },
  { key: KAT_COL,           label: 'ABC',         colorFn: v => colorKategoriAbc(v) },
  { key: 'SO WMA',          label: 'SO WMA Init',  type: 'number' },
  { key: 'Stock Cabang',    label: 'Stock',         type: 'number' },
  { key: 'Min Stock',       label: 'Min',           type: 'number' },
  { key: 'Max Stock',       label: 'Max',           type: 'number' },
  { key: 'Add Stock',       label: 'Add Stock',     type: 'number' },
  { key: 'Suggested PO V2', label: 'Sug. PO',       type: 'number' },
  { key: 'Status Stock',    label: 'Status',        colorFn: v => colorStatusStock(v) },
]

async function handleFile(e) {
  await processFile(e.target.files[0])
}
async function handleDrop(e) {
  dragover.value = false
  await processFile(e.dataTransfer.files[0])
}
async function processFile(file) {
  if (!file) return
  loadingFile.value = true
  try {
    const rows = await readExcelFile(file)
    store.setItemsDf(rows)
  } catch (e) { console.error(e) }
  finally { loadingFile.value = false }
}

async function runAnalysis() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 50))
  try {
    const v2     = store.stockV2Result
    const items  = store.itemsDf
    const stock  = store.dfStock

    // SKU yang sudah ada di penjualan
    const existingSku = new Set(store.dfPenjualan.map(r => String(r['No. Barang']||'').trim()))

    // Identifikasi SKU baru
    const noBarangCol = Object.keys(items[0]||{}).find(k =>
      k.toLowerCase().includes('barang') || k.toLowerCase().includes('sku') || k === 'No. Barang'
    ) || Object.keys(items[0]||{})[0]

    const newSkus = items.filter(r => {
      const sku = String(r[noBarangCol]||'').trim()
      return sku && !existingSku.has(sku)
    })

    if (!newSkus.length) {
      result.value = []
      return
    }

    // Build referensi dari V2
    const v2ByCatBrand = groupBy(v2, r => `${r['Kategori Barang']}||${r['BRAND Barang']}`)
    const v2ByCity = {}
    for (const r of v2) {
      const key = `${r['Kategori Barang']}||${r['BRAND Barang']}||${r.City}`
      if (!v2ByCity[key]) v2ByCity[key] = []
      v2ByCity[key].push(Number(r['SO WMA'])||0)
    }

    // Stock melt
    const stockMelted = meltStockByCity(stock)
    const stockMap = {}
    for (const s of stockMelted) {
      const key = `${String(s['No. Barang']).trim()}||${s.City}`
      stockMap[key] = (stockMap[key] || 0) + (Number(s.Stock) || 0)
    }

    const rows = []
    for (const item of newSkus) {
      const sku      = String(item[noBarangCol]||'').trim()
      const kategori = String(item['Kategori Barang']||item['kategori']||'').trim().toUpperCase()
      const brand    = String(item['BRAND Barang']||item['brand']||item['Brand']||'').trim()
      const nama     = String(item['Nama Barang']||item['nama']||'').trim()

      // Mode ABC dari produk serupa
      const catKey = `${kategori}||${brand}`
      const similar = v2ByCatBrand[catKey] || []
      const abcFreq = {}
      for (const r of similar) {
        const k = r[KAT_COL]||'D'; abcFreq[k] = (abcFreq[k]||0)+1
      }
      const defaultAbc = Object.entries(abcFreq).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'D'

      for (const city of CITIES) {
        // SO WMA init: rata-rata produk serupa kota yang sama
        const cityKey = `${kategori}||${brand}||${city}`
        const soVals  = v2ByCity[cityKey] || []
        const soWma   = soVals.length ? soVals.reduce((s,v)=>s+v,0)/soVals.length : 0
        const stockVal = stockMap[`${sku}||${city}`] ?? 0

        rows.push({
          'No. Barang':      sku,
          'Nama Barang':     nama,
          'BRAND Barang':    brand,
          'Kategori Barang': kategori,
          City:              city,
          'SO WMA':          Math.ceil(soWma),
          'Stock Cabang':    stockVal,
          [KAT_COL]:         defaultAbc,
        })
      }
    }

    // Min/Max/Add/Status/Persen
    for (const r of rows) {
      r['Min Stock']        = calcMinStock(r, KAT_COL, 'SO WMA')
      r['Max Stock']        = calcMaxStock(r, KAT_COL, 'SO WMA')
      r['Add Stock']        = calculateAddStockV2(r, KAT_COL, 'SO WMA', 'Stock Cabang')
      r['Status Stock']     = getStatusStock(r)
      r['Persentase Stock'] = calcPersentaseStock(r)
    }

    // Suggested PO V2
    rows.forEach((r,i) => { r._idx = i })
    const poMap = calculateSuggestedPoV2(rows)
    for (const r of rows) {
      r['Suggested PO V2'] = poMap[r._idx] ?? 0
      delete r._idx
    }

    store.setNewProductResult(rows)
    result.value = rows
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
