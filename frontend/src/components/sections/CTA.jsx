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
          <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-8 py-16 text-center dark:bg-dark-700 sm:px-16">
            <motion.div
              aria-hidden
              animate={{ scale: [1, 1.2, 1], rotate: [0, 30, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-clay-500/30 blur-3xl"
            />
            <h2 className="mx-auto max-w-xl font-heading text-3xl font-semibold text-cream-50 sm:text-4xl">
              Ready to run your business on autopilot?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-cream-300 sm:text-base">
              We&apos;re onboarding early users now. Start your free trial
              and help shape where Ledgerly goes next.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to="/login" variant="primary" size="lg">
                Start free trial <ArrowRight size={18} />
              </Button>
              <Button to="/about" variant="ghost" size="lg" className="text-cream-100 hover:bg-white/10">
                Learn more
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
