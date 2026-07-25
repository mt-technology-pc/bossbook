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
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
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
export const AI_MODEL_FALLBACKS = [
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'inclusionai/ling-3.0-flash:free',
].filter((m) => m !== AI_MODEL)
