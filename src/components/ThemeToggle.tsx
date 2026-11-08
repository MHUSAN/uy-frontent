import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import type { Theme } from '@/types/theme'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const options: Array<{
    value: Theme
    label: string
    Icon: typeof Sun
  }> = [
    { value: 'light', label: t('theme.light'), Icon: Sun },
    { value: 'dark', label: t('theme.dark'), Icon: Moon },
    { value: 'system', label: t('theme.system'), Icon: Monitor },
  ]

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface p-0.5"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = theme === value

        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => setTheme(value)}
            className={`inline-flex size-7 items-center justify-center rounded-[5px] transition-colors sm:size-8 ${
              isActive
                ? 'bg-accent-soft text-accent-ink'
                : 'text-muted hover:bg-canvas hover:text-ink'
            }`}
          >
            <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
