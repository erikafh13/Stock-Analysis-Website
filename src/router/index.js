import { createRouter, createWebHashHistory } from 'vue-router'
import InputData from '@/views/InputData.vue'
import StockAnalysis from '@/views/StockAnalysis.vue'
import StockAnalysisV2 from '@/views/StockAnalysisV2.vue'
import StockDonor from '@/views/StockDonor.vue'
import NewProductAnalysis from '@/views/NewProductAnalysis.vue'
import AbcAnalysisV3 from '@/views/AbcAnalysisV3.vue'

const routes = [
  { path: '/', redirect: '/input-data' },
  { path: '/input-data', name: 'InputData', component: InputData, meta: { title: 'Input Data' } },
  { path: '/stock-analysis', name: 'StockAnalysis', component: StockAnalysis, meta: { title: 'Hasil Analisa Stock' } },
  { path: '/stock-analysis-v2', name: 'StockAnalysisV2', component: StockAnalysisV2, meta: { title: 'Hasil Analisa Stock V2' } },
  { path: '/stock-donor', name: 'StockDonor', component: StockDonor, meta: { title: 'Analisis Donor Stock' } },
  { path: '/new-product', name: 'NewProduct', component: NewProductAnalysis, meta: { title: 'Analisis Produk Baru' } },
  { path: '/abc-v3', name: 'AbcV3', component: AbcAnalysisV3, meta: { title: 'Analisis ABC V3 (Platform)' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — Stock Analysis` : 'Stock Analysis'
})

export default router
