// Pares de cor usados no estilo.css e o mínimo WCAG 2.x de cada um (dados puros, sem dependência).
// 4.5 = texto normal; 3 = texto grande, ícone, borda de componente e anel de foco (WCAG 1.4.11).
// Os nomes são as variáveis do :root do estilo.css; "#fff" literal vale para o texto branco dos botões.

export interface Par {
  uso: string;
  fg: string;
  bg: string;
  min: 3 | 4.5;
}

export const PARES: readonly Par[] = [
  // Texto geral
  { uso: 'Texto sobre o fundo da página', fg: '--texto', bg: '--fundo', min: 4.5 },
  { uso: 'Texto sobre cartão/diálogo branco', fg: '--texto', bg: '--superficie', min: 4.5 },
  { uso: 'Prazo e "Nenhuma tarefa" (cinza) sobre o fundo', fg: '--texto-suave', bg: '--fundo', min: 4.5 },
  { uso: 'Prazo (cinza) sobre cartão branco', fg: '--texto-suave', bg: '--superficie', min: 4.5 },
  { uso: 'Prazo (cinza) sobre cartão vencido', fg: '--texto-suave', bg: '--vencido-cartao', min: 4.5 },
  { uso: 'Texto do cartão vencido', fg: '--texto', bg: '--vencido-cartao', min: 4.5 },
  { uso: 'Cabeçalho da coluna sobre o fundo', fg: '--texto', bg: '--fundo', min: 4.5 },
  { uso: 'Cabeçalho da coluna sobre o alvo de arrasto', fg: '--texto', bg: '--alvo-fundo', min: 4.5 },
  { uso: 'Contagem da coluna (pílula branca)', fg: '--texto-suave', bg: '--superficie', min: 4.5 },
  { uso: 'Título da página (roxo)', fg: '--roxo-escuro', bg: '--fundo', min: 4.5 },
  { uso: 'Contagem do título', fg: '#fff', bg: '--contador-fundo', min: 4.5 },
  // Cartões esmaecidos
  { uso: 'Cartão Concluído/Abandonado: título e prazo', fg: '--neutro-texto', bg: '--neutro-fundo', min: 4.5 },
  { uso: 'Cartão Concluído/Abandonado: selo', fg: '--neutro-texto', bg: '--neutro-selo-fundo', min: 4.5 },
  // Selos
  { uso: 'Selo Alta (preenchido)', fg: '--alta-texto', bg: '--alta-fundo', min: 4.5 },
  { uso: 'Selo Média', fg: '--media-texto', bg: '--media-fundo', min: 4.5 },
  { uso: 'Selo Baixa', fg: '--baixa-texto', bg: '--baixa-fundo', min: 4.5 },
  { uso: 'Selo Atrasada Nd', fg: '--vencido-texto', bg: '--vencido-fundo', min: 4.5 },
  { uso: 'Selo Vence hoje', fg: '--hoje-texto', bg: '--hoje-fundo', min: 4.5 },
  { uso: 'Selo Vence em Nd', fg: '--perto-texto', bg: '--perto-fundo', min: 4.5 },
  { uso: 'Selo No prazo', fg: '--no-prazo-texto', bg: '--no-prazo-fundo', min: 4.5 },
  { uso: 'Selo Atrasada: contorno sobre o cartão vencido', fg: '--vencido-borda', bg: '--vencido-cartao', min: 3 },
  // Bordas de urgência (contra o cartão branco, ou rosado no vencido)
  { uso: 'Borda vencido', fg: '--vencido-borda', bg: '--superficie', min: 3 },
  { uso: 'Borda vence hoje', fg: '--hoje-borda', bg: '--superficie', min: 3 },
  { uso: 'Borda perto de vencer', fg: '--perto-borda', bg: '--superficie', min: 3 },
  { uso: 'Borda Alta', fg: '--alta-borda', bg: '--superficie', min: 3 },
  // Botões
  { uso: 'Botão primário "Adicionar tarefa"', fg: '#fff', bg: '--roxo', min: 4.5 },
  { uso: 'Botão primário (hover)', fg: '#fff', bg: '--roxo-escuro', min: 4.5 },
  { uso: 'Botão primário desabilitado', fg: '#fff', bg: '--desabilitado', min: 4.5 },
  { uso: 'Botão secundário / Mover para… / opções do menu', fg: '--roxo-escuro', bg: '--superficie', min: 4.5 },
  { uso: 'Botão secundário (hover)', fg: '--roxo-escuro', bg: '--roxo-fundo', min: 4.5 },
  { uso: 'Borda do botão secundário e do menu', fg: '--borda-controle', bg: '--superficie', min: 3 },
  { uso: 'Botão perigo "Excluir tarefa" / "Sim, excluir"', fg: '#fff', bg: '--perigo', min: 4.5 },
  { uso: 'Botão perigo (hover)', fg: '#fff', bg: '--perigo-escuro', min: 4.5 },
  { uso: 'Botão Mover para Abandonado', fg: '--vencido-texto', bg: '--superficie', min: 4.5 },
  { uso: 'Botão Mover para Abandonado (hover)', fg: '--vencido-texto', bg: '--vencido-fundo', min: 4.5 },
  { uso: 'Borda do botão Mover para Abandonado', fg: '--vencido-borda', bg: '--superficie', min: 3 },
  // Avisos e erros
  { uso: 'Aviso (role=alert) e confirmação de exclusão', fg: '--erro-texto', bg: '--erro-fundo', min: 4.5 },
  { uso: 'Erro de campo e erro geral', fg: '--perigo', bg: '--erro-fundo', min: 4.5 },
  { uso: 'Erro de campo sobre o diálogo branco', fg: '--perigo', bg: '--superficie', min: 4.5 },
  { uso: 'Borda do aviso e da confirmação', fg: '--erro-borda', bg: '--superficie', min: 3 },
  // Campos e arrasto
  { uso: 'Borda de campo/select', fg: '--borda-controle', bg: '--superficie', min: 3 },
  { uso: 'Borda tracejada da coluna alvo sobre o fundo', fg: '--alvo-borda', bg: '--fundo', min: 3 },
  { uso: 'Borda tracejada da coluna alvo sobre o seu fundo', fg: '--alvo-borda', bg: '--alvo-fundo', min: 3 },
  { uso: 'Borda tracejada de "Nenhuma tarefa" sobre o fundo', fg: '--borda-vazio', bg: '--fundo', min: 3 },
  { uso: 'Borda tracejada de "Nenhuma tarefa" sobre o alvo de arrasto', fg: '--borda-vazio', bg: '--alvo-fundo', min: 3 },
  // Anel de foco
  { uso: 'Anel de foco sobre o fundo da página', fg: '--foco', bg: '--fundo', min: 3 },
  { uso: 'Anel de foco sobre branco (cartão, diálogo, menu)', fg: '--foco', bg: '--superficie', min: 3 },
  { uso: 'Anel de foco sobre cartão vencido', fg: '--foco', bg: '--vencido-cartao', min: 3 },
  { uso: 'Anel de foco sobre cartão esmaecido', fg: '--foco', bg: '--neutro-fundo', min: 3 },
  { uso: 'Anel de foco sobre o alvo de arrasto', fg: '--foco', bg: '--alvo-fundo', min: 3 },
  { uso: 'Anel de foco sobre a confirmação de exclusão', fg: '--foco', bg: '--erro-fundo', min: 3 },
];

/** Lê as variáveis `--nome: #rrggbb;` do bloco :root do CSS. */
export function lerVariaveis(css: string): Map<string, string> {
  const raiz = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  const vars = new Map<string, string>();
  for (const m of raiz.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) vars.set(m[1]!, m[2]!.toLowerCase());
  return vars;
}

function canal(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (WCAG 2.x) de #rrggbb. */
export function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Razão de contraste WCAG entre duas cores #rrggbb (1 a 21). */
export function razao(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}

export function corDe(vars: Map<string, string>, nome: string): string | undefined {
  return nome.startsWith('#') ? (nome === '#fff' ? '#ffffff' : nome) : vars.get(nome);
}
