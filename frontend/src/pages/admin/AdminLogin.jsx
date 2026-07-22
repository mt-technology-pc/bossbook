import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import Logo from '../../components/ui/Logo'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// Deliberately separate from the regular /login page — a platform admin
// isn't a member of any company (no company_users row), so this checks
// is_platform_admin() instead of "does a company exist for this user".
// Same underlying auth.users pool, same signInWithPassword call — just a
// distinct page, route, and post-login authorization check.
export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')

    const { error: authError } = await signIn({ email, password })
    if (authError) {
      setLoading(false)
      setError(authError.message)
      return
    }

    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    setLoading(false)

    if (!isAdmin) {
      await supabase.auth.signOut()
      setError('This account is not a platform admin.')
      return
    }

    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm rounded-2xl border border-cream-50/10 bg-ink-800 p-8"
      >
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="flex items-center gap-1 rounded-full bg-cream-50/10 px-2.5 py-1 text-[11px] font-semibold text-cream-50">
            <ShieldCheck size={12} /> Admin
          </span>
        </div>

        <h1 className="mt-6 font-heading text-xl font-semibold text-cream-50">
          Platform admin sign in
        </h1>
        <p className="mt-1.5 text-sm text-cream-50/60">
          Restricted to provisioned platform administrators only.
        </p>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-50/40" />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-cream-50/15 bg-ink-900 py-3 pl-10 pr-4 text-sm text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-50/40" />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-cream-50/15 bg-ink-900 py-3 pl-10 pr-10 text-sm text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cream-50/40 hover:text-cream-50/70"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4 rounded-full border-2 border-cream-50/40 border-t-cream-50"
              />
            ) : (
              <>
                Sign in <ArrowRight size={16} />
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
