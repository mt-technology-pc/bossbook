import OpenAI from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY in .env — the assistant endpoint will fail until it is set.')
}

// OpenRouter's API is OpenAI-compatible, so the official OpenAI SDK works
// unchanged against it — just a different base URL, key, and model naming
// scheme ("provider/model-name", e.g. "meta-llama/llama-3.3-70b-instruct:free").
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
// Free-tier model availability on OpenRouter shifts over time (a specific
// model can lose its :free slug with no warning) — if this starts 404ing
// with "unavailable for free", check https://openrouter.ai/collections/free-models
// for a current one, ideally something marketed for tool/function calling
// since this assistant relies on it for every create_invoice-style action.
export const AI_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free'
