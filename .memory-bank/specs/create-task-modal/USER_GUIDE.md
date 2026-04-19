# 🎬 Quick Start — Como Usar o Modal

## Abrir o Modal

No FlowBoard, procure por um botão **"Nova Tarefa"** no topo do quadro Kanban.

```
┌─────────────────────────────────┐
│ FlowBoard                        │
│ ┌─ Meus Quadros ─┐              │
│ │ Backlog        │  [Nova Tarefa] ← Clique aqui
│ └────────────────┘              │
│                                 │
│ [Backlog]  [Em Progresso] [Feito]
└─────────────────────────────────┘
```

---

## Preencher os Campos

Após clicar, abre um modal com 5 campos:

### 1️⃣ **Título** (Obrigatório)
```
┌──────────────────────────────┐
│ Título *                     │
│ [Implementar autenticação]   │  ← Texto obrigatório
└──────────────────────────────┘
```

### 2️⃣ **Descrição** (Opcional)
```
┌──────────────────────────────────────┐
│ Descrição                            │
│ ┌────────────────────────────────┐   │
│ │ Criar sistema de login com     │   │ ← Markdown suportado
│ │ OAuth2. Será integrado com     │   │    (ex: **bold**, _italic_)
│ │ GitHub API.                    │   │
│ │                                │   │ [Copiar] ← Botão Copy
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

**Botão Copiar:**
- Clique para copiar descrição para clipboard
- Verá spinner durante 1.5s (feedback visual)
- Toast confirmará sucesso/erro

### 3️⃣ **Data Planejada** (Opcional)
```
┌──────────────────────────────┐
│ Data Planejada               │
│ [__/__/____] ← Date picker   │  ← Clique para abrir calendário
└──────────────────────────────┘
```

- Clique para abrir calendário nativo do navegador
- Selecione data
- Formato salvo: `YYYY-MM-DD` (ISO)

### 4️⃣ **Horas Previstas** (Opcional)
```
┌──────────────────────────────┐
│ Horas Previstas              │
│ [______] h                   │  ← Número, min=0
│ Exemplo: 5, 8, 12.5         │
└──────────────────────────────┘
```

- Aceita números inteiros ou decimais (ex: 2.5)
- Mínimo: 0 | Máximo: 1000
- Rejeita negativos (mostra erro em vermelho)

### 5️⃣ **Data Criação** (Auto-preenchida)
```
┌──────────────────────────────┐
│ Data Criação                 │
│ [2026-04-19T17:35:00Z]       │  ← Read-only (não editável)
│ (Auto-preenchida com agora)  │
└──────────────────────────────┘
```

- Campo read-only (desabilitado para edição)
- Preenchido automaticamente com data/hora atual
- Não pode ser modificado

---

## Validação de Entrada

**Campos obrigatórios:**
- ✅ Título obrigatório — não pode estar vazio
- ✅ Descrição, Data e Horas — opcionais

**Validação de valores:**
```
❌ Título vazio          → Erro: "Título é obrigatório"
❌ Horas negativa       → Erro: "Horas deve ser ≥ 0"
❌ Horas muito grande   → Erro: "Máximo 1000 horas"
✅ Título + desc OK     → Pode submeter
✅ Apenas título OK     → Pode submeter
✅ Tudo preenchido OK   → Pode submeter
```

**Visual de erro:**
```
┌──────────────────────────────┐
│ Título *                     │
│ [                        ]   │  ← Campo vira vermelho
│ ❌ Título é obrigatório      │  ← Mensagem de erro
└──────────────────────────────┘
```

---

## Submeter a Tarefa

### Botões do Modal

```
┌─ Modal de Criação de Tarefa ──────────────────┐
│                                               │
│ (campos preenchidos...)                       │
│                                               │
│                    [Cancelar]  [Criar Tarefa] │  ← Botões
└───────────────────────────────────────────────┘
```

**Botão Criar Tarefa:**
- ✅ Se validação OK → salva em GitHub, modal fecha
- ❌ Se validação falha → mostra erro em vermelho
- ⏳ Enquanto salva → botão fica desabilitado com spinner

**Botão Cancelar:**
- Fecha modal sem salvar
- Form é resetado

---

## Depois de Submeter

A tarefa aparece no quadro Kanban:

```
┌─────────────────────┐
│     BACKLOG         │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 📌 Título       │ │  ← Sua tarefa aparece aqui
│ │                 │ │
│ │ ⏰ 5 horas      │ │  ← Horas planejadas (se preenchidas)
│ │ 📅 25/04/2026   │ │  ← Data planejada (se preenchida)
│ └─────────────────┘ │
└─────────────────────┘
```

**Você pode agora:**
- ✅ Mover para outras colunas (drag-drop)
- ✅ Editar detalhes (futuro)
- ✅ Ver rastreamento de tempo
- ✅ Consultar em relatório de horas

---

## Keyboard Shortcuts

| Ação | Tecla |
|------|-------|
| Fechar modal | `ESC` |
| Submeter form | `Enter` (quando campo ativo) |
| Navegar campos | `Tab` |

---

## Troubleshooting

### ❌ Botão "Nova Tarefa" não aparece
- **Causa:** Quadro não carregou ou você não está autenticado
- **Solução:** Recarregue a página (F5)

### ❌ Descrição não renderiza (mostra `**bold**` literal)
- **Causa:** Markdown preview é future work
- **Solução:** Use texto simples por enquanto; será renderizado em próxima versão

### ❌ Horas previstas rejeita número válido
- **Causa:** Número fora do range [0, 1000] ou formato inválido
- **Solução:** Use apenas números (ex: `5`, `8.5`, não `5h` ou `8,5`)

### ❌ Data criação está errada
- **Causa:** Seu navegador pode ter timezone diferente
- **Solução:** Usa data do servidor; é automaticamente convertida

### ❌ Copy button não funciona
- **Causa:** Permissão de clipboard bloqueada pelo navegador
- **Solução:** Permita acesso ao clipboard (browser deve pedir permissão)

### ❌ Modal não fecha após criar
- **Causa:** Erro ao persistir em GitHub (network, GitHub down, etc)
- **Solução:** Verifique internet e PAT; veja console para logs

---

## Exemplos de Uso

### Exemplo 1: Tarefa Simples
```
Título:        "Revisar PR #42"
Descrição:     (vazio)
Data Planejada: (vazio)
Horas:         (vazio)
↓
Tarefa criada com apenas título
```

### Exemplo 2: Tarefa Planejada Completa
```
Título:        "Implementar cache Redis"
Descrição:     "Sistema de cache distribuído para sessões
               Será usado em prod depois de review"
Data Planejada: 25/04/2026
Horas:         8
↓
Tarefa criada com todos os campos
```

### Exemplo 3: Tarefa com Markdown
```
Título:        "Documentar API"
Descrição:     "Criar docs em **OpenAPI 3.0** format
               - POST /tasks
               - GET /tasks/:id
               - DELETE /tasks/:id"
Data Planejada: (vazio)
Horas:         4.5
↓
Descrição aparece escaped (sem renderização HTML ainda)
```

---

## Dicas de Produtividade

1. **Use horas para rastreamento:** Estude consistentemente horas previstas vs. real
2. **Data planejada para sprints:** Marque datas de sprint para filtrar depois
3. **Descrição curta, clara:** Evite paredes de texto; use ponto-e-vírgula
4. **Copy para Slack:** Copie descrição, cole em mensagem de time

---

## Próximas Features (Backlog)

- [ ] Editar tarefa existente
- [ ] Markdown preview em tempo real
- [ ] Assignee (futuro multi-user)
- [ ] Tags/labels
- [ ] Prioridade
- [ ] Dependências entre tarefas

---

**Pronto para usar!** Se encontrar bugs, relate em GitHub Issues. ✅
