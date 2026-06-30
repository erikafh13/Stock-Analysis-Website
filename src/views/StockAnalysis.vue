<template>
  <div>
    <h1>📈 Hasil Analisa Stock</h1>

    <div v-if="!dataReady" class="alert alert-warning">
      ⚠️ Harap muat semua file di halaman <strong>Input Data</strong> terlebih dahulu.
    </div>

    <template v-else>
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
            <span v-else>▶ Jalankan Analisa Stock</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Melakukan perhitungan analisis stok...
      </div>

      <template v-if="result && !loading">
        <div class="alert alert-success">✅ Analisis Stok berhasil dijalankan!</div>

        <div class="card">
          <h3>⚙️ Konfigurasi Stok Minimal</h3>
          <p style="font-size:0.85rem; line-height:1.7;">
            ✅ <strong>Metode Terkunci: Min Stock (Days / Time Based)</strong><br/><br/>
            Perhitungan otomatis menggunakan multiplier waktu (WMA × Hari):<br/>
            <strong>A &amp; B:</strong> 1.00x (Buffer 30 Hari)<br/>
            <strong>C:</strong> 0.75x (Buffer 24 Hari)<br/>
            <strong>D:</strong> 0.50x (Buffer 15 Hari)<br/>
            <strong>E:</strong> 0.25x (Buffer 7 Hari)<br/>
            <strong>F:</strong> 0.0x (Min Stock 0, Max Stock 1)
          </p>
        </div>

        <hr class="section-divider" />
        <h2>Filter Produk (Berlaku untuk Semua Tabel)</h2>
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

        <h2>Filter Hasil (Hanya untuk Tabel per Kota)</h2>
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
        <div class="tabs">
          <button class="tab-btn" :class="{active:activeTab==='tabel'}" @click="activeTab='tabel'">Hasil Tabel</button>
          <button class="tab-btn" :class="{active:activeTab==='dashboard'}" @click="activeTab='dashboard'">Dashboard</button>
        </div>

        <div v-show="activeTab==='tabel'">
          <h2>Hasil Analisis Stok per Kota</h2>
          <CityExpanderTable
            v-for="city in citiesSorted"
            :key="city"
            :title="`Lihat Hasil Stok untuk Kota: ${city}`"
            :rows="filteredByCity(city)"
            :columns="detailCols"
            :default-open="city === citiesSorted[0]"
          />

          <hr class="section-divider" />
          <h2>📊 Tabel Gabungan Seluruh Kota (Stock)</h2>
          <PivotTable :rows="pivotRows" :columns="pivotCols" export-name="hasil_analisa_stock_gabungan.xlsx" />
        </div>

        <div v-show="activeTab==='dashboard'">
          <h2>📈 Dashboard Analisis Stock</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" style="color:var(--danger);">{{ totalUnderstock }}</div>
              <div class="stat-label">Total Produk Understock</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:var(--warning);">{{ totalOverstock }}</div>
              <div class="stat-label">Total Produk Overstock</div>
            </div>
          </div>

          <div class="card">
            <h3>Distribusi Kategori ABC (Log-Benchmark)</h3>
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
            <h3>Top 5 Produk Paling Overstock</h3>
            <PivotTable :rows="top5Overstock" :columns="top5OverstockCols" :exportable="false" max-height="300px" />
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
  calcAddStock, calculateSuggestedPo, getStatusStock, meltStockByCity,
  parseDateFromFilename, maxDate, sumQtyInRange, periodLabel, periodKey,
  colorKategoriAbc, colorStatusStock, groupBy, sumBy,
  KAT_COL, KEYS, CITY_SHORT, BULAN_TITLE, addDays, toISODate,
} from '@/utils/analysis'

const store   = useDataStore()
const loading = ref(false)
const result  = ref(null)
const bulanCols = ref([])
const activeTab = ref('tabel')

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
    { key: 'Status Stock', label: 'Status Stock', colorFn: v => colorStatusStock(v) },
    { key: 'Add Stock', label: 'Add Stock', type: 'number' },
    { key: 'Suggested PO', label: 'Suggested PO', type: 'number' },
  ]
})

const pivotRows = computed(() => {
  if (!baseFiltered.value.length) return []
  const byItem = groupBy(baseFiltered.value, 'No. Barang')
  const rows = []
  for (const [sku, group] of Object.entries(byItem)) {
    const first = group[0]
    const row = {}
    KEYS.forEach(k => row[k] = first[k])
    let allStock = 0, allSo = 0

    for (const city of citiesSorted.value) {
      const r = group.find(g => g.City === city)
      const short = CITY_SHORT[city] || city
      if (!r) continue
      row[`${short}_SO WMA`] = r['SO WMA'] ?? 0
      row[`${short}_ABC`] = r[KAT_COL] ?? ''
      row[`${short}_Min Stock`] = r['Min Stock'] ?? 0
      row[`${short}_Max Stock`] = r['Max Stock'] ?? 0
      row[`${short}_Stock Cabang`] = r['Stock Cabang'] ?? 0
      row[`${short}_Status Stock`] = r['Status Stock'] ?? ''
      row[`${short}_Add Stock`] = r['Add Stock'] ?? 0
      row[`${short}_Suggested PO`] = r['Suggested PO'] ?? 0
      allStock += Number(r['Stock Cabang']) || 0
      allSo    += Number(r['SO WMA']) || 0
    }
    row['All_Stock'] = allStock
    row['All_SO']    = allSo
    row['All_Restock 1 Bulan'] = allStock < allSo ? 'PO' : 'NO'
    rows.push(row)
  }
  return rows
})

const pivotCols = computed(() => {
  if (!pivotRows.value.length) return []
  return Object.keys(pivotRows.value[0]).map(k => {
    const col = { key: k, label: k, type: typeof pivotRows.value[0][k] === 'number' ? 'number' : undefined }
    if (k.endsWith('_ABC')) col.colorFn = v => colorKategoriAbc(v)
    if (k.endsWith('_Status Stock')) col.colorFn = v => colorStatusStock(v)
    return col
  })
})

const totalUnderstock = computed(() => baseFiltered.value.filter(r => r['Status Stock'] === 'Understock').length)
const totalOverstock  = computed(() => baseFiltered.value.filter(r => (r['Status Stock']||'').includes('Overstock')).length)

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

const top5OverstockCols = [
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: 'City', label: 'City' },
  { key: 'Kelebihan Stok', label: 'Kelebihan Stok', type: 'number' },
  { key: 'Stock Cabang', label: 'Stock Cabang', type: 'number' },
  { key: 'Max Stock', label: 'Max Stock', type: 'number' },
]
const top5Overstock = computed(() => {
  return baseFiltered.value
    .filter(r => (r['Status Stock']||'').includes('Overstock'))
    .map(r => ({ ...r, 'Kelebihan Stok': (Number(r['Stock Cabang'])||0) - (Number(r['Max Stock'])||0) }))
    .sort((a,b) => b['Kelebihan Stok'] - a['Kelebihan Stok']).slice(0,5)
})

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
    const stockSbyMap = {}
    for (const s of stockMelted.filter(x => x.City === 'SURABAYA')) {
      stockSbyMap[s['No. Barang']] = (stockSbyMap[s['No. Barang']] || 0) + (Number(s.Stock) || 0)
    }

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
          'Stock Surabaya': stockSbyMap[sku] ?? 0,
        }

        for (const [, label] of sortedPeriods) {
          const [namaBulan, tahun] = label.split(' ')
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
      r['Min Stock']    = calcMinStock(r, KAT_COL, 'SO WMA')
      r['Max Stock']    = calcMaxStock(r, KAT_COL, 'SO WMA')
      r['Stock Cabang'] = stockMap[`${r.City}||${r['No. Barang']}`] ?? 0
      r['Status Stock'] = getStatusStock(r)
      r['Add Stock']    = calcAddStock(r, KAT_COL, 'Min Stock', 'Stock Cabang')
    }

    rows.forEach((r, i) => { r.__idx = i })
    const poMap = calculateSuggestedPo(rows)
    for (const r of rows) { r['Suggested PO'] = poMap[r.__idx] ?? 0 }

    store.setStockResult(rows, bulanColumnsRenamed)
    result.value = rows
  } catch (e) {
    console.error(e)
    alert('Terjadi error saat menjalankan analisis: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
