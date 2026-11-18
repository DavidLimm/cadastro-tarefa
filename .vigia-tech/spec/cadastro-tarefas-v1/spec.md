# Spec: cadastro-tarefas-v1

## Suposições decididas sem o David (confira)
1. Prazo e prioridade são obrigatórios (o pedido diz "cadastrar com prioridade e prazo").
2. Prazo igual a hoje é válido; "hoje" é a data do servidor, no fuso do sistema.
3. Título: aparado (trim) antes de validar; vazio/só espaços é inválido; máximo 100 caracteres.
4. Tela: quadro com 3 colunas por prioridade (Alta, Média, Baixa) em vez de lista única, inspirado na
   referência. Dentro da coluna, ordenado por prazo mais próximo. Troca barata por lista simples se preferir.
5. Cadastro por botão "Adicionar tarefa" que abre um diálogo (`<dialog>`), como na referência.
6. Tudo em TypeScript (mudança pedida pelo David em 2026-11-18: back deixou de ser Java; ADR 0005).
   Front em TS puro (sem React), ADR 0002. Versões: Node 24 LTS (fim 30/04/2028), TypeScript 6.x, Vite 8,
   Vitest 4.1.x, Fastify 5.x, tsx. Sem JDK, sem Maven.
   Validação à mão numa função compartilhada (`shared/`), sem zod.
7. Sem editar, excluir, concluir, filtrar, buscar, login, banco, deploy, i18n, responsivo mobile.
8. Em dev, duas portas: back 8080 (bind em 127.0.0.1), front 5173 (proxy `/api`). Sem build de produção unificado.
9. Textos da UI em português do Brasil.

## Leitura da referência (ideias/Copy-of-novo-funil-1-tela-menor-1.png)
É a tela de um CRM com funil de vendas em quadro kanban: barra superior escura com navegação, trilho
lateral, cabeçalho com título + contagem, busca/filtros/ordenar, botão roxo de ação primária e colunas
com cartões brancos.
- **Copiar**: fundo cinza-claro com cartões brancos de cantos arredondados e sombra leve; título do
  cartão em negrito e linha secundária em cinza; cabeçalho de coluna em caixa alta com contador;
  cabeçalho da página com título e selo de contagem; botão primário roxo no canto superior direito
  ("Adicionar negócio" -> "Adicionar tarefa"); rolagem horizontal/vertical por coluna.
- **Adaptar**: colunas = prioridade (Alta/Média/Baixa) em vez de etapas de venda; o ícone colorido
  do cartão vira um selo de prioridade (vermelho/âmbar/verde, tons suaves como na imagem); o valor em
  R$ vira o prazo (dd/mm/aaaa).
- **Não copiar (fora do escopo)**: barra de navegação e perfil, trilho lateral, busca, filtros,
  ordenar, menu "...", arrastar e soltar, valores monetários, identificação de empresa.
É referência de estilo, não requisito de pixel.

## Objetivo
Aplicação web local para um único usuário cadastrar tarefas (título, prioridade, prazo) e ver as
tarefas cadastradas. Dados ficam só em memória do servidor (ADR 0003). É um projeto de teste e de
aprendizado: simples de propósito.

## Fora do escopo
Editar, excluir, concluir/status, descrição, busca, filtros, ordenação escolhida pelo usuário,
arrastar e soltar, login/usuários, persistência em disco/banco, hora no prazo, prazo no passado,
mobile/responsivo, internacionalização, deploy/Docker/CI, build de produção unificado.

## Requisitos

### R-01 Cadastrar tarefa (API)
- Dado um JSON válido, quando `POST /api/tarefas`, então 201, corpo com `id`, `titulo` (aparado),
  `prioridade`, `prazo`, `criadaEm`, e header `Location: /api/tarefas/{id}`.
- Dado `titulo` ausente, vazio ou só espaços, então 400 com erro no campo `titulo`.
- Dado `titulo` com 101 caracteres, então 400; com exatamente 100, então 201.
- Dado `prioridade` ausente ou fora de BAIXA/MEDIA/ALTA, então 400 no campo `prioridade`.
- Dado `prazo` ausente, com formato diferente de `YYYY-MM-DD` ou data inexistente (2026-02-30), então 400 no campo `prazo`.
- Dado `prazo` anterior a hoje, então 400 no campo `prazo`; com prazo igual a hoje, então 201.
- Dado vários campos inválidos, então 400 listando todos (`errors: [{campo, mensagem}]`, `application/problem+json`).

### R-02 Listar tarefas (API)
- Dado nenhum cadastro, quando `GET /api/tarefas`, então 200 e `[]`.
- Dadas tarefas cadastradas, então 200 com todas, ordenadas por prazo crescente, depois prioridade
  (ALTA, MEDIA, BAIXA), depois id.
- Dado que o servidor reiniciou, então a lista volta vazia (comportamento aceito).

### R-03 Cadastrar pela tela
- Dado a página aberta, quando clico em "Adicionar tarefa", então abre um diálogo com título,
  prioridade (padrão Média) e prazo (campo de data com `min` = hoje).
- Dado dados válidos, quando salvo, então o diálogo fecha e a tarefa aparece na coluna da prioridade sem recarregar a página.
- Dado dados inválidos (rejeitados no cliente ou pelo servidor), então o diálogo permanece aberto, com a
  mensagem junto do campo e os dados digitados preservados.
- Dado falha de rede/servidor fora do ar, então aparece mensagem "Não foi possível salvar" e nada é perdido.

### R-04 Ver tarefas na tela
- Dado a página aberta, então vejo 3 colunas (Alta, Média, Baixa), cada uma com contador, e cartões com
  título, selo de prioridade e prazo em dd/mm/aaaa; o cabeçalho mostra o total de tarefas.
- Dado coluna sem tarefas, então mostra estado vazio ("Nenhuma tarefa"), sem erro.
- Dado título com HTML (`<b>x</b>`), então é exibido como texto, não interpretado (sem XSS).
- Dado falha ao carregar, então mensagem de erro com botão "Tentar de novo".

### R-05 Qualidade e execução
- Dado checkout limpo com Node 24, quando rodo `npm install` e os comandos do README, então back e front
  sobem e `npm test` e `npm run typecheck` passam.

## Estrutura e comandos
```
cadastro-tarefas/
  package.json   (raiz; npm workspaces: backend, frontend; scripts que delegam)
  tsconfig.base.json  (strict, compartilhado)
  shared/        (código comum, importado por caminho relativo; não é pacote)
    contrato.ts  (tipos Prioridade/NovaTarefa/Tarefa/ErroCampo + validarNovaTarefa(entrada, hoje))
    contrato.test.ts
  backend/       (Fastify 5; src/app.ts criarApp({repositorio, agora}), src/repositorio.ts,
                  src/main.ts; testes *.test.ts com Vitest e app.inject())
  frontend/      (Vite + TS; src/api.ts, src/ui.ts, src/main.ts, src/style.css)
  README.md
```
Um único `npm install` na raiz instala tudo. Comandos (na raiz):
- `npm run dev:back` (tsx watch, 8080) e `npm run dev:front` (Vite, 5173), em dois terminais.
- `npm test` (Vitest nos dois workspaces e em `shared/`), `npm run typecheck` (tsc --noEmit nos dois),
  `npm run build` (só o front).
- Pré-requisito único: Node 24 (`engines` no package.json).

## Tarefas (ordem de execução; cada uma testável sozinha)

- **T-01 (R-05)** Esqueleto da raiz e do backend: `package.json` com workspaces, `tsconfig.base.json`,
  `shared/` vazio, `backend/` com Fastify 5, tsx e Vitest; rota `GET /api/saude` apenas para o teste de
  fumaça (removível). Aceite: `npm install` ok; `npm test` passa com 1 teste via `app.inject()`;
  `npm run dev:back` sobe na 8080; `npm run typecheck` passa.
- **T-02 (R-01)** `shared/contrato.ts`: tipos do contrato e `validarNovaTarefa(entrada, hoje)` pura, que
  aceita `unknown` e devolve `{campo, mensagem}[]` e o objeto normalizado (título aparado). Aceite: testes
  Vitest: título vazio/espaços, 100 ok/101 erro, prioridade inválida/ausente, prazo ausente, formato errado,
  2026-02-30, ontem erro/hoje ok, vários erros de uma vez.
- **T-03 (R-01)** Interface `TarefaRepositorio` e `TarefaRepositorioMemoria` (Map + contador, ids
  sequenciais, ADR 0003). Aceite: testes unitários: salvar atribui id 1,2,3; listar devolve o que foi salvo.
- **T-04 (R-01)** `POST /api/tarefas` em `criarApp({repositorio, agora})` usando `validarNovaTarefa`; 201 +
  `Location`; 400 em `application/problem+json`; corpo não-JSON/ausente também vira 400. Aceite: testes
  `app.inject()` cobrindo cada critério de R-01 com relógio fixo (`agora: () => new Date(2026, 10, 18)`),
  incluindo 100/101 caracteres, hoje/ontem e 2026-02-30; e 50 POSTs simultâneos (`Promise.all`) geram 50
  ids únicos e `GET` devolve 50 tarefas.
- **T-05 (R-02)** `GET /api/tarefas` com ordenação. Aceite: testes `app.inject()`: lista vazia, e ordenação
  prazo -> prioridade -> id com 4+ tarefas embaralhadas.
- **T-06 (R-05)** Esqueleto do frontend (Vite 8, TS 6 strict, Vitest) com proxy `/api` -> 127.0.0.1:8080 e
  página em branco com título; importa algo de `shared/` para provar que a resolução funciona. Aceite:
  `npm run dev:front` abre; `npm run typecheck`, `npm test` e `npm run build` passam na raiz.
- **T-07 (R-03, R-04)** `api.ts`: usa os tipos de `shared/contrato.ts` (sem redeclarar), `listarTarefas()` e
  `criarTarefa()`, tratando 400 (devolve erros por campo) e falha de rede. Aceite: testes Vitest com `fetch`
  simulado para 200, 201, 400 e rede caída.
- **T-08 (R-04)** Renderização do quadro: 3 colunas, contadores, cartões, estado vazio, erro com "Tentar
  de novo", escape de HTML. Aceite: testes Vitest (jsdom) de render: agrupamento por prioridade, formato
  dd/mm/aaaa, título com `<b>` aparece como texto.
- **T-09 (R-03)** Diálogo de cadastro com validação no cliente (`validarNovaTarefa` de `shared/`, as mesmas
  regras do servidor), erros por campo,
  atualização do quadro após salvar. Aceite: testes Vitest: submit válido chama API e atualiza; título
  vazio mostra erro sem chamar API; erro 400 do servidor aparece no campo; falha de rede mantém dados.
- **T-10 (R-03, R-04)** Estilo inspirado na referência (fundo cinza, cartões brancos, selos coloridos,
  botão roxo, cabeçalho com selo de contagem). Aceite: revisão visual manual comparando com a imagem
  (lista de checagem no README); sem teste automatizado.
- **T-11 (R-05)** Fumaça ponta a ponta manual e README (pré-requisito Node 24, comandos da raiz,
  aviso "dados somem ao reiniciar"). Aceite: roteiro manual: cadastrar 3 tarefas em prioridades
  diferentes, ver nas colunas certas; tentar prazo de ontem e título vazio; reiniciar o back e ver o
  quadro vazio.

## Riscos
- Fastify 5: data de fim do v5 ainda "a definir" na política oficial; há relato (fonte de fornecedor, não
  confirmado) de Fastify 6 em alpha. Fixar `^5`; rever quando o v6 sair (ADR 0005).
- Alcance de `shared/` fora das pastas dos workspaces: `tsc` (`include`/`rootDir`), Vite (`server.fs.allow`)
  e Vitest podem reclamar de imports fora do pacote. Resolver em T-01/T-06 (T-06 prova com um import real);
  plano B: copiar `shared/` para dentro de cada workspace via script, com ADR nova.
- tsx vs. TS nativo do Node 24: escolhido tsx (ADR 0005). Se algum dia migrar para o nativo, imports
  precisarão de `.ts` explícito.
- "Hoje" com `toISOString()` erra no fuso do Brasil à noite (UTC): usar getters locais; coberto por teste
  com relógio fixo em T-04.
- Fuso: servidor e navegador em fusos diferentes podem divergir em "hoje" perto da meia-noite; aceito
  (uso local, mesma máquina). O servidor é a fonte de verdade.
- Sem tipagem em runtime no limite HTTP: o corpo chega como `unknown`; `validarNovaTarefa` é quem estreita
  o tipo. Não usar `as NovaTarefa` no handler.
- Node 24 LTS sai de suporte em 30/04/2028; Vite 8 recebe correções só na última minor: atualizar com frequência.

## ADRs
- 0001 Stack backend Java/Spring/Maven: **Substituído por 0005** (histórico)
- 0002 Stack frontend (TypeScript 6, Vite 8, Node 24, sem framework)
- 0003 Persistência em memória (implementação ajustada para Node)
- 0004 API REST/JSON, problem+json, proxy do Vite (ajustado: Fastify, contrato em `shared/`)
- 0005 Backend TypeScript/Node 24 + Fastify 5, `shared/` (substitui 0001)

Tamanho estimado: pequeno (11 tarefas, cerca de 1 a 2 dias de trabalho para quem está aprendendo; um
pouco menos que a versão Java, por ter uma só toolchain).
