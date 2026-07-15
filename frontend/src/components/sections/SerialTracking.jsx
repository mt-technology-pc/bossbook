import { motion } from 'framer-motion'
import { ScanLine, CheckCircle2, History, Barcode } from 'lucide-react'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'

const points = [
  'Scan or enter IMEI, serial number, or barcode at intake',
  'Automatically flag duplicates and mismatched entries',
  'Trace every unit from purchase to sale in one timeline',
  'Attach warranty, condition and repair history per device',
]

export default function SerialTracking() {
  return (
    <section id="serial-tracking" className="py-24 lg:py-32">
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-clay-600">
            For serialized inventory
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl">
            Built-in IMEI &amp; serial number tracking
          </h2>
          <p className="mt-4 text-ink-500 dark:text-cream-400">
            Selling phones, laptops, appliances or anything else with a
            unique identifier? Track every single unit individually —
            not just a stock count — so you always know exactly which
            item sold, to whom, and when.
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p, i) => (
              <motion.li
                key={p}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-2.5 text-sm text-ink-600 dark:text-cream-300"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-clay-500" />
                {p}
              </motion.li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15} y={30}>
          <div className="relative rounded-2xl border border-ink-400/15 bg-cream-50 p-5 shadow-xl dark:border-cream-100/10 dark:bg-dark-800">
            <div className="flex items-center gap-2.5 border-b border-ink-400/10 pb-4 dark:border-cream-100/10">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
                <ScanLine size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900 dark:text-cream-50">Scan to add unit</p>
                <p className="text-xs text-ink-400">Camera, USB scanner, or manual entry</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { id: '35 892611 234567 8', status: 'In stock' },
                { id: '35 118920 998877 1', status: 'Sold' },
                { id: '86 774432 110023 4', status: 'In repair' },
              ].map((row, i) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center justify-between rounded-lg bg-cream-200 px-3.5 py-2.5 dark:bg-dark-700"
                >
                  <div className="flex items-center gap-2.5">
                    <Barcode size={14} className="text-ink-400" />
                    <span className="font-mono text-xs text-ink-700 dark:text-cream-300">{row.id}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      row.status === 'In stock'
                        ? 'bg-clay-500/15 text-clay-600'
                        : row.status === 'Sold'
                          ? 'bg-ink-400/15 text-ink-500 dark:text-cream-400'
                          : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    {row.status}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-ink-400/25 px-3.5 py-2.5 text-xs text-ink-400 dark:border-cream-100/15">
              <History size={13} />
              Full audit history kept per unit, automatically
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
