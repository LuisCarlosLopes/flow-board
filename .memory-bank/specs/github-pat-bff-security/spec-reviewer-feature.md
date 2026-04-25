# Spec Review — github-pat-bff-security (TSD v1.0)

**Revisor:** spec-reviewer (relatório auxiliar — subagente indisponível por quota; checklist `_codesteer/agents/spec-reviewer/references/spec-review-checklist.md` aplicado manualmente)  
**Data:** 2026-04-25  
**Artefato:** `.memory-bank/specs/github-pat-bff-security/spec-feature.md`

---

## Veredicto

**Amarelo — GO condicionado** para `architect` + `planner`

- **Score:** 82/100  
- Condição: o **IPD** deve cravar os paths reais (já sugeridos no TSD: `POST /api/flowboard/session`, proxy sob `/api/flowboard/github/...`, `POST .../logout`) e a estratégia de *cookie* (nome, `Path`, duração) **antes** de `implementer`.  
- **Constitution III / ADR-004:** o TSD exige **novo ADR** ou substituição clara; **architect** deve formalizar.

---

## Camada 1 — Estrutural

| ID | Check | Resultado |
|----|--------|------------|
| C1.1 | 12 secções | OK |
| C1.2 | Cabeçalho (nome, confiança, data, versão) | OK |
| C1.3 | Placeholders de template | OK (não detetados fora de exclusões) |
| C1.4 | Visão geral | OK |
| C1.5 | RFs numerados, declarativos | OK (RF01–RF09) |
| C1.6 | Regras 4.1–4.4 | OK |
| C1.7 | §5 com método/path, request, falhas | **OK** pós-ajuste (rotas *default* + IPD pode alinhar prefixo) |
| C1.8 | Idempotência | Tabela em §5.4 presente |

---

## Camada 2 — Consistência interna

- Rastreabilidade guia `docs/Protegendo PAT GitHub em Next.js.md` → RFs (tabela §12.2): **OK**  
- Conflito explícito com **ADR-004** (PAT em storage web) **identificado e escalado** para ADR: **OK**  
- **Fora de escopo** (OAuth, GHE) explícito: **OK**  
- Handoff §11 preenchido com conteúdo concreto: **OK**

---

## Camada 3 — Rastreabilidade ao repositório

- Estado real: `sessionStore` com **localStorage** + `pat` — **cobre** a motivação.  
- Cliente GitHub no browser: **cobre** a necessidade BFF.  
- `security-hardening-mvp` excluía BFF: esta spec **não** contradiz a si mesma; é **evolução** intencional.

---

## Findings

| Severidade | ID | Descrição | Ação |
|------------|----|-----------|------|
| — | — | Nenhum **critical** | — |
| Medium | M1 | E2E (`storageState` + PAT) quebra modelo antigo; precisa desenho no IPD | `planner` + `tester` |
| Medium | M2 | *Deploy* precisa de processo com segredo de selagem (32+ bytes) e HTTPS | `architect` + ops |
| Low | L1 | README ainda pode dizer "sessionStorage" — alinhar pós-ADR | doc |

---

## Conclusão

O TSD é **suficiente** para a fase `architect` (decisão BFF, cookie AEAD, atualização de ADR) e `planner` (IPD, compatibilidade com Vite+SPA, migração de sessões `localStorage` legadas). **Não** reabrir spec salvo o IPD detetar contradição com hosting escolhido (ex. *serverless* sem suporte a cookies de forma estável — seria *edge case* de produto, não bloqueio do texto atual).

**Próximo subagente recomendado:** `architect`
