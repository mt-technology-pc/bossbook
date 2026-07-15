import clsx from 'clsx'

export default function Container({ children, className }) {
  return (
    <div className={clsx('mx-auto w-full max-w-6xl px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
