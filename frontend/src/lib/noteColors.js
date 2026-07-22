export const NOTE_COLORS = [
  { value: 'yellow', label: 'Yellow', bg: 'bg-amber-100', border: 'border-amber-300', dot: 'bg-amber-300' },
  { value: 'pink', label: 'Pink', bg: 'bg-rose-100', border: 'border-rose-300', dot: 'bg-rose-300' },
  { value: 'mint', label: 'Mint', bg: 'bg-emerald-100', border: 'border-emerald-300', dot: 'bg-emerald-300' },
  { value: 'sky', label: 'Sky', bg: 'bg-sky-100', border: 'border-sky-300', dot: 'bg-sky-300' },
  { value: 'lavender', label: 'Lavender', bg: 'bg-violet-100', border: 'border-violet-300', dot: 'bg-violet-300' },
]

export function noteColor(value) {
  return NOTE_COLORS.find((c) => c.value === value) || NOTE_COLORS[0]
}
