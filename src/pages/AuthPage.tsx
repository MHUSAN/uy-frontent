import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowRight, House, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { loginUser, registerUser, submitAuthCode } from '@/api/auth'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset'
type Context = { email: string; nextSend: number }
function readContext(mode: Mode): Context {
  try {
    return JSON.parse(
      sessionStorage.getItem(`tezuy.${mode === 'reset' || mode === 'forgot' ? 'reset' : 'verify'}`) || '{}',
    )
  } catch {
    return { email: '', nextSend: 0 }
  }
}
function saveContext(mode: Mode, email: string, seconds = 60) {
  try {
    sessionStorage.setItem(`tezuy.${mode === 'reset' || mode === 'forgot' ? 'reset' : 'verify'}`, JSON.stringify({ email, nextSend: Date.now() + seconds * 1000 }))
  } catch {
    /* Form still works without storage. */
  }
}
const fieldClass =
  'h-12 w-full min-w-0 rounded-lg border border-line bg-canvas px-3 text-base text-ink transition-colors focus:border-accent'

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.slice(0, 9)
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  fresh = false,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  fresh?: boolean
  hint?: string
}) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={fresh ? 'new-password' : 'current-password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          maxLength={72}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          aria-label={t(show ? 'authFlow.hide' : 'authFlow.show')}
          aria-pressed={show}
          onClick={() => setShow(!show)}
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-muted hover:text-ink"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => readContext(mode).email || '')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [busy, setBusy] = useState(false)
  const [nextSend, setNextSend] = useState(() => readContext(mode).nextSend || 0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const remaining = Math.max(0, Math.ceil((nextSend - now) / 1000))
  const hasCode = mode === 'verify' || mode === 'reset'
  const hasPassword =
    mode === 'login' || mode === 'register' || mode === 'reset'
  const fresh = mode === 'register' || mode === 'reset'

  const handleError = (err: unknown) => {
    const api = err as { status?: number; code?: string; retryAfterSeconds?: number }
    if (api.code === 'EMAIL_NOT_VERIFIED') {
      saveContext('verify', email, 0)
      navigate('/verify-email', { state: { notice: 'needsVerification' } })
      return
    }
    const key =
      (
        {
          INVALID_CREDENTIALS: 'credentials',
          EMAIL_EXISTS: 'duplicate',
          INVALID_CODE: 'invalidCode',
          RATE_LIMITED: 'rate',
          EMAIL_UNAVAILABLE: 'unavailable',
        } as Record<string, string>
      )[api.code || ''] || (!api.status ? 'network' : 'error')
    if (api.retryAfterSeconds) {
      setNextSend(Date.now() + api.retryAfterSeconds * 1000)
      saveContext(mode, email, api.retryAfterSeconds)
    }
    setError(key)
  }

  const resend = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('invalidEmail')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await submitAuthCode(
        mode === 'reset' ? 'forgot-password' : 'resend-otp',
        { email: email.trim() },
      )
      const seconds = result.retryAfterSeconds || 60
      saveContext(mode, email, seconds)
      setNextSend(Date.now() + seconds * 1000)
      setNotice('sent')
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')

    let normalizedPhone = ''
    if (mode === 'register') {
      normalizedPhone = normalizePhone(phone)
      if (!normalizedPhone) {
        setError('phoneRequired')
        return
      }
    }

    if (
      mode === 'register' &&
      (fullName.trim().length < 2 || fullName.trim().length > 100)
    ) {
      setError('invalidName')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('invalidEmail')
      return
    }
    if (
      hasPassword &&
      (password.length < 8 ||
        password.length > 72 ||
        new TextEncoder().encode(password).length > 72)
    ) {
      setError('invalidPassword')
      return
    }
    if (fresh && password !== confirm) {
      setError('mismatch')
      return
    }
    if (hasCode && !/^\d{6}$/.test(code)) {
      setError('codeRequired')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await loginUser({ email: email.trim(), password })
        auth.login(result.accessToken, result.user)
        navigate(result.user.role === 'ADMIN' ? '/admin' : '/dashboard', {
          replace: true,
        })
      } else if (mode === 'register') {
        const result = await registerUser({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: normalizedPhone,
        })
        saveContext('verify', result.email, result.retryAfterSeconds)
        navigate('/verify-email', { state: { notice: 'sent' } })
      } else if (mode === 'forgot') {
        const result = await submitAuthCode('forgot-password', {
          email: email.trim(),
        })
        saveContext('reset', email, result.retryAfterSeconds)
        navigate('/reset-password', { state: { notice: 'sent' } })
      } else {
        await submitAuthCode(
          mode === 'verify' ? 'verify-email' : 'reset-password',
          {
            email: email.trim(),
            code,
            ...(mode === 'reset' ? { password } : {}),
          },
        )
        try {
          sessionStorage.removeItem(`tezuy.${mode}`)
        } catch {
          /* Storage is optional. */
        }
        if (mode === 'reset') auth.logout()
        navigate('/login', {
          replace: true,
          state: { notice: mode === 'verify' ? 'verified' : 'changed' },
        })
      }
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl items-start gap-12 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-20 lg:py-20">
      <aside className="hidden pt-12 lg:block">
        <House size={32} strokeWidth={1.3} className="mb-8 text-accent" />
        <h2 className="max-w-sm font-display text-4xl leading-tight">
          {t('authFlow.brandTitle')}
        </h2>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-muted">
          {t('authFlow.brandBody')}
        </p>
        <div className="mt-10 h-px w-16 bg-accent" />
      </aside>
      <div className="mx-auto w-full min-w-0 max-w-md rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <Brand />
        <div className="mb-7 mt-8">
          <h1 className="font-display text-3xl">{t(`authFlow.${mode}Title`)}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t(`authFlow.${mode}Body`)}
          </p>
        </div>
        {notice && (
          <p role="status" className="mb-5 flex gap-2 rounded-lg bg-accent-soft p-3 text-sm leading-relaxed text-ink">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />
            {t(`authFlow.${notice}`)}
          </p>
        )}
        <form
          noValidate
          onSubmit={submit}
          className="space-y-5"
          aria-busy={busy}
          aria-describedby={error ? 'auth-error' : undefined}
        >
          {mode === 'register' && (
            <div className="space-y-3">
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
                {t('authFlow.fullName')}
              </label>
              <input
                id="fullName"
                name="name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                className={fieldClass}
              />
              <div className="relative">
                <span
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted/60 text-sm select-none"
                >
                  +998
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  maxLength={12}
                  required
                  className={`${fieldClass} pr-12 pl-8`}
                  aria-describedby="phoneHint"
                />
                <p id="phoneHint" className="mt-2 text-xs text-muted">
                  +998 90 123 45 67
                </p>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              {t('authFlow.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setCode('')
              }}
              required
              maxLength={254}
              className={fieldClass}
            />
          </div>
          {hasCode && (
            <div>
              <label htmlFor="code" className="mb-2 block text-sm font-medium">
                {t('authFlow.code')}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                onPaste={(event) => {
                  event.preventDefault()
                  setCode(
                    event.clipboardData
                      .getData('text')
                      .replace(/\D/g, '')
                      .slice(0, 6),
                  )
                }}
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
                className={`${fieldClass} text-center text-xl tracking-[0.4em]`}
              />
            </div>
          )}
          {hasPassword && (
            <PasswordField
              id="password"
              label={t(mode === 'reset' ? 'authFlow.newPassword' : 'authFlow.password')}
              value={password}
              onChange={setPassword}
              fresh={fresh}
              hint={fresh ? t('authFlow.guidance') : undefined}
            />
          )}
          {fresh && (
            <PasswordField
              id="confirmPassword"
              label={t('authFlow.confirmPassword')}
              value={confirm}
              onChange={setConfirm}
              fresh
            />
          )}
          {mode === 'login' && (
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-accent hover:underline"
              >
                {t('authFlow.forgotTitle')}
              </Link>
            </div>
          )}
          {error && (
            <p role="alert" id="auth-error" className="rounded-lg border border-danger/30 p-3 text-sm text-danger">
              {t(`authFlow.${error}`)}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {t(`authFlow.${busy ? 'loading' : mode}`)}
            {!busy && <ArrowRight size={17} className="shrink-0" />}
          </button>
          {hasCode && (
            <button
              type="button"
              onClick={resend}
              disabled={busy || remaining > 0}
              className="min-h-11 w-full rounded-lg border border-line px-3 py-2 text-sm font-medium text-accent disabled:text-muted"
            >
              {remaining > 0
                ? t('authFlow.countdown', { seconds: remaining })
                : t('authFlow.resend')}
            </button>
          )}
        </form>
        <p className="mt-7 border-t border-line pt-5 text-center text-sm text-muted">
          {mode === 'login' ? (
            <>
              {t('authFlow.noAccount')}{' '}
              <Link to="/register" className="font-medium text-accent hover:underline">
                {t('authFlow.register')}
              </Link>
            </>
          ) : mode === 'register' ? (
            <>
              {t('authFlow.hasAccount')}{' '}
              <Link to="/login" className="font-medium text-accent hover:underline">
                {t('authFlow.login')}
              </Link>
            </>
          ) : (
            <Link to="/login" className="font-medium text-accent hover:underline">
              {t('authFlow.back')}
            </Link>
          )}
        </p>
      </div>
    </section>
  )
}
