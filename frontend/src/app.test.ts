// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NovaTarefa, Tarefa } from '../../shared/contrato.js';
import type { ResultadoCriacao, ResultadoLista } from './api.js';
import { iniciar } from './app.js';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  document.body.innerHTML = '<div id="app"></div>';
});

const nova: Tarefa = { id: 1, titulo: 'Pagar conta', prioridade: 'MEDIA', prazo: '2999-12-31' };
const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('iniciar: ligação entre quadro, diálogo e API', () => {
  it('depois de salvar com sucesso, o foco volta ao botão "Adicionar tarefa" do quadro redesenhado', async () => {
    const raiz = document.getElementById('app') as HTMLElement;
    let tarefas: Tarefa[] = [];
    const listarTarefas = vi.fn(async (): Promise<ResultadoLista> => ({ ok: true, tarefas }));
    const criarTarefa = vi.fn(async (_n: NovaTarefa): Promise<ResultadoCriacao> => {
      tarefas = [nova];
      return { ok: true, tarefa: nova };
    });
    iniciar(raiz, document, { listarTarefas, criarTarefa });
    await esperar();

    raiz.querySelector<HTMLButtonElement>('[data-foco="adicionar"]')!.click();
    (document.getElementById('campo-titulo') as HTMLInputElement).value = 'Pagar conta';
    (document.getElementById('campo-prazo') as HTMLInputElement).value = '2999-12-31';
    (document.getElementById('botao-salvar') as HTMLButtonElement).focus();
    (document.getElementById('form-cadastro') as HTMLFormElement).requestSubmit();
    await esperar();
    await esperar();

    expect(criarTarefa).toHaveBeenCalledTimes(1);
    expect(raiz.textContent).toContain('Pagar conta');
    const botao = raiz.querySelector('[data-foco="adicionar"]');
    expect(botao).not.toBeNull();
    expect(document.activeElement).toBe(botao);
  });
});
