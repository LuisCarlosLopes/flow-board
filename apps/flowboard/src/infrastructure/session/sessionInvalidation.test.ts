import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  consumeLoginScreenBanner,
  LOGIN_BANNER_PAT_LOST,
  notifySessionInvalidateFromGithub401,
  registerSessionInvalidateHandler,
  setLoginScreenBanner,
} from './sessionInvalidation'

describe('sessionInvalidation', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('invokes latest registered handler on 401 notification', () => {
    const a = vi.fn()
    const b = vi.fn()
    registerSessionInvalidateHandler(a)
    registerSessionInvalidateHandler(b)
    notifySessionInvalidateFromGithub401()
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('setLoginScreenBanner and consume round-trip', () => {
    setLoginScreenBanner(LOGIN_BANNER_PAT_LOST)
    expect(consumeLoginScreenBanner()).toBe(LOGIN_BANNER_PAT_LOST)
    expect(consumeLoginScreenBanner()).toBeNull()
  })
})
