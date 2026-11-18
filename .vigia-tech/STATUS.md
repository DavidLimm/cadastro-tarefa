# STATUS — cadastro-tarefas

## Para retomar
- Tarefa atual: cadastro-tarefas-v1 — PRONTA, aguardando revisão do David (PR/branch).
- Branch: `vigia/cadastro-tarefas-v1`   PR: — (sem remoto GitHub; ver Histórico)
- Próximo passo: David revisa e decide merge na main. Se recusar, ele diz o motivo → `aprender-licao` → `dev` corrige → `qa`.
- Bloqueios / perguntas em aberto: nenhum. Pendências conhecidas e aceitas:
  - npm audit: 5 high só em devDeps (picomatch → vitest/vite); 0 em produção. Rever quando houver versão corrigida.
  - 2 casts `{} as Record<...>` em frontend/src/dialogo.ts:52-53 (contra a convenção "sem as"; sem risco prático).
  - Rota /api/saude é de teste de fumaça (removível).
  - Texto do título do ADR 0004 ainda diz "ProblemDetail" (termo Spring); código monta RFC 9457 à mão.
  - shared/.gitkeep é resíduo.
  - Ideias v2: editar/excluir/concluir, banco (trocar TarefaRepositorio), filtros.

## Histórico (mais recente primeiro, 1 linha por evento)
- 2026-11-18 — MAPA.md gerado; ADRs 0002–0005 aceitos; README ajustado conforme qa
- 2026-11-18 — T-11 e ajustes finais aprovados pelo qa (053bd26, 7bfb05f); E2E de 13 passos passou
- 2026-11-18 — T-09/T-10 aprovadas pelo qa (d995461, 0ec4959)
- 2026-11-18 — T-07/T-08 aprovadas pelo qa (0eb0ea8, 99cd681)
- 2026-11-18 — T-06 + ajustes do back aprovadas (e128bc5, 272741e)
- 2026-11-18 — T-04/T-05 aprovadas (24ab544, aab288e); `criadaEm` removido da spec/ADR 0004
- 2026-11-18 — T-02 (ajustes) e T-03 aprovadas (7baacc4, 32d7d6b); T-02 (326aede); T-01 (faa40b6)
- 2026-11-18 — Spec revisada (back Java → TypeScript/Fastify, ADR 0005) e aprovada pelo David; commit 3609bdb
- 2026-11-18 — Projeto criado; pedido: sistema básico de cadastro de tarefas (título, prioridade, prazo)
