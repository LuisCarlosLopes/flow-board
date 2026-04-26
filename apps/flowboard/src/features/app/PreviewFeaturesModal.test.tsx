import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FeatureFlagProvider } from '../../infrastructure/featureFlags/FeatureFlagContext'
import { PreviewFeaturesModal } from './PreviewFeaturesModal'

vi.mock('../../infrastructure/featureFlags/featureFlagRegistry', () => {
  const mockPreview = {
    id: 'test_preview',
    title: 'Test preview',
    description: 'Desc',
    defaultEnabled: false,
    lifecycle: 'preview' as const,
  }
  return {
    FEATURE_FLAG_REGISTRY: [mockPreview],
    getFeatureFlagDefinition: (id: string) => (id === 'test_preview' ? mockPreview : undefined),
    listPreviewFlags: () => [mockPreview],
  }
})

function renderModal(isOpen: boolean, onClose = vi.fn()) {
  return render(
    <FeatureFlagProvider>
      <PreviewFeaturesModal isOpen={isOpen} onClose={onClose} />
    </FeatureFlagProvider>,
  )
}

describe('PreviewFeaturesModal', () => {
  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('focuses close button when opened', async () => {
    renderModal(true)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /fechar/i })).toHaveFocus()
    })
  })

  it('wraps Tab focus between close and toggle', async () => {
    const user = userEvent.setup()
    renderModal(true)
    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    const toggle = screen.getByTestId('preview-flag-toggle-test_preview')
    await waitFor(() => expect(closeBtn).toHaveFocus())
    await user.tab()
    expect(document.activeElement).toBe(toggle)
    await user.tab()
    expect(document.activeElement).toBe(closeBtn)
  })

  it('wraps Shift+Tab from first focusable to last', async () => {
    const user = userEvent.setup()
    renderModal(true)
    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    const toggle = screen.getByTestId('preview-flag-toggle-test_preview')
    await waitFor(() => expect(closeBtn).toHaveFocus())
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(toggle)
  })

  it('moves focus to first element when Tab from outside modal', () => {
    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.appendChild(outside)
    renderModal(true)
    const closeBtn = screen.getByRole('button', { name: /fechar/i })
    outside.focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(document.activeElement).toBe(closeBtn)
    outside.remove()
  })

  it('opens dialog and toggles preview flag', async () => {
    const user = userEvent.setup()
    renderModal(true)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Test preview')).toBeInTheDocument()
    const toggle = screen.getByRole('switch', { name: 'Test preview' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal(true, onClose)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking backdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = renderModal(true, onClose)
    const backdrop = container.querySelector('.fb-pf-backdrop')
    expect(backdrop).toBeTruthy()
    await user.click(backdrop as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
