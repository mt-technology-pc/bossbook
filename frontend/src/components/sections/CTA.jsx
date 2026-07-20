import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Container from '../ui/Container'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'

export default function CTA() {
  return (
    <section className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-ink-400/15 bg-white px-8 py-16 text-center shadow-xl shadow-ink-900/5 sm:px-16">
            <motion.div
              aria-hidden
              animate={{ scale: [1, 1.2, 1], rotate: [0, 30, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-clay-500/15 blur-3xl"
            />
            <h2 className="mx-auto max-w-xl font-heading text-3xl font-semibold text-ink-900 sm:text-4xl">
              Ready to run your business on autopilot?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-ink-500 sm:text-base">
              We&apos;re onboarding early users now. Start your free trial
              and help shape where BossBooks goes next.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to="/login" variant="primary" size="lg">
                Start free trial <ArrowRight size={18} />
              </Button>
              <Button to="/about" variant="ghost" size="lg">
                Learn more
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
