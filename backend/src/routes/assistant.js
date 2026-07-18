import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { groq, GROQ_MODEL } from '../lib/groqClient.js'
import { toolDeclarations, executeTool } from '../lib/assistantTools.js'
import { PRODUCT_KNOWLEDGE } from '../lib/productKnowledge.js'

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
  is ambiguous, ask the user to clarify instead of guessing. If a
  customer or supplier genuinely doesn't exist yet, create them with
  create_customer/create_supplier first (name is enough — other details
  are optional), then continue with what the user actually asked for,
  without asking permission for that intermediate step.
- If the user doesn't specify a unit price/cost, it's fine to omit it —
  the tool will default to the product's own price/cost.
- You cannot edit or delete existing documents — if asked to change or
  remove something already recorded, tell the user to do that from the
  relevant page in the app instead.
- Keep replies short and concrete. When you create something, state its
  reference code and total.

For data questions (balances, sales, products, etc.) always use the
tools — never guess or estimate a number.

For questions about the software itself (how a feature works, what a
page does, whether something is supported), answer strictly from the
product knowledge below. If it's not covered there, say plainly that you
don't have enough information about that instead of guessing.

${PRODUCT_KNOWLEDGE}`

const tools = toolDeclarations.map((decl) => ({
  type: 'function',
  function: {
    name: decl.name,
    description: decl.description,
    parameters: decl.parameters,
  },
}))

router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  const supabase = supabaseForUser(req.accessToken)

  const chatMessages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
  ]

  const actions = []

  try {
    let completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: chatMessages,
      tools,
    })
    let choice = completion.choices[0]

    let rounds = 0
    while (choice.message.tool_calls?.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      rounds += 1
      chatMessages.push(choice.message)

      for (const toolCall of choice.message.tool_calls) {
        let args = {}
        try {
          args = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          // leave args empty if the model sent malformed JSON
        }
        const result = await executeTool(toolCall.function.name, args, supabase, req.user.id)
        if (result?.success) actions.push({ tool: toolCall.function.name, ...result })
        chatMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: chatMessages,
        tools,
      })
      choice = completion.choices[0]
    }

    res.json({ reply: choice.message.content ?? '', actions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Assistant request failed' })
  }
})

export default router
