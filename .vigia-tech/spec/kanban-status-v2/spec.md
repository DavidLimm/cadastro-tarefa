# Spec: kanban-status-v2

Parte da v1 (`../cadastro-tarefas-v1/spec.md`). O que não é mencionado aqui continua como na v1.

## Suposições decididas sem o David (confira)
1. Colunas fixas, nesta ordem: Idealizado, Fazendo, Concluído, Abandonado. Status é manual.
2. A regra "prazo não anterior a hoje" vale ao **criar**. Ao **editar/mover**, o prazo só é rejeitado por ser
   passado se for **diferente do prazo atual**: reenviar o mesmo prazo vencido é aceito; trocar por outra data
   passada, não (ADR 0009). Mover uma tarefa vencida nunca é bloqueado.
3. A borda de destaque segue: vencido > vence hoje > perto de vencer (1 a 3 dias) > prioridade Alta > nenhuma.
   (Você citou "vencido > vence hoje > Alta"; "perto de vencer" entra no meio porque você também pediu destaque nele.)
4. Cartões em Concluído e Abandonado não têm borda de destaque nem selo de prazo (só a data): ali nada é "atrasado".
   O selo de prioridade continua.
5. "Vence em 1d/2d/3d", "Vence hoje", "Atrasada Nd", "No prazo". Prazo igual a hoje não é atraso.
6. O atraso é calculado no navegador pela data local (texto `YYYY-MM-DD`); o servidor não envia "atrasada".
   Página aberta pela virada do dia mostra os selos antigos até a próxima ação.
7. Menu "Mover para…" no cartão é um botão que abre uma lista de botões (um por coluna de destino), não um
   `<select>` (no Chrome/Windows as setas mudariam o valor sem querer). O atalho "Mover para Abandonado" é
   um botão visível no cartão vencido que ainda esteja em Idealizado/Fazendo.
8. Clicar no título (um botão) ou em área vazia do cartão abre o diálogo de edição. Excluir pede confirmação
   dentro do próprio diálogo (sem `window.confirm`).
9. Mover/editar/excluir recarregam a lista do servidor (sem tela "Carregando…" piscando) e mantêm a rolagem das colunas.
10. Se o back reiniciar com a página aberta, mover/editar um cartão antigo dá "esta tarefa não existe mais" e a
    lista é recarregada; excluir um id já inexistente conta como sucesso.
11. Arrastar só em desktop (mobile segue fora do escopo); no toque, o menu é o caminho.
12. Ícones SVG inline escritos por nós; cores em ADR 0007 são ponto de partida, valendo o que passar em AA.

## Leitura da referência (ideias/Copy-of-novo-funil-1-tela-menor-1.png)
Kanban de CRM: colunas lado a lado com título e contagem, rolagem por coluna, cartão branco com título em
negrito, selo quadrado colorido com ícone à direita (verde+calendário, amarelo+alerta, vermelho+alerta),
barra de topo com busca/filtros/ordenar e botão primário.
- **Copiar**: colunas por etapa (agora por status), contagem por coluna, selo de prazo cor+ícone (+ texto, que a
  imagem não tem, para não depender de cor), cartão branco com sombra leve, rolagem horizontal quando não couber.
- **Adaptar**: etapas = 4 status; "valor" = prioridade (selo) e data; borda esquerda grossa para o destaque.
- **Não copiar**: busca, filtros, ordenar, valor em R$, barra de navegação. A imagem é estática: não mostra arrastar.

## Objetivo
Transformar o quadro da v1 (3 colunas por prioridade) em um kanban por status (Idealizado, Fazendo, Concluído,
Abandonado) em que o usuário abre uma tarefa para editar título, prioridade, prazo e status, move cartões por
arrastar e soltar ou por um menu acessível, exclui com confirmação, e enxerga de relance o que é prioridade Alta
e o que está vencido ou perto de vencer (cor + ícone + texto). O sistema só sugere "Abandonar" quando vence;
nunca move cartão sozinho. Dados continuam em memória (ADR 0003, vigente).

## Fora do escopo
Busca, filtros, ordenação escolhida, reordenar cartões dentro da coluna, colunas configuráveis, status
automático por prazo, desfazer/lixeira, persistência em disco/banco, login, hora no prazo, mobile/toque no
arrastar, biblioteca de DnD ou de ícones, build/deploy de produção, teste automatizado em navegador real
(Playwright/Cypress), notificações, virada de dia automática.

## Requisitos

### R-01 Status no contrato e na criação
- Dado `POST /api/tarefas` válido (sem `status`), quando criado, então 201 e corpo `{id,titulo,prioridade,prazo,status:'IDEALIZADO'}`.
- Dado `POST` com `status:'CONCLUIDO'` no corpo, então 201 e `status` continua `IDEALIZADO` (ignorado).
- Dado `GET /api/tarefas`, então cada item traz `status`; a ordem global continua prazo, prioridade (ALTA primeiro), id.
- Dado o front, quando a resposta tem tarefa sem `status` válido, então é tratada como resposta inesperada do servidor.

### R-02 Situação do prazo (regra pura, `shared/prazo.ts`)
Dado `hoje='2026-11-18'` e status IDEALIZADO ou FAZENDO:
- prazo `2026-11-15` -> `VENCIDO` dias 3; `2026-11-17` -> `VENCIDO` dias 1.
- prazo `2026-11-18` -> `VENCE_HOJE`.
- prazo `2026-11-19`, `-20`, `-21` -> `PERTO` com dias 1, 2, 3.
- prazo `2026-11-22` -> `NO_PRAZO`.
- Dado status CONCLUIDO ou ABANDONADO, qualquer prazo (inclusive vencido) -> `ENCERRADA`.
- Dados virada de mês, de ano e 29/02 (`hoje='2028-03-01'`, prazo `2028-02-28` -> VENCIDO 2), então a conta de
  dias está certa; sem uso de `Date`/UTC na função; testes rodam em `TZ=America/Sao_Paulo` e incluem datas de
  mudança de horário de verão históricas (ex.: `2018-11-03`/`2018-11-04`) para provar que não há deriva de 23/25 h.
- Dado `limite` diferente de 3 (parâmetro), então o corte do `PERTO` muda.
- Dado relógio injetado, então o resultado é determinístico (a função recebe `hoje` como texto).

### R-03 Editar tarefa (API, `PATCH /api/tarefas/:id`)
- Dado id existente e corpo `{status:'FAZENDO'}`, quando PATCH, então 200 com a tarefa completa e demais campos intactos.
- Dado corpo com título/prioridade/prazo/status válidos, então 200 com tudo atualizado e título aparado.
- Dado título vazio ou com 101 caracteres, prioridade ou status inválidos, prazo mal formatado/inexistente, então
  400 `application/problem+json` com `errors` por campo (incluindo `campo:'status'`), e a tarefa não muda.
- Dado tarefa com prazo vencido e corpo `{status:'ABANDONADO'}` (ou `{prazo:<o mesmo vencido>}`), então 200.
- Dado prazo vencido diferente do atual, então 400 no campo `prazo`; prazo hoje ou futuro, então 200.
- Dado corpo `{}` (ou só campos desconhecidos), então 400. Dado corpo não JSON, então 400 (como no POST).
- Dado id inexistente, não numérico (`abc`, `1.5`, `0`), então 404 `application/problem+json` (e 404 vem antes de 400).
- Dado PATCH, então a posição na ordem do `GET` reflete o novo prazo/prioridade.

### R-04 Excluir tarefa (API, `DELETE /api/tarefas/:id`)
- Dado id existente, quando DELETE, então 204 sem corpo e o `GET` não a lista mais.
- Dado id inexistente ou já excluído, então 404 problem+json.
- Dado exclusão seguida de POST, então o novo id é maior que todos os já usados (id não reaproveitado).
- Dado `PUT`/`DELETE` em `/api/tarefas` (coleção), então continua 404 como na v1.

### R-05 Quadro por status (tela)
- Dada a página aberta, então 4 colunas na ordem Idealizado, Fazendo, Concluído, Abandonado, cada uma com título
  e contador (número visual `aria-hidden` + texto para leitor de tela); o cabeçalho mostra o total.
- Dadas tarefas, então cada cartão está na coluna do seu `status`, na ordem recebida (prazo, prioridade, id).
- Dada coluna vazia, então "Nenhuma tarefa" e contador 0; sem tarefas, "Nenhuma tarefa cadastrada ainda."
- Dado título com HTML, então texto puro (sem XSS). Falha ao carregar: mensagem + "Tentar de novo" (como v1).
- Dado quadro mais largo que a tela, então rolagem horizontal; cada coluna rola na vertical.

### R-06 Selos, cores e destaque
- Dado cartão, então mostra selo de prioridade (ícone + "Alta"/"Média"/"Baixa") e a linha "Prazo: dd/mm/aaaa".
- Dado IDEALIZADO/FAZENDO, então mostra selo de prazo com ícone + texto: "Atrasada 3d", "Vence hoje", "Vence em 2d", "No prazo".
- Dado cartão vencido em IDEALIZADO/FAZENDO, então destaque vermelho (borda esquerda grossa + selo) e botão
  "Mover para Abandonado"; o cartão **não** muda de coluna sozinho.
- Dado o mesmo cartão vencido em CONCLUIDO, então sem selo de prazo, sem borda de destaque, sem botão de sugestão.
- Dado cartão Alta e perto de vencer (ou vencido), então dois selos e a borda segue o mais urgente (ADR 0007).
- Dado cartão sem urgência e prioridade Alta, em IDEALIZADO/FAZENDO, então borda de Alta; Média/Baixa sem borda colorida.
- Dado qualquer selo/borda, então a informação também está em texto (cor nunca é o único sinal); ícones `aria-hidden`.
- Dado `hoje` injetado no quadro, então os selos são determinísticos em teste.

### R-07 Mover cartão
- Dado cartão, quando uso o botão "Mover para…" e escolho "Fazendo", então `PATCH {status}` e o cartão aparece na
  coluna Fazendo, sem recarregar a página nem piscar "Carregando…".
- Dado o menu aberto, então Tab/Enter/Espaço o operam; Esc fecha e devolve o foco ao botão "Mover para…"; o
  botão tem `aria-expanded`; a coluna atual não é opção.
- Dado cartão arrastado e solto sobre outra coluna, então o mesmo `PATCH` e o mesmo resultado; solto na mesma
  coluna ou fora de coluna, nada acontece (nenhuma chamada).
- Dado arrasto sobre uma coluna, então ela mostra borda tracejada (e só durante o arrasto).
- Dado movimento concluído, então o foco vai ao botão-título do cartão na nova coluna e uma região `role="status"`
  anuncia "«título» movido para Fazendo."
- Dado falha de rede/servidor ao mover, então mensagem de erro visível (`role="alert"`) e o cartão fica na coluna antiga.
- Dado 404 (tarefa sumiu), então mensagem "Esta tarefa não existe mais." e a lista é recarregada.

### R-08 Editar e excluir pela tela
- Dado clique no título (ou no cartão), então abre o diálogo "Editar tarefa" com título, prioridade, prazo e
  status preenchidos; o foco vai ao título.
- Dado dados válidos e "Salvar", então o diálogo fecha, o cartão aparece (possivelmente em outra coluna/posição)
  e o foco vai ao cartão. Sem alteração: fecha sem chamar a API.
- Dado dado inválido (cliente ou servidor), então erro junto do campo, diálogo aberto, dados preservados (como v1).
- Dado tarefa já vencida, quando edito só o título, então salva sem erro de prazo; ao trocar o prazo para uma
  data passada diferente, erro no campo prazo.
- Dado "Excluir tarefa", então aparece a confirmação com "Cancelar" (foco inicial) e "Sim, excluir"; Esc/Cancelar
  volta ao formulário sem excluir; "Sim, excluir" chama DELETE, fecha, atualiza o quadro e leva o foco a "Adicionar tarefa".
- Dado "Adicionar tarefa", então o diálogo de criação é o da v1 (sem campo status; nasce em Idealizado).
- Dado Esc ou Cancelar, então fecha e descarta alterações; o foco volta ao cartão de origem.

### R-09 Qualidade, acessibilidade e execução
- Dado checkout limpo (Node 24), `npm install`, `npm test`, `npm run typecheck`, `npm run build` passam.
- Dado texto de selo/botão, então contraste mínimo 4,5:1 (texto) e 3:1 (borda/ícone) contra o fundo, verificado
  e registrado no README (tabela das cores com a razão medida).
- Dado só teclado, então é possível abrir um cartão, editar, mover (menu), abandonar (atalho) e excluir.
- README atualizado (limitações da v1 removidas; roteiro manual da v2, incluindo DnD em navegador real).

## Estrutura e arquivos afetados
```
shared/contrato.ts        + STATUS, Status, EdicaoTarefa, Tarefa.status, ErroCampo.campo = keyof EdicaoTarefa, validarAtualizacao
shared/contrato.test.ts   + casos de validarAtualizacao
shared/prazo.ts           NOVO situacaoDoPrazo(tarefa, hoje: string, limite=3), diasEntre, diaLocal(Date)
shared/prazo.test.ts      NOVO (TZ America/Sao_Paulo vem do vitest.config.mts)
backend/src/repositorio.ts  + obter, atualizar, excluir; salvar cria com status IDEALIZADO
backend/src/app.ts        + PATCH/DELETE /api/tarefas/:id (404 problem+json)
backend/src/*.test.ts     ajustes e novos testes
frontend/src/api.ts       ehTarefa checa status; + atualizarTarefa, excluirTarefa; ErroApi ganha 'naoEncontrada'
frontend/src/inicio.ts    + rótulos e ordem das colunas por status
frontend/src/icones.ts    NOVO ícones SVG inline (createElementNS)
frontend/src/cartao.ts    NOVO selos, borda, botão-título, menu Mover para, atalho, DnD do cartão (função pura descreverCartao + DOM)
frontend/src/quadro.ts    colunas por status, drop zones, região de anúncio, preserva rolagem
frontend/src/dialogo.ts   modos criar/editar, campo status, excluir com confirmação
frontend/src/app.ts       liga aoMover/aoEditar/aoExcluir, foco, erros
frontend/src/estilo.css   colunas, selos, bordas, menu, confirmação, estado de arrasto
README.md                 limitações, roteiro manual, tabela de contraste
```
Sem novas dependências. Comandos de build/teste/execução iguais aos da v1.

## Tarefas (ordem de execução; cada uma testável sozinha)

- **T-01 (R-01, R-03)** Contrato: `STATUS`, `Status`, `Tarefa.status`, `EdicaoTarefa`, `ErroCampo.campo` e
  `validarAtualizacao(entrada, atual, hoje)` (parcial, mescla, regra do prazo vencido, `{}` inválido). Aceite:
  testes em `shared/contrato.test.ts`: só status, todos os campos, título 100/101, status inválido, prazo vencido
  igual ao atual ok, vencido diferente erro, hoje ok, `{}` erro; testes da v1 de `validarNovaTarefa` intactos.
- **T-02 (R-02)** `shared/prazo.ts` com `diasEntre` por aritmética de calendário sobre texto, `diaLocal` e
  `situacaoDoPrazo`. Aceite: testes de R-02 completos (inclui virada de mês/ano, 29/02, 2018-11-03/04, ENCERRADA, limite).
- **T-03 (R-01, R-03, R-04)** Repositório: `salvar` cria com `IDEALIZADO`; `obter(id)`, `atualizar(id, mudanças)`
  devolve cópia ou `undefined`, `excluir(id)` devolve boolean; ids não reaproveitados. Aceite: testes unitários
  (cópias isoladas, excluir e criar de novo, atualizar inexistente).
- **T-04 (R-03)** `PATCH /api/tarefas/:id`. Aceite: testes `app.inject()` de todos os critérios de R-03 com relógio
  fixo, incluindo 404 antes de 400, id `abc`/`1.5`/`0`, e tarefa vencida movida para ABANDONADO.
- **T-05 (R-04)** `DELETE /api/tarefas/:id`. Aceite: testes de R-04 (204 sem corpo, 404, id não reaproveitado, coleção
  ainda 404).
- **T-06 (R-01, R-03, R-04)** `api.ts`: `ehTarefa` exige status; `atualizarTarefa(id, parcial)` e `excluirTarefa(id)`;
  404 -> `tipo:'naoEncontrada'`; DELETE sem `Content-Type`. Aceite: testes com `fetch` simulado: 200, 400, 404, 204, rede
  caída, resposta sem status.
- **T-07 (R-06)** `descreverCartao(tarefa, hoje)` pura em `cartao.ts`: devolve selos (ícone, texto, tom) e
  urgência da borda; `icones.ts`. Aceite: testes sem DOM: tabela status x prazo x prioridade (todas as combinações
  relevantes, ex.: Alta+vencido, Alta+3d, Alta em CONCLUIDO, Média vencida em FAZENDO).
- **T-08 (R-05, R-06)** Quadro por status: 4 colunas, contadores, cartões com selos/borda/linha de prazo/botão
  "Mover para Abandonado" quando sugerido, botão-título, `hoje` injetável, ordem preservada. Aceite: testes jsdom
  (ver "o que muda" abaixo), XSS, vazio, erro, foco.
- **T-09 (R-08)** Diálogo editar/excluir: `abrirEditar(tarefa)`, campo status, confirmação inline, `min` do prazo
  condicional, salvar só o alterado, foco. Aceite: testes jsdom: preenche, edita só título de tarefa vencida,
  prazo passado novo -> erro, 400/404/rede, excluir com Cancelar/Esc/Sim, foco inicial no Cancelar.
- **T-10 (R-07)** Mover pelo menu e pelo atalho: disclosure "Mover para…" (aria-expanded, Esc), `aoMover(id,status)`,
  `app.ts` (PATCH, recarga silenciosa, anúncio `role="status"`, foco no cartão, erro `role="alert"`, 404). Aceite:
  testes jsdom: menu via teclado/click, coluna atual ausente, foco devolvido, falha mantém posição, 404 recarrega.
- **T-11 (R-07)** Arrastar e soltar nativo: `draggable`, `dragstart/dragover/drop/dragend/dragleave`, id em
  variável do módulo + `dataTransfer`, realce da coluna. Aceite: testes jsdom com eventos sintéticos (ver Riscos):
  drop em outra coluna chama `aoMover` uma vez; mesma coluna/fora não chama; realce liga/desliga. Mais roteiro manual.
- **T-12 (R-06, R-09)** `estilo.css`: colunas, cartão, borda por urgência, selos, menu, confirmação, realce de arrasto,
  foco visível, rolagem. Aceite: revisão visual vs. referência (lista no README) e tabela de contraste medida
  (AA) no README; ajustar cores até passar.
- **T-13 (R-09)** README e roteiro manual: criar 4 tarefas (Alta vencida, Alta daqui a 2 dias, Média hoje, Baixa
  no prazo); ver destaques; sugerir abandono; mover por menu e por arrasto (Chrome e Firefox); editar tarefa
  vencida; excluir com Cancelar e com confirmação; reiniciar o back e mover cartão antigo (404 amigável); só teclado.
  Aceite: roteiro executado e marcado; `npm test`, `typecheck`, `build` verdes.

## Testes da v1 que mudam de significado
- `frontend/src/quadro.test.ts`: "3 colunas ... Alta, Média, Baixa", "agrupa na coluna da prioridade" (usa
  `data-prioridade`), "mantém a ordem", "cartão mostra selo de prioridade e prazo": passam a 4 colunas por status
  (`data-status`); prioridade vira selo, não coluna. Fixtures precisam de `status`. Contadores, XSS, vazio,
  erro e foco continuam valendo.
- `frontend/src/inicio.test.ts`: `prioridadesDaTela()` deixa de dirigir colunas (manter se o diálogo usar; remover
  se ficar sem uso); passa a testar a ordem dos status.
- `frontend/src/api.test.ts`: fixtures de `Tarefa` sem `status` passam a ser rejeitadas (`ehTarefa`): ajustar
  fixtures; `criarTarefa` e `listarTarefas` continuam iguais fora isso.
- `frontend/src/app.test.ts` e `dialogo.test.ts`: dependências novas (`atualizarTarefa`, `excluirTarefa`); o
  diálogo de criação continua igual. `app.test.ts` tem fixtures sem `status`.
- `backend/src/app.test.ts`: "cria tarefa válida ... corpo" (agora inclui `status:'IDEALIZADO'`); "campos extras
  são ignorados" (agora inclui `status` enviado ignorado); ordenação do GET continua válida, mas o significado
  passa a ser "ordem dentro de cada coluna". `PUT`/`DELETE` em `/api/tarefas` continuam 404.
- `backend/src/repositorio.test.ts`: `salvar` devolve também `status:'IDEALIZADO'`.
- `shared/contrato.test.ts`: `validarNovaTarefa` inalterado.

## Riscos
- **Arrastar em jsdom**: jsdom não implementa `DragEvent`/`DataTransfer`. Cobertura: (1) a lógica fica em funções
  pequenas e `aoMover` é o único ponto de saída; (2) testes disparam `new Event('dragstart'|'dragover'|'drop',
  {bubbles:true, cancelable:true})` com `dataTransfer` falso (`Object.defineProperty(ev,'dataTransfer',
  {value:{setData(){},getData(){return id},effectAllowed:''}})`) e conferem `aoMover`, `preventDefault` no
  `dragover` e a classe de realce; (3) o id arrastado também vive em variável do módulo, então os testes não
  dependem do `getData`; (4) roteiro manual em Chrome e Firefox na T-13. O que jsdom não prova: o cursor,
  a imagem fantasma e o comportamento real do navegador. Playwright foi deixado fora do escopo.
- **Acessibilidade**: DnD nativo não serve teclado/leitor/toque; o menu "Mover para…" cobre (ADR 0008). Riscos:
  foco perdido após redesenhar (mitigado com `pedirFoco`/`data-foco="cartao-<id>"`), cartão clicável vs. botão
  (usar `<button>` no título), região `role="status"` precisa existir antes do texto mudar (criar uma vez no `raiz`,
  fora do redesenho).
- **Contraste AA das cores novas**: pares do ADR 0007 são estimativas; medir (ferramenta de contraste do
  navegador) e registrar. Alta (vermelho) e vencido (vermelho) são parecidos: distinguir por texto/ícone e
  espessura; se ficar confuso, mudar a cor de Alta (David decide).
- **Fuso/virada de dia**: aritmética de dias sobre texto evita `Date`/UTC; servidor e navegador podem discordar
  de "hoje" perto da meia-noite (aceito, uso local).
- **Back reiniciado com a página aberta**: ids velhos -> 404 tratado (R-07). Dados somem (ADR 0003, aceito).
- **Fastify e DELETE com `Content-Type: application/json` e corpo vazio dá 400**: o front não envia o header; teste na T-05/T-06.
- **Redesenho total** perde rolagem e foco: preservar `scrollTop` por coluna e usar `data-foco`; custo aceitável para o tamanho.
- Tamanho do `quadro.ts`/`dialogo.ts`: por isso `cartao.ts` e `icones.ts` separados; sem framework (ADR 0002).

## ADRs
- 0003 Persistência em memória: **continua vigente** (não substituído).
- 0004 API REST/JSON: continua; estendido pelo 0009.
- 0006 Status manual da tarefa e contrato
- 0007 Situação do prazo (função pura), destaques e cores
- 0008 Mover cartão: arrastar nativo + menu em disclosure
- 0009 PATCH/DELETE e validação de edição (prazo vencido)
- 0010 Edição e exclusão no mesmo diálogo, confirmação inline

Tamanho estimado: pequeno-médio. 13 tarefas, cerca de 3 a 4 dias para quem está aprendendo (o grosso: T-08 a T-12).
