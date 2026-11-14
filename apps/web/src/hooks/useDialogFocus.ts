import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isVisible(element: HTMLElement) {
  return element.getClientRects().length > 0 && !element.closest('[inert], [aria-hidden="true"]')
}

/** Keep keyboard navigation inside a dialog, then return focus to its opener. */
export function useDialogFocus<T extends HTMLElement>(
  active: boolean,
  dialogRef: RefObject<T | null>,
  onClose: () => void,
  restoreSelector?: string
) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!active || !dialog) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible)
    const initial = requestAnimationFrame(() => (focusable()[0] ?? dialog).focus())

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const elements = focusable()
      const first = elements[0]
      const last = elements.at(-1)
      if (!first || !last) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const current = document.activeElement
      if (!dialog.contains(current) || current === dialog) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(initial)
      document.removeEventListener('keydown', onKey, true)
      const fallback = restoreSelector ? document.querySelector<HTMLElement>(restoreSelector) : null
      const target = opener?.isConnected && isVisible(opener) ? opener : fallback
      if (target?.isConnected && isVisible(target)) target.focus({ preventScroll: true })
    }
  }, [active, dialogRef, restoreSelector])
}
