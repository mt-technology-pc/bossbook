import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { genai, GEMINI_MODEL } from '../lib/geminiClient.js'
import { toolDeclarations, executeTool } from '../lib/assistantTools.js'

const router = Router()

const MAX_TOOL_ROUNDS = 8

const SYSTEM_INSTRUCTION = `You are the billing assistant inside Ledgerly, an accounting app for
small businesses. You help the signed-in user create invoices, sales
receipts, purchase bills, and record payments, and answer questions about
their customers, suppliers, products, and outstanding balances — entirely
by calling the tools you're given. Never claim to have done something you
didn't actually call a tool for.

Rules:
- Amounts are in Sri Lankan Rupees (LKR), shown as "Rs. X".
- Before creating any document, resolve every customer/supplier/product/
  account name through the matching list_/search_ tool first. If a name
  is ambiguous or not found, ask the user to clarify instead of guessing.
- If the user doesn't specify a unit price/cost, it's fine to omit it —
  the tool will default to the product's own price/cost.
- You cannot edit or delete existing documents — if asked to change or
  remove something already recorded, tell the user to do that from the
  relevant page in the app instead.
- Keep replies short and concrete. When you create something, state its
  reference code and total.`

router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  const supabase = supabaseForUser(req.accessToken)

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))

  const actions = []

  try {
    let response = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    })

    let rounds = 0
    while (response.functionCalls?.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      rounds += 1
      contents.push(response.candidates[0].content)

      const functionResponseParts = []
      for (const call of response.functionCalls) {
        const result = await executeTool(call.name, call.args ?? {}, supabase)
        if (result?.success) actions.push({ tool: call.name, ...result })
        functionResponseParts.push({
          functionResponse: { name: call.name, response: result },
        })
      }
      contents.push({ role: 'user', parts: functionResponseParts })

      response = await genai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      })
    }

    res.json({ reply: response.text ?? '', actions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Assistant request failed' })
  }
})

export default router
