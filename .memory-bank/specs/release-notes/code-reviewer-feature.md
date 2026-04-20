# Code Review — Release Notes (FEATURE)

**Data:** 2026-04-20  
**Âmbito:** `apps/flowboard` — feature `release-notes`, integração `App.tsx` / `AppShell`, E2E, testes.

## Recomendação: **APROVAR MERGE** (sem bloqueios)

Nenhum achado de severidade **critical** ou **high**. Itens abaixo são melhorias opcionais.

---

## Achados

### Low — Qualidade / UX

1. **`useCurrentVersion` — erro em tempo de execução** se não existir release ativo (`throw`). Aceitável para MVP com JSON controlado; alternativa futura: fallback `0.0.0` + `console.warn`.
2. **i18n:** página de release notes em inglês enquanto o shell é PT-BR — alinhado ao scope (“English only for MVP”).
3. **Sem teste unitário dedicado a `ChangeCard` / `FilterBar` isolados** — comportamento coberto indiretamente em `ReleaseNotesPage.test.tsx`; aceitável para o tamanho dos componentes.

### Informacional

- **Roteamento:** `/releases` fora do fluxo com `session` permite deep link sem login — coerente com ADR-007 e útil para bookmarks.
- **Segurança:** dados estáticos JSON; sem superfície de injeção ou segredos.

---

## Checklist rápido

- [x] Tipagem estrita nos ficheiros novos  
- [x] Rotas e navegação (`react-router-dom`) consistentes  
- [x] Estilos acoplados a tokens existentes  
- [x] Testes RTL com `cleanup` global (evita fugas de DOM)  

---

## Nota de processo

Correção de lint em `LoginView.integration.test.tsx` (remoção de `any`) foi feita durante a fase de verificação; não altera comportamento do produto.
