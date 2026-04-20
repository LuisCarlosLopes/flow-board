import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react'
import './OnboardingPage.css'

interface OnboardingPageProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * OnboardingPage — Educational modal for GitHub Personal Access Token (PAT) generation.
 *
 * Features:
 * - 6 educational sections: Intro, Steps 1-4, Troubleshooting, Best Practices
 * - Keyboard: Escape closes modal
 * - Click backdrop to close
 * - Accessible (WCAG 2.1 AA): role="dialog", aria-modal, aria-labelledby
 * - Responsive design (mobile to desktop)
 */
export function OnboardingPage({ isOpen, onClose }: OnboardingPageProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const initialFocusRef = useRef<HTMLElement | null>(null)

  // Save initial focus and restore on close; implement focus trap (Tab wrap) and Escape handling
  useEffect(() => {
    if (!isOpen) return

    // Save the element that had focus before modal opened
    initialFocusRef.current = document.activeElement as HTMLElement | null

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

    // Focus trap: Tab within modal wraps (last → first, first → last)
    // Also handle Escape key from anywhere in document (accessible to keyboard users)
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

  // Restore focus when modal closes
  useEffect(() => {
    if (isOpen) return
    if (initialFocusRef.current && initialFocusRef.current instanceof HTMLElement) {
      initialFocusRef.current.focus()
    }
  }, [isOpen])

  // Handle backdrop click to close modal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  // Handle Escape key on modal to close (for consistency with SearchModal pattern)
  const handleModalKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose],
  )

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={backdropRef}
      className="fb-onb-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="fb-onb-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Header with title and close button */}
        <div className="fb-onb-header">
          <h2 id="onboarding-title" className="fb-onb-title">
            Como gerar um Personal Access Token
          </h2>
          <button
            className="fb-onb-close-btn"
            onClick={onClose}
            aria-label="Fechar modal"
            type="button"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Scrollable content container */}
        <div className="fb-onb-content">
          {/* Section 1: Introduction */}
          <section className="fb-onb-section">
            <h3 className="fb-onb-section-title">O que é um Personal Access Token?</h3>
            <p className="fb-onb-section-text">
              Um <strong>Personal Access Token (PAT)</strong> é um tipo de segredo que autoriza o
              FlowBoard a ler e escrever dados no seu repositório GitHub privado. É como uma chave
              que dá acesso ao seu repositório de forma segura, sem revelar sua senha do GitHub.
            </p>
            <p className="fb-onb-section-text">
              <strong>Por que preciso?</strong> O FlowBoard salva os dados do seu quadro (cards,
              colunas, datas) diretamente em um repositório privado como arquivo JSON. Para isso,
              precisamos de autorização para acessar esse repositório.
            </p>
          </section>

          {/* Section 2: Step 1 */}
          <section className="fb-onb-section">
            <h3 className="fb-onb-section-title">Passo 1: Acessar GitHub Settings</h3>
            <ol className="fb-onb-steps">
              <li>Vá para <strong>github.com</strong></li>
              <li>
                Clique na sua foto no <strong>canto superior direito</strong>
              </li>
              <li>
                Selecione <strong>Settings → Developer settings</strong>
              </li>
            </ol>
          </section>

          {/* Section 3: Step 2 */}
          <section className="fb-onb-section">
            <h3 className="fb-onb-section-title">Passo 2: Criar Token</h3>
            <ol className="fb-onb-steps">
              <li>
                Clique em <strong>Personal access tokens → Tokens (classic)</strong>
              </li>
              <li>
                Clique em <strong>Generate new token (classic)</strong>
              </li>
              <li>
                Nomeie o token: <code>flowboard-data</code> (ou outro nome descritivo)
              </li>
            </ol>
          </section>

          {/* Section 4: Step 3 */}
          <section className="fb-onb-section">
            <h3 className="fb-onb-section-title">Passo 3: Selecionar Escopos</h3>
            <p className="fb-onb-section-text">
              <strong>Escopo recomendado:</strong> Selecione apenas <code>repo</code> (full control
              of private repositories)
            </p>
            <p className="fb-onb-section-text">
              Depois de selecionar:
            </p>
            <ol className="fb-onb-steps">
              <li>
                Clique em <strong>Generate token</strong>
              </li>
              <li>
                <strong>COPIE o token que aparece</strong> (começa com <code>ghp_</code>)
              </li>
              <li>
                ⚠️ <strong>Salve em local seguro</strong> — GitHub não mostrará novamente
              </li>
            </ol>
          </section>

          {/* Section 5: Step 4 */}
          <section className="fb-onb-section">
            <h3 className="fb-onb-section-title">Passo 4: Colar Token no FlowBoard</h3>
            <ol className="fb-onb-steps">
              <li>Volte aqui ao FlowBoard</li>
              <li>Cole o token no campo "Personal Access Token"</li>
              <li>Informe a URL do repositório: <code>https://github.com/voce/seu-repositorio</code></li>
              <li>Clique em "Conectar"</li>
            </ol>
            <p className="fb-onb-section-text">
              ✓ Se tudo estiver correto, você verá o quadro carregado!
            </p>
          </section>

          {/* Section 6: Troubleshooting */}
          <section className="fb-onb-section">
            <h3 className="fb-onb-section-title">Erros Comuns e Soluções</h3>
            <div className="fb-onb-troubleshooting">
              <div className="fb-onb-issue">
                <strong>❌ "Token expirado"</strong>
                <p>O PAT tem data de validade. Gere um novo token em GitHub Settings.</p>
              </div>
              <div className="fb-onb-issue">
                <strong>❌ "Permissões insuficientes"</strong>
                <p>Verifique se você selecionou o escopo <code>repo</code> ao criar o token.</p>
              </div>
              <div className="fb-onb-issue">
                <strong>❌ "Repositório não encontrado"</strong>
                <p>
                  Confirme que: (1) a URL está correta; (2) o repositório é privado ou você tem acesso; (3) o token foi gerado corretamente.
                </p>
              </div>
              <div className="fb-onb-issue">
                <strong>❌ "Token inválido"</strong>
                <p>
                  Certifique-se de que copiou o token inteiro (começando com <code>ghp_</code>).
                  Não há espaços extras?
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Best Practices */}
          <section className="fb-onb-section fb-onb-section--warning">
            <h3 className="fb-onb-section-title">⚠️ Boas Práticas de Segurança</h3>
            <ul className="fb-onb-tips">
              <li>
                <strong>Nunca compartilhe</strong> seu PAT com outras pessoas
              </li>
              <li>
                <strong>Nunca commite</strong> o token em arquivos do seu repositório de dados
              </li>
              <li>
                <strong>Revogue tokens antigos</strong> que não usa mais (em GitHub Settings)
              </li>
              <li>
                <strong>Se vazou</strong>, revogue imediatamente em GitHub Settings
              </li>
            </ul>
          </section>
        </div>

        {/* Footer with close button */}
        <div className="fb-onb-footer">
          <button className="fb-onb-action-btn" onClick={onClose} type="button">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
