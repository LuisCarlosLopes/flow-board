/**
 * Encrypted server-side session payload (iron-session). Never send `pat` to the browser.
 */
export type FlowboardIronSession = {
  pat: string
  owner: string
  repo: string
  repoUrl: string
  webUrl: string
  apiBase: string
}

export type PublicFlowboardSession = Pick<
  FlowboardIronSession,
  'owner' | 'repo' | 'repoUrl' | 'webUrl' | 'apiBase'
>
