<template>
  <div>
    <div class="flex gap-2 mb-2" style="justify-content:space-between; align-items:center;">
      <span class="text-muted" style="font-size:0.8rem;">{{ rows.length }} baris (1 baris = 1 SKU)</span>
      <button v-if="exportable" class="btn btn-success btn-sm" @click="doExport">📥 Export Excel</button>
    </div>
    <div class="table-wrapper" :style="maxHeight ? `max-height:${maxHeight}; overflow-y:auto;` : ''">
      <table>
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length" class="text-center text-muted" style="padding:2rem;">Tidak ada data.</td>
          </tr>
          <tr v-for="(row, ri) in rows" :key="ri">
            <td
              v-for="col in columns"
              :key="col.key"
              :style="col.colorFn ? col.colorFn(row[col.key], row) : {}"
            >
              {{ formatCell(row[col.key], col) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { exportToExcel } from '@/utils/analysis'

const props = defineProps({
  rows:       { type: Array, default: () => [] },
  columns:    { type: Array, default: () => [] },
  exportable: { type: Boolean, default: true },
  exportName: { type: String, default: 'pivot.xlsx' },
  maxHeight:  { type: String, default: '600px' },
})

function formatCell(val, col) {
  if (val === null || val === undefined || val === '') return '-'
  if (col.decimals !== undefined) {
    const n = Number(val)
    return isNaN(n) ? val : n.toFixed(col.decimals)
  }
  if (col.type === 'number' || typeof val === 'number') {
    const n = Number(val)
    return isNaN(n) ? val : n.toLocaleString('id-ID')
  }
  return val
}

function doExport() {
  exportToExcel(props.rows, props.exportName)
}
</script>
