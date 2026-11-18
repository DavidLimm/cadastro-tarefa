// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarDialogo } from './dialogo.js';

// jsdom não carrega o estilo.css da página: injetamos o arquivo real num <style> para que
// getComputedStyle enxergue a cascata (F-1: `.campo {display:grid}` vencia o atributo hidden).
const CSS = readFileSync(resolve(process.cwd(), 'src/estilo.css'), 'utf8');

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.append(estilo);
});

function montar() {
  const d = criarDialogo(document, {
    criarTarefa: vi.fn(),
    atualizarTarefa: vi.fn(),
    excluirTarefa: vi.fn(),
    aoSalvo: vi.fn(),
    aoAlterado: vi.fn(),
  });
  document.body.append(d.elemento);
  return d;
}

const exibicao = (sel: string) => getComputedStyle(document.querySelector<HTMLElement>(sel)!).display;

describe('estilo.css: o atributo hidden sempre vence o display das classes', () => {
  it('declara a regra global [hidden] { display: none !important }', () => {
    expect(CSS).toMatch(/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
  });

  it('modo criar: a linha Status e o botão Excluir não são exibidos', () => {
    montar().abrir();
    expect(exibicao('#linha-status')).toBe('none');
    expect(exibicao('#botao-excluir')).toBe('none');
  });

  it('modo editar: a linha Status é exibida como grid e o botão Excluir aparece', () => {
    montar().abrirEditar({ id: 1, titulo: 'A', prioridade: 'MEDIA', prazo: '2030-06-20', status: 'FAZENDO' });
    expect(exibicao('#linha-status')).toBe('grid');
    expect(exibicao('#botao-excluir')).not.toBe('none');
  });
});

describe('estilo.css: a borda esquerda do cartão segue a urgência (data-urgencia -> variável de cor)', () => {
  const variavel = (nome: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const cartao = (urgencia: string) => {
    const el = document.createElement('article');
    el.className = 'cartao';
    el.dataset.urgencia = urgencia;
    document.body.append(el);
    return getComputedStyle(el);
  };

  it.each([
    ['vencido', '--vencido-borda'],
    ['hoje', '--hoje-borda'],
    ['perto', '--perto-borda'],
    ['alta', '--alta-borda'],
  ] as const)('data-urgencia=%s usa %s na borda esquerda', (urgencia, nome) => {
    expect(variavel(nome)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(cartao(urgencia).borderLeftColor).toBe(corEsperada(variavel(nome)));
  });

  it('as quatro urgências têm cores de borda diferentes entre si', () => {
    const cores = ['vencido', 'hoje', 'perto', 'alta'].map((u) => cartao(u).borderLeftColor);
    expect(new Set(cores).size).toBe(4);
  });

  it('Alta é diferente de vencido em cor E em estilo (dupla x sólida)', () => {
    const alta = cartao('alta');
    const vencido = cartao('vencido');
    expect(alta.borderLeftColor).not.toBe(vencido.borderLeftColor);
    expect(alta.borderLeftStyle).toBe('double');
    expect(vencido.borderLeftStyle).toBe('solid');
  });

  it('sem urgência a borda esquerda é transparente (só reserva o espaço)', () => {
    const c = cartao('nenhuma');
    expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(c.borderLeftColor);
  });
});

/** O jsdom devolve cores como rgb(r, g, b); converte o #rrggbb da variável para o mesmo formato. */
function corEsperada(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
