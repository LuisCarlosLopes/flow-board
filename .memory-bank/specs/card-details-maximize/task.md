# Task breakdown — card-details-maximize

Ordem sugerida (dependências em cadeia leve no mesmo componente).

## T1 — Estado e marcação no modal

- [ ] Adicionar estado booleano local para layout maximizado (resetar ao fechar o modal **ou** manter só enquanto aberto — preferir **reset ao fechar** para evitar surpresa na próxima abertura; documentar escolha no PR).
- [ ] Envolver título + botão de toggle em um flex header (`justify-content: space-between`, `align-items: center`).
- [ ] `data-testid="ctm-maximize-toggle"` no botão; `aria-pressed` refletindo maximizado.

## T2 — Estilos maximizados

- [ ] Classes modificadoras em `.fb-ctm` e, se necessário, `.fb-ctm-overlay` para padding e dimensões (ex.: painel ~`calc(100vw - 2*padding)` / `calc(100vh - 2*padding)` com teto razoável).
- [ ] Ajustar `.fb-ctm__textarea` no modo maximizado para crescer com o espaço (flex column no `.fb-ctm` se precisar).

## T3 — Testes

- [ ] Renderizar modal aberto com props mínimas (`vi` mocks se já usados).
- [ ] Simular clique no toggle: assert em `aria-pressed` ou classe CSS no painel.
- [ ] Preencher campo, alternar maximizar duas vezes, assert valor preservado.

## T4 — Verificação manual

- [ ] Criar e editar card: maximizar, editar descrição longa, restaurar, salvar.
- [ ] ESC fecha em ambos os modos.

---

**Gate:** aprovação explícita em `state.yaml` → `approvals` antes de implementação.
