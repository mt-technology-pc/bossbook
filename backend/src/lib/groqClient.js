import OpenAI from 'openai'

if (!process.env.GROQ_API_KEY) {
  console.warn('Missing GROQ_API_KEY in .env — the assistant endpoint will fail until it is set.')
}

// Groq's API is OpenAI-compatible, so the official OpenAI SDK works
// unchanged against it — just a different base URL and key.
export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
