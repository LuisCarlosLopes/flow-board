import { useState, useCallback } from 'react'

/**
 * Custom hook for clipboard operations with feedback state.
 * Provides copy functionality with automatic reset after 1.5 seconds.
 */
export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 1500)
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          setIsCopied(true)
          setTimeout(() => setIsCopied(false), 1500)
        } catch {
          console.error('Failed to copy with fallback method')
        } finally {
          document.body.removeChild(textarea)
        }
      }
    } catch (e) {
      console.error('Clipboard error:', e)
    }
  }, [])

  return { copy, isCopied }
}
