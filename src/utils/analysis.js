/**
 * utils/analysis.js
 * Semua fungsi kalkulasi & analisis diport dari Python ke JavaScript.
 * Setara dengan utils/analysis.py pada versi Streamlit.
 */

// ── Konstanta ─────────────────────────────────────────────────────────────────
export const DAYS_MULTIPLIER = { A: 1.00, B: 1.00, C: 0.75, D: 0.50, E: 0.25, F: 0.00 }
export const MAX_MULTIPLIER  = { A: 2.0,  B: 2.0,  C: 1.5,  D: 1.0,  E: 1.0,  F: 0.0  }

export const BULAN_INDONESIA = {
  1:'JANUARI',2:'FEBRUARI',3:'MARET',4:'APRIL',5:'MEI',6:'JUNI',
  7:'JULI',8:'AGUSTUS',9:'SEPTEMBER',10:'OKTOBER',11:'NOVEMBER',12:'DESEMBER'
}

export const CITY_PREFIX_MAP = {
  SURABAYA: ['A - ITC','AT - TRANSIT ITC','C','C6','CT - TRANSIT PUSAT','Y - SBY','Y3 - Display Y','YT - TRANSIT Y'],
  JAKARTA:  ['B','BT - TRANSIT JKT'],
  SEMARANG: ['D - SMG','DT - TRANSIT SMG'],
  JOGJA:    ['E - JOG','ET - TRANSIT JOG'],
  MALANG:   ['F - MLG','FT - TRANSIT MLG'],
  BALI:     ['H - BALI','HT - TRANSIT BALI'],
}

export const LEAD_TIME_CABANG   = 7
export const LEAD_TIME_SUPPLIER = 30

// ── Helper ────────────────────────────────────────────────────────────────────
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
function max(a, b) { return Math.max(a, b) }

// ── WMA ───────────────────────────────────────────────────────────────────────
export function calculateDailyWma(group, endDate) {
  const end  = new Date(endDate)
  const r1s  = new Date(end); r1s.setDate(r1s.getDate() - 29)
  const r2s  = new Date(end); r2s.setDate(r2s.getDate() - 59)
  const r2e  = new Date(end); r2e.setDate(r2e.getDate() - 30)
  const r3s  = new Date(end); r3s.setDate(r3s.getDate() - 89)
  const r3e  = new Date(end); r3e.setDate(r3e.getDate() - 60)

  let s1=0, s2=0, s3=0
  for (const row of group) {
    const d = new Date(row['Tgl Faktur'])
    const q = Number(row['Kuantitas']) || 0
    if (d >= r1s && d <= end) s1 += q
    else if (d >= r2s && d <= r2e) s2 += q
    else if (d >= r3s && d <= r3e) s3 += q
  }
  return ceil(s1*0.5 + s2*0.3 + s3*0.2)
}

// ── ABC Log-Benchmark ─────────────────────────────────────────────────────────
function applyCategory(metricVal, ratio) {
  if (!metricVal || metricVal <= 0) return 'F'
  if (ratio > 2)   return 'A'
  if (ratio > 1.5) return 'B'
  if (ratio > 1)   return 'C'
  if (ratio > 0.5) return 'D'
  return 'E'
}

export function classifyAbcLogBenchmark(rows, metricCol) {
  const cleanMetric = metricCol.replace('SO ','').replace('AVG ','')
  const logCol      = `Log (10) ${cleanMetric}`
  const avgLogCol   = `Avg Log ${cleanMetric}`
  const ratioCol    = `Ratio Log ${cleanMetric}`
  const kategoriCol = `Kategori ABC (Log-Benchmark - ${cleanMetric})`

  // Step 1-2: log individu
  for (const row of rows) {
    const val    = Number(row[metricCol]) || 0
    const rounded = Math.round(val)
    row._rounded  = rounded
    const logInput = Math.max(1, rounded)
    row[logCol]   = val > 0 ? Math.log10(logInput) : NaN
  }

  // Step 3: rata-rata log per City × Kategori Barang
  const avgMap = {}
  for (const row of rows) {
    if (row._rounded < 1) continue
    const key = `${row.City}||${row['Kategori Barang']}`
    if (!avgMap[key]) avgMap[key] = { sum: 0, count: 0 }
    if (!isNaN(row[logCol])) { avgMap[key].sum += row[logCol]; avgMap[key].count++ }
  }

  for (const row of rows) {
    const key = `${row.City}||${row['Kategori Barang']}`
    row[avgLogCol] = avgMap[key] && avgMap[key].count > 0
      ? avgMap[key].sum / avgMap[key].count : 0

    // Step 4: ratio
    row[ratioCol] = row[avgLogCol] !== 0 ? row[logCol] / row[avgLogCol] : 0

    // Step 5: kategori
    row[kategoriCol] = applyCategory(Number(row[metricCol]) || 0, row[ratioCol])

    delete row._rounded
  }

  return rows
}

// ── Min / Max / Add Stock ─────────────────────────────────────────────────────
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
  return max(0, (row[minStockCol] || 0) - (row[stockCol] || 0))
}

// ── Suggested PO V1 ───────────────────────────────────────────────────────────
export function calculateSuggestedPo(rows) {
  const byItem = groupBy(rows, 'No. Barang')
  const result = {}

  for (const [noBarang, group] of Object.entries(byItem)) {
    const sby    = group.filter(r => r.City === 'SURABAYA')
    const cabang = group.filter(r => r.City !== 'SURABAYA')
    const stockSby  = sby.reduce((s,r) => s + (Number(r['Stock Surabaya']) || 0), 0)
    const totalAdd  = cabang.reduce((s,r) => s + (Number(r['Add Stock']) || 0), 0)

    if (totalAdd === 0) { group.forEach(r => result[r._idx] = 0); continue }

    if (stockSby >= totalAdd) {
      cabang.forEach(r => result[r._idx] = Number(r['Add Stock']) || 0)
    } else {
      cabang.forEach(r => {
        const porsi = (Number(r['Add Stock']) || 0) / totalAdd
        result[r._idx] = ceil(porsi * stockSby)
      })
    }
    sby.forEach(r => result[r._idx] = 0)
  }
  return result
}

// ── Status Stock ──────────────────────────────────────────────────────────────
export function getStatusStock(row) {
  const kat = row['Kategori ABC (Log-Benchmark - WMA)']
  const s   = Number(row['Stock Cabang']) || 0
  if (kat === 'F') return s > 2 ? 'Overstock F' : 'Balance'
  if (s > (row['Max Stock'] || 0)) return 'Overstock'
  if (s < (row['Min Stock'] || 0)) return 'Understock'
  return 'Balance'
}

// ── Persentase Stock ──────────────────────────────────────────────────────────
export function calcPersentaseStock(row) {
  const minS = Number(row['Min Stock']) || 0
  if (minS === 0) return 0
  return Math.round(((Number(row['Stock Cabang']) || 0) / minS) * 1000) / 10
}

// ── Melt Stock by City ────────────────────────────────────────────────────────
export function meltStockByCity(stockRows) {
  const allKeys = Object.keys(stockRows[0] || {})
  const result  = []
  for (const [cityName, prefixes] of Object.entries(CITY_PREFIX_MAP)) {
    const cityCols = allKeys.filter(c => prefixes.some(p => c.startsWith(p)))
    for (const row of stockRows) {
      const stock = cityCols.reduce((s, c) => s + (Number(row[c]) || 0), 0)
      result.push({ 'No. Barang': row['No. Barang'], City: cityName, Stock: stock })
    }
  }
  return result
}

// ── Add Stock V2 ──────────────────────────────────────────────────────────────
export function calculateAddStockV2(row, kategoriCol, soCol, stockCol) {
  const kat      = row[kategoriCol]
  const so       = Number(row[soCol]) || 0
  const stock    = Number(row[stockCol]) || 0
  const mult     = DAYS_MULTIPLIER[kat] ?? 1.0
  const minStock = (so <= 0 || kat === 'F') ? 0 : ceil(so * mult)
  const base     = max(0, minStock - stock)
  if (kat === 'F') return 0
  if (base <= 0)   return 0
  const bonus = kat === 'A' ? ceil(minStock * 0.20)
              : kat === 'B' ? ceil(minStock * 0.10) : 0
  return base + bonus
}

// ── Suggested PO V2 ──────────────────────────────────────────────────────────
export function calculateSuggestedPoV2(rows) {
  const result  = {}
  rows.forEach((r, i) => { r._idx = i; result[i] = 0 })
  const byItem  = groupBy(rows, 'No. Barang')
  const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'

  for (const [, group] of Object.entries(byItem)) {
    const sbys   = group.filter(r => r.City === 'SURABAYA')
    const cabs   = group.filter(r => r.City !== 'SURABAYA')
    const stockSby    = sbys.reduce((s,r) => s + (Number(r['Stock Cabang'])||0), 0)
    const minStockSby = sbys.reduce((s,r) => s + (Number(r['Min Stock'])||0), 0)
    const stokSisa    = max(0, stockSby - minStockSby)

    sbys.forEach(r => result[r._idx] = 0)

    const eligible = cabs.filter(r => r[KAT_COL] !== 'F' && (Number(r['Add Stock'])||0) > 0)
    const allAdd   = eligible.reduce((s,r) => s + (Number(r['Add Stock'])||0), 0)
    if (allAdd === 0) continue

    if (stokSisa <= 0) continue

    if (stokSisa >= allAdd) {
      eligible.forEach(r => result[r._idx] = Number(r['Add Stock'])||0)
      continue
    }

    // Terbatas — urgency sort
    const sorted = [...eligible].sort((a,b) =>
      (Number(a['Persentase Stock'])||100) - (Number(b['Persentase Stock'])||100))
    let sisa = stokSisa
    const po = {}
    for (const r of sorted) {
      if (sisa <= 0) break
      const need = max(0, (Number(r['Min Stock'])||0)/2 - (Number(r['Stock Cabang'])||0))
      if (need <= 0) continue
      const alloc = ceil(Math.min(need, sisa))
      po[r._idx]  = alloc
      sisa        -= alloc
    }
    eligible.forEach(r => result[r._idx] = po[r._idx] ?? 0)
  }

  return result
}

// ── Summary V2 ────────────────────────────────────────────────────────────────
export function calculateAllSummaryV2(rows) {
  const byItem = groupBy(rows, 'No. Barang')
  const result = []
  const KEYS   = ['No. Barang','Kategori Barang','BRAND Barang','Nama Barang']

  for (const [, group] of Object.entries(byItem)) {
    const sbys = group.filter(r => r.City === 'SURABAYA')
    const cabs = group.filter(r => r.City !== 'SURABAYA')
    const stockSby    = sbys.reduce((s,r) => s + (Number(r['Stock Cabang'])||0), 0)
    const minStockSby = sbys.reduce((s,r) => s + (Number(r['Min Stock'])||0), 0)
    const stokSisa    = max(0, stockSby - minStockSby)
    const allAddCabang = cabs.reduce((s,r) => s + (Number(r['Add Stock'])||0), 0)
    const addStockSby  = sbys.reduce((s,r) => s + (Number(r['Add Stock'])||0), 0)
    const needSupplier = max(0, allAddCabang + addStockSby)
    const allStockCab  = group.reduce((s,r) => s + (Number(r['Stock Cabang'])||0), 0)
    const allSoCab     = group.reduce((s,r) => s + (Number(r['SO WMA'])||0), 0)

    const skenario = stokSisa <= 0 ? '1 - KURANG'
      : stokSisa >= allAddCabang ? '3 - OVER' : '2 - TERBATAS/LEBIH'

    const first = group[0]
    const row = {}
    KEYS.forEach(k => { row[k] = first[k] })
    Object.assign(row, {
      All_Add_Stock_Cabang:   allAddCabang,
      All_Need_From_Supplier: needSupplier,
      All_Restock_1_Bulan:    needSupplier > 0 ? 'PO' : 'NO',
      Skenario_Distribusi:    skenario,
      All_Stock_Cabang:       allStockCab,
      All_SO_Cabang:          allSoCab,
      All_Suggest_PO:         allStockCab < allSoCab ? 'PO' : 'NO',
    })
    result.push(row)
  }
  return result
}

// ── Donor Calculation ─────────────────────────────────────────────────────────
export function calculateDonorDistribution(rows) {
  const KAT_COL = 'Kategori ABC (Log-Benchmark - WMA)'
  const KEYS    = ['No. Barang','Kategori Barang','BRAND Barang','Nama Barang']
  const byItem  = groupBy(rows, 'No. Barang')
  const result  = []

  for (const [, group] of Object.entries(byItem)) {
    const sbys   = group.filter(r => r.City === 'SURABAYA')
    const cabs   = group.filter(r => r.City !== 'SURABAYA')
    const stockSby    = sbys.reduce((s,r) => s + (Number(r['Stock Cabang'])||0), 0)
    const minStockSby = sbys.reduce((s,r) => s + (Number(r['Min Stock'])||0), 0)
    const sisaSby     = max(0, stockSby - minStockSby)

    const donors    = cabs.filter(r => r['Status Stock'] === 'Overstock' && r[KAT_COL] !== 'F')
      .map(r => ({ ...r, _avail: max(0, (Number(r['Stock Cabang'])||0) - (Number(r['Max Stock'])||0)) }))
      .filter(r => r._avail > 0)
      .sort((a,b) => b._avail - a._avail)

    const receivers = cabs.filter(r => r['Status Stock'] === 'Understock' && r[KAT_COL] !== 'F')
      .sort((a,b) => (Number(a['Persentase Stock'])||0) - (Number(b['Persentase Stock'])||0))

    const totalNeed  = receivers.reduce((s,r) => s + (Number(r['Add Stock'])||0), 0)
    const totalDonor = donors.reduce((s,r) => s + r._avail, 0)
    const totalPool  = sisaSby + totalDonor

    let skenario = '0 - TIDAK ADA KEBUTUHAN'
    if (totalNeed > 0) {
      if (totalPool === 0) skenario = '1 - KURANG (TIDAK ADA POOL)'
      else if (sisaSby >= totalNeed) skenario = '2 - SBY CUKUP'
      else if (sisaSby > 0 && totalDonor > 0) skenario = '3 - SBY TERBATAS + ADA DONOR'
      else if (sisaSby === 0 && totalDonor > 0) skenario = '4 - HANYA DONOR CABANG'
      else skenario = '5 - POOL TIDAK CUKUP'
    }

    // Alokasi
    const qtyTerima  = {}; receivers.forEach(r => qtyTerima[r.City] = 0)
    const qtyDonor   = {}; donors.forEach(r => qtyDonor[r.City] = 0)
    const donorTo    = {}; donors.forEach(r => donorTo[r.City] = [])
    const sbyTo      = []
    const terimaOf   = {}; receivers.forEach(r => terimaOf[r.City] = [])
    let sisaSbyPool  = sisaSby
    let sbyDonated   = 0

    for (const recv of receivers) {
      let need = Number(recv['Add Stock']) || 0
      if (need <= 0) continue

      if (sisaSbyPool > 0) {
        const take  = Math.min(need, sisaSbyPool)
        const alloc = ceil(take)
        qtyTerima[recv.City] = (qtyTerima[recv.City] || 0) + alloc
        sbyDonated   += alloc
        sbyTo.push(recv.City)
        terimaOf[recv.City].push('SURABAYA')
        sisaSbyPool  -= alloc
        need         -= alloc
      }

      for (const donor of donors) {
        if (need <= 0) break
        const avail = donor._avail - (qtyDonor[donor.City] || 0)
        if (avail <= 0) continue
        const take  = Math.min(need, avail)
        const alloc = ceil(take)
        qtyTerima[recv.City] = (qtyTerima[recv.City] || 0) + alloc
        qtyDonor[donor.City] = (qtyDonor[donor.City] || 0) + alloc
        donorTo[donor.City].push(recv.City)
        terimaOf[recv.City].push(donor.City)
        need -= alloc
      }
    }

    const first = group[0]
    const meta  = {}; KEYS.forEach(k => { meta[k] = first[k] })

    for (const row of group) {
      const isSby = row.City === 'SURABAYA'
      const dTo   = isSby ? (sbyTo.join(', ') || '-')
                          : (donorTo[row.City]?.join(', ') || '-')
      const dQty  = isSby ? sbyDonated : (qtyDonor[row.City] || 0)
      const rFrom = terimaOf[row.City]?.join(', ') || '-'
      const rQty  = qtyTerima[row.City] || 0
      const sisaNeed = receivers.find(r => r.City === row.City)
        ? max(0, (Number(row['Add Stock'])||0) - rQty) : 0

      result.push({
        ...meta,
        City:                 row.City,
        'Kategori ABC':       row[KAT_COL] ?? '-',
        'Stock Cabang':       Number(row['Stock Cabang']) || 0,
        'Min Stock':          Number(row['Min Stock']) || 0,
        'Max Stock':          Number(row['Max Stock']) || 0,
        'Add Stock':          Number(row['Add Stock']) || 0,
        'Status Stock':       row['Status Stock'],
        'Persentase Stock':   Number(row['Persentase Stock']) || 0,
        Qty_Bisa_Donor:       row['Status Stock'] === 'Overstock' && row[KAT_COL] !== 'F'
                                ? max(0, (Number(row['Stock Cabang'])||0) - (Number(row['Max Stock'])||0)) : 0,
        Donor_Ke:             dTo,
        Qty_Donor:            dQty,
        Terima_Dari:          rFrom,
        Qty_Terima:           rQty,
        Sisa_Need_Supplier:   sisaNeed,
        Skenario_Donor:       skenario,
        Total_Pool:           totalPool,
        Total_Need:           totalNeed,
      })
    }
  }
  return result
}

// ── Platform Mapping (ABC V3) ─────────────────────────────────────────────────
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

// ── Styling helpers ───────────────────────────────────────────────────────────
export function colorKategoriAbc(val) {
  const warna = { A:'#cce5ff', B:'#d4edda', C:'#fff3cd', D:'#f8d7da', E:'#e9ecef', F:'#6c757d' }
  const text  = val === 'F' ? 'white' : 'black'
  return { background: warna[val] ?? '', color: text }
}

export function colorStatusStock(val) {
  const c = { Understock:'#fff3cd', Balance:'#d4edda', Overstock:'#ffd6a5', 'Overstock F':'#f5c6cb' }
  return { background: c[val] ?? '' }
}

export function colorSkenario(val) {
  const c = {
    '0 - TIDAK ADA KEBUTUHAN':      '#d4edda',
    '2 - SBY CUKUP':                '#cce5ff',
    '3 - SBY TERBATAS + ADA DONOR': '#fff3cd',
    '4 - HANYA DONOR CABANG':       '#ffe5b4',
    '5 - POOL TIDAK CUKUP':         '#f8d7da',
    '1 - KURANG (TIDAK ADA POOL)':  '#f5c6cb',
  }
  return { background: c[val] ?? '' }
}

// ── Deduplication helper ──────────────────────────────────────────────────────
export function deduplicatePenjualan(rows) {
  const seen = new Set()
  const dupes = []
  const clean = []
  for (const r of rows) {
    const key = String(r['No. Faktur']??'').trim() + String(r['No. Barang']??'').trim()
    if (seen.has(key)) { dupes.push(r) } else { seen.add(key); clean.push(r) }
  }
  return { clean, dupes }
}

// ── Generic group-by ──────────────────────────────────────────────────────────
export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key]; (acc[k] = acc[k] ?? []).push(item); return acc
  }, {})
}

// ── Extract tgl faktur max ────────────────────────────────────────────────────
export function maxDate(rows, col) {
  let max = null
  for (const r of rows) {
    const d = new Date(r[col])
    if (!isNaN(d) && (max === null || d > max)) max = d
  }
  return max
}

// ── Parse date from filename ──────────────────────────────────────────────────
export function parseDateFromFilename(filename) {
  const m = filename.match(/(\d{8})/)
  if (!m) return null
  const s = m[1]
  try {
    const d = new Date(`${s.slice(4)}-${s.slice(2,4)}-${s.slice(0,2)}`)
    return isNaN(d) ? null : d
  } catch { return null }
}

// ── Export ke Excel (XLSX) ────────────────────────────────────────────────────
export function exportToExcel(rows, filename = 'export.xlsx') {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, filename)
  })
}
