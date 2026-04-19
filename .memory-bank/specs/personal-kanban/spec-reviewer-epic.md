# TSD Review Report — FlowBoard (Kanban pessoal + tempo)

> **Data:** 2026-04-19 | **Revisor:** spec-reviewer (EPIC) | **TSD:** `spec-epic.md` v1.0  
> **PRD de origem:** `personal-kanban-dev-v1.0.prd.md` v1.3  
> **Protótipo analisado:** `.memory-bank/specs/personal-kanban/prototypes/index.html` (obrigatório)

---

## Veredicto: 🟡 APROVADO COM RESSALVAS

- **🟡 APROVADO COM RESSALVAS** — Nenhum problema **🔴 crítico**. O TSD pode alimentar o **architect** e o **planner**, desde que as ressalvas abaixo sejam tratadas no IPD ou como decisões explícitas de produto (principalmente alinhamento protótipo × escopo PRD).

---

## Sumário

| Categoria        | Qtd |
|------------------|-----|
| 🔴 Críticos      | 0   |
| 🟡 Avisos        | 6   |
| 🔵 Sugestões     | 4   |
| ✅ Auto-correções | 0   |
| **Score de qualidade** | **82** / 100 |

---

## Pré-análise (Fase 1)

| Campo | Valor |
|--------|--------|
| Feature | FlowBoard — Kanban pessoal + rastreamento de tempo |
| Confiança declarada (TSD) | 88/100 |
| Complexidade declarada | XL |
| RFs numerados (Seção 3) | 14 (RF01–RF14) |
| Regras / invariantes (Seções 4.x) | P01–P04, V01–V02, R01–R14, L01–L02 |
| “Endpoints” / integrações (Seção 5) | Comandos lógicos + GitHub API |
| Critérios de aceite (Seção 9) | 8 itens numerados |
| Perguntas 🔴 (Seção 12) | Nenhuma |
| Handoff (Seção 13) | Preenchido |
| Red flags imediatos | Estrutura de seções difere do `tsd-template.md` canônico (13 vs 11); conteúdo equivalente ou superior |

---

## Problemas encontrados

### 🔴 CRÍTICOS

_Nenhum._

### 🟡 AVISOS

**[A1] Estrutura do documento vs checklist canônico (Camada 1)**  
- **Evidência:** TSD usa seções 1–13 + Metadata; o checklist do agente cita “12 seções obrigatórias” alinhadas ao `references/tsd-template.md`.  
- **Risco:** Ferramentas ou revisores esperando números de seção exatos podem se confundir.  
- **Ação:** Manter `spec-epic.md` como está para esta entrega; no próximo incremento, opcionalmente renumerar para coincidir com o template **ou** registrar “TSD estendido v1 FlowBoard” no IPD.

**[A2] Rastreabilidade RF → critérios de aceite (Camada 2)**  
- **Evidência:** Existem 14 RFs e 8 CAs na Seção 9; nem todo RF tem CA dedicado (ex.: RF14 documentação de segurança).  
- **Risco:** Lacuna de teste explícito para alguns RFs no pacote de aceite.  
- **Ação:** No **planner/IPD**, exigir matriz RF×CA ou casos de teste que cubram RF11–RF14 e RF05 (exclusão de quadro).

**[A3] Handoff Seção 13 e fronteira spec/planner**  
- **Evidência:** Handoff menciona “paths lógicos”, “escolher stack”, “testes de integração” — adequado ao planner, mas vai além do “zero nomes de arquivo” estrito do agente `spec`.  
- **Risco:** Baixo; é o esperado para handoff.  
- **Ação:** Nenhuma mudança obrigatória no TSD; architect formaliza ADRs de stack e persistência.

**[A4] Protótipo × PRD — elementos visuais não especificados (Camada 3 + protótipo)**  
- **Evidência:** `index.html` inclui busca global na topbar, ícone de notificações, chips “Favorito”, pills de etiqueta/cores em cards, hashtags (#api). PRD lista etiquetas como **Fase 2** / fora do MVP.  
- **Risco:** Implementação literal do protótipo pode **crescer escopo** além do PRD.  
- **Ação:** Tratar protótipo como **direção visual e fluxo** (login, tabs Quadro/Horas, filtros período e escopo quadro); **não** como backlog implícito de search, notificações, favoritos ou sistema de labels até decisão de produto.

**[A5] Protótipo × TSD — funcionalidades parciais**  
- **Evidência:** Protótipo não expõe UI para **criar/renomear/excluir quadro**, **editar colunas** além de ⋮ placeholder, nem **edição de título de card** — apenas drag-and-drop e dados estáticos.  
- **Risco:** Gap UI para RF05, RF06, RF07; esperado em protótipo estático.  
- **Ação:** IPD deve listar telas/modais faltantes; não é falha do TSD.

**[A6] Checklist C1.9 “migration”**  
- **Evidência:** TSD não tem checkbox de migration SQL — persistência é JSON/GitHub.  
- **Status:** **N/A** justificado — modelo não relacional no MVP.

### 🔵 SUGESTÕES

**[S1]** Incluir na Seção 2 ou 13 do TSD (v1.1) uma linha “**Matriz de rastreabilidade US (PRD) → RF**” para auditoria futura em 1 tabela.

**[S2]** No relatório de horas, o protótipo mostra coluna “Última conclusão” — coerente com [R09]; manter ao implementar.

**[S3]** Documentar no IPD se **busca na topbar** será removida, desabilitada ou Fase 2 para evitar discussões de escopo.

**[S4]** `prefers-reduced-motion` já no protótipo CSS — replicar no app final (alinhado a NFR de acessibilidade).

---

## Protótipo × TSD / PRD (auditoria explícita)

| Elemento do protótipo | Alinhamento TSD/PRD | Nota |
|------------------------|---------------------|------|
| Marca **FlowBoard** + login URL + PAT | ✅ RF01, RF02, US-9 | Coerente |
| Logout **Sair** | ✅ RF03 | Coerente |
| Seletor de quadro + título | ✅ RF05, US-8 | Coerente |
| Tabs **Quadro** / **Horas no período** | ✅ RF11, US-6 | Coerente |
| Colunas Todo / Working / Done + badges de papel | ✅ RF06, US-1 | Coerente |
| **time-pill** (0h, acum., total) | ✅ RF09, RF10 | Coerente com segmentos |
| Período dia/semana/mês + escopo quadro / todos | ✅ RF11, RF12, [R09] | Coerente |
| Drag-and-drop de cards | ✅ RF08 | Coerente |
| Busca global topbar | ⚠️ Não exigida pelo PRD MVP | Ver [A4] |
| Notificações / favoritos / labels coloridos | ⚠️ Fora ou não coberto MVP | Ver [A4] |

---

## Checklist de aprovação (resumo)

| ID | Descrição | Resultado |
|----|-----------|-----------|
| C1.1 | Seções completas (variante 13 + metadata) | ✅ PASSOU (com [A1]) |
| C1.2 | Cabeçalho completo | ✅ PASSOU |
| C1.3 | Sem placeholders vazios | ✅ PASSOU |
| C1.4 | Visão geral | ✅ PASSOU |
| C1.5 | RFs em formato “O sistema deve” | ✅ PASSOU |
| C1.6 | Regras V/A/L ou equivalente | ✅ PASSOU |
| C1.7 | Contratos com eros esperados (5.1) | ✅ PASSOU |
| C1.8 | Idempotência / SHA escrita (4.7, 5.4) | ✅ PASSOU |
| C1.9 | Migration | N/A |
| C1.10 | CAs + edge (Seção 9) | 🟡 [A2] |
| C1.11 | Fora de escopo (≥3 itens) | ✅ PASSOU (Seção 10) |
| C1.12 | Sem 🔴 aberto | ✅ PASSOU |
| C1.13 | Handoff preenchido | ✅ PASSOU |
| C1.14 | Sem classes/arquivos de implementação | 🟡 Handoff menciona paths lógicos JSON ([A3]) |
| C2.1 | RF×CA | 🟡 [A2] |
| C3.1–C3.3 | PRD → TSD | ✅ PASSOU (com [A4] protótipo) |
| C3.4 | Métricas / performance | ✅ Sintetizado Seção 11 |
| C3.5 | Scope creep no texto TSD | ✅ PASSOU |

---

## Auto-correções aplicadas

Nenhuma alteração direta ao arquivo `spec-epic.md` nesta rodada (relatório apenas).

---

## Próximo passo

1. **Gate EPIC:** aprovação técnica do TSD com base neste relatório (🟡 — ressalvas aceitáveis).  
2. Acionar **architect** → `architect-epic.md` (ADRs, diagramas, alinhamento ao protótipo como referência visual).  
3. **Planner** deve incorporar matriz RF×CA [A2] e cortes de escopo do protótipo [A4].

---

## Metadata

```json
{
  "agent": "spec-reviewer",
  "status": "success",
  "verdict": "approved_with_reservations",
  "emoji": "🟡",
  "quality_score": 82,
  "critical_count": 0,
  "tsd_path": ".memory-bank/specs/personal-kanban/spec-epic.md",
  "prototype_path": ".memory-bank/specs/personal-kanban/prototypes/index.html"
}
```
