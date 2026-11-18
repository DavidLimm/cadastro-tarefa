<!-- mapa@bec2600 — 2026-11-18 — branch vigia/kanban-status-v2 -->
# MAPA — cadastro-tarefas (v2)
App local: cadastrar, editar, excluir e mover tarefas (título, prioridade, prazo, status) em um kanban de 4 colunas por status (Idealizado, Fazendo, Concluído, Abandonado). Sem login, sem banco (memória).

## Stack e versões
- Node >=24, npm workspaces (`backend`, `frontend`; `shared/` NÃO é workspace, sem package.json).
- TypeScript ^6 (strict, noUncheckedIndexedAccess, `tsconfig.base.json`), Vitest ~4.1.
- Backend: Fastify ^5, tsx (dev), ESM, NodeNext. Frontend: Vite ^8, TS puro, jsdom ^31 nos testes de DOM, Bundler.

## Como rodar e testar (raiz)
- `npm install`
- `npm run dev:back` -> API em 127.0.0.1:8080 (env `PORT`) | `npm run dev:front` -> http://localhost:5173 (strictPort)
- `npm test` = `vitest run --root shared` + workspaces | `npm run typecheck` | `npm run build` (front: tsc + vite build -> frontend/dist)
- Só uma parte: `npx vitest run --root shared`, `npm test -w backend`, `npm test -w frontend` (ou `npx vitest run src/quadro.test.ts` dentro do workspace).

## Estrutura (1 linha por arquivo relevante)
```
shared/contrato.ts       PRIORIDADES, STATUS, tipos (NovaTarefa, EdicaoTarefa, Tarefa, ErroCampo, Resultado*), TITULO_MAX, validarNovaTarefa, validarAtualizacao
shared/prazo.ts          diasEntre, diaLocal, situacaoDoPrazo -> SituacaoPrazo, LIMITE_PERTO_PADRAO=3 (puro, texto YYYY-MM-DD)
shared/*.test.ts         contrato e prazo (unidade); vitest.config.mts fixa TZ=America/Sao_Paulo
backend/src/main.ts      sobe criarApp() em 127.0.0.1:PORT(8080)
backend/src/app.ts       criarApp({repositorio?, agora?}): rotas, ordenação, erros problem+json, hook onRequest exigirTarefa
backend/src/repositorio.ts  interface TarefaRepositorio {salvar, listar, obter, atualizar, excluir} + TarefaRepositorioMemoria (Map, ids nunca reaproveitados)
backend/src/*.test.ts    app (fastify inject) e repositório
frontend/index.html      página com #app
frontend/vite.config.ts  porta 5173, fs.allow '..', proxy /api -> http://127.0.0.1:8080
frontend/src/main.ts     entrada: estilo.css, título, iniciar(raiz, document, {listar,criar,atualizar,excluir})
frontend/src/app.ts      iniciar(): estado, carregar(silencioso?), aoMover (único caminho de mover), aoEditar, depoisDeAlterar; avisos role=alert e anúncio role=status fora do quadro
frontend/src/api.ts      listar/criar/atualizar/excluirTarefa via fetch('/api/...'); valida resposta; ErroApi validacao|rede|servidor + NaoEncontrada (só PATCH/DELETE)
frontend/src/quadro.ts   renderizarQuadro(raiz, estado, acoes): 4 colunas, DnD nativo (data-alvo-arrasto, data-arrastando), preserva rolagem, pedirFoco, formatarPrazo
frontend/src/cartao.ts   descreverCartao(tarefa, hoje) puro (selos, urgência, sugestão de abandono), criarMenuMover, foco por mouse
frontend/src/dialogo.ts  criarDialogo(doc, deps): <dialog> modos criar/editar, confirmação inline de exclusão, erros por campo; aoSalvo/aoAlterado
frontend/src/icones.ts   SVGs inline (criarIcone, NOMES_ICONES)
frontend/src/inicio.ts   TITULO_PAGINA, ROTULOS_STATUS, statusDaTela()
frontend/src/estilo.css  variáveis de cor no :root, [hidden] global, estilos do kanban; estilo.md documenta decisões visuais
frontend/src/contraste.pares.ts  pares fundo/texto + helpers WCAG (lerVariaveis, luminancia, razao)
frontend/src/*.test.ts   unidade: api, cartao, icones, inicio | DOM jsdom: quadro, dialogo, dialogo-edicao, app, app.mover, app.edicao | CSS: estilo.test, contraste.test
.vigia-tech/             spec/{cadastro-tarefas-v1,kanban-status-v2}, adr/0001..0010, STATUS.md, licoes.md
ideias/                  imagens de referência visual
```

## Contratos-chave e onde vivem
- `shared/contrato.ts`: `Status = IDEALIZADO|FAZENDO|CONCLUIDO|ABANDONADO` (ordem de `STATUS` = ordem das colunas); `NovaTarefa {titulo, prioridade, prazo}`; `EdicaoTarefa = NovaTarefa + status`; `Tarefa = EdicaoTarefa + id`; `ErroCampo.campo: keyof EdicaoTarefa`.
- `shared/prazo.ts`: `situacaoDoPrazo(tarefa, hoje:'YYYY-MM-DD', limite=3)` -> `VENCIDO{dias}|VENCE_HOJE|PERTO{dias}|NO_PRAZO|ENCERRADA`.
- Back e front importam por caminho relativo `../../shared/*.js` (tsconfigs incluem `../shared`).

## Regras de negócio (1 linha cada)
- Status é manual (qualquer coluna -> qualquer outra); tarefa nova nasce IDEALIZADO.
- O sistema só SUGERE abandono (cartão vencido, atalho "Mover para Abandonado"); nunca muda status sozinho.
- Prazo vencido só bloqueia na criação e na edição para OUTRA data passada; manter o prazo antigo (já vencido) é permitido.
- CONCLUIDO/ABANDONADO nunca são atrasadas (`ENCERRADA`).
- "Perto" = faltam 1..3 dias (`LIMITE_PERTO_PADRAO = 3`); hoje = VENCE_HOJE.
- Título obrigatório (trim), <=100 code points; prioridade BAIXA|MEDIA|ALTA; prazo AAAA-MM-DD existente.
- Ordem na coluna: a da API (prazo asc, prioridade ALTA primeiro, id), filtrada por status. Sem reordenação manual.

## API (Fastify, problem+json RFC 9457 nos erros)
- `POST /api/tarefas` -> 201 + Location + Tarefa | 400 (erros por campo).
- `GET /api/tarefas` -> 200 lista ordenada.
- `PATCH /api/tarefas/:id` (parcial: titulo/prioridade/prazo/status; >=1 campo) -> 200 Tarefa | 400 | 404. Id só `/^[1-9]\d*$/`.
- `DELETE /api/tarefas/:id` -> 204 | 404. Sem corpo e SEM Content-Type (Fastify dá 400 com JSON vazio).
- 404 sai no hook `onRequest` (`exigirTarefa`) ANTES de ler/validar o corpo (404 antes de 400, ADR 0009).
- Corpo quebrado/vazio/tipo errado -> 400 em pt-BR; `removeContentTypeParser('text/plain')`. `GET /api/saude` é rota de fumaça removível; rota desconhecida -> 404.

## Fluxo de dados
1. Criar: botão "Adicionar tarefa" -> `dialogo.ts` valida (`validarNovaTarefa`) -> `api.criarTarefa` POST `/api/tarefas` -> proxy Vite (dev) -> Fastify -> `validarNovaTarefa(body, agora())` -> `repositorio.salvar` -> 201 -> `aoSalvo` (foco no botão) -> `carregar()` -> GET -> `renderizarQuadro`.
2. Editar/excluir: clique no título do cartão -> `aoEditar` -> `dialogo.abrirEditar` -> `atualizarTarefa` (PATCH, só campos mudados) ou `excluirTarefa` (DELETE, confirmação inline) -> `aoAlterado({editada|excluida|naoEncontrada})` -> `depoisDeAlterar` (foco, aviso) -> `carregar(true)` sem "Carregando…".
3. Mover (menu "Mover para…", atalho Abandonar, arrastar e soltar): todos chamam `acoes.aoMover(id, status)` -> `app.aoMover` (trava por id via `movendo`) -> `atualizarTarefa(id,{status})` PATCH -> `validarAtualizacao` -> `repositorio.atualizar` -> `carregar(true)` + anúncio role=status. 404 -> aviso "não existe mais" e recarrega.
4. Erros de rede/servidor na lista -> estado `erro` com "Tentar de novo"; em mover -> aviso role=alert.
5. Cartão: `descreverCartao(tarefa, hoje)` usa `situacaoDoPrazo`; `hoje` vem do relógio do NAVEGADOR (`diaLocal(new Date())`), não do servidor.

## Convenções observadas
- Imports relativos com sufixo `.js` (NodeNext/ESM), inclusive para .ts.
- Relógio injetável (`agora` no `criarApp`, `hoje` no dialogo/quadro); dependências por injeção (repositório, deps da API) para teste.
- Datas como texto `YYYY-MM-DD`, sem Date/UTC na conta de dias (`diasEntre` por calendário); `Date` só para "hoje" local e existência da data, getters locais, nunca toISOString.
- DOM: dado do usuário só via `textContent` (nunca innerHTML).
- Sem `as` de asserção; usa type guards. Casts vistos: `ev as DragEvent` em quadro.ts:88 e `as [number, number]` em contraste.pares.ts:95 (os `{} as Record` do dialogo.ts não existem mais).
- `[hidden]` global no CSS (atributo hidden sempre vence display de classes).
- Contraste AA testado: variáveis do `:root` + `PARES` medidos por fórmula WCAG; novas cores entram em `contraste.pares.ts`.
- Teste de CSS: `estilo.test.ts` injeta o `estilo.css` real num `<style>` no jsdom.
- Teste de data do shared com TZ fixo (`shared/vitest.config.mts`). Nomes de domínio e mensagens em pt-BR.
- Decisões: ADR 0006 status; 0007 situação do prazo/cores; 0008 mover (DnD + menu); 0009 PATCH/DELETE e validação; 0010 edição/exclusão no mesmo diálogo. 0001 Substituído pelo 0005; 0002–0010 aceitos.

## Testes
- Vitest, `*.test.ts` ao lado do código; jsdom via `// @vitest-environment jsdom` nos de DOM.
- Back: `app.test.ts` usa `inject` (sem porta). Front: `app.*.test.ts` com API simulada.
- Proxy do Vite NÃO tem teste automatizado (roteiro manual no README).
- jsdom não aplica CSS de layout nem prova arrastar e soltar de verdade; DnD e visual só no navegador (roteiro manual do README).

## Atenção
- Acessar por `http://localhost:5173`, não 127.0.0.1 (Vite escuta em localhost/::1).
- Watcher `tsx watch`: para encerrar o back, matar a RAIZ da árvore de processos (matar só o filho deixa o watcher religar).
- Arrastar não funciona por toque; no celular/tablet usa-se o menu "Mover para…".
- Dados só em memória; somem ao reiniciar o back (ADR 0003).
- Relógio da tela é o do navegador; o do servidor (`agora`) só valida prazo. Para ver "vencidas" altere a data do computador/navegador (README).
- `npm audit`: 0 vulnerabilidades em 2026-11-18; depende do banco de avisos da hora (README).
- `/api/saude` removível; `shared/.gitkeep` resíduo; título do ADR 0004 diz "ProblemDetail" (vocabulário Java).
- Sem servidor estático para `frontend/dist` nem proxy fora do Vite dev (previsão não confirmada).

## Pontos de extensão
- Banco: implementar `TarefaRepositorio` (5 métodos) e passar em `criarApp({repositorio})`.
- Reordenação manual: exigiria campo de posição no contrato, PATCH/rota próprios e tratar a ordem em `app.ts` (`compararTarefas`) e `quadro.ts`.
- Filtros: aplicar em `renderizarQuadro` (hoje só `filter` por status) ou query em GET.
- Status configuráveis: hoje fixos em `STATUS` (contrato) + `ROTULOS_STATUS` (inicio.ts) + colunas/CSS; mudar exige tocar os 3 e a validação.
- `limite` de "perto" já é parâmetro de `situacaoDoPrazo`; falta só uma configuração.
