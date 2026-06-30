<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-2" style="align-items:center; justify-content:space-between;">
      <div class="flex gap-2 flex-wrap" style="align-items:center;">
        <input
          v-if="searchable"
          v-model="search"
          type="text"
          placeholder="🔍 Cari..."
          class="form-control"
          style="width:220px"
        />
        <span class="text-muted" style="font-size:0.8rem;">{{ filtered.length }} baris</span>
      </div>
      <div class="flex gap-2">
        <button v-if="exportable" class="btn btn-success btn-sm" @click="doExport">
          📥 Export Excel
        </button>
        <slot name="toolbar" />
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrapper" :style="maxHeightStyle">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              @click="col.sortable !== false && toggleSort(col.key)"
              :style="col.sortable !== false ? 'cursor:pointer;' : ''"
            >
              {{ col.label }}
              <span v-if="sortKey === col.key">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginated.length === 0">
            <td :colspan="visibleColumns.length" class="text-center text-muted" style="padding:2rem;">
              Tidak ada data.
            </td>
          </tr>
          <tr v-for="(row, ri) in paginated" :key="ri">
            <td
              v-for="col in visibleColumns"
              :key="col.key"
              :style="getCellStyle(row, col)"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ formatCell(row[col.key], col) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="pageSize && filtered.length > pageSize">
      <button class="btn btn-secondary btn-sm" :disabled="page === 1" @click="page--">‹</button>
      <span>Halaman {{ page }} / {{ totalPages }}</span>
      <button class="btn btn-secondary btn-sm" :disabled="page === totalPages" @click="page++">›</button>
      <select v-model.number="pageSize" class="form-control" style="width:80px">
        <option v-for="n in [25,50,100,500]" :key="n" :value="n">{{ n }}</option>
      </select>
      <span class="text-muted">per halaman</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { exportToExcel } from '@/utils/analysis'

const props = defineProps({
  rows:        { type: Array,  default: () => [] },
  columns:     { type: Array,  default: () => [] },
  searchable:  { type: Boolean, default: true },
  exportable:  { type: Boolean, default: true },
  exportName:  { type: String,  default: 'export.xlsx' },
  maxHeight:   { type: String,  default: '500px' },
  defaultSort: { type: String,  default: '' },
  initialPageSize: { type: Number, default: 50 },
})

const search  = ref('')
const sortKey = ref(props.defaultSort)
const sortDir = ref('asc')
const page    = ref(1)
const pageSize = ref(props.initialPageSize)

const maxHeightStyle = computed(() =>
  props.maxHeight ? `max-height:${props.maxHeight}; overflow-y:auto;` : '')

const visibleColumns = computed(() =>
  props.columns.filter(c => c.hidden !== true))

watch(search, () => { page.value = 1 })

const filtered = computed(() => {
  let data = [...props.rows]
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    data = data.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q)))
  }
  if (sortKey.value) {
    data.sort((a, b) => {
      const va = a[sortKey.value], vb = b[sortKey.value]
      const na = Number(va), nb = Number(vb)
      const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : String(va).localeCompare(String(vb))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return data
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function toggleSort(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}

function formatCell(val, col) {
  if (val === null || val === undefined || val === '') return '-'
  if (col.type === 'number' || typeof val === 'number') {
    const n = Number(val)
    return isNaN(n) ? val : n.toLocaleString('id-ID')
  }
  return val
}

function getCellStyle(row, col) {
  if (col.colorFn) {
    const s = col.colorFn(row[col.key], row)
    if (typeof s === 'object') return s
    return {}
  }
  return {}
}

function doExport() {
  exportToExcel(props.rows, props.exportName)
}
</script>
