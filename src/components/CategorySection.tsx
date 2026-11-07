import { categoryLabel } from '@/utils/localize'
import { LayoutGrid, Tag, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusPanel } from '@/components/StatusPanel'
import type { CategoryStatus } from '@/hooks/useCategories'
import type { Category } from '@/types/property'
import { getCategoryIcon } from '@/utils/categoryIcon'

interface CategorySectionProps {
  categories: Category[]
  status: CategoryStatus
  activeSlug: string
  onSelect: (slug: string) => void
  onRetry: () => void
}

const RETRY_BUTTON =
  'inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent'

export function CategorySection({
  categories,
  status,
  activeSlug,
  onSelect,
  onRetry,
}: CategorySectionProps) {
  const { t } = useTranslation()

  return (
    <section
      id="kategoriyalar"
      className="mt-10 scroll-mt-20 border-t border-line pt-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-[-0.02em] text-ink">
            {t('home.categories.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t('home.categories.subtitle')}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {status === 'loading' ? (
          <div>
            <div className="flex gap-2 overflow-hidden" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="h-10 w-28 shrink-0 rounded-md border border-line bg-surface motion-safe:animate-pulse"
                />
              ))}
            </div>
            <p role="status" className="sr-only">
              {t('home.categories.loading')}
            </p>
          </div>
        ) : null}

        {status === 'error' ? (
          <StatusPanel
            icon={TriangleAlert}
            tone="error"
            title={t('home.categories.errorTitle')}
            body={t('home.categories.errorBody')}
            action={
              <button type="button" onClick={onRetry} className={RETRY_BUTTON}>
                {t('home.categories.retry')}
              </button>
            }
          />
        ) : null}

        {status === 'empty' ? (
          <StatusPanel
            icon={Tag}
            title={t('home.categories.emptyTitle')}
            body={t('home.categories.emptyBody')}
          />
        ) : null}

        {status === 'ready' ? (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            <CategoryButton
              icon={LayoutGrid}
              label={t('home.categories.all')}
              active={!activeSlug}
              onClick={() => onSelect('')}
            />
            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                icon={getCategoryIcon(category.slug)}
                label={categoryLabel(category, t)}
                active={activeSlug === category.slug}
                onClick={() => onSelect(category.slug)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface CategoryButtonProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}

function CategoryButton({
  icon: Icon,
  label,
  active,
  onClick,
}: CategoryButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? 'border-accent bg-accent-soft text-ink'
          : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink'
      }`}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}
