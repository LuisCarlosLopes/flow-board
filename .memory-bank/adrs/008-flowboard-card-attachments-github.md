# ADR 008 — Anexos de card no repositório GitHub

**Status:** Aceito  
**Data:** 2026-04-22  

## Contexto

Cards passam a referenciar arquivos (imagens, Markdown, PDF, Office) persistidos no mesmo repositório do usuário, além do JSON do quadro.

## Decisão

1. **Layout:** `flowboard/attachments/{boardId}/{cardId}/{attachmentId}_{nomeSanitizado}`.
2. **API:** GitHub Contents API via `GitHubContentsClient` com `putFileBase64`, `getFileRaw` / `tryGetFileRaw` e `deleteFile` (SHA atual).
3. **Metadados:** array `attachments` opcional em cada `Card` no `BoardDocumentJson` (`schemaVersion` permanece 1).
4. **Ordem:** upload dos blobs antes do `saveBoard`; remoções de anexo ou exclusão de card disparam `DELETE` nos paths conhecidos.

## Consequências

- Payload Base64 maior que o binário bruto; limite de 10 MB por arquivo permanece compatível com a API para o MVP.
- Blobs órfãos são possíveis se o salvamento do quadro falhar após PUT do anexo; retry com o mesmo `attachmentId` sobrescreve o path.

## Alternativas consideradas

- **Git LFS:** rejeitado no escopo MVP (complexidade e configuração no repo do usuário).
- **Backend próprio:** violaria a Constitution (persistência exclusiva via GitHub no MVP).
