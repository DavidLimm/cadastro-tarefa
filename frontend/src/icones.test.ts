// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { NOMES_ICONES, criarIcone } from './icones.js';

describe('criarIcone', () => {
  it.each(NOMES_ICONES)('"%s" é um <svg> aria-hidden com ao menos um desenho, sem texto', (nome) => {
    const svg = criarIcone(document, nome);
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path, circle, rect, line')).not.toBeNull();
    expect(svg.textContent).toBe('');
  });
});
