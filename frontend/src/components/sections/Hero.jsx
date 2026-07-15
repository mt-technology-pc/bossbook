import { motion } from 'framer-motion'
import { ArrowRight, ScanLine, Receipt, TrendingUp } from 'lucide-react'
import Container from '../ui/Container'
import Button from '../ui/Button'

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24 lg:pt-48 lg:pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-40" />
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-clay-400/25 blur-3xl animate-blob dark:bg-clay-500/15"
      />
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute top-40 right-[8%] -z-10 h-72 w-72 rounded-full bg-ink-700/10 blur-3xl dark:bg-cream-100/10"
      />

      <Container className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-ink-400/20 bg-cream-50/80 px-4 py-1.5 text-xs font-medium text-ink-600 backdrop-blur dark:border-cream-100/15 dark:bg-dark-800/80 dark:text-cream-300"
        >
          <span className="flex h-1.5 w-1.5 rounded-full bg-clay-500" />
          Accounting software for every kind of business
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mx-auto max-w-3xl font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 dark:text-cream-50 sm:text-5xl lg:text-6xl"
        >
          Accounting that keeps up with your{' '}
          <span className="relative whitespace-nowrap text-clay-500">
            business
            <svg
              className="absolute -bottom-1 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M2 9C60 2 240 2 298 9"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.8, ease: 'easeInOut' }}
              />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-500 dark:text-cream-400 sm:text-lg"
        >
          Manage inventory, issue invoices, and see real-time profit from
          one clean dashboard — with built-in IMEI &amp; serial number
          tracking for businesses that sell serialized stock.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button to="/login" variant="primary" size="lg">
            Start free trial <ArrowRight size={18} />
          </Button>
          <Button href="#how-it-works" variant="outline" size="lg">
            See how it works
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-4 text-xs text-ink-400"
        >
          No credit card required &middot; Free 14-day trial
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-20 max-w-4xl"
        >
          <div className="relative rounded-2xl border border-ink-400/15 bg-cream-50 p-3 shadow-2xl shadow-ink-900/10 dark:border-cream-100/10 dark:bg-dark-800">
            <div className="flex items-center gap-1.5 border-b border-ink-400/10 px-3 pb-3 dark:border-cream-100/10">
              <span className="h-2.5 w-2.5 rounded-full bg-clay-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-400/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-400/40" />
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 sm:p-6">
              <div className="col-span-2 rounded-xl bg-cream-200 p-5 text-left dark:bg-dark-700">
                <p className="text-xs font-medium text-ink-400">Today&apos;s revenue</p>
                <p className="mt-2 font-heading text-3xl font-semibold text-ink-900 dark:text-cream-50">
                  Rs. 84,200
                </p>
                <div className="mt-4 flex h-20 items-end gap-1.5">
                  {[40, 65, 35, 80, 55, 90, 70].map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: 0.8 + i * 0.08 }}
                      className="flex-1 rounded-sm bg-clay-500/70"
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex-1 rounded-xl bg-cream-200 p-4 text-left dark:bg-dark-700">
                  <ScanLine size={16} className="text-clay-500" />
                  <p className="mt-2 text-xs text-ink-400">Units in stock</p>
                  <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">312</p>
                </div>
                <div className="flex-1 rounded-xl bg-cream-200 p-4 text-left dark:bg-dark-700">
                  <TrendingUp size={16} className="text-clay-500" />
                  <p className="mt-2 text-xs text-ink-400">Profit margin</p>
                  <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">24.6%</p>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-6 top-10 hidden w-44 rounded-xl border border-ink-400/15 bg-cream-50 p-3 text-left shadow-xl dark:border-cream-100/10 dark:bg-dark-800 sm:block"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/15 text-clay-600">
                <Receipt size={14} />
              </span>
              <p className="text-xs font-semibold text-ink-900 dark:text-cream-50">Invoice #1042</p>
            </div>
            <p className="mt-2 text-[11px] text-ink-400">Order total · Paid</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -right-4 bottom-6 hidden w-40 rounded-xl border border-ink-400/15 bg-cream-50 p-3 text-left shadow-xl dark:border-cream-100/10 dark:bg-dark-800 sm:block"
          >
            <p className="text-[11px] font-medium text-ink-400">Low stock alert</p>
            <p className="mt-1 text-xs font-semibold text-clay-600">SKU-2041 — 3 left</p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  )
}
