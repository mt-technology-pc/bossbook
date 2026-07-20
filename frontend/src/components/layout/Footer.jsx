import Container from '../ui/Container'
import Logo from '../ui/Logo'
import { GithubIcon, XIcon, LinkedinIcon } from '../ui/SocialIcons'

const columns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Point of Sale', 'Inventory', 'Invoicing'],
  },
  {
    title: 'Company',
    links: ['About us', 'Careers', 'Blog', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Help center', 'API docs', 'Community', 'Status'],
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-ink-400/10 bg-cream-200">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              Accounting, inventory and point-of-sale built for mobile phone
              shops and growing businesses.
            </p>
            <div className="mt-5 flex gap-3">
              {[GithubIcon, XIcon, LinkedinIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-400/20 text-ink-500 transition-colors hover:border-clay-500 hover:text-clay-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-heading text-sm font-semibold text-ink-900">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-500 transition-colors hover:text-clay-600"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-ink-400/10 pt-8 text-xs text-ink-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} BossBooks. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-clay-600">Privacy</a>
            <a href="#" className="hover:text-clay-600">Terms</a>
            <a href="#" className="hover:text-clay-600">Security</a>
          </div>
        </div>
      </Container>
    </footer>
  )
}
