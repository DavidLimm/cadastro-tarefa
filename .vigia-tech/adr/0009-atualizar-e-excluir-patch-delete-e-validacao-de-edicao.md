# ADR 0009: Atualizar com PATCH, excluir com DELETE e validação de edição

Status: Aceito (spec da v2 aprovada pelo David em 2026-11-18)
Data: 2026-11-18

## Contexto
A v2 precisa mudar status (mover) e editar título/prioridade/prazo/status, e excluir. Estende o ADR 0004
(REST/JSON, problem+json, proxy do Vite), que continua valendo. A regra "prazo não anterior a hoje" da v1
valia só para cadastro; editar ou mover uma tarefa já vencida não pode ser bloqueado por ela.

## Opções consideradas
1. **`PATCH /api/tarefas/:id` com corpo parcial**. Prós: mover envia só `{status}` (não reescreve os outros
   campos nem precisa conhecer o prazo atual); o diálogo envia os quatro campos. Contras: validador que
   mescla com o estado atual (mais um caso).
2. **`PUT /api/tarefas/:id` com o recurso inteiro**. Prós: semântica simples, um validador. Contras: mover
   por arrastar teria de reenviar tudo (o front pode ter dado velho) e a regra do prazo vencido fica ambígua.
3. **Rotas de ação (`POST /api/tarefas/:id/mover`)**. Contras: RPC em vez de REST; mais rotas.

## Decisão
Opção 1.
- `PATCH /api/tarefas/:id`: corpo é objeto com ao menos um de `titulo`, `prioridade`, `prazo`, `status`
  (campos extras ignorados; objeto sem nenhum campo conhecido -> 400). Cada campo presente passa pela mesma
  validação do cadastro (título aparado, máx. 100 por code point; prioridade e status válidos; prazo
  `YYYY-MM-DD` existente). **Regra do prazo vencido: o prazo só é rejeitado por ser anterior a hoje se for
  diferente do prazo atual da tarefa.** Reenviar o mesmo prazo (inclusive vencido) é aceito; trocar para outra
  data passada é 400 no campo `prazo`; trocar para hoje ou futuro é aceito. 200 com a `Tarefa` completa.
- `DELETE /api/tarefas/:id` -> 204 sem corpo. O front não manda `Content-Type` no DELETE (Fastify rejeita JSON vazio).
- `:id` inexistente ou não numérico (`abc`, `1.5`, `0`) -> 404 `application/problem+json` (mesmo formato do
  `setNotFoundHandler`); id excluído nunca é reutilizado.
- Ordem das checagens no PATCH: 404 (id) antes de 400 (corpo).
- Validador em `shared/contrato.ts`: `validarAtualizacao(entrada, atual: Tarefa, hoje: Date)`; `validarNovaTarefa`
  fica como está.
- Concorrência: `obter` e `atualizar` rodam síncronos no mesmo handler (sem `await` entre eles), logo atômicos
  em Node (ADR 0003).

## Consequências
- Testes novos de rota via `app.inject()` com `PATCH` e `DELETE`; os testes v1 de `PUT`/`DELETE` em
  `/api/tarefas` (coleção) continuam 404.
- Sem controle de versão/ETag: última escrita vence (usuário único, aceito).
- Back reiniciado com a página aberta -> ids velhos dão 404; o front trata (ver spec R-07).
