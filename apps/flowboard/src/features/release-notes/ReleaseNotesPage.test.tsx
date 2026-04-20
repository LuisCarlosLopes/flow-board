import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ReleaseNotesPage from './ReleaseNotesPage'

function renderPage(initialPath = '/releases') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ReleaseNotesPage />
    </MemoryRouter>,
  )
}

describe('ReleaseNotesPage', () => {
  it('renders the page shell', () => {
    renderPage()
    expect(screen.getByTestId('release-notes-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /^Notas de versão$/i })).toBeInTheDocument()
  })

  it('top bar links to home', () => {
    renderPage()
    const home = screen.getByTestId('release-notes-back-home')
    expect(home).toHaveAttribute('href', '/')
    expect(home).toHaveAccessibleName(/voltar ao início/i)
  })

  it('lists releases in descending order (newest first)', () => {
    renderPage()
    const cards = screen.getAllByTestId(/^release-card-/)
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveAttribute('data-testid', 'release-card-0.2.0')
    expect(cards[1]).toHaveAttribute('data-testid', 'release-card-0.1.0')
  })

  it('lists all releases from releases.json', () => {
    renderPage()
    expect(screen.getByTestId('release-card-0.1.0')).toBeInTheDocument()
    expect(screen.getByTestId('release-card-0.2.0')).toBeInTheDocument()
    expect(screen.getByText('Lançamento inicial')).toBeInTheDocument()
    expect(screen.getByText('Interface de histórico de versões')).toBeInTheDocument()
  })

  it('renders filter controls', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTestId('filter-feature'))
    expect(screen.getByTestId('filter-feature')).toHaveClass('filter-btn--active')
  })

  it('filters to feature changes only', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTestId('filter-feature'))

    const v020 = screen.getByTestId('release-card-0.2.0')
    expect(within(v020).getByText('Interface de histórico de versões')).toBeInTheDocument()
    expect(within(v020).queryByText('Otimização de performance')).not.toBeInTheDocument()

    const v010 = screen.getByTestId('release-card-0.1.0')
    expect(within(v010).getByText('Lançamento inicial')).toBeInTheDocument()
    expect(within(v010).queryByText('Ajuste no arrastar e soltar')).not.toBeInTheDocument()
  })

  it('"Todas" shows every change again', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTestId('filter-fix'))
    expect(screen.queryByTestId('release-card-0.2.0')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('filter-all'))
    expect(screen.getByTestId('release-card-0.2.0')).toBeInTheDocument()
    expect(screen.getByText('Otimização de performance')).toBeInTheDocument()
  })

  it('shows archive badge for archived releases', () => {
    renderPage()
    const v010 = screen.getByTestId('release-card-0.1.0')
    expect(within(v010).getByTestId('archive-badge')).toBeInTheDocument()
    const v020 = screen.getByTestId('release-card-0.2.0')
    expect(within(v020).queryByTestId('archive-badge')).not.toBeInTheDocument()
  })

  it('exposes change type markers for styling', () => {
    renderPage()
    expect(document.querySelectorAll('[data-change-type="feature"]').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-change-type="fix"]').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-change-type="improvement"]').length).toBeGreaterThan(0)
  })
})
