# STATUS — cadastro-tarefas

## Para retomar
- Tarefa atual: kanban-status-v2 — PRONTA e aprovada pelo qa; aguardando revisão do David.
- Branch: `vigia/kanban-status-v2` (criada a partir de `vigia/cadastro-tarefas-v1`; nenhuma das duas mesclada na `main`)   PR: — (sem remoto GitHub)
- Próximo passo: David revisa. Se aprovar: decidir (1) criar repositório no GitHub (público/privado) e abrir PR da v1+v2, ou (2) mesclar localmente na main. Se recusar, ele diz o motivo → `aprender-licao` → `dev` corrige → `qa`.
- Bloqueios / perguntas em aberto: nenhum. Pendências conhecidas e aceitas:
  - npm audit: 0 vulnerabilidades hoje (18/11/2026); na v1 eram 5 high só em devDeps. Depende do banco de avisos; rodar de vez em quando.
  - Casts reais restantes (benignos): `ev as DragEvent` em frontend/src/quadro.ts:88 e `as [number, number]` em frontend/src/contraste.pares.ts:95.
  - Comentário desatualizado em frontend/src/app.ts (aoMover diz "e, na T-11, arrastar"; arrastar já existe).
  - Rota /api/saude é de teste de fumaça (removível).
  - Título do ADR 0004 ainda diz "ProblemDetail" (termo Spring); o código monta RFC 9457 à mão. shared/.gitkeep é resíduo.
  - Arrastar não funciona por toque (usar menu "Mover para…"); só testado no Edge/Chromium; leitor de tela e Firefox/Safari não testados.
  - O "hoje" da tela é o relógio do navegador; página aberta na virada do dia mostra selos antigos até a próxima ação.
  - Ideias futuras: banco no lugar do repositório em memória, reordenação manual, busca/filtros, status configuráveis.

## Histórico (mais recente primeiro, 1 linha por evento)
- 2026-11-18 — v2 fechada: qa APROVADO (U-1 corrigido, roteiro de 28 passos, contraste AA recalculado); MAPA.md atualizado; README ajustado (bec2600)
- 2026-11-18 — Spec da v2 aprovada pelo David; ADRs 0006–0010 aceitos; construção v2/T-01..T-13 com dev ⇄ qa
- 2026-11-18 — v1 aprovada pelo qa (E2E de 13 passos); MAPA.md da v1; sem remoto GitHub
- 2026-11-18 — Spec da v1 revisada (back Java → TypeScript/Fastify, ADR 0005) e aprovada pelo David
- 2026-11-18 — Projeto criado; pedido: sistema básico de cadastro de tarefas (título, prioridade, prazo)
