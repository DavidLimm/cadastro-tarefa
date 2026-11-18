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
  prioridade: 'ALTA',
  prazo: '2999-12-31',
  status: 'IDEALIZADO',
  ...extra,
});

async function subir(
  atualizar?: (id: number, p: Partial<EdicaoTarefa>) => Promise<ResultadoAtualizacao>,
  inicial: Tarefa[] = [tarefa(1, 'Pagar conta'), tarefa(2, 'Outra')],
) {
  const raiz = document.getElementById('app') as HTMLElement;
  let tarefas = inicial;
  const listarTarefas = vi.fn(async (): Promise<ResultadoLista> => ({ ok: true, tarefas }));
  const criarTarefa = vi.fn(async (_n: NovaTarefa): Promise<ResultadoCriacao> => ({ ok: true, tarefa: tarefa(9, 'x') }));
  const excluirTarefa = vi.fn(async (): Promise<ResultadoExclusao> => ({ ok: true }));
  // Padrão: um "servidor" em memória que aplica o PATCH e devolve a tarefa completa.
  const atualizarTarefa = vi.fn(
    atualizar ??
      (async (id: number, p: Partial<EdicaoTarefa>): Promise<ResultadoAtualizacao> => {
        const atual = tarefas.find((t) => t.id === id);
        if (!atual) return { ok: false, tipo: 'naoEncontrada' };
        const nova = { ...atual, ...p };
        tarefas = tarefas.map((t) => (t.id === id ? nova : t));
        return { ok: true, tarefa: nova };
      }),
  );
  iniciar(raiz, document, { listarTarefas, criarTarefa, atualizarTarefa, excluirTarefa });
  await esperar();
  return { raiz, listarTarefas, atualizarTarefa, setLista: (l: Tarefa[]) => (tarefas = l) };
}

const cartao = (raiz: HTMLElement, id: number) => raiz.querySelector<HTMLElement>(`.cartao[data-id="${id}"]`)!;
function moverPara(raiz: HTMLElement, id: number, rotulo: string): void {
  cartao(raiz, id).querySelector<HTMLButtonElement>('.botao-mover')!.click();
  [...cartao(raiz, id).querySelectorAll('.menu-mover-lista button')].find((b) => b.textContent === rotulo)!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
const regioesStatus = () => document.querySelectorAll('[role="status"]');
const emColuna = (raiz: HTMLElement, id: number): string | undefined =>
  cartao(raiz, id).closest<HTMLElement>('.coluna')?.dataset.status;
const aviso = () => document.querySelector('[role="alert"].aviso');

describe('app: mover', () => {
  it('menu: PATCH só com o status e o id certo; o cartão muda de coluna sem "Carregando…"', async () => {
    const { raiz, atualizarTarefa, listarTarefas } = await subir();
    const vistos: string[] = [];
    new MutationObserver(() => vistos.push(raiz.textContent ?? '')).observe(raiz, { childList: true, subtree: true });
    moverPara(raiz, 1, 'Fazendo');
    await esperar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledTimes(1);
    expect(atualizarTarefa).toHaveBeenCalledWith(1, { status: 'FAZENDO' });
    expect(listarTarefas).toHaveBeenCalledTimes(2);
    expect(vistos.some((v) => v.includes('Carregando'))).toBe(false);
    expect(emColuna(raiz, 1)).toBe('FAZENDO');
    expect(cartao(raiz, 1).querySelector('.cartao-titulo')?.textContent).toBe('Pagar conta'); // outros campos intactos
    expect(cartao(raiz, 1).querySelector('.selo-prioridade')?.textContent).toBe('Alta');
  });

  it('depois de mover: foco no cartão movido e anúncio na região role=status criada uma vez', async () => {
    const { raiz } = await subir();
    const antes = [...regioesStatus()];
    expect(antes).toHaveLength(1);
    expect(antes[0]?.getAttribute('aria-live')).toBe('polite');
    expect(antes[0]?.textContent).toBe('');
    moverPara(raiz, 1, 'Fazendo');
    await esperar();
    await esperar();
    expect(document.activeElement).toBe(raiz.querySelector('[data-foco="cartao-1"]'));
    const depois = [...regioesStatus()];
    expect(depois).toHaveLength(1);
    expect(depois[0]).toBe(antes[0]); // não é recriada no redesenho
    expect(depois[0]?.textContent).toBe('«Pagar conta» movido para Fazendo.');
    expect(depois[0]?.closest('#app')).toBeNull(); // fora do que o quadro redesenha
  });

  it('o anúncio usa só texto (título com HTML não vira elemento)', async () => {
    const { raiz } = await subir(undefined, [tarefa(1, '<i>x</i>')]);
    moverPara(raiz, 1, 'Concluído');
    await esperar();
    await esperar();
    expect(document.querySelector('[role="status"] i')).toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('«<i>x</i>» movido para Concluído.');
  });

  it('atalho "Mover para Abandonado" numa vencida: PATCH ABANDONADO, foco e anúncio', async () => {
    const { raiz, atualizarTarefa } = await subir(undefined, [
      tarefa(1, 'Velha', { prazo: '2000-01-01', status: 'FAZENDO' }),
    ]);
    cartao(raiz, 1).querySelector<HTMLButtonElement>('.botao-abandonar')!.click();
    await esperar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledWith(1, { status: 'ABANDONADO' });
    expect(emColuna(raiz, 1)).toBe('ABANDONADO');
    expect(cartao(raiz, 1).querySelector('.botao-abandonar')).toBeNull();
    expect(document.activeElement).toBe(raiz.querySelector('[data-foco="cartao-1"]'));
    expect(document.querySelector('[role="status"]')?.textContent).toBe('«Velha» movido para Abandonado.');
  });

  it('tarefa vencida vai para Concluído (prazo vencido não bloqueia)', async () => {
    const { raiz, atualizarTarefa } = await subir(undefined, [tarefa(1, 'Velha', { prazo: '2000-01-01' })]);
    moverPara(raiz, 1, 'Concluído');
    await esperar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledWith(1, { status: 'CONCLUIDO' });
    expect(emColuna(raiz, 1)).toBe('CONCLUIDO');
  });

  it('404: "Esta tarefa não existe mais." num alerta e a lista é recarregada', async () => {
    const { raiz, listarTarefas, setLista } = await subir(async () => ({ ok: false, tipo: 'naoEncontrada' }));
    setLista([tarefa(2, 'Outra')]);
    moverPara(raiz, 1, 'Fazendo');
    await esperar();
    await esperar();
    expect(aviso()?.textContent).toBe('Esta tarefa não existe mais.');
    expect(listarTarefas).toHaveBeenCalledTimes(2);
    expect(raiz.querySelector('.cartao[data-id="1"]')).toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it.each([
    ['rede', 'Sem conexão X'],
    ['servidor', 'Servidor Y'],
  ] as const)('falha de %s: alerta visível, cartão fica na coluna antiga, sem anúncio de sucesso', async (tipo, mensagem) => {
    const { raiz } = await subir(async () => ({ ok: false, tipo, mensagem }));
    moverPara(raiz, 1, 'Fazendo');
    await esperar();
    await esperar();
    const texto = aviso()?.textContent ?? '';
    expect(texto).toContain('Não foi possível mover');
    expect(texto).toContain(mensagem);
    expect(emColuna(raiz, 1)).toBe('IDEALIZADO');
    expect(document.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('duas movidas rápidas do mesmo cartão fazem uma só chamada', async () => {
    let liberar: (r: ResultadoAtualizacao) => void = () => {};
    const pendente = new Promise<ResultadoAtualizacao>((r) => (liberar = r));
    const { raiz, atualizarTarefa } = await subir(() => pendente);
    moverPara(raiz, 1, 'Fazendo');
    moverPara(raiz, 1, 'Concluído');
    expect(atualizarTarefa).toHaveBeenCalledTimes(1);
    liberar({ ok: true, tarefa: tarefa(1, 'Pagar conta', { status: 'FAZENDO' }) });
    await esperar();
    await esperar();
    moverPara(raiz, 1, 'Concluído'); // depois de terminar, mover volta a funcionar
    expect(atualizarTarefa).toHaveBeenCalledTimes(2);
  });

  it('o aviso de erro anterior some ao mover de novo com sucesso', async () => {
    let falhar = true;
    const { raiz } = await subir(async (id, p) =>
      falhar ? { ok: false, tipo: 'rede', mensagem: 'x' } : { ok: true, tarefa: tarefa(id, 'Pagar conta', p) },
    );
    moverPara(raiz, 1, 'Fazendo');
    await esperar();
    await esperar();
    expect(aviso()?.textContent).not.toBe('');
    falhar = false;
    moverPara(raiz, 1, 'Fazendo');
    await esperar();
    await esperar();
    expect(aviso()?.textContent).toBe('');
  });
});
