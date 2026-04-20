import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSearchHotkey } from './useSearchHotkey'

describe('useSearchHotkey', () => {
  let mockOnOpen: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnOpen = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listener registration and cleanup', () => {
    it('should register keydown listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })

    it('should remove keydown listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })

    it('should not leak listeners on multiple mount/unmount cycles', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      for (let i = 0; i < 3; i++) {
        const { unmount } = renderHook(() => useSearchHotkey(mockOnOpen as () => void))
        unmount()
      }

      // Should have 3 adds and 3 removes (no accumulation)
      expect(addEventListenerSpy).toHaveBeenCalledTimes(3)
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(3)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('hotkey trigger', () => {
    it('should call onOpen when "/" is pressed and no guards are active', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).toHaveBeenCalledTimes(1)
    })

    it('should not call onOpen for other keys', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).not.toHaveBeenCalled()
    })

    it('should prevent default behavior when "/" is pressed', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      window.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('guard: input/textarea focus', () => {
    it('should ignore "/" when input is focused', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).not.toHaveBeenCalled()

      document.body.removeChild(input)
    })

    it('should ignore "/" when textarea is focused', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).not.toHaveBeenCalled()

      document.body.removeChild(textarea)
    })

    it('should trigger "/" when focus is on other elements', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const button = document.createElement('button')
      document.body.appendChild(button)
      button.focus()

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).toHaveBeenCalledTimes(1)

      document.body.removeChild(button)
    })
  })

  describe('guard: modal open detection', () => {
    it('should ignore "/" when modal (role=dialog) is open', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const modal = document.createElement('div')
      modal.setAttribute('role', 'dialog')
      document.body.appendChild(modal)

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).not.toHaveBeenCalled()

      document.body.removeChild(modal)
    })

    it('should trigger "/" when no modal is open', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple modals correctly', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const modal1 = document.createElement('div')
      modal1.setAttribute('role', 'dialog')
      const modal2 = document.createElement('div')
      modal2.setAttribute('role', 'dialog')

      document.body.appendChild(modal1)
      document.body.appendChild(modal2)

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).not.toHaveBeenCalled()

      document.body.removeChild(modal1)
      document.body.removeChild(modal2)
    })
  })

  describe('combined guards', () => {
    it('should ignore "/" when both input focused AND modal is open', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      const input = document.createElement('input')
      const modal = document.createElement('div')
      modal.setAttribute('role', 'dialog')

      document.body.appendChild(input)
      document.body.appendChild(modal)
      input.focus()

      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).not.toHaveBeenCalled()

      document.body.removeChild(input)
      document.body.removeChild(modal)
    })

    it('should trigger "/" only when all conditions are safe', () => {
      renderHook(() => useSearchHotkey(mockOnOpen as () => void))

      // No input focused, no modal open
      const event = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event)

      expect(mockOnOpen).toHaveBeenCalledTimes(1)
    })
  })

  describe('callback dependency', () => {
    it('should use updated callback when onOpen changes', () => {
      const mockOnOpen1: ReturnType<typeof vi.fn<() => void>> = vi.fn()
      const mockOnOpen2: ReturnType<typeof vi.fn<() => void>> = vi.fn()

      const { rerender } = renderHook(
        ({ callback }: { callback: () => void }) => useSearchHotkey(callback),
        { initialProps: { callback: mockOnOpen1 as () => void } },
      )

      const event1 = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event1)
      expect(mockOnOpen1).toHaveBeenCalledTimes(1)
      expect(mockOnOpen2).not.toHaveBeenCalled()

      // Change callback
      rerender({ callback: mockOnOpen2 as () => void })

      const event2 = new KeyboardEvent('keydown', {
        key: '/',
        code: 'Slash',
        bubbles: true,
      })

      window.dispatchEvent(event2)
      expect(mockOnOpen1).toHaveBeenCalledTimes(1) // Still 1, not called again
      expect(mockOnOpen2).toHaveBeenCalledTimes(1) // Called with new callback
    })
  })
})
