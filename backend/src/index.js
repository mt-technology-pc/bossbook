import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import healthRouter from './routes/health.js'
import meRouter from './routes/me.js'
import assistantRouter from './routes/assistant.js'
import backupRouter from './routes/backup.js'
import adminRouter from './routes/admin.js'
import emailRouter from './routes/email.js'

const app = express()
const PORT = process.env.PORT || 4000
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Pure JSON API, no HTML views — helmet's defaults (CSP, X-Frame-Options,
// X-Content-Type-Options, disabling X-Powered-By, etc.) apply cleanly
// with no route-specific tuning needed.
app.use(helmet())
app.use(cors({ origin: allowedOrigin }))
// 10mb (not the default ~100kb): invoice/receipt PDFs are uploaded as
// base64 JSON for the email-sending route, which is meaningfully bigger
// than every other request body this API handles.
app.use(express.json({ limit: '10mb' }))
app.use(morgan('dev'))

// Generous baseline (this isn't a public-signup service — every route is
// either auth-gated or trivial) with a per-route stricter limit layered
// on top where it actually matters (the paid-LLM assistant endpoint).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}))

app.use('/api/health', healthRouter)
app.use('/api/me', meRouter)
app.use('/api/assistant', assistantRouter)
app.use('/api/backup', backupRouter)
app.use('/api/admin', adminRouter)
app.use('/api/email', emailRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
