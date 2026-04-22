# task-breakdown-feature.md — Anexos em Cards

**Artefato:** `task-breakdown-feature.md` (decomposição T1–T5 para o track FEATURE)  
**Slug:** `card-attachments`  
**Track:** FEATURE  
**Estado:** `.memory-bank/specs/card-attachments/state.yaml`  
**Status das subtarefas (2026-04-22):** T1–T5 **concluídas**; pipeline `code-reviewer` / `tester` opcionais.

---

## T1 — Domínio: tipos e regras de anexo

**Status:** concluído

**Objetivo:** `CardAttachment`, validação de extensão/MIME/tamanho (10 MB), nome seguro, limite 50 anexos/card, função pura `buildAttachmentStoragePath(boardId, cardId, attachmentId, displayName)`.

**Arquivos:** `types.ts`, `attachmentRules.ts`, `attachmentRules.test.ts`  

**DoD:** Vitest verde; sem dependência de React.

---

## T2 — Cliente GitHub: conteúdo binário

**Status:** concluído

**Objetivo:** `putFileBase64(path, base64, sha | null)`, `getFileBase64(path)` retornando `{ sha, contentBase64 }`, erros alinhados a `GitHubHttpError`; retry 409 opcional espelhando `putJsonWithRetry`.

**Arquivos:** `client.ts` (`putFileBase64`, `getFileRaw`, `tryGetFileRaw`), `fileBlob.ts`, `client.test.ts`.

**DoD:** PUT/GET cobertos por testes mínimos.

---

## T3 — Integração BoardView: persistência e exclusão

**Status:** concluído

**Objetivo:**  

- `handleCreateTask` / `handleUpdateTask`: incluir `attachments` no merge do card.  
- Antes de salvar: para cada anexo novo (blob ainda não no repo), executar PUT.  
- `handleDeleteCard`: para cada `attachment.storagePath`, `deleteFile` com sha atual (GET antes).

**Arquivos:** `BoardView.tsx`, `attachmentSync.ts`.

**DoD:** Fluxo feliz manual: criar card com anexo, recarregar, ver arquivo no GitHub.

---

## T4 — CreateTaskModal: UX

**Status:** concluído

**Objetivo:** Seção anexos; seleção de arquivos; mensagens de erro; lista com remover (apenas local até submit); no submit, retornar `Partial<Card>` com `attachments` completo; preview JPEG e MD para anexos já carregados ou pós-upload.

**Arquivos:** `CreateTaskModal.tsx`, `CreateTaskModal.css`, `CreateTaskModal.test.tsx` (prop `boardId`).

**DoD:** Acessibilidade básica (`aria-label`); não vazar PAT.

---

## T5 — ADR + evidência final

**Status:** concluído

**Objetivo:** ADR em `.memory-bank/adrs/`; checklist E2E ou caso Vitest de integração leve; atualizar `state.yaml` pós-entrega.

**DoD:** ADR `.memory-bank/adrs/008-flowboard-card-attachments-github.md`; `npm run test`, `lint`, `build` em `apps/flowboard` executados com sucesso.

---

## Dependências

```text
T1 → T2 → T3 → T4 → T5
```

T3 e T4 podem paralelizar após T2 se callbacks forem definidos cedo.