# ADR 0002: Frontend em TypeScript + Vite 8, sem framework (vanilla)

Status: Aceito (spec aprovada pelo David em 2026-11-18)
Data: 2026-11-18

## Contexto
David pediu front em TypeScript. A tela é pequena: um formulário e uma lista/quadro. Ele conhece mais
Java que web, e o projeto é de teste.

## Opções consideradas
1. **TypeScript + Vite, sem framework (DOM puro)**. Prós: nada a aprender além de TS e DOM; o código
   mostra exatamente o que acontece; zero dependência de runtime. Contras: se a tela crescer
   (edição, filtros), o código manual fica trabalhoso; não é o que vagas pedem.
2. **React + TypeScript + Vite**. Prós: padrão de mercado, escala bem. Contras: JSX, hooks e estado são
   um segundo assunto para aprender, desproporcional para 1 formulário + 1 lista.
3. **Thymeleaf (HTML gerado pelo Java)**: simplificaria tudo, mas contradiz o pedido de front em TS.
   Citado como alternativa honesta: se o objetivo fosse só "funcionar", seria o caminho mais simples.

## Decisão
Opção 1. Se uma v2 trouxer edição/filtros, migrar para React vira uma ADR nova.
Ferramentas: Node 24 LTS, **Vite 8** (estável desde 12/03/2026, exige Node 20.19+ ou 22.12+),
**TypeScript 6.x** (estável, `strict: true`). Teste: **Vitest**. TypeScript 7 (port nativo em Go) foi
reportado como lançado em jul/2026 em fonte secundária; não é necessário, e ficar no 6.x evita
risco de ferramenta nova. Gerenciador de pacotes: npm (já vem com Node).

## Datas de suporte (consultadas em 2026-11-18)
- Node 24 LTS: fim em 30/04/2028 (endoflife.date/nodejs). Node 22: 30/04/2027; Node 20: já encerrado.
- Vite 8: versão major atual; só a última minor recebe correções, então atualizar com frequência.
- TypeScript: não tem calendário de EOL; usa-se a última estável.

## Consequências
- Front e back são dois workspaces npm (`frontend/` e `backend/`) com `shared/` de código comum (ADR 0005);
  duas portas em desenvolvimento.
- Em dev o Vite faz proxy de `/api` para `localhost:8080` (back Fastify), o que elimina a necessidade de CORS (ver ADR 0004).
- O front importa tipos e a validação de `shared/` (por caminho relativo): as regras do cliente são as mesmas do servidor.
- Atualização 2026-11-18: o back passou a TypeScript (ADR 0005); a alternativa 3 (Thymeleaf) deixou de existir,
  pois não há mais Java. Vitest é o mesmo nos dois lados.
- Sem biblioteca de UI: o CSS é escrito à mão, inspirado na referência.
