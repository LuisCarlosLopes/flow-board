import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const flowboardRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const authFile = join(flowboardRoot, 'tests/e2e/.auth/user.json')

const forwarded = process.argv.slice(2)
const skipEnsure = forwarded.includes('--no-ensure-auth')
const projectArgs = forwarded.filter((a) => a.startsWith('--project='))
const setupOnly =
  projectArgs.length > 0 && projectArgs.every((a) => a === '--project=setup')

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
