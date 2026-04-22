import { GitHubContentsClient, GitHubHttpError, putFileBase64WithRetry } from '../../infrastructure/github/client'
import { fileToBase64 } from '../../infrastructure/github/fileBlob'

export async function deleteRepoPathIfExists(client: GitHubContentsClient, path: string): Promise<void> {
  const got = await client.tryGetFileRaw(path)
  if (!got) {
    return
  }
  try {
    await client.deleteFile(path, got.sha)
  } catch (e) {
    if (e instanceof GitHubHttpError && e.status === 404) {
      return
    }
    throw e
  }
}

export async function uploadAttachmentBlobs(
  client: GitHubContentsClient,
  blobs: { storagePath: string; file: File }[],
): Promise<void> {
  const done: string[] = []
  try {
    for (const { storagePath, file } of blobs) {
      const b64 = await fileToBase64(file)
      await putFileBase64WithRetry(client, storagePath, b64, async () => {
        const got = await client.tryGetFileRaw(storagePath)
        return got?.sha ?? null
      })
      done.push(storagePath)
    }
  } catch (e) {
    const base = e instanceof Error ? e.message : 'Erro ao enviar anexos.'
    const hint =
      done.length > 0
        ? ` Parte dos arquivos pode ter sido enviada (${done.length}/${blobs.length}). Tente salvar de novo ou verifique o repositório.`
        : ''
    throw new Error(`${base}${hint}`)
  }
}
