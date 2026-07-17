import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'

const plans = [
  {
    name: 'Starter',
    price: 'Rs. 4,900',
    period: '/mo',
    desc: 'For single-outlet shops just getting organized.',
    features: ['1 branch', 'Up to 2 staff logins', 'Inventory & invoicing', 'Basic reports'],
    highlighted: false,
  },
  {
    name: 'Growth',
    price: 'Rs. 12,900',
    period: '/mo',
    desc: 'For shops ready to track repairs and grow.',
    features: [
      'Up to 3 branches',
      'Unlimited staff logins',
      'Repair job tracking',
      'Real-time reports & alerts',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Chain',
    price: 'Custom',
    period: '',
    desc: 'For multi-branch chains with custom needs.',
    features: [
      'Unlimited branches',
      'Role-based permissions',
      'Dedicated onboarding',
      'API access',
      'SLA & account manager',
    ],
    highlighted: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
            Pricing
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Plans that scale with your counter
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative flex h-full flex-col rounded-2xl p-7 ${
                  p.highlighted
                    ? 'border-2 border-clay-500 bg-cream-50 shadow-2xl shadow-clay-500/15'
                    : 'border border-ink-400/15 bg-cream-50'
                }`}
              >
                {p.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-clay-500 px-3 py-1 text-xs font-semibold text-cream-50">
                    Most popular
                  </span>
                )}
                <h3 className="font-heading text-lg font-semibold text-ink-900">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-ink-500">{p.desc}</p>
                <p className="mt-6 font-heading text-3xl font-semibold text-ink-900">
                  {p.price}
                  <span className="text-sm font-normal text-ink-400">{p.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                      <Check size={16} className="mt-0.5 shrink-0 text-clay-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  to="/login"
                  variant={p.highlighted ? 'primary' : 'outline'}
                  className="mt-8 w-full"
                >
                  Get started
                </Button>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
