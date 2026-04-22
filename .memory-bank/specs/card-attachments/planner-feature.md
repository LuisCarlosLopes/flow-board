# Plano de implementação (IPD) — Anexos em Cards

**Versão:** v1.0  
**Data:** 2026-04-22  
**Slug:** `card-attachments`  
**Status:** Pronto para **HITL** (aprovação explícita antes do `implementer`)  
**Confiança:** 85/100  

---

## 1. Resumo

Estender o FlowBoard para **anexos por card**: upload via `CreateTaskModal`, persistência de blobs em `flowboard/attachments/{boardId}/{cardId}/…` no GitHub, metadados em cada `Card.attachments`, preview para **JPEG** e **Markdown**, download autenticado para todos os tipos aceitos, remoção que apaga blob + atualiza JSON.

**Decisões fechadas neste IPD**


| Tema            | Decisão                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schemaVersion` | Manter **1**; `attachments?: CardAttachment[]` opcional em `Card` (compatível com boards legados).                                                                 |
| Órfãos          | PUT blob antes do PUT board; se falhar o board após blob, usuário pode repetir salvar — mesmo `attachmentId` sobrescreve blob. Não bloqueia v1 com job de limpeza. |
| Limite por card | **50** anexos por card (validação domínio); revisável.                                                                                                             |
| ADR             | Documento curto em `.memory-bank/adrs/` para paths + API binária no cliente (pode ser criado na mesma PR que o código).                                            |


---

## 2. Mapa de alterações (arquivos)

### Criar


| Caminho                                                                  | Propósito                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `apps/flowboard/src/domain/attachmentRules.ts`                           | Constantes, tipos auxiliares, validação extensão/MIME/tamanho/nome, `buildAttachmentStoragePath`. |
| `apps/flowboard/src/domain/attachmentRules.test.ts`                      | Vitest.                                                                                           |
| `apps/flowboard/src/infrastructure/github/binaryContent.ts`              | `putFileBase64`, `getFileContents` (sha + base64), reutilizáveis pelo cliente.                    |
| Opcional: `apps/flowboard/src/features/board/CardAttachmentsSection.tsx` | UI de lista/upload/preview/download (se `CreateTaskModal` ficar grande demais).                   |


### Modificar


| Caminho                                                  | Mudança                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/flowboard/src/domain/types.ts`                     | `CardAttachment`, `attachments?:` em `Card`.                                                                                                                                                                             |
| `apps/flowboard/src/infrastructure/github/client.ts`     | Delegar ou incorporar PUT/GET binário; manter `putFileJson` atual.                                                                                                                                                       |
| `apps/flowboard/src/infrastructure/persistence/types.ts` | `Card` já importado do domínio — ajustar se tipo local duplicado.                                                                                                                                                        |
| `apps/flowboard/src/features/board/CreateTaskModal.tsx`  | Estado local de arquivos pendentes + lista de anexos; integração preview/download; passar `attachments` no `onSubmit`.                                                                                                   |
| `apps/flowboard/src/features/board/BoardView.tsx`        | `handleCreateTask` / `handleUpdateTask`: persistir `attachments`; receber `GitHubContentsClient` ou callbacks já existentes — **injetar** operações de upload/delete antes/depois de `saveDocument` conforme necessário. |
| `apps/flowboard/src/features/board/CreateTaskModal.css`  | Estilos da seção anexos.                                                                                                                                                                                                 |


### Investigar na implementação

- Onde `BoardView` obtém o cliente GitHub para `saveDocument` — reutilizar o mesmo para anexos.
- Pipeline Markdown da descrição (sanitização) para preview de `.md`.

### ADR


| Caminho                                                                      |
| ---------------------------------------------------------------------------- |
| `.memory-bank/adrs/NNN-card-attachments-github.md` (número sequencial local) |


---

## 3. Fluxo de execução

1. **Domínio:** tipos + `attachmentRules` + testes.
2. **GitHub:** métodos de conteúdo binário + testes unitários com `fetch` mock se já existir padrão no repo.
3. **Persistência:** garantir que `saveDocument` / merge de card inclua `attachments`; ao deletar card (`handleDeleteCard`), **DELETE** de cada `storagePath` (best-effort, sequencial ou paralelo limitado).
4. **UI:** `CreateTaskModal` — input file (multiple), validação, upload no **submit** ou upload imediato (preferência: **no submit** para menos órfãos; se imediato, documentar). Spec original sugere salvar no repo ao salvar card — alinhar: **uploads executados quando usuário confirma o modal**, na ordem blob → atualizar card → `saveDocument`.
5. **Preview:** JPEG via object URL após GET; MD via mesmo renderizador da descrição.
6. **Download:** blob + link temporário.
7. **E2E ou checklist:** anexar jpg, reabrir board (variável de ambiente E2E se disponível).

---

## 4. `repo_write_scope` sugerido (implementer)

```
apps/flowboard/src/domain/types.ts
apps/flowboard/src/domain/attachmentRules.ts
apps/flowboard/src/domain/attachmentRules.test.ts
apps/flowboard/src/infrastructure/github/client.ts
apps/flowboard/src/infrastructure/github/binaryContent.ts
apps/flowboard/src/infrastructure/persistence/types.ts
apps/flowboard/src/features/board/BoardView.tsx
apps/flowboard/src/features/board/CreateTaskModal.tsx
apps/flowboard/src/features/board/CreateTaskModal.css
apps/flowboard/src/features/board/CardAttachmentsSection.tsx
.memory-bank/adrs/
```

(Último arquivo: apenas novo ADR; não editar specs sem necessidade.)

---

## 5. Riscos

- **Corpo da requisição grande** em Base64 próximo a 10 MB — aceitável; exibir loading.
- **Exclusão de card** sem exclusão de blobs deixaria lixo — o IPD exige DELETE dos anexos ao excluir card.
- **Concorrência:** dois dispositivos — mesmo modelo 409 que board atual.

---

## 6. Definição de pronto (DoD)

- Critérios A1–A7 da `spec-feature.md` atendidos.
- Lint + testes + build do pacote `apps/flowboard` verdes.
- ADR referenciado na PR ou em merge note.

