/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Chave de cifra do PAT; injetada no build a partir de `VITE_SESSION_SECRET` apenas. */
  readonly FLOWBOARD_PAT_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
