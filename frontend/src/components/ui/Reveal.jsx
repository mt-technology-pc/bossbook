import { motion } from 'framer-motion'

export default function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  className,
  once = true,
  as: Tag = 'div',
}) {
  const MotionTag = motion[Tag] ?? motion.div
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.3 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}
