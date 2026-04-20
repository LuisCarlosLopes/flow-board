import { useEffect } from 'react'

/**
 * useSearchHotkey - Custom hook for global search hotkey (/) listener
 *
 * Features:
 * - Listens for '/' key globally
 * - Ignores if focused on input/textarea
 * - Ignores if SearchModal is already open
 * - Ignores if any modal is open (via role="dialog" detection)
 * - Auto cleanup on unmount
 * - No memory leaks from multiple mount/unmount cycles
 *
 * @param onOpen - Callback to invoke when '/' is pressed and valid
 */
export function useSearchHotkey(onOpen: () => void): void {
  useEffect(() => {
    // Guard: prevent hotkey if element is input/textarea
    const isInputFocused = (): boolean => {
      const activeElement = document.activeElement
      if (!activeElement) return false

      const tagName = (activeElement as HTMLElement).tagName?.toUpperCase()
      return tagName === 'INPUT' || tagName === 'TEXTAREA'
    }

    // Guard: prevent hotkey if any modal is open
    const isModalOpen = (): boolean => {
      const modals = document.querySelectorAll('[role="dialog"]')
      return modals.length > 0
    }

    // Handler for keydown event
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Only proceed if key is '/'
      if (event.key !== '/') {
        return
      }

      // Check guards
      if (isInputFocused() || isModalOpen()) {
        return
      }

      // Prevent default browser behavior (e.g., help menu in Firefox)
      event.preventDefault()

      // Call the callback
      onOpen()
    }

    // Register the listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup: remove listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onOpen])
}
