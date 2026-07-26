import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../middleware/requireAuth.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { ai, AI_MODEL, AI_MODEL_FALLBACKS } from '../lib/aiClient.js'
import { toolDeclarations, executeTool } from '../lib/assistantTools.js'
import { loadKnowledgeBase } from '../lib/knowledgeBase.js'
import { todayColombo } from '../lib/todayColombo.js'

const router = Router()

const MAX_TOOL_ROUNDS = 8
const MAX_MESSAGES = 50
const MAX_TOTAL_CHARS = 20000

// Stricter than the app-wide limiter (index.js) — this endpoint calls a
// paid LLM, and can loop up to MAX_TOOL_ROUNDS times per single request,
// so it's the one route where per-request cost scales fastest.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many assistant requests — please wait a few minutes and try again.' },
})

function buildSystemInstructionRules() {
  const today = todayColombo()
  return `You are the billing assistant inside BossBooks, an accounting app for
small businesses. You help the signed-in user create invoices, sales
receipts, purchase bills, and record payments, and answer questions about
their customers, suppliers, products, and outstanding balances — entirely
by calling the tools you're given. Never claim to have done something you
didn't actually call a tool for.

Today's date is ${today}. Use it to resolve any relative date the user
mentions ("this month", "last week", "today", "this year") into actual
YYYY-MM-DD values before calling a tool — never guess or default to an
unrelated date.

Rules:
- Amounts are in Sri Lankan Rupees (LKR), shown as "Rs. X".
- For any question about profit, gross/net profit, revenue, cost of
  goods sold, or margin, always call get_income_statement — never
  estimate it by summing search_sales/search_purchases totals, since
  that ignores cost of goods sold and won't match the real numbers.
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
}

const tools = toolDeclarations.map((decl) => ({
  type: 'function',
  function: {
    name: decl.name,
    description: decl.description,
    parameters: decl.parameters,
  },
}))

// OpenRouter sometimes hands back HTTP 200 with an error body instead of
// an error status — seen when a free model's upstream provider times out
// or errors ({"error":{"message":"...","code":504}}). The SDK only throws
// on non-2xx, so without this the response has no `choices` and the
// caller crashes on completion.choices[0]. Normalize it into a thrown
// error so it's handled the same way as any other failure.
async function completeOnce(model, params) {
  const completion = await ai.chat.completions.create({ ...params, model })
  if (completion.error) {
    const err = new Error(completion.error.message || 'Upstream model error')
    err.status = completion.error.code
    throw err
  }
  return completion
}

// The openai SDK's error classes (APIConnectionTimeoutError etc.) never
// set `this.name`, so `err.name` is always just the inherited "Error" —
// the real class name only shows up as `err.constructor.name`. Checking
// `err.name` here always silently failed to match.
const isTimeoutOrConnectionError = (err) => /timeout|connection/i.test(err.constructor?.name || err.name || '')

function isRetryable(err) {
  if ((err.status === 400 && err.code !== 'context_length_exceeded')
    || [429, 500, 502, 503, 504].includes(err.status)) return true
  // Timeouts/connection failures (aiClient.js's 10s client timeout, or a
  // genuine network error) carry no HTTP status at all — still worth
  // falling through to the next model rather than giving up entirely.
  return !err.status && isTimeoutOrConnectionError(err)
}

// Races several models concurrently and returns whichever succeeds
// first — trying them one at a time meant a bad patch across the whole
// free tier cost the full sum of every model's timeout (up to 4 x 10s =
// 40s, confirmed live) before the caller saw anything at all. Racing
// caps that at roughly one timeout no matter how many candidates fail,
// and in the common case returns as fast as the single fastest model
// responds instead of always paying the primary's latency first.
async function raceModels(models, params) {
  try {
    return await Promise.any(models.map(async (model) => ({ completion: await completeOnce(model, params), model })))
  } catch (aggregate) {
    // Promise.any rejects with an AggregateError bundling every
    // individual failure — surface a non-retryable one if there is one
    // (e.g. context_length_exceeded, which no other free model will fix
    // either) since that's the actionable failure, not just whichever
    // happened to be listed first.
    const errors = aggregate.errors || [aggregate]
    throw errors.find((e) => !isRetryable(e)) || errors[0]
  }
}

// Free-tier models each have transient bad moments (500s, timeouts, a
// malformed tool call) — falling through to another candidate rather
// than retrying the same flaky one is far more reliable (a model having
// a bad moment is usually still having it a second later).
//
// `preferredModel` lets a multi-round tool-calling conversation remember
// which model actually answered last time and try that one first, solo
// — a tool-heavy request can need several of these calls in a row, and
// trying the known-good model alone first avoids firing 3 wasted
// concurrent requests every single round once one is already working.
// If it fails (or there's no preferred model yet), race the rest.
async function completeWithRetry(params, preferredModel) {
  const rest = [AI_MODEL, ...AI_MODEL_FALLBACKS].filter((m) => m !== preferredModel)

  if (preferredModel) {
    try {
      const completion = await completeOnce(preferredModel, params)
      return { completion, model: preferredModel }
    } catch (err) {
      if (!isRetryable(err)) throw err
    }
  }

  return raceModels(rest, params)
}

router.post('/chat', chatLimiter, requireAuth, async (req, res) => {
  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `Conversation is too long (max ${MAX_MESSAGES} messages) — start a new chat.` })
  }
  const totalChars = messages.reduce((sum, m) => sum + String(m?.text || '').length, 0)
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(400).json({ error: 'Conversation is too long — start a new chat.' })
  }

  const supabase = supabaseForUser(req.accessToken)

  const systemInstruction = `${buildSystemInstructionRules()}\n\n${loadKnowledgeBase()}`

  const chatMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
  ]

  const actions = []

  try {
    let { completion, model } = await completeWithRetry({ messages: chatMessages, tools })
    let choice = completion.choices[0]

    let rounds = 0
    while (choice.message.tool_calls?.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      rounds += 1
      chatMessages.push(choice.message)

      // A round's tool calls were all decided by the model in one shot
      // from the same context — none of them can depend on another's
      // result within this round — so running them concurrently is safe
      // and meaningfully faster than awaiting each one in turn.
      const toolResults = await Promise.all(choice.message.tool_calls.map(async (toolCall) => {
        let args = {}
        try {
          args = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          // leave args empty if the model sent malformed JSON
        }
        const result = await executeTool(toolCall.function.name, args, supabase, req.user.id)
        return { toolCall, result }
      }))

      for (const { toolCall, result } of toolResults) {
        if (result?.success) actions.push({ tool: toolCall.function.name, ...result })
        chatMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      ;({ completion, model } = await completeWithRetry({ messages: chatMessages, tools }, model))
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

    if ([500, 502, 503, 504].includes(err.status)
      || (!err.status && isTimeoutOrConnectionError(err))) {
      return res.json({
        reply: "The AI models I have access to are all struggling right now — this happens occasionally on the free tier under load. Please try again in a moment.",
        actions: [],
      })
    }

    res.status(500).json({ error: 'Something went wrong talking to the assistant — please try again.' })
  }
})

export default router
