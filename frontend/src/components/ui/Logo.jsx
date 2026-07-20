import { Link } from 'react-router-dom'
import logoSrc from '../../assets/logo.png'

export default function Logo({ className }) {
  return (
    <Link to="/" className={`flex items-center ${className ?? ''}`}>
      <img src={logoSrc} alt="BossBooks" className="h-12 w-auto object-contain" />
    </Link>
  )
}
