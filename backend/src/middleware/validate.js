// One schema per route body, enforced consistently, instead of each route
// hand-rolling its own `if (!x || ...)` checks — same rejections, just
// declared once and actually type-checked (not just truthy-checked).
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue?.path?.join('.') || 'body'
      return res.status(400).json({ error: `${field}: ${issue?.message || 'Invalid request body'}` })
    }
    req.body = result.data
    next()
  }
}
