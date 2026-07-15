import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const { id, email, user_metadata } = req.user
  res.json({
    id,
    email,
    fullName: user_metadata?.full_name ?? null,
  })
})

export default router
