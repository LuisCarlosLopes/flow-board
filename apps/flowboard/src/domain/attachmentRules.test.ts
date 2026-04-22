import { describe, expect, it } from 'vitest'
import {
  buildAttachmentStoragePath,
  MAX_ATTACHMENT_BYTES,
  sanitizeDisplayName,
  validateAttachmentFile,
} from './attachmentRules'

function file(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('attachmentRules', () => {
  it('sanitizeDisplayName rejects path tricks', () => {
    expect(sanitizeDisplayName('')).toBeNull()
    expect(sanitizeDisplayName('../x.pdf')).toBeNull()
    expect(sanitizeDisplayName('ok.pdf')).toBe('ok.pdf')
  })

  it('validateAttachmentFile accepts allowed types', () => {
    expect(validateAttachmentFile(file('a.jpg', 100, 'image/jpeg'))).toBeNull()
    expect(validateAttachmentFile(file('a.jpeg', 100, 'image/jpeg'))).toBeNull()
    expect(validateAttachmentFile(file('n.md', 10, 'text/markdown'))).toBeNull()
    expect(validateAttachmentFile(file('n.md', 10, 'text/plain'))).toBeNull()
    expect(validateAttachmentFile(file('d.pdf', 10, 'application/pdf'))).toBeNull()
  })

  it('validateAttachmentFile rejects oversize', () => {
    const err = validateAttachmentFile(file('a.jpg', MAX_ATTACHMENT_BYTES + 1, 'image/jpeg'))
    expect(err?.code).toBe('size')
  })

  it('validateAttachmentFile rejects bad extension', () => {
    const err = validateAttachmentFile(file('a.exe', 10, 'application/octet-stream'))
    expect(err?.code).toBe('ext')
  })

  it('validateAttachmentFile rejects mime mismatch', () => {
    const err = validateAttachmentFile(file('a.jpg', 10, 'application/pdf'))
    expect(err?.code).toBe('mime')
  })

  it('buildAttachmentStoragePath is stable', () => {
    expect(
      buildAttachmentStoragePath('board-1', 'card-2', 'att-3', 'My Doc.pdf'),
    ).toBe('flowboard/attachments/board-1/card-2/att-3_My_Doc.pdf')
  })
})
