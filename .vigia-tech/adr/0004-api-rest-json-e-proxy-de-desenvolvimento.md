# ADR 0004: API REST/JSON, erros em ProblemDetail, proxy do Vite em vez de CORS

Status: Proposto (aguarda spec aprovada)
Data: 2026-11-18

## Contexto
O front (TS) conversa com o back (TS/Node, Fastify; ADR 0005) por HTTP. Dois recursos: criar e listar tarefas.

## Opções consideradas
1. **REST/JSON simples**: `POST /api/tarefas`, `GET /api/tarefas`. Prós: padrão, fácil de testar com
   curl e `app.inject()` do Fastify. Contras: nenhum relevante neste tamanho.
2. **GraphQL**: flexível, mas excessivo para 2 operações.
3. **Formulário HTML tradicional (POST com redirect)**: sem API; contradiz o front em TS.

Sub-decisão, como o navegador enxerga as duas portas:
- A. **Proxy do Vite** (`/api` -> `http://localhost:8080`): o navegador só fala com a origem do Vite, não
  existe CORS. Prós: nada a configurar no back; contra: só vale em dev.
- B. CORS liberado no back (`@fastify/cors`). Prós: funciona sem Vite; contra: mais uma configuração de segurança
  para entender e fácil de abrir demais.

## Decisão
REST/JSON com sub-decisão A. Contrato:
- `POST /api/tarefas` corpo `{ "titulo": string, "prioridade": "BAIXA"|"MEDIA"|"ALTA", "prazo": "YYYY-MM-DD" }`
  -> 201 com `{ id, titulo, prioridade, prazo, criadaEm }` e header `Location`.
- `GET /api/tarefas` -> 200 com array, ordenado por prazo crescente, depois prioridade (ALTA primeiro),
  depois id.
- Erro de validação -> 400 no formato RFC 9457 (`application/problem+json`, montado à mão no handler: `{type, title, status, errors}`)
  com lista de campos inválidos (`errors: [{campo, mensagem}]`).
- Datas em ISO-8601, "hoje" calculado no servidor por um relógio injetável (`agora: () => Date`, para testar
  sem depender do relógio real), com getters locais (não `toISOString`, que é UTC). Fuso: o do sistema
  local; prazo igual a hoje é válido.
- Os tipos do contrato (`NovaTarefa`, `Tarefa`, `Prioridade`, `ErroCampo`) e a validação vivem em
  `shared/contrato.ts`, usados pelo back e pelo front (ADR 0005).
- Nomes em português no contrato e no código de domínio (decisão do projeto para coerência com o pedido);
  termos técnicos do framework ficam em inglês.

## Consequências
- Contrato e validação em um só arquivo compartilhado: mudar um campo quebra o `tsc` onde divergir.
- Sem autenticação (usuário único local): a API não deve ser exposta fora da máquina (bind em localhost).
