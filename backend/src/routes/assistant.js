import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { groq, GROQ_MODEL } from '../lib/groqClient.js'
import { toolDeclarations, executeTool } from '../lib/assistantTools.js'
import { loadKnowledgeBase } from '../lib/knowledgeBase.js'

const router = Router()

const MAX_TOOL_ROUNDS = 8

const SYSTEM_INSTRUCTION_RULES = `You are the billing assistant inside Ledgerly, an accounting app for
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
don't have enough information about that instead of guessing.`

const tools = toolDeclarations.map((decl) => ({
  type: 'function',
  function: {
    name: decl.name,
    description: decl.description,
    parameters: decl.parameters,
  },
}))

// Llama models on Groq occasionally emit a tool call that doesn't parse
// cleanly against the schema (Groq returns a 400 with a `failed_generation`
// field) — usually a one-off generation glitch that succeeds if you just
// ask again with the exact same input, so retry once before giving up.
async function completeWithRetry(params) {
  try {
    return await groq.chat.completions.create(params)
  } catch (err) {
    if (err.status === 400 && err.code !== 'context_length_exceeded') {
      return await groq.chat.completions.create(params)
    }
    throw err
  }
}

router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  const supabase = supabaseForUser(req.accessToken)

  const systemInstruction = `${SYSTEM_INSTRUCTION_RULES}\n\n${loadKnowledgeBase()}`

  const chatMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
  ]

  const actions = []

  try {
    let completion = await completeWithRetry({ model: GROQ_MODEL, messages: chatMessages, tools })
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

      completion = await completeWithRetry({ model: GROQ_MODEL, messages: chatMessages, tools })
      choice = completion.choices[0]
    }

    res.json({ reply: choice.message.content ?? '', actions })
  } catch (err) {
    console.error(err)

    if (err.status === 429) {
      return res.json({
        reply: "I'm getting a lot of requests right now and hit a rate limit — give it a few minutes and try again.",
        actions: [],
      })
    }

    if (err.status === 400) {
      return res.json({
        reply: "Sorry, I couldn't quite parse that one — could you try rephrasing it more simply? For example: \"create an invoice for <customer>, 2 <product> at Rs. 4500 each\".",
        actions: [],
      })
    }

    res.status(500).json({ error: 'Something went wrong talking to the assistant — please try again.' })
  }
})

export default router
