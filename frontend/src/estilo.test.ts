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
