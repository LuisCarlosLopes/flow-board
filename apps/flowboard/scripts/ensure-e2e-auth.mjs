import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const flowboardRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const authFile = join(flowboardRoot, 'tests/e2e/.auth/user.json')
const forbiddenMarkers = ['"pat"', '"token"', '"accessToken"', '"refreshToken"', '"authorization"', '"apiBase"', 'ghp_', 'github_pat_']

const forwarded = process.argv.slice(2)
const skipEnsure = forwarded.includes('--no-ensure-auth')
const projectArgs = forwarded.filter((a) => a.startsWith('--project='))
const setupOnly =
  projectArgs.length > 0 && projectArgs.every((a) => a === '--project=setup')

function authFileContainsSecrets(file) {
  try {
    const serialized = readFileSync(file, 'utf8')
    return forbiddenMarkers.some((marker) => serialized.includes(marker))
  } catch {
    return true
  }
}

if (existsSync(authFile) && authFileContainsSecrets(authFile)) {
  console.log('e2e: sessão legada com segredo detectada; removendo tests/e2e/.auth/user.json...')
  unlinkSync(authFile)
}

if (!skipEnsure && !setupOnly && !existsSync(authFile)) {
  console.log('e2e: sessão ausente; executando projeto `setup` (login GitHub → .auth/user.json)...')
  const r = spawnSync('npx', ['playwright', 'test', '--project=setup'], {
    cwd: flowboardRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const filtered = forwarded.filter((a) => a !== '--no-ensure-auth')
const r2 = spawnSync('npx', ['playwright', 'test', ...filtered], {
  cwd: flowboardRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})
process.exit(r2.status ?? 0)
