import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

function pageNumbers(page: number, total: number): Array<number | 'gap'> {
  const wanted = new Set([1, total, page - 1, page, page + 1])
  const sorted = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const result: Array<number | 'gap'> = []
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) result.push('gap')
    result.push(n)
  })
  return result
}

const BTN =
  'inline-flex size-11 items-center justify-center rounded-full border text-sm font-medium transition-colors'

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null

  return (
    <nav aria-label={t('listing.pagination')} className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          <button
            type="button"
            aria-label={t('listing.prev')}
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            className={`${BTN} border-line bg-surface text-ink hover:border-ink/40 disabled:opacity-40`}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        </li>
        {pageNumbers(page, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={entry}>
              <button
                type="button"
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onChange(entry)}
                className={`${BTN} ${
                  entry === page
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-line bg-surface text-ink hover:border-ink/40'
                }`}
              >
                {entry}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            aria-label={t('listing.next')}
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            className={`${BTN} border-line bg-surface text-ink hover:border-ink/40 disabled:opacity-40`}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p className="text-xs text-muted">
        {t('listing.page', { page, total: totalPages })}
      </p>
    </nav>
  )
}
