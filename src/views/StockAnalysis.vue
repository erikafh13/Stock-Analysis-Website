<template>
  <div>
    <h1>📈 Hasil Analisa Stock</h1>

    <div v-if="!dataReady" class="alert alert-warning">
      ⚠️ Harap muat semua file di halaman <strong>Input Data</strong> terlebih dahulu.
    </div>

    <template v-else>
      <!-- Tanggal analisis -->
      <div class="card">
        <div class="flex gap-3 flex-wrap" style="align-items:flex-end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Tanggal Analisis</label>
            <input type="date" v-model="tanggalAnalisis" class="form-control" style="width:180px;" />
          </div>
          <button class="btn btn-primary" @click="runAnalysis" :disabled="loading">
            <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
            <span v-else">▶ Jalankan Analisis</span>
          </button>
        </div>
        <p class="text-muted mt-2" style="font-size:0.8rem;">
          Tanggal ini digunakan sebagai referensi untuk perhitungan WMA 90 hari.
        </p>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Menghitung analisis stock...
      </div>

      <template v-if="result && !loading">
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalSku.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Total SKU</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--danger);">{{ understockCount.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Understock</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--warning);">{{ overstockCount.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Overstock</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--success);">{{ balanceCount.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Balance</div>
          </div>
        </div>

        <!-- Filter -->
        <div class="card">
          <div class="flex gap-3 flex-wrap" style="align-items:center;">
            <div class="form-group" style="margin:0;">
              <label class="form-label">Filter City</label>
              <select v-model="filterCity" class="form-control">
                <option value="">Semua Kota</option>
                <option v-for="c in cities" :key="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Filter Status</label>
              <select v-model="filterStatus" class="form-control">
                <option value="">Semua Status</option>
                <option>Understock</option>
                <option>Balance</option>
                <option>Overstock</option>
                <option>Overstock F</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Filter Kategori ABC</label>
              <select v-model="filterAbc" class="form-control">
                <option value="">Semua</option>
                <option v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="card">
          <h2>Tabel Hasil Analisis</h2>
          <DataTable
            :rows="filteredResult"
            :columns="tableCols"
            export-name="hasil_analisa_stock.xlsx"
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
import {
  calculateDailyWma, classifyAbcLogBenchmark,
  calcMinStock, calcMaxStock, calcAddStock, calculateSuggestedPo,
  getStatusStock, meltStockByCity, parseDateFromFilename, maxDate,
  colorKategoriAbc, colorStatusStock, groupBy,
} from '@/utils/analysis'

const store = useDataStore()

const dataReady = computed(() =>
  store.dfPenjualan.length > 0 && store.produkRef.length > 0 && store.dfStock.length > 0)

// Default tanggal dari nama file stock atau max tanggal penjualan
const defaultDate = computed(() => {
  if (store.stockFilename) {
    const d = parseDateFromFilename(store.stockFilename)
    if (d) return d.toISOString().slice(0,10)
  }
  const mx = maxDate(store.dfPenjualan, 'Tgl Faktur')
  return mx ? mx.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
})

const tanggalAnalisis = ref(defaultDate.value)
const loading = ref(false)
const result  = ref(null)

const filterCity   = ref('')
const filterStatus = ref('')
const filterAbc    = ref('')

const cities = computed(() => {
  if (!result.value) return []
  return [...new Set(result.value.map(r => r.City))].sort()
})

const filteredResult = computed(() => {
  if (!result.value) return []
  return result.value.filter(r =>
    (!filterCity.value   || r.City === filterCity.value) &&
    (!filterStatus.value || r['Status Stock'] === filterStatus.value) &&
    (!filterAbc.value    || r['Kategori ABC (Log-Benchmark - WMA)'] === filterAbc.value)
  )
})

const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'
const totalSku       = computed(() => filteredResult.value.length)
const understockCount = computed(() => filteredResult.value.filter(r => r['Status Stock'] === 'Understock').length)
const overstockCount  = computed(() => filteredResult.value.filter(r => r['Status Stock'].startsWith('Overstock')).length)
const balanceCount    = computed(() => filteredResult.value.filter(r => r['Status Stock'] === 'Balance').length)

const tableCols = [
  { key: 'No. Barang',      label: 'No. Barang' },
  { key: 'Nama Barang',     label: 'Nama Barang' },
  { key: 'BRAND Barang',    label: 'Brand' },
  { key: 'Kategori Barang', label: 'Kategori' },
  { key: 'City',            label: 'Kota' },
  { key: KAT_COL,           label: 'ABC', colorFn: (v) => colorKategoriAbc(v) },
  { key: 'SO WMA',          label: 'SO WMA',      type: 'number' },
  { key: 'Stock Cabang',    label: 'Stock',        type: 'number' },
  { key: 'Min Stock',       label: 'Min Stock',    type: 'number' },
  { key: 'Max Stock',       label: 'Max Stock',    type: 'number' },
  { key: 'Add Stock',       label: 'Add Stock',    type: 'number' },
  { key: 'Suggested PO',    label: 'Sug. PO',      type: 'number' },
  { key: 'Status Stock',    label: 'Status',       colorFn: (v) => colorStatusStock(v) },
]

async function runAnalysis() {
  loading.value = true
  result.value  = null

  await new Promise(r => setTimeout(r, 50)) // yield to UI

  try {
    const endDate   = new Date(tanggalAnalisis.value)
    const penjualan = store.dfPenjualan
    const produkRef = store.produkRef
    const dfStock   = store.dfStock

    // Build produk map
    const produkMap = {}
    for (const p of produkRef) {
      const key = String(p['No. Barang']).trim()
      produkMap[key] = p
    }

    // Group penjualan by (No. Barang, City)
    const grouped = groupBy(penjualan, 'No. Barang')

    // Melt stock by city
    const stockMelted = meltStockByCity(dfStock)
    const stockMap = {}
    for (const s of stockMelted) {
      const key = `${String(s['No. Barang']).trim()}||${s.City}`
      stockMap[key] = (stockMap[key] || 0) + (Number(s.Stock) || 0)
    }

    const CITIES = ['SURABAYA','JAKARTA','SEMARANG','JOGJA','MALANG','BALI']

    // Compute WMA per SKU per City
    const rows = []
    const allSkus = new Set([
      ...Object.keys(grouped),
      ...dfStock.map(r => String(r['No. Barang']).trim()),
    ])

    for (const sku of allSkus) {
      const skuGroup = grouped[sku] || []
      const produk   = produkMap[sku] || {}

      for (const city of CITIES) {
        const cityGroup = skuGroup.filter(r => String(r.City).toUpperCase() === city)
        const wma       = calculateDailyWma(cityGroup, endDate)
        const stock     = stockMap[`${sku}||${city}`] ?? 0

        rows.push({
          'No. Barang':      sku,
          'Nama Barang':     produk['Nama Barang'] || '',
          'BRAND Barang':    produk['BRAND Barang'] || '',
          'Kategori Barang': produk['Kategori Barang'] || '',
          City:              city,
          'SO WMA':          wma,
          'Stock Cabang':    stock,
          // ABC will be computed below
        })
      }
    }

    // ABC Classification
    classifyAbcLogBenchmark(rows, 'SO WMA')

    // Min/Max/Add Stock
    for (const r of rows) {
      r['Min Stock']  = calcMinStock(r, KAT_COL, 'SO WMA')
      r['Max Stock']  = calcMaxStock(r, KAT_COL, 'SO WMA')
      r['Stock Surabaya'] = stockMap[`${r['No. Barang']}||SURABAYA`] ?? 0
      r['Add Stock']  = calcAddStock(r, KAT_COL, 'Min Stock', 'Stock Cabang')
      r['Status Stock'] = getStatusStock(r)
    }

    // Suggested PO
    rows.forEach((r, i) => { r._idx = i })
    const poMap = calculateSuggestedPo(rows)
    for (const r of rows) {
      r['Suggested PO'] = poMap[r._idx] ?? 0
      delete r._idx
    }

    store.setStockResult(rows)
    result.value = rows
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
