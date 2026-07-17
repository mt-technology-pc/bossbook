import { motion } from 'framer-motion'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'

const steps = [
  {
    n: '01',
    title: 'Set up your shop',
    desc: 'Import your product catalog and stock in minutes — CSV upload or add devices one by one.',
  },
  {
    n: '02',
    title: 'Sell & invoice',
    desc: 'Ring up sales at the counter, print or send digital invoices, and accept any payment method.',
  },
  {
    n: '03',
    title: 'Track & grow',
    desc: 'Watch live reports on profit, stock and staff performance so you know exactly where you stand.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream-200/60 py-24 lg:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
            Simple by design
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Up and running in one afternoon
          </h2>
        </Reveal>

        <div className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="absolute top-8 left-[16.5%] right-[16.5%] hidden h-px origin-left bg-ink-400/20 md:block"
          />
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.15} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-ink-400/20 bg-cream-50 font-heading text-lg font-semibold text-clay-600 shadow-sm">
                {s.n}
              </div>
              <h3 className="mt-6 font-heading text-lg font-semibold text-ink-900">
                {s.title}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
                {s.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
