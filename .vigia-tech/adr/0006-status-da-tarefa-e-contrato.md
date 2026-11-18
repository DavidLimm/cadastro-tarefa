# ADR 0006: Status manual da tarefa (4 valores fixos) no contrato

Status: Aceito (spec da v2 aprovada pelo David em 2026-11-18)
Data: 2026-11-18

## Contexto
A v2 troca as colunas por prioridade por colunas por status: Idealizado, Fazendo, Concluído, Abandonado.
David decidiu: status manual; o sistema só sugere "abandonar" quando o prazo vence; a tarefa nasce sempre
em Idealizado. A persistência continua em memória (ADR 0003, vigente, não substituído).

## Opções consideradas
1. **`status` como campo manual com 4 valores fixos** (`IDEALIZADO | FAZENDO | CONCLUIDO | ABANDONADO`).
   Prós: simples, o servidor não depende de relógio para saber a coluna, testes determinísticos.
   Contras: colunas não configuráveis (aceito: David pediu 4 fixas).
2. **Status derivado do prazo (atrasado = coluna automática)**. Prós: "zero trabalho" para o usuário.
   Contras: o cartão pularia de coluna sozinho, o que David recusou; mistura relógio com dado.
3. **Colunas configuráveis (tabela de status)**. Contras: complexidade sem pedido; fora do escopo.

## Decisão
Opção 1. Em `shared/contrato.ts`:
- `STATUS = ['IDEALIZADO','FAZENDO','CONCLUIDO','ABANDONADO'] as const` (a ordem do array é a ordem das colunas);
  `type Status`.
- `Tarefa = NovaTarefa & { id: number; status: Status }`. `NovaTarefa` NÃO muda (título, prioridade, prazo):
  `POST /api/tarefas` continua igual e ignora qualquer `status` enviado (campos extras já são ignorados);
  a tarefa nasce `IDEALIZADO`, decidido no repositório.
- `EdicaoTarefa = NovaTarefa & { status: Status }`; `ErroCampo.campo` passa a `keyof EdicaoTarefa`.
- O front valida o `status` recebido (`ehTarefa`), como já valida a prioridade.
- Não existe campo "atrasada" no dado: atraso é derivado do prazo no momento de exibir (ADR 0007).

## Consequências
- Compatível com os testes do POST/GET da v1, exceto onde o corpo esperado passa a incluir `status` (ver spec).
- Trocar os 4 valores depois exige migração se houver banco (hoje não há).
- Dados antigos não existem (memória), então não há migração agora.
