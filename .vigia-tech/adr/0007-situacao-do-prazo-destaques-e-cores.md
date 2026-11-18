# ADR 0007: Situação do prazo como função pura, destaques e cores

Status: Aceito (spec da v2 aprovada pelo David em 2026-11-18)
Data: 2026-11-18

## Contexto
David quer cor no prazo e na prioridade, destaque para Alta e para prazo perto de vencer, e que o sistema
apenas sugira abandonar o que venceu. Respostas da rodada 1: N = 3 dias; selo com cor + ícone + texto;
borda esquerda grossa; atrasada em Concluído nunca conta como atrasada.

## Opções consideradas
1. **Função pura em `shared/prazo.ts`** `situacaoDoPrazo(tarefa, hoje: string, limite = 3)`, `hoje` como
   texto `YYYY-MM-DD`, diferença em dias por aritmética de calendário sobre o texto (sem `Date`/UTC).
   Prós: testável sem DOM e sem relógio; usável por back e front; evita o bug de fuso já visto na v1.
   Contras: um algoritmo de dias a mais (~15 linhas) para testar.
2. **`Date` com diferença em milissegundos / 86 400 000**. Prós: curto. Contras: erra em dias de horário
   de verão e em UTC vs. local; foi exatamente o risco da v1.
3. **Calcular no servidor e enviar `situacao` na API**. Prós: regra num só lugar. Contras: o "hoje" do
   navegador pode divergir; o cartão ficaria velho até recarregar; aumenta o contrato.

## Decisão
Opção 1. Resultado: `{tipo:'VENCIDO', dias} | {tipo:'VENCE_HOJE'} | {tipo:'PERTO', dias} | {tipo:'NO_PRAZO'}
| {tipo:'ENCERRADA'}`.
- `ENCERRADA` = status CONCLUIDO ou ABANDONADO (nunca é "atrasada"; sem selo de prazo, só a data).
- Para IDEALIZADO/FAZENDO: `dias = prazo - hoje`; `< 0` VENCIDO (`dias` = atraso, rótulo "Atrasada Nd");
  `0` VENCE_HOJE ("Vence hoje"); `1..3` PERTO ("Vence em Nd"); `> 3` NO_PRAZO ("No prazo"). Prazo igual a
  hoje não é atraso (coerente com a v1, onde hoje é válido).
- "hoje" vem de um relógio injetável; quem chama converte com `diaLocal(agora())` (getters locais).
- Destaque do cartão (só em IDEALIZADO/FAZENDO): borda esquerda grossa seguindo o mais urgente:
  VENCIDO > VENCE_HOJE > PERTO > prioridade ALTA > nenhum. (David citou "vencido > vence hoje > Alta"; PERTO
  entra entre hoje e Alta por coerência: é "perto de vencer", que ele também pediu em destaque. Ajustável.)
  Os selos de prioridade e de prazo aparecem sempre, então Alta + vencido mostram dois selos.
- Vencido e ainda em IDEALIZADO/FAZENDO: cartão ganha o botão "Mover para Abandonado" (sugestão); nada move
  sozinho.
- Cor nunca é o único sinal: todo selo tem ícone e texto; a borda é reforço.
- Paleta inicial (texto escuro sobre fundo claro; verificar AA 4,5:1 texto e 3:1 borda/ícone na T-13):
  vencido vermelho (fundo `#fee2e2`, texto `#991b1b`, borda `#b91c1c`), vence hoje laranja
  (`#ffedd5`/`#9a3412`, borda `#c2410c`), perto âmbar (`#fef9c3`/`#854d0e`, borda `#a16207`), no prazo
  verde (`#dcfce7`/`#166534`); prioridade Alta vermelho com borda própria, Média laranja, Baixa cinza-azulado
  (`#e0f2fe`/`#075985`). Valores são ponto de partida; vale o que passar na verificação.
- Ícones: SVG inline criados por `createElementNS` (sem biblioteca, sem `innerHTML`), `aria-hidden`.

## Consequências
- Regra única e testada em TZ `America/Sao_Paulo`, inclusive virada de mês/ano/bissexto.
- Página aberta de um dia para o outro mostra selos do dia anterior até redesenhar (aceito; redesenha a cada ação).
- Alta (vermelho) e Vencido (vermelho) se parecem; a distinção é por texto/ícone e pela espessura/fundo, não só cor.
