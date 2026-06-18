// src/utils/gdrive.js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const FOLDER_PENJUALAN      = '1Okgw8qHVM8HyBwnTUFHbmYkNKqCcswNZ'
export const FOLDER_PRODUK         = '1UdGbFzZ2Wv83YZLNwdU-rgY-LXlczsFv'
export const FOLDER_STOCK          = '1PMeH_wvgRUnyiZyZ_wrmKAATX9JyWzq_'
export const FOLDER_HASIL_ANALISIS = '1TE4a8IegbWDKoVeLPG_oCbuU-qnhd1jE'
export const FOLDER_PORTAL         = '1GOKVWugUMqN9aOWYCeFlKj-qTr2dA7_u'

// List file di folder Drive
export async function listFilesInFolder(folderId) {
  const resp = await fetch(`${BASE}/api/drive/list?folderId=${folderId}`)
  if (!resp.ok) throw new Error('Gagal list folder Drive')
  return resp.json()  // [{id, name}, ...]
}

// Download file sebagai ArrayBuffer → bisa langsung ke SheetJS
export async function downloadFile(fileId) {
  const resp = await fetch(`${BASE}/api/drive/download?fileId=${fileId}`)
  if (!resp.ok) throw new Error('Gagal download file Drive')
  return resp.arrayBuffer()
}
