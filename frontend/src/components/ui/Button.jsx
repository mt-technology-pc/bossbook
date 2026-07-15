import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { motion } from 'framer-motion'

const variants = {
  primary:
    'bg-clay-500 text-cream-50 hover:bg-clay-600 shadow-lg shadow-clay-500/20',
  secondary:
    'bg-ink-900 text-cream-50 hover:bg-ink-800 dark:bg-cream-100 dark:text-ink-900 dark:hover:bg-white',
  ghost:
    'bg-transparent text-ink-700 hover:bg-cream-300 dark:text-cream-200 dark:hover:bg-dark-700',
  outline:
    'bg-transparent border border-ink-400/40 text-ink-700 hover:border-clay-500 hover:text-clay-600 dark:text-cream-200 dark:hover:text-clay-400',
}

const sizes = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

const Button = forwardRef(
  ({ as, to, href, variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const classes = clsx(
      'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 cursor-pointer',
      variants[variant],
      sizes[size],
      className,
    )

    const motionProps = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } }

    if (to) {
      return (
        <motion.div {...motionProps} className="inline-block">
          <Link to={to} className={classes} ref={ref} {...props}>
            {children}
          </Link>
        </motion.div>
      )
    }

    if (href) {
      return (
        <motion.a
          href={href}
          className={classes}
          ref={ref}
          {...motionProps}
          {...props}
        >
          {children}
        </motion.a>
      )
    }

    return (
      <motion.button className={classes} ref={ref} {...motionProps} {...props}>
        {children}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
export default Button
