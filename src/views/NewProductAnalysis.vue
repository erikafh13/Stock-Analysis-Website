<template>
  <div>
    <h1>🆕 Analisis Produk Baru</h1>
    <div class="alert alert-info">
      <strong>Logika halaman ini:</strong>
      ✅ Produk baru = SKU di file items yang <strong>belum pernah ada</strong> di data penjualan ·
      ✅ Kategori ABC dari <strong>mode kategori produk serupa</strong> (Kategori + Brand) di hasil V2 ·
      ✅ SO WMA awal dari <strong>rata-rata SO WMA produk serupa</strong> per kota dari hasil V2 ·
      ✅ Min/Max/Add Stock &amp; Suggested PO menggunakan <strong>logika V2 yang sama</strong> ·
      ⚠️ Membutuhkan hasil <strong>Analisa Stock V2</strong> dan <strong>Data Stock</strong> sudah dimuat
    </div>

    <div v-if="!v2Ready" class="alert alert-warning">
      ⚠️ Harap jalankan <strong>Hasil Analisa Stock V2</strong> terlebih dahulu sebelum menggunakan halaman ini.
    </div>
    <div v-else-if="!stockReady" class="alert alert-warning">
      ⚠️ Data Stock belum dimuat. Harap muat di halaman <strong>Input Data</strong>.
    </div>

    <template v-else>
      <hr class="section-divider" />
      <h2>📂 Upload File Items (Daftar Produk)</h2>
      <p class="text-muted" style="font-size:0.875rem;">Upload file items (.xlsx) — daftar semua produk dari sistem.</p>

      <label class="upload-zone" @dragover.prevent="dragover=true" @dragleave="dragover=false"
             @drop.prevent="handleDrop" :class="{dragover}">
        <input type="file" accept=".xlsx" @change="handleFile" />
        <div>📂 Klik atau drag &amp; drop file Items (.xlsx)</div>
      </label>

      <div v-if="loadingFile" class="loading-overlay"><span class="spinner"></span> Membaca file...</div>
      <div v-if="store.itemsDf.length > 0 && !loadingFile" class="alert alert-success mt-2">
        ✅ File berhasil dimuat: <strong>{{ store.itemsDf.length.toLocaleString('id-ID') }} baris</strong>
      </div>

      <details v-if="store.itemsDf.length > 0">
        <summary>👁️ Preview File Items</summary>
        <div>
          <PivotTable :rows="store.itemsDf.slice(0,10)" :columns="itemsPreviewCols" :exportable="false" max-height="250px" />
        </div>
      </details>

      <div class="card" v-if="store.itemsDf.length > 0">
        <button class="btn btn-primary" @click="runAnalysis" :disabled="loading">
          <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
          <span v-else>🚀 Jalankan Analisis Produk Baru</span>
        </button>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Mengidentifikasi dan menganalisis produk baru...
      </div>

      <template v-if="result && !loading">
        <div class="alert alert-info">🆕 Ditemukan <strong>{{ totalNewSku }} produk baru</strong> ({{ result.length }} baris × {{ ALL_CITIES.length }} kota).</div>

        <hr class="section-divider" />
        <h2>Filter Produk Baru</h2>
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
              <label class="form-label">Kategori ABC:</label>
              <select v-model="selAbc" multiple class="form-control" style="height:90px;">
                <option v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</option>
              </select>
            </div>
          </div>
        </div>

        <hr class="section-divider" />
        <div class="tabs">
          <button class="tab-btn" :class="{active:activeTab==='kota'}" @click="activeTab='kota'">📍 Tabel per Kota</button>
          <button class="tab-btn" :class="{active:activeTab==='gabungan'}" @click="activeTab='gabungan'">📊 Tabel Gabungan</button>
          <button class="tab-btn" :class="{active:activeTab==='dashboard'}" @click="activeTab='dashboard'">📈 Dashboard</button>
        </div>

        <div v-show="activeTab==='kota'">
          <h2>Hasil Analisis per Kota</h2>
          <CityExpanderTable
            v-for="city in citiesSorted"
            :key="city"
            :title="`${city} — ${filteredByCity(city).length} produk baru`"
            :rows="filteredByCity(city)"
            :columns="detailCols"
          />
        </div>

        <div v-show="activeTab==='gabungan'">
          <h2>📊 Tabel Gabungan Seluruh Kota</h2>
          <PivotTable :rows="pivotRows" :columns="pivotCols" export-name="analisis_produk_baru_gabungan.xlsx" />
          <hr class="section-divider" />
          <h3>Legenda Skenario Distribusi:</h3>
          <div class="stats-grid">
            <div class="alert alert-danger" style="margin:0;"><strong>1 - KURANG</strong><br/>Stok Sisa SBY = 0. Semua cabang PO = 0.</div>
            <div class="alert alert-warning" style="margin:0;"><strong>2 - TERBATAS</strong><br/>Stok Sisa ada tapi &lt; Total kebutuhan.</div>
            <div class="alert alert-success" style="margin:0;"><strong>3 - OVER</strong><br/>Stok Sisa SBY cukup untuk semua cabang.</div>
          </div>
        </div>

        <div v-show="activeTab==='dashboard'">
          <h2>📈 Dashboard Produk Baru</h2>
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">🆕 {{ totalNewSku }}</div><div class="stat-label">Total SKU Baru</div></div>
            <div class="stat-card"><div class="stat-value">✅ {{ adaRefCount }}</div><div class="stat-label">Ada Referensi V2</div></div>
            <div class="stat-card"><div class="stat-value">⚠️ {{ tanpaRefCount }}</div><div class="stat-label">Default D (No Ref.)</div></div>
            <div class="stat-card"><div class="stat-value">📦 {{ totalAddStock.toLocaleString('id-ID') }}</div><div class="stat-label">Total Add Stock</div></div>
          </div>

          <div class="card"><h3>Distribusi Kategori ABC (Referensi)</h3><SimpleBarChart :data="abcDistribution" /></div>
          <div class="card"><h3>Distribusi Status Stock per City</h3><SimpleBarChart :data="statusDistribution" /></div>

          <div class="card">
            <h3>🔝 Top 10 Produk Baru — Add Stock Terbesar</h3>
            <PivotTable :rows="top10Rows" :columns="top10Cols" :exportable="false" max-height="350px" />
          </div>

          <div class="card"><h3>📂 Jumlah Produk Baru per Kategori</h3><SimpleBarChart :data="kategoriDistribution" /></div>
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
import { readExcelFile } from '@/utils/fileReader'
import {
  calcMinStock, calcMaxStock, calculateAddStockV2, calculateSuggestedPoV2,
  getStatusStock, calcPersentaseStock, meltStockByCity,
  colorKategoriAbc, colorStatusStock, groupBy, sumBy,
  KAT_COL, KEYS, ALL_CITIES, CITY_SHORT,
} from '@/utils/analysis'

const store       = useDataStore()
const loading     = ref(false)
const loadingFile = ref(false)
const result      = ref(null)
const dragover    = ref(false)
const activeTab   = ref('kota')

const v2Ready    = computed(() => store.stockV2Result && store.stockV2Result.length > 0)
const stockReady = computed(() => store.dfStock.length > 0)

const selKat = ref([]), selBrand = ref([]), selAbc = ref([])

const itemsPreviewCols = computed(() => {
  if (!store.itemsDf.length) return []
  return Object.keys(store.itemsDf[0]).slice(0, 8).map(k => ({ key: k, label: k }))
})

async function handleFile(e) { await processFile(e.target.files[0]) }
async function handleDrop(e) { dragover.value = false; await processFile(e.dataTransfer.files[0]) }
async function processFile(file) {
  if (!file) return
  loadingFile.value = true
  try {
    const rows = await readExcelFile(file)
    store.setItemsDf(rows)
  } catch (e) { console.error(e); alert('Gagal membaca file: ' + e.message) }
  finally { loadingFile.value = false }
}

const baseFiltered = computed(() => {
  if (!result.value) return []
  let rows = result.value.filter(r => r.City !== 'OTHERS')
  if (selKat.value.length)   rows = rows.filter(r => selKat.value.includes(r['Kategori Barang']))
  if (selBrand.value.length) rows = rows.filter(r => selBrand.value.includes(r['BRAND Barang']))
  if (selAbc.value.length)   rows = rows.filter(r => selAbc.value.includes(r[KAT_COL]))
  return rows
})

const kategoriOptions = computed(() => result.value ? [...new Set(result.value.map(r=>r['Kategori Barang']))].sort() : [])
const brandOptions    = computed(() => result.value ? [...new Set(result.value.map(r=>r['BRAND Barang']))].sort() : [])
const citiesSorted    = computed(() => [...new Set(baseFiltered.value.map(r => r.City))].sort())
const totalNewSku     = computed(() => result.value ? new Set(result.value.map(r=>r['No. Barang'])).size : 0)

function filteredByCity(city) { return baseFiltered.value.filter(r => r.City === city) }

const detailCols = [
  { key: 'No. Barang', label: 'No. Barang' },
  { key: 'Kategori Barang', label: 'Kategori Barang' },
  { key: 'BRAND Barang', label: 'BRAND Barang' },
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: KAT_COL, label: 'Kategori ABC', colorFn: v => colorKategoriAbc(v) },
  { key: 'ABC_Referensi', label: 'ABC_Referensi' },
  { key: 'SO_Referensi', label: 'SO_Referensi' },
  { key: 'SO WMA', label: 'SO WMA', type: 'number' },
  { key: 'Stock Cabang', label: 'Stock Cabang', type: 'number' },
  { key: 'Min Stock', label: 'Min Stock', type: 'number' },
  { key: 'Max Stock', label: 'Max Stock', type: 'number' },
  { key: 'Persentase Stock', label: 'Persentase Stock', decimals: 1 },
  { key: 'Status Stock', label: 'Status Stock', colorFn: v => colorStatusStock(v) },
  { key: 'Add Stock', label: 'Add Stock', type: 'number' },
  { key: 'Suggested PO', label: 'Suggested PO', type: 'number' },
  { key: 'Sisa Stock Surabaya', label: 'Sisa Stock Surabaya', type: 'number' },
]

const pivotRows = computed(() => {
  if (!baseFiltered.value.length) return []
  const byItem = groupBy(baseFiltered.value, 'No. Barang')
  const rows = []
  for (const [sku, group] of Object.entries(byItem)) {
    const first = group[0]
    const row = {}; KEYS.forEach(k => row[k] = first[k])

    for (const city of ALL_CITIES) {
      const r = group.find(g => g.City === city)
      const short = CITY_SHORT[city] || city
      if (!r) continue
      row[`${short}_SO WMA`] = r['SO WMA'] ?? 0
      row[`${short}_Stock Cabang`] = r['Stock Cabang'] ?? 0
      row[`${short}_Min Stock`] = r['Min Stock'] ?? 0
      row[`${short}_Max Stock`] = r['Max Stock'] ?? 0
      row[`${short}_Add Stock`] = r['Add Stock'] ?? 0
      row[`${short}_Suggested PO`] = r['Suggested PO'] ?? 0
      row[`${short}_Persentase Stock`] = r['Persentase Stock'] ?? 0
      row[`${short}_Status Stock`] = r['Status Stock'] ?? ''
      row[`${short}_ABC`] = r[KAT_COL] ?? ''
    }

    const sby = group.find(g => g.City === 'SURABAYA')
    const cab = group.filter(g => g.City !== 'SURABAYA')
    const stockSby = sby ? Number(sby['Stock Cabang'])||0 : 0
    const minSby   = sby ? Number(sby['Min Stock'])||0 : 0
    const stokSisa = Math.max(0, stockSby - minSby)
    const addCab   = sumBy(cab, 'Add Stock')
    const addSby   = sby ? Number(sby['Add Stock'])||0 : 0

    row['All_Add_Stock_Cabang']   = addCab
    row['All_Need_From_Supplier'] = Math.max(0, addCab + addSby)
    row['All_Restock_1_Bulan']    = (addCab + addSby) > 0 ? 'PO' : 'NO'
    row['Skenario_Distribusi']    = stokSisa <= 0 ? '1 - KURANG' : stokSisa >= addCab ? '3 - OVER' : '2 - TERBATAS'
    row['All_Stock_Cabang']       = sumBy(group, 'Stock Cabang')
    row['All_SO_WMA']             = sumBy(group, 'SO WMA')

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

// ── Dashboard ─────────────────────────────────────────────────────────────────
const adaRefCount   = computed(() => result.value ? new Set(result.value.filter(r=>r.ABC_Referensi==='Ada').map(r=>r['No. Barang'])).size : 0)
const tanpaRefCount = computed(() => totalNewSku.value - adaRefCount.value)
const totalAddStock = computed(() => baseFiltered.value.reduce((s,r)=>s+(Number(r['Add Stock'])||0),0))

const abcDistribution = computed(() => {
  if (!result.value) return []
  const dedup = {}
  for (const r of result.value) { if (!dedup[r['No. Barang']]) dedup[r['No. Barang']] = r[KAT_COL] }
  const counts = {}
  Object.values(dedup).forEach(k => counts[k] = (counts[k]||0)+1)
  return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a,b)=>a.label.localeCompare(b.label))
})
const statusDistribution = computed(() => {
  const counts = {}
  baseFiltered.value.forEach(r => counts[r['Status Stock']] = (counts[r['Status Stock']]||0)+1)
  return Object.entries(counts).map(([label, value]) => ({ label, value }))
})
const kategoriDistribution = computed(() => {
  if (!result.value) return []
  const dedup = {}
  for (const r of result.value) { if (!dedup[r['No. Barang']]) dedup[r['No. Barang']] = r['Kategori Barang'] }
  const counts = {}
  Object.values(dedup).forEach(k => counts[k] = (counts[k]||0)+1)
  return Object.entries(counts).map(([label, value]) => ({ label, value }))
    .sort((a,b)=>b.value-a.value).slice(0,15)
})

const top10Cols = [
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: 'Kategori Barang', label: 'Kategori Barang' },
  { key: 'BRAND Barang', label: 'BRAND Barang' },
  { key: 'All_Add_Stock_Cabang', label: 'All Add Stock Cabang', type: 'number' },
  { key: 'All_Need_From_Supplier', label: 'All Need From Supplier', type: 'number' },
  { key: 'All_Restock_1_Bulan', label: 'Restock?' },
  { key: 'Skenario_Distribusi', label: 'Skenario' },
]
const top10Rows = computed(() =>
  [...pivotRows.value].sort((a,b) => (b.All_Add_Stock_Cabang||0)-(a.All_Add_Stock_Cabang||0)).slice(0,10))

// ── Run Analysis ──────────────────────────────────────────────────────────────
async function runAnalysis() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 50))

  try {
    const v2    = store.stockV2Result
    const items = store.itemsDf
    const stock = store.dfStock

    const existingSku = new Set(store.dfPenjualan.map(r => String(r['No. Barang']||'').trim().toUpperCase()))

    // Deteksi kolom SKU
    const itemKeys = Object.keys(items[0] || {})
    const skuCol = ['SKU','No. Barang','No Barang','Kode Barang','Item Code'].find(c => itemKeys.includes(c)) || itemKeys[0]
    const namaCol = ['Nama Accurate','Nama Barang','Keterangan Barang','Nama','Description'].find(c => itemKeys.includes(c))
    const katCol  = ['Kategori','Kategori Barang','Category'].find(c => itemKeys.includes(c))
    const brandCol= ['Brand','BRAND','BRAND Barang','Merk'].find(c => itemKeys.includes(c))

    if (!skuCol) {
      alert('❌ Kolom SKU/No. Barang tidak ditemukan di file items.')
      loading.value = false
      return
    }

    let dfNew = items.map(r => ({ ...r, _sku_norm: String(r[skuCol]||'').trim().toUpperCase() }))
      .filter(r => r._sku_norm && !existingSku.has(r._sku_norm))

    if (namaCol) {
      dfNew = dfNew.filter(r => String(r[namaCol]||'').trim() !== '')
      dfNew = dfNew.filter(r => !String(r[namaCol]||'').toUpperCase().includes('OPENING BALANCE'))
    }
    if (katCol)   dfNew = dfNew.filter(r => !['NO KATEGORI',''].includes(String(r[katCol]||'').toUpperCase()))
    if (brandCol) dfNew = dfNew.filter(r => !['NO BRAND',''].includes(String(r[brandCol]||'').toUpperCase()))

    const seen = new Set()
    dfNew = dfNew.filter(r => seen.has(r._sku_norm) ? false : (seen.add(r._sku_norm), true))

    if (!dfNew.length) {
      alert('✅ Tidak ada produk baru yang perlu dianalisis.')
      result.value = []
      loading.value = false
      return
    }

    // Referensi dari V2: ABC mode & SO rata-rata per (Kategori, Brand, City)
    const abcRefMap = {}, abcRefNoCityMap = {}, soRefMap = {}
    const v2GroupKC = groupBy(v2, r => `${String(r['Kategori Barang']||'').trim().toUpperCase()}||${String(r['BRAND Barang']||'').trim().toUpperCase()}`)
    const v2GroupKCC = groupBy(v2, r => `${String(r['Kategori Barang']||'').trim().toUpperCase()}||${String(r['BRAND Barang']||'').trim().toUpperCase()}||${r.City}`)

    for (const [key, rows] of Object.entries(v2GroupKCC)) {
      const counts = {}
      rows.forEach(r => counts[r[KAT_COL]] = (counts[r[KAT_COL]]||0)+1)
      const mode = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'D'
      abcRefMap[key] = mode
      const soVals = rows.filter(r => (Number(r['SO WMA'])||0) > 0).map(r => Number(r['SO WMA']))
      soRefMap[key] = soVals.length ? soVals.reduce((s,v)=>s+v,0)/soVals.length : 0
    }
    for (const [key, rows] of Object.entries(v2GroupKC)) {
      const counts = {}
      rows.forEach(r => counts[r[KAT_COL]] = (counts[r[KAT_COL]]||0)+1)
      abcRefNoCityMap[key] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'D'
    }

    const records = []
    for (const item of dfNew) {
      const sku      = item._sku_norm
      const nama     = namaCol ? String(item[namaCol]).trim() : sku
      const kategori = katCol  ? String(item[katCol]).trim().toUpperCase()   : 'UNKNOWN'
      const brand    = brandCol? String(item[brandCol]).trim().toUpperCase(): 'UNKNOWN'

      for (const city of ALL_CITIES) {
        const keyCity = `${kategori}||${brand}||${city}`
        const keyNoCity = `${kategori}||${brand}`
        let abcVal, adaRef = false
        if (abcRefMap[keyCity] !== undefined) { abcVal = abcRefMap[keyCity]; adaRef = true }
        else if (abcRefNoCityMap[keyNoCity] !== undefined) { abcVal = abcRefNoCityMap[keyNoCity]; adaRef = true }
        else abcVal = 'D'

        const soVal = Math.ceil(soRefMap[keyCity] || 0)

        records.push({
          'No. Barang': sku, 'Kategori Barang': kategori, 'BRAND Barang': brand, 'Nama Barang': nama,
          City: city, [KAT_COL]: abcVal, 'SO WMA': soVal,
          SO_Referensi:  soVal > 0 ? 'Ada' : 'Tidak Ada (Default D)',
          ABC_Referensi: adaRef ? 'Ada' : 'Tidak Ada (Default D)',
        })
      }
    }

    const stockMelted = meltStockByCity(stock)
    const stockMap = {}
    for (const s of stockMelted) {
      const key = `${String(s['No. Barang']).trim().toUpperCase()}||${s.City}`
      stockMap[key] = (stockMap[key] || 0) + (Number(s.Stock) || 0)
    }

    for (const r of records) {
      r['Stock Cabang'] = stockMap[`${r['No. Barang']}||${r.City}`] ?? 0
    }
    const sbyStockMap = {}
    for (const r of records.filter(r=>r.City==='SURABAYA')) sbyStockMap[r['No. Barang']] = r['Stock Cabang']

    for (const r of records) {
      r['Min Stock'] = calcMinStock(r, KAT_COL, 'SO WMA')
      r['Max Stock'] = calcMaxStock(r, KAT_COL, 'SO WMA')
      r['Add Stock'] = calculateAddStockV2(r, KAT_COL, 'SO WMA', 'Stock Cabang')
      r['Persentase Stock'] = calcPersentaseStock(r)
      r['Status Stock'] = getStatusStock(r)
    }

    records.forEach((r,i) => { r.__idx = i })
    const poMap = calculateSuggestedPoV2(records)
    for (const r of records) { r['Suggested PO'] = poMap[r.__idx] ?? 0 }

    const sbySisaMap = {}
    for (const sku of new Set(records.map(r=>r['No. Barang']))) {
      const sby = records.find(r => r.City === 'SURABAYA' && r['No. Barang'] === sku)
      if (sby) sbySisaMap[sku] = Math.max(0, (sby['Stock Cabang']||0) - (sby['Min Stock']||0))
    }
    for (const r of records) r['Sisa Stock Surabaya'] = sbySisaMap[r['No. Barang']] ?? 0

    store.setNewProductResult(records)
    result.value = records
  } catch (e) {
    console.error(e)
    alert('Terjadi error: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
