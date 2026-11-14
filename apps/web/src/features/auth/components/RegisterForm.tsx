import { useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, CircleAlert, LoaderCircle, Mail } from 'lucide-react'
import PasswordField from './PasswordField'

/** UI values only; a future API adapter decides which fields its contract accepts. */
export interface RegisterValues {
  email: string
  password: string
  confirmPassword: string
  displayName?: string
}

export interface RegisterFormProps {
  onSubmit: (values: RegisterValues) => void | Promise<void>
  onSwitchToLogin: (email: string) => void
  initialEmail?: string
  isLoading?: boolean
  disabled?: boolean
  error?: string | null
  realAuth?: boolean
}

export default function RegisterForm({
  onSubmit,
  onSwitchToLogin,
  initialEmail = '',
  isLoading = false,
  disabled = false,
  error,
  realAuth = false,
}: RegisterFormProps) {
  const id = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const submitLock = useRef(false)
  const [email, setEmail] = useState(initialEmail)
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterValues, string>>>({})
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

  function confirmationError(value = confirmPassword) {
    if (!value) return 'Vui lòng nhập lại mật khẩu.'
    return value === password ? '' : 'Mật khẩu xác nhận chưa khớp.'
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocked || submitLock.current) return
    const form = event.currentTarget
    const nextErrors = {
      displayName: realAuth && (!displayName || Array.from(displayName).length>100) ? 'Tên hiển thị cần 1–100 ký tự.' : '',
      email: emailError(),
      password: !password ? 'Vui lòng nhập mật khẩu.' : realAuth && (Array.from(password).length<12 || Array.from(password).length>256) ? 'Mật khẩu cần 12–256 ký tự.' : '',
      confirmPassword: confirmationError(),
    }
    setErrors(nextErrors)
    setSubmissionError('')
    const firstInvalid = (['displayName','email', 'password', 'confirmPassword'] as const).find((field) => nextErrors[field])
    if (firstInvalid) {
      const input = form.elements.namedItem(firstInvalid)
      if (input instanceof HTMLElement) input.focus()
      return
    }
    submitLock.current = true
    setSubmitting(true)
    try {
      await onSubmit({ email: email.trim(), password, confirmPassword, ...(realAuth?{displayName}:{}) })
    } catch {
      setSubmissionError('Chưa gửi được yêu cầu đăng ký. Bạn thử lại nhé.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <form className="pm-auth-form" aria-label="Đăng ký" aria-busy={busy} noValidate onSubmit={handleSubmit}>
      {formError && <div className="pm-auth-form-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{formError}</span></div>}
      <fieldset className="pm-auth-fields" disabled={blocked}>
        {realAuth && <div className="pm-auth-field"><label className="pm-auth-label" htmlFor={`${id}-name`}>Tên hiển thị</label><div className="pm-auth-input-wrap"><input id={`${id}-name`} className="pm-auth-input" name="displayName" autoComplete="nickname" value={displayName} required onChange={event=>setDisplayName(event.target.value)} aria-invalid={Boolean(errors.displayName)} /></div>{errors.displayName && <p className="pm-auth-field-error" role="status">{errors.displayName}</p>}</div>}
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
          label="Mật khẩu" name="password" value={password} required autoComplete="new-password"
          placeholder="Tạo mật khẩu của bạn" disabled={blocked} error={errors.password ?? ''}
          onChange={(event) => {
            const value = event.target.value
            setPassword(value)
            setErrors((previous) => ({ ...previous, password: '', confirmPassword: confirmPassword ? (confirmPassword === value ? '' : 'Mật khẩu xác nhận chưa khớp.') : previous.confirmPassword ?? '' }))
            setSubmissionError('')
          }}
          onBlur={() => setErrors((previous) => ({ ...previous, password: password ? '' : 'Vui lòng nhập mật khẩu.' }))}
        />
        <PasswordField
          label="Xác nhận mật khẩu" name="confirmPassword" value={confirmPassword} required autoComplete="new-password"
          placeholder="Nhập lại mật khẩu" disabled={blocked} error={errors.confirmPassword ?? ''}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            setErrors((previous) => ({ ...previous, confirmPassword: previous.confirmPassword ? confirmationError(event.target.value) : '' }))
            setSubmissionError('')
          }}
          onBlur={() => setErrors((previous) => ({ ...previous, confirmPassword: confirmationError() }))}
        />
        <button className="pm-auth-submit" type="submit" disabled={blocked}>
          {busy ? <><LoaderCircle size={18} className="pm-auth-spinner" aria-hidden="true" /> Đang đăng ký…</> : <>Tạo tài khoản <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </fieldset>
      <p className="pm-auth-switch">Đã có tài khoản? <button type="button" disabled={blocked} onClick={() => onSwitchToLogin(email.trim())}>Đăng nhập</button></p>
      <span className="pm-auth-sr-only" role="status">{busy ? 'Đang gửi yêu cầu đăng ký.' : ''}</span>
    </form>
  )
}
