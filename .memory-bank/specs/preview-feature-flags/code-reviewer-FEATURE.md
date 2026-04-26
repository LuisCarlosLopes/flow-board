# Code Review Report — preview-feature-flags

**Slug:** `preview-feature-flags`  
**Data:** 2026-04-26  
**Escopo:** `apps/flowboard/src/infrastructure/featureFlags/`, `PreviewFeaturesModal`, `AppShell`, `AGENTS.md`

## Verdict

**Aprovado**.

## Summary

- Sistema de flags ficou centralizado (registo em código + overrides em `localStorage`) e não toca persistência GitHub de domínio.
- Semântica `preview` vs `stable` é clara: `stable` não aparece no painel e é sempre “on”.
- Modal e hooks têm cobertura de testes forte e comportamentos de acessibilidade essenciais (Esc / foco / Tab wrap).
- Documentação em `AGENTS.md` descreve passo-a-passo para criação e testes de flags.

## Findings table

| Severity | Area | Description | Suggestion |
|----------|------|-------------|------------|
| critical | - | N/A | N/A |
| high | - | N/A | N/A |
| medium | A11y | Switches precisam de nome acessível por item | Resolvido: `aria-labelledby` apontando para o título da flag |
| low | Maintainability | `previewFlags` memoizado sem deps | Resolvido: calcular via `listPreviewFlags()` no render |
| low | DX | Setter silencioso para ids inválidos/stable | Resolvido: `console.warn` em DEV |
| low | UX | Modal não bloqueava scroll do body | Resolvido: lock/unlock via `document.body.style.overflow` |
| nit | Style | Indentação no `<header>` do `AppShell` | Resolvido |

## Positive notes

- Storage defensivo com parse tipado evita corrupção/legacy quebrar o app.
- Persistência grava só deltas vs default (overrides mínimos).
- `storage` listener permite sincronização simples entre abas.
- Testes cobrem hooks fora do provider, toggles, storage event, focus trap e backdrop click.

## Residual risk

- Em modo privado/quota cheia, gravação em `localStorage` pode falhar: UI muda no runtime mas não persiste após reload. Considerado aceitável para prefs locais.

