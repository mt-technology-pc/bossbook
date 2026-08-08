import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import healthRouter from './routes/health.js'
import meRouter from './routes/me.js'
import assistantRouter from './routes/assistant.js'
import backupRouter from './routes/backup.js'
import teamRouter from './routes/team.js'
import cronRouter from './routes/cron.js'
import adminRouter from './routes/admin.js'
import emailRouter from './routes/email.js'
import smsRouter from './routes/sms.js'
import googleDriveRouter from './routes/googleDrive.js'
import authRouter from './routes/auth.js'
import dbProxyRouter from './routes/dbProxy.js'
import { requireCsrf } from './middleware/requireCsrf.js'

const app = express()
const PORT = process.env.PORT || 4000
// CLIENT_ORIGIN is comma-separated — this app is legitimately served from
// more than one live frontend origin at once (multiple Vercel deployments
// + a custom domain). Each is stripped of any trailing slash: browsers
// send the Origin header without one, so a trailing slash in the env var
// (an easy copy-paste mistake) would make an exact-match check reject
// every real request from that origin.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

// Vercel (and most PaaS hosts) sit in front of this app as a reverse
// proxy, setting X-Forwarded-For to the real client IP. Without this,
// Express's default (untrusted proxy) makes express-rate-limit refuse to
// key off that header — logging a ValidationError on every request and
// falling back to a shared/incorrect IP for rate limiting.
if (process.env.VERCEL) {
  app.set('trust proxy', 1)
}

// Pure JSON API, no HTML views — helmet's defaults (CSP, X-Frame-Options,
// X-Content-Type-Options, disabling X-Powered-By, etc.) apply cleanly
// with no route-specific tuning needed.
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    // No Origin header at all (curl, server-to-server, same-origin) — let
    // it through; there's nothing to check against.
    if (!origin) return callback(null, true)
    callback(null, allowedOrigins.includes(origin))
  },
  // The app is same-origin by design in every real deployment (see
  // frontend/vercel.json's /db-api and /api rewrites, which make the
  // browser see this backend as its own origin) — credentials:true here
  // is defense-in-depth for any direct cross-origin caller still hitting
  // this API under the CLIENT_ORIGIN allowlist, not the primary path.
  credentials: true,
}))
app.use(cookieParser())

// Mounted BEFORE express.json() — the DB/Storage proxy needs the exact
// raw request bytes (including non-JSON bodies, e.g. a multipart Storage
// upload) to forward untouched; a JSON body parser ahead of it would
// already have consumed/mangled the stream. It captures its own raw body
// internally (see dbProxy.js).
app.use('/db-proxy', dbProxyRouter)

// 10mb (not the default ~100kb): invoice/receipt PDFs are uploaded as
// base64 JSON for the email-sending route, which is meaningfully bigger
// than every other request body this API handles.
app.use(express.json({ limit: '10mb' }))
app.use(morgan('dev'))

// Applies to every /api/* route below (auth routes are exempted inside
// requireCsrf itself — login has no session yet, refresh/logout don't
// mutate tenant data). The DB proxy above has its own copy of this same
// check, since it's mounted ahead of this line.
app.use(requireCsrf)

// Generous baseline (this isn't a public-signup service — every route is
// either auth-gated or trivial) with a per-route stricter limit layered
// on top where it actually matters (the paid-LLM assistant endpoint).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}))

// A friendly response for anyone hitting the bare domain directly (this is
// an API-only service, not a website) — replaces what would otherwise be
// an unhelpful bare 404 on GET /.
app.get('/', (req, res) => {
  res.json({ status: 'BossBooks API', health: '/api/health' })
})
app.get('/favicon.ico', (req, res) => {
  res.status(204).end()
})

app.use('/api/auth', authRouter)
app.use('/api/health', healthRouter)
app.use('/api/me', meRouter)
app.use('/api/assistant', assistantRouter)
app.use('/api/backup', backupRouter)
app.use('/api/team', teamRouter)
app.use('/api/cron', cronRouter)
app.use('/api/admin', adminRouter)
app.use('/api/email', emailRouter)
app.use('/api/sms', smsRouter)
app.use('/api/google-drive', googleDriveRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || 500
  // Routes that already validate and throw a specific 4xx (bad input, not
  // found, etc.) keep their own message — that's always been intentional
  // and user-facing. Anything reaching here as a genuine 5xx is by
  // definition unexpected, so don't echo err.message (could be raw
  // Postgres/library internals) straight to the client.
  const message = status < 500 ? (err.message || 'Request failed') : 'Something went wrong on our end'
  res.status(status).json({ error: message })
})

// Vercel imports this module and calls the exported app directly as the
// request handler for every invocation — it never runs this file as a
// script, so app.listen() would just bind a port nothing ever connects
// to. Only listen when actually running as a long-lived server (local
// dev, or a host like Render/Railway that runs `node src/index.js`).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })
}

export default app
