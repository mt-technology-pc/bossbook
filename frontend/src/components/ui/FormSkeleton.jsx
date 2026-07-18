export default function FormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full max-w-sm">
          <div className="h-3 w-20 rounded bg-cream-300" />
          <div className="mt-2.5 h-11 w-full rounded-xl bg-cream-200" />
        </div>
        <div className="text-right">
          <div className="ml-auto h-3 w-24 rounded bg-cream-300" />
          <div className="ml-auto mt-2.5 h-8 w-32 rounded bg-cream-200" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-3 w-16 rounded bg-cream-300" />
            <div className="mt-2.5 h-11 w-full rounded-xl bg-cream-200" />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="h-4 w-16 rounded bg-cream-300" />
        <div className="mt-3 overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 border-b border-ink-400/10 px-4 py-3.5 last:border-0"
            >
              <div className="h-9 flex-[2] rounded-lg bg-cream-200" />
              <div className="h-9 w-16 rounded-lg bg-cream-200" />
              <div className="h-9 w-20 rounded-lg bg-cream-200" />
              <div className="h-9 w-20 rounded-lg bg-cream-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
