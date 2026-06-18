/**
 * utils/fileReader.js
 * Membaca file Excel (.xlsx) dan CSV di browser menggunakan SheetJS.
 */

export async function readExcelFile(file, options = {}) {
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheetName = options.sheetName ?? wb.SheetNames[0]
  const ws   = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan`)

  const raw = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    skipHidden: true,
    ...( options.skipRows ? { range: options.skipRows } : {} ),
  })
  return raw
}

export async function readExcelFileRaw(file, { sheetName, skipRows = 0, header = null } = {}) {
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array', cellDates: true })
  const sn   = sheetName ?? wb.SheetNames[0]
  const ws   = wb.Sheets[sn]
  if (!ws) throw new Error(`Sheet "${sn}" tidak ditemukan`)

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const dataRows = skipRows > 0 ? rows.slice(skipRows) : rows

  if (header) {
    return dataRows.map(row => {
      const obj = {}
      header.forEach((h, i) => { obj[h] = row[i] ?? '' })
      return obj
    })
  }

  // Baris pertama setelah skip sebagai header
  const [head, ...body] = dataRows
  return body.map(row => {
    const obj = {}
    ;(head || []).forEach((h, i) => { obj[String(h)] = row[i] ?? '' })
    return obj
  })
}

/**
 * Baca file produk referensi
 * Sheet: "Sheet1 (2)", skipRows=6, usecols=[0,1,2,3]
 */
export async function readProdukFile(file) {
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array', cellDates: true })
  const sn   = 'Sheet1 (2)'
  const ws   = wb.Sheets[sn] ?? wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const body = rows.slice(6)
  const cols = ['No. Barang','BRAND Barang','Kategori Barang','Nama Barang']
  return body
    .filter(r => r[0] !== '')
    .map(r => {
      const obj = {}
      cols.forEach((c, i) => { obj[c] = String(r[i] ?? '').trim() })
      return obj
    })
}

/**
 * Baca file stock
 * Sheet: "Sheet1", skipRows=9, header manual
 */
export async function readStockFile(file) {
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws   = wb.Sheets['Sheet1'] ?? wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const body = rows.slice(9)
  const header = [
    'No. Barang','Keterangan Barang',
    'A - ITC','AT - TRANSIT ITC','B','BT - TRANSIT JKT',
    'C','C6','CT - TRANSIT PUSAT','D - SMG','DT - TRANSIT SMG',
    'E - JOG','ET - TRANSIT JOG','F - MLG','FT - TRANSIT MLG',
    'H - BALI','HT - TRANSIT BALI','X','Y - SBY','Y3 - Display Y','YT - TRANSIT Y',
  ]
  return body
    .filter(r => r[0] !== '')
    .map(r => {
      const obj = {}
      header.forEach((h, i) => { obj[h] = r[i] ?? '' })
      return obj
    })
}

/**
 * Baca file penjualan (CSV atau XLSX)
 */
export async function readPenjualanFile(file) {
  if (file.name.endsWith('.csv')) {
    return readCsvFile(file)
  }
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

async function readCsvFile(file) {
  const text = await file.text()
  const lines = text.split('\n')
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',')
    const obj  = {}
    header.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim().replace(/^"|"$/g,'') })
    return obj
  })
}
