<template>
  <div>
    <h1>📊 Hasil Analisa Stock V2</h1>

    <div class="alert alert-info">
      <strong>Perbedaan dengan V1:</strong>
      ✅ Suggested PO menggunakan 3 skenario distribusi berdasarkan kondisi stok Surabaya ·
      ✅ Distribusi proporsional berdasarkan Kategori ABC → SO WMA ·
      ✅ Filter cabang AMAN / TIDAK AMAN (50% threshold) ·
      ✅ All Add Stock dipisah: Cabang / Surabaya / Need Supplier ·
      ✅ Surabaya tidak pernah kirim ke dirinya sendiri ·
      ✅ Stok Sisa = Max(0, Stock Sby - Min Stock Sby)
    </div>

    <div v-if="!dataReady" class="alert alert-warning">
      ⚠️ Harap muat semua file di halaman <strong>Input Data</strong> terlebih dahulu.
    </div>

    <template v-else>
      <div class="card">
        <div class="flex gap-3 flex-wrap" style="align-items:flex-end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Tanggal Analisis</label>
            <input type="date" v-model="tanggalAnalisis" class="form-control" style="width:180px;" />
          </div>
          <button class="btn btn-primary" @click="runAnalysis" :disabled="loading">
            <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
            <span v-else>▶ Jalankan Analisis V2</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Menghitung analisis stock V2...
      </div>

      <template v-if="result && !loading">
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalSku.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Total Baris</div>
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
            <div class="stat-value" style="color:var(--success);">{{ poCount.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Need PO</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn" :class="{ active: activeTab === 'detail' }" @click="activeTab='detail'">
            Detail per Cabang
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'summary' }" @click="activeTab='summary'">
            Summary All
          </button>
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
                <option>Understock</option><option>Balance</option>
                <option>Overstock</option><option>Overstock F</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Filter Skenario</label>
              <select v-model="filterSkenario" class="form-control">
                <option value="">Semua Skenario</option>
                <option>1 - KURANG</option>
                <option>2 - TERBATAS/LEBIH</option>
                <option>3 - OVER</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card" v-show="activeTab === 'detail'">
          <h2>Detail per Cabang</h2>
          <DataTable
            :rows="filteredDetail"
            :columns="detailCols"
            export-name="hasil_analisa_stock_v2_detail.xlsx"
            max-height="600px"
          />
        </div>

        <div class="card" v-show="activeTab === 'summary'">
          <h2>Summary All (per SKU)</h2>
          <DataTable
            :rows="summaryData"
            :columns="summaryCols"
            export-name="hasil_analisa_stock_v2_summary.xlsx"
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
  calcMinStock, calcMaxStock, calculateAddStockV2,
  calculateSuggestedPoV2, calculateAllSummaryV2,
  getStatusStock, calcPersentaseStock, meltStockByCity,
  parseDateFromFilename, maxDate, colorKategoriAbc,
  colorStatusStock, groupBy, CITY_PREFIX_MAP,
} from '@/utils/analysis'

const store    = useDataStore()
const loading  = ref(false)
const result   = ref(null)
const summary  = ref(null)
const activeTab = ref('detail')

const dataReady = computed(() =>
  store.dfPenjualan.length > 0 && store.produkRef.length > 0 && store.dfStock.length > 0)

const defaultDate = computed(() => {
  if (store.stockFilename) {
    const d = parseDateFromFilename(store.stockFilename)
    if (d) return d.toISOString().slice(0,10)
  }
  const mx = maxDate(store.dfPenjualan, 'Tgl Faktur')
  return mx ? mx.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
})
const tanggalAnalisis = ref(defaultDate.value)

const filterCity     = ref('')
const filterStatus   = ref('')
const filterSkenario = ref('')

const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'
const CITIES  = ['SURABAYA','JAKARTA','SEMARANG','JOGJA','MALANG','BALI']

const cities = computed(() => {
  if (!result.value) return []
  return [...new Set(result.value.map(r => r.City))].sort()
})

const filteredDetail = computed(() => {
  if (!result.value) return []
  return result.value.filter(r =>
    (!filterCity.value   || r.City === filterCity.value) &&
    (!filterStatus.value || r['Status Stock'] === filterStatus.value) &&
    (!filterSkenario.value || r['Skenario'] === filterSkenario.value)
  )
})
const summaryData = computed(() => summary.value ?? [])

const totalSku        = computed(() => filteredDetail.value.length)
const understockCount = computed(() => filteredDetail.value.filter(r => r['Status Stock'] === 'Understock').length)
const overstockCount  = computed(() => filteredDetail.value.filter(r => r['Status Stock'].startsWith('Overstock')).length)
const poCount         = computed(() => filteredDetail.value.filter(r => (r['Suggested PO V2'] ?? 0) > 0).length)

const detailCols = [
  { key: 'No. Barang',      label: 'No. Barang' },
  { key: 'Nama Barang',     label: 'Nama Barang' },
  { key: 'BRAND Barang',    label: 'Brand' },
  { key: 'Kategori Barang', label: 'Kategori' },
  { key: 'City',            label: 'Kota' },
  { key: KAT_COL,           label: 'ABC', colorFn: (v) => colorKategoriAbc(v) },
  { key: 'SO WMA',          label: 'SO WMA',       type: 'number' },
  { key: 'Stock Cabang',    label: 'Stock',         type: 'number' },
  { key: 'Min Stock',       label: 'Min Stock',     type: 'number' },
  { key: 'Max Stock',       label: 'Max Stock',     type: 'number' },
  { key: 'Persentase Stock',label: '% Stock',       type: 'number' },
  { key: 'Add Stock',       label: 'Add Stock',     type: 'number' },
  { key: 'Suggested PO V2', label: 'Sug. PO V2',   type: 'number' },
  { key: 'Status Stock',    label: 'Status',        colorFn: (v) => colorStatusStock(v) },
]

const summaryCols = [
  { key: 'No. Barang',           label: 'No. Barang' },
  { key: 'Nama Barang',          label: 'Nama Barang' },
  { key: 'BRAND Barang',         label: 'Brand' },
  { key: 'All_Add_Stock_Cabang', label: 'Add Stock Cabang', type: 'number' },
  { key: 'All_Need_From_Supplier',label: 'Need Supplier',   type: 'number' },
  { key: 'All_Restock_1_Bulan',  label: 'Restock?' },
  { key: 'Skenario_Distribusi',  label: 'Skenario' },
  { key: 'All_Stock_Cabang',     label: 'Total Stock',      type: 'number' },
  { key: 'All_SO_Cabang',        label: 'Total SO WMA',     type: 'number' },
  { key: 'All_Suggest_PO',       label: 'Suggest PO?' },
]

async function runAnalysis() {
  loading.value = true
  result.value  = null
  summary.value = null
  await new Promise(r => setTimeout(r, 50))

  try {
    const endDate   = new Date(tanggalAnalisis.value)
    const penjualan = store.dfPenjualan
    const produkRef = store.produkRef
    const dfStock   = store.dfStock

    const produkMap = {}
    for (const p of produkRef) produkMap[String(p['No. Barang']).trim()] = p

    const grouped = groupBy(penjualan, 'No. Barang')
    const stockMelted = meltStockByCity(dfStock)
    const stockMap = {}
    for (const s of stockMelted) {
      const key = `${String(s['No. Barang']).trim()}||${s.City}`
      stockMap[key] = (stockMap[key] || 0) + (Number(s.Stock) || 0)
    }

    const allSkus = new Set([
      ...Object.keys(grouped),
      ...dfStock.map(r => String(r['No. Barang']).trim()),
    ])

    const rows = []
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
        })
      }
    }

    classifyAbcLogBenchmark(rows, 'SO WMA')

    for (const r of rows) {
      r['Min Stock']       = calcMinStock(r, KAT_COL, 'SO WMA')
      r['Max Stock']       = calcMaxStock(r, KAT_COL, 'SO WMA')
      r['Add Stock']       = calculateAddStockV2(r, KAT_COL, 'SO WMA', 'Stock Cabang')
      r['Status Stock']    = getStatusStock(r)
      r['Persentase Stock']= calcPersentaseStock(r)
    }

    rows.forEach((r, i) => { r._idx = i })
    const poMap = calculateSuggestedPoV2(rows)
    for (const r of rows) {
      r['Suggested PO V2'] = poMap[r._idx] ?? 0
      delete r._idx
    }

    // Skenario per row (from summary)
    const sumData = calculateAllSummaryV2(rows)
    const skenMap = {}
    for (const s of sumData) skenMap[s['No. Barang']] = s['Skenario_Distribusi']
    for (const r of rows) r['Skenario'] = skenMap[r['No. Barang']] ?? ''

    store.setStockV2Result(rows)
    result.value  = rows
    summary.value = sumData
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
