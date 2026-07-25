import OpenAI from 'openai'

// Groq's LPU inference is dramatically faster than most models served
// through OpenRouter's free tier (shared, deprioritized capacity — seen
// taking 9+ seconds per reply vs. Groq's usual sub-second response). Prefer
// Groq whenever a key is configured; OpenRouter (with its much wider model
// selection and free-tier options) is the fallback when it isn't, or once
// Groq's daily free-tier token cap is hit for the day.
const useGroq = Boolean(process.env.GROQ_API_KEY)

if (!useGroq && !process.env.OPENROUTER_API_KEY) {
  console.warn('Missing both GROQ_API_KEY and OPENROUTER_API_KEY in .env — the assistant endpoint will fail until one is set.')
}

// Both are OpenAI-compatible APIs, so the same SDK works against either —
// just a different base URL, key, and model-naming scheme (OpenRouter uses
// "provider/model-name", Groq uses bare model names).
export const ai = useGroq
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : new OpenAI({
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
export const AI_MODEL = useGroq
  ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
  : (process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free')

export const AI_PROVIDER = useGroq ? 'groq' : 'openrouter'
