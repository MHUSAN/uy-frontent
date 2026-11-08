import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { loginUser, registerUser } from '@/api/auth'
import { getErrorKey } from '@/api/errors'
import { Brand } from '@/components/Brand'
import { Feedback } from '@/components/Feedback'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'login' | 'register'

const FIELD =
  'h-12 w-full min-w-0 rounded-2xl border bg-surface px-4 text-base text-ink placeholder:text-muted transition-colors hover:border-ink/30 focus:border-ink'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(\+998)?\d{9}$/

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
  error?: string | null
  inputMode?: 'tel' | 'email'
  maxLength?: number
}

function Field({ id, label, value, onChange, type = 'text', hint, error, ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${FIELD} ${error ? 'border-danger' : 'border-line'}`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  error,
}: Omit<FieldProps, 'type'>) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          maxLength={72}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${FIELD} pr-14 ${error ? 'border-danger' : 'border-line'}`}
        />
        <button
          type="button"
          aria-label={t(show ? 'authFlow.hide' : 'authFlow.show')}
          aria-pressed={show}
          onClick={() => setShow(!show)}
          className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-full text-muted hover:text-ink"
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { notice?: string; from?: string } | null

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const redirected = useRef(false)
  const notice = state?.notice ? `authFlow.${state.notice}` : null

  useEffect(() => {
    if (auth.user && !redirected.current) {
      redirected.current = true
      navigate(auth.user.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [auth.user, navigate])

  const validate = () => {
    const next: Record<string, string> = {}
    if (mode === 'register' && (fullName.trim().length < 2 || fullName.trim().length > 100))
      next.fullName = t('authFlow.invalidName')
    if (!EMAIL_PATTERN.test(email.trim())) next.email = t('authFlow.invalidEmail')
    if (mode === 'register') {
      if (password.length < 8 || password.length > 72)
        next.password = t('authFlow.invalidPassword')
      else if (confirm !== password) next.confirm = t('authFlow.mismatch')
      const contact = phone.replace(/[\s()-]/g, '')
      if (contact && !PHONE_PATTERN.test(contact)) next.phone = t('validation.phone')
    } else if (!password) next.password = t('authFlow.invalidPassword')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await loginUser({ email: email.trim(), password })
        redirected.current = true
        auth.login(result.accessToken, result.user)
        const target =
          state?.from && state.from.startsWith('/') && !state.from.startsWith('//')
            ? state.from
            : result.user.role === 'ADMIN'
              ? '/admin'
              : '/dashboard'
        navigate(target, { replace: true })
      } else {
        const contact = phone.replace(/[\s()-]/g, '')
        // Only fields in the API's RegisterDto: confirmPassword is never sent.
        await registerUser({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          ...(contact ? { phone: contact } : {}),
        })
        navigate('/login', { replace: true, state: { notice: 'registered' } })
      }
    } catch (error) {
      const status = (error as { status?: number }).status
      setFormError(
        mode === 'login' && status === 401
          ? 'authFlow.credentials'
          : mode === 'register' && status === 409
            ? 'authFlow.duplicate'
            : getErrorKey(error),
      )
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 pb-16 pt-6 sm:px-6">
      <section className="rounded-3xl bg-surface px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <span className="inline-block rounded-2xl bg-nav px-4 py-2">
            <Brand />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">
            {t(isLogin ? 'authFlow.loginTitle' : 'authFlow.registerTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t(isLogin ? 'authFlow.loginBody' : 'authFlow.registerBody')}
          </p>

          {(notice || (state?.from && isLogin)) && (
            <div className="mt-4">
              <Feedback messageKey={notice} success />
            </div>
          )}

          <form noValidate onSubmit={submit} className="mt-6 space-y-5">
            {!isLogin && (
              <Field
                id="fullName"
                label={t('authFlow.fullName')}
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
                error={errors.fullName}
              />
            )}
            <Field
              id="email"
              type="email"
              inputMode="email"
              label={t('authFlow.email')}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              error={errors.email}
            />
            {!isLogin && (
              <Field
                id="phone"
                type="tel"
                inputMode="tel"
                label={t('authFlow.phone')}
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                hint={t('authFlow.phoneHint')}
                error={errors.phone}
              />
            )}
            <PasswordField
              id="password"
              label={t('authFlow.password')}
              value={password}
              onChange={setPassword}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              hint={isLogin ? undefined : t('authFlow.guidance')}
              error={errors.password}
            />
            {!isLogin && (
              <PasswordField
                id="confirm"
                label={t('authFlow.confirmPassword')}
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                error={errors.confirm}
              />
            )}

            <Feedback messageKey={formError} />

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-base font-bold text-on-accent transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? t('authFlow.loading') : t(isLogin ? 'authFlow.login' : 'authFlow.register')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t(isLogin ? 'authFlow.noAccount' : 'authFlow.hasAccount')}{' '}
            <Link
              to={isLogin ? '/register' : '/login'}
              state={state?.from ? { from: state.from } : undefined}
              className="font-semibold text-ink underline underline-offset-4"
            >
              {t(isLogin ? 'authFlow.register' : 'authFlow.login')}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
