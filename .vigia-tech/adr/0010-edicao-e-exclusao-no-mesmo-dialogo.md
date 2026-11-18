# ADR 0010: Edição e exclusão no mesmo diálogo, com confirmação inline

Status: Aceito (spec da v2 aprovada pelo David em 2026-11-18)
Data: 2026-11-18

## Contexto
David quer editar título, prioridade, prazo e status no mesmo diálogo, que abre ao clicar no cartão, e
excluir com confirmação. O diálogo da v1 (`<dialog>` + `showModal`, foco e erros por campo) já existe.

## Opções consideradas
1. **Reaproveitar `criarDialogo` com dois modos (criar/editar); confirmação de exclusão dentro do mesmo
   diálogo.** Prós: um só componente, validação e erros por campo já prontos, testável em jsdom, texto e estilo
   nossos. Contras: o módulo cresce (~80 linhas).
2. **Dois diálogos (criar e editar)**. Contras: duplica formulário e testes.
3. **`window.confirm` para excluir**. Prós: 1 linha. Contras: não estilizável, pouco acessível, difícil de
   testar, quebra o padrão visual.

## Decisão
Opção 1.
- Modo criar: título, prioridade, prazo (sem campo status: nasce Idealizado; `min` = hoje, como na v1).
- Modo editar (`abrirEditar(tarefa)`): título, prioridade, prazo, **status**, e botão "Excluir tarefa". O
  `<input type=date>` NÃO leva `min` quando o prazo atual já passou (para não invalidar o valor), e leva `min` = hoje
  caso contrário. A validação do cliente usa a mesma regra do servidor (`validarAtualizacao`).
- Salvar envia só os campos alterados (ou os quatro; o servidor aceita ambos). Sem alteração -> fecha sem chamar a API.
- Excluir: troca a área de ações por "Excluir «título»? Não dá para desfazer." com "Cancelar" (foco inicial,
  é o botão seguro) e "Sim, excluir". Esc ou Cancelar volta ao formulário sem fechar.
- Foco: salvar/mover/excluir redesenham o quadro. Depois de salvar edição, foco no cartão editado
  (`data-foco="cartao-<id>"`); depois de excluir, no botão "Adicionar tarefa"; cancelar devolve ao cartão de origem.
- Abrir: o botão-título do cartão (um `<button>`) abre o diálogo; clique em área vazia do cartão também abre.

## Consequências
- `DepsDialogo` ganha `atualizarTarefa`, `excluirTarefa` e `aoAlterado`; testes de diálogo da v1 continuam
  válidos para o modo criar.
- Exclusão é definitiva (sem lixeira/desfazer): fora do escopo.
