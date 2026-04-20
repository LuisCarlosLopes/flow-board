import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SearchModal } from './SearchModal'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'

describe('SearchModal', () => {
  let mockSession: FlowBoardSession

  beforeEach(() => {
    mockSession = {
      pat: 'test-pat',
      repoUrl: 'https://github.com/test/repo',
      webUrl: 'https://github.com/test/repo',
      owner: 'test',
      repo: 'repo',
      apiBase: 'https://api.github.com',
    }
  })

  afterEach(() => {
    cleanup()
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
  it('should render modal structure when isOpen=true', () => {
    const { container } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-backdrop')).toBeInTheDocument()
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()
  })

  // Test 3: Input field is present
  it('should render input field in modal', () => {
    const { container } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    const input = container.querySelector('.fb-sm-input')
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement)?.placeholder).toContain('Buscar')
  })

  // Test 4: Results container exists
  it('should have results container', () => {
    const { container } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
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
  it('should accept onSelectResult callback', () => {
    const mockSelectResult = () => {}
    const { container } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
        onSelectResult={mockSelectResult}
      />,
    )
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()
  })

  // Test 7: Different boardId renders
  it('should accept different boardId', () => {
    const { container } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-999"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-modal')).toBeInTheDocument()
  })
})
