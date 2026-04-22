# Code Review Report — card-attachments (FEATURE)

**Data:** 2026-04-22  
**Escopo:** implementação de anexos em cards (`apps/flowboard`) + ADR 008  
**Rastreabilidade:** `.memory-bank/specs/card-attachments/spec-feature.md`, ADR 008  

---

## Veredito

**Aprovado para merge** com ressalvas operacionais (não bloqueantes para MVP single-user). Nenhum achado **crítico** de segurança ou corrupção de dados dominante no happy path.

**Score:** 86 / 100  

---

## Achados por severidade

### Crítico

*Nenhum.*

### Maior

1. `**putFileBase64` sem retry em 409**
  O JSON do quadro usa padrão de retry após conflito (`putJsonWithRetry` / ADR-005). Anexos binários não têm equivalente: duas sessões ou abas salvando anexos no mesmo repo podem falhar com 409 sem recuperação automática.  
   **Sugestão:** extrair `putBase64WithRetry` espelhando o fluxo do JSON ou reutilizar getter de SHA + segunda tentativa.
2. **Exclusão de card com `doc` / `timeState` capturados no fechamento**
  Em `handleDeleteCard`, o IIFE assíncrono usa `doc` e `timeState` do render em que o clique ocorreu. Se o estado do quadro mudar antes do `await` terminar, a exclusão pode sobrescrever um estado mais novo.  
   **Sugestão:** usar `docRef.current` / função de atualização funcional ou serializar revisão (ex.: abortar se `sha` ou versão lógica mudou).

### Médio

1. **Upload parcial de anexos**
  `uploadAttachmentBlobs` interrompe no primeiro erro; blobs já enviados permanecem no repo sem entrada no card (órfãos). Aceitável para MVP com ADR, mas o erro mostrado ao usuário é genérico.  
   **Sugestão:** mensagem que mencione possível anexo parcial + opcional “tentar de novo” com mesmos paths.
2. **Preview ao remover anexo**
  `removeExisting` / `removePending` zera `previewId` quando coincide, mas não chama `revokePreviewUrl()`. O painel some (`previewId && previewBlobUrl`), porém o object URL pode ficar vivo até próxima abertura de preview ou unmount.  
   **Sugestão:** `revokePreviewUrl()` quando o item removido era o preview ativo.
3. **Markdown: links em `ReactMarkdown`**
  Conteúdo `.md` malicioso pode incluir links `javascript:` ou exfiltração; o risco é baixo (dados do próprio usuário), mas não há `urlTransform` / allowlist de esquemas.  
   **Sugestão:** `urlTransform` permitindo apenas `http:`, `https:`, `#`, ou desabilitar links.

### Menor

1. **Mensagem de erro em `handleCreateTask` / `handleUpdateTask`**
  Falhas em `deleteRepoPathIfExists` compartilham cópia com falhas de upload (“Erro ao enviar anexos”).  
   **Sugestão:** distinguir remoção vs upload na UX.
2. `**MdPreviewFromUrl` + `fetch(blob:)`**
  Funciona em browsers modernos; dependência de CORS não se aplica a blob URLs. OK; apenas manter em mente para ambientes estranhos.

---

## Pontos positivos

- Regras de anexo concentradas em `attachmentRules.ts` com testes Vitest.
- PAT permanece em header (`getFileRaw` / download via Blob), não em URL.
- `sanitizeDisplayName` bloqueia `..` e separadores antes do slug do path.
- `CardTaskPayload` separa metadados (`attachments`) de bytes (`attachmentBlobs`) de forma clara.
- `deleteRepoPathIfExists` trata 404 sem abortar fluxo desnecessário.

---

## Verificações recomendadas antes do merge

- Decidir se 409 em anexos exige follow-up imediato ou ticket.
- Smoke manual: dois anexos, remover um, salvar, recarregar, excluir card.

---

## Conclusão

Implementação **coerente com a spec e a Constitution** (GitHub-only, domínio testável). Riscos residuais são principalmente **concorrência GitHub (409)** e **estado assíncrono na exclusão de card** — aceitáveis como dívida documentada para o MVP, desde que o time esteja ciente.

**Recomendação:** **Merge permitido**; abrir melhorias P1/P2 para itens “Maior” se o produto priorizar multi-dispositivo ou edição simultânea.

---

## Resolução pós-review (2026-04-22)


| #   | Achado                               | Ação                                                                                                                       |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | `putFileBase64` sem retry 409        | `putFileBase64WithRetry` em `client.ts`; `uploadAttachmentBlobs` usa getter `tryGetFileRaw` + retry; teste Vitest.         |
| 2   | `handleDeleteCard` com closure stale | `timeStateRef` + `docRef.current` após deletes; snapshot de `cardId` / anexos; aborta com mensagem se o card sumiu do doc. |
| 3   | Upload parcial / mensagem            | `uploadAttachmentBlobs` acumula paths enviados e anexa hint ao erro.                                                       |
| 4   | Object URL ao remover preview        | `removeExisting` / `removePending` chamam `revokePreviewUrl()` quando o preview ativo é removido.                          |
| 5   | Links em Markdown                    | `ReactMarkdown` com `urlTransform={safeMarkdownUrlTransform}` (http/https e `#` apenas).                                   |
| 6   | Mensagem genérica delete vs upload   | `handleCreateTask` / `handleUpdateTask`: dois blocos `try/catch` com textos distintos.                                     |


