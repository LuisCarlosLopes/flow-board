// @MindContext: Acoplamento mínimo entre 401 do cliente GitHub e `App` (limpar sessão, banner) sem importar React no `client`.
// @MindWhy: Síncrono antes do `throw`; o handler usa `hasPersistedSession()` (sem desencriptar) para decidir o banner; registo a cada render em `App` mantém a closure de `setSession` atual.
// @MindRisk: Se o handler falhar, o throw de 401 ainda ocorre — UI deve continuar a tratar o erro noutros pontos.
const BANNER_STORAGE_KEY = 'flowboard.loginScreenBanner.v1'

/** Banner key: session cleared because GitHub returned 401 (revoked / expired PAT). */
export const LOGIN_BANNER_PAT_LOST = 'pat_lost'

let sessionInvalidateHandler: (() => void) | null = null

/**
 * Replaced on each `App` render so the latest `setSession` closure runs.
 * Must stay synchronous: GitHub client calls the notifier before throwing.
 */
export function registerSessionInvalidateHandler(handler: () => void): void {
  sessionInvalidateHandler = handler
}

export function notifySessionInvalidateFromGithub401(): void {
  sessionInvalidateHandler?.()
}

export function setLoginScreenBanner(key: string): void {
  try {
    sessionStorage.setItem(BANNER_STORAGE_KEY, key)
  } catch {
    /* private mode / quota */
  }
}

export function consumeLoginScreenBanner(): string | null {
  try {
    const v = sessionStorage.getItem(BANNER_STORAGE_KEY)
    if (v !== null) {
      sessionStorage.removeItem(BANNER_STORAGE_KEY)
    }
    return v
  } catch {
    return null
  }
}
