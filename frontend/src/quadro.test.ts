// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tarefa } from '../../shared/contrato.js';
import { formatarPrazo, pedirFoco, renderizarQuadro, type EstadoQuadro } from './quadro.js';

const t = (id: number, titulo: string, prioridade: Tarefa['prioridade'], prazo = '2030-06-15'): Tarefa => ({
  id,
  titulo,
  prioridade,
  prazo,
});

let raiz: HTMLElement;
const acoes = () => ({ aoRecarregar: vi.fn() });

function desenhar(estado: EstadoQuadro, a = acoes()) {
  renderizarQuadro(raiz, estado, a);
  return a;
}

function coluna(prioridade: string): HTMLElement {
  const el = raiz.querySelector<HTMLElement>(`[data-prioridade="${prioridade}"]`);
  if (!el) throw new Error(`coluna ${prioridade} não encontrada`);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>';
  const el = document.getElementById('raiz');
  if (!el) throw new Error('raiz ausente');
  raiz = el;
});

describe('formatarPrazo', () => {
  it('converte AAAA-MM-DD em dd/mm/aaaa sem usar Date', () => {
    expect(formatarPrazo('2030-06-15')).toBe('15/06/2030');
    expect(formatarPrazo('2031-01-02')).toBe('02/01/2031');
  });
});

describe('quadro pronto', () => {
  const tarefas = [t(1, 'A1', 'ALTA'), t(2, 'B1', 'BAIXA'), t(3, 'A2', 'ALTA', '2030-07-01'), t(4, 'M1', 'MEDIA')];

  it('mostra 3 colunas com rótulos em pt-BR na ordem Alta, Média, Baixa', () => {
    desenhar({ tipo: 'pronto', tarefas });
    const titulos = [...raiz.querySelectorAll('.coluna h2')].map((h) => h.textContent);
    expect(titulos).toEqual(['Alta', 'Média', 'Baixa']);
  });

  it('agrupa cada tarefa na coluna da sua prioridade', () => {
    desenhar({ tipo: 'pronto', tarefas });
    const titulosDe = (p: string) => [...coluna(p).querySelectorAll('.cartao-titulo')].map((e) => e.textContent);
    expect(titulosDe('ALTA')).toEqual(['A1', 'A2']);
    expect(titulosDe('MEDIA')).toEqual(['M1']);
    expect(titulosDe('BAIXA')).toEqual(['B1']);
  });

  it('mantém a ordem recebida dentro da coluna', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(9, 'Z', 'ALTA'), t(2, 'A', 'ALTA')] });
    const ordem = [...coluna('ALTA').querySelectorAll('.cartao-titulo')].map((e) => e.textContent);
    expect(ordem).toEqual(['Z', 'A']);
  });

  it('cada coluna tem contador e o título da página mostra o total', () => {
    desenhar({ tipo: 'pronto', tarefas });
    expect(coluna('ALTA').querySelector('.contador')?.textContent).toBe('2');
    expect(coluna('MEDIA').querySelector('.contador')?.textContent).toBe('1');
    expect(coluna('BAIXA').querySelector('.contador')?.textContent).toBe('1');
    expect(document.title).toBe('Tarefas (4)');
    expect(raiz.querySelector('.cabecalho .contador')?.textContent).toBe('4');
  });

  it('cartão mostra selo de prioridade e prazo dd/mm/aaaa', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'X', 'MEDIA', '2030-06-15')] });
    const cartao = coluna('MEDIA').querySelector('.cartao');
    expect(cartao?.querySelector('.selo')?.textContent).toBe('Média');
    expect(cartao?.querySelector('.prazo')?.textContent).toContain('15/06/2030');
  });

  it('título com HTML aparece como texto e não cria elementos', () => {
    const hostil1 = '<b>x</b>';
    const hostil2 = '<img src=x onerror=alert(1)>';
    desenhar({ tipo: 'pronto', tarefas: [t(1, hostil1, 'ALTA'), t(2, hostil2, 'BAIXA')] });
    const titulos = [...raiz.querySelectorAll('.cartao-titulo')].map((e) => e.textContent);
    expect(titulos).toEqual([hostil1, hostil2]);
    expect(raiz.querySelector('b')).toBeNull();
    expect(raiz.querySelector('img')).toBeNull();
  });

  it('coluna sem tarefas mostra "Nenhuma tarefa" e contador 0', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'ALTA')] });
    expect(coluna('MEDIA').textContent).toContain('Nenhuma tarefa');
    expect(coluna('MEDIA').querySelector('.contador')?.textContent).toBe('0');
    expect(coluna('ALTA').textContent).not.toContain('Nenhuma tarefa');
  });

  it('sem nenhuma tarefa mostra estado vazio geral e título "Tarefas (0)"', () => {
    desenhar({ tipo: 'pronto', tarefas: [] });
    expect(raiz.querySelector('.vazio-geral')?.textContent).toContain('Nenhuma tarefa cadastrada');
    expect(document.title).toBe('Tarefas (0)');
  });

  it('botão "Adicionar tarefa" existe (ação fica para a T-09)', () => {
    desenhar({ tipo: 'pronto', tarefas: [] });
    const botao = [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Adicionar tarefa');
    expect(botao).toBeDefined();
  });
});

describe('quadro carregando e erro', () => {
  it('carregando mostra mensagem e nenhuma coluna', () => {
    desenhar({ tipo: 'carregando' });
    expect(raiz.textContent).toContain('Carregando');
    expect(raiz.querySelector('.coluna')).toBeNull();
    expect(document.title).toBe('Tarefas');
  });

  it('erro mostra a mensagem e o botão "Tentar de novo" chama recarregar', () => {
    const a = desenhar({ tipo: 'erro', mensagem: 'Servidor fora do ar' });
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain('Servidor fora do ar');
    const botao = [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Tentar de novo');
    expect(botao).toBeDefined();
    botao?.click();
    expect(a.aoRecarregar).toHaveBeenCalledTimes(1);
  });

  it('renderizar de novo substitui o conteúdo anterior', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'ALTA')] });
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'ALTA')] });
    expect(raiz.querySelectorAll('.cartao')).toHaveLength(1);
  });
});

describe('foco depois de redesenhar', () => {
  const botaoPor = (id: string) => raiz.querySelector<HTMLElement>(`[data-foco="${id}"]`);
  const a = acoes();

  it('"Tentar de novo" mantém o foco no botão quando ainda há erro após carregar', () => {
    desenhar({ tipo: 'erro', mensagem: 'x' }, a);
    botaoPor('tentar')?.focus();
    desenhar({ tipo: 'carregando' }, a);
    desenhar({ tipo: 'erro', mensagem: 'y' }, a);
    expect(document.activeElement).toBe(botaoPor('tentar'));
  });

  it('"Tentar de novo" com sucesso leva o foco ao botão "Adicionar tarefa"', () => {
    desenhar({ tipo: 'erro', mensagem: 'x' }, a);
    botaoPor('tentar')?.focus();
    desenhar({ tipo: 'carregando' }, a);
    desenhar({ tipo: 'pronto', tarefas: [] }, a);
    expect(document.activeElement).toBe(botaoPor('adicionar'));
  });

  it('pedirFoco("adicionar") sobrevive ao recarregamento (carregando e pronto)', () => {
    desenhar({ tipo: 'pronto', tarefas: [] }, a);
    pedirFoco(raiz, 'adicionar');
    desenhar({ tipo: 'carregando' }, a);
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'ALTA')] }, a);
    expect(document.activeElement).toBe(botaoPor('adicionar'));
  });

  it('não rouba o foco quando nada dentro do quadro o tinha', () => {
    desenhar({ tipo: 'carregando' }, a);
    desenhar({ tipo: 'pronto', tarefas: [] }, a);
    expect(document.activeElement).toBe(document.body);
  });
});
