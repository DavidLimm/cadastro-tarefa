# ADR 0008: Mover cartão por arrastar e soltar nativo e por menu "Mover para…"

Status: Aceito (spec da v2 aprovada pelo David em 2026-11-18)
Data: 2026-11-18

## Contexto
David escolheu os dois jeitos: arrastar e soltar, e um menu "Mover para…" acessível por teclado. Front em TS
puro, sem framework (ADR 0002).

## Opções consideradas
1. **HTML5 Drag and Drop nativo (`draggable`, `dragstart/dragover/drop`) + menu**. Prós: zero dependência;
   o menu cobre teclado, leitor de tela e touch (o DnD nativo quase não funciona em toque). Contras: difícil
   de testar em jsdom; sem pré-visualização customizada; sem rolagem automática garantida.
2. **Biblioteca de DnD (SortableJS, dnd-kit)**. Prós: toque e teclado prontos. Contras: dependência nova
   sem necessidade (reordenar não existe na v2); contraria "simples primeiro".
3. **Só menu**. Contras: David pediu arrastar.

Sub-decisão do menu: (a) `<select>` — no Windows/Chrome, setas com o select fechado já disparam `change` e
moveriam o cartão sem querer; (b) `role="menu"` — exige setas/roving tabindex/typeahead, muito código;
(c) **disclosure**: botão "Mover para…" (`aria-expanded`, `aria-controls`) que abre uma lista de botões
comuns, um por status de destino. Escolhida (c): Tab/Enter/Espaço nativos, Esc fecha e devolve o foco.

## Decisão
Opção 1 com menu em disclosure.
- Cartão `draggable="true"`; `dragstart` grava o id no `dataTransfer` (`text/plain`) e numa variável do
  módulo (porque `getData` não é legível em `dragover`); colunas aceitam `dragover` (`preventDefault`) e
  `drop`; soltar na mesma coluna não faz nada; a coluna alvo recebe borda tracejada enquanto o cartão passa.
- Um só ponto de entrada de mudança: `AcoesQuadro.aoMover(id, status)`, chamado pelo menu, pelo atalho
  "Mover para Abandonado" e pelo drop.
- Depois de mover: o cartão é redesenhado na coluna nova, o foco vai ao botão-título do cartão
  (`data-foco="cartao-<id>"`, mecanismo `pedirFoco` já existente) e uma região `role="status"` anuncia
  "«título» movido para Fazendo."
- Toque/celular: sem DnD (mobile é fora do escopo desde a v1); o menu é o caminho.
- Cobertura de teste: ver spec (eventos sintéticos em jsdom + roteiro manual em navegador real).

## Consequências
- Qualquer caminho de movimento passa pela mesma validação do servidor (PATCH, ADR 0009).
- Um bug de DnD só aparece em navegador real: o roteiro manual é obrigatório na T-12.
