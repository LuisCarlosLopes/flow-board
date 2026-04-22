import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'

const { loadBoardMock } = vi.hoisted(() => ({
  loadBoardMock: vi.fn(),
}))

vi.mock('../../infrastructure/github/fromSession', () => ({
  createClientFromSession: () => ({}),
}))

vi.mock('../../infrastructure/persistence/boardRepository', () => ({
  createBoardRepository: () => ({
    loadBoard: loadBoardMock,
  }),
}))

import { SearchModal, clearSearchModalBoardCache } from './SearchModal'

const emptyBoardDoc = (boardId: string): BoardDocumentJson => ({
  schemaVersion: 1,
  boardId,
  title: 'Test board',
  columns: [],
  cards: [],
  timeSegments: [],
  cardTimeState: {},
})

const boardWithSearchableCard = (boardId: string): BoardDocumentJson => ({
  ...emptyBoardDoc(boardId),
  columns: [{ columnId: 'col1', label: 'Todo', role: 'backlog' }],
  cards: [
    {
      cardId: 'c1',
      title: 'Unique Alpha Card',
      description: 'Some description',
      columnId: 'col1',
    },
  ],
})

const boardWithArchivedSearchableCard = (boardId: string): BoardDocumentJson => ({
  ...emptyBoardDoc(boardId),
  columns: [{ columnId: 'col1', label: 'Todo', role: 'backlog' }],
  cards: [
    {
      cardId: 'c-arch',
      title: 'Unique Alpha Archived',
      columnId: 'col1',
      archived: true,
      archivedAt: '2026-04-22T12:00:00.000Z',
    },
  ],
})

describe('SearchModal', () => {
  let mockSession: FlowBoardSession

  beforeEach(() => {
    clearSearchModalBoardCache()
    mockSession = {
      pat: 'test-pat',
      repoUrl: 'https://github.com/test/repo',
      webUrl: 'https://github.com/test/repo',
      owner: 'test',
      repo: 'repo',
      apiBase: 'https://api.github.com',
    }
    loadBoardMock.mockResolvedValue({ doc: emptyBoardDoc('board-1'), sha: 'abc' })
  })

  afterEach(() => {
    cleanup()
    clearSearchModalBoardCache()
    vi.clearAllMocks()
  })

  // Test 1: Modal not rendered when closed
  it('should not render modal if isOpen=false', () => {
    const { container } = render(
      <SearchModal
        isOpen={false}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-backdrop')).not.toBeInTheDocument()
  })

  // Test 2: Modal renders when open with backdrop
  it('should render modal structure when isOpen=true', async () => {
    const { container, findByRole } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-backdrop')).toBeInTheDocument()
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()
    await findByRole('dialog')
    expect(loadBoardMock).toHaveBeenCalledWith(
      'board-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  // Test 3: Input field is present
  it('should render input field in modal', async () => {
    const { container, findByRole } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    await findByRole('dialog')
    const input = container.querySelector('.fb-sm-input')
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement)?.placeholder).toContain('Buscar')
  })

  // Test 4: Results container exists
  it('should have results container', async () => {
    const { container, findByRole } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    await findByRole('dialog')
    expect(container.querySelector('.fb-sm-results-container')).toBeInTheDocument()
  })

  // Test 5: Modal closes when isOpen changes
  it('should not render when isOpen changes to false', () => {
    const { container, rerender } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()

    rerender(
      <SearchModal
        isOpen={false}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-modal')).not.toBeInTheDocument()
  })

  // Test 6: Props are accepted
  it('should accept onSelectResult callback', async () => {
    const mockSelectResult = () => {}
    const { container, findByRole } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
        onSelectResult={mockSelectResult}
      />,
    )
    await findByRole('dialog')
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()
  })

  // Test 7: Different boardId renders
  it('should accept different boardId', async () => {
    loadBoardMock.mockResolvedValueOnce({ doc: emptyBoardDoc('board-999'), sha: 'x' })
    const { container, findByRole } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-999"
        session={mockSession}
      />,
    )
    await findByRole('dialog')
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()
    expect(loadBoardMock).toHaveBeenCalledWith(
      'board-999',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('closes when Escape is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <SearchModal isOpen={true} onClose={onClose} boardId="board-1" session={mockSession} />,
    )
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('textbox', { name: /Buscar no quadro/i }))
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when Escape is pressed while focus is on a result', async () => {
    loadBoardMock.mockResolvedValue({ doc: boardWithSearchableCard('board-1'), sha: 'x' })
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <SearchModal isOpen={true} onClose={onClose} boardId="board-1" session={mockSession} />,
    )
    await screen.findByRole('dialog')
    const input = screen.getByRole('textbox', { name: /Buscar no quadro/i })
    await user.type(input, 'Alpha')
    const resultBtn = await screen.findByTestId('search-result-c1')
    resultBtn.focus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <SearchModal isOpen={true} onClose={onClose} boardId="board-1" session={mockSession} />,
    )
    await screen.findByRole('dialog')
    const backdrop = container.querySelector('.fb-sm-backdrop')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows matching results when user types', async () => {
    loadBoardMock.mockResolvedValue({ doc: boardWithSearchableCard('board-1'), sha: 'x' })
    const user = userEvent.setup()
    render(
      <SearchModal isOpen={true} onClose={() => {}} boardId="board-1" session={mockSession} />,
    )
    await screen.findByRole('dialog')
    const input = screen.getByRole('textbox', { name: /Buscar no quadro/i })
    await user.type(input, 'Alpha')
    await waitFor(() => {
      expect(screen.getByTestId('search-result-c1')).toBeInTheDocument()
    })
  })

  it('shows Arquivado badge for archived search hits', async () => {
    loadBoardMock.mockResolvedValue({ doc: boardWithArchivedSearchableCard('board-1'), sha: 'x' })
    const user = userEvent.setup()
    render(
      <SearchModal isOpen={true} onClose={() => {}} boardId="board-1" session={mockSession} />,
    )
    await screen.findByRole('dialog')
    await user.type(screen.getByRole('textbox', { name: /Buscar no quadro/i }), 'Alpha')
    await waitFor(() => {
      expect(screen.getByTestId('search-result-c-arch')).toBeInTheDocument()
    })
    expect(screen.getByTestId('search-result-archived-c-arch')).toBeInTheDocument()
  })

  it('calls onSelectResult with card id when a result is activated', async () => {
    loadBoardMock.mockResolvedValue({ doc: boardWithSearchableCard('board-1'), sha: 'x' })
    const onSelectResult = vi.fn()
    const user = userEvent.setup()
    render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
        onSelectResult={onSelectResult}
      />,
    )
    await screen.findByRole('dialog')
    await user.type(screen.getByRole('textbox', { name: /Buscar no quadro/i }), 'Alpha')
    await user.click(await screen.findByTestId('search-result-c1'))
    expect(onSelectResult).toHaveBeenCalledWith('c1')
  })

  it('announces load errors', async () => {
    loadBoardMock.mockRejectedValueOnce(new Error('GitHub 500'))
    render(
      <SearchModal isOpen={true} onClose={() => {}} boardId="board-1" session={mockSession} />,
    )
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/GitHub 500/)).toBeInTheDocument()
  })
})
