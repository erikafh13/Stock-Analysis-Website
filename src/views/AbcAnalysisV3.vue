<template>
  <div>
    <h1>🏷️ Analisis ABC V3 — Log-Benchmark + Platform (Online / Offline)</h1>

    <div v-if="!dataReady" class="alert alert-warning">
      ⚠️ Harap muat file <strong>Penjualan</strong> dan <strong>Produk Referensi</strong> di halaman Input Data terlebih dahulu.
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
            <span v-else>▶ Jalankan Analisis ABC V3</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Menghitung ABC V3...
      </div>

      <template v-if="result && !loading">
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn" :class="{ active: activeTab==='tabel' }" @click="activeTab='tabel'">
            Hasil Tabel
          </button>
          <button class="tab-btn" :class="{ active: activeTab==='dashboard' }" @click="activeTab='dashboard'">
            Dashboard
          </button>
        </div>

        <!-- Filter -->
        <div class="card" v-show="activeTab==='tabel'">
          <div class="flex gap-3 flex-wrap" style="align-items:center;">
            <div class="form-group" style="margin:0;">
              <label class="form-label">City</label>
              <select v-model="filterCity" class="form-control">
                <option value="">Semua</option>
                <option v-for="c in cities" :key="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Kategori ABC (WMA)</label>
              <select v-model="filterAbc" class="form-control">
                <option value="">Semua</option>
                <option v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Platform</label>
              <select v-model="filterPlatform" class="form-control">
                <option value="">Semua</option>
                <option>Online</option>
                <option>Offline</option>
              </select>
            </div>
          </div>

          <h2 class="mt-3">Tabel Hasil ABC V3</h2>
          <DataTable
            :rows="filteredResult"
            :columns="tableCols"
            export-name="analisis_abc_v3.xlsx"
            max-height="600px"
          />
        </div>

        <!-- Dashboard -->
        <div v-show="activeTab==='dashboard'">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ totalSku.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Total SKU</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:#004085;">{{ countA.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Kategori A</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:#155724;">{{ countB.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Kategori B</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:#856404;">{{ countC.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Kategori C</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:#721c24;">{{ countD.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Kategori D</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:#495057;">{{ countE.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Kategori E</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:#6c757d;">{{ countF.toLocaleString('id-ID') }}</div>
              <div class="stat-label">Kategori F</div>
            </div>
          </div>

          <!-- ABC distribution per city -->
          <div class="card">
            <h2>Distribusi ABC per Kota</h2>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Kota</th>
                    <th v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in cityAbcTable" :key="row.city">
                    <td><strong>{{ row.city }}</strong></td>
                    <td v-for="k in ['A','B','C','D','E','F']" :key="k"
                        :style="{ background: abcColors[k], textAlign:'right' }">
                      {{ (row[k]||0).toLocaleString('id-ID') }}
                    </td>
                    <td style="text-align:right; font-weight:600;">{{ row.total.toLocaleString('id-ID') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Online vs Offline -->
          <div class="card">
            <h2>Online vs Offline</h2>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in platformTable" :key="row.platform">
                    <td><strong>{{ row.platform }}</strong></td>
                    <td v-for="k in ['A','B','C','D','E','F']" :key="k"
                        :style="{ background: abcColors[k], textAlign:'right' }">
                      {{ (row[k]||0).toLocaleString('id-ID') }}
                    </td>
                    <td style="text-align:right; font-weight:600;">{{ row.total.toLocaleString('id-ID') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
  classifyAbcLogBenchmark, calculateDailyWma,
  mapNamaDept, mapCity, mapPlatform,
  colorKategoriAbc, groupBy, maxDate,
} from '@/utils/analysis'

const store    = useDataStore()
const loading  = ref(false)
const result   = ref(null)
const activeTab = ref('tabel')
const filterCity     = ref('')
const filterAbc      = ref('')
const filterPlatform = ref('')

const dataReady = computed(() =>
  store.dfPenjualan.length > 0 && store.produkRef.length > 0)

const defaultDate = computed(() => {
  const mx = maxDate(store.dfPenjualan, 'Tgl Faktur')
  return mx ? mx.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
})
const tanggalAnalisis = ref(defaultDate.value)

const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'
const KAT_ON  = 'Kategori ABC (Log-Benchmark - WMA Online)'
const KAT_OFF = 'Kategori ABC (Log-Benchmark - WMA Offline)'

const abcColors = { A:'#cce5ff',B:'#d4edda',C:'#fff3cd',D:'#f8d7da',E:'#e9ecef',F:'#e9ecef' }

const cities = computed(() =>
  result.value ? [...new Set(result.value.map(r=>r.City))].sort() : [])

const filteredResult = computed(() => {
  if (!result.value) return []
  return result.value.filter(r =>
    (!filterCity.value    || r.City === filterCity.value) &&
    (!filterAbc.value     || r[KAT_COL] === filterAbc.value) &&
    (!filterPlatform.value)  // platform filter applies to sub-columns only
  )
})

const totalSku = computed(() => filteredResult.value.length)
const countAbc = (k) => computed(() => filteredResult.value.filter(r=>r[KAT_COL]===k).length)
const countA = countAbc('A'), countB = countAbc('B'), countC = countAbc('C')
const countD = countAbc('D'), countE = countAbc('E'), countF = countAbc('F')

const cityAbcTable = computed(() => {
  if (!result.value) return []
  const grouped = groupBy(result.value, 'City')
  return Object.entries(grouped).map(([city, rows]) => {
    const row = { city, total: rows.length }
    for (const k of ['A','B','C','D','E','F'])
      row[k] = rows.filter(r => r[KAT_COL] === k).length
    return row
  }).sort((a,b) => b.total - a.total)
})

const platformTable = computed(() => {
  if (!result.value) return []
  const platforms = ['Online','Offline']
  return platforms.map(platform => {
    const col = platform === 'Online' ? KAT_ON : KAT_OFF
    const rows = result.value
    const row  = { platform, total: rows.length }
    for (const k of ['A','B','C','D','E','F'])
      row[k] = rows.filter(r => r[col] === k).length
    return row
  })
})

const tableCols = [
  { key: 'No. Barang',      label: 'No. Barang' },
  { key: 'Nama Barang',     label: 'Nama Barang' },
  { key: 'BRAND Barang',    label: 'Brand' },
  { key: 'Kategori Barang', label: 'Kategori' },
  { key: 'City',            label: 'Kota' },
  { key: KAT_COL,  label: 'ABC WMA',     colorFn: v => colorKategoriAbc(v) },
  { key: KAT_ON,   label: 'ABC Online',  colorFn: v => colorKategoriAbc(v) },
  { key: KAT_OFF,  label: 'ABC Offline', colorFn: v => colorKategoriAbc(v) },
  { key: 'SO WMA', label: 'SO WMA',      type: 'number' },
  { key: 'SO WMA Online',  label: 'SO Online',  type: 'number' },
  { key: 'SO WMA Offline', label: 'SO Offline', type: 'number' },
]

const CITIES = ['SURABAYA','JAKARTA','SEMARANG','JOGJA','MALANG','BALI']

async function runAnalysis() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 50))
  try {
    const endDate   = new Date(tanggalAnalisis.value)
    const penjualan = store.dfPenjualan
    const produkRef = store.produkRef

    // Map platform
    for (const r of penjualan) {
      r['Platform'] = mapPlatform(r)
    }

    const produkMap = {}
    for (const p of produkRef) produkMap[String(p['No. Barang']).trim()] = p

    const grouped   = groupBy(penjualan, 'No. Barang')
    const allSkus   = Object.keys(grouped)

    const rows = []
    for (const sku of allSkus) {
      const skuGroup = grouped[sku] || []
      const produk   = produkMap[sku] || {}

      for (const city of CITIES) {
        const cityGroup    = skuGroup.filter(r => String(r.City).toUpperCase() === city)
        const onlineGroup  = cityGroup.filter(r => r['Platform'] === 'Online')
        const offlineGroup = cityGroup.filter(r => r['Platform'] === 'Offline')

        const wma     = calculateDailyWma(cityGroup, endDate)
        const wmaOn   = calculateDailyWma(onlineGroup, endDate)
        const wmaOff  = calculateDailyWma(offlineGroup, endDate)

        rows.push({
          'No. Barang':      sku,
          'Nama Barang':     produk['Nama Barang'] || '',
          'BRAND Barang':    produk['BRAND Barang'] || '',
          'Kategori Barang': produk['Kategori Barang'] || '',
          City:              city,
          'SO WMA':          wma,
          'SO WMA Online':   wmaOn,
          'SO WMA Offline':  wmaOff,
        })
      }
    }

    // ABC for all 3 metrics
    classifyAbcLogBenchmark(rows, 'SO WMA')

    // Online & Offline ABC — clone rows, classify, merge back
    const rowsOn  = rows.map(r => ({...r}))
    classifyAbcLogBenchmark(rowsOn, 'SO WMA Online')

    const rowsOff = rows.map(r => ({...r}))
    classifyAbcLogBenchmark(rowsOff, 'SO WMA Offline')

    // The classify function creates column: "Kategori ABC (Log-Benchmark - WMA Online)"
    // and "Kategori ABC (Log-Benchmark - WMA Offline)"
    const KAT_ON_FULL  = 'Kategori ABC (Log-Benchmark - WMA Online)'
    const KAT_OFF_FULL = 'Kategori ABC (Log-Benchmark - WMA Offline)'
    for (let i=0; i<rows.length; i++) {
      rows[i][KAT_ON]  = rowsOn[i][KAT_ON_FULL]  || 'F'
      rows[i][KAT_OFF] = rowsOff[i][KAT_OFF_FULL] || 'F'
    }

    store.setAbcV3Result(rows)
    result.value = rows
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
