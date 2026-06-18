<template>
  <div>
    <h1>🔄 Analisis Donor Stock</h1>

    <div class="alert alert-info">
      Analisis distribusi lateral antar cabang. Cabang Overstock → donor ke cabang Understock.
      Urutan: Surabaya dulu → donor non-Surabaya urut dari terbesar.
    </div>

    <div v-if="!v2Ready" class="alert alert-warning">
      ⚠️ Harap jalankan <strong>Hasil Analisa Stock V2</strong> terlebih dahulu.
    </div>

    <template v-else>
      <div class="card">
        <button class="btn btn-primary" @click="runDonor" :disabled="loading">
          <span v-if="loading"><span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Memproses...</span>
          <span v-else>▶ Hitung Donor Stock</span>
        </button>
      </div>

      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span> Menghitung distribusi donor...
      </div>

      <template v-if="result && !loading">
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalDonor.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Total Qty Donor</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--danger);">{{ totalNeedSupplier.toLocaleString('id-ID') }}</div>
            <div class="stat-label">Masih Butuh Supplier</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--success);">{{ skuDonated.toLocaleString('id-ID') }}</div>
            <div class="stat-label">SKU dengan Donor</div>
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
              <label class="form-label">Filter Skenario</label>
              <select v-model="filterSkenario" class="form-control" style="width:280px;">
                <option value="">Semua Skenario</option>
                <option v-for="s in skenarios" :key="s">{{ s }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>Tabel Distribusi Donor</h2>
          <DataTable
            :rows="filteredResult"
            :columns="tableCols"
            export-name="analisis_donor_stock.xlsx"
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
import { calculateDonorDistribution, colorStatusStock, colorSkenario } from '@/utils/analysis'

const store   = useDataStore()
const loading = ref(false)
const result  = ref(null)
const filterCity     = ref('')
const filterSkenario = ref('')

const v2Ready = computed(() => store.stockV2Result && store.stockV2Result.length > 0)

const cities = computed(() => {
  if (!result.value) return []
  return [...new Set(result.value.map(r => r.City))].sort()
})
const skenarios = computed(() => {
  if (!result.value) return []
  return [...new Set(result.value.map(r => r.Skenario_Donor))].sort()
})

const filteredResult = computed(() => {
  if (!result.value) return []
  return result.value.filter(r =>
    (!filterCity.value     || r.City === filterCity.value) &&
    (!filterSkenario.value || r.Skenario_Donor === filterSkenario.value)
  )
})

const totalDonor = computed(() =>
  filteredResult.value.reduce((s,r) => s + (r.Qty_Donor||0), 0))
const totalNeedSupplier = computed(() =>
  filteredResult.value.reduce((s,r) => s + (r.Sisa_Need_Supplier||0), 0))
const skuDonated = computed(() =>
  new Set(filteredResult.value.filter(r => r.Qty_Donor > 0).map(r => r['No. Barang'])).size)

const tableCols = [
  { key: 'No. Barang',        label: 'No. Barang' },
  { key: 'Nama Barang',       label: 'Nama Barang' },
  { key: 'City',              label: 'Kota' },
  { key: 'Kategori ABC',      label: 'ABC' },
  { key: 'Status Stock',      label: 'Status',      colorFn: v => colorStatusStock(v) },
  { key: 'Stock Cabang',      label: 'Stock',        type: 'number' },
  { key: 'Min Stock',         label: 'Min',          type: 'number' },
  { key: 'Max Stock',         label: 'Max',          type: 'number' },
  { key: 'Qty_Bisa_Donor',    label: 'Bisa Donor',   type: 'number' },
  { key: 'Donor_Ke',          label: 'Donor Ke' },
  { key: 'Qty_Donor',         label: 'Qty Donor',    type: 'number' },
  { key: 'Terima_Dari',       label: 'Terima Dari' },
  { key: 'Qty_Terima',        label: 'Qty Terima',   type: 'number' },
  { key: 'Sisa_Need_Supplier',label: 'Sisa Need',    type: 'number' },
  { key: 'Skenario_Donor',    label: 'Skenario',     colorFn: v => colorSkenario(v) },
]

async function runDonor() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 50))
  try {
    result.value = calculateDonorDistribution(store.stockV2Result)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
