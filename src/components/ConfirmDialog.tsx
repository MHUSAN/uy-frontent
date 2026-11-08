import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export function ConfirmDialog({
  messageKey,
  values,
  confirmKey,
  danger = false,
  busy,
  onConfirm,
  onCancel,
}: {
  messageKey: string
  values: Record<string, string>
  confirmKey: string
  danger?: boolean
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancel.current?.focus()
    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) {
          event.preventDefault()
          onCancel()
        }
        if (event.key === 'Tab') {
          const buttons = Array.from(
            panel.current?.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            ) ?? [],
          )
          if (!buttons.length) {
            event.preventDefault()
            return
          }
          const first = buttons[0]
          const last = buttons.at(-1)!
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
      }}
    >
      <div
        ref={panel}
        className="max-h-[80vh] w-full min-w-0 max-w-md overflow-auto rounded-3xl bg-surface p-6 shadow-2xl"
      >
        <h2 id={`${id}-title`} className="text-xl font-extrabold text-ink">
          {t('common.confirm')}
        </h2>
        <p
          id={`${id}-message`}
          className="mt-3 break-words text-sm leading-relaxed text-ink"
        >
          {t(messageKey, values)}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={cancel}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-12 rounded-full border border-line px-6 text-sm font-medium text-ink hover:border-ink/40 disabled:opacity-60"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`min-h-12 rounded-full px-6 text-sm font-bold disabled:opacity-60 ${danger ? 'bg-danger text-white' : 'bg-accent text-on-accent'}`}
          >
            {t(busy ? 'common.saving' : confirmKey)}
          </button>
        </div>
      </div>
    </div>
  )
}
