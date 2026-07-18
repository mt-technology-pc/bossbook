import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  console.warn('Missing OPENAI_API_KEY in .env — the assistant endpoint will fail until it is set.')
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
