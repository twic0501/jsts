import { useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, CircleAlert, LoaderCircle, Mail } from 'lucide-react'
import PasswordField from './PasswordField'

export interface LoginValues {
  email: string
  password: string
}

export interface LoginFormProps {
  /** Receives validated form values; this component never calls an API or sets a session. */
  onSubmit: (values: LoginValues) => void | Promise<void>
  /** Passes the current email so the future parent can preserve it between forms. */
  onSwitchToRegister: (email: string) => void
  initialEmail?: string
  isLoading?: boolean
  disabled?: boolean
  /** Safe, user-facing integration error supplied by the future parent. */
  error?: string | null
}

export default function LoginForm({
  onSubmit,
  onSwitchToRegister,
  initialEmail = '',
  isLoading = false,
  disabled = false,
  error,
}: LoginFormProps) {
  const id = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const submitLock = useRef(false)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({})
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = isLoading || submitting
  const blocked = disabled || busy
  const formError = submissionError || error

  function emailError() {
    if (!email.trim()) return 'Vui lòng nhập email của bạn.'
    if (emailRef.current?.validity.typeMismatch) return 'Email chưa đúng định dạng, ví dụ ban@example.com.'
    return ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocked || submitLock.current) return
    const form = event.currentTarget
    const nextErrors = { email: emailError(), password: password ? '' : 'Vui lòng nhập mật khẩu.' }
    setErrors(nextErrors)
    setSubmissionError('')
    const firstInvalid = nextErrors.email ? 'email' : nextErrors.password ? 'password' : null
    if (firstInvalid) {
      const input = form.elements.namedItem(firstInvalid)
      if (input instanceof HTMLElement) input.focus()
      return
    }
    submitLock.current = true
    setSubmitting(true)
    try {
      await onSubmit({ email: email.trim(), password })
    } catch {
      // Do not render raw exceptions: they may contain integration or sensitive details.
      setSubmissionError('Chưa gửi được yêu cầu đăng nhập. Bạn thử lại nhé.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <form className="pm-auth-form" aria-label="Đăng nhập" aria-busy={busy} noValidate onSubmit={handleSubmit}>
      {formError && <div className="pm-auth-form-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{formError}</span></div>}
      <fieldset className="pm-auth-fields" disabled={blocked}>
        <div className="pm-auth-field">
          <label className="pm-auth-label" htmlFor={`${id}-email`}>Email</label>
          <div className={`pm-auth-input-wrap${errors.email ? ' pm-auth-input-wrap--invalid' : ''}`}>
            <Mail size={18} className="pm-auth-input-icon" aria-hidden="true" />
            <input
              ref={emailRef} id={`${id}-email`} className="pm-auth-input" type="email" name="email"
              value={email} required autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
              placeholder="ban@example.com" aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
              onChange={(event) => { setEmail(event.target.value); setErrors((previous) => ({ ...previous, email: '' })); setSubmissionError('') }}
              onBlur={() => setErrors((previous) => ({ ...previous, email: emailError() }))}
            />
          </div>
          {errors.email && <p id={`${id}-email-error`} className="pm-auth-field-error" role="status">{errors.email}</p>}
        </div>
        <PasswordField
          label="Mật khẩu" name="password" value={password} required autoComplete="current-password"
          placeholder="Nhập mật khẩu của bạn" disabled={blocked} error={errors.password ?? ''}
          onChange={(event) => { setPassword(event.target.value); setErrors((previous) => ({ ...previous, password: '' })); setSubmissionError('') }}
          onBlur={() => setErrors((previous) => ({ ...previous, password: password ? '' : 'Vui lòng nhập mật khẩu.' }))}
        />
        <button className="pm-auth-submit" type="submit" disabled={blocked}>
          {busy ? <><LoaderCircle size={18} className="pm-auth-spinner" aria-hidden="true" /> Đang đăng nhập…</> : <>Đăng nhập <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </fieldset>
      <p className="pm-auth-switch">Chưa có tài khoản? <button type="button" disabled={blocked} onClick={() => onSwitchToRegister(email.trim())}>Đăng ký</button></p>
      <span className="pm-auth-sr-only" role="status">{busy ? 'Đang gửi yêu cầu đăng nhập.' : ''}</span>
    </form>
  )
}
