# TSD Review Report — Fronteira segura para token GitHub
> Data: 2026-04-24 | Revisor: spec-reviewer | TSD Versão: 1.1
> PRD de origem: não disponível; `state.yaml` usado apenas como contexto auxiliar

## Veredicto: 🟡 APROVADO COM RESSALVAS

Zero críticos pendentes. A TSD v1.1 corrigiu os bloqueios da revisão anterior e pode seguir para `architect`/`planner`, com avisos que devem ser considerados no planejamento para reduzir ambiguidade de contrato.

## Pré-Análise

| Item | Resultado |
|---|---|
| Feature | Fronteira segura para token GitHub |
| Slug | `secure-github-token-boundary` |
| TSD versão | 1.1 |
| Confiança declarada | 88/100 |
| Complexidade declarada | L |
| RFs na Seção 3 | 13 |
| Regras de negócio | 8 validações, 7 transições de estado, 4 regras de autorização, 5 limites/quotas |
| Operações de interface | 6 operações observáveis + matriz de idempotência |
| Critérios de aceite | 25 |
| Assunções com default explícito | 4 |
| Perguntas/assunções sem default explícito | 0 |
| Handoff preenchido | Sim; RF01-RF13 listados explicitamente |

## Sumário

| Categoria | Qtd |
|---|---:|
| 🔴 Críticos | 0 |
| 🟡 Avisos | 3 |
| 🔵 Sugestões | 3 |
| ✅ Auto-correções | 0 |
| Score de Qualidade | 85/100 |

## Problemas Encontrados

### 🔴 CRÍTICOS

Nenhum crítico encontrado na TSD v1.1.

### 🟡 AVISOS

#### [A1] Seção 5 — Contrato não fixa método e rota concretos
- **Evidência:** a TSD declara: "A TSD não fixa nomes de rotas, estrutura de pastas ou bibliotecas; o planner deve materializar uma superfície equivalente preservando os contratos abaixo."
- **Risco:** falha parcial de C1.7. O contrato está semanticamente claro, mas menos executável que o padrão da checklist, que espera método e rota definidos para cada operação.
- **Ação recomendada:** no planejamento, decidir explicitamente a superfície de interface para cada operação, preservando a semântica de status da Seção 5.0. Se a squad mantiver specs sem rotas por design, registrar essa exceção como decisão metodológica.

#### [A2] Seção 5.4 — "Conteúdo inválido" não possui status canônico nem regra numerada própria
- **Evidência:** a leitura autenticada lista `Conteúdo inválido | JSON remoto malformado ou schema mínimo inválido`, mas a tabela canônica 5.0 não inclui essa semântica, e a Seção 4 não traz regra V/A/L específica para JSON remoto inválido.
- **Risco:** falha parcial de C2.3. O planner pode mapear esse caso de formas diferentes, misturando erro de validação local, falha externa ou corrupção de dado remoto.
- **Ação recomendada:** antes ou durante o planejamento, definir se `Conteúdo inválido` é 422, 502, 500 redigido ou outro status observável, e ancorar em regra numerada.

#### [A3] Seção 7 — Falha externa 502/503 não aparece explicitamente nos CAs de erro
- **Evidência:** a Seção 5.0 define `Falha externa | 502 ou 503`; V08 e RNF 9.4 exigem falha recuperável/redigida, mas CA15 enumera apenas `401/403/404/409/429`.
- **Risco:** falha parcial de C2.1/C2.2 para a regra V08/L01. A cobertura existe de forma indireta em CA21, mas não garante comportamento observável de indisponibilidade/timeout GitHub.
- **Ação recomendada:** adicionar ou derivar no plano um teste/critério explícito para falha externa redigida e recuperável, incluindo 502/503 ou a semântica final escolhida.

### 🔵 SUGESTÕES

#### [S1] Formalizar exceção "operações observáveis sem rota"
Se o padrão CodeSteer local permitir TSDs que definem operações sem método/rota, vale registrar essa convenção para evitar que revisões futuras marquem C1.7 repetidamente.

#### [S2] Sincronizar `state.yaml` depois da aprovação
O `state.yaml` ainda registra no histórico que a TSD v1.0 foi gerada. Após este review, o orquestrador deveria registrar que v1.1 foi revalidada com ressalvas.

#### [S3] Separar "falha externa" de "conteúdo remoto inválido"
Manter essas duas classes distintas ajuda o planner/tester a validar indisponibilidade do GitHub sem confundir com dado remoto corrompido ou schema inválido.

## Checklist de Aprovação

| Check | Status | Evidência | Severidade |
|---|---|---|---|
| C1.1 — 12 seções obrigatórias | PASSOU | Seções 1 a 12 presentes, incluindo `## 12. Metadados` | - |
| C1.2 — Cabeçalho completo | PASSOU | Nome, data, versão v1.1, confiança 88/100 e complexidade L presentes | - |
| C1.3 — Zero placeholders | PASSOU | Nenhum placeholder de template identificado fora de blocos de código | - |
| C1.4 — Visão geral completa | PASSOU | Problema, comportamento principal e ator principal declarados | - |
| C1.5 — RFs numerados e declarativos | PASSOU | RF01-RF13 presentes e iniciam com "O sistema deve" | - |
| C1.6 — Regras V/A/L preenchidas | PASSOU | V01-V08, A01-A04 e L01-L05 presentes | - |
| C1.7 — Contrato completo | FALHOU | Operações têm request, sucesso e falhas, mas não fixam método/rota concretos | AVISO |
| C1.8 — Idempotência | PASSOU | Seção 5.7 cobre iniciar, consultar, encerrar, ler, escrever e excluir | - |
| C1.9 — Migration checkbox | PASSOU | Exatamente uma opção marcada: `Sim — migration lógica de sessão local` | - |
| C1.10 — CAs cobrem happy path, erros e bordas | PASSOU | CA01-CA25 cobrem caminho feliz, storage, fronteira, erro, governança e evidência | - |
| C1.11 — Fora de escopo | PASSOU | 8 itens presentes, todos com motivo explícito | - |
| C1.12 — Perguntas abertas | PASSOU | 4 assunções com default, justificativa e impacto; sem bloqueios pendentes | - |
| C1.13 — Handoff | PASSOU | Handoff preenchido, RF01-RF13 mapeados, bloqueios para planner = 0 | - |
| C1.14 — Fronteira spec/planner | PASSOU | Não define classes, bibliotecas, estrutura de pastas ou implementação concreta do app | - |
| C2.1 — RFs × CAs | PASSOU | Matriz RF x CA cobre RF01-RF13 | - |
| C2.2 — Regras × CAs | PASSOU | Validações principais, estado, autorização e quotas têm cobertura por CAs, com ressalva para falha externa explícita | AVISO |
| C2.3 — Contrato × Regras | FALHOU | `Conteúdo inválido` não tem status canônico nem regra numerada própria | AVISO |
| C2.4 — Migration × Modelo de Dados | PASSOU | Migration lógica coerente com limpeza de sessão local; sem migration de domínio declarada | - |
| C2.5 — Edge cases × CAs | PASSOU | Sessão legada, logout idempotente, repo diferente, expiração, conflito e rate limit cobertos | - |
| C2.6 — Endpoints modificados × contexto | N/A | Não há endpoints próprios existentes; TSD define operações observáveis novas/equivalentes | - |
| C2.7 — Handoff × RFs | PASSOU | RF01-RF13 aparecem no handoff com o mesmo ID | - |
| C2.8 — Seção 10 × Handoff | PASSOU | Assunções não bloqueantes = 4 e bloqueios para planner = 0 | - |
| C3.1 — User Stories PRD → RFs | N/A | PRD não disponível | - |
| C3.2 — Comportamentos obrigatórios → RFs/CAs | N/A | PRD não disponível; state auxiliar está semanticamente coberto | - |
| C3.3 — Fora de escopo preservado | N/A | PRD não disponível; fora de escopo do state aparece preservado | - |
| C3.4 — Métricas PRD → RNF | N/A | PRD não disponível | - |
| C3.5 — Sem scope creep | N/A | PRD não disponível; state auxiliar não indica scope creep relevante | - |

## Auto-correções Aplicadas

Nenhuma. A TSD não foi alterada por este revisor.

## Status Final

Aprovado com ressalvas. Próximo passo: acionar `architect`/`planner` usando a Seção 11, levando os 3 avisos como pontos de decisão/clareza no plano.

```json
{
  "agent": "spec-reviewer",
  "status": "approved_with_reservations",
  "score": 85,
  "criticals": 0,
  "warnings": 3,
  "suggestions": 3,
  "auto_corrections": 0,
  "review_report": ".memory-bank/specs/secure-github-token-boundary/spec-reviewer-feature.md"
}
```
