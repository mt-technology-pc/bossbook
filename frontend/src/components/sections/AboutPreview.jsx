import { ArrowRight } from 'lucide-react'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'

export default function AboutPreview() {
  return (
    <section className="py-24 lg:py-32">
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
            Why we&apos;re building this
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Accounting software that understands stock
          </h2>
          <p className="mt-4 text-ink-500">
            We&apos;re a small team building BossBooks because too many
            businesses are stuck between spreadsheets and bloated
            accounting suites that were never designed around inventory.
            We&apos;re early — and building it in the open with the
            businesses who use it.
          </p>
          <Button to="/about" variant="outline" className="mt-6">
            Learn more about us <ArrowRight size={16} />
          </Button>
        </Reveal>
      </Container>
    </section>
  )
}
