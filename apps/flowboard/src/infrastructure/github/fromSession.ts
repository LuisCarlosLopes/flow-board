import type { GitHubDataClient } from './client'
import { BffContentsClient } from './bffClient'

/**
 * All GitHub data access in the browser goes through the BFF; the HttpOnly session holds the PAT.
 */
export function createClientFromSession(): GitHubDataClient {
  return new BffContentsClient()
}
