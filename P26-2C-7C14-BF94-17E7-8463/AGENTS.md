# Documentação de Engenharia de Agentes e Harness (P26-2C-7C14-BF94-17E7-8463)

## 1. Harness utilizado
- **Harness:** opencode (terminal) para o desenvolvimento.
- **Modelo(s):** [o modelo que o opencode e o Copilot mostram nas configurações]
- **Como foi usado:** um agente por tarefa, com prompts que mandam ler as skills pelo caminho em skills/.

## 2. Agentes
### Agente 1: Backend (Functions, D1 e sessão)
- **Skills:** skills/serverless-d1-discord, skills/cloudflare
- **O que fez:** migração 0002_kanban.sql, rotas /api/cards, validação no servidor e sessão assinada com HMAC (functions/api/_lib/session.js).

### Agente 2: Interface (HTML, CSS e Vanilla JS)
- **Skills:** skills/vanilla-dom-ui, skills/frontend-design
- **O que fez:** quadro com três colunas, cabeçalho com perfil do Discord e rodapé com a chave.

### Agente 3: Kanban (Drag and Drop e integração com a API)
- **Skills:** skills/kanban-drag-drop
- **O que fez:** arrastar e soltar nativo e chamadas PATCH ao servidor.

### Agente 4: Testes e validação (não edita arquivos)
- **Skills:** skills/teste-validacao
- **O que fez:** auditoria de segurança e relatório [resumir o resultado].

## 3. Testes executados
[testes reais e resultados: login, POST 201, GET 200, coluna inválida 400, id inexistente 404, cookie adulterado 401, sem login 401, arrastar persistindo]

## 4. Origem das skills de terceiros
- frontend-design: github.com/anthropics/skills [licença do LICENSE.txt da pasta]
- cloudflare: github.com/cloudflare/skills [licença do arquivo da pasta]