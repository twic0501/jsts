import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import AuthLayout from './AuthLayout'
import LoginForm, { type LoginValues } from './LoginForm'
import RegisterForm, { type RegisterValues } from './RegisterForm'

export interface AuthModalProps {
  isOpen: boolean
  realAuth?: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
  initialEmail?: string
  message?: string
  theme?: 'light' | 'dark'
  isLoading?: boolean
  error?: string | null
  onModeChange?: () => void
  /** Integration callbacks only. The parent owns auth state and decides when to close. */
  onLogin?: (values: LoginValues) => void | Promise<void>
  onRegister?: (values: RegisterValues) => void | Promise<void>
}

const CLOSE_MS = 180
const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'

/** Controlled portal overlay; App and the scene remain outside and mounted. */
export default function AuthModal(props: AuthModalProps) {
  const [present, setPresent] = useState(props.isOpen)
  useEffect(() => {
    if (props.isOpen) { setPresent(true); return }
    if (!present) return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : CLOSE_MS
    const timer = window.setTimeout(() => setPresent(false), delay)
    return () => window.clearTimeout(timer)
  }, [props.isOpen, present])

  if (!present || typeof document === 'undefined') return null
  return createPortal(<AuthModalDialog {...props} />, document.body)
}

function AuthModalDialog({
  isOpen, onClose, initialMode = 'login', initialEmail = '', message,
  theme, isLoading = false, error, onLogin, onRegister, onModeChange, realAuth = false,
}: AuthModalProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  const openRef = useRef(isOpen)
  closeRef.current = onClose
  openRef.current = isOpen
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState(initialEmail)
  const [unavailable, setUnavailable] = useState('')
  const [cycle, setCycle] = useState(0)
  const previousOpen = useRef(false)

  useLayoutEffect(() => {
    if (isOpen && !previousOpen.current) {
      setMode(initialMode)
      setEmail(initialEmail)
      setUnavailable('')
      setCycle((value) => value + 1)
      const focus = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }))
      previousOpen.current = isOpen
      return () => cancelAnimationFrame(focus)
    }
    previousOpen.current = isOpen
  }, [isOpen, initialMode, initialEmail])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.documentElement
    const saved = [root, document.body].map((element) => ({
      element,
      declarations: (['overflow-x', 'overflow-y'] as const).map((property) => ({
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      })),
    }))
    const gutter = root.style.getPropertyValue('scrollbar-gutter')
    const gutterPriority = root.style.getPropertyPriority('scrollbar-gutter')
    const scrollX = window.scrollX, scrollY = window.scrollY
    // Reserve only an existing scrollbar; adding a new gutter would resize a fixed 3D canvas.
    if (window.innerWidth > root.clientWidth) root.style.setProperty('scrollbar-gutter', 'stable')
    saved.forEach(({ element }) => {
      element.style.setProperty('overflow-x', 'hidden')
      element.style.setProperty('overflow-y', 'hidden')
    })
    // showModal supplies native background inertness, even above an existing dialog.
    dialog.showModal()
    const initialFocus = requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }))

    const onKey = (event: KeyboardEvent) => {
      if (!dialog.open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (openRef.current) closeRef.current()
      } else if (event.key === 'Tab') {
        // Capture before older document-level modal traps can take focus back.
        event.preventDefault()
        event.stopImmediatePropagation()
        const elements = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
          .filter((element) => !element.matches(':disabled') && element.getClientRects().length > 0)
        const current = elements.indexOf(document.activeElement as HTMLElement)
        const next = current < 0 ? (event.shiftKey ? elements.length - 1 : 0)
          : (current + (event.shiftKey ? -1 : 1) + elements.length) % elements.length
        ;(elements[next] ?? dialog).focus({ preventScroll: true })
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(initialFocus)
      window.removeEventListener('keydown', onKey, true)
      dialog.close()
      saved.forEach(({ element, declarations }) => {
        declarations.forEach(({ property, value, priority }) => {
          if (value) element.style.setProperty(property, value, priority)
          else element.style.removeProperty(property)
        })
      })
      if (gutter) root.style.setProperty('scrollbar-gutter', gutter, gutterPriority)
      else root.style.removeProperty('scrollbar-gutter')
      window.scrollTo(scrollX, scrollY)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  function switchMode(next: 'login' | 'register', currentEmail: string) {
    setEmail(currentEmail)
    setMode(next)
    setUnavailable('')
    onModeChange?.()
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }))
  }
  const description = message ?? 'Đăng nhập để lưu bài viết này vào thư viện của bạn.'
  const common = { initialEmail: email, isLoading, disabled: !isOpen, error: unavailable || error || null }

  return (
    <dialog
      ref={dialogRef} className="pm-auth pm-auth-dialog" data-theme={theme}
      data-state={isOpen ? 'open' : 'closing'} role="dialog" aria-modal="true"
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); if (openRef.current) closeRef.current() }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button type="button" className="pm-auth-modal-close" aria-label="Đóng cửa sổ đăng nhập" disabled={!isOpen} onClick={onClose}><X size={20} aria-hidden="true" /></button>
      <div className="pm-auth-modal-scroll">
        <AuthLayout
          variant="embedded" {...(theme ? { theme } : {})}
          title={mode === 'login' ? 'Đăng nhập vào Paper Magic' : 'Tạo tài khoản Paper Magic'}
          description={description} titleId={`${id}-title`} descriptionId={`${id}-description`}
        >
          <div className="pm-auth-modal-form" key={`${cycle}-${mode}`}>
            {mode === 'login' ? (
              <LoginForm {...common} onSwitchToRegister={(value) => switchMode('register', value)} onSubmit={async (values) => {
                if (!openRef.current) return
                if (!onLogin) { setUnavailable('Đăng nhập hiện chưa khả dụng. Vui lòng thử lại sau.'); return }
                await onLogin(values)
              }} />
            ) : (
              <RegisterForm {...common} realAuth={realAuth} onSwitchToLogin={(value) => switchMode('login', value)} onSubmit={async (values) => {
                if (!openRef.current) return
                if (!onRegister) { setUnavailable('Đăng ký hiện chưa khả dụng. Vui lòng thử lại sau.'); return }
                await onRegister(values)
              }} />
            )}
          </div>
        </AuthLayout>
      </div>
    </dialog>
  )
}
