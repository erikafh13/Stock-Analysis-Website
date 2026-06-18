const { google } = require('googleapis')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.GOOGLE_CREDENTIALS) {
    return res.status(500).json({ error: 'GOOGLE_CREDENTIALS tidak ditemukan' })
  }

  let credentials
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
    }
  } catch (e) {
    return res.status(500).json({ error: `JSON parse error: ${e.message}` })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })

    const { fileId } = req.query
    if (!fileId) return res.status(400).json({ error: 'fileId wajib diisi' })

    const resp = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    res.setHeader('Content-Type', 'application/octet-stream')
    res.status(200).send(Buffer.from(resp.data))
  } catch (e) {
    console.error('Drive download error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
