# STATUS — cadastro-tarefas

## Para retomar
- Tarefa atual: cadastro-tarefas-v1 — construção (dev ⇄ qa). Spec aprovada pelo David (2026-11-18) com back em TypeScript/Fastify.
- Branch: `vigia/cadastro-tarefas-v1`   PR: —
- Próximo passo: back pronto e aprovado (T-01..T-05). Em andamento: ajustes do qa (data fixa nos testes do POST, 404 problem+json) + T-06 (esqueleto front). Depois T-07..T-11. No fim: mapeador (MAPA.md), abrir-pr.
- Bloqueios / perguntas em aberto: nenhum. Risco aceito: npm audit 5 high só em devDeps (picomatch via vitest); rever no fim.

## Histórico (mais recente primeiro, 1 linha por evento)
- 2026-11-18 — T-04/T-05 aprovadas pelo qa (24ab544, aab288e); `criadaEm` removido da spec/ADR 0004 (nunca esteve no contrato)
- 2026-11-18 — T-02 (ajustes) e T-03 aprovadas pelo qa (7baacc4, 32d7d6b)
- 2026-11-18 — T-02 aprovada pelo qa (326aede)
- 2026-11-18 — T-01 aprovada pelo qa (faa40b6)
- 2026-11-18 — Spec revisada (back Java → TypeScript/Fastify, ADR 0005) e aprovada pelo David; commit 3609bdb
- 2026-11-18 — Projeto criado; pedido: sistema básico de cadastro de tarefas (título, prioridade, prazo)
