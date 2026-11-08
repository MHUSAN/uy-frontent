import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleAlert, CircleCheck, X } from 'lucide-react'

type ToastKind = 'success' | 'error'
interface Toast {
  id: number
  kind: ToastKind
  messageKey: string
}
interface ToastApi {
  success: (messageKey: string) => void
  error: (messageKey: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, messageKey: string) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current.slice(-2), { id, kind, messageKey }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (key) => push('success', key),
      error: (key) => push('error', key),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-nav px-4 py-3 text-sm text-white shadow-xl"
          >
            {toast.kind === 'success' ? (
              <CircleCheck size={18} className="shrink-0 text-accent" aria-hidden="true" />
            ) : (
              <CircleAlert size={18} className="shrink-0 text-red-400" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 break-words">{t(toast.messageKey)}</span>
            <button
              type="button"
              aria-label={t('toast.dismiss')}
              onClick={() => dismiss(toast.id)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}
