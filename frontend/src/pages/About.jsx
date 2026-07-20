import { motion } from 'framer-motion'
import { Heart, Target, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import Button from '../components/ui/Button'
import CTA from '../components/sections/CTA'

const values = [
  {
    icon: Heart,
    title: 'Built with empathy',
    desc: 'Every feature starts from a real problem business owners tell us they struggle with.',
  },
  {
    icon: Target,
    title: 'Radically simple',
    desc: "If it takes a manual to explain, we haven't finished designing it yet.",
  },
  {
    icon: Sparkles,
    title: 'Obsessed with detail',
    desc: 'From serial number scanning to receipt formatting — the small things are the product.',
  },
  {
    icon: ShieldCheck,
    title: 'Trustworthy by default',
    desc: 'Your financial data is encrypted, backed up, and always exportable. No lock-in.',
  },
]

const roadmap = [
  {
    stage: 'Now',
    title: 'Core accounting & inventory',
    desc: 'Invoicing, point of sale, stock tracking and IMEI/serial number tracking for the web.',
  },
  {
    stage: 'Next',
    title: 'Mobile app',
    desc: 'A companion app so you can manage sales and stock from the counter or on the move.',
  },
  {
    stage: 'Later',
    title: 'Deeper reporting & integrations',
    desc: 'Multi-branch analytics, accountant exports, and connections to payment and supplier tools.',
  },
]

export default function About() {
  return (
    <MainLayout>
      <section className="relative overflow-hidden pt-36 pb-20 lg:pt-48">
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-24 left-1/3 -z-10 h-[420px] w-[420px] rounded-full bg-clay-400/20 blur-3xl"
        />
        <Container className="text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
              About BossBooks
            </p>
            <h1 className="mx-auto mt-3 max-w-2xl font-heading text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              We&apos;re just getting started
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-ink-500">
              BossBooks is a new accounting and inventory tool for small
              businesses — built to handle everyday stock, not just
              spreadsheets pretending to be one.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal y={30}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream-200">
              <div className="absolute inset-0 bg-grain opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-8">
                  {['bg-clay-400', 'bg-ink-700', 'bg-clay-500', 'bg-ink-500'].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={`h-24 w-24 rounded-2xl sm:h-32 sm:w-32 ${c} ${
                          i % 2 ? 'translate-y-4' : '-translate-y-4'
                        } opacity-90 shadow-xl`}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
              Why BossBooks
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Accounting tools weren&apos;t built for stock-heavy businesses
            </h2>
            <p className="mt-4 text-ink-500">
              Most accounting software treats inventory as an afterthought,
              and most inventory tools ignore the books entirely. We&apos;re
              building BossBooks to close that gap — starting with the
              features stock-heavy businesses ask for first: clean
              invoicing, live stock counts, and individual unit tracking
              for anything with a serial number or IMEI.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
              What we believe
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Our values
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6 }}
                  className="h-full rounded-2xl border border-ink-400/15 bg-cream-50 p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
                    <v.icon size={20} />
                  </span>
                  <h3 className="mt-5 font-heading text-base font-semibold text-ink-900">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    {v.desc}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-cream-200/60 py-20 lg:py-28">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
              Where we&apos;re headed
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Our roadmap
            </h2>
            <p className="mt-4 text-ink-500">
              We&apos;re building in the open and shipping fast. Here&apos;s
              what we&apos;re focused on right now and what&apos;s coming next.
            </p>
          </Reveal>

          <div className="relative mx-auto mt-16 max-w-3xl">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute left-[27px] top-0 h-full w-px origin-top bg-ink-400/20"
            />
            <div className="space-y-10">
              {roadmap.map((item, i) => (
                <Reveal key={item.stage} delay={i * 0.1} className="relative flex gap-5">
                  <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-cream-100 bg-clay-500 font-heading text-xs font-semibold text-cream-50">
                    {item.stage}
                  </span>
                  <div className="flex-1 rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
                    <h3 className="font-heading text-base font-semibold text-ink-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
              Get involved
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Help shape BossBooks from day one
            </h2>
            <p className="mt-4 text-ink-500">
              We&apos;re a small team and we read every message. If you run
              a business and want a say in what we build next, we&apos;d
              love to hear from you.
            </p>
            <Button href="mailto:hello@bossbooks.app" variant="outline" className="mt-6">
              Get in touch <ArrowRight size={16} />
            </Button>
          </Reveal>
        </Container>
      </section>

      <CTA />
    </MainLayout>
  )
}
