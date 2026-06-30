<template>
  <div>
    <h1>📊 Analisis ABC V3 — Log-Benchmark + Platform (Online / Offline)</h1>

    <div class="tabs">
      <button class="tab-btn" :class="{active:mainTab==='tabel'}" @click="mainTab='tabel'">Hasil Tabel</button>
      <button class="tab-btn" :class="{active:mainTab==='dashboard'}" @click="mainTab='dashboard'">Dashboard</button>
    </div>

    <!-- Tab Tabel -->
    <div v-show="mainTab==='tabel'">
      <div v-if="!dataReady" class="alert alert-warning">
        ⚠️ Harap muat file <strong>Penjualan</strong> dan <strong>Produk Referensi</strong> di halaman Input Data terlebih dahulu.
      </div>

      <template v-else>
        <h2>Filter Rentang Waktu Analisis ABC V3</h2>
        <div class="alert alert-info">Analisis akan didasarkan pada data penjualan 90 hari <em>sebelum</em> Tanggal Akhir yang dipilih.</div>

        <div class="card">
          <div class="flex gap-3 flex-wrap" style="align-items:flex-end;">
            <div class="form-group" style="margin:0;">
              <label class="form-label">Tanggal Akhir</label>
              <input type="date" v-model="tanggalAnalisis" :min="minDateStr" :max="maxDateStr" class="form-control" style="width:180px;" />
            </div>
            <button class="btn btn-primary" @click="runAnalysis" :disabled="loading">
              <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
              <span v-else>▶ Jalankan Analisa ABC V3 (Log-Benchmark + Platform)</span>
            </button>
          </div>
        </div>

        <div v-if="loading" class="loading-overlay"><span class="spinner"></span> Melakukan perhitungan analisis ABC V3...</div>

        <template v-if="result && !loading">
          <div class="alert alert-success">✅ Analisis ABC V3 (Log-Benchmark + Platform Online/Offline) berhasil dijalankan!</div>
          <div class="alert alert-info">
            📦 Total transaksi 90 hari: <strong>{{ totalRows.toLocaleString('id-ID') }}</strong> —
            Online: <strong>{{ onlineRows.toLocaleString('id-ID') }}</strong> |
            Offline: <strong>{{ offlineRows.toLocaleString('id-ID') }}</strong>
          </div>

          <h2>Filter Hasil Analisis</h2>
          <div class="card">
            <div class="flex gap-3 flex-wrap">
              <div class="form-group" style="flex:1; min-width:200px; margin:0;">
                <label class="form-label">Filter Kategori:</label>
                <select v-model="selKat" multiple class="form-control" style="height:90px;">
                  <option v-for="k in kategoriOptions" :key="k" :value="k">{{ k }}</option>
                </select>
              </div>
              <div class="form-group" style="flex:1; min-width:200px; margin:0;">
                <label class="form-label">Filter Brand:</label>
                <select v-model="selBrand" multiple class="form-control" style="height:90px;">
                  <option v-for="b in brandOptions" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>
          </div>

          <hr class="section-divider" />
          <h2>Hasil Analisis ABC V3 per Kota</h2>
          <CityExpanderTable
            v-for="city in citiesSorted"
            :key="city"
            :title="`Lihat Hasil ABC untuk Kota: ${city}`"
            :rows="filteredByCity(city)"
            :columns="detailCols"
          />

          <hr class="section-divider" />
          <h2>📊 Tabel Gabungan Seluruh Kota (ABC V3)</h2>
          <PivotTable :rows="pivotRows" :columns="pivotCols" export-name="hasil_analisis_abc_v3_gabungan.xlsx" />
        </template>
      </template>
    </div>

    <!-- Tab Dashboard -->
    <div v-show="mainTab==='dashboard'">
      <template v-if="!result">
        <div class="alert alert-info">Tidak ada data untuk ditampilkan. Jalankan analisis terlebih dahulu.</div>
      </template>
      <template v-else>
        <div class="form-group" style="max-width:320px;">
          <label class="form-label">Pilih Metode ABC untuk Dashboard:</label>
          <select v-model="metode" class="form-control">
            <option value="WMA">Log-Benchmark - WMA</option>
            <option value="Mean">Log-Benchmark - Mean</option>
          </select>
        </div>

        <hr class="section-divider" />
        <div class="stats-grid">
          <div class="stat-card" v-for="l in ['A','B','C','D','E','F']" :key="l">
            <div class="stat-value">{{ classSummary[l]?.count ?? 0 }}</div>
            <div class="stat-label">Produk Kelas {{ l }}<br/>
              <span style="font-size:0.7rem;">{{ l==='F' ? 'Tidak Terjual' : `${(classSummary[l]?.avg ?? 0).toFixed(1)} Rata-rata` }}</span>
            </div>
          </div>
        </div>

        <hr class="section-divider" />
        <div class="card"><h3>Komposisi Produk per Kelas (SKU Count)</h3><SimpleBarChart :data="composisiData" /></div>
        <div class="card"><h3>Kontribusi {{ metricLabel }} per Kelas</h3><SimpleBarChart :data="kontribusiData" /></div>

        <hr class="section-divider" />
        <div class="card"><h3>Top 10 Produk Terlaris (berdasarkan {{ metricLabel }})</h3><SimpleBarChart :data="top10Produk" /></div>
        <div class="card"><h3>Performa Penjualan per Kota (berdasarkan {{ metricLabel }})</h3><SimpleBarChart :data="performaKota" /></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import CityExpanderTable from '@/components/CityExpanderTable.vue'
import PivotTable from '@/components/PivotTable.vue'
import SimpleBarChart from '@/components/SimpleBarChart.vue'
import {
  classifyAbcLogBenchmark, mapNamaDept, mapCity, mapPlatform,
  colorKategoriAbc, groupBy, sumBy, sumQtyInRange,
  KEYS, ALL_CITIES, CITY_SHORT, maxDate, minDate, addDays, toISODate,
} from '@/utils/analysis'

const store    = useDataStore()
const loading  = ref(false)
const result   = ref(null)
const mainTab  = ref('tabel')
const metode   = ref('WMA')

const dataReady = computed(() => store.dfPenjualan.length > 0 && store.produkRef.length > 0)

const minDateObj = computed(() => minDate(store.dfPenjualan, 'Tgl Faktur'))
const maxDateObj = computed(() => maxDate(store.dfPenjualan, 'Tgl Faktur'))
const minDateStr = computed(() => minDateObj.value ? toISODate(minDateObj.value) : '')
const maxDateStr = computed(() => maxDateObj.value ? toISODate(maxDateObj.value) : '')
const tanggalAnalisis = ref('')
if (!tanggalAnalisis.value) {
  const mx = maxDate(store.dfPenjualan, 'Tgl Faktur')
  tanggalAnalisis.value = mx ? toISODate(mx) : toISODate(new Date())
}

const selKat = ref([]), selBrand = ref([])
const kategoriOptions = computed(() => store.produkRef.length ? [...new Set(store.produkRef.map(p=>p['Kategori Barang']))].sort() : [])
const brandOptions    = computed(() => store.produkRef.length ? [...new Set(store.produkRef.map(p=>p['BRAND Barang']))].sort() : [])

const baseFiltered = computed(() => {
  if (!result.value) return []
  let rows = result.value.filter(r => r.City !== 'OTHERS')
  if (selKat.value.length)   rows = rows.filter(r => selKat.value.includes(r['Kategori Barang']))
  if (selBrand.value.length) rows = rows.filter(r => selBrand.value.includes(r['BRAND Barang']))
  return rows
})
const citiesSorted = computed(() => [...new Set(baseFiltered.value.map(r => r.City))].sort())
function filteredByCity(city) { return baseFiltered.value.filter(r => r.City === city) }

const detailCols = [
  { key: 'No. Barang', label: 'No. Barang' },
  { key: 'BRAND Barang', label: 'BRAND Barang' },
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: 'Kategori Barang', label: 'Kategori Barang' },
  { key: 'AVG Mean', label: 'AVG Mean', type: 'number' },
  { key: 'AVG WMA', label: 'AVG WMA', type: 'number' },
  { key: 'Kategori ABC (Log-Benchmark - Mean)', label: 'ABC (Mean)', colorFn: v => colorKategoriAbc(v) },
  { key: 'Kategori ABC (Log-Benchmark - WMA)', label: 'ABC (WMA)', colorFn: v => colorKategoriAbc(v) },
  { key: 'Kategori ABC (Log-Benchmark - WMA)_Online', label: 'ABC Online', colorFn: v => colorKategoriAbc(v) },
  { key: 'Kategori ABC (Log-Benchmark - WMA)_Offline', label: 'ABC Offline', colorFn: v => colorKategoriAbc(v) },
]

const pivotRows = computed(() => {
  if (!baseFiltered.value.length) return []
  const byItem = groupBy(baseFiltered.value, 'No. Barang')
  const rows = []
  for (const [sku, group] of Object.entries(byItem)) {
    const first = group[0]
    const row = {}; KEYS.forEach(k => row[k] = first[k])
    for (const city of citiesSorted.value) {
      const r = group.find(g => g.City === city)
      const short = CITY_SHORT[city] || city
      if (!r) continue
      row[`${short}_AVG Mean`] = r['AVG Mean'] ?? 0
      row[`${short}_AVG WMA`]  = r['AVG WMA'] ?? 0
      row[`${short}_ABC Mean`] = r['Kategori ABC (Log-Benchmark - Mean)'] ?? ''
      row[`${short}_ABC WMA`]  = r['Kategori ABC (Log-Benchmark - WMA)'] ?? ''
      row[`${short}_ABC Online`]  = r['Kategori ABC (Log-Benchmark - WMA)_Online'] ?? ''
      row[`${short}_ABC Offline`] = r['Kategori ABC (Log-Benchmark - WMA)_Offline'] ?? ''
    }
    rows.push(row)
  }
  return rows
})
const pivotCols = computed(() => {
  if (!pivotRows.value.length) return []
  return Object.keys(pivotRows.value[0]).map(k => {
    const col = { key: k, label: k, type: typeof pivotRows.value[0][k] === 'number' ? 'number' : undefined }
    if (k.includes('_ABC')) col.colorFn = v => colorKategoriAbc(v)
    return col
  })
})

const totalRows = computed(() => result.value ? result.value.reduce((s,r)=>s+(r['_txCount']||0),0) : 0)
const onlineRows = computed(() => result.value ? result.value.reduce((s,r)=>s+(r['_onlineCount']||0),0) : 0)
const offlineRows = computed(() => totalRows.value - onlineRows.value)

// ── Dashboard ─────────────────────────────────────────────────────────────────
const katCol = computed(() => metode.value === 'WMA' ? 'Kategori ABC (Log-Benchmark - WMA)' : 'Kategori ABC (Log-Benchmark - Mean)')
const metricCol = computed(() => metode.value === 'WMA' ? 'AVG WMA' : 'AVG Mean')
const metricLabel = computed(() => metricCol.value)

const classSummary = computed(() => {
  if (!result.value) return {}
  const sum = {}
  for (const l of ['A','B','C','D','E','F']) sum[l] = { count: 0, sum: 0 }
  for (const r of result.value) {
    const k = r[katCol.value]
    if (!sum[k]) continue
    sum[k].count++
    sum[k].sum += Number(r[metricCol.value]) || 0
  }
  for (const l of Object.keys(sum)) sum[l].avg = sum[l].count > 0 ? sum[l].sum / sum[l].count : 0
  return sum
})

const composisiData = computed(() => {
  return Object.entries(classSummary.value)
    .filter(([,v]) => v.count > 0)
    .map(([label, v]) => ({ label, value: v.count }))
})
const kontribusiData = computed(() => {
  return Object.entries(classSummary.value)
    .filter(([,v]) => v.sum > 0)
    .map(([label, v]) => ({ label, value: Math.round(v.sum) }))
})

const top10Produk = computed(() => {
  if (!result.value) return []
  const byProd = {}
  for (const r of result.value) {
    byProd[r['Nama Barang']] = (byProd[r['Nama Barang']]||0) + (Number(r[metricCol.value])||0)
  }
  return Object.entries(byProd).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([label, value]) => ({ label: label.length > 28 ? label.slice(0,28)+'…' : label, value: Math.round(value) }))
})
const performaKota = computed(() => {
  if (!result.value) return []
  const byCity = {}
  for (const r of result.value) {
    byCity[r.City] = (byCity[r.City]||0) + (Number(r[metricCol.value])||0)
  }
  return Object.entries(byCity).sort((a,b)=>b[1]-a[1]).map(([label, value]) => ({ label, value: Math.round(value) }))
})

// ── Run Analysis ──────────────────────────────────────────────────────────────
async function runAnalysis() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 50))

  try {
    const endDate   = new Date(tanggalAnalisis.value)
    const startDate = addDays(endDate, -89)
    const soDfAll   = store.dfPenjualan
    const produkRef = store.produkRef

    for (const r of soDfAll) { if (!r.City) { r['Nama Dept']=mapNamaDept(r); r.City = mapCity(r['Nama Dept']).toUpperCase() } }
    for (const r of soDfAll) { r['Platform'] = mapPlatform(r) }

    const df90 = soDfAll.filter(r => {
      const d = new Date(r['Tgl Faktur'])
      return d >= startDate && d <= endDate
    })
    if (!df90.length) {
      alert('Tidak ada data penjualan pada rentang 90 hari yang dipilih.')
      loading.value = false
      return
    }

    const r1e=endDate, r1s=addDays(endDate,-29)
    const r2e=addDays(endDate,-30), r2s=addDays(endDate,-59)
    const r3e=addDays(endDate,-60), r3s=addDays(endDate,-89)

    const produkMap = {}
    for (const p of produkRef) produkMap[String(p['No. Barang']).trim()] = p
    const skus   = [...new Set(produkRef.map(p => String(p['No. Barang']).trim()))]
    const cities = [...new Set(soDfAll.map(r => r.City))]

    function buildGrouped(srcDf) { return groupBy(srcDf, r => `${r.City}||${String(r['No. Barang']).trim()}`) }
    const groupedAll = buildGrouped(df90)
    const groupedOnline  = buildGrouped(df90.filter(r => r.Platform === 'Online'))
    const groupedOffline = buildGrouped(df90.filter(r => r.Platform === 'Offline'))

    const rows = []
    for (const city of cities) {
      for (const sku of skus) {
        const produk = produkMap[sku] || {}
        const key = `${city}||${sku}`
        const group = groupedAll[key] || []
        const groupOn  = groupedOnline[key] || []
        const groupOff = groupedOffline[key] || []

        const b1 = sumQtyInRange(group, r1s, r1e)
        const b2 = sumQtyInRange(group, r2s, r2e)
        const b3 = sumQtyInRange(group, r3s, r3e)
        const avgMean = (b1+b2+b3)/3
        const avgWma  = Math.ceil(b1*0.5 + b2*0.3 + b3*0.2)

        rows.push({
          City: city, 'No. Barang': sku,
          'Kategori Barang': produk['Kategori Barang'] || '',
          'BRAND Barang': produk['BRAND Barang'] || '',
          'Nama Barang': produk['Nama Barang'] || '',
          'Penjualan Bln 1': b1, 'Penjualan Bln 2': b2, 'Penjualan Bln 3': b3,
          'AVG Mean': Math.round(avgMean), 'AVG WMA': avgWma,
          _txCount: group.length, _onlineCount: groupOn.length,
          __onB1: sumQtyInRange(groupOn, r1s, r1e), __onB2: sumQtyInRange(groupOn, r2s, r2e), __onB3: sumQtyInRange(groupOn, r3s, r3e),
          __offB1: sumQtyInRange(groupOff, r1s, r1e), __offB2: sumQtyInRange(groupOff, r2s, r2e), __offB3: sumQtyInRange(groupOff, r3s, r3e),
        })
      }
    }

    classifyAbcLogBenchmark(rows, 'AVG Mean')
    classifyAbcLogBenchmark(rows, 'AVG WMA')

    // Platform: Online & Offline ABC pakai WMA dari sub-jumlah online/offline
    for (const r of rows) {
      r.__onlineWma  = Math.ceil((r.__onB1||0)*0.5 + (r.__onB2||0)*0.3 + (r.__onB3||0)*0.2)
      r.__offlineWma = Math.ceil((r.__offB1||0)*0.5 + (r.__offB2||0)*0.3 + (r.__offB3||0)*0.2)
    }
    const rowsOnline  = rows.map(r => ({ ...r, 'AVG WMA Online': r.__onlineWma }))
    classifyAbcLogBenchmark(rowsOnline, 'AVG WMA Online')
    const rowsOffline = rows.map(r => ({ ...r, 'AVG WMA Offline': r.__offlineWma }))
    classifyAbcLogBenchmark(rowsOffline, 'AVG WMA Offline')

    for (let i=0;i<rows.length;i++) {
      rows[i]['Kategori ABC (Log-Benchmark - WMA)_Online']  = rowsOnline[i]['Kategori ABC (Log-Benchmark - WMA Online)']
      rows[i]['Kategori ABC (Log-Benchmark - WMA)_Offline'] = rowsOffline[i]['Kategori ABC (Log-Benchmark - WMA Offline)']
    }

    store.setAbcV3Result(rows)
    result.value = rows
  } catch (e) {
    console.error(e)
    alert('Terjadi error: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
