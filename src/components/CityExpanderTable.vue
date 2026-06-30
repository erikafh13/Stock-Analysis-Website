<template>
  <details :open="defaultOpen">
    <summary>📍 {{ title }}</summary>
    <div>
      <div v-if="!rows.length" class="text-muted" style="padding:0.5rem;">
        Tidak ada data yang cocok dengan filter.
      </div>
      <div class="table-wrapper" v-else :style="maxHeight ? `max-height:${maxHeight}; overflow-y:auto;` : ''">
        <table>
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
            </tr>
          </thead>
          <tbody>
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
  </details>
</template>

<script setup>
defineProps({
  title:       { type: String, required: true },
  rows:        { type: Array,  default: () => [] },
  columns:     { type: Array,  default: () => [] },
  defaultOpen: { type: Boolean, default: false },
  maxHeight:   { type: String, default: '450px' },
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
</script>
