## Task: Persistir seleção do quadro ativo

### Contexto
A seleção de quadro atualmente vive apenas no state do `AppShell` (`selectedBoardId`).
Ao recarregar a página ou navegar fora e voltar, o usuário perde o quadro ativo.

### Objetivo
Persistir o `boardId` do quadro ativo por repositório GitHub da sessão e restaurar automaticamente
na inicialização, sem persistir credenciais.

### Critérios de aceite (AC)
- Seleção do quadro persiste após refresh.
- Persistência é **namespaced** pelo repo da sessão (não vaza entre repos diferentes).
- Logout remove seleção persistida do repo atual.
- Nenhum dado sensível (PAT) é persistido fora do `sessionStorage` existente.

### Plano de implementação (alto nível)
- Criar `boardSelectionStore` com:
  - `loadActiveBoardId(session)`
  - `saveActiveBoardId(session, boardId | null)`
  - `clearActiveBoardId(session)`
- Integrar no `AppShell`:
  - Inicializar `selectedBoardId` com valor carregado do store.
  - Persistir sempre que `selectedBoardId` mudar.
  - No logout: limpar o store do repo atual.
- Testes unitários do store cobrindo:
  - namespace por repo
  - persist + load
  - clear
  - comportamento quando `localStorage` é indisponível

