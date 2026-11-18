// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prioridade, Status, Tarefa } from '../../shared/contrato.js';
import { formatarPrazo, pedirFoco, renderizarQuadro, type EstadoQuadro } from './quadro.js';

// Relógio fixo: 18/11/2026 (mês 10 = novembro). Prazos de 2030 ficam sempre "No prazo".
const HOJE = () => new Date(2026, 10, 18);

const t = (
  id: number,
  titulo: string,
  status: Status,
  prioridade: Prioridade = 'MEDIA',
  prazo = '2030-06-15',
): Tarefa => ({ id, titulo, prioridade, prazo, status });

let raiz: HTMLElement;
const acoes = () => ({ aoRecarregar: vi.fn(), hoje: HOJE });

function desenhar(estado: EstadoQuadro, a = acoes()) {
  renderizarQuadro(raiz, estado, a);
  return a;
}

function coluna(status: string): HTMLElement {
  const el = raiz.querySelector<HTMLElement>(`[data-status="${status}"].coluna`);
  if (!el) throw new Error(`coluna ${status} não encontrada`);
  return el;
}

function cartaoDe(id: number): HTMLElement {
  const el = raiz.querySelector<HTMLElement>(`[data-foco="cartao-${id}"]`)?.closest<HTMLElement>('.cartao');
  if (!el) throw new Error(`cartão ${id} não encontrado`);
  return el;
}

const titulosDe = (status: string) => [...coluna(status).querySelectorAll('.cartao-titulo')].map((e) => e.textContent);

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

describe('quadro pronto: colunas por status', () => {
  const tarefas = [
    t(1, 'I1', 'IDEALIZADO'),
    t(2, 'C1', 'CONCLUIDO'),
    t(3, 'I2', 'IDEALIZADO', 'ALTA', '2030-07-01'),
    t(4, 'F1', 'FAZENDO'),
    t(5, 'A1', 'ABANDONADO'),
  ];

  it('mostra 4 colunas fixas na ordem Idealizado, Fazendo, Concluído, Abandonado', () => {
    desenhar({ tipo: 'pronto', tarefas });
    const nomes = [...raiz.querySelectorAll('.coluna .coluna-nome')].map((h) => h.textContent);
    expect(nomes).toEqual(['Idealizado', 'Fazendo', 'Concluído', 'Abandonado']);
    const status = [...raiz.querySelectorAll<HTMLElement>('.coluna')].map((c) => c.dataset.status);
    expect(status).toEqual(['IDEALIZADO', 'FAZENDO', 'CONCLUIDO', 'ABANDONADO']);
  });

  it('as 4 colunas aparecem mesmo com uma só tarefa', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'FAZENDO')] });
    expect(raiz.querySelectorAll('.coluna')).toHaveLength(4);
  });

  it('agrupa cada tarefa na coluna do seu status (a prioridade não decide a coluna)', () => {
    desenhar({ tipo: 'pronto', tarefas });
    expect(titulosDe('IDEALIZADO')).toEqual(['I1', 'I2']);
    expect(titulosDe('FAZENDO')).toEqual(['F1']);
    expect(titulosDe('CONCLUIDO')).toEqual(['C1']);
    expect(titulosDe('ABANDONADO')).toEqual(['A1']);
  });

  it('não existe mais coluna por prioridade', () => {
    desenhar({ tipo: 'pronto', tarefas });
    expect(raiz.querySelector('[data-prioridade]')).toBeNull();
  });

  it('mantém a ordem recebida dentro da coluna (a do GET), sem reordenar', () => {
    desenhar({
      tipo: 'pronto',
      tarefas: [t(9, 'Z', 'FAZENDO', 'BAIXA', '2031-01-01'), t(2, 'A', 'FAZENDO', 'ALTA', '2030-01-01')],
    });
    expect(titulosDe('FAZENDO')).toEqual(['Z', 'A']);
  });

  it('cada coluna tem contador (visual aria-hidden + texto para leitor) e o título da página mostra o total', () => {
    desenhar({ tipo: 'pronto', tarefas });
    const cont = (s: string) => coluna(s).querySelector('.contador');
    expect(cont('IDEALIZADO')?.textContent).toBe('2');
    expect(cont('FAZENDO')?.textContent).toBe('1');
    expect(cont('CONCLUIDO')?.textContent).toBe('1');
    expect(cont('ABANDONADO')?.textContent).toBe('1');
    expect(cont('IDEALIZADO')?.getAttribute('aria-hidden')).toBe('true');
    expect(coluna('IDEALIZADO').querySelector('.so-leitor')?.textContent).toBe('2 tarefas');
    expect(coluna('FAZENDO').querySelector('.so-leitor')?.textContent).toBe('1 tarefa');
    expect(document.title).toBe('Tarefas (5)');
    expect(raiz.querySelector('.cabecalho .contador')?.textContent).toBe('5');
  });

  it('coluna sem tarefas mostra "Nenhuma tarefa" e contador 0', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO')] });
    expect(coluna('FAZENDO').textContent).toContain('Nenhuma tarefa');
    expect(coluna('FAZENDO').querySelector('.contador')?.textContent).toBe('0');
    expect(coluna('FAZENDO').querySelector('.so-leitor')?.textContent).toBe('0 tarefas');
    expect(coluna('IDEALIZADO').textContent).not.toContain('Nenhuma tarefa');
  });

  it('sem nenhuma tarefa mostra estado vazio geral, 4 colunas vazias e título "Tarefas (0)"', () => {
    desenhar({ tipo: 'pronto', tarefas: [] });
    expect(raiz.querySelector('.vazio-geral')?.textContent).toContain('Nenhuma tarefa cadastrada');
    expect(raiz.querySelectorAll('.coluna .vazio')).toHaveLength(4);
    expect(document.title).toBe('Tarefas (0)');
  });

  it('botão "Adicionar tarefa" existe', () => {
    desenhar({ tipo: 'pronto', tarefas: [] });
    const botao = [...raiz.querySelectorAll('button')].find((b) => b.textContent === 'Adicionar tarefa');
    expect(botao).toBeDefined();
  });
});

describe('cartão', () => {
  it('mostra selo de prioridade (ícone aria-hidden + texto) e prazo dd/mm/aaaa', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'X', 'FAZENDO', 'MEDIA', '2030-06-15')] });
    const cartao = cartaoDe(1);
    const selo = cartao.querySelector('.selo-prioridade');
    expect(selo?.textContent).toBe('Média');
    expect(selo?.classList.contains('selo-media')).toBe(true);
    expect(selo?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(cartao.querySelector('.prazo')?.textContent).toBe('Prazo: 15/06/2030');
  });

  it('o título é um <button type="button"> com data-foco do cartão (a edição vem na T-09)', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(7, 'Pagar', 'IDEALIZADO')] });
    const b = cartaoDe(7).querySelector('.cartao-titulo');
    expect(b).toBeInstanceOf(HTMLButtonElement);
    expect((b as HTMLButtonElement).type).toBe('button');
    expect(b?.textContent).toBe('Pagar');
    expect(b?.closest('h3')).not.toBeNull();
  });

  it('cartão carrega data-status e data-id', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(7, 'P', 'FAZENDO')] });
    expect(cartaoDe(7).dataset.status).toBe('FAZENDO');
    expect(cartaoDe(7).dataset.id).toBe('7');
  });

  it('vencido em FAZENDO: selo "Atrasada 3d", urgência vencido e sugestão de abandono (sem mudar de coluna)', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'V', 'FAZENDO', 'BAIXA', '2026-11-15')] });
    const c = cartaoDe(1);
    expect(c.querySelector('.selo-prazo')?.textContent).toBe('Atrasada 3d');
    expect(c.querySelector('.selo-prazo')?.classList.contains('selo-vencido')).toBe(true);
    expect(c.dataset.urgencia).toBe('vencido');
    expect(c.querySelector('.prazo')?.textContent).toBe('Prazo: 15/11/2026');
    const sugestao = c.querySelector('.botao-abandonar');
    expect(sugestao?.textContent).toBe('Mover para Abandonado');
    expect(coluna('FAZENDO').contains(c)).toBe(true);
  });

  it('o mesmo vencido em CONCLUIDO: sem selo de prazo, sem borda, sem sugestão, só a data', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'V', 'CONCLUIDO', 'ALTA', '2026-11-15')] });
    const c = cartaoDe(1);
    expect(c.querySelector('.selo-prazo')).toBeNull();
    expect(c.dataset.urgencia).toBe('nenhuma');
    expect(c.querySelector('.botao-abandonar')).toBeNull();
    expect(c.querySelector('.prazo')?.textContent).toBe('Prazo: 15/11/2026');
    expect(c.querySelector('.selo-prioridade')?.textContent).toBe('Alta');
  });

  it('em ABANDONADO também não há selo de prazo nem sugestão', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'V', 'ABANDONADO', 'MEDIA', '2026-11-15')] });
    expect(cartaoDe(1).querySelector('.selo-prazo')).toBeNull();
    expect(cartaoDe(1).querySelector('.botao-abandonar')).toBeNull();
  });

  it('Alta e perto de vencer: dois selos e a borda segue o mais urgente', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'P', 'IDEALIZADO', 'ALTA', '2026-11-20')] });
    const c = cartaoDe(1);
    expect(c.querySelector('.selo-prioridade')?.textContent).toBe('Alta');
    expect(c.querySelector('.selo-prazo')?.textContent).toBe('Vence em 2d');
    expect(c.dataset.urgencia).toBe('perto');
    expect(c.querySelector('.botao-abandonar')).toBeNull();
  });

  it('Alta sem urgência de prazo: borda de Alta; Média no prazo: sem borda', () => {
    desenhar({
      tipo: 'pronto',
      tarefas: [t(1, 'A', 'IDEALIZADO', 'ALTA', '2030-01-01'), t(2, 'M', 'IDEALIZADO', 'MEDIA', '2030-01-01')],
    });
    expect(cartaoDe(1).dataset.urgencia).toBe('alta');
    expect(cartaoDe(2).dataset.urgencia).toBe('nenhuma');
    expect(cartaoDe(2).querySelector('.selo-prazo')?.textContent).toBe('No prazo');
  });

  it('"hoje" é injetável: o mesmo cartão muda de selo conforme o relógio', () => {
    const tarefas = [t(1, 'X', 'FAZENDO', 'MEDIA', '2026-11-20')];
    desenhar({ tipo: 'pronto', tarefas }, { aoRecarregar: vi.fn(), hoje: () => new Date(2026, 10, 18) });
    expect(cartaoDe(1).querySelector('.selo-prazo')?.textContent).toBe('Vence em 2d');
    desenhar({ tipo: 'pronto', tarefas }, { aoRecarregar: vi.fn(), hoje: () => new Date(2026, 10, 20) });
    expect(cartaoDe(1).querySelector('.selo-prazo')?.textContent).toBe('Vence hoje');
    desenhar({ tipo: 'pronto', tarefas }, { aoRecarregar: vi.fn(), hoje: () => new Date(2026, 10, 25) });
    expect(cartaoDe(1).querySelector('.selo-prazo')?.textContent).toBe('Atrasada 5d');
  });

  it('título com HTML aparece como texto e não cria elementos', () => {
    const hostil1 = '<b>x</b>';
    const hostil2 = '<img src=x onerror=alert(1)>';
    desenhar({ tipo: 'pronto', tarefas: [t(1, hostil1, 'IDEALIZADO', 'ALTA'), t(2, hostil2, 'ABANDONADO', 'BAIXA')] });
    const titulos = [...raiz.querySelectorAll('.cartao-titulo')].map((e) => e.textContent);
    expect(titulos).toEqual([hostil1, hostil2]);
    expect(raiz.querySelector('b')).toBeNull();
    expect(raiz.querySelector('img')).toBeNull();
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
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO')] });
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO')] });
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
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO')] }, a);
    expect(document.activeElement).toBe(botaoPor('adicionar'));
  });

  it('o botão-título do cartão mantém o foco quando o quadro é redesenhado', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO'), t(2, 'B', 'FAZENDO')] }, a);
    botaoPor('cartao-2')?.focus();
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO'), t(2, 'B', 'CONCLUIDO')] }, a);
    expect(document.activeElement).toBe(botaoPor('cartao-2'));
    expect(coluna('CONCLUIDO').contains(document.activeElement)).toBe(true);
  });

  it('pedirFoco("cartao-2") leva o foco ao cartão na nova coluna', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(2, 'B', 'FAZENDO')] }, a);
    pedirFoco(raiz, 'cartao-2');
    desenhar({ tipo: 'pronto', tarefas: [t(2, 'B', 'ABANDONADO')] }, a);
    expect(document.activeElement).toBe(botaoPor('cartao-2'));
  });

  it('não rouba o foco quando nada dentro do quadro o tinha', () => {
    desenhar({ tipo: 'carregando' }, a);
    desenhar({ tipo: 'pronto', tarefas: [] }, a);
    expect(document.activeElement).toBe(document.body);
  });
});

describe('contador do título acessível', () => {
  const nomeAcessivel = () => {
    const h1 = raiz.querySelector('h1');
    if (!h1) throw new Error('sem h1');
    // aria-hidden fica fora do nome acessível; o resto (inclusive texto só para leitor de tela) entra.
    return [...h1.childNodes]
      .filter((n) => !(n instanceof HTMLElement && n.getAttribute('aria-hidden') === 'true'))
      .map((n) => n.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  };

  it('lê "Tarefas 5 tarefas" em vez de "Tarefas 5"', () => {
    desenhar({ tipo: 'pronto', tarefas: [1, 2, 3, 4, 5].map((i) => t(i, `T${i}`, 'IDEALIZADO', 'ALTA')) });
    expect(nomeAcessivel()).toBe('Tarefas 5 tarefas');
    expect(raiz.querySelector('h1 .contador')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('singular para 1 tarefa e plural para 0', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO', 'ALTA')] });
    expect(nomeAcessivel()).toBe('Tarefas 1 tarefa');
    desenhar({ tipo: 'pronto', tarefas: [] });
    expect(nomeAcessivel()).toBe('Tarefas 0 tarefas');
  });
});

describe('abrir edição pelo cartão', () => {
  it('clicar no botão-título chama aoEditar com o id uma só vez', () => {
    const a = { ...acoes(), aoEditar: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(7, 'Pagar', 'IDEALIZADO'), t(8, 'Outra', 'FAZENDO')] }, a);
    cartaoDe(7).querySelector<HTMLButtonElement>('.cartao-titulo')?.click();
    expect(a.aoEditar).toHaveBeenCalledTimes(1);
    expect(a.aoEditar).toHaveBeenCalledWith(7);
  });

  it('clicar numa área vazia do cartão também abre a edição', () => {
    const a = { ...acoes(), aoEditar: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(7, 'Pagar', 'IDEALIZADO')] }, a);
    cartaoDe(7).querySelector<HTMLElement>('.prazo')?.click();
    expect(a.aoEditar).toHaveBeenCalledWith(7);
  });

  it('clicar em outro botão do cartão (sugestão de abandono) não abre a edição', () => {
    const a = { ...acoes(), aoEditar: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(7, 'Velha', 'FAZENDO', 'MEDIA', '2026-11-01')] }, a);
    cartaoDe(7).querySelector<HTMLButtonElement>('.botao-abandonar')?.click();
    expect(a.aoEditar).not.toHaveBeenCalled();
  });
});

describe('menu "Mover para…" (disclosure)', () => {
  const botaoMover = (id: number) => cartaoDe(id).querySelector<HTMLButtonElement>('.botao-mover')!;
  const lista = (id: number) => cartaoDe(id).querySelector<HTMLElement>('.menu-mover-lista')!;
  const opcoes = (id: number) => [...lista(id).querySelectorAll('button')].map((b) => b.textContent);

  it('começa fechado: botão com aria-expanded=false e aria-controls para a lista escondida', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    const b = botaoMover(5);
    expect(b.textContent).toBe('Mover para…');
    expect(b.type).toBe('button');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.getAttribute('aria-controls')).toBe(lista(5).id);
    expect(lista(5).hidden).toBe(true);
  });

  it('não usa <select>: a lista é de botões comuns', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    expect(cartaoDe(5).querySelector('select')).toBeNull();
    for (const b of lista(5).querySelectorAll('button')) expect(b.type).toBe('button');
  });

  it.each([
    ['IDEALIZADO', ['Fazendo', 'Concluído', 'Abandonado']],
    ['FAZENDO', ['Idealizado', 'Concluído', 'Abandonado']],
    ['CONCLUIDO', ['Idealizado', 'Fazendo', 'Abandonado']],
    ['ABANDONADO', ['Idealizado', 'Fazendo', 'Concluído']],
  ] as const)('em %s as opções são os outros três status, sem a coluna atual', (st, esperado) => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', st)] });
    expect(opcoes(5)).toEqual(esperado);
  });

  it('clicar abre (aria-expanded=true, lista visível) e clicar de novo fecha', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    botaoMover(5).click();
    expect(botaoMover(5).getAttribute('aria-expanded')).toBe('true');
    expect(lista(5).hidden).toBe(false);
    botaoMover(5).click();
    expect(botaoMover(5).getAttribute('aria-expanded')).toBe('false');
    expect(lista(5).hidden).toBe(true);
  });

  it('Esc com o menu aberto fecha e devolve o foco ao botão "Mover para…"', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    botaoMover(5).click();
    const primeira = lista(5).querySelector('button')!;
    primeira.focus();
    primeira.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(lista(5).hidden).toBe(true);
    expect(botaoMover(5).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(botaoMover(5));
  });

  it('clicar fora do menu fecha sem tirar o foco do elemento clicado', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    botaoMover(5).click();
    const titulo = cartaoDe(5).querySelector<HTMLElement>('.cartao-titulo')!;
    titulo.focus();
    document.body.click();
    expect(lista(5).hidden).toBe(true);
    expect(botaoMover(5).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(titulo);
  });

  it('abrir o menu de outro cartão fecha o que estava aberto', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO'), t(6, 'B', 'IDEALIZADO')] });
    botaoMover(5).click();
    botaoMover(6).click();
    expect(lista(5).hidden).toBe(true);
    expect(lista(6).hidden).toBe(false);
  });

  it('clicar dentro do menu (na lista) não fecha por causa do clique fora', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    botaoMover(5).click();
    lista(5).click();
    expect(lista(5).hidden).toBe(false);
  });

  it('o foco saindo do menu para outro elemento fecha, sem roubar o foco', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    botaoMover(5).click();
    const ultima = [...lista(5).querySelectorAll('button')].at(-1)!;
    ultima.focus();
    const proximo = raiz.querySelector<HTMLElement>('[data-foco="adicionar"]')!;
    proximo.focus(); // Tab para fora: focusout com relatedTarget fora do menu
    expect(lista(5).hidden).toBe(true);
    expect(document.activeElement).toBe(proximo);
  });

  it('o foco indo do botão para uma opção do próprio menu mantém aberto', () => {
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] });
    botaoMover(5).click();
    botaoMover(5).focus();
    lista(5).querySelector('button')!.focus();
    expect(lista(5).hidden).toBe(false);
  });

  it('escolher uma opção chama aoMover(id, status) uma vez, fecha o menu e devolve o foco ao botão', () => {
    const a = { ...acoes(), aoMover: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO'), t(6, 'B', 'FAZENDO')] }, a);
    botaoMover(6).click();
    [...lista(6).querySelectorAll('button')].find((b) => b.textContent === 'Concluído')!.click();
    expect(a.aoMover).toHaveBeenCalledTimes(1);
    expect(a.aoMover).toHaveBeenCalledWith(6, 'CONCLUIDO');
    expect(lista(6).hidden).toBe(true);
    expect(document.activeElement).toBe(botaoMover(6));
  });

  it('usar o menu não abre o diálogo de edição', () => {
    const a = { ...acoes(), aoMover: vi.fn(), aoEditar: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(5, 'A', 'IDEALIZADO')] }, a);
    botaoMover(5).click();
    lista(5).querySelector('button')!.click();
    expect(a.aoEditar).not.toHaveBeenCalled();
  });
});

describe('atalho "Mover para Abandonado"', () => {
  const atalho = (id: number) => cartaoDe(id).querySelector<HTMLButtonElement>('.botao-abandonar');

  it.each(['IDEALIZADO', 'FAZENDO'] as const)('vencida em %s: aparece e chama aoMover(id, ABANDONADO)', (st) => {
    const a = { ...acoes(), aoMover: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(3, 'V', st, 'MEDIA', '2026-11-01')] }, a);
    expect(atalho(3)?.textContent).toBe('Mover para Abandonado');
    atalho(3)!.click();
    expect(a.aoMover).toHaveBeenCalledTimes(1);
    expect(a.aoMover).toHaveBeenCalledWith(3, 'ABANDONADO');
  });

  it.each(['CONCLUIDO', 'ABANDONADO'] as const)('vencida em %s: não aparece', (st) => {
    desenhar({ tipo: 'pronto', tarefas: [t(3, 'V', st, 'MEDIA', '2026-11-01')] });
    expect(atalho(3)).toBeNull();
  });

  it('não vencida (vence hoje, futuro): não aparece', () => {
    desenhar({
      tipo: 'pronto',
      tarefas: [t(1, 'H', 'FAZENDO', 'MEDIA', '2026-11-18'), t(2, 'F', 'IDEALIZADO', 'MEDIA', '2030-01-01')],
    });
    expect(atalho(1)).toBeNull();
    expect(atalho(2)).toBeNull();
  });
});

describe('arrastar e soltar (HTML5 nativo, eventos sintéticos)', () => {
  // jsdom não tem DragEvent: usa Event comum + dataTransfer falso. O id arrastado NÃO vem do getData.
  function evento(tipo: string): Event {
    const ev = new Event(tipo, { bubbles: true, cancelable: true });
    const dataTransfer = { setData: vi.fn(), getData: () => '', effectAllowed: '', dropEffect: '' };
    Object.defineProperty(ev, 'dataTransfer', { value: dataTransfer });
    return ev;
  }
  const cart = (id: number) => raiz.querySelector<HTMLElement>(`.cartao[data-id="${id}"]`)!;
  const dispara = (alvo: Element, tipo: string) => {
    const ev = evento(tipo);
    alvo.dispatchEvent(ev);
    return ev;
  };
  const marcada = (status: string) => coluna(status).hasAttribute('data-alvo-arrasto');
  // O id arrastado vive no módulo: encerra qualquer arrasto deixado pelo teste anterior.
  afterEach(() => document.querySelector('.cartao')?.dispatchEvent(new Event('dragend', { bubbles: true })));
  function montar() {
    const a = { ...acoes(), aoMover: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO'), t(2, 'B', 'FAZENDO')] }, a);
    return a;
  }

  it('o cartão é draggable e o dragstart grava text/plain e effectAllowed=move', () => {
    montar();
    expect(cart(1).draggable).toBe(true);
    const ev = dispara(cart(1), 'dragstart');
    const dt = (ev as unknown as { dataTransfer: { setData: ReturnType<typeof vi.fn>; effectAllowed: string } }).dataTransfer;
    expect(dt.setData).toHaveBeenCalledWith('text/plain', '1');
    expect(dt.effectAllowed).toBe('move');
  });

  it('drop em outra coluna chama aoMover(id, status) uma vez', () => {
    const a = montar();
    dispara(cart(1), 'dragstart');
    const ev = dispara(coluna('FAZENDO'), 'drop');
    expect(a.aoMover).toHaveBeenCalledTimes(1);
    expect(a.aoMover).toHaveBeenCalledWith(1, 'FAZENDO');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('drop sobre um cartão da coluna alvo (filho da coluna) também vale', () => {
    const a = montar();
    dispara(cart(1), 'dragstart');
    dispara(cart(2), 'drop');
    expect(a.aoMover).toHaveBeenCalledWith(1, 'FAZENDO');
  });

  it('drop na própria coluna não chama aoMover', () => {
    const a = montar();
    dispara(cart(1), 'dragstart');
    dispara(coluna('IDEALIZADO'), 'drop');
    expect(a.aoMover).not.toHaveBeenCalled();
  });

  it('drop sem arrasto prévio de cartão (texto arrastado) não chama aoMover nem cancela o evento', () => {
    const a = montar();
    const ev = dispara(coluna('FAZENDO'), 'drop');
    expect(a.aoMover).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it('dragstart de seleção de texto dentro do cartão (alvo não é o cartão) não inicia arrasto', () => {
    const a = montar();
    dispara(cart(1).querySelector('.cartao-selos')!, 'dragstart');
    dispara(coluna('FAZENDO'), 'drop');
    expect(a.aoMover).not.toHaveBeenCalled();
  });

  it('dragend limpa o estado: um drop depois dele não move', () => {
    const a = montar();
    dispara(cart(1), 'dragstart');
    dispara(cart(1), 'dragend');
    dispara(coluna('FAZENDO'), 'drop');
    expect(a.aoMover).not.toHaveBeenCalled();
  });

  it('o drop também limpa o estado: um segundo drop sem novo arrasto não move de novo', () => {
    const a = montar();
    dispara(cart(1), 'dragstart');
    dispara(coluna('FAZENDO'), 'drop');
    dispara(coluna('FAZENDO'), 'drop');
    expect(a.aoMover).toHaveBeenCalledTimes(1);
  });

  it('dragover só aceita (preventDefault) com cartão arrastado e em coluna diferente da origem', () => {
    montar();
    expect(dispara(coluna('FAZENDO'), 'dragover').defaultPrevented).toBe(false); // sem arrasto
    dispara(cart(1), 'dragstart');
    expect(dispara(coluna('FAZENDO'), 'dragover').defaultPrevented).toBe(true);
    expect(dispara(coluna('IDEALIZADO'), 'dragover').defaultPrevented).toBe(false); // própria coluna
  });

  it('dragenter marca a coluna alvo; dragleave e drop desmarcam; a própria coluna nunca é marcada', () => {
    montar();
    dispara(cart(1), 'dragstart');
    dispara(coluna('IDEALIZADO'), 'dragenter');
    expect(marcada('IDEALIZADO')).toBe(false);
    dispara(coluna('FAZENDO'), 'dragenter');
    expect(marcada('FAZENDO')).toBe(true);
    dispara(coluna('FAZENDO'), 'dragleave');
    expect(marcada('FAZENDO')).toBe(false);
    dispara(coluna('FAZENDO'), 'dragenter');
    dispara(coluna('FAZENDO'), 'drop');
    expect(marcada('FAZENDO')).toBe(false);
  });

  it('entrar em filhos da coluna (dragleave do pai) não apaga a marca: conta profundidade', () => {
    montar();
    dispara(cart(1), 'dragstart');
    dispara(coluna('FAZENDO'), 'dragenter');
    dispara(cart(2), 'dragenter'); // entrou no filho (o evento borbulha até a coluna: profundidade 2)
    dispara(coluna('FAZENDO'), 'dragleave'); // saiu do pai, mas ainda está dentro
    expect(marcada('FAZENDO')).toBe(true);
    dispara(cart(2), 'dragleave'); // saiu de verdade
    expect(marcada('FAZENDO')).toBe(false);
  });

  it('dragenter sem cartão arrastado não marca; dragend desmarca tudo', () => {
    montar();
    dispara(coluna('FAZENDO'), 'dragenter');
    expect(marcada('FAZENDO')).toBe(false);
    dispara(cart(1), 'dragstart');
    dispara(coluna('FAZENDO'), 'dragenter');
    dispara(cart(1), 'dragend');
    expect(marcada('FAZENDO')).toBe(false);
  });

  it('arrastar não quebra o clique no título nem o menu', () => {
    const a = { ...acoes(), aoMover: vi.fn(), aoEditar: vi.fn() };
    desenhar({ tipo: 'pronto', tarefas: [t(1, 'A', 'IDEALIZADO')] }, a);
    cart(1).querySelector<HTMLButtonElement>('.cartao-titulo')!.click();
    expect(a.aoEditar).toHaveBeenCalledWith(1);
    cart(1).querySelector<HTMLButtonElement>('.botao-mover')!.click();
    expect(cart(1).querySelector<HTMLElement>('.menu-mover-lista')!.hidden).toBe(false);
  });
});
