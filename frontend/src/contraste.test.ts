import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PARES, corDe, lerVariaveis, razao } from './contraste.pares.js';

// Rede de proteção do contraste AA (spec R-09): lê as variáveis reais do estilo.css e mede cada par.
const CSS = readFileSync(resolve(process.cwd(), 'src/estilo.css'), 'utf8');
const VARS = lerVariaveis(CSS);

describe('razão de contraste (fórmula WCAG)', () => {
  it('preto sobre branco é 21:1 e cor igual é 1:1', () => {
    expect(razao('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(razao('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('é simétrica e bate com um valor de referência conhecido (#767676 sobre branco = 4,54)', () => {
    expect(razao('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(razao('#ffffff', '#767676')).toBeCloseTo(razao('#767676', '#ffffff'), 10);
  });
});

describe('estilo.css: contraste AA de todos os pares texto/fundo, borda e anel de foco', () => {
  it('lê as variáveis de cor do :root', () => {
    expect(VARS.size).toBeGreaterThan(30);
    expect(VARS.get('--foco')).toBe('#1d4ed8');
  });

  it.each(PARES.map((p) => [p.uso, p] as const))('%s', (_uso, p) => {
    const fg = corDe(VARS, p.fg);
    const bg = corDe(VARS, p.bg);
    expect(fg, `variável ${p.fg} não existe no :root`).toBeDefined();
    expect(bg, `variável ${p.bg} não existe no :root`).toBeDefined();
    expect(razao(fg!, bg!), `${p.fg} sobre ${p.bg}`).toBeGreaterThanOrEqual(p.min);
  });
});
