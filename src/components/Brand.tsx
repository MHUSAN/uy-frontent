import { Link } from 'react-router-dom'

interface BrandProps {
  className?: string
  onClick?: () => void
}

/**
 * The two logo files are theme variants of the same artwork: dark ink and
 * green on light, white on dark. They switch through the `.dark` class that
 * the theme provider applies to `<html>`, so System theme follows too.
 */
export function Brand({ className = '', onClick }: BrandProps) {
  return (
    <Link
      to="/"
      aria-label="TezUy"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center ${className}`}
    >
      <img
        src="/tezuy-logo-light.png"
        alt=""
        width={496}
        height={160}
        draggable={false}
        className="block h-7 w-auto select-none dark:hidden sm:h-8"
      />
      <img
        src="/tezuy-logo-dark.png"
        alt=""
        width={496}
        height={160}
        draggable={false}
        aria-hidden="true"
        className="hidden h-7 w-auto select-none dark:block sm:h-8"
      />
    </Link>
  )
}
