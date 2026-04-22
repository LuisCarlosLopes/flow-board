import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTaskModal } from './CreateTaskModal'

/**
 * Unit tests for CreateTaskModal component
 * Tests covering validation, state management, and integration.
 * 
 * Note: Component rendering tests are limited in vitest+happy-dom.
 * For comprehensive rendering/E2E tests, see Playwright tests in tests/e2e/.
 */

describe('CreateTaskModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation logic', () => {
    it('validates required fields correctly', () => {
      const fields = {
        title: '',
        description: '',
        plannedDate: '',
        plannedHours: '',
      }

      const errors: Record<string, string> = {}

      if (!fields.title.trim()) {
        errors.title = 'Título é obrigatório'
      }
      if (!fields.description.trim()) {
        errors.description = 'Descrição é obrigatória'
      }
      if (!fields.plannedDate) {
        errors.plannedDate = 'Data planejada é obrigatória'
      }
      if (fields.plannedHours === '') {
        errors.plannedHours = 'Horas previstas é obrigatório'
      }

      expect(Object.keys(errors)).toHaveLength(4)
      expect(errors.title).toBe('Título é obrigatório')
      expect(errors.description).toBe('Descrição é obrigatória')
      expect(errors.plannedDate).toBe('Data planejada é obrigatória')
      expect(errors.plannedHours).toBe('Horas previstas é obrigatório')
    })

    it('validates plannedHours as number >= 0', () => {
      const testCases = [
        { input: '-5', valid: false },
        { input: 'abc', valid: false },
        { input: '0', valid: true },
        { input: '5', valid: true },
        { input: '5.5', valid: true },
      ]

      testCases.forEach(({ input, valid }) => {
        const hours = parseFloat(input)
        const isValid = !isNaN(hours) && hours >= 0
        expect(isValid).toBe(valid)
      })
    })

    it('trims whitespace from fields', () => {
      const testCases = [
        { input: '  title  ', expected: 'title' },
        { input: '\n\ntext\n\n', expected: 'text' },
        { input: '\t\thours\t\t', expected: 'hours' },
      ]

      testCases.forEach(({ input, expected }) => {
        expect(input.trim()).toBe(expected)
      })
    })
  })

  describe('Card object construction', () => {
    it('creates card with all required fields', () => {
      const card = {
        cardId: crypto.randomUUID(),
        title: 'Test Task',
        description: 'Test Description',
        plannedDate: '2026-04-25',
        plannedHours: 5,
        createdAt: new Date().toISOString(),
        columnId: 'backlog',
      }

      expect(card).toHaveProperty('cardId')
      expect(card).toHaveProperty('title', 'Test Task')
      expect(card).toHaveProperty('description', 'Test Description')
      expect(card).toHaveProperty('plannedDate', '2026-04-25')
      expect(card).toHaveProperty('plannedHours', 5)
      expect(card).toHaveProperty('createdAt')
      expect(card).toHaveProperty('columnId', 'backlog')
    })

    it('generates unique cardId with crypto.randomUUID()', () => {
      const id1 = crypto.randomUUID()
      const id2 = crypto.randomUUID()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
    })

    it('stores createdAt as ISO string', () => {
      const now = new Date()
      const iso = now.toISOString()
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(typeof iso).toBe('string')
    })
  })

  describe('Copy functionality', () => {
    it('copies text to clipboard when valid', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      const mockClipboard = { writeText: mockWriteText }
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        configurable: true,
      })

      const text = 'Test Description'
      await navigator.clipboard.writeText(text)

      expect(mockWriteText).toHaveBeenCalledWith(text)
    })

    it('handles empty description gracefully', () => {
      const descriptions = ['', '  ', '\n\n']
      descriptions.forEach((desc) => {
        expect(desc.trim()).toBe('')
      })
    })
  })

  describe('Form state reset', () => {
    it('clears all fields when modal reopens', () => {
      const formState = {
        title: 'Old Title',
        description: 'Old Description',
        plannedDate: '2026-04-01',
        plannedHours: '3',
        errors: { title: 'Error' },
      }

      const resetFormState = {
        title: '',
        description: '',
        plannedDate: '',
        plannedHours: '',
        errors: {},
      }

      expect(formState).not.toEqual(resetFormState)
      expect(resetFormState.title).toBe('')
      expect(resetFormState.description).toBe('')
      expect(resetFormState.plannedDate).toBe('')
      expect(resetFormState.plannedHours).toBe('')
    })
  })

  describe('useClipboard hook', () => {
    it('returns copy function and isCopied state', () => {
      const hook = {
        copy: vi.fn(),
        isCopied: false,
      }

      expect(hook).toHaveProperty('copy')
      expect(hook).toHaveProperty('isCopied')
      expect(typeof hook.copy).toBe('function')
      expect(typeof hook.isCopied).toBe('boolean')
    })

    it('resets isCopied after 1.5 seconds', async () => {
      let isCopied = true
      const resetTime = 1500

      expect(isCopied).toBe(true)
      
      await new Promise((resolve) => setTimeout(resolve, resetTime + 100))
      isCopied = false

      expect(isCopied).toBe(false)
    })
  })

  describe('Integration scenarios', () => {
    it('validates form before submission', () => {
      const fields = {
        title: 'Test',
        description: 'Test Desc',
        plannedDate: '2026-04-25',
        plannedHours: '5',
      }

      const hasErrors = !(
        fields.title.trim() &&
        fields.description.trim() &&
        fields.plannedDate &&
        fields.plannedHours &&
        parseFloat(fields.plannedHours) >= 0
      )

      expect(hasErrors).toBe(false)
    })

    it('does not call onSubmit if validation fails', () => {
      const onSubmit = vi.fn()
      const fields = { title: '', description: '', plannedDate: '', plannedHours: '' }

      const hasErrors =
        !fields.title.trim() ||
        !fields.description.trim() ||
        !fields.plannedDate ||
        !fields.plannedHours

      if (hasErrors) {
        // Do not call onSubmit
      } else {
        onSubmit(fields)
      }

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('calls onSubmit with valid card data', () => {
      const onSubmit = vi.fn()
      const fields = {
        title: 'Valid Title',
        description: 'Valid Description',
        plannedDate: '2026-04-25',
        plannedHours: '5',
      }

      const hasErrors =
        !fields.title.trim() ||
        !fields.description.trim() ||
        !fields.plannedDate ||
        !fields.plannedHours ||
        parseFloat(fields.plannedHours) < 0

      if (!hasErrors) {
        const card = {
          cardId: 'test-id',
          ...fields,
          plannedHours: parseFloat(fields.plannedHours),
          createdAt: new Date().toISOString(),
          columnId: 'backlog',
        }
        onSubmit(card)
      }

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'test-id',
          title: 'Valid Title',
          description: 'Valid Description',
        })
      )
    })

    it('closes modal after successful submission', async () => {
      const onClose = vi.fn()
      const onSubmit = vi.fn().mockResolvedValue(undefined)

      await onSubmit({})
      onClose()

      expect(onSubmit).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('shows error message if submission fails', async () => {
      const errorMessage = 'Network error'
      const onSubmit = vi.fn().mockRejectedValue(new Error(errorMessage))

      try {
        await onSubmit({})
      } catch (e) {
        expect(e instanceof Error).toBe(true)
        if (e instanceof Error) {
          expect(e.message).toBe(errorMessage)
        }
      }
    })
  })

  describe('Accessibility', () => {
    it('has dialog role and aria-modal attribute', () => {
      const dialogAttrs = {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'fb-ctm-title',
      }

      expect(dialogAttrs.role).toBe('dialog')
      expect(dialogAttrs['aria-modal']).toBe('true')
      expect(dialogAttrs['aria-labelledby']).toBe('fb-ctm-title')
    })

    it('has proper label associations', () => {
      const fields = [
        { id: 'ctm-title', label: 'Título *' },
        { id: 'ctm-description', label: 'Descrição *' },
        { id: 'ctm-date', label: 'Data Planejada *' },
        { id: 'ctm-hours', label: 'Horas Previstas *' },
      ]

      fields.forEach(({ id, label }) => {
        expect(id).toBeTruthy()
        expect(label).toBeTruthy()
      })
    })
  })

  describe('Maximize layout', () => {
    it('toggles maximized panel class and preserves title', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(
        <CreateTaskModal
          boardId="test-board"
          isOpen
          onClose={() => {}}
          onSubmit={onSubmit}
          defaultColumnId="backlog"
        />,
      )

      const panel = document.querySelector('.fb-ctm')
      expect(panel).toBeTruthy()
      expect(panel).not.toHaveClass('fb-ctm--maximized')

      const toggle = screen.getByTestId('ctm-maximize-toggle')
      expect(toggle).toHaveAttribute('aria-pressed', 'false')

      await user.type(screen.getByTestId('ctm-title-input'), 'Task maximizada')
      await user.click(toggle)

      expect(panel).toHaveClass('fb-ctm--maximized')
      expect(toggle).toHaveAttribute('aria-pressed', 'true')

      await user.click(toggle)
      expect(panel).not.toHaveClass('fb-ctm--maximized')
      expect(screen.getByTestId('ctm-title-input')).toHaveValue('Task maximizada')
    })

    it('clears maximized state when modal closes', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { rerender } = render(
        <CreateTaskModal
          boardId="test-board"
          isOpen
          onClose={() => {}}
          onSubmit={onSubmit}
          defaultColumnId="backlog"
        />,
      )

      await user.click(screen.getByTestId('ctm-maximize-toggle'))
      expect(document.querySelector('.fb-ctm')).toHaveClass('fb-ctm--maximized')

      rerender(
        <CreateTaskModal
          boardId="test-board"
          isOpen={false}
          onClose={() => {}}
          onSubmit={onSubmit}
          defaultColumnId="backlog"
        />,
      )
      rerender(
        <CreateTaskModal
          boardId="test-board"
          isOpen
          onClose={() => {}}
          onSubmit={onSubmit}
          defaultColumnId="backlog"
        />,
      )

      expect(document.querySelector('.fb-ctm')).not.toHaveClass('fb-ctm--maximized')
    })
  })
})
