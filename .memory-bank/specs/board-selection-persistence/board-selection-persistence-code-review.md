# Code Review Report — Persistência da seleção do quadro ativo (FlowBoard)
> **Data:** 2026-04-20  
> **Agente:** code-reviewer  
> **Módulos aplicados:** quality / security

---

## Contexto

| Campo | Valor |
|---|---|
| Linguagem/Stack | React + TypeScript (Vite), Vitest |
| Contexto de execução | SPA no browser (com testes em ambiente DOM simulado) |
| Fronteiras de confiança | Entrada do usuário (repo/board selection) → persistência local (`localStorage`) |
| Escopo revisado | `apps/flowboard/src/infrastructure/session/boardSelectionStore.ts`, `apps/flowboard/src/infrastructure/session/boardSelectionStore.test.ts`, `apps/flowboard/src/features/app/AppShell.tsx`, spec em `.memory-bank/specs/board-selection-persistence/` |
| Restrições declaradas | Não persistir credenciais; compatível com ausência de `localStorage`; comportamento não inventado |

---

## 🔴 Problemas Críticos

Nenhum encontrado.

---

## 🟠 Problemas Altos

[🟠 ALTO] [QUALIDADE] `selectedBoardId` não re-hidrata quando `session` muda (troca de repo/sessão)

LOCALIZAÇÃO: `apps/flowboard/src/features/app/AppShell.tsx:18-27`  
PROBLEMA: `selectedBoardId` é inicializado com `loadActiveBoardId(session)` apenas no primeiro render. Se o usuário trocar de repositório (nova `session` via props), o state **não** é recalculado e pode permanecer apontando para um `boardId` antigo; além disso, o `useEffect` de persistência pode gravar o valor antigo sob a nova chave do repo (dependendo da ordem de renders), causando UX confusa e potencial “vazamento” de seleção entre repos (mesmo com namespace correto).  
EVIDÊNCIA:

```17:28:apps/flowboard/src/features/app/AppShell.tsx
export function AppShell({ session, onLogout }: Props) {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => loadActiveBoardId(session))
  // Persist selection per repository (does not contain secrets).
  useEffect(() => {
    saveActiveBoardId(session, selectedBoardId)
  }, [session, selectedBoardId])
```

CORREÇÃO: re-hidratar o state quando `session.owner`/`session.repo` mudar (e opcionalmente limpar `cardToEditId`). Exemplo direto no `AppShell.tsx`:

```ts
// logo após o useState de selectedBoardId
useEffect(() => {
  setSelectedBoardId(loadActiveBoardId(session))
  setCardToEditId(null)
}, [session.owner, session.repo])
```

JUSTIFICATIVA: `useState(initializer)` só roda uma vez; re-hidratar por chaves estáveis evita dependência em identidade do objeto `session` e garante que o quadro ativo reflita o repo atual.

---

## 🟡 Problemas Médios

[🟡 MÉDIO] [UX/QUALIDADE] Não há fallback explícito quando `boardId` persistido não existe mais

LOCALIZAÇÃO: `apps/flowboard/src/features/app/AppShell.tsx` (integração), e a validação depende de `BoardListView`/fonte de boards  
PROBLEMA: se o `boardId` salvo for removido/renomeado no repositório (ou o catálogo mudar), o `AppShell` continuará com `selectedBoardId` truthy e renderizará `BoardView` com um ID potencialmente inválido, ou ficará sem quadro aparente dependendo de como `BoardView` lida com “não encontrado”. Isso degrada UX no refresh, justamente o fluxo alvo da feature.  
EVIDÊNCIA: o `AppShell` não valida a existência do board salvo; apenas renderiza quando há `selectedBoardId`:

```123:131:apps/flowboard/src/features/app/AppShell.tsx
        {mainView === 'kanban' && selectedBoardId ? (
          <BoardView
            session={session}
            boardId={selectedBoardId}
            columnEditorMenuTick={columnEditorMenuTick}
            cardToEditId={cardToEditId}
            onCardEditComplete={() => setCardToEditId(null)}
          />
        ) : null}
```

CORREÇÃO: implementar validação no ponto que conhece o catálogo (provavelmente `BoardListView`), e ao detectar “ID não existe”:
- limpar seleção: `onSelectBoard(null)`
- limpar persistência: `saveActiveBoardId(session, null)` (ou `clearActiveBoardId(session)`)

Se você quiser resolver sem acoplar `BoardListView` ao storage, um caminho é expor um callback `onInvalidSelection()` disparado quando lista de boards carregar e não contiver `selectedBoardId`, para o `AppShell` centralizar a limpeza.

JUSTIFICATIVA: o critério de aceite do spec menciona “restaurar … (se ele ainda existir no catálogo do repo)”; hoje o “se ainda existir” não está coberto na integração revisada.

[🟡 MÉDIO] [QUALIDADE] `loadActiveBoardId` assume que o payload do storage é apenas string (OK), mas o formato não é versionado por conteúdo

LOCALIZAÇÃO: `apps/flowboard/src/infrastructure/session/boardSelectionStore.ts:3-22`  
PROBLEMA: a chave já inclui `v1`, mas o valor é apenas `"boardId"`. Isso é suficiente agora, mas dificulta evolução (ex.: guardar metadados, timestamp, ou migração) sem precisar tratar múltiplos formatos.  
EVIDÊNCIA:

```3:22:apps/flowboard/src/infrastructure/session/boardSelectionStore.ts
const STORAGE_PREFIX = 'flowboard.activeBoard.v1'
// ...
    const v = JSON.parse(raw) as unknown
    return typeof v === 'string' && v.trim() ? v : null
```

CORREÇÃO: (opcional) persistir um envelope versionado:

```ts
type StoredActiveBoardV1 = { v: 1; boardId: string }
localStorage.setItem(k, JSON.stringify({ v: 1, boardId }))
// load: validar {v:1, boardId:string}
```

JUSTIFICATIVA: melhora forward-compat sem mudar o comportamento atual; reduz risco de “bricking” em migrações futuras.

---

## 🔵 Baixo / Info

[🔵 BAIXO] [SEGURANÇA] Persistência em `localStorage` está adequada ao ativo (boardId), mas lembrar limitações de threat model

LOCALIZAÇÃO: `apps/flowboard/src/infrastructure/session/boardSelectionStore.ts` (uso de `localStorage`)  
PROBLEMA: `localStorage` é acessível por qualquer script que rode na origem; se houver XSS em qualquer lugar do app, o `boardId` pode ser lido/modificado. Aqui o impacto é baixo (não é credencial), mas vale manter o “não persistir segredos” como regra dura.  
EVIDÊNCIA: store persiste apenas string do `boardId`:

```25:38:apps/flowboard/src/infrastructure/session/boardSelectionStore.ts
export function saveActiveBoardId(session: FlowBoardSession, boardId: string | null): void {
  // ...
  localStorage.setItem(k, JSON.stringify(boardId))
```

CORREÇÃO: ✅ Nenhuma mudança obrigatória. Só mantenha o escopo do storage restrito a dados não sensíveis (alinhado ao `AGENTS.md`).

[🔵 BAIXO] [TESTES] O teste de “localStorage indisponível” restaura via `vi.stubGlobal`, mas pode vazar se o teste falhar no meio

LOCALIZAÇÃO: `apps/flowboard/src/infrastructure/session/boardSelectionStore.test.ts:50-58`  
PROBLEMA: se uma asserção lançar antes da restauração, o `localStorage` global pode ficar `undefined` para testes seguintes.  
EVIDÊNCIA:

```50:58:apps/flowboard/src/infrastructure/session/boardSelectionStore.test.ts
  it('is a no-op when localStorage is unavailable', () => {
    const s = makeSession('acme', 'flow')
    const original = globalThis.localStorage
    vi.stubGlobal('localStorage', undefined as unknown as Storage)
    expect(loadActiveBoardId(s)).toBeNull()
    expect(() => saveActiveBoardId(s, 'board-123')).not.toThrow()
    expect(() => clearActiveBoardId(s)).not.toThrow()
    vi.stubGlobal('localStorage', original)
  })
```

CORREÇÃO: envolver em `try/finally`:

```ts
const original = globalThis.localStorage
vi.stubGlobal('localStorage', undefined as unknown as Storage)
try {
  // asserts
} finally {
  vi.stubGlobal('localStorage', original)
}
```

JUSTIFICATIVA: torna o teste robusto a falhas intermediárias e evita flaky tests por vazamento de global.

---

## Resumo

| Campo | Valor |
|---|---|
| Total de achados | 5 |
| Críticos | 0 |
| Altos | 1 |
| Médios | 2 |
| Baixos / Info | 2 |
| **Recomendação** | **CONDICIONAL** |
| Correção prioritária | Re-hidratar `selectedBoardId` quando `session.owner/repo` mudar no `AppShell` |

---

## Metadata JSON

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "modules_loaded": ["quality", "security"],
  "findings_total": 5,
  "findings_critical": 0,
  "findings_high": 1,
  "findings_medium": 2,
  "findings_low": 2,
  "recommendation": "CONDICIONAL",
  "priority_fix": "Re-hidratar selectedBoardId quando session.owner/repo mudar no AppShell",
  "report_path": ".memory-bank/specs/board-selection-persistence/board-selection-persistence-code-review.md"
}
```
