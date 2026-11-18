// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EdicaoTarefa, NovaTarefa, Tarefa } from '../../shared/contrato.js';
import type { ResultadoAtualizacao, ResultadoCriacao, ResultadoExclusao, ResultadoLista } from './api.js';
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

const esperar = () => new Promise((r) => setTimeout(r, 0));
const tarefa = (id: number, titulo: string, extra: Partial<Tarefa> = {}): Tarefa => ({
  id,
  titulo,
  prioridade: 'MEDIA',
  prazo: '2999-12-31',
  status: 'IDEALIZADO',
  ...extra,
});

interface Cenario {
  tarefas?: Tarefa[];
  atualizar?: (id: number, p: Partial<EdicaoTarefa>) => Promise<ResultadoAtualizacao>;
  excluir?: (id: number) => Promise<ResultadoExclusao>;
}

async function subir(c: Cenario = {}) {
  const raiz = document.getElementById('app') as HTMLElement;
  let tarefas = c.tarefas ?? [tarefa(1, 'Pagar conta'), tarefa(2, 'Outra')];
  const listarTarefas = vi.fn(async (): Promise<ResultadoLista> => ({ ok: true, tarefas }));
  const criarTarefa = vi.fn(async (_n: NovaTarefa): Promise<ResultadoCriacao> => ({ ok: true, tarefa: tarefa(9, 'x') }));
  const atualizarTarefa = vi.fn(
    c.atualizar ?? (async (id: number): Promise<ResultadoAtualizacao> => ({ ok: true, tarefa: tarefa(id, 'x') })),
  );
  const excluirTarefa = vi.fn(c.excluir ?? (async (): Promise<ResultadoExclusao> => ({ ok: true })));
  iniciar(raiz, document, { listarTarefas, criarTarefa, atualizarTarefa, excluirTarefa });
  await esperar();
  return {
    raiz,
    listarTarefas,
    atualizarTarefa,
    excluirTarefa,
    trocarLista: (novas: Tarefa[]) => (tarefas = novas),
  };
}

const campo = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tituloDe = (raiz: HTMLElement, id: number) => raiz.querySelector<HTMLButtonElement>(`[data-foco="cartao-${id}"]`)!;

describe('app: editar', () => {
  it('clicar no título abre o diálogo em modo editar preenchido com a tarefa certa', async () => {
    const { raiz } = await subir();
    tituloDe(raiz, 2).click();
    expect(campo('dialogo-titulo').textContent).toBe('Editar tarefa');
    expect(campo<HTMLInputElement>('campo-titulo').value).toBe('Outra');
    expect(document.querySelector('dialog')?.open).toBe(true);
  });

  it('salvar chama atualizarTarefa com o id certo, recarrega sem "Carregando…" e foca o cartão', async () => {
    const { raiz, atualizarTarefa, listarTarefas, trocarLista } = await subir();
    tituloDe(raiz, 1).click();
    campo<HTMLInputElement>('campo-titulo').value = 'Pagar a conta';
    trocarLista([tarefa(1, 'Pagar a conta'), tarefa(2, 'Outra')]);
    const vistos: string[] = [];
    new MutationObserver(() => vistos.push(raiz.textContent ?? '')).observe(raiz, { childList: true, subtree: true });
    campo<HTMLFormElement>('form-cadastro').requestSubmit();
    await esperar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledWith(1, { titulo: 'Pagar a conta' });
    expect(listarTarefas).toHaveBeenCalledTimes(2);
    expect(vistos.some((v) => v.includes('Carregando'))).toBe(false);
    expect(raiz.textContent).toContain('Pagar a conta');
    expect(document.activeElement).toBe(tituloDe(raiz, 1));
  });

  it('404 ao editar: avisa "Esta tarefa não existe mais." num alerta, fecha e recarrega a lista', async () => {
    const { raiz, listarTarefas, trocarLista } = await subir({
      atualizar: async () => ({ ok: false, tipo: 'naoEncontrada' }),
    });
    tituloDe(raiz, 1).click();
    campo<HTMLInputElement>('campo-titulo').value = 'Mudou';
    trocarLista([tarefa(2, 'Outra')]);
    campo<HTMLFormElement>('form-cadastro').requestSubmit();
    await esperar();
    await esperar();
    expect(document.querySelector('dialog')?.open).toBe(false);
    const aviso = document.querySelector('[role="alert"].aviso');
    expect(aviso?.textContent).toBe('Esta tarefa não existe mais.');
    expect(listarTarefas).toHaveBeenCalledTimes(2);
    expect(raiz.textContent).not.toContain('Pagar conta');
  });

  it('Cancelar devolve o foco ao cartão de origem', async () => {
    const { raiz } = await subir();
    tituloDe(raiz, 2).focus();
    tituloDe(raiz, 2).click();
    campo<HTMLButtonElement>('botao-cancelar').click();
    expect(document.activeElement).toBe(tituloDe(raiz, 2));
  });
});

describe('app: excluir', () => {
  it('confirmar chama excluirTarefa, recarrega e leva o foco a "Adicionar tarefa"', async () => {
    const { raiz, excluirTarefa, trocarLista, listarTarefas } = await subir();
    tituloDe(raiz, 1).click();
    campo<HTMLButtonElement>('botao-excluir').click();
    expect(excluirTarefa).not.toHaveBeenCalled();
    trocarLista([tarefa(2, 'Outra')]);
    campo<HTMLButtonElement>('botao-excluir-sim').click();
    await esperar();
    await esperar();
    expect(excluirTarefa).toHaveBeenCalledWith(1);
    expect(listarTarefas).toHaveBeenCalledTimes(2);
    expect(raiz.textContent).not.toContain('Pagar conta');
    expect(document.activeElement).toBe(raiz.querySelector('[data-foco="adicionar"]'));
  });

  it('404 ao excluir é sucesso: sem alerta de erro', async () => {
    const { raiz } = await subir({ excluir: async () => ({ ok: false, tipo: 'naoEncontrada' }) });
    tituloDe(raiz, 1).click();
    campo<HTMLButtonElement>('botao-excluir').click();
    campo<HTMLButtonElement>('botao-excluir-sim').click();
    await esperar();
    await esperar();
    expect(document.querySelector('.aviso')?.textContent ?? '').toBe('');
    expect(document.activeElement).toBe(raiz.querySelector('[data-foco="adicionar"]'));
  });
});
