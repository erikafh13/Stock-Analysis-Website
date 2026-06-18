// api/drive/list.js
import { google } from 'googleapis'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const { folderId } = req.query
    if (!folderId) return res.status(400).json({ error: 'folderId wajib diisi' })

    const resp = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 100,
    })

    res.status(200).json(resp.data.files || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
