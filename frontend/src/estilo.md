# Estilo e contraste (T-12)

Cores do `estilo.css` (variáveis do `:root`). Razão de contraste pela fórmula WCAG 2.x (luminância relativa),
medida por `contraste.pares.ts` e guardada por `contraste.test.ts`: se uma cor mudar e um par cair abaixo do
mínimo, `npm test` fica vermelho. Mínimos: 4,5:1 para texto normal; 3:1 para ícone, borda de componente e anel de foco.
Os valores do ADR 0007 eram ponto de partida; vale o que passou na medição.

## Decisões
- **Alta x Vencido** (ambos vermelhos no ADR 0007): Alta virou vinho/magenta (`#9d174d` no selo, `#be185d` na borda),
  selo **preenchido** com seta para cima e **borda dupla** (6px); Vencido é vermelho `#b91c1c`, borda **sólida**,
  cartão com fundo rosado, selo **claro com contorno** e ícone de alerta, texto "Atrasada Nd". Diferem por cor, forma,
  ícone e texto. Desvio em relação ao ADR 0007 (Alta "vermelho"): David pode preferir outro tom.
- Selos de prioridade são retângulos; de prazo são pílulas.
- Concluído/Abandonado: cores neutras (sem `opacity`), sem borda de urgência.
- Menu "Mover para…" abre em fluxo dentro do cartão (uma lista absoluta seria cortada pela rolagem da coluna).
- Arrasto: cartão com `data-arrastando` (opacity 0.5, estado transitório) e coluna `[data-alvo-arrasto]` tracejada.

## Tabela de contraste

| Par (texto/ícone/borda sobre fundo) | Cores | Razão | Mínimo | Resultado |
|---|---|---|---|---|
| Texto sobre o fundo da página | #1f2340 sobre #eef0f6 | 13.43:1 | 4.5:1 | OK |
| Texto sobre cartão/diálogo branco | #1f2340 sobre #ffffff | 15.30:1 | 4.5:1 | OK |
| Prazo e "Nenhuma tarefa" (cinza) sobre o fundo | #5a6078 sobre #eef0f6 | 5.45:1 | 4.5:1 | OK |
| Prazo (cinza) sobre cartão branco | #5a6078 sobre #ffffff | 6.21:1 | 4.5:1 | OK |
| Prazo (cinza) sobre cartão vencido | #5a6078 sobre #fff5f5 | 5.81:1 | 4.5:1 | OK |
| Texto do cartão vencido | #1f2340 sobre #fff5f5 | 14.30:1 | 4.5:1 | OK |
| Cabeçalho da coluna sobre o fundo | #1f2340 sobre #eef0f6 | 13.43:1 | 4.5:1 | OK |
| Cabeçalho da coluna sobre o alvo de arrasto | #1f2340 sobre #e2dcfb | 11.56:1 | 4.5:1 | OK |
| Contagem da coluna (pílula branca) | #5a6078 sobre #ffffff | 6.21:1 | 4.5:1 | OK |
| Título da página (roxo) | #4a30b8 sobre #eef0f6 | 7.66:1 | 4.5:1 | OK |
| Contagem do título | #ffffff sobre #3b3a6b | 10.48:1 | 4.5:1 | OK |
| Cartão Concluído/Abandonado: título e prazo | #3f455f sobre #f4f5f9 | 8.65:1 | 4.5:1 | OK |
| Cartão Concluído/Abandonado: selo | #3f455f sobre #e3e6f0 | 7.56:1 | 4.5:1 | OK |
| Selo Alta (preenchido) | #ffffff sobre #9d174d | 7.88:1 | 4.5:1 | OK |
| Selo Média | #6b3a00 sobre #fde68a | 7.56:1 | 4.5:1 | OK |
| Selo Baixa | #075985 sobre #e0f2fe | 6.59:1 | 4.5:1 | OK |
| Selo Atrasada Nd | #991b1b sobre #fee2e2 | 6.80:1 | 4.5:1 | OK |
| Selo Vence hoje | #9a3412 sobre #ffedd5 | 6.38:1 | 4.5:1 | OK |
| Selo Vence em Nd | #854d0e sobre #fef9c3 | 6.38:1 | 4.5:1 | OK |
| Selo No prazo | #166534 sobre #dcfce7 | 6.49:1 | 4.5:1 | OK |
| Selo Atrasada: contorno sobre o cartão vencido | #b91c1c sobre #fff5f5 | 6.05:1 | 3:1 | OK |
| Borda vencido | #b91c1c sobre #ffffff | 6.47:1 | 3:1 | OK |
| Borda vence hoje | #c2410c sobre #ffffff | 5.18:1 | 3:1 | OK |
| Borda perto de vencer | #a16207 sobre #ffffff | 4.92:1 | 3:1 | OK |
| Borda Alta | #be185d sobre #ffffff | 6.04:1 | 3:1 | OK |
| Botão primário "Adicionar tarefa" | #ffffff sobre #5b3fd9 | 6.65:1 | 4.5:1 | OK |
| Botão primário (hover) | #ffffff sobre #4a30b8 | 8.73:1 | 4.5:1 | OK |
| Botão primário desabilitado | #ffffff sobre #6b6f86 | 4.95:1 | 4.5:1 | OK |
| Botão secundário / Mover para… / opções do menu | #4a30b8 sobre #ffffff | 8.73:1 | 4.5:1 | OK |
| Botão secundário (hover) | #4a30b8 sobre #ece8fc | 7.28:1 | 4.5:1 | OK |
| Borda do botão secundário e do menu | #8a90a8 sobre #ffffff | 3.16:1 | 3:1 | OK |
| Botão perigo "Excluir tarefa" / "Sim, excluir" | #ffffff sobre #b42318 | 6.57:1 | 4.5:1 | OK |
| Botão perigo (hover) | #ffffff sobre #912018 | 8.66:1 | 4.5:1 | OK |
| Botão Mover para Abandonado | #991b1b sobre #ffffff | 8.31:1 | 4.5:1 | OK |
| Botão Mover para Abandonado (hover) | #991b1b sobre #fee2e2 | 6.80:1 | 4.5:1 | OK |
| Borda do botão Mover para Abandonado | #b91c1c sobre #ffffff | 6.47:1 | 3:1 | OK |
| Aviso (role=alert) e confirmação de exclusão | #7f1d1d sobre #fff1f0 | 9.11:1 | 4.5:1 | OK |
| Erro de campo e erro geral | #b42318 sobre #fff1f0 | 5.98:1 | 4.5:1 | OK |
| Erro de campo sobre o diálogo branco | #b42318 sobre #ffffff | 6.57:1 | 4.5:1 | OK |
| Borda do aviso e da confirmação | #b42318 sobre #ffffff | 6.57:1 | 3:1 | OK |
| Borda de campo/select | #8a90a8 sobre #ffffff | 3.16:1 | 3:1 | OK |
| Borda tracejada da coluna alvo sobre o fundo | #5b3fd9 sobre #eef0f6 | 5.84:1 | 3:1 | OK |
| Borda tracejada da coluna alvo sobre o seu fundo | #5b3fd9 sobre #e2dcfb | 5.02:1 | 3:1 | OK |
| Borda tracejada de "Nenhuma tarefa" sobre o fundo | #707690 sobre #eef0f6 | 3.94:1 | 3:1 | OK |
| Borda tracejada de "Nenhuma tarefa" sobre o alvo de arrasto | #707690 sobre #e2dcfb | 3.39:1 | 3:1 | OK |
| Anel de foco sobre o fundo da página | #1d4ed8 sobre #eef0f6 | 5.88:1 | 3:1 | OK |
| Anel de foco sobre branco (cartão, diálogo, menu) | #1d4ed8 sobre #ffffff | 6.70:1 | 3:1 | OK |
| Anel de foco sobre cartão vencido | #1d4ed8 sobre #fff5f5 | 6.26:1 | 3:1 | OK |
| Anel de foco sobre cartão esmaecido | #1d4ed8 sobre #f4f5f9 | 6.15:1 | 3:1 | OK |
| Anel de foco sobre o alvo de arrasto | #1d4ed8 sobre #e2dcfb | 5.06:1 | 3:1 | OK |
| Anel de foco sobre a confirmação de exclusão | #1d4ed8 sobre #fff1f0 | 6.09:1 | 3:1 | OK |
