import { Link } from 'react-router-dom'

interface BrandProps {
  className?: string
  onClick?: () => void
  /** `dark` = placed on the black navbar, `light` = on a white surface. */
  tone?: 'dark' | 'light'
}

export function Brand({ className = '', onClick, tone = 'dark' }: BrandProps) {
  return (
    <Link
      to="/"
      aria-label="TezUy"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center rounded-md ${className}`}
    >
      <img
        src={tone === 'dark' ? '/tezuy-logo-dark.png' : '/tezuy-logo-light.png'}
        alt=""
        width={496}
        height={160}
        draggable={false}
        className="block h-7 w-auto select-none sm:h-8"
      />
    </Link>
  )
}
