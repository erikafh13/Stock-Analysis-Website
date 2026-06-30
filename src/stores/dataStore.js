import { defineStore } from 'pinia'
import { ref } from 'vue'
import { defaultDonorRules, DEFAULT_DISTANCE_PRIORITY } from '@/utils/analysis'

export const useDataStore = defineStore('data', () => {
  // ── Data utama ─────────────────────────────────────────────────────────────
  const dfPenjualan = ref([])
  const produkRef   = ref([])
  const dfStock     = ref([])
  const stockFilename = ref('')

  // ── Hasil analisis ─────────────────────────────────────────────────────────
  const stockAnalysisResult = ref(null)
  const bulanColumnsStock   = ref([])

  const stockV2Result     = ref(null)
  const stockV2BulanCols  = ref([])

  const abcV3Result         = ref(null)
  const abcV3PlatformSales  = ref({})

  const newProductResult = ref(null)
  const itemsDf          = ref([])

  // ── Donor config (persist antar run) ──────────────────────────────────────
  const donorRules    = ref(defaultDonorRules())
  const donorDistance = ref(JSON.parse(JSON.stringify(DEFAULT_DISTANCE_PRIORITY)))

  // ── Actions ───────────────────────────────────────────────────────────────
  function setPenjualan(data) { dfPenjualan.value = data }
  function setProdukRef(data) { produkRef.value = data }
  function setDfStock(data, filename = '') { dfStock.value = data; stockFilename.value = filename }

  function setStockResult(result, bulanCols = []) {
    stockAnalysisResult.value = result
    bulanColumnsStock.value   = bulanCols
  }
  function setStockV2Result(result, bulanCols = []) {
    stockV2Result.value    = result
    stockV2BulanCols.value = bulanCols
  }
  function setAbcV3Result(data, platformSales = {}) {
    abcV3Result.value        = data
    abcV3PlatformSales.value = platformSales
  }
  function setNewProductResult(data) { newProductResult.value = data }
  function setItemsDf(data) { itemsDf.value = data }

  function reset() {
    dfPenjualan.value = []
    produkRef.value   = []
    dfStock.value     = []
    stockFilename.value = ''
    stockAnalysisResult.value = null
    stockV2Result.value       = null
    abcV3Result.value         = null
    newProductResult.value    = null
    itemsDf.value = []
  }

  return {
    dfPenjualan, produkRef, dfStock, stockFilename,
    stockAnalysisResult, bulanColumnsStock,
    stockV2Result, stockV2BulanCols,
    abcV3Result, abcV3PlatformSales,
    newProductResult, itemsDf,
    donorRules, donorDistance,
    setPenjualan, setProdukRef, setDfStock,
    setStockResult, setStockV2Result, setAbcV3Result,
    setNewProductResult, setItemsDf, reset,
  }
})
