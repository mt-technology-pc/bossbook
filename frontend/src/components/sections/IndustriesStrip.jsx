import { Store, Smartphone, Shirt, UtensilsCrossed, Wrench, Warehouse } from 'lucide-react'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'

const industries = [
  { icon: Store, label: 'Retail shops' },
  { icon: Smartphone, label: 'Mobile & electronics' },
  { icon: Shirt, label: 'Fashion & apparel' },
  { icon: UtensilsCrossed, label: 'Food & beverage' },
  { icon: Wrench, label: 'Repair & services' },
  { icon: Warehouse, label: 'Wholesale & distribution' },
]

export default function IndustriesStrip() {
  return (
    <section className="border-y border-ink-400/10 bg-cream-200/60 py-10 dark:border-cream-100/10 dark:bg-dark-800/40">
      <Container>
        <p className="text-center text-xs font-medium uppercase tracking-widest text-ink-400">
          Built for businesses like yours
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {industries.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.05} y={10}>
              <span className="flex items-center gap-2 rounded-full border border-ink-400/15 bg-cream-50 px-4 py-2 text-sm font-medium text-ink-600 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-300">
                <item.icon size={15} className="text-clay-500" />
                {item.label}
              </span>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
