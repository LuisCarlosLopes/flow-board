# Relatório de testes — FlowBoard MVP

> **Data:** 2026-04-19 | **Agente:** tester (EPIC) | **App:** `apps/flowboard`

---

## Veredicto: ✅ PASS — sem falhas críticas automatizadas

Execução local em ambiente de desenvolvimento (Vitest + ESLint + build de produção).

---

## 1. Automação

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | ✅ 0 erros |
| `npm test` (Vitest) | ✅ 38 testes, 9 arquivos |
| `npm run build` | ✅ `tsc -b` + Vite |

### Cobertura por área (arquivos de teste)

| Área | Arquivo(s) |
|------|------------|
| Colunas P01–P02 | `boardRules.test.ts` |
| Tempo R01–R06 | `timeEngine.test.ts` |
| Período R09 / agregação | `hoursProjection.test.ts`, `hoursAggregation.test.ts` |
| Layout / drag lógico | `boardLayout.test.ts` |
| GitHub client | `client.test.ts`, `url.test.ts` |
| Repositório | `boardRepository.test.ts` |
| Sessão | `sessionStore.test.ts` |

---

## 2. Casos de borda (planner §3.1) — rastreio

| Caso | Evidência automatizada |
|------|-------------------------|
| R03 | `timeEngine.test.ts` |
| R04 | `timeEngine.test.ts` |
| R06 | `timeEngine.test.ts` |
| 409 + retry | `client.test.ts` (`putJsonWithRetry`) |
| R09 período | `hoursProjection.test.ts`, `hoursAggregation.test.ts` |

---

## 3. Testes manuais recomendados (não automatizados neste relatório)

Checklist para validação humana com **PAT de sandbox** e **repositório de teste**:

- [ ] Login: URL inválida → mensagem clara.
- [ ] Login: PAT incorreto → 401/403 tratado.
- [ ] Logout → volta ao login; `sessionStorage` sem PAT (validar DevTools).
- [ ] Criar segundo quadro → ambos aparecem após refresh.
- [ ] Mover card Working → Done → total de horas no card e em Horas (período que inclui a conclusão).
- [ ] Horas: alternar “Todos os quadros” / “Quadro atual”.
- [ ] Skip link: Tab até “Ir para o conteúdo principal” → foco vai ao `#main-content`.

---

## 4. Lacunas conhecidas

- **E2E browser (Playwright):** fora do escopo desta entrega; matriz RF em README aponta evidência principalmente unitária + manual.
- **Carga / stress:** não executado.

---

```json
{ "agent": "tester", "epic": "personal-kanban-mvp", "automated": "pass", "manual": "pending_human" }
```
