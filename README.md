# Cadastro de Tarefas

Aplicação local para cadastrar tarefas (título, prioridade e prazo) e vê-las em um quadro com três colunas: Alta, Média e Baixa. Front em TypeScript + Vite, back em Node + Fastify.

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

Para parar, use Ctrl+C em cada terminal.

## Como testar

```bash
npm test             # testes de shared, backend e frontend
npm run typecheck    # confere os tipos do TypeScript
npm run build        # gera o front de produção em frontend/dist
```

## Estrutura de pastas

- `backend/`: API (Fastify) e armazenamento em memória.
- `frontend/`: a tela (Vite + TypeScript, sem framework).
- `shared/`: o contrato (tipos e validação das tarefas). Existe para que front e back usem **a mesma regra**: o que a tela recusa é o que o servidor recusa.

## Regras de negócio

- Título obrigatório, até 100 caracteres.
- Prioridade: Alta, Média ou Baixa.
- Prazo: uma data que não seja passada. Hoje vale.

## API

`POST /api/tarefas` cria uma tarefa:

```bash
curl -i -X POST http://localhost:8080/api/tarefas -H "Content-Type: application/json" \
  -d '{"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31"}'
```

```
HTTP/1.1 201 Created
location: /api/tarefas/1
content-type: application/json; charset=utf-8

{"id":1,"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31"}
```

`GET /api/tarefas` lista as tarefas (já ordenadas: prioridade e depois prazo):

```bash
curl http://localhost:8080/api/tarefas
```

```
[{"id":1,"titulo":"Pagar conta","prioridade":"ALTA","prazo":"2999-12-31"}]
```

Dados inválidos devolvem `400` no formato `application/problem+json`:

```bash
curl -i -X POST http://localhost:8080/api/tarefas -H "Content-Type: application/json" \
  -d '{"titulo":"","prioridade":"URGENTE","prazo":"2000-01-01"}'
```

```
HTTP/1.1 400 Bad Request
content-type: application/problem+json; charset=utf-8

{"type":"about:blank","title":"Dados inválidos","status":400,"errors":[{"campo":"titulo","mensagem":"Informe o título."},{"campo":"prioridade","mensagem":"Escolha a prioridade: BAIXA, MEDIA ou ALTA."},{"campo":"prazo","mensagem":"O prazo não pode ser anterior a hoje."}]}
```

Existe também `GET /api/saude` (responde `{"status":"ok"}`), uma rota de teste de fumaça para ver se o servidor está de pé.

## Limitações conhecidas

- Os dados ficam **só em memória**: somem quando o servidor reinicia (decisão do ADR 0003).
- Não há editar, excluir, concluir tarefa nem login. É um usuário local.

## Segurança conhecida

O `npm audit` aponta 5 vulnerabilidades altas, todas só em dependências de desenvolvimento/teste (via picomatch/vitest). Em produção são 0. Risco aceito por enquanto; rever depois.

## Onde estão a spec e as decisões

Em `.vigia-tech/`: `spec/cadastro-tarefas-v1/` (requisitos e tarefas), `adr/` (decisões de arquitetura) e `STATUS.md`.

## Roteiro de verificação manual

Com back e front rodando, abra http://localhost:5173 e siga a lista. Reinicie o back antes de começar para o quadro estar vazio.

1. Quadro vazio: aparece "Nenhuma tarefa cadastrada ainda." e o contador do título mostra 0.
2. Clique em "Adicionar tarefa": abre o diálogo com Prioridade já em Média.
3. Salve com tudo vazio: aparece o erro do título e do prazo, o foco vai para o primeiro campo com erro e nada é cadastrado.
4. Digite um título com 101 caracteres: erro de limite de 100.
5. Escolha um prazo de ontem: erro de prazo anterior a hoje.
6. Cadastro válido (título, prioridade, prazo de hoje): o diálogo fecha, a tarefa aparece na coluna certa, o contador sobe e o foco volta ao botão "Adicionar tarefa". Prazo de hoje deve ser aceito.
7. Ordem: cadastre mais tarefas na mesma coluna com prazos diferentes: ficam do prazo mais próximo para o mais distante.
8. Esc: abra o diálogo, digite algo e aperte Esc: fecha sem cadastrar; ao abrir de novo o formulário está limpo.
9. Teclado: só com Tab, Enter e Esc consegue abrir, preencher, salvar e fechar? O foco é sempre visível?
10. Back caído: pare o back (Ctrl+C no terminal 1) e recarregue a página: aparece mensagem de erro com "Tentar de novo". Suba o back de novo e clique no botão: o quadro volta.
11. F5: com o back no ar, recarregue: as tarefas continuam (estão na memória do servidor). Se reiniciar o back, somem (esperado).
12. Visual (T-10): compare com as imagens em `ideias/`: aparência próxima da referência (colunas, cartões, cores de prioridade, botão principal). Veja também a aba do navegador: tem ícone roxo, sem erro 404 de favicon.
13. Proxy: o proxy do Vite **não tem teste automatizado**. Abra http://localhost:5173/api/tarefas: deve mostrar JSON. Se mostrar HTML, o proxy quebrou.
