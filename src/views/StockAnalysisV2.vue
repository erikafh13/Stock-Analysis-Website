<template>
  <div>
    <h1>📈 Hasil Analisa Stock V2</h1>
    <div class="alert alert-info">
      <strong>Perbedaan dengan V1:</strong>
      ✅ Suggested PO menggunakan <strong>3 skenario distribusi</strong> berdasarkan kondisi stok Surabaya ·
      ✅ Distribusi proporsional berdasarkan <strong>Kategori ABC → SO WMA</strong> ·
      ✅ All Add Stock dipisah: <strong>Cabang / Surabaya / Need Supplier</strong> ·
      ✅ Surabaya tidak pernah kirim ke dirinya sendiri ·
      ✅ Stok Sisa = Max(0, Stock Sby − Min Stock Sby)
    </div>

    <div v-if="!dataReady" class="alert alert-warning">
      ⚠️ Harap muat semua file di halaman <strong>Input Data</strong> terlebih dahulu.
    </div>

    <template v-else>
      <!-- ── Tanggal Analisis ─────────────────────────────────────────────── -->
      <div class="card">
        <div class="flex gap-3 flex-wrap" style="align-items:flex-end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Tanggal Awal (90 Hari Belakang)</label>
            <input type="date" :value="startDateDisplay" class="form-control" style="width:180px;" disabled />
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Tanggal Akhir</label>
            <input type="date" v-model="tanggalAnalisis" class="form-control" style="width:180px;" />
          </div>
          <button class="btn btn-primary" @click="runAnalysis" :disabled="loading">
            <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
            <span v-else>🚀 Jalankan Analisa Stock V2</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Melakukan perhitungan analisis stok V2...
      </div>

      <template v-if="result && !loading">
        <div class="alert alert-success">✅ Analisis Stok V2 berhasil dijalankan!</div>

        <div class="card">
          <h3>⚙️ Konfigurasi V2</h3>
          <p style="font-size:0.85rem; line-height:1.7;">
            <strong>Add Stock</strong> = Max(0, Min Stock − Stock Cabang)<br/>
            <strong>Stok Sisa Surabaya</strong> = Max(0, Stock Sby − Min Stock Sby)<br/><br/>
            <strong>Skenario Distribusi:</strong><br/>
            🔴 <strong>KURANG</strong>: Stok Sisa = 0 → semua cabang PO = 0<br/>
            🟡 <strong>SISA</strong>: 0 &lt; Stok Sisa &lt; All Add Cabang → prioritas ABC → SO WMA<br/>
            🟢 <strong>OVER</strong>: Stok Sisa ≥ All Add Cabang → semua cabang dapat penuh<br/><br/>
            <strong>Multiplier Min Stock:</strong> A &amp; B = 1.00x | C = 0.75x | D = 0.50x | E = 0.25x | F = 0x
          </p>
        </div>

        <hr class="section-divider" />

        <!-- ── Filter Produk ─────────────────────────────────────────────── -->
        <h2>Filter Produk</h2>
        <div class="card">
          <div class="flex gap-3 flex-wrap">
            <div class="form-group" style="flex:1; min-width:200px; margin:0;">
              <label class="form-label">Kategori:</label>
              <select v-model="selKat" multiple class="form-control" style="height:90px;">
                <option v-for="k in kategoriOptions" :key="k" :value="k">{{ k }}</option>
              </select>
            </div>
            <div class="form-group" style="flex:1; min-width:200px; margin:0;">
              <label class="form-label">Brand:</label>
              <select v-model="selBrand" multiple class="form-control" style="height:90px;">
                <option v-for="b in brandOptions" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
            <div class="form-group" style="flex:1; min-width:200px; margin:0;">
              <label class="form-label">Nama Produk:</label>
              <select v-model="selProd" multiple class="form-control" style="height:90px;">
                <option v-for="p in prodOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
        </div>

        <h2>Filter Hasil (Tabel per Kota)</h2>
        <div class="card">
          <div class="flex gap-3 flex-wrap">
            <div class="form-group" style="flex:1; min-width:200px; margin:0;">
              <label class="form-label">Kategori ABC:</label>
              <select v-model="selAbc" multiple class="form-control" style="height:90px;">
                <option v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</option>
              </select>
            </div>
            <div class="form-group" style="flex:1; min-width:200px; margin:0;">
              <label class="form-label">Status Stock:</label>
              <select v-model="selStatus" multiple class="form-control" style="height:90px;">
                <option v-for="s in ['Understock','Balance','Overstock','Overstock F']" :key="s">{{ s }}</option>
              </select>
            </div>
          </div>
        </div>

        <hr class="section-divider" />

        <!-- ── Tabs ──────────────────────────────────────────────────────── -->
        <div class="tabs">
          <button class="tab-btn" :class="{active:activeTab==='kota'}" @click="activeTab='kota'">Tabel per Kota</button>
          <button class="tab-btn" :class="{active:activeTab==='gabungan'}" @click="activeTab='gabungan'">Tabel Gabungan</button>
          <button class="tab-btn" :class="{active:activeTab==='dashboard'}" @click="activeTab='dashboard'">Dashboard</button>
        </div>

        <!-- Tab: Tabel per Kota -->
        <div v-show="activeTab==='kota'">
          <h2>Hasil Analisis Stok per Kota</h2>
          <CityExpanderTable
            v-for="city in citiesSorted"
            :key="city"
            :title="city"
            :rows="filteredByCity(city)"
            :columns="detailCols"
            :default-open="city === citiesSorted[0]"
          />
        </div>

        <!-- Tab: Tabel Gabungan -->
        <div v-show="activeTab==='gabungan'">
          <h2>📊 Tabel Gabungan Seluruh Kota</h2>
          <PivotTable :rows="pivotRows" :columns="pivotCols" export-name="hasil_analisis_stock_v2_gabungan.xlsx" />

          <hr class="section-divider" />
          <h3>Legenda Skenario Distribusi:</h3>
          <div class="stats-grid">
            <div class="alert alert-danger" style="margin:0;"><strong>1 - KURANG</strong><br/>Stok Sisa = 0. Surabaya tidak bisa kirim ke manapun. Semua cabang PO = 0, tunggu distributor.</div>
            <div class="alert alert-warning" style="margin:0;"><strong>2 - SISA</strong><br/>0 &lt; Stok Sisa &lt; All Add Cabang. Distribusi berdasarkan urgency (% stok terkecil dahulu).</div>
            <div class="alert alert-success" style="margin:0;"><strong>3 - OVER</strong><br/>Stok Sisa ≥ All Add Cabang. Semua cabang dapat Add Stock penuh.</div>
          </div>
        </div>

        <!-- Tab: Dashboard -->
        <div v-show="activeTab==='dashboard'">
          <h2>📈 Dashboard Analisis Stock V2</h2>

          <h3>Distribusi Skenario per Produk</h3>
          <div class="stats-grid">
            <div class="stat-card" v-for="s in skenarioStats" :key="s.label">
              <div class="stat-value">{{ s.icon }} {{ s.count }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" style="color:var(--danger);">{{ totalUnderstock }}</div>
              <div class="stat-label">Total Produk Understock</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:var(--warning);">{{ totalOverstock }}</div>
              <div class="stat-label">Total Produk Overstock</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:var(--success);">{{ totalNeedSupplier.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Total Need From Supplier</div>
            </div>
          </div>

          <div class="card">
            <h3>Distribusi Kategori ABC</h3>
            <SimpleBarChart :data="abcDistribution" />
          </div>
          <div class="card">
            <h3>Distribusi Status Stok</h3>
            <SimpleBarChart :data="statusDistribution" />
          </div>

          <div class="card">
            <h3>Top 5 Produk Paling Understock</h3>
            <PivotTable :rows="top5Understock" :columns="top5UnderstockCols" :exportable="false" max-height="300px" />
          </div>
          <div class="card">
            <h3>Top 5 Produk Butuh Supplier Terbanyak</h3>
            <PivotTable :rows="top5Supplier" :columns="top5SupplierCols" :exportable="false" max-height="300px" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import CityExpanderTable from '@/components/CityExpanderTable.vue'
import PivotTable from '@/components/PivotTable.vue'
import SimpleBarChart from '@/components/SimpleBarChart.vue'
import {
  calculateDailyWma, classifyAbcLogBenchmark, calcMinStock, calcMaxStock,
  calculateAddStockV2, calculateSuggestedPoV2, calculateAllSummaryV2,
  getStatusStock, calcPersentaseStock, meltStockByCity,
  parseDateFromFilename, maxDate, sumQtyInRange, periodLabel, periodKey,
  colorKategoriAbc, colorStatusStock, colorSkenario, groupBy, sumBy,
  KAT_COL, KEYS, ALL_CITIES, CITY_SHORT, BULAN_TITLE, addDays, toISODate,
} from '@/utils/analysis'

const store   = useDataStore()
const loading = ref(false)
const result  = ref(null)
const summary = ref(null)
const bulanCols = ref([])
const activeTab = ref('kota')

const dataReady = computed(() =>
  store.dfPenjualan.length > 0 && store.produkRef.length > 0 && store.dfStock.length > 0)

const defaultDate = computed(() => {
  if (store.stockFilename) {
    const d = parseDateFromFilename(store.stockFilename)
    if (d) return toISODate(d)
  }
  const mx = maxDate(store.dfPenjualan, 'Tgl Faktur')
  return mx ? toISODate(mx) : toISODate(new Date())
})
const tanggalAnalisis = ref(defaultDate.value)
const startDateDisplay = computed(() => toISODate(addDays(tanggalAnalisis.value, -89)))

// Filters
const selKat = ref([]), selBrand = ref([]), selProd = ref([])
const selAbc = ref([]), selStatus = ref([])

const kategoriOptions = computed(() => result.value ? [...new Set(result.value.map(r=>r['Kategori Barang']))].sort() : [])
const brandOptions    = computed(() => result.value ? [...new Set(result.value.map(r=>r['BRAND Barang']))].sort() : [])
const prodOptions     = computed(() => result.value ? [...new Set(result.value.map(r=>r['Nama Barang']))].sort() : [])

const baseFiltered = computed(() => {
  if (!result.value) return []
  let rows = result.value.filter(r => r.City !== 'OTHERS')
  if (selKat.value.length)   rows = rows.filter(r => selKat.value.includes(r['Kategori Barang']))
  if (selBrand.value.length) rows = rows.filter(r => selBrand.value.includes(r['BRAND Barang']))
  if (selProd.value.length)  rows = rows.filter(r => selProd.value.includes(r['Nama Barang']))
  return rows
})

const citiesSorted = computed(() => [...new Set(baseFiltered.value.map(r => r.City))].sort())

function filteredByCity(city) {
  let rows = baseFiltered.value.filter(r => r.City === city)
  if (selAbc.value.length)    rows = rows.filter(r => selAbc.value.includes(r[KAT_COL]))
  if (selStatus.value.length) rows = rows.filter(r => selStatus.value.includes(r['Status Stock']))
  return rows
}

const detailCols = computed(() => {
  const monthCols = bulanCols.value.map(m => ({ key: m, label: m, type: 'number' }))
  return [
    { key: 'No. Barang', label: 'No. Barang' },
    { key: 'Kategori Barang', label: 'Kategori Barang' },
    { key: 'BRAND Barang', label: 'BRAND Barang' },
    { key: 'Nama Barang', label: 'Nama Barang' },
    ...monthCols,
    { key: 'Penjualan Bln 1', label: 'Penjualan Bln 1', type: 'number' },
    { key: 'Penjualan Bln 2', label: 'Penjualan Bln 2', type: 'number' },
    { key: 'Penjualan Bln 3', label: 'Penjualan Bln 3', type: 'number' },
    { key: 'SO WMA',   label: 'SO WMA',   type: 'number' },
    { key: 'SO Mean',  label: 'SO Mean',  type: 'number' },
    { key: 'SO Total', label: 'SO Total', type: 'number' },
    { key: 'Log (10) WMA', label: 'Log (10) WMA', decimals: 2 },
    { key: 'Avg Log WMA',  label: 'Avg Log WMA',  decimals: 2 },
    { key: 'Ratio Log WMA',label: 'Ratio Log WMA',decimals: 2 },
    { key: KAT_COL, label: 'Kategori ABC', colorFn: v => colorKategoriAbc(v) },
    { key: 'Min Stock', label: 'Min Stock', type: 'number' },
    { key: 'Max Stock', label: 'Max Stock', type: 'number' },
    { key: 'Stock Cabang', label: 'Stock Cabang', type: 'number' },
    { key: 'Persentase Stock', label: 'Persentase Stock', decimals: 1 },
    { key: 'Status Stock', label: 'Status Stock', colorFn: v => colorStatusStock(v) },
    { key: 'Add Stock', label: 'Add Stock', type: 'number' },
    { key: 'Suggested PO', label: 'Suggested PO', type: 'number' },
  ]
})

// ── Pivot Gabungan ────────────────────────────────────────────────────────────
const pivotRows = computed(() => {
  if (!baseFiltered.value.length) return []
  const byItem = groupBy(baseFiltered.value, 'No. Barang')
  const sumData = calculateAllSummaryV2(baseFiltered.value)
  const sumMap = {}
  sumData.forEach(s => sumMap[s['No. Barang']] = s)

  const rows = []
  for (const [sku, group] of Object.entries(byItem)) {
    const first = group[0]
    const row = {}
    KEYS.forEach(k => row[k] = first[k])

    for (const city of citiesSorted.value) {
      const r = group.find(g => g.City === city)
      const short = CITY_SHORT[city] || city
      if (!r) continue
      bulanCols.value.slice(-2).forEach(m => row[`${short}_${shortBulan(m)}`] = r[m] ?? 0)
      row[`${short}_Bln 1`] = r['Penjualan Bln 1'] ?? 0
      row[`${short}_Bln 2`] = r['Penjualan Bln 2'] ?? 0
      row[`${short}_Bln 3`] = r['Penjualan Bln 3'] ?? 0
      row[`${short}_SO WMA`] = r['SO WMA'] ?? 0
      row[`${short}_${shortKat()}`] = r[KAT_COL] ?? ''
      row[`${short}_Min Stock`] = r['Min Stock'] ?? 0
      row[`${short}_Max Stock`] = r['Max Stock'] ?? 0
      row[`${short}_Stock Cabang`] = r['Stock Cabang'] ?? 0
      row[`${short}_% Stock`] = r['Persentase Stock'] ?? 0
      row[`${short}_Status Stock`] = r['Status Stock'] ?? ''
      row[`${short}_Add Stock`] = r['Add Stock'] ?? 0
      if (city === 'SURABAYA') {
        const sby = group.find(g => g.City === 'SURABAYA')
        const minStockSby = sby ? Number(sby['Min Stock'])||0 : 0
        const stockSby    = sby ? Number(sby['Stock Cabang'])||0 : 0
        row['SBY_Sisa Stock'] = Math.max(0, stockSby - minStockSby)
      }
    }

    const s = sumMap[sku]
    if (s) {
      row['All_Add_Cabang']     = s.All_Add_Stock_Cabang
      row['All_Stock_Cabang']   = s.All_Stock_Cabang
      row['All_SO_Cabang']      = s.All_SO_Cabang
      row['All_Need_Distributor'] = s.All_Need_From_Supplier
      row['Restock?']           = s.All_Suggest_PO
      row['SBY_Skenario']       = (s.Skenario_Distribusi || '').replace(/^\d+\s*-\s*/, '')
    }
    rows.push(row)
  }
  return rows
})

function shortBulan(m) {
  const [nama, tahun] = m.split(' ')
  return `${BULAN_TITLE[nama] || nama} ${tahun}`
}
function shortKat() { return 'ABC' }

const pivotCols = computed(() => {
  if (!pivotRows.value.length) return []
  return Object.keys(pivotRows.value[0]).map(k => {
    const col = { key: k, label: k, type: typeof pivotRows.value[0][k] === 'number' ? 'number' : undefined }
    if (k.endsWith('_ABC')) col.colorFn = v => colorKategoriAbc(v)
    if (k.endsWith('_Status Stock')) col.colorFn = v => colorStatusStock(v)
    if (k === 'SBY_Skenario') col.colorFn = v => colorSkenario(v)
    return col
  })
})

// ── Dashboard ─────────────────────────────────────────────────────────────────
const skenarioStats = computed(() => {
  if (!baseFiltered.value.length) return []
  const sumData = calculateAllSummaryV2(baseFiltered.value)
  const counts = {}
  sumData.forEach(s => counts[s.Skenario_Distribusi] = (counts[s.Skenario_Distribusi]||0)+1)
  return [
    { label: '1 - KURANG', icon: '🔴', count: counts['1 - KURANG'] || 0 },
    { label: '2 - SISA', icon: '🟡', count: counts['2 - TERBATAS/LEBIH'] || 0 },
    { label: '3 - OVER', icon: '🟢', count: counts['3 - OVER'] || 0 },
  ]
})

const totalUnderstock = computed(() => baseFiltered.value.filter(r => r['Status Stock'] === 'Understock').length)
const totalOverstock  = computed(() => baseFiltered.value.filter(r => (r['Status Stock']||'').includes('Overstock')).length)
const totalNeedSupplier = computed(() => {
  if (!baseFiltered.value.length) return 0
  const sumData = calculateAllSummaryV2(baseFiltered.value)
  return sumBy(sumData, 'All_Need_From_Supplier')
})

const abcDistribution = computed(() => {
  const counts = {}
  baseFiltered.value.forEach(r => counts[r[KAT_COL]] = (counts[r[KAT_COL]]||0)+1)
  return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a,b)=>a.label.localeCompare(b.label))
})
const statusDistribution = computed(() => {
  const counts = {}
  baseFiltered.value.forEach(r => counts[r['Status Stock']] = (counts[r['Status Stock']]||0)+1)
  return Object.entries(counts).map(([label, value]) => ({ label, value }))
})

const top5UnderstockCols = [
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: 'City', label: 'City' },
  { key: 'Add Stock', label: 'Add Stock', type: 'number' },
  { key: 'Stock Cabang', label: 'Stock Cabang', type: 'number' },
  { key: 'Min Stock', label: 'Min Stock', type: 'number' },
]
const top5Understock = computed(() =>
  baseFiltered.value.filter(r => r['Status Stock'] === 'Understock')
    .sort((a,b) => (Number(b['Add Stock'])||0) - (Number(a['Add Stock'])||0)).slice(0,5))

const top5SupplierCols = [
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: 'All_Need_From_Supplier', label: 'Need Supplier', type: 'number' },
  { key: 'All_Add_Stock_Cabang', label: 'Add Stock Cabang', type: 'number' },
  { key: 'Skenario_Distribusi', label: 'Skenario' },
]
const top5Supplier = computed(() => {
  if (!baseFiltered.value.length) return []
  const sumData = calculateAllSummaryV2(baseFiltered.value)
  return [...sumData].sort((a,b) => b.All_Need_From_Supplier - a.All_Need_From_Supplier).slice(0,5)
})

// ── Run Analysis ──────────────────────────────────────────────────────────────
async function runAnalysis() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 50))

  try {
    const endDate   = new Date(tanggalAnalisis.value)
    const startDate = addDays(endDate, -89)
    const penjualanAll = store.dfPenjualan
    const produkRef     = store.produkRef
    const dfStock        = store.dfStock

    const penjualan90 = penjualanAll.filter(r => {
      const d = new Date(r['Tgl Faktur'])
      return d >= startDate && d <= endDate
    })

    if (!penjualan90.length) {
      alert('Tidak ada data penjualan dalam rentang 90 hari terakhir.')
      loading.value = false
      return
    }

    const r1e = endDate, r1s = addDays(endDate, -29)
    const r2e = addDays(endDate, -30), r2s = addDays(endDate, -59)
    const r3e = addDays(endDate, -60), r3s = addDays(endDate, -89)

    const produkMap = {}
    for (const p of produkRef) produkMap[String(p['No. Barang']).trim()] = p

    const grouped = groupBy(penjualan90, r => `${r.City}||${String(r['No. Barang']).trim()}`)
    const cities  = [...new Set(penjualanAll.map(r => r.City))]
    const skus    = [...new Set(produkRef.map(p => String(p['No. Barang']).trim()))]

    const stockMelted = meltStockByCity(dfStock)
    const stockMap = {}
    for (const s of stockMelted) {
      const key = `${s.City}||${s['No. Barang']}`
      stockMap[key] = (stockMap[key] || 0) + (Number(s.Stock) || 0)
    }

    // Kolom bulanan dinamis dari rentang data
    const periodSet = new Map()
    for (const r of penjualan90) {
      const d = new Date(r['Tgl Faktur'])
      const key = periodKey(d)
      if (!periodSet.has(key)) periodSet.set(key, periodLabel(d))
    }
    const sortedPeriods = [...periodSet.entries()].sort((a,b) => a[0].localeCompare(b[0]))
    const bulanColumnsRenamed = sortedPeriods.map(([,label]) => label)
    bulanCols.value = bulanColumnsRenamed

    const rows = []
    for (const city of cities) {
      for (const sku of skus) {
        const produk = produkMap[sku] || {}
        const key    = `${city}||${sku}`
        const group  = grouped[key] || []

        const wma = calculateDailyWma(group, endDate)
        const soMean = sumQtyInRange(group, startDate, endDate) / 3

        const row = {
          City: city,
          'No. Barang': sku,
          'Kategori Barang': produk['Kategori Barang'] || '',
          'BRAND Barang': produk['BRAND Barang'] || '',
          'Nama Barang': produk['Nama Barang'] || '',
          'Penjualan Bln 1': sumQtyInRange(group, r1s, r1e),
          'Penjualan Bln 2': sumQtyInRange(group, r2s, r2e),
          'Penjualan Bln 3': sumQtyInRange(group, r3s, r3e),
          'SO WMA': wma,
          'SO Mean': Math.round(soMean),
          'SO Total': wma,
        }

        for (const [, label] of sortedPeriods) {
          const [namaBulan, tahun] = label.split(' ')
          const monthIdx = Object.values({JANUARI:1,FEBRUARI:2,MARET:3,APRIL:4,MEI:5,JUNI:6,JULI:7,AGUSTUS:8,SEPTEMBER:9,OKTOBER:10,NOVEMBER:11,DESEMBER:12})
          const idx = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'].indexOf(namaBulan) + 1
          const mStart = new Date(Number(tahun), idx - 1, 1)
          const mEnd   = new Date(Number(tahun), idx, 0)
          row[label] = sumQtyInRange(group, mStart, mEnd)
        }

        rows.push(row)
      }
    }

    classifyAbcLogBenchmark(rows, 'SO WMA')

    for (const r of rows) {
      r['Min Stock'] = calcMinStock(r, KAT_COL, 'SO WMA')
      r['Max Stock'] = calcMaxStock(r, KAT_COL, 'SO WMA')
      r['Stock Cabang'] = stockMap[`${r.City}||${r['No. Barang']}`] ?? 0
      r['Status Stock'] = getStatusStock(r)
      r['Add Stock'] = calculateAddStockV2(r, KAT_COL, 'SO WMA', 'Stock Cabang')
      r['Persentase Stock'] = calcPersentaseStock(r)
    }

    rows.forEach((r, i) => { r.__idx = i })
    const poMap = calculateSuggestedPoV2(rows)
    for (const r of rows) { r['Suggested PO'] = poMap[r.__idx] ?? 0 }

    // Sisa Stock Surabaya per SKU
    const sbySisaMap = {}
    for (const sku of skus) {
      const sbyRow = rows.find(r => r.City === 'SURABAYA' && r['No. Barang'] === sku)
      if (sbyRow) sbySisaMap[sku] = Math.max(0, (sbyRow['Stock Cabang']||0) - (sbyRow['Min Stock']||0))
    }
    for (const r of rows) r['Sisa Stock Surabaya'] = sbySisaMap[r['No. Barang']] ?? 0

    store.setStockV2Result(rows, bulanColumnsRenamed)
    result.value = rows
  } catch (e) {
    console.error(e)
    alert('Terjadi error saat menjalankan analisis: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
