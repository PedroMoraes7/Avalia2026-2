# Documentação de Engenharia de Agentes e Harness (P26-2C-7C14-BF94-17E7-8463)

## 1. Harness utilizado
- **Harness:** opencode (terminal) para o desenvolvimento.
- **Modelo(s):** opencode/big-pickle (OpenCode Zen, modelo gratuito)
- **Como foi usado:** um agente por tarefa, com prompts que mandam ler as skills pelo caminho em skills/.

## 2. Agentes
### Agente 1: Backend (Functions, D1 e sessão)
- **Skills:** skills/serverless-d1-discord, skills/cloudflare
- **O que fez:** migração 0002_kanban.sql, rotas /api/cards, validação no servidor e sessão assinada com HMAC (functions/api/_lib/session.js).

### Agente 2: Interface (HTML, CSS e Vanilla JS)
- **Skills:** skills/vanilla-dom-ui, skills/frontend-design
- **O que fez:** quadro com três colunas, cabeçalho com perfil do Discord e rodapé com a chave.

### Agente 3: Kanban (Drag and Drop e integração com a API)
- **Skills:** skills/vanilla-dom-ui
- **O que fez:** arrastar e soltar nativo e chamadas PATCH ao servidor.

### Agente 4: Testes e validação (não edita arquivos)
- **Skills:** skills/teste-validacao
- **O que fez:** auditoria de segurança e relatório: 9/9 no `validar-local.mjs`, 81/81 na suíte de correções, 68/70 na suíte de regressão (as 2 falhas são asserções obsoletas que confirmam a correção de `/api/status`), XSS aprovado e logout validado no navegador.

## 3. Testes executados e resultados

### 3.1 Testes manuais no site publicado

Executados por mim no console do navegador, no endereço principal do projeto:

| Teste | Resultado esperado | Resultado obtido |
|---|---|---|
| Login com Discord | Nome e avatar no cabeçalho | Ok |
| `POST /api/cards` logado | 201 | Ok |
| `GET /api/cards` logado | 200 com a lista | Ok |
| Coluna inválida | 400 | Ok |
| Excluir id inexistente | 404 | Ok |
| Cookie `discord_session` alterado | 401 | Ok |
| `GET /api/cards` sem login (janela anônima) | 401 | Ok |
| Criar, editar, apagar e arrastar cartões, recarregando a página | Dados persistem no D1 | Ok |

### 3.2 Auditoria do agente de testes (primeira rodada)

O agente de testes e validação auditou o projeto sem editar nenhum arquivo. Resultado: `validar-local.mjs` com 9 de 9 itens ok e 68 de 70 verificações da suíte antiga da API. As 2 falhas são asserções obsoletas que esperavam o comportamento vulnerável antigo de `/api/status`; o resultado atual (401 sem sessão e nenhum registro de terceiros) confirma a correção. Passaram o isolamento por usuário, a sessão assinada, a validação no servidor, o SQL parametrizado, a proteção contra XSS e a ausência de frameworks e segredos no código.

A auditoria encontrou um problema grave no endpoint `/api/status`, herdado do template: ele aceitava gravações sem login e expunha registros de outros usuários. Foi corrigido para exigir sessão e filtrar por usuário. Também foi criada a rota `POST /api/auth/logout` e o botão "Sair". A segunda rodada confirmou as correções: a suíte de correções passou 81/81, a suíte antiga ficou 68/70 apenas pelas 2 asserções obsoletas de `/api/status`, o teste de XSS passou e o logout foi validado no navegador (27/28, sendo a única falha o log do 500 simulado pelo próprio teste). O deploy publicado também já responde com o fallback 404, o logout e o botão "Sair".

## 4. Origem das skills de terceiros
- frontend-design: github.com/anthropics/skills
- cloudflare: github.com/cloudflare/skills