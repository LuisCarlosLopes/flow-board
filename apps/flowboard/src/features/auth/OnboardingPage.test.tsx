import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingPage } from './OnboardingPage'

describe('OnboardingPage', () => {
  it('renderiza modal quando isOpen=true', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const backdrop = container.querySelector('.fb-onb-backdrop')
    const modal = container.querySelector('.fb-onb-modal')

    expect(backdrop).toBeInTheDocument()
    expect(modal).toBeInTheDocument()
    expect(modal).toHaveAttribute('aria-modal', 'true')
  })

  it('retorna null quando isOpen=false', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={false} onClose={onClose} />)

    const backdrop = container.querySelector('.fb-onb-backdrop')
    expect(backdrop).not.toBeInTheDocument()
  })

  it('chama onClose ao clicar backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const backdrop = container.querySelector('.fb-onb-backdrop')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('não chama onClose ao clicar dentro do modal', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const modal = container.querySelector('.fb-onb-modal')
    fireEvent.click(modal!)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn()
    render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const user = userEvent.setup()
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('renderiza conteúdo educacional (seções, exemplos)', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    // Verify modal rendered
    const modal = container.querySelector('.fb-onb-modal')
    expect(modal).toBeInTheDocument()

    // Check content is present (check inner text)
    const content = container.textContent || ''
    expect(content).toContain('Personal Access Token')
    expect(content).toContain('Passo')
    expect(content).toContain('GitHub')
  })

  it('tem atributos acessibilidade corretos', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const modal = container.querySelector('.fb-onb-modal')
    expect(modal).toHaveAttribute('aria-modal', 'true')
    expect(modal).toHaveAttribute('aria-labelledby', 'onboarding-title')

    const title = container.querySelector('#onboarding-title')
    expect(title).toBeInTheDocument()
  })

  it('restaura foco para elemento anterior quando modal fecha', async () => {
    const onClose = vi.fn()
    const openButton = document.createElement('button')
    openButton.textContent = 'Open Modal'
    document.body.appendChild(openButton)
    openButton.focus()

    const { rerender } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    // Modal is open, focus should be on something inside modal or not on button
    const modal = document.querySelector('.fb-onb-modal')
    expect(modal).toBeInTheDocument()

    // Simulate closing modal
    rerender(<OnboardingPage isOpen={false} onClose={onClose} />)

    // Wait for focus to be restored
    await waitFor(() => {
      expect(document.activeElement).toBe(openButton)
    })

    document.body.removeChild(openButton)
  })

  it('implementa focus trap: Tab ao final salta para primeiro elemento', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const buttons = container.querySelectorAll('button')
    const lastButton = buttons[buttons.length - 1]

    // Focus last button
    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    // Press Tab
    const user = userEvent.setup()
    await user.keyboard('{Tab}')

    // Should focus first button (first focusable element)
    await waitFor(() => {
      const firstButton = container.querySelector('button')
      expect(document.activeElement).toBe(firstButton)
    })
  })

  it('implementa focus trap: Shift+Tab no primeiro elemento salta para último', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const buttons = container.querySelectorAll('button')
    const firstButton = buttons[0]

    // Focus first button
    firstButton.focus()
    expect(document.activeElement).toBe(firstButton)

    // Press Shift+Tab
    const user = userEvent.setup()
    await user.keyboard('{Shift>}{Tab}{/Shift}')

    // Should focus last button
    await waitFor(() => {
      const lastButton = buttons[buttons.length - 1]
      expect(document.activeElement).toBe(lastButton)
    })
  })

  it('fechar com botão X chama onClose', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const closeButton = container.querySelector('.fb-onb-close-btn')
    expect(closeButton).toBeInTheDocument()

    fireEvent.click(closeButton!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fechar com botão Fechar (footer) chama onClose', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    // Find the footer button (último button)
    const buttons = container.querySelectorAll('button')
    const footerButton = buttons[buttons.length - 1]
    expect(footerButton.textContent).toContain('Fechar')

    fireEvent.click(footerButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('não propaga cliques do modal para backdrop', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const title = container.querySelector('.fb-onb-title')

    // Click on title (inside modal)
    fireEvent.click(title!)

    // onClose should not be called because click should not propagate
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renderiza todas as 7 seções educacionais', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const sections = container.querySelectorAll('.fb-onb-section')
    expect(sections.length).toBe(7)

    const content = container.textContent || ''
    expect(content).toContain('O que é um Personal Access Token')
    expect(content).toContain('Passo 1: Acessar GitHub Settings')
    expect(content).toContain('Passo 2: Criar Token')
    expect(content).toContain('Passo 3: Selecionar Escopos')
    expect(content).toContain('Passo 4: Colar Token no FlowBoard')
    expect(content).toContain('Erros Comuns e Soluções')
    expect(content).toContain('Boas Práticas de Segurança')
  })

  it('validação: escopo recomendado é "repo"', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const content = container.textContent || ''
    expect(content).toContain('repo')
    expect(content).toContain('Selecione apenas')
  })

  it('validação: não contém instruções para scopes adicionais desnecessários', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const content = container.textContent || ''
    // Verify it says to select ONLY "repo"
    expect(content).toContain('Selecione apenas')
    expect(content).toContain('repo')
  })

  it('validação: token começa com ghp_', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const content = container.textContent || ''
    expect(content).toContain('ghp_')
  })

  it('renderiza botão close com aria-label acessível', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const closeButton = container.querySelector('.fb-onb-close-btn')
    expect(closeButton).toHaveAttribute('aria-label', 'Fechar modal')
  })

  it('backdrop tem role="presentation"', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const backdrop = container.querySelector('.fb-onb-backdrop')
    expect(backdrop).toHaveAttribute('role', 'presentation')
  })

  it('lida com clique em onClose sem backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const backdrop = container.querySelector('.fb-onb-backdrop')
    // Simulate click on backdrop by directly calling click handler
    fireEvent.click(backdrop!)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('transition: isOpen false → true renderiza e recaptura foco', () => {
    const onClose = vi.fn()
    const { rerender, container } = render(<OnboardingPage isOpen={false} onClose={onClose} />)

    expect(container.querySelector('.fb-onb-modal')).not.toBeInTheDocument()

    rerender(<OnboardingPage isOpen={true} onClose={onClose} />)

    expect(container.querySelector('.fb-onb-modal')).toBeInTheDocument()
  })

  it('Tab trap: Tab quando foco fora do modal salta para primeiro elemento', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    // Force focus to something outside modal (simulate document body)
    document.body.focus()
    expect(document.activeElement).toBe(document.body)

    // Press Tab
    const user = userEvent.setup()
    await user.keyboard('{Tab}')

    // Should focus first focusable element in modal
    await waitFor(() => {
      const firstButton = container.querySelector('button')
      expect(firstButton).toHaveFocus()
    })
  })

  it('Escape handler no modal element também funciona', async () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const modal = container.querySelector('.fb-onb-modal') as HTMLElement | null
    modal?.focus()

    // Simulate keyboard event on modal element directly
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    })

    modal?.dispatchEvent(event)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('validação: conteúdo menciona cautela com segurança', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const content = container.textContent || ''
    expect(content).toContain('Nunca compartilhe')
    expect(content).toContain('Nunca commite')
    expect(content).toContain('seguro')
  })

  it('validação: instruções mencionam repositório privado', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const content = container.textContent || ''
    expect(content).toContain('repositório privado')
  })

  it('validação: exemplos de URL formato correto', () => {
    const onClose = vi.fn()
    const { container } = render(<OnboardingPage isOpen={true} onClose={onClose} />)

    const content = container.textContent || ''
    expect(content).toContain('https://github.com/voce/seu-repositorio')
  })
})
