<template>
  <div>
    <h1>🔄 Analisis Donor Stock</h1>
    <p class="text-muted">Distribusi stok lateral antar cabang — optimalkan sebelum PO ke supplier</p>

    <div v-if="!v2Ready" class="alert alert-warning">
      ⚠️ Jalankan dulu <strong>Hasil Analisa Stock V2</strong>, kemudian kembali ke halaman ini.
    </div>

    <template v-else>
      <!-- Penjelasan -->
      <details>
        <summary>📖 Cara Kerja &amp; Arti Setiap Kolom (klik untuk membaca)</summary>
        <div style="font-size:0.85rem; line-height:1.7;">
          <p>Halaman ini menjawab: <strong>"Sebelum order ke supplier, adakah cabang yang kelebihan stok dan bisa kirim ke cabang yang kekurangan?"</strong></p>
          <h3>Langkah Perhitungan (per SKU):</h3>
          <p><strong>① Siapa yang KELEBIHAN (Donor)?</strong><br/>
          Cabang dengan status Overstock → stoknya melebihi Max Stock.<br/>
          <code>Qty bisa didonorkan = Stock Cabang − Max Stock</code></p>
          <p><strong>② Siapa yang KEKURANGAN (Penerima)?</strong><br/>
          Cabang dengan status Understock → stoknya di bawah Min Stock.<br/>
          <code>Kebutuhan (Add Stock) = Min Stock − Stock Cabang</code></p>
          <p><strong>③ Berapa yang tersedia untuk dibagikan (Pool)?</strong><br/>
          Sisa Surabaya = max(0, Stock SBY − Min Stock SBY)<br/>
          Donor cabang = total kelebihan semua cabang overstock<br/>
          Total Pool = Sisa SBY + semua donor cabang</p>
          <p><strong>④ Cara pembagian:</strong><br/>
          Penerima paling kritis (% stock terkecil) mendapat prioritas pertama. Donor dipilih berdasarkan urutan jarak yang Anda atur. Jika ada aturan larangan, donor tersebut dilewati. Sisanya masuk ke kolom Sisa PO Supplier.</p>
          <table style="width:100%; font-size:0.8rem;">
            <tr><th>Kolom</th><th>Artinya</th></tr>
            <tr><td>Stock Cabang</td><td>Stok fisik saat ini</td></tr>
            <tr><td>Min Stock</td><td>Batas bawah aman</td></tr>
            <tr><td>Max Stock</td><td>Batas atas ideal</td></tr>
            <tr><td>Add Stock</td><td>Unit dibutuhkan agar mencapai Min Stock</td></tr>
            <tr><td>% Stock</td><td>(Stock ÷ Min Stock) × 100</td></tr>
            <tr><td>Qty_Bisa_Donor</td><td>Unit kelebihan yang bisa didonorkan</td></tr>
            <tr><td>Donor_Ke</td><td>Cabang penerima kiriman 🟢</td></tr>
            <tr><td>Qty_Donor</td><td>Total unit dikirim dari cabang ini</td></tr>
            <tr><td>Terima_Dari</td><td>Dari cabang mana stok ini datang 🔵</td></tr>
            <tr><td>Qty_Terima</td><td>Total unit diterima</td></tr>
            <tr><td>Sisa_PO_Supplier</td><td>Sisa kebutuhan yang harus PO</td></tr>
          </table>
        </div>
      </details>

      <hr class="section-divider" />

      <!-- Pengaturan Donor -->
      <details>
        <summary>⚙️ Pengaturan Donor Antar Cabang</summary>
        <div>
          <div class="tabs">
            <button class="tab-btn" :class="{active:cfgTab==='rules'}" @click="cfgTab='rules'">🚫 Aturan Kirim</button>
            <button class="tab-btn" :class="{active:cfgTab==='distance'}" @click="cfgTab='distance'">📍 Prioritas Jarak</button>
          </div>

          <div v-show="cfgTab==='rules'">
            <p class="text-muted" style="font-size:0.8rem;">✅ Centang = BOLEH kirim. Kosong = TIDAK BOLEH.</p>
            <div class="rules-grid">
              <div v-for="dcity in ALL_CITIES" :key="dcity" class="rules-col">
                <strong>{{ dcity }}</strong>
                <label v-for="rcity in ALL_CITIES.filter(c=>c!==dcity)" :key="rcity" class="rule-check">
                  <input type="checkbox" v-model="store.donorRules[dcity][rcity]" />
                  → {{ rcity }}
                </label>
              </div>
            </div>
          </div>

          <div v-show="cfgTab==='distance'">
            <p class="text-muted" style="font-size:0.8rem;">Urutan prioritas donor per penerima. Urutan 1 = paling dekat/prioritas utama.</p>
            <div class="rules-grid">
              <div v-for="rcity in citiesRecv" :key="rcity" class="rules-col">
                <strong>{{ rcity }}</strong>
                <div v-for="(d, idx) in store.donorDistance[rcity]" :key="idx" class="dist-row">
                  <span class="text-muted" style="font-size:0.75rem;">Prioritas {{ idx+1 }}</span>
                  <select v-model="store.donorDistance[rcity][idx]" class="form-control" style="font-size:0.78rem; padding:0.25rem;">
                    <option v-for="c in ALL_CITIES.filter(c=>c!==rcity)" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>

      <hr class="section-divider" />

      <!-- Filter Produk -->
      <h2>🔍 Filter Produk</h2>
      <div class="card">
        <div class="flex gap-3 flex-wrap">
          <div class="form-group" style="flex:1; min-width:200px; margin:0;">
            <label class="form-label">Kategori Barang:</label>
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
        <div class="flex gap-3 flex-wrap mt-2">
          <div class="form-group" style="flex:1; min-width:200px; margin:0;">
            <label class="form-label">Kategori ABC:</label>
            <select v-model="selAbc" multiple class="form-control" style="height:80px;">
              <option v-for="k in ['A','B','C','D','E','F']" :key="k">{{ k }}</option>
            </select>
          </div>
          <div class="form-group" style="display:flex; align-items:center; margin:0;">
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
              <input type="checkbox" v-model="onlyActive" />
              Hanya SKU dengan aktivitas donor/terima
            </label>
          </div>
        </div>
        <button class="btn btn-primary mt-2" @click="runCalc" :disabled="loading">
          <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Menghitung...</span>
          <span v-else>⏳ Hitung Distribusi Donor</span>
        </button>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Menghitung distribusi donor...
      </div>

      <template v-if="donorDf && !loading">
        <!-- Ringkasan -->
        <hr class="section-divider" />
        <h2>📊 Ringkasan Hasil</h2>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-value">{{ skuAdaDonor }}</div><div class="stat-label">SKU ada donor</div></div>
          <div class="stat-card"><div class="stat-value">{{ skuMenerima }}</div><div class="stat-label">SKU menerima transfer</div></div>
          <div class="stat-card"><div class="stat-value">{{ totalDonated.toLocaleString('id-ID') }}</div><div class="stat-label">Total unit didonorkan</div></div>
          <div class="stat-card"><div class="stat-value">{{ totalReceived.toLocaleString('id-ID') }}</div><div class="stat-label">Total unit diterima</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--danger);">{{ totalSisaPo.toLocaleString('id-ID') }}</div><div class="stat-label">Sisa → butuh PO</div></div>
        </div>

        <h3>Distribusi Skenario per SKU</h3>
        <div class="stats-grid">
          <div v-for="s in skenarioCounts" :key="s.label" class="stat-card" :style="{ background: s.color }">
            <div class="stat-value" style="font-size:1.4rem;">{{ s.count }}</div>
            <div class="stat-label" style="font-size:0.7rem;">{{ s.label }}</div>
          </div>
        </div>

        <hr class="section-divider" />
        <div class="tabs">
          <button class="tab-btn" :class="{active:activeTab==='detail'}" @click="activeTab='detail'">📋 Detail per Cabang</button>
          <button class="tab-btn" :class="{active:activeTab==='rekap'}" @click="activeTab='rekap'">📦 Rekap per SKU</button>
          <button class="tab-btn" :class="{active:activeTab==='gabungan'}" @click="activeTab='gabungan'">📊 Tabel Gabungan</button>
          <button class="tab-btn" :class="{active:activeTab==='matriks'}" @click="activeTab='matriks'">🔀 Matriks Transfer</button>
        </div>

        <!-- Tab 1: Detail per Cabang -->
        <div v-show="activeTab==='detail'">
          <p class="text-muted" style="font-size:0.8rem;">🟢 Kolom <strong>Donor_Ke</strong> = cabang ini mengirim　|　🔵 Kolom <strong>Terima_Dari</strong> = cabang ini menerima</p>
          <CityExpanderTable
            v-for="city in citiesSorted"
            :key="city"
            :title="`${city} — ${activeCount(city)} SKU aktif dari ${displayRows(city).length}`"
            :rows="displayRows(city)"
            :columns="detailCols"
            :default-open="activeCount(city) > 0"
          />
        </div>

        <!-- Tab 2: Rekap per SKU -->
        <div v-show="activeTab==='rekap'">
          <h3>Rekap per SKU</h3>
          <p class="text-muted" style="font-size:0.8rem;">1 baris = 1 SKU. Lihat siapa yang kirim, siapa yang terima, dan berapa sisa yang harus PO.</p>
          <PivotTable :rows="rekapRows" :columns="rekapCols" export-name="donor_rekap_sku.xlsx" />
        </div>

        <!-- Tab 3: Tabel Gabungan -->
        <div v-show="activeTab==='gabungan'">
          <h3>Tabel Gabungan — Semua Cabang dalam Satu Baris per SKU</h3>
          <p class="text-muted" style="font-size:0.8rem;">Format mirip Tabel Gabungan di V2.</p>
          <PivotTable :rows="gabunganRows" :columns="gabunganCols" export-name="donor_tabel_gabungan.xlsx" />
        </div>

        <!-- Tab 4: Matriks -->
        <div v-show="activeTab==='matriks'">
          <h3>🔀 Matriks Transfer Antar Cabang</h3>
          <p class="text-muted" style="font-size:0.8rem;">Baris = pengirim | Kolom = penerima | Angka = total unit ditransfer</p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th v-for="c in matrixCities" :key="c">{{ c }}</th>
                  <th>► TOTAL KIRIM</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in matrixCities" :key="r">
                  <td><strong>{{ r }}</strong></td>
                  <td v-for="c in matrixCities" :key="c" :style="matrix[r][c] > 0 ? {background:'#cce5ff', fontWeight:'bold'} : {}">
                    {{ matrix[r][c] }}
                  </td>
                  <td style="font-weight:bold;">{{ rowTotal(r) }}</td>
                </tr>
                <tr>
                  <td><strong>▼ TOTAL TERIMA</strong></td>
                  <td v-for="c in matrixCities" :key="c" style="font-weight:bold;">{{ colTotal(c) }}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Legenda -->
      <hr class="section-divider" />
      <h3>📖 Legenda Skenario</h3>
      <div class="stats-grid">
        <div class="alert alert-success" style="margin:0;"><strong>0 - TIDAK ADA KEBUTUHAN</strong><br/>Semua cabang sudah aman.</div>
        <div class="alert alert-info" style="margin:0;"><strong>2 - SBY CUKUP</strong><br/>Sisa SBY cukup untuk semua.</div>
        <div class="alert alert-warning" style="margin:0;"><strong>3 - SBY TERBATAS + ADA DONOR</strong><br/>SBY kurang, dibantu donor cabang.</div>
        <div class="alert alert-warning" style="margin:0;"><strong>4 - HANYA DONOR CABANG</strong><br/>SBY tidak bisa kirim, donor cabang aktif.</div>
        <div class="alert alert-danger" style="margin:0;"><strong>5 - POOL TIDAK CUKUP</strong><br/>Pool ada tapi tidak cukup → sebagian PO.</div>
        <div class="alert alert-danger" style="margin:0;"><strong>1 - KURANG</strong><br/>Tidak ada pool sama sekali → semua PO.</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import CityExpanderTable from '@/components/CityExpanderTable.vue'
import PivotTable from '@/components/PivotTable.vue'
import {
  runDonorCalc, ALL_CITIES, KAT_COL, KEYS, CITY_SHORT,
  colorStatusStock, colorKategoriAbc, colorSkenario, calcPersentaseStock,
} from '@/utils/analysis'

const store   = useDataStore()
const loading = ref(false)
const donorDf = ref(null)
const activeTab = ref('detail')
const cfgTab    = ref('rules')

const v2Ready = computed(() => store.stockV2Result && store.stockV2Result.length > 0)
const citiesRecv = ALL_CITIES.filter(c => c !== 'SURABAYA')

const selKat = ref([]), selBrand = ref([]), selProd = ref([]), selAbc = ref([])
const onlyActive = ref(true)

const baseDf = computed(() => {
  if (!v2Ready.value) return []
  let rows = store.stockV2Result.filter(r => r.City !== 'OTHERS').map(r => ({
    ...r,
    'Persentase Stock': r['Persentase Stock'] !== undefined ? r['Persentase Stock'] : calcPersentaseStock(r),
  }))
  if (selKat.value.length)   rows = rows.filter(r => selKat.value.includes(r['Kategori Barang']))
  if (selBrand.value.length) rows = rows.filter(r => selBrand.value.includes(r['BRAND Barang']))
  if (selProd.value.length)  rows = rows.filter(r => selProd.value.includes(r['Nama Barang']))
  if (selAbc.value.length)   rows = rows.filter(r => selAbc.value.includes(r[KAT_COL]))
  return rows
})

const kategoriOptions = computed(() => v2Ready.value ? [...new Set(store.stockV2Result.map(r=>r['Kategori Barang']))].sort() : [])
const brandOptions    = computed(() => v2Ready.value ? [...new Set(store.stockV2Result.map(r=>r['BRAND Barang']))].sort() : [])
const prodOptions     = computed(() => v2Ready.value ? [...new Set(store.stockV2Result.map(r=>r['Nama Barang']))].sort() : [])

const ddisp = computed(() => {
  if (!donorDf.value) return []
  if (!onlyActive.value) return donorDf.value
  const activeSkus = new Set(donorDf.value.filter(r => r.Donor_Ke !== '-' || r.Terima_Dari !== '-').map(r => r['No. Barang']))
  return donorDf.value.filter(r => activeSkus.has(r['No. Barang']))
})

const citiesSorted = computed(() => [...new Set(ddisp.value.map(r => r.City))].sort())

function displayRows(city) { return ddisp.value.filter(r => r.City === city) }
function activeCount(city) { return displayRows(city).filter(r => r.Donor_Ke !== '-' || r.Terima_Dari !== '-').length }

const detailCols = [
  { key: 'No. Barang', label: 'No. Barang' },
  { key: 'Nama Barang', label: 'Nama Barang' },
  { key: 'Kategori ABC', label: 'Kategori ABC', colorFn: v => colorKategoriAbc(v) },
  { key: 'Stock Cabang', label: 'Stock Cabang', type: 'number' },
  { key: 'Min Stock', label: 'Min Stock', type: 'number' },
  { key: 'Max Stock', label: 'Max Stock', type: 'number' },
  { key: 'Status Stock', label: 'Status Stock', colorFn: v => colorStatusStock(v) },
  { key: '% Stock', label: '% Stock', decimals: 1 },
  { key: 'Add Stock', label: 'Add Stock', type: 'number' },
  { key: 'Qty_Bisa_Donor', label: 'Qty_Bisa_Donor', type: 'number' },
  { key: 'Donor_Ke', label: 'Donor_Ke' },
  { key: 'Qty_Donor', label: 'Qty_Donor', type: 'number' },
  { key: 'Terima_Dari', label: 'Terima_Dari' },
  { key: 'Qty_Terima', label: 'Qty_Terima', type: 'number' },
  { key: 'Sisa_PO_Supplier', label: 'Sisa_PO_Supplier', type: 'number' },
  { key: 'Skenario', label: 'Skenario', colorFn: v => colorSkenario(v) },
]

// ── Metrics ───────────────────────────────────────────────────────────────────
const skuAdaDonor   = computed(() => donorDf.value ? new Set(donorDf.value.filter(r=>r.Donor_Ke!=='-').map(r=>r['No. Barang'])).size : 0)
const skuMenerima   = computed(() => donorDf.value ? new Set(donorDf.value.filter(r=>r.Terima_Dari!=='-').map(r=>r['No. Barang'])).size : 0)
const totalDonated  = computed(() => donorDf.value ? donorDf.value.reduce((s,r)=>s+(r.Qty_Donor||0),0) : 0)
const totalReceived = computed(() => donorDf.value ? donorDf.value.reduce((s,r)=>s+(r.Qty_Terima||0),0) : 0)
const totalSisaPo   = computed(() => donorDf.value ? donorDf.value.reduce((s,r)=>s+(r.Sisa_PO_Supplier||0),0) : 0)

const skenarioCounts = computed(() => {
  if (!donorDf.value) return []
  const seen = new Map()
  for (const r of donorDf.value) {
    if (!seen.has(r['No. Barang'])) seen.set(r['No. Barang'], r.Skenario)
  }
  const counts = {}
  for (const sk of seen.values()) counts[sk] = (counts[sk]||0) + 1
  const colors = {
    '0 - TIDAK ADA KEBUTUHAN':'#d4edda', '2 - SBY CUKUP':'#cce5ff',
    '3 - SBY TERBATAS + ADA DONOR':'#fff3cd', '4 - HANYA DONOR CABANG':'#ffe5b4',
    '5 - POOL TIDAK CUKUP':'#f8d7da', '1 - KURANG (TIDAK ADA POOL)':'#f5c6cb',
  }
  return Object.entries(counts).map(([label, count]) => ({ label, count, color: colors[label] || '#eee' }))
})

// ── Tab 2: Rekap per SKU ───────────────────────────────────────────────────────
const rekapCols = [
  ...KEYS.map(k => ({ key: k, label: k })),
  { key: 'Skenario', label: 'Skenario', colorFn: v => colorSkenario(v) },
  { key: 'Total Need', label: 'Total Need', type: 'number' },
  { key: 'Total Pool', label: 'Total Pool', type: 'number' },
  { key: 'Terpenuhi', label: 'Terpenuhi', type: 'number' },
  { key: 'Sisa PO Supplier', label: 'Sisa PO Supplier', type: 'number' },
  { key: 'Donor (kirim ke)', label: 'Donor (kirim ke)' },
  { key: 'Penerima (dari)', label: 'Penerima (dari)' },
]
const rekapRows = computed(() => {
  if (!ddisp.value.length) return []
  const bySku = {}
  for (const r of ddisp.value) { (bySku[r['No. Barang']] = bySku[r['No. Barang']] || []).push(r) }
  const rows = []
  for (const [sku, grp] of Object.entries(bySku)) {
    const f = grp[0]
    const meta = {}; KEYS.forEach(k => meta[k] = f[k])
    const da = grp.filter(r => r.Donor_Ke !== '-' && r.Qty_Donor > 0)
    const ra = grp.filter(r => r.Terima_Dari !== '-' && r.Qty_Terima > 0)
    meta['Skenario']  = grp[0].Skenario
    meta['Total Need']= grp[0].Total_Need
    meta['Total Pool']= grp[0].Total_Pool
    meta['Terpenuhi'] = grp.reduce((s,r)=>s+(r.Qty_Terima||0),0)
    meta['Sisa PO Supplier'] = grp.reduce((s,r)=>s+(r.Sisa_PO_Supplier||0),0)
    meta['Donor (kirim ke)'] = da.map(r => `${r.City}→${r.Donor_Ke} (${r.Qty_Donor} unit)`).join(' | ') || '-'
    meta['Penerima (dari)']  = ra.map(r => `${r.City}←${r.Terima_Dari} (${r.Qty_Terima} unit)`).join(' | ') || '-'
    rows.push(meta)
  }
  return rows
})

// ── Tab 3: Tabel Gabungan ──────────────────────────────────────────────────────
const M_COLS = ['Stock Cabang','Min Stock','Max Stock','Add Stock','Status Stock','% Stock','Qty_Bisa_Donor','Donor_Ke','Qty_Donor','Terima_Dari','Qty_Terima','Sisa_PO_Supplier']
const gabunganRows = computed(() => {
  if (!ddisp.value.length) return []
  const bySku = {}
  for (const r of ddisp.value) { (bySku[r['No. Barang']] = bySku[r['No. Barang']] || []).push(r) }
  const rows = []
  for (const [sku, grp] of Object.entries(bySku)) {
    const f = grp[0]
    const row = {}; KEYS.forEach(k => row[k] = f[k])
    for (const r of grp) {
      const short = CITY_SHORT[r.City] || r.City
      M_COLS.forEach(m => row[`${short}_${m}`] = r[m] ?? (typeof f[m]==='number'?0:'-'))
    }
    row['All_Total_Need'] = grp[0].Total_Need
    row['All_Total_Pool'] = grp[0].Total_Pool
    row['All_Qty_Terima'] = grp.reduce((s,r)=>s+(r.Qty_Terima||0),0)
    row['All_Sisa_PO']    = grp.reduce((s,r)=>s+(r.Sisa_PO_Supplier||0),0)
    row['All_Skenario']   = grp[0].Skenario
    rows.push(row)
  }
  return rows
})
const gabunganCols = computed(() => {
  if (!gabunganRows.value.length) return []
  return Object.keys(gabunganRows.value[0]).map(k => {
    const col = { key: k, label: k, type: typeof gabunganRows.value[0][k] === 'number' ? 'number' : undefined }
    if (k === 'All_Skenario') col.colorFn = v => colorSkenario(v)
    if (k.endsWith('_Status Stock')) col.colorFn = v => colorStatusStock(v)
    return col
  })
})

// ── Tab 4: Matriks ────────────────────────────────────────────────────────────
const matrixCities = computed(() => citiesSorted.value)
const matrix = computed(() => {
  const m = {}
  for (const r of matrixCities.value) { m[r] = {}; for (const c of matrixCities.value) m[r][c] = 0 }
  for (const row of ddisp.value) {
    if (row.Donor_Ke === '-' || row.Qty_Donor === 0) continue
    const dests = String(row.Donor_Ke).split(',').map(d => d.trim()).filter(Boolean)
    const each  = Math.floor(row.Qty_Donor / Math.max(dests.length, 1))
    for (const dest of dests) {
      if (m[row.City] && m[row.City][dest] !== undefined) m[row.City][dest] += each
    }
  }
  return m
})
function rowTotal(r) { return matrixCities.value.reduce((s,c) => s + (matrix.value[r]?.[c]||0), 0) }
function colTotal(c) { return matrixCities.value.reduce((s,r) => s + (matrix.value[r]?.[c]||0), 0) }

async function runCalc() {
  loading.value = true
  donorDf.value = null
  await new Promise(r => setTimeout(r, 50))
  try {
    donorDf.value = runDonorCalc(baseDf.value, store.donorRules, store.donorDistance)
  } catch (e) {
    console.error(e)
    alert('Terjadi error: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.rules-grid { display: flex; gap: 1rem; flex-wrap: wrap; }
.rules-col { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 0.3rem; }
.rule-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; cursor: pointer; }
.dist-row { display: flex; flex-direction: column; gap: 0.15rem; margin-bottom: 0.4rem; }
</style>
