# Tester — security-hardening-mvp

**Track:** TASK  
**Data:** 2026-04-21

---

## Comandos

```bash
cd apps/flowboard
npm test
npx vitest run --coverage
npm run build
npm run lint
```

## Resultados

| Verificação                 | Resultado                                               |
| --------------------------- | ------------------------------------------------------- |
| `npm test` (Vitest)         | **240** testes, **21** arquivos — todos passando        |
| Cobertura (linhas, projeto) | **81,07%** (meta AGENTS.md: >80% no conjunto)           |
| `npm run build`             | OK (`tsc -b` + `vite build`)                            |
| `npm run lint`              | OK (apenas avisos em artefatos gerados sob `coverage/`) |

## Casos novos relevantes

- `url.test.ts`: `evilgithub.com`, `www.github.com` rejeitados.
- `sessionStore.test.ts`: JSON inválido, PAT vazio, `apiBase` adulterado → storage limpo.
- `boardRepository.test.ts`: catalog com `boardId` vazio; board sem `columns`.

## Evidência manual sugerida (opcional)

- `npm run preview` após build: confirmar carregamento de fonts Google e chamadas à API GitHub sem violações CSP no console.
