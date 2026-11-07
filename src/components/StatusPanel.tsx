import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatusPanelProps {
  icon: LucideIcon
  title: string
  body: string
  action?: ReactNode
  tone?: 'default' | 'error'
}

export function StatusPanel({
  icon: Icon,
  title,
  body,
  action,
  tone = 'default',
}: StatusPanelProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border border-dashed bg-surface px-5 py-8 text-center ${
        tone === 'error' ? 'border-danger/40' : 'border-line'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mx-auto grid size-9 place-items-center rounded-md ${
          tone === 'error'
            ? 'bg-danger/10 text-danger'
            : 'bg-accent-soft text-accent'
        }`}
      >
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted">
        {body}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
