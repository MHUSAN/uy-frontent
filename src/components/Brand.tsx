import { Link } from 'react-router-dom'

interface BrandProps {
  className?: string
}

export function Brand({ className = '' }: BrandProps) {
  return (
    <Link
      to="/"
      aria-label="TezUy"
      className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-[6px] bg-accent font-display text-[15px] font-semibold leading-none text-on-accent sm:size-8 sm:text-base"
      >
        T
      </span>
      <span className="text-base font-semibold tracking-[-0.015em] text-ink sm:text-[17px]">
        TezUy
      </span>
    </Link>
  )
}
