# FlowBoard

Este repositório contém a aplicação **FlowBoard** (`apps/flowboard`) — kanban pessoal com registro de tempo — além de artefatos auxiliares (por exemplo specs e ADRs em `.memory-bank/`). A persistência é feita **diretamente na API do GitHub** (arquivos JSON no repositório que você escolher).

## FlowBoard em um minuto

- **Front-end:** React + Vite (`apps/flowboard`).
- **Dados:** pasta `flowboard/` no repositório GitHub indicado por você (sem backend próprio do produto no MVP).
- **“Login” no MVP:** não há botão “Entrar com GitHub” (OAuth). A conexão é feita informando a **URL do repositório** e um **Personal Access Token (PAT)** com permissão de leitura/escrita no conteúdo desse repositório.

Detalhes técnicos e matriz de requisitos: [apps/flowboard/README.md](apps/flowboard/README.md).

## Como rodar o FlowBoard localmente

```bash
cd apps/flowboard
npm install
npm run dev
```

Abra o endereço que o Vite exibir (em geral `http://localhost:5173`).

Outros comandos úteis: `npm test`, `npm run build`, `npm run preview`.

## Conectar ao GitHub (obrigatório: ter um repositório)

O FlowBoard precisa de um **repositório GitHub** onde criará/atualizará os JSONs. Sem esse “projeto” (repo) e um token válido, não há onde persistir os quadros.

### 1. Criar o repositório no GitHub

1. Em [GitHub](https://github.com), crie um repositório **novo** (pode ser privado).
2. Anote a URL HTTPS, por exemplo: `https://github.com/sua-org/flowboard-dados`.

Não é necessário commitar nada antes: o app pode inicializar a estrutura ao conectar.

### 2. Criar um Personal Access Token

O token autentica o app na [GitHub REST API](https://docs.github.com/en/rest) no seu nome, apenas para o repositório configurado.

**Opção A — Fine-grained PAT (recomendado quando possível)**  
Crie um token com acesso ao repositório de dados e permissões de **Contents: Read and write** (e o mínimo além disso).

**Opção B — Classic PAT**  
Para repositórios privados, costuma ser necessário o escopo **`repo`**.

Guia oficial: [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

### 3. Entrar no FlowBoard

1. Na tela **Entrar**, cole a **URL do repositório**.
2. Cole o **PAT** (ex.: prefixo `ghp_` em tokens classic).
3. Clique em **Conectar**.

O app valida o acesso à API, prepara os dados iniciais se precisar e guarda a sessão no **`sessionStorage`** do navegador (não grava o token nos arquivos JSON do repositório).

### Segurança (resumo)

- Trate o PAT como **segredo**: não commite em código, não compartilhe em issues/prints.
- Use o **menor escopo** que ainda permita ler/escrever o conteúdo do repo de dados.
- Revogue tokens que não usar mais.

## OAuth App do GitHub

Registrar um **GitHub OAuth App** (client id, redirect URI, etc.) **não é necessário** para o MVP atual: o fluxo é **repositório + PAT**. OAuth foi deixado como evolução futura de UX (ver ADR em `.memory-bank/adrs/001-flowboard-spa-github-persistence.md`).

## Estrutura útil do repositório

| Caminho | Conteúdo |
|--------|-----------|
| `apps/flowboard/` | SPA FlowBoard |
| `.memory-bank/` | Specs, ADRs e estado do épico |
| `.cursor/skills/` | Agent skills para o Cursor |

## Licença

O código-fonte do FlowBoard neste repositório está sob a [licença MIT](LICENSE).
