<template>
  <div class="bar-chart">
    <div v-if="!data.length" class="text-muted">Tidak ada data.</div>
    <div v-else class="bar-row" v-for="d in data" :key="d.label">
      <span class="bar-label">{{ d.label }}</span>
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: pct(d.value) + '%' }"></div>
      </div>
      <span class="bar-value">{{ formatValue(d.value) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ label, value }]
})

const maxVal = computed(() => Math.max(1, ...props.data.map(d => Number(d.value) || 0)))
function pct(v) { return Math.max(2, ((Number(v) || 0) / maxVal.value) * 100) }
function formatValue(v) {
  const n = Number(v)
  return isNaN(n) ? v : n.toLocaleString('id-ID')
}
</script>

<style scoped>
.bar-chart { display: flex; flex-direction: column; gap: 0.5rem; }
.bar-row { display: flex; align-items: center; gap: 0.6rem; }
.bar-label { width: 110px; font-size: 0.8rem; flex-shrink: 0; text-align: right; color: var(--text-muted); }
.bar-track { flex: 1; background: #f1f3f4; border-radius: 4px; height: 18px; overflow: hidden; }
.bar-fill { background: var(--primary); height: 100%; border-radius: 4px; transition: width 0.3s; }
.bar-value { width: 60px; font-size: 0.8rem; font-weight: 600; }
</style>
