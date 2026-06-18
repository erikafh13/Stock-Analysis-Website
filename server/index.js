// server/index.js
import express from 'express'
import cors from 'cors'
import { google } from 'googleapis'

const app  = express()
app.use(cors())
app.use(express.json())

// Load credentials dari environment variable (JSON string)
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}')

function getDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// GET /api/drive/list?folderId=xxx
app.get('/api/drive/list', async (req, res) => {
  try {
    const drive  = getDrive()
    const { folderId } = req.query
    const resp   = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    })
    res.json(resp.data.files)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/drive/download?fileId=xxx
app.get('/api/drive/download', async (req, res) => {
  try {
    const drive  = getDrive()
    const { fileId } = req.query
    const resp   = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )
    res.setHeader('Content-Type', 'application/octet-stream')
    resp.data.pipe(res)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(3001, () => console.log('Drive API proxy running on :3001'))
