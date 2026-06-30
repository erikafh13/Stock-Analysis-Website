/**
 * utils/gdrive.js
 * Helper untuk akses Google Drive melalui backend serverless (/api/drive/*).
 */

const BASE = ''  // path relatif — frontend & API satu domain saat deploy di Vercel

export const FOLDER_PENJUALAN      = '1Okgw8qHVM8HyBwnTUFHbmYkNKqCcswNZ'
export const FOLDER_PRODUK         = '1UdGbFzZ2Wv83YZLNwdU-rgY-LXlczsFv'
export const FOLDER_STOCK          = '1PMeH_wvgRUnyiZyZ_wrmKAATX9JyWzq_'
export const FOLDER_HASIL_ANALISIS = '1TE4a8IegbWDKoVeLPG_oCbuU-qnhd1jE'
export const FOLDER_PORTAL         = '1GOKVWugUMqN9aOWYCeFlKj-qTr2dA7_u'

export async function listFilesInFolder(folderId) {
  const resp = await fetch(`${BASE}/api/drive/list?folderId=${folderId}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function downloadFile(fileId) {
  const resp = await fetch(`${BASE}/api/drive/download?fileId=${fileId}`)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${resp.status}`)
  }
  return resp.arrayBuffer()
}
