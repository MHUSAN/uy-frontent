import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { scrollToElement } from '@/utils/scroll'

interface HashLinkProps {
  sectionId: string
  className?: string
  children: ReactNode
  onNavigate?: () => void
}

/**
 * Links to a section on the homepage. React Router does not scroll to hashes
 * automatically, so same-page clicks are handled here and cross-page clicks
 * are handled by `ScrollToHash` in the root layout.
 */
export function HashLink({
  sectionId,
  className,
  children,
  onNavigate,
}: HashLinkProps) {
  const { pathname } = useLocation()

  return (
    <Link
      to={`/#${sectionId}`}
      className={className}
      onClick={() => {
        onNavigate?.()
        if (pathname === '/') {
          window.requestAnimationFrame(() => scrollToElement(sectionId))
        }
      }}
    >
      {children}
    </Link>
  )
}
