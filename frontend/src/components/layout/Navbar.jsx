import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Container from '../ui/Container'
import Logo from '../ui/Logo'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'

const links = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'About', href: '/about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user, fullName } = useAuth()
  const displayName = fullName || user?.email?.split('@')[0]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location])

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-cream-50/80 backdrop-blur-lg border-b border-ink-400/10'
          : 'bg-transparent'
      }`}
    >
      <Container className="flex h-16 items-center justify-between lg:h-20">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-ink-500 transition-colors hover:text-clay-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <Button to="/dashboard" variant="primary" size="md">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cream-50/20 text-xs">
                {displayName?.charAt(0).toUpperCase()}
              </span>
              {displayName}
            </Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="md">
                Log in
              </Button>
              <Button to="/login" variant="primary" size="md">
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center text-ink-700 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-ink-400/10 bg-cream-50 lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-300"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 px-3">
                {user ? (
                  <Button to="/dashboard" variant="primary" className="w-full">
                    Go to dashboard
                  </Button>
                ) : (
                  <>
                    <Button to="/login" variant="outline" className="w-full">
                      Log in
                    </Button>
                    <Button to="/login" variant="primary" className="w-full">
                      Get started
                    </Button>
                  </>
                )}
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
