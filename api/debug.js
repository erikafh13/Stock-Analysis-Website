module.exports = function handler(req, res) {
  res.status(200).json({
    hasCredentials: !!process.env.GOOGLE_CREDENTIALS,
    preview: process.env.GOOGLE_CREDENTIALS
      ? process.env.GOOGLE_CREDENTIALS.slice(0, 30) + '...'
      : 'TIDAK ADA',
    allEnvKeys: Object.keys(process.env).filter(k => !k.includes('npm')),
  })
}
