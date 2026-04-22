# Especificação Técnica — Anexos em Cards

**Versão do documento:** v1.0  
**Data:** 2026-04-22  
**Slug:** `card-attachments`  
**Track:** FEATURE  
**Status:** Rascunho para revisão (`spec-reviewer`)  

---

## 1. Objetivo

Permitir que cada **Card** tenha **anexos** (arquivos binários ou texto) persistidos no **mesmo repositório GitHub** já utilizado pelo FlowBoard, com:

- Upload no fluxo de criação/edição de card (UI existente: `CreateTaskModal`).
- Tipos permitidos: `**.jpg`**, `**.jpeg`**, `**.md**`, `**.pdf**`, `**.docx**`, `**.xlsx**`.
- **Limite de 10 MB por arquivo** (validação obrigatória antes da chamada à API).
- **Preview** in-app para **JPEG** e **Markdown**.
- **Download** seguro (sem colocar PAT em URL pública).

### 1.1 Alinhamento com a Constitution

- **Persistência via GitHub (Princípio II):** anexos são arquivos no repo, escritos via **GitHub Contents API**, no cliente — coerente com o MVP.
- **Domínio testável (Princípio I):** regras de validação (extensão, tamanho, sanitização de nome, limites opcionais) residem em funções puras no domínio, com testes Vitest.

---

## 2. Entidades e contratos de dados

### 2.1 Tipo `CardAttachment` (metadados persistidos no board JSON)

Metadados suficientes para localizar o blob, exibir UI e auditar.

```typescript
type CardAttachment = {
  /** ID estável gerado no cliente (ex.: UUID v4), único no escopo do card */
  attachmentId: string
  /** Nome original exibido ao usuário (não o nome físico completo no repo) */
  displayName: string
  /** Caminho no repositório, relativo à raiz (ex.: flowboard/attachments/...) */
  storagePath: string
  /** MIME type opcional, inferido no upload; útil para preview/download */
  mimeType?: string
  /** Tamanho em bytes conforme arquivo enviado */
  sizeBytes: number
  /** ISO 8601 — momento da criação do anexo no FlowBoard */
  addedAt: string
}
```

**Regras:**

- `storagePath` deve ser derivado de convenção estável (ver §4).
- `displayName` não deve conter path separators; caracteres problemáticos normalizados ou rejeitados (ver §3).

### 2.2 Extensão do tipo `Card` (`apps/flowboard/src/domain/types.ts`)

```typescript
export type Card = {
  // ... campos existentes
  attachments?: CardAttachment[]
}
```

- **Compatibilidade:** campo opcional; boards antigos sem `attachments` continuam válidos.

### 2.3 Extensão de `BoardDocumentJson`

- Incluir `attachments` apenas em cada card; **não** é obrigatório bump de `schemaVersion` se o parser aceitar cards com campos opcionais extras e a migração for implícita.
- Se o projeto exigir validação estrita de versão, registrar **bump** explícito (ex.: `schemaVersion: 2`) e migração de leitura — decisão fechada na fase `planner` após `spec-reviewer`.

---

## 3. Regras de negócio (domínio)

### 3.1 Tipos de arquivo

- Extensões aceitas (case-insensitive após normalização): **jpg, jpeg, md, pdf, docx, xlsx**.
- Validação por **extensão declarada** +, quando possível, **MIME** do `File` do browser; em conflito, política: **rejeitar** com mensagem clara (evita bypass por renomeação).

### 3.2 Tamanho

- **Máximo 10.000.000 bytes (10 MB)** por arquivo, conforme pedido do produto.
- Constante nomeada no domínio (ex.: `MAX_ATTACHMENT_BYTES`).

### 3.3 Nome de exibição e segurança

- Rejeitar nomes vazios, nomes com path (`..`, `/`, `\`).
- Opcional (recomendado): truncar comprimento máximo do `displayName` (valor sugerido na implementação: 255 caracteres).

### 3.4 Limites agregados (recomendado)

- Não especificado pelo solicitante; a spec recomenda **limite de anexos por card** (ex.: 50) e **tamanho total por card** opcional para proteger o repo — **HITL de produto** se números forem obrigatórios na v1.

---

## 4. Armazenamento no repositório

### 4.1 Convenção de path

Proposta (ajustável no plano):

```text
flowboard/attachments/{boardId}/{cardId}/{attachmentId}_{slugDoNomeOriginal}
```

- `slugDoNomeOriginal`: nome sanitizado (ASCII seguro, sem separadores de path), preservando extensão permitida.
- Garante unicidade por `attachmentId` mesmo com colisão de nomes.

### 4.2 API GitHub

- **Criar/atualizar:** `PUT /repos/{owner}/{repo}/contents/{path}` com `content` em **Base64** (API já usada para JSON; estender cliente para **conteúdo binário/base64 genérico**).
- **Ler para preview/download:** `GET` contents do arquivo; decodificar Base64 no cliente.
- **Remover:** `DELETE` com `sha` atual do arquivo (reutilizar padrão de `deleteFile` existente).
- Conflitos **409:** seguir padrão ADR-005 / `putJsonWithRetry` onde aplicável; para binários, mesmo padrão de re-leitura + retry limitado.

### 4.3 Ordem de persistência (consistência)

1. `PUT` do blob do anexo no `storagePath`.
2. Atualizar `BoardDocumentJson` com o novo `CardAttachment` na lista do card e salvar board.

Se o passo 2 falhar após o passo 1, pode existir **blob órfão**. Comportamento mínimo: mensagem de erro; retry idempotente usando o mesmo `attachmentId` e path deve sobrescrever ou exigir novo ID — **decisão fechada no plano** (preferência: mesmo `attachmentId` + PUT idempotente).

---

## 5. UX / UI

### 5.1 Onde

- `CreateTaskModal`: seção **Anexos** em modo criação e edição.
- Lista de anexos com: nome, tamanho, ações **Baixar**, **Remover**, **Preview** (quando aplicável).

### 5.2 Preview


| Tipo                     | Comportamento                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.jpg` / `.jpeg`         | Miniatura clicável ou preview inline com `img` + `src` baseado em blob obtido via API autenticada (object URL).                                                  |
| `.md`                    | Renderizar Markdown como no restante do app (reutilizar pipeline seguro de descrição, **sem** HTML bruto não confiável; sanitização alinhada ao que já existir). |
| `.pdf`, `.docx`, `.xlsx` | Sem preview nativo na v1: ícone + metadados + download.                                                                                                          |


### 5.3 Download

- Obter conteúdo via `fetch` autenticado (PAT em header), montar `Blob`, disparar download com nome `displayName` (padrão HTML5 `download` + object URL revogada após uso).

### 5.4 Acessibilidade

- Botões com `aria-label`; preview com texto alternativo para imagens quando aplicável.

---

## 6. Erros e edge cases

- **401/403/404** na API: mensagens alinhadas ao restante do app (`GitHubHttpError`).
- **429:** respeitar `Retry-After` quando exposto.
- **Quota / limite de tamanho GitHub:** documentar que 10 MB está abaixo do teto usual da API Contents; se falhar por política do repo, exibir erro genérico com código.
- **Offline / abort:** respeitar `AbortSignal` onde já existir no carregamento do board.

---

## 7. Testes e verificação

- **Domínio:** validação de extensão, tamanho, nome; possivelmente geração determinística de `storagePath` com inputs fixos.
- **Integração/E2E (mínimo):** fluxo feliz “anexar jpg + salvar + reabrir board” em ambiente com `FLOWBOARD_E2E_`* se disponível; caso contrário, checklist manual em `tester-feature.md`.

---

## 8. Riscos e dependências

- **Payload Base64:** ~33% maior que binário; 10 MB arquivo ≈ ~13.4 MB JSON body — aceitável na faixa da API para MVP; monitorar timeouts.
- **Possível ADR:** extensão formal do `GitHubContentsClient` para PUT/GET binário e política de paths de anexos — se `spec-reviewer` ou `architect` exigirem registro explícito.

---

## 9. Fora de escopo (v1)

- Colaboração simultânea avançada em anexos.
- Antivírus ou scanning de conteúdo.
- Preview de PDF/DOCX/XLSX.

---

## 10. Critérios de aceite mapeados


| #   | Critério                                                                |
| --- | ----------------------------------------------------------------------- |
| A1  | Seleção e upload de arquivos com extensões permitidas no modal de card. |
| A2  | Rejeição pré-upload > 10 MB com feedback.                               |
| A3  | Blob presente no repo + metadados no JSON do board após salvar.         |
| A4  | Preview JPEG e MD conforme §5.2.                                        |
| A5  | Download sem PAT na URL.                                                |
| A6  | Remoção atualiza repo + JSON.                                           |
| A7  | Cobertura de testes/contratos conforme §7.                              |


---

## 11. Próximos passos (pipeline FEATURE)

1. `spec-reviewer` — verificar lacunas, riscos e consistência com Constitution/ADRs.
2. `architect` — apenas se houver decisão estrutural em aberto (ex.: ADR, schemaVersion).
3. `planner` → `plan-reviewer` → `task-breakdown`.
4. **HITL:** aprovação explícita do plano e escopo de escrita antes do `implementer`.

