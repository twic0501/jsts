import { useId, type ReactNode } from 'react'
import { Orbit, Sparkles } from 'lucide-react'
import '../styles/auth.css'

export interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Embedded supplies just the reusable card, without a full-page background. */
  variant?: 'page' | 'embedded'
  /** Omit to follow Paper Magic's existing root data-theme. */
  theme?: 'light' | 'dark'
  /** Optional IDs let a surrounding dialog reference this visible heading and description. */
  titleId?: string
  descriptionId?: string
}

/** Presentational shell; no session, routing, modal or authentication behavior. */
export default function AuthLayout({
  title,
  description,
  children,
  footer,
  variant = 'page',
  theme,
  titleId: providedTitleId,
  descriptionId: providedDescriptionId,
}: AuthLayoutProps) {
  const generatedTitleId = useId()
  const generatedDescriptionId = useId()
  const titleId = providedTitleId ?? generatedTitleId
  const descriptionId = providedDescriptionId ?? generatedDescriptionId

  return (
    <div className={`pm-auth pm-auth--${variant}`} data-theme={theme}>
      <div className="pm-auth-aurora" aria-hidden="true">
        <span /><span /><span />
      </div>
      <section
        className="pm-auth-card"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="pm-auth-brand" aria-label="Paper Magic">
          <span className="pm-auth-brand-icon"><Orbit size={26} aria-hidden="true" /></span>
          <span>paper<em>magic</em></span>
        </div>
        <span className="pm-auth-eyebrow"><Sparkles size={13} aria-hidden="true" /> MỘT KHÔNG GIAN CHO SỰ TÒ MÒ</span>
        <header className="pm-auth-heading">
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </header>
        {children}
        <footer className="pm-auth-footer">
          {footer ?? 'Một chút tò mò. Mở ra cả vũ trụ.'}
        </footer>
      </section>
    </div>
  )
}
