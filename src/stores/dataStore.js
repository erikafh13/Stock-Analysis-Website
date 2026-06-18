import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDataStore = defineStore('data', () => {
  // ── Data utama ─────────────────────────────────────────────────────────────
  const dfPenjualan = ref([])          // rows: array of objects
  const produkRef = ref([])
  const dfStock = ref([])
  const stockFilename = ref('')

  // ── Hasil analisis ─────────────────────────────────────────────────────────
  const stockAnalysisResult = ref(null)
  const stockV2Result = ref(null)
  const abcV3Result = ref(null)
  const newProductResult = ref(null)
  const itemsDf = ref([])

  // ── Kolom bulan ───────────────────────────────────────────────────────────
  const bulanColumnsStock = ref([])
  const stockV2BulanCols = ref([])

  // ── Actions ───────────────────────────────────────────────────────────────
  function setPenjualan(data) { dfPenjualan.value = data }
  function setProdukRef(data) { produkRef.value = data }
  function setDfStock(data, filename = '') {
    dfStock.value = data
    stockFilename.value = filename
  }
  function setStockResult(result, bulanCols = []) {
    stockAnalysisResult.value = result
    bulanColumnsStock.value = bulanCols
  }
  function setStockV2Result(result, bulanCols = []) {
    stockV2Result.value = result
    stockV2BulanCols.value = bulanCols
  }
  function setAbcV3Result(data) { abcV3Result.value = data }
  function setNewProductResult(data) { newProductResult.value = data }
  function setItemsDf(data) { itemsDf.value = data }
  function reset() {
    dfPenjualan.value = []
    produkRef.value = []
    dfStock.value = []
    stockFilename.value = ''
    stockAnalysisResult.value = null
    stockV2Result.value = null
    abcV3Result.value = null
    newProductResult.value = null
    itemsDf.value = []
  }

  return {
    dfPenjualan, produkRef, dfStock, stockFilename,
    stockAnalysisResult, stockV2Result, abcV3Result,
    newProductResult, itemsDf,
    bulanColumnsStock, stockV2BulanCols,
    setPenjualan, setProdukRef, setDfStock,
    setStockResult, setStockV2Result, setAbcV3Result,
    setNewProductResult, setItemsDf, reset,
  }
})
