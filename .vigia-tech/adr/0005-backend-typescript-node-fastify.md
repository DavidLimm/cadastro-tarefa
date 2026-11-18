# ADR 0005: Backend em TypeScript (Node 24) + Fastify 5, com pasta `shared/`

Status: Proposto (aguarda spec aprovada). Substitui o ADR 0001.
Data: 2026-11-18

## Contexto
O ADR 0001 escolheu Java 25 + Spring Boot 4.1 + Maven porque David sabe Java. Depois da spec, David
pediu trocar o back para TypeScript (Node) "para facilitar tudo", mantendo o front em TypeScript.
Escopo, regras de campos, API e dados em memória (ADR 0003) não mudam. Decisão do David, não reaberta aqui;
este ADR só registra a escolha e o que ela implica.

## Opções consideradas
1. **Fastify 5 + TypeScript, validação à mão em `shared/`**. Prós: 1 linguagem e 1 toolchain (npm) para
   o projeto todo; sem JDK/Maven; as regras de validação e os tipos do contrato ficam num só arquivo usado
   pelo back e pelo front (acaba a "regra duplicada" prevista na spec); `app.inject()` testa a API sem
   subir porta nem instalar supertest. Contras: Fastify exige registrar a resposta de erro à mão
   (problem+json); menos "padrão de mercado" para quem vem de Spring.
2. **Express 5 + supertest + zod**. Prós: o mais conhecido. Contras: 3 dependências a mais; zod serviria
   só ao back (no front duplicaria a regra ou traria o zod ao bundle); tipos de Express são menos justos.
3. **Node puro (`node:http`)**. Prós: zero dependência. Contras: roteamento, parse de JSON e erros à mão,
   ruído demais para ensinar; sem ganho real sobre o Fastify.
4. **Manter Java** (ADR 0001): descartado pelo pedido do David.
- Execução TS: **tsx** (`tsx watch src/main.ts`). O Node 24 já roda TS por remoção de tipos, mas exige
  extensão `.ts` nos imports e só aceita um subconjunto da linguagem; tsx evita essas arestas.
  Typecheck é feito pelo `tsc --noEmit`.
- Validação: **à mão**, uma função pura `validarNovaTarefa(entrada, hoje)` em `shared/`, devolvendo
  `{campo, mensagem}[]`. São 3 campos; zod não se paga aqui.

## Decisão
Opção 1. Versões (consultadas em 2026-11-18):
- **Node 24 LTS** (suporte até 30/04/2028, endoflife.date/nodejs): ambiente único de back, front e testes.
- **TypeScript 6.x** `strict: true`; **Vitest 4.1.x** (suporta Vite 8; 4.1.9 em jun/2026) para back e front.
- **Fastify 5.x** (última vista: 5.10.0). Único major com correções upstream; a data de fim do v5 consta
  como "a definir" na política oficial (fastify.dev/docs/latest/Reference/LTS). Um blog de fornecedor cita
  Fastify 6 em alpha (ago/2026) e 6 meses de correções de segurança ao v5 depois do v6: não confirmado
  na fonte oficial. Mitigação: fixar `^5` e rever a política na data de manutenção.
- tsx: última estável (ferramenta de dev, sem calendário de EOL).
- Dependências de runtime do back: só `fastify`. Sem zod, sem Express, sem supertest, sem ORM.

Estrutura: um `package.json` na raiz com npm workspaces `backend` e `frontend`; `shared/` é uma pasta de
código comum importada por caminho relativo (não é pacote publicado). Detalhes na spec.

## Consequências
- JDK e Maven deixam de ser pré-requisito; só Node 24.
- Contrato compartilhado: `shared/contrato.ts` (tipos, constantes, validação). Mudar o contrato é mudar
  um arquivo; o `tsc` quebra nos dois lados se algo divergir.
- Relógio injetável: `criarApp({ repositorio, agora: () => Date })` substitui o `Clock` do Java.
- "Hoje" deve usar getters locais (`getFullYear/getMonth/getDate`), nunca `toISOString()` (que é UTC e
  erra perto da meia-noite no Brasil).
- O ADR 0001 permanece como histórico, marcado como substituído.
