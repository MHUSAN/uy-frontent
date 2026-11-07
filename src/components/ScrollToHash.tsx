import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { scrollToElement } from '@/utils/scroll'

export function ScrollToHash() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1))
      const frame = window.requestAnimationFrame(() => scrollToElement(id))
      return () => window.cancelAnimationFrame(frame)
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])

  return null
}
