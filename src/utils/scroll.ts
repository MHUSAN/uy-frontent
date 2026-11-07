export function scrollToElement(id: string): void {
  if (typeof document === 'undefined') {
    return
  }

  const element = document.getElementById(id)
  if (!element) {
    return
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  element.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  })
}
