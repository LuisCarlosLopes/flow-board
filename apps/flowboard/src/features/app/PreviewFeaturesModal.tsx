import { useEffect, useRef } from 'react'
import { useFeatureFlagContext } from '../../infrastructure/featureFlags/FeatureFlagContext'
import './PreviewFeaturesModal.css'

type Props = {
  isOpen: boolean
  onClose: () => void
}

// @MindContext: Modal só para flags `preview`; stable nunca listadas (registo + R1).
export function PreviewFeaturesModal({ isOpen, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const { previewFlags, isEnabledForDefinition, setPreviewFlagEnabled } = useFeatureFlagContext()

  useEffect(() => {
    if (!isOpen) return
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const modal = modalRef.current
    if (!modal) return

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const listFocusable = (): HTMLElement[] => {
      const nodes = modal.querySelectorAll<HTMLElement>(focusableSelector)
      return [...nodes].filter(
        (el) => el.getAttribute('aria-hidden') !== 'true' && modal.contains(el),
      )
    }

    const onDocumentKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = listFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || !modal.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
        return
      }
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fb-pf-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="fb-pf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-pf-title"
      >
        <div className="fb-pf-header">
          <h2 id="fb-pf-title" className="fb-pf-title">
            Pré-visualizações
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="fb-pf-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="fb-pf-body">
          {previewFlags.length === 0 ? (
            <p className="fb-pf-empty" data-testid="preview-features-empty">
              Não há pré-visualizações disponíveis nesta versão.
            </p>
          ) : (
            <ul className="fb-pf-list">
              {previewFlags.map((def) => (
                <li key={def.id} className="fb-pf-row" data-testid={`preview-flag-row-${def.id}`}>
                  <div className="fb-pf-row-text">
                    <span id={`fb-pf-flag-title-${def.id}`} className="fb-pf-row-title">
                      {def.title}
                    </span>
                    {def.description ? <span className="fb-pf-row-desc">{def.description}</span> : null}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabledForDefinition(def)}
                    aria-labelledby={`fb-pf-flag-title-${def.id}`}
                    className="fb-pf-switch"
                    data-testid={`preview-flag-toggle-${def.id}`}
                    onClick={() => setPreviewFlagEnabled(def.id, !isEnabledForDefinition(def))}
                  >
                    <span className="fb-pf-switch__track" aria-hidden>
                      <span className="fb-pf-switch__thumb" />
                    </span>
                    <span className="fb-pf-switch__label">
                      {isEnabledForDefinition(def) ? 'Ativado' : 'Desativado'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
