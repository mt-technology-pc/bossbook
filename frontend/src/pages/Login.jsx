import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle,
  Smartphone, Receipt, BarChart3,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

const perks = [
  { icon: Smartphone, text: 'IMEI-level inventory tracking' },
  { icon: Receipt, text: 'One-tap invoicing & POS' },
  { icon: BarChart3, text: 'Live profit & stock reports' },
]

export default function Login() {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const isLogin = mode === 'login'

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from ?? '/dashboard'

  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')
    const fullName = formData.get('fullName')

    const { data, error: authError } = isLogin
      ? await signIn({ email, password })
      : await signUp({ email, password, fullName })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (!isLogin && data?.user && !data?.session) {
      setNotice('Check your inbox to confirm your email before logging in.')
      return
    }

    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-ink-400/10 bg-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grain opacity-[0.07]" />
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-32 -left-20 h-96 w-96 rounded-full bg-clay-500/15 blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-clay-700/15 blur-3xl"
        />

        <Link to="/" className="relative z-10">
          <Logo />
        </Link>

        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md font-heading text-3xl font-semibold leading-tight text-ink-900"
          >
            The accounting system built for how stock-based businesses actually work.
          </motion.h2>

          <div className="mt-10 space-y-4">
            {perks.map((p, i) => (
              <motion.div
                key={p.text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                className="flex items-center gap-3 text-ink-700"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                  <p.icon size={16} />
                </span>
                <span className="text-sm">{p.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 rounded-2xl border border-ink-400/15 bg-cream-100 p-5 backdrop-blur-sm"
          >
            <p className="text-sm leading-relaxed text-ink-600">
              We&apos;re early — sign up now and help shape what BossBooks
              becomes.
            </p>
          </motion.div>
        </div>

        <p className="relative z-10 text-xs text-ink-400">
          &copy; {new Date().getFullYear()} BossBooks. All rights reserved.
        </p>
      </div>

      <div className="relative flex items-center justify-center bg-cream-100 px-6 py-16 sm:px-10">
        <Link
          to="/"
          className="absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600 lg:hidden"
        >
          <ArrowLeft size={15} /> Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex lg:hidden">
            <Logo />
          </div>

          <div className="mb-8 flex rounded-full border border-ink-400/20 bg-cream-200 p-1">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="relative flex-1 rounded-full py-2 text-sm font-medium transition-colors"
              >
                {mode === m && (
                  <motion.span
                    layoutId="mode-pill"
                    className="absolute inset-0 rounded-full bg-cream-50 shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={`relative z-10 ${
                    mode === m
                      ? 'text-ink-900'
                      : 'text-ink-400'
                  }`}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: isLogin ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 16 : -16 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="font-heading text-2xl font-semibold text-ink-900">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-1.5 text-sm text-ink-500">
                {isLogin
                  ? 'Log in to manage your shop, stock and sales.'
                  : 'Start your free 14-day trial — no card required.'}
              </p>

              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              {notice && (
                <div className="mt-5 rounded-xl border border-clay-500/20 bg-clay-500/10 px-3.5 py-2.5 text-sm text-clay-700">
                  {notice}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {!isLogin && (
                  <Field icon={User} name="fullName" type="text" placeholder="Full name" autoComplete="name" required />
                )}
                <Field icon={Mail} name="email" type="email" placeholder="Email address" autoComplete="email" required />
                <div className="relative">
                  <Field
                    icon={Lock}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-ink-500">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-ink-400/30 text-clay-500 focus:ring-clay-500"
                      />
                      Remember me
                    </label>
                    <a href="#" className="font-medium text-clay-600 hover:text-clay-700">
                      Forgot password?
                    </a>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="h-4 w-4 rounded-full border-2 border-cream-50/40 border-t-cream-50"
                    />
                  ) : (
                    <>
                      {isLogin ? 'Log in' : 'Create account'} <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-400/15" />
                <span className="text-xs text-ink-400">or continue with</span>
                <span className="h-px flex-1 bg-ink-400/15" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-center">
                  Google
                </Button>
                <Button variant="outline" className="justify-center">
                  Apple
                </Button>
              </div>

              <p className="mt-8 text-center text-sm text-ink-500">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => setMode(isLogin ? 'signup' : 'login')}
                  className="font-medium text-clay-600 hover:text-clay-700"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        {...props}
        className="w-full rounded-xl border border-ink-400/20 bg-cream-50 py-3 pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
      />
    </div>
  )
}
