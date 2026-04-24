import { describe, expect, it } from 'vitest'
import { createClientFromSession } from './fromSession'

describe('createClientFromSession', () => {
  it('returns the same-origin gateway regardless of public session contents', () => {
    const client = createClientFromSession({
      owner: 'octo',
      repo: 'repo',
      repoUrl: 'https://github.com/octo/repo',
      webUrl: 'https://github.com/octo/repo',
      authenticated: true,
    })

    expect(client.constructor.name).toBe('FlowBoardGitHubGateway')
  })
})
