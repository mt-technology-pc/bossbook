import { GoogleGenAI } from '@google/genai'

if (!process.env.GEMINI_API_KEY) {
  console.warn('Missing GEMINI_API_KEY in .env — the assistant endpoint will fail until it is set.')
}

export const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
