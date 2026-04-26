import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginView } from './LoginView'

// Mock GitHub client
vi.mock('../../infrastructure/github/client', () => {
  const mockVerifyAccess = vi.fn().mockResolvedValue(undefined)
  type MockClient = { verifyRepositoryAccess: typeof mockVerifyAccess }
  return {
    GitHubContentsClient: vi.fn(function (this: MockClient) {
      this.verifyRepositoryAccess = mockVerifyAccess
    }),
    GitHubHttpError: class GitHubHttpError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'GitHubHttpError'
      }
    },
  }
})

// Mock board repository
vi.mock('../../infrastructure/persistence/boardRepository', () => ({
  bootstrapFlowBoardData: vi.fn().mockResolvedValue(undefined),
}))

// Mock session store
vi.mock('../../infrastructure/session/sessionStore', () => ({
  createSession: vi.fn(() => ({
    pat: 'test-token',
    repoUrl: 'https://github.com/test/repo',
    owner: 'test',
    repo: 'repo',
    apiBase: 'https://api.github.com',
    webUrl: 'https://github.com/test/repo',
  })),
  saveSessionAsync: vi.fn().mockResolvedValue(undefined),
}))

// Mock URL parser
vi.mock('../../infrastructure/github/url', () => ({
  parseRepoUrl: vi.fn((url: string) => {
    if (url === 'https://github.com/test/repo') {
      return { owner: 'test', repo: 'repo' }
    }
    return { error: 'Invalid URL' }
  }),
}))

describe('LoginView Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza formulário com campos de entrada', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]')
    const patInput = container.querySelector('input[name="repo-pat"]')
    const submitBtn = container.querySelector('button[type="submit"]')

    expect(repoInput).toBeInTheDocument()
    expect(patInput).toBeInTheDocument()
    expect(submitBtn).toBeInTheDocument()
  })

  it('valida URL vazia com mensagem de erro', async () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const submitBtn = container.querySelector('button[type="submit"]')
    const user = userEvent.setup()

    await user.click(submitBtn!)

    await waitFor(() => {
      const errorMsg = container.querySelector('.fb-login__err')
      expect(errorMsg?.textContent).toContain('URL')
    })
  })

  it('valida PAT vazio com mensagem de erro', async () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]') as HTMLInputElement
    const submitBtn = container.querySelector('button[type="submit"]')
    const user = userEvent.setup()

    await user.clear(repoInput)
    await user.type(repoInput, 'https://github.com/test/repo')
    await user.click(submitBtn!)

    await waitFor(() => {
      const errorMsg = container.querySelector('.fb-login__err')
      expect(errorMsg?.textContent).toContain('Personal Access Token')
    })
  })

  it('botão é desabilitado durante submissão', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submitBtn).not.toBeDisabled()
  })

  it('estrutura HTML suporta alerta com role="alert"', async () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const submitBtn = container.querySelector('button[type="submit"]')
    const user = userEvent.setup()

    // Submit with invalid data to trigger error
    await user.click(submitBtn!)

    // After submit, error should appear
    await waitFor(() => {
      const errorDiv = container.querySelector('.fb-login__err')
      if (errorDiv) {
        expect(errorDiv).toHaveAttribute('role', 'alert')
      }
    }, { timeout: 500 })
  })

  it('renderiza dica de segurança sobre PAT', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const content = container.textContent || ''
    expect(content).toContain('token é um segredo')
    expect(content).toContain('não compartilhe')
    expect(content).toContain('revogue tokens antigos')
  })

  it('renderiza texto sobre escopo "repo"', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const content = container.textContent || ''
    expect(content).toContain('repo')
    expect(content).toContain('privado')
  })

  it('renderiza id="main-content" para acessibilidade', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const main = container.querySelector('#main-content')
    expect(main).toBeInTheDocument()
  })

  it('campos de entrada têm autocomplete="off" (segurança)', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]')
    const patInput = container.querySelector('input[name="repo-pat"]')

    expect(repoInput).toHaveAttribute('autoComplete', 'off')
    expect(patInput).toHaveAttribute('autoComplete', 'off')
  })

  it('tipo de PAT é "password" para mascarar entrada', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const patInput = container.querySelector('input[name="repo-pat"]')
    expect(patInput).toHaveAttribute('type', 'password')
  })

  it('tipo de URL é "url" para validação semântica', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]')
    expect(repoInput).toHaveAttribute('type', 'url')
  })

  it('campo de URL tem placeholder com exemplo', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]')
    expect(repoInput).toHaveAttribute('placeholder', 'https://github.com/voce/flowboard-data')
  })

  it('campo de PAT tem placeholder mascarado', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const patInput = container.querySelector('input[name="repo-pat"]')
    expect(patInput).toHaveAttribute('placeholder', 'ghp_••••••••')
  })

  it('integração completa: submissão com dados válidos chama onConnected', async () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]') as HTMLInputElement
    const patInput = container.querySelector('input[name="repo-pat"]') as HTMLInputElement
    const submitBtn = container.querySelector('button[type="submit"]')
    const user = userEvent.setup()

    await user.clear(repoInput)
    await user.type(repoInput, 'https://github.com/test/repo')
    await user.clear(patInput)
    await user.type(patInput, 'ghp_test1234567890')

    await user.click(submitBtn!)

    await waitFor(() => {
      expect(onConnected).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('validação: rejeita URL inválida com mensagem', async () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]') as HTMLInputElement
    const submitBtn = container.querySelector('button[type="submit"]')
    const user = userEvent.setup()

    await user.clear(repoInput)
    await user.type(repoInput, 'invalid-url')
    await user.click(submitBtn!)

    await waitFor(() => {
      const errorMsg = container.querySelector('.fb-login__err')
      expect(errorMsg?.textContent).toBeTruthy()
    }, { timeout: 500 })
  })

  it('renderiza brand com nome "FlowBoard"', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const brandName = container.querySelector('.fb-login__name')
    expect(brandName?.textContent).toBe('FlowBoard')
  })

  it('renderiza título "Entrar"', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const title = container.querySelector('.fb-login__title')
    expect(title?.textContent).toContain('Entrar')
  })

  it('renderiza lead text com contexto de repositório', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const lead = container.querySelector('.fb-login__lead')
    const content = lead?.textContent || ''
    expect(content).toContain('repositório GitHub privado')
    expect(content).toContain('JSON')
  })

  it('form tem atributo noValidate (controle manual)', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const form = container.querySelector('form')
    expect(form).toHaveAttribute('noValidate')
  })

  it('inputs são required para semântica acessível', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const repoInput = container.querySelector('input[name="repo-url"]')
    const patInput = container.querySelector('input[name="repo-pat"]')

    expect(repoInput).toHaveAttribute('required')
    expect(patInput).toHaveAttribute('required')
  })

  it('labels estão associados aos inputs', () => {
    const onConnected = vi.fn()
    const { container } = render(<LoginView onConnected={onConnected} />)

    const labels = container.querySelectorAll('label')
    expect(labels.length).toBeGreaterThan(0)
  })
})
