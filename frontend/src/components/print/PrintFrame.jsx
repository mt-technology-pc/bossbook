import { useCompany } from '../../hooks/useCompany'

// The one shared print header/footer every printable page (invoice,
// receipt, every report) wraps its content in — print-only (hidden on
// screen, shown only in @media print via Tailwind's print: variant,
// mirroring the hidden print:block pattern already used in
// SaleDocument.jsx), so there's exactly one place "what a printed page's
// header/footer looks like" is defined instead of duplicated per page.
//
// No page-number footer: Chrome/Blink does not support CSS @page margin-box
// content (counter(page)) at all, so a CSS-only "Page X of Y" would
// silently be blank there — the reliable, standard way to get page numbers
// is the browser's own native print header/footer ("Headers and footers"
// toggle in the print dialog), which is outside this app's control anyway.

export function PrintFooter() {
  const { company } = useCompany()
  return (
    <div className="hidden print:mt-4 print:block print:border-t print:border-ink-900/10 print:pt-2 print:text-center print:text-[10px] print:text-ink-400">
      {company?.name}
    </div>
  )
}

// Reports use the full wrapper (they have no letterhead of their own).
// Invoice/receipt already have one (SaleDocument.jsx) and just use
// <PrintFooter /> directly for footer consistency, not this whole thing.
export default function PrintFrame({ title, subtitle, children }) {
  const { company } = useCompany()
  const generatedOn = new Date().toLocaleDateString('en-LK', { dateStyle: 'long' })

  return (
    <>
      <div className="hidden print:mb-4 print:flex print:items-baseline print:justify-between print:border-b print:border-ink-900/20 print:pb-2">
        <div>
          <p className="font-heading text-base font-semibold text-ink-900">{title}</p>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
        <div className="text-right text-xs text-ink-500">
          {company?.name && <p className="font-medium text-ink-900">{company.name}</p>}
          <p>Generated {generatedOn}</p>
        </div>
      </div>

      {children}

      <PrintFooter />
    </>
  )
}
