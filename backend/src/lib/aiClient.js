import OpenAI from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY in .env — the assistant endpoint will fail until it is set.')
}

// OpenRouter's API is OpenAI-compatible, so the official OpenAI SDK works
// unchanged against it — just a different base URL, key, and model naming
// scheme ("provider/model-name", e.g. "google/gemma-4-26b-a4b-it:free").
// The two extra headers are optional but recommended by OpenRouter — they
// attribute usage to this app on their dashboard/leaderboards, no functional
// effect on responses.
export const ai = new OpenAI({
  // A placeholder when unset (rather than leaving this undefined) is
  // deliberate: the OpenAI SDK throws synchronously at construction time
  // if no apiKey/adminAPIKey/workloadIdentity is present at all, which
  // would crash the whole server on import — every unrelated route, not
  // just the assistant — the moment this one env var is missing. Calls
  // still fail cleanly (401) if it's ever actually used unset.
  apiKey: process.env.OPENROUTER_API_KEY || 'missing-openrouter-api-key',
  baseURL: 'https://openrouter.ai/api/v1',
  // The SDK's own default (10 minutes) is far too long for a chat UI —
  // without this, a hung free-tier model blocks the whole fallback chain
  // in assistant.js instead of failing fast onto the next candidate.
  timeout: 10_000,
  // assistant.js already retries across 4 different models on failure —
  // the SDK's own default of 2 extra internal retries (with backoff) on
  // the SAME model before giving up triples the wall-clock cost of one
  // bad model and was observed burning ~30s on a single timeout before
  // ever reaching the other 3 configured fallbacks. Fail fast instead.
  maxRetries: 0,
  defaultHeaders: {
    'HTTP-Referer': process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    'X-Title': 'BossBooks',
  },
})

// Free-tier model availability/reliability on OpenRouter shifts over time —
// a specific model can lose its :free slug, or just have a bad few minutes
// under load (500s, 504 timeouts). If AI_MODEL starts failing consistently,
// check https://openrouter.ai/collections/free-models for current options,
// ideally something marketed for tool/function calling since this
// assistant relies on it for every create_invoice-style action.
export const AI_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free'

// assistant.js falls through this list (each confirmed working with
// tool/function calling via a live test) when AI_MODEL is having a bad
// moment — free-tier models rarely all struggle at once, so trying the
// next one is far more reliable than retrying the same flaky one.
//
// Ordered fastest-first by measured latency (plain chat / tool-calling):
// nemotron ~0.7-1.4s, ling-3.0-flash ~0.9s, gpt-oss-20b ~3.4-8s — so
// whichever fallback gets tried first is also the quickest one available.
export const AI_MODEL_FALLBACKS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'inclusionai/ling-3.0-flash:free',
  'openai/gpt-oss-20b:free',
].filter((m) => m !== AI_MODEL)
