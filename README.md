# Cadastro de Tarefas

Aplicação local para cadastrar tarefas (título, prioridade e prazo) e acompanhá-las em um **quadro kanban por status**, com quatro colunas: **Idealizado, Fazendo, Concluído e Abandonado**. Você move os cartões entre as colunas arrastando ou por um menu. Front em TypeScript + Vite, back em Node + Fastify.

## Pré-requisito

Node 24 ou mais novo (`node --version`).

## Como rodar

```bash
npm install
```

Depois abra **dois terminais** na pasta do projeto:

```bash
npm run dev:back     # terminal 1: API em http://localhost:8080
npm run dev:front    # terminal 2: tela em http://localhost:5173
```

Abra **http://localhost:5173** no navegador.

> Use sempre `localhost`. Com `http://127.0.0.1:5173` a página **não abre**, porque o Vite escuta em `localhost` (::1).

Para parar, use Ctrl+C em cada terminal. (Para rodar o back em outra porta, por exemplo `PORT=8099 npm run dev:back`; o front continua esperando o back na 8080.)

## Como testar

```bash
npm test             # testes de shared, backend e frontend
npm run typecheck    # confere os tipos do TypeScript
npm run build        # gera o front de produção em frontend/dist
```

Os três terminam sem erro. Os testes automáticos usam um navegador simulado (jsdom): eles **não** provam o arrastar-e-soltar real nem a aparência. Para isso existe o roteiro manual no fim deste arquivo.

## Estrutura de pastas

- `backend/`: API (Fastify) e armazenamento em memória.
- `frontend/`: a tela (Vite + TypeScript, sem framework). Em `frontend/src/estilo.md` está a tabela de contraste das cores.
- `shared/`: código usado pelo front **e** pelo back, para os dois seguirem **a mesma regra**:
  - `contrato.ts`: tipos (`Tarefa`, `Status`...) e validação (o que a tela recusa é o que o servidor recusa);
  - `prazo.ts`: o cálculo da situação do prazo (vencida, vence hoje, perto de vencer, no prazo).

## Regras de negócio

- **Título** obrigatório, até 100 caracteres. **Prioridade**: Alta, Média ou Baixa. **Prazo**: uma data (sem hora).
- **Status** são quatro e fixos: Idealizado, Fazendo, Concluído, Abandonado. Quem muda o status é **você**, manualmente. Toda tarefa nova **nasce em Idealizado** (o `status` enviado na criação é ignorado).
- **Prazo vencido**: o sistema só **sugere** abandonar (botão "Mover para Abandonado" no cartão). Ele **nunca move um cartão sozinho**.
- O prazo vencido só **bloqueia** em dois casos: ao **criar** uma tarefa e ao **trocar o prazo para OUTRA data passada**. Editar só o título (ou mover de coluna) de uma tarefa já vencida funciona normalmente.
- Tarefa **Concluída** ou **Abandonada** nunca conta como atrasada: sem selo de prazo, sem borda de destaque, sem sugestão.
- **Perto de vencer** = faltam de 1 a 3 dias. Hoje é "Vence hoje"; 4 dias ou mais é "No prazo".
- A **prioridade** é um selo no cartão (não é mais uma coluna). A ordem dentro da coluna é por prazo, depois prioridade (Alta primeiro), depois a ordem de criação.

## Cores e destaques

Cada destaque aparece **também em texto e ícone**: a cor nunca é o único sinal.

| O que vê | Significa |
|---|---|
| Selo preenchido vinho com seta para cima, "Alta" | prioridade Alta |
| Selo "Média" (amarelo) / "Baixa" (azul-claro) | prioridade Média / Baixa |
| Selo vermelho claro com alerta, "Atrasada 3d", borda esquerda vermelha sólida e fundo rosado | prazo vencido (em Idealizado ou Fazendo) |
| Selo laranja "Vence hoje", borda laranja | o prazo é hoje |
| Selo amarelo-escuro com relógio, "Vence em 2d", borda dourada | faltam 1 a 3 dias |
| Selo verde "No prazo" | prazo a mais de 3 dias |
| Borda esquerda **dupla** vinho | prioridade Alta sem outra urgência |

**Alta x Atrasada**: as duas são "vermelhas", mas Alta é vinho/magenta com borda dupla e selo preenchido; Atrasada é vermelho puro com borda sólida, fundo rosado e o texto "Atrasada Nd". Quando uma tarefa tem mais de uma urgência, a borda segue a mais urgente: vencida, depois vence hoje, perto de vencer, Alta.

**Contraste (WCAG AA)**: texto tem no mínimo 4,5:1 e bordas, ícones e anel de foco no mínimo 3:1. Cada par de cores é medido por fórmula e guardado por um teste (`frontend/src/contraste.test.ts`); a tabela com as razões está em [`frontend/src/estilo.md`](frontend/src/estilo.md). Mudou uma cor? Rode `npm test` e atualize a tabela.

## Como usar

- **Adicionar**: botão "Adicionar tarefa". A tarefa cai em Idealizado.
- **Editar**: clique no título do cartão. Abre "Editar tarefa" (título, prioridade, prazo e status). Salvar sem mudar nada só fecha.
- **Excluir**: dentro de "Editar tarefa", botão "Excluir tarefa" e depois confirmação ("Cancelar" ou "Sim, excluir"). Não dá para desfazer.
- **Mover por arrastar**: arraste o cartão para outra coluna (que fica com borda tracejada) e solte.
- **Mover pelo teclado (ou sem arrastar)**: botão "Mover para…" no cartão. Tab até ele, Enter ou Espaço abre, Tab percorre as opções, Enter escolhe, Esc fecha. A coluna atual não aparece como opção.
- **Atalho**: em tarefa vencida (Idealizado/Fazendo) aparece "Mover para Abandonado".

## API

Servidor em `http://localhost:8080`. Os exemplos abaixo foram executados de verdade (aqui com o back na porta 8099; só a porta muda).

`POST /api/tarefas` cria (sempre em `IDEALIZADO`):

```bash
curl -i -X POST http://localhost:8080/api/tarefas -H "Content-Type: application/json" \
  -d '{"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31"}'
```

```
HTTP/1.1 201 Created
location: /api/tarefas/1
content-type: application/json; charset=utf-8

{"id":1,"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31","status":"IDEALIZADO"}
```

`GET /api/tarefas` lista (ordem: prazo, prioridade, id):

```bash
curl http://localhost:8080/api/tarefas
```

```
[{"id":1,"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31","status":"IDEALIZADO"}]
```

`PATCH /api/tarefas/:id` altera um ou mais campos (`titulo`, `prioridade`, `prazo`, `status`):

```bash
curl -i -X PATCH http://localhost:8080/api/tarefas/1 -H "Content-Type: application/json" \
  -d '{"status":"FAZENDO"}'
```

```
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8

{"id":1,"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31","status":"FAZENDO"}
```

Dados inválidos devolvem `400` no formato `application/problem+json`:

```bash
curl -i -X PATCH http://localhost:8080/api/tarefas/1 -H "Content-Type: application/json" \
  -d '{"status":"FEITO"}'
```

```
HTTP/1.1 400 Bad Request
content-type: application/problem+json; charset=utf-8

{"type":"about:blank","title":"Dados inválidos","status":400,"errors":[{"campo":"status","mensagem":"Escolha o status: IDEALIZADO, FAZENDO, CONCLUIDO ou ABANDONADO."}]}
```

`DELETE /api/tarefas/:id` exclui. **Não envie `Content-Type: application/json` no DELETE** (sem corpo, o servidor responderia 400):

```bash
curl -i -X DELETE http://localhost:8080/api/tarefas/1
```

```
HTTP/1.1 204 No Content
```

Excluir de novo (ou um id que não existe) dá `404`:

```
HTTP/1.1 404 Not Found
content-type: application/problem+json; charset=utf-8

{"type":"about:blank","title":"Tarefa não encontrada","status":404,"errors":[]}
```

Criar com dados inválidos também dá `400` com um erro por campo (título vazio, prioridade desconhecida, prazo passado). Existe ainda `GET /api/saude`, que responde `{"status":"ok"}`, para ver se o servidor está de pé.

## Limitações conhecidas

- Os dados ficam **só em memória**: somem quando o back reinicia (ADR 0003).
- Sem login: é um usuário local. Sem busca, filtro nem reordenar cartões à mão.
- **Arrastar não funciona por toque** (celular/tablet): use o menu "Mover para…".
- Testado só no Edge/Chromium. Leitor de tela **não** foi testado (há textos e `aria-*` pensados para ele, sem verificação real).
- O "hoje" da tela é o relógio do **navegador**; o do servidor só vale ao criar e editar. Com a página aberta na virada do dia, os selos ficam antigos até a próxima ação (mover, editar, F5).

## Segurança conhecida

Na v1 o `npm audit` apontava 5 vulnerabilidades altas, só em dependências de desenvolvimento/teste (cadeia picomatch -> fdir, tinyglobby, vite e vitest), e 0 em produção. Ao escrever este README (18/11/2026), `npm audit` e `npm audit --omit=dev` mostraram **0 vulnerabilidades** nas duas formas. O resultado depende do banco de avisos da hora, então pode mudar; rode `npm audit` de vez em quando. Nada foi forçado (`npm audit fix`) neste projeto.

## Onde estão a spec e as decisões

Em `.vigia-tech/`:
- `spec/kanban-status-v2/`: requisitos e tarefas desta versão (a v1 está em `spec/cadastro-tarefas-v1/`).
- `adr/`: decisões. **0006 a 0010 são da v2** (status e contrato; situação do prazo, destaques e cores; mover por arrastar e menu; PATCH/DELETE e validação; edição e exclusão no mesmo diálogo). 0001 a 0005 são da v1; o 0001 (back em Java) foi **substituído** pelo 0005 (back em Node + Fastify).

## Roteiro de verificação manual

Com back e front rodando (dois terminais), abra http://localhost:5173. **Reinicie o back antes de começar** para o quadro estar vazio. Marque cada item ao conferir. Os testes automáticos não substituem este roteiro: arrastar e aparência só se veem no navegador.

**Quadro e criação**

1. Quadro vazio: quatro colunas (Idealizado, Fazendo, Concluído, Abandonado), cada uma com "Nenhuma tarefa" e contador 0; no topo aparece "Nenhuma tarefa cadastrada ainda." e o total 0.
2. Clique em "Adicionar tarefa": abre o diálogo com Prioridade em Média e **sem** campo Status.
3. Salve com tudo vazio: aparecem o erro do título e o do prazo, junto de cada campo; o foco vai ao primeiro campo com erro; nada é cadastrado.
4. Título com 101 caracteres: erro de limite de 100.
5. Prazo de ontem: erro de prazo anterior a hoje.
6. Prazo de hoje, título e prioridade válidos: o diálogo fecha, a tarefa aparece em **Idealizado** com selo "Vence hoje" e borda laranja, o contador sobe e o foco vai a um lugar visível.
7. Ordem por prazo: crie mais tarefas em Idealizado com prazos diferentes: ficam do prazo mais próximo para o mais distante (no mesmo dia, Alta primeiro).
8. Crie uma Alta com prazo daqui a 2 dias (selo "Vence em 2d") e uma Baixa com prazo longe (selo "No prazo", sem borda colorida).

**Editar e excluir**

9. Clique no título de um cartão: abre "Editar tarefa" com tudo preenchido e o foco no título. Mude o título e salve: o cartão atualiza.
10. Editar sem mudar nada: abra, clique em Salvar: fecha sem erro e nada muda.
11. Excluir: abra um cartão, "Excluir tarefa". Aparece a confirmação com o foco em "Cancelar". "Cancelar" volta ao formulário sem excluir; repita e aperte Esc: também volta sem excluir. Por fim "Sim, excluir": o cartão some, o contador desce e o foco vai a "Adicionar tarefa".

**Mover**

12. Mover pelo menu **só com teclado** (sem mouse): Tab até "Mover para…" de um cartão, Enter abre (o botão anuncia "expandido"); Tab/Enter em "Fazendo". O cartão vai para Fazendo, o foco vai ao título dele e uma mensagem "«título» movido para Fazendo." é anunciada. Abra de novo e aperte Esc: fecha e o foco volta ao botão. A coluna atual não aparece como opção.
13. Com o menu de um cartão aberto, clique no "Mover para…" de **outro** cartão mais abaixo: o primeiro fecha e o segundo abre, num só clique.
14. Mover por arrastar: arraste um cartão para outra coluna: a coluna ganha borda tracejada durante o arrasto, e ao soltar o cartão passa para ela.
15. Soltar na **mesma coluna** (ou fora de qualquer coluna): nada acontece, o cartão fica onde estava.

**Tarefa vencida e abandono**

16. Não há como criar tarefa vencida (a criação recusa prazo passado) e o sistema não tem relógio de teste: o "hoje" da tela é o relógio do navegador, que usa o do computador. O jeito que existe de verdade: crie uma tarefa com **prazo de hoje**, **sem reiniciar o back** (a memória some), mude a **data do computador** para amanhã ou depois (Windows: Configurações > Hora e idioma > Data e hora, desligue "Definir a hora automaticamente") e dê F5. Ou simplesmente espere a data passar. Depois, volte a data para automático.
17. Com a tarefa vencida em Idealizado ou Fazendo: selo "Atrasada 1d", borda vermelha sólida, fundo rosado e botão "Mover para Abandonado". O cartão **não** muda de coluna sozinho.
18. Edite só o título dessa tarefa vencida: salva sem erro de prazo. Troque o prazo para outra data passada: erro no campo prazo.
19. Clique em "Mover para Abandonado": o cartão vai para Abandonado, sem selo de prazo, sem borda e sem o botão. Mova uma vencida para Concluído: também sem selo de atraso.
20. Alta x Vencido: tenha lado a lado uma Alta sem atraso (borda dupla vinho, selo preenchido com seta) e uma vencida (borda sólida vermelha, fundo rosado, texto "Atrasada"). Dá para distinguir sem depender só da cor?

**Falhas e recarga**

21. Back caído: pare o back (Ctrl+C no terminal 1) e recarregue a página: aparece erro com "Tentar de novo". Suba o back e clique: o quadro volta. Com o back parado e a página já aberta, tente mover um cartão: aparece mensagem de erro e o cartão fica na coluna de antes.
22. Reiniciar o back com a página aberta: com alguns cartões na tela, reinicie o back (os dados somem) e tente mover um cartão antigo: aparece "Esta tarefa não existe mais." e o quadro é recarregado (vazio).
23. F5 com o back no ar: as tarefas continuam (estão na memória do servidor).

**Aparência e acessibilidade**

24. 375px de largura (DevTools, modo dispositivo): o quadro rola na horizontal, os textos não se sobrepõem e nada fica cortado.
25. Foco visível: só com Tab, percorra título, "Mover para…", opções, "Adicionar tarefa" e o diálogo: sempre há um anel azul visível.
26. Só teclado do começo ao fim: abrir um cartão, editar, mover pelo menu, abandonar pelo atalho e excluir, sem usar o mouse.
27. Visual: compare com as imagens em `ideias/`: fundo cinza-claro, cartões brancos arredondados, cabeçalho de coluna em caixa alta com contagem, botão principal roxo. A aba tem ícone, sem erro 404 de favicon.
28. Proxy: o proxy do Vite **não tem teste automático**. Abra http://localhost:5173/api/tarefas: deve mostrar JSON. Se mostrar HTML, o proxy quebrou.
