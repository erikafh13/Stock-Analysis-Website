<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <img
          src="https://eq-cdn.equiti-me.com/website/images/What_does_a_stock_split_mean.2e16d0ba.fill-1600x900.jpg"
          alt="Stock Analysis"
          class="sidebar-img"
          v-show="!sidebarCollapsed"
        />
        <h2 class="sidebar-title" v-show="!sidebarCollapsed">Analisis Stock & ABC</h2>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          {{ sidebarCollapsed ? '›' : '‹' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :title="item.label"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label" v-show="!sidebarCollapsed">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <div class="drive-status-badge">
          ☁️ Terhubung ke<br />Google Drive.
        </div>
        <div class="data-status">
          <div class="status-row" :class="{ ok: hasPenjualan }">
            <span>{{ hasPenjualan ? '✅' : '⬜' }}</span>
            <span>Data Penjualan</span>
          </div>
          <div class="status-row" :class="{ ok: hasProduk }">
            <span>{{ hasProduk ? '✅' : '⬜' }}</span>
            <span>Produk Referensi</span>
          </div>
          <div class="status-row" :class="{ ok: hasStock }">
            <span>{{ hasStock ? '✅' : '⬜' }}</span>
            <span>Data Stock</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()
const sidebarCollapsed = ref(false)

const hasPenjualan = computed(() => store.dfPenjualan.length > 0)
const hasProduk    = computed(() => store.produkRef.length > 0)
const hasStock     = computed(() => store.dfStock.length > 0)

const navItems = [
  { to: '/input-data',       icon: '📥', label: 'Input Data' },
  { to: '/stock-analysis',   icon: '📈', label: 'Hasil Analisa Stock' },
  { to: '/stock-analysis-v2',icon: '📊', label: 'Hasil Analisa Stock V2' },
  { to: '/stock-donor',      icon: '🔄', label: 'Analisis Donor Stock' },
  { to: '/new-product',      icon: '🆕', label: 'Analisis Produk Baru' },
  { to: '/abc-v3',           icon: '🏷️', label: 'Analisis ABC V3 (Platform)' },
]
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width 0.2s, min-width 0.2s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.sidebar-img {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  object-fit: cover;
  max-height: 120px;
}

.sidebar-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0;
  line-height: 1.3;
}

.collapse-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-nav {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  color: var(--text);
  text-decoration: none;
  font-size: 0.875rem;
  transition: background 0.15s;
  white-space: nowrap;
}

.nav-item:hover,
.nav-item.router-link-active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
}

.nav-icon { font-size: 1.1rem; flex-shrink: 0; }
.nav-label { overflow: hidden; text-overflow: ellipsis; }

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border);
}

.data-status { display: flex; flex-direction: column; gap: 0.4rem; }

.drive-status-badge {
  background: #d4edda;
  color: #155724;
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.status-row.ok { color: var(--success); }

.main-content {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow-y: auto;
  background: var(--bg);
}

@media (max-width: 768px) {
  .sidebar { width: 60px; min-width: 60px; }
  .nav-label, .sidebar-title, .sidebar-img, .sidebar-footer { display: none !important; }
  .main-content { padding: 1rem; }
}
</style>
