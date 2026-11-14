import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import '../styles/auth.css'

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  hint?: string
}

/** Controlled input value; only the visibility toggle is managed internally. */
export default function PasswordField({
  label,
  error,
  hint,
  id,
  disabled,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...inputProps
}: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  const descriptionIds = [describedBy, hint ? `${inputId}-hint` : '', error ? `${inputId}-error` : '']
    .filter(Boolean).join(' ') || undefined
  const toggleLabel = `${visible ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase('vi')}`

  return (
    <div className="pm-auth-field">
      <label className="pm-auth-label" htmlFor={inputId}>{label}</label>
      <div className={`pm-auth-input-wrap${error ? ' pm-auth-input-wrap--invalid' : ''}`}>
        <LockKeyhole size={18} className="pm-auth-input-icon" aria-hidden="true" />
        <input
          {...inputProps}
          id={inputId}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={error ? true : invalid}
          aria-describedby={descriptionIds}
          className={`pm-auth-input${inputProps.className ? ` ${inputProps.className}` : ''}`}
        />
        <button
          type="button"
          className="pm-auth-password-toggle"
          aria-label={toggleLabel}
          aria-pressed={visible}
          aria-controls={inputId}
          title={toggleLabel}
          disabled={disabled}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && <p id={`${inputId}-hint`} className="pm-auth-hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="pm-auth-field-error" role="status">{error}</p>}
    </div>
  )
}
