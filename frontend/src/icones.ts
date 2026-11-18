// Ícones SVG inline escritos à mão (sem biblioteca, sem innerHTML). Sempre aria-hidden: o texto do selo é o sinal.

const SVG_NS = 'http://www.w3.org/2000/svg';

type Forma = { tag: 'path' | 'circle' | 'rect' | 'line'; attrs: Record<string, string> };

// Traços em grade 16x16, desenhados com `currentColor` (a cor vem do selo, no CSS da T-12).
const DESENHOS = {
  alerta: [
    { tag: 'path', attrs: { d: 'M8 1.5 15 14H1z' } },
    { tag: 'line', attrs: { x1: '8', y1: '6', x2: '8', y2: '9.5' } },
    { tag: 'line', attrs: { x1: '8', y1: '11.5', x2: '8', y2: '11.6' } },
  ],
  relogio: [
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '6.5' } },
    { tag: 'path', attrs: { d: 'M8 4.5V8l2.5 1.5' } },
  ],
  calendario: [
    { tag: 'rect', attrs: { x: '1.5', y: '3', width: '13', height: '11.5', rx: '1.5' } },
    { tag: 'line', attrs: { x1: '1.5', y1: '6.5', x2: '14.5', y2: '6.5' } },
    { tag: 'line', attrs: { x1: '5', y1: '1.5', x2: '5', y2: '4' } },
    { tag: 'line', attrs: { x1: '11', y1: '1.5', x2: '11', y2: '4' } },
  ],
  'seta-cima': [{ tag: 'path', attrs: { d: 'M8 13V3M3.5 7.5 8 3l4.5 4.5' } }],
  traco: [{ tag: 'line', attrs: { x1: '3', y1: '8', x2: '13', y2: '8' } }],
  'seta-baixo': [{ tag: 'path', attrs: { d: 'M8 3v10M3.5 8.5 8 13l4.5-4.5' } }],
} satisfies Record<string, Forma[]>;

export type NomeIcone = keyof typeof DESENHOS;

export const NOMES_ICONES: readonly NomeIcone[] = [
  'alerta',
  'relogio',
  'calendario',
  'seta-cima',
  'traco',
  'seta-baixo',
];

export function criarIcone(doc: Document, nome: NomeIcone): SVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icone icone-${nome}`);
  for (const forma of DESENHOS[nome]) {
    const e = doc.createElementNS(SVG_NS, forma.tag);
    for (const [k, v] of Object.entries(forma.attrs)) e.setAttribute(k, v);
    svg.append(e);
  }
  return svg;
}
