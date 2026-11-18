<!-- mapa@1aeafd3 — 2026-11-18 -->
# MAPA — cadastro-tarefas
App local: cadastrar tarefas (título, prioridade, prazo) e ver em quadro de 3 colunas (Alta/Média/Baixa). Sem login, sem banco.

## Stack e versões
- Node >=24, npm workspaces (`backend`, `frontend`; `shared/` NÃO é workspace, não tem package.json).
- TypeScript ^6 (strict, noUncheckedIndexedAccess, `tsconfig.base.json`), Vitest ~4.1.
- Backend: Fastify ^5, tsx (dev), ESM (`"type":"module"`), módulo NodeNext.
- Frontend: Vite ^8, TS puro sem framework, jsdom ^31 nos testes de DOM, module Bundler.

## Como rodar e testar (raiz)
- `npm install`
- `npm run dev:back` -> API em http://localhost:8080 (env `PORT`; escuta em 127.0.0.1)
- `npm run dev:front` -> http://localhost:5173 (strictPort)
- `npm test` = `vitest run --root shared` + testes dos workspaces
- `npm run typecheck` (backend e frontend) | `npm run build` (front: tsc + vite build -> frontend/dist)

## Estrutura
```
shared/contrato.ts        tipos (Prioridade, NovaTarefa, Tarefa, ErroCampo, ResultadoValidacao), TITULO_MAX=100, validarNovaTarefa(entrada, hoje)
shared/contrato.test.ts   testes da validação
shared/vitest.config.mts  fixa process.env.TZ='America/Sao_Paulo' (testes de data)
backend/src/main.ts       sobe criarApp() em 127.0.0.1:PORT(8080)
backend/src/app.ts        criarApp({repositorio?, agora?}): rotas, ordenação, handlers de erro
backend/src/repositorio.ts interface TarefaRepositorio {salvar, listar} + TarefaRepositorioMemoria (Map + ultimoId)
backend/src/*.test.ts     app (inject do Fastify) e repositório
frontend/index.html       página, contém #app
frontend/vite.config.ts   porta 5173, fs.allow '..', proxy /api -> http://127.0.0.1:8080
frontend/src/main.ts      entrada: importa estilo.css, título, chama iniciar(raiz, document, {criarTarefa, listarTarefas})
frontend/src/app.ts       iniciar(): liga quadro + diálogo + API (carregar/desenhar); deps injetadas
frontend/src/api.ts       listarTarefas/criarTarefa via fetch('/api/...'); valida resposta; ErroApi: validacao|rede|servidor
frontend/src/quadro.ts    renderizarQuadro(raiz, estado, acoes), EstadoQuadro (carregando|pronto|erro), formatarPrazo, pedirFoco
frontend/src/dialogo.ts   criarDialogo(doc, {criarTarefa, aoSalvo, hoje?}): <dialog> com formulário e erros por campo
frontend/src/inicio.ts    TITULO_PAGINA, prioridadesDaTela() (ALTA, MEDIA, BAIXA)
frontend/src/estilo.css   estilos (referência visual em ideias/*.png)
frontend/src/*.test.ts    um teste por módulo; app/dialogo/quadro usam `// @vitest-environment jsdom`
.vigia-tech/              spec/cadastro-tarefas-v1, adr/0001..0005, STATUS.md, licoes.md
```

## Pontos de entrada
- Back: `backend/src/main.ts`. Rotas em `app.ts`: `POST /api/tarefas` (201 + Location), `GET /api/tarefas` (ordenada), `GET /api/saude` (fumaça, removível).
- Front: `frontend/index.html` -> `src/main.ts`.

## Fluxo principal (criar tarefa)
1. Botão "Adicionar tarefa" abre o diálogo (`dialogo.ts`), que roda `validarNovaTarefa` (shared) no cliente.
2. Válido -> `api.criarTarefa` faz POST `/api/tarefas` (relativo).
3. Vite (dev) repassa `/api` ao Fastify em 127.0.0.1:8080 (sem CORS).
4. `app.ts` chama `validarNovaTarefa(body, agora())` (mesma regra). Inválido -> 400 `application/problem+json` `{type,title,status,errors:[{campo,mensagem}]}`.
5. Válido -> `repositorio.salvar` -> 201 com a Tarefa.
6. `aoSalvo` fecha o diálogo, pede foco ao botão e `carregar()` -> GET `/api/tarefas` (prazo asc, prioridade ALTA primeiro, id) -> `renderizarQuadro`.
Erros de rede/servidor viram estado `erro` com botão "Tentar de novo".

## Contratos-chave (shared/contrato.ts)
`Prioridade = 'BAIXA'|'MEDIA'|'ALTA'`; `NovaTarefa {titulo, prioridade, prazo 'YYYY-MM-DD'}`; `Tarefa = NovaTarefa + id:number`.
Regras: título obrigatório (trim) <=100 chars (por code point); prioridade válida; prazo existente, formato AAAA-MM-DD, não anterior a hoje (hoje vale).
Back e front importam por caminho relativo `../../shared/contrato.js` (tsconfigs incluem `../shared`).

## Convenções observadas
- Imports relativos com sufixo `.js` (NodeNext/ESM), inclusive para .ts.
- Relógio injetável: `agora` no `criarApp`, `hoje` no `criarDialogo`; `validarNovaTarefa` recebe `hoje: Date`.
- Datas como texto `YYYY-MM-DD` comparado lexicograficamente; sem `Date` na ordenação/exibição (Date só para "hoje" local e existência da data; getters locais, nunca toISOString).
- DOM: dado do usuário só via `textContent` (nunca innerHTML em código de produção).
- Sem `as` de asserção: usa type guards (`ehTarefa`, `ehErroCampo`...). Exceção vista: `{} as Record<Campo,...>` em dialogo.ts:52-53; `as const` em PRIORIDADES.
- Dependências por injeção (repositório, deps da API, relógio) para teste.
- Nomes de domínio em português; erros ao usuário em pt-BR.

## Testes
- Vitest; arquivos `*.test.ts` ao lado do código. Shared roda com `--root shared` (TZ fixo no config).
- Só uma parte: `npx vitest run --root shared`, ou `npm test -w backend` / `-w frontend`.
- Proxy do Vite NÃO tem teste automatizado (verificação manual no README, item 13).

## Atenção
- Acessar por `http://localhost:5173`, não 127.0.0.1 (Vite escuta em localhost/::1; a página não abre).
- `npm audit`: 5 vulnerabilidades altas só em devDependencies (vite/vitest/picomatch); produção 0. Risco aceito.
- Dados só em memória; somem ao reiniciar o back (ADR 0003).
- `/api/saude` é rota de fumaça removível.
- ADR 0001 (Java/Spring) está Substituído pelo 0005 (TS/Fastify); 0002/0003/0004 aceitos. 0001 e trechos do 0004 ("ProblemDetail" no título) usam vocabulário Java.
- `shared/.gitkeep` ainda existe, sem necessidade.

## Pontos de extensão
- Banco: implementar `TarefaRepositorio` e passar em `criarApp({repositorio})`; hoje só `TarefaRepositorioMemoria`.
- Editar/excluir/concluir: não existem (README "Limitações"). Exigem: novos métodos no repositório, rotas em `app.ts`, funções em `api.ts`, ações em `quadro.ts` (`AcoesQuadro`), e campo no contrato.
- Produção: não há servidor estático para `frontend/dist` nem proxy fora do Vite dev (não confirmado se previsto).
