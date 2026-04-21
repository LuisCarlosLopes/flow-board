/**
 * Credenciais E2E (GitHub repo + PAT). Definidas em apps/flowboard/.env —
 * carregadas no playwright.config via Vite loadEnv.
 */
export function getE2ECredentials(): { repoUrl: string; pat: string } {
  const repoUrl = process.env.FLOWBOARD_E2E_REPO_URL?.trim()
  const pat = process.env.FLOWBOARD_E2E_PAT?.trim()
  if (!repoUrl || !pat) {
    throw new Error(
      'Defina FLOWBOARD_E2E_REPO_URL e FLOWBOARD_E2E_PAT em apps/flowboard/.env para testes que exigem conexão GitHub.',
    )
  }
  return { repoUrl, pat }
}
