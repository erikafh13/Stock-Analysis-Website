/**
 * utils/analysis.js
 * Port lengkap dari utils/analysis.py — semua fungsi kalkulasi & analisis.
 */

// ── Konstanta ─────────────────────────────────────────────────────────────────
export const DAYS_MULTIPLIER = { A: 1.00, B: 1.00, C: 0.75, D: 0.50, E: 0.25, F: 0.00 }
export const MAX_MULTIPLIER  = { A: 2.0,  B: 2.0,  C: 1.5,  D: 1.0,  E: 1.0,  F: 0.0  }

export const BULAN_INDONESIA = {
  1:'JANUARI',2:'FEBRUARI',3:'MARET',4:'APRIL',5:'MEI',6:'JUNI',
  7:'JULI',8:'AGUSTUS',9:'SEPTEMBER',10:'OKTOBER',11:'NOVEMBER',12:'DESEMBER'
}
export const BULAN_TITLE = {
  JANUARI:'Jan', FEBRUARI:'Feb', MARET:'Mar', APRIL:'Apr', MEI:'Mei', JUNI:'Jun',
  JULI:'Jul', AGUSTUS:'Agu', SEPTEMBER:'Sep', OKTOBER:'Okt', NOVEMBER:'Nov', DESEMBER:'Des',
}

export const CITY_PREFIX_MAP = {
  SURABAYA: ['A - ITC','AT - TRANSIT ITC','C','C6','CT - TRANSIT PUSAT','Y - SBY','Y3 - Display Y','YT - TRANSIT Y'],
  JAKARTA:  ['B','BT - TRANSIT JKT'],
  SEMARANG: ['D - SMG','DT - TRANSIT SMG'],
  JOGJA:    ['E - JOG','ET - TRANSIT JOG'],
  MALANG:   ['F - MLG','FT - TRANSIT MLG'],
  BALI:     ['H - BALI','HT - TRANSIT BALI'],
}
export const CITY_SHORT = { BALI:'BALI', JAKARTA:'JKT', JOGJA:'JOG', MALANG:'MLG', SEMARANG:'SMG', SURABAYA:'SBY' }
export const ALL_CITIES  = ['SURABAYA','JAKARTA','SEMARANG','JOGJA','MALANG','BALI']

export const LEAD_TIME_CABANG   = 7
export const LEAD_TIME_SUPPLIER = 30

export const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'
export const KEYS    = ['No. Barang','Kategori Barang','BRAND Barang','Nama Barang']

// ── Helper umum ───────────────────────────────────────────────────────────────
export function getDaysMultiplier(kategori) { return DAYS_MULTIPLIER[kategori] ?? 1.0 }

export function mapNamaDept(row) {
  const dept      = String(row['Dept.'] ?? '').trim().toUpperCase()
  const pelanggan = String(row['Nama Pelanggan'] ?? '').trim().toUpperCase()
  if (dept === 'A') {
    return ['A - CASH','AIRPAY INTERNATIONAL INDONESIA','TOKOPEDIA'].includes(pelanggan)
      ? 'A - ITC' : 'A - RETAIL'
  }
  const m = { B:'B - JKT', C:'C - PUSAT', D:'D - SMG', E:'E - JOG', F:'F - MLG', G:'G - PROJECT', H:'H - BALI', X:'X' }
  return m[dept] ?? 'X'
}

export function mapCity(namaDept) {
  if (['A - ITC','A - RETAIL','C - PUSAT','G - PROJECT'].includes(namaDept)) return 'Surabaya'
  const m = { 'B - JKT':'Jakarta','D - SMG':'Semarang','E - JOG':'Jogja','F - MLG':'Malang','H - BALI':'Bali' }
  return m[namaDept] ?? 'Others'
}

function ceil(x) { return Math.ceil(x) }
function clamp0(x) { return Math.max(0, x) }

// ── Group by helper ───────────────────────────────────────────────────────────
export function groupBy(arr, keyFn) {
  const fn = typeof keyFn === 'function' ? keyFn : (r => r[keyFn])
  return arr.reduce((acc, item) => {
    const k = fn(item); (acc[k] = acc[k] ?? []).push(item); return acc
  }, {})
}

export function sumBy(arr, keyFn) {
  const fn = typeof keyFn === 'function' ? keyFn : (r => Number(r[keyFn]) || 0)
  return arr.reduce((s, r) => s + (Number(fn(r)) || 0), 0)
}

export function uniqueSorted(arr, key) {
  return [...new Set(arr.map(r => String(r[key])))].filter(Boolean).sort()
}

// ── WMA (Weighted Moving Average) ─────────────────────────────────────────────
// Bobot: 0-29 hari (terbaru) = 0.5, 30-59 = 0.3, 60-89 = 0.2. Hasil di-ceil.
export function calculateDailyWma(group, endDate) {
  const end  = new Date(endDate)
  const r1s  = new Date(end); r1s.setDate(r1s.getDate() - 29)
  const r2s  = new Date(end); r2s.setDate(r2s.getDate() - 59)
  const r2e  = new Date(end); r2e.setDate(r2e.getDate() - 30)
  const r3s  = new Date(end); r3s.setDate(r3s.getDate() - 89)
  const r3e  = new Date(end); r3e.setDate(r3e.getDate() - 60)

  let s1 = 0, s2 = 0, s3 = 0
  for (const row of group) {
    const d = new Date(row['Tgl Faktur'])
    const q = Number(row['Kuantitas']) || 0
    if (d >= r1s && d <= end) s1 += q
    else if (d >= r2s && d <= r2e) s2 += q
    else if (d >= r3s && d <= r3e) s3 += q
  }
  return ceil(s1 * 0.5 + s2 * 0.3 + s3 * 0.2)
}

// Sales sum dalam rentang tanggal tertentu, untuk kolom "Penjualan Bln X"
export function sumQtyInRange(group, start, end) {
  let s = 0
  for (const row of group) {
    const d = new Date(row['Tgl Faktur'])
    if (d >= start && d <= end) s += Number(row['Kuantitas']) || 0
  }
  return s
}

// ── ABC Log-Benchmark ─────────────────────────────────────────────────────────
// rows: array of { City, 'Kategori Barang', [metricCol]: number, ... } — di-mutate in place
// Menambahkan kolom: Log (10) X, Avg Log X, Ratio Log X, Kategori ABC (Log-Benchmark - X)
export function classifyAbcLogBenchmark(rows, metricCol) {
  const cleanMetric = metricCol.replace('SO ', '').replace('AVG ', '')
  const logCol      = `Log (10) ${cleanMetric}`
  const avgLogCol   = `Avg Log ${cleanMetric}`
  const ratioCol    = `Ratio Log ${cleanMetric}`
  const kategoriCol = `Kategori ABC (Log-Benchmark - ${cleanMetric})`

  // Step 1-2: rounded + log individu
  for (const row of rows) {
    const val     = Number(row[metricCol]) || 0
    const rounded = Math.round(val)
    row.__rounded = rounded
    const logInput = Math.max(1, rounded)
    row[logCol] = val > 0 ? Math.log10(logInput) : NaN
  }

  // Step 3: rata-rata log per City × Kategori Barang (hanya rounded >= 1)
  const avgMap = {}
  for (const row of rows) {
    if (row.__rounded < 1) continue
    const key = `${row.City}||${row['Kategori Barang']}`
    if (!avgMap[key]) avgMap[key] = { sum: 0, count: 0 }
    if (!isNaN(row[logCol])) { avgMap[key].sum += row[logCol]; avgMap[key].count++ }
  }

  for (const row of rows) {
    const key = `${row.City}||${row['Kategori Barang']}`
    row[avgLogCol] = avgMap[key] && avgMap[key].count > 0 ? avgMap[key].sum / avgMap[key].count : 0

    // Step 4: ratio (FIX div-by-zero)
    row[ratioCol] = row[avgLogCol] !== 0 ? row[logCol] / row[avgLogCol] : 0

    // Step 5: kategorisasi
    const metricVal = Number(row[metricCol]) || 0
    if (metricVal <= 0) {
      row[kategoriCol] = 'F'
    } else {
      const ratio = row[ratioCol]
      row[kategoriCol] = ratio > 2 ? 'A' : ratio > 1.5 ? 'B' : ratio > 1 ? 'C' : ratio > 0.5 ? 'D' : 'E'
    }
    delete row.__rounded
  }
  return rows
}

// ── Min / Max Stock (vectorized equivalent) ───────────────────────────────────
export function calcMinStock(row, kategoriCol, soCol) {
  const kat = row[kategoriCol]
  const so  = Number(row[soCol]) || 0
  if (so <= 0 || kat === 'F') return 0
  return ceil(so * (DAYS_MULTIPLIER[kat] ?? 1.0))
}

export function calcMaxStock(row, kategoriCol, soCol) {
  const kat = row[kategoriCol]
  const so  = Number(row[soCol]) || 0
  if (kat === 'F') return 1
  return ceil(so * (MAX_MULTIPLIER[kat] ?? 1.0))
}

export function calcAddStock(row, kategoriCol, minStockCol, stockCol) {
  if (row[kategoriCol] === 'F') return 0
  return clamp0((row[minStockCol] || 0) - (row[stockCol] || 0))
}

// ── Suggested PO V1 (proporsional) ────────────────────────────────────────────
// rows harus punya .__idx unik. Mengembalikan map idx → po
export function calculateSuggestedPo(rows) {
  const result = {}
  rows.forEach(r => { result[r.__idx] = 0 })
  const byItem = groupBy(rows, 'No. Barang')

  for (const group of Object.values(byItem)) {
    const sby    = group.filter(r => r.City === 'SURABAYA')
    const cabang = group.filter(r => r.City !== 'SURABAYA')
    const stockSbyVal = sumBy(sby, 'Stock Surabaya')
    const totalAdd     = sumBy(cabang, 'Add Stock')

    sby.forEach(r => result[r.__idx] = 0)
    if (totalAdd === 0) continue

    if (stockSbyVal >= totalAdd) {
      cabang.forEach(r => result[r.__idx] = Number(r['Add Stock']) || 0)
    } else {
      cabang.forEach(r => {
        const porsi = (Number(r['Add Stock']) || 0) / totalAdd
        result[r.__idx] = ceil(porsi * stockSbyVal)
      })
    }
  }
  return result
}

// ── Status Stock ──────────────────────────────────────────────────────────────
export function getStatusStock(row) {
  const kat = row[KAT_COL]
  const s   = Number(row['Stock Cabang']) || 0
  if (kat === 'F') return s > 2 ? 'Overstock F' : 'Balance'
  if (s > (row['Max Stock'] || 0)) return 'Overstock'
  if (s < (row['Min Stock'] || 0)) return 'Understock'
  if (s >= (row['Min Stock'] || 0)) return 'Balance'
  return '-'
}

// ── Persentase Stock ──────────────────────────────────────────────────────────
// SO WMA=0 & Stock>0 → 10000 (ada stok tanpa acuan SO), SO WMA=0 & Stock=0 → 0
export function calcPersentaseStock(row) {
  const minS = Number(row['Min Stock']) || 0
  if (minS > 0) return Math.round(((Number(row['Stock Cabang']) || 0) / minS) * 1000) / 10
  return (Number(row['Stock Cabang']) || 0) > 0 ? 10000 : 0
}

// ── Melt Stock by City ─────────────────────────────────────────────────────────
export function meltStockByCity(stockRows) {
  if (!stockRows.length) return []
  const allKeys = Object.keys(stockRows[0])
  const result  = []
  for (const [cityName, prefixes] of Object.entries(CITY_PREFIX_MAP)) {
    const cityCols = allKeys.filter(c => prefixes.some(p => c.startsWith(p)))
    if (!cityCols.length) continue
    for (const row of stockRows) {
      const stock = cityCols.reduce((s, c) => s + (Number(row[c]) || 0), 0)
      result.push({ 'No. Barang': String(row['No. Barang']).trim(), City: cityName, Stock: stock })
    }
  }
  return result
}

// ── Add Stock V2 (dengan bonus A/B) ───────────────────────────────────────────
export function calculateAddStockV2(row, kategoriCol, soCol, stockCol) {
  const kat      = row[kategoriCol]
  const so       = Number(row[soCol]) || 0
  const stock    = Number(row[stockCol]) || 0
  if (kat === 'F') return 0
  const mult     = DAYS_MULTIPLIER[kat] ?? 1.0
  const minStock = (so <= 0) ? 0 : ceil(so * mult)
  const base     = clamp0(minStock - stock)
  if (base <= 0) return 0
  const bonus = kat === 'A' ? ceil(minStock * 0.20) : kat === 'B' ? ceil(minStock * 0.10) : 0
  return base + bonus
}

// ── Suggested PO V2 (3 skenario) ──────────────────────────────────────────────
// rows harus punya .__idx unik
export function calculateSuggestedPoV2(rows) {
  const result = {}
  rows.forEach(r => { result[r.__idx] = 0 })
  const byItem = groupBy(rows, 'No. Barang')

  for (const group of Object.values(byItem)) {
    const sbyRows = group.filter(r => r.City === 'SURABAYA')
    const cabRows = group.filter(r => r.City !== 'SURABAYA')

    const stockSby    = sumBy(sbyRows, 'Stock Cabang')
    const minStockSby = sumBy(sbyRows, 'Min Stock')
    const stokSisa    = clamp0(stockSby - minStockSby)
    sbyRows.forEach(r => result[r.__idx] = 0)

    const eligible = cabRows.filter(r => r[KAT_COL] !== 'F' && (Number(r['Add Stock']) || 0) > 0)
    const allAddCabang = sumBy(eligible, 'Add Stock')
    if (allAddCabang === 0) continue

    // Skenario 1: KURANG
    if (stokSisa <= 0) continue

    // Skenario 3: OVER
    if (stokSisa >= allAddCabang) {
      eligible.forEach(r => result[r.__idx] = Number(r['Add Stock']) || 0)
      continue
    }

    // Skenario 2: TERBATAS — urgency: persen terkecil dulu
    const sorted = [...eligible].sort((a, b) =>
      (Number(a['Persentase Stock']) ?? 100) - (Number(b['Persentase Stock']) ?? 100))
    let sisa = stokSisa
    for (const r of sorted) {
      if (sisa <= 0) break
      const need = clamp0((Number(r['Min Stock']) || 0) / 2 - (Number(r['Stock Cabang']) || 0))
      if (need <= 0) continue
      const alloc = ceil(Math.min(need, sisa))
      result[r.__idx] = alloc
      sisa -= alloc
    }
  }
  return result
}

// ── Summary ALL V2 (per SKU) ──────────────────────────────────────────────────
export function calculateAllSummaryV2(rows) {
  const byItem = groupBy(rows, 'No. Barang')
  const result = []

  for (const group of Object.values(byItem)) {
    const sbyRows = group.filter(r => r.City === 'SURABAYA')
    const cabRows = group.filter(r => r.City !== 'SURABAYA')

    const stockSby      = sumBy(sbyRows, 'Stock Cabang')
    const minStockSby   = sumBy(sbyRows, 'Min Stock')
    const stokSisa       = clamp0(stockSby - minStockSby)
    const allAddCabang   = sumBy(cabRows, 'Add Stock')
    const addStockSby    = sumBy(sbyRows, 'Add Stock')
    const needSupplier   = clamp0(allAddCabang + addStockSby)

    const skenario = stokSisa <= 0 ? '1 - KURANG'
      : stokSisa >= allAddCabang ? '3 - OVER' : '2 - TERBATAS/LEBIH'

    const allStockCabang = sumBy(group, 'Stock Cabang')
    const allSoCabang    = sumBy(group, 'SO WMA')
    const allSuggestPo   = allStockCabang < allSoCabang ? 'PO' : 'NO'

    const first = group[0]
    const row = {}
    KEYS.forEach(k => { row[k] = first[k] })
    Object.assign(row, {
      All_Add_Stock_Cabang:   allAddCabang,
      All_Add_Stock_Surabaya: addStockSby,
      All_Need_From_Supplier: needSupplier,
      All_Restock_1_Bulan:    needSupplier > 0 ? 'PO' : 'NO',
      Skenario_Distribusi:    skenario,
      All_Stock_Cabang:       allStockCabang,
      All_SO_Cabang:          allSoCabang,
      All_Suggest_PO:         allSuggestPo,
    })
    result.push(row)
  }
  return result
}

// ── Donor Distribution (V3 Lateral Transfer dgn rules & distance) ─────────────
// df: array hasil V2 (per City × SKU), rules: {donorCity: {recvCity: bool}}, distance: {recvCity: [donorCity priority order]}
export function runDonorCalc(df, rules, distance) {
  const allRows = []
  const byItem  = groupBy(df, 'No. Barang')

  for (const group of Object.values(byItem)) {
    const maskSby = (r) => r.City === 'SURABAYA'
    const sbyRows = group.filter(maskSby)
    const cabRows = group.filter(r => !maskSby(r))

    const stockSby    = sumBy(sbyRows, 'Stock Cabang')
    const minStockSby = sumBy(sbyRows, 'Min Stock')
    const sisaSby      = clamp0(stockSby - minStockSby)

    const donors = cabRows
      .filter(r => r['Status Stock'] === 'Overstock' && r[KAT_COL] !== 'F')
      .map(r => ({ ...r, __avail: clamp0((Number(r['Stock Cabang'])||0) - (Number(r['Max Stock'])||0)) }))
      .filter(r => r.__avail > 0)

    const receivers = cabRows
      .filter(r => r['Status Stock'] === 'Understock' && r[KAT_COL] !== 'F')
      .sort((a,b) => (Number(a['Persentase Stock'])||0) - (Number(b['Persentase Stock'])||0))

    const totalNeed  = sumBy(receivers, 'Add Stock')
    const donorPool  = sumBy(donors, '__avail')
    const totalPool  = sisaSby + donorPool

    let skenario
    if (totalNeed === 0) skenario = '0 - TIDAK ADA KEBUTUHAN'
    else if (totalPool === 0) skenario = '1 - KURANG (TIDAK ADA POOL)'
    else if (sisaSby >= totalNeed) skenario = '2 - SBY CUKUP'
    else if (sisaSby > 0 && donors.length > 0) skenario = '3 - SBY TERBATAS + ADA DONOR'
    else if (sisaSby === 0 && donors.length > 0) skenario = '4 - HANYA DONOR CABANG'
    else skenario = '5 - POOL TIDAK CUKUP'

    const donorAvail = { SURABAYA: sisaSby }
    for (const d of donors) donorAvail[d.City] = d.__avail

    const qtyTerima  = {}
    const qtyDonor   = {}
    const terimaDari = {}
    const donorKe    = {}

    for (const rv of receivers) {
      const rcity = rv.City
      let need = Number(rv['Add Stock']) || 0
      const prio  = distance[rcity] || []
      const extra = Object.keys(donorAvail).filter(c => !prio.includes(c))
      for (const dcity of [...prio, ...extra]) {
        if (need <= 0) break
        const avail = donorAvail[dcity] || 0
        if (avail <= 0) continue
        if (rules[dcity] && rules[dcity][rcity] === false) continue
        const alloc = ceil(Math.min(need, avail))
        qtyTerima[rcity] = (qtyTerima[rcity]||0) + alloc
        qtyDonor[dcity]  = (qtyDonor[dcity]||0)  + alloc
        terimaDari[rcity] = terimaDari[rcity] || []; terimaDari[rcity].push(dcity)
        donorKe[dcity]     = donorKe[dcity]     || []; donorKe[dcity].push(rcity)
        donorAvail[dcity] -= alloc
        need -= alloc
      }
    }

    const first = group[0]
    const meta  = {}; KEYS.forEach(k => { meta[k] = first[k] })

    for (const row of group) {
      const city  = row.City
      const bisa  = (row['Status Stock'] === 'Overstock' && row[KAT_COL] !== 'F')
        ? clamp0((Number(row['Stock Cabang'])||0) - (Number(row['Max Stock'])||0)) : 0
      const sisaPo = row['Status Stock'] === 'Understock'
        ? clamp0((Number(row['Add Stock'])||0) - (qtyTerima[city]||0)) : 0

      allRows.push({
        ...meta,
        City: city,
        'Kategori ABC': row[KAT_COL] ?? '-',
        'Stock Cabang': Number(row['Stock Cabang']) || 0,
        'Min Stock':    Number(row['Min Stock']) || 0,
        'Max Stock':    Number(row['Max Stock']) || 0,
        'Add Stock':    Number(row['Add Stock']) || 0,
        'Status Stock': row['Status Stock'],
        '% Stock':      Math.round((Number(row['Persentase Stock']) || 0) * 10) / 10,
        Qty_Bisa_Donor: bisa,
        Donor_Ke:       (donorKe[city] || []).join(', ') || '-',
        Qty_Donor:      qtyDonor[city] || 0,
        Terima_Dari:    (terimaDari[city] || []).join(', ') || '-',
        Qty_Terima:     qtyTerima[city] || 0,
        Sisa_PO_Supplier: sisaPo,
        Skenario:       skenario,
        Total_Pool:     totalPool,
        Total_Need:     totalNeed,
      })
    }
  }
  return allRows
}

export function defaultDonorRules() {
  const r = {}
  for (const d of ALL_CITIES) {
    r[d] = {}
    for (const p of ALL_CITIES) r[d][p] = d === p ? false : true
  }
  return r
}

export const DEFAULT_DISTANCE_PRIORITY = {
  JAKARTA:  ['SURABAYA','SEMARANG','JOGJA','MALANG','BALI'],
  SEMARANG: ['SURABAYA','JOGJA','MALANG','JAKARTA','BALI'],
  JOGJA:    ['SURABAYA','SEMARANG','MALANG','BALI','JAKARTA'],
  MALANG:   ['SURABAYA','JOGJA','SEMARANG','BALI','JAKARTA'],
  BALI:     ['SURABAYA','MALANG','JOGJA','SEMARANG','JAKARTA'],
  SURABAYA: [],
}

// ── Platform Mapping (ABC V3) ──────────────────────────────────────────────────
const ONLINE_FAKTUR_RE = /^(AO|BO|DO|EO|FO|HO)/i
export function mapPlatform(row) {
  const nama   = String(row['Nama Pelanggan'] ?? '').trim().toUpperCase()
  const faktur = String(row['No. Faktur'] ?? '').trim().toUpperCase()
  if (nama.startsWith('AIRPAY')) return 'Online'
  if (nama.includes('- SHOPEE') || nama.endsWith('SHOPEE')) return 'Online'
  if (nama.startsWith('TOKOPEDIA')) return 'Online'
  if (ONLINE_FAKTUR_RE.test(faktur)) return 'Online'
  return 'Offline'
}

// ── Styling helpers (warna ringkas, tidak perlu 100% identik Streamlit) ───────
export function colorKategoriAbc(val) {
  const warna = { A:'#cce5ff', B:'#d4edda', C:'#fff3cd', D:'#f8d7da', E:'#e9ecef', F:'#6c757d' }
  const color = warna[val] ?? ''
  const text  = val === 'F' ? 'white' : 'black'
  return { background: color, color: text }
}

export function colorStatusStock(val) {
  const c = { Understock:'#fff3cd', Balance:'#d4edda', Overstock:'#ffd6a5', 'Overstock F':'#f5c6cb' }
  return { background: c[val] ?? '' }
}

export const SKENARIO_COLOR = {
  '0 - TIDAK ADA KEBUTUHAN':      '#d4edda',
  '2 - SBY CUKUP':                '#cce5ff',
  '3 - SBY TERBATAS + ADA DONOR': '#fff3cd',
  '4 - HANYA DONOR CABANG':       '#ffe5b4',
  '5 - POOL TIDAK CUKUP':         '#f8d7da',
  '1 - KURANG (TIDAK ADA POOL)':  '#f5c6cb',
  '1 - KURANG':                   '#f5c6cb',
  '2 - TERBATAS/LEBIH':           '#fff3cd',
  '3 - OVER':                     '#d4edda',
}
export function colorSkenario(val) { return { background: SKENARIO_COLOR[val] ?? '' } }

// ── Deduplication helper (Faktur + Barang) ────────────────────────────────────
export function deduplicatePenjualan(rows) {
  const seen  = new Set()
  const dupes = []
  const clean = []
  for (const r of rows) {
    const fakturKey = String(r['No. Faktur'] ?? '').trim()
    const barangKey = String(r['No. Barang'] ?? '').trim()
    const key = fakturKey + barangKey
    if (seen.has(key)) dupes.push(r)
    else { seen.add(key); clean.push(r) }
  }
  return { clean, dupes }
}

// ── Date utilities ────────────────────────────────────────────────────────────
export function maxDate(rows, col) {
  let max = null
  for (const r of rows) {
    const d = new Date(r[col])
    if (!isNaN(d) && (max === null || d > max)) max = d
  }
  return max
}

export function minDate(rows, col) {
  let min = null
  for (const r of rows) {
    const d = new Date(r[col])
    if (!isNaN(d) && (min === null || d < min)) min = d
  }
  return min
}

export function parseDateFromFilename(filename) {
  const m = filename.match(/(\d{8})/)
  if (!m) return null
  const s = m[1]
  try {
    // format ddmmyyyy
    const dd = s.slice(0,2), mm = s.slice(2,4), yyyy = s.slice(4)
    const d = new Date(`${yyyy}-${mm}-${dd}`)
    return isNaN(d) ? null : d
  } catch { return null }
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function toISODate(date) {
  return new Date(date).toISOString().slice(0, 10)
}

// Bikin label "Bulan Tahun" Indonesia dari Date, untuk kolom bulanan
export function periodLabel(date) {
  const d = new Date(date)
  return `${BULAN_INDONESIA[d.getMonth() + 1]} ${d.getFullYear()}`
}
export function periodKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

// ── Export ke Excel (XLSX) — multi-sheet support ──────────────────────────────
export async function exportToExcel(rows, filename = 'export.xlsx') {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

export async function exportMultiSheetExcel(sheets, filename = 'export.xlsx') {
  // sheets: [{ name: 'Sheet1', rows: [...] }, ...]
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    if (!rows || !rows.length) continue
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename)
}
