# ADR 0003: Dados somente em memória, atrás de uma interface

Status: Proposto (aguarda spec aprovada)
Data: 2026-11-18

## Contexto
David decidiu: é um teste, perder os dados ao reiniciar o servidor é aceitável. Usuário único, sem login.

## Opções consideradas
1. **Repositório em memória (lista protegida contra concorrência), atrás de uma interface
   `TarefaRepository`**. Prós: zero configuração, testes rápidos; a interface deixa trocar por
   banco depois sem mexer no resto. Contras: dados somem ao reiniciar (aceito).
2. **H2/SQLite em arquivo**. Prós: persiste. Contras: dependência, schema e configuração que o David
   dispensou; foi recomendado na rodada 1 e ele escolheu memória.
3. **Arquivo JSON**. Contras: escrita concorrente e formato para manter, sem ganho para um teste.

## Decisão
Opção 1. Implementação (atualizada pelo ADR 0005): `Map<number, Tarefa>` + contador numérico em uma classe
`TarefaRepositorioMemoria` que implementa a interface `TarefaRepositorio` (nome em TS; antes `TarefaRepository`).
Node roda o código em uma única thread e `salvar` é síncrono, então não há corrida de dados nem
necessidade de trava. Ids numéricos sequenciais começando em 1. (Texto original: `ConcurrentHashMap` +
`AtomicLong`, por causa das threads do Java; deixou de valer.)

## Consequências
- Reiniciar o backend zera tudo; a tela deve mostrar estado vazio sem erro.
- A interface é a única "arquitetura" extra, e custa 1 arquivo; não há camada de domínio separada (sem DDD).
- Trocar por banco no futuro = nova implementação da interface + ADR nova.
