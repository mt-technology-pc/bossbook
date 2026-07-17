import { motion } from 'framer-motion'
import {
  Package, Receipt, BarChart3, Wrench, Users, ShieldCheck,
} from 'lucide-react'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'

const features = [
  {
    icon: Package,
    title: 'Smart inventory',
    desc: 'Track stock levels, variants and condition across every outlet, with low-stock alerts built in.',
  },
  {
    icon: Receipt,
    title: 'Invoicing & POS',
    desc: 'Generate professional invoices and ring up sales in seconds with a counter-friendly point of sale.',
  },
  {
    icon: BarChart3,
    title: 'Real-time reports',
    desc: 'See profit margins, best-sellers and cash flow the moment a sale happens — no month-end surprises.',
  },
  {
    icon: Wrench,
    title: 'Job & repair tracking',
    desc: 'Log service jobs, parts used and status so customers always know where their item stands.',
  },
  {
    icon: Users,
    title: 'Multi-branch & staff',
    desc: 'Give every outlet and staff member their own login with permissions that match their role.',
  },
  {
    icon: ShieldCheck,
    title: 'Bank-grade security',
    desc: 'Your books stay encrypted and backed up automatically, with full audit trails on every entry.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 lg:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
            Everything in one place
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Run your counter to your closing books
          </h2>
          <p className="mt-4 text-ink-500">
            Purpose-built tools for retailers and small businesses who need
            accounting that actually understands stock.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group h-full rounded-2xl border border-ink-400/15 bg-cream-50 p-6 shadow-sm transition-shadow hover:shadow-xl hover:shadow-clay-500/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600 transition-colors group-hover:bg-clay-500 group-hover:text-cream-50">
                  <f.icon size={20} />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {f.desc}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
