import type { CardAttachment } from './types'

/** 10 MB per product spec */
export const MAX_ATTACHMENT_BYTES = 10_000_000

export const MAX_ATTACHMENTS_PER_CARD = 50

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'md', 'pdf', 'docx', 'xlsx'] as const

export type AllowedExt = (typeof ALLOWED_EXTENSIONS)[number]

const EXT_TO_MIME: Record<AllowedExt, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  md: ['text/markdown', 'text/plain', 'text/x-markdown'],
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
}

export type AttachmentValidationError = {
  code: 'ext' | 'size' | 'empty' | 'name' | 'mime' | 'limit'
  message: string
}

export function normalizeExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) {
    return ''
  }
  return filename.slice(dot + 1).toLowerCase()
}

export function isAllowedExtension(ext: string): ext is AllowedExt {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

export function mimeMatchesExtension(ext: AllowedExt, mime: string): boolean {
  const m = mime.trim().toLowerCase()
  if (!m) {
    return true
  }
  const allowed = EXT_TO_MIME[ext]
  return allowed.some((a) => a === m)
}

const MAX_DISPLAY_NAME_LEN = 255

/** Rejects path segments and empty names; returns trimmed safe name or null */
export function sanitizeDisplayName(filename: string): string | null {
  const t = filename.trim()
  if (!t) {
    return null
  }
  if (t.includes('..') || t.includes('/') || t.includes('\\')) {
    return null
  }
  return t.length > MAX_DISPLAY_NAME_LEN ? t.slice(0, MAX_DISPLAY_NAME_LEN) : t
}

export function validateAttachmentFile(file: File): AttachmentValidationError | null {
  const displayName = sanitizeDisplayName(file.name)
  if (!displayName) {
    return { code: 'name', message: 'Nome de arquivo inválido.' }
  }
  const ext = normalizeExtension(file.name)
  if (!isAllowedExtension(ext)) {
    return {
      code: 'ext',
      message: 'Tipo não permitido. Use: .jpg, .jpeg, .md, .pdf, .docx, .xlsx.',
    }
  }
  if (file.size <= 0) {
    return { code: 'empty', message: 'Arquivo vazio.' }
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { code: 'size', message: 'Arquivo excede 10 MB.' }
  }
  if (!mimeMatchesExtension(ext, file.type)) {
    return {
      code: 'mime',
      message: 'O tipo do arquivo não corresponde à extensão.',
    }
  }
  return null
}

function slugifyStorageSegment(name: string): string {
  const safe = name.replace(/[/\\]/g, '_').replace(/\.\./g, '_')
  return safe.replace(/[^\w.\-()+]/g, '_').replace(/_+/g, '_')
}

export function buildAttachmentStoragePath(
  boardId: string,
  cardId: string,
  attachmentId: string,
  displayName: string,
): string {
  const safeName = slugifyStorageSegment(displayName)
  return `flowboard/attachments/${boardId}/${cardId}/${attachmentId}_${safeName}`
}

export function inferMimeFromAttachment(att: CardAttachment): string {
  if (att.mimeType?.trim()) {
    return att.mimeType
  }
  const ext = normalizeExtension(att.displayName)
  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg'
  }
  if (ext === 'md') {
    return 'text/markdown'
  }
  if (ext === 'pdf') {
    return 'application/pdf'
  }
  if (ext === 'docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (ext === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  return 'application/octet-stream'
}
