// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NovaTarefa, Tarefa } from '../../shared/contrato.js';
import type { ResultadoCriacao } from './api.js';
import { criarDialogo } from './dialogo.js';

// jsdom não implementa showModal/close por completo: stub mínimo (abre/fecha e dispara 'close').
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  document.body.innerHTML = '';
});

const HOJE = new Date(2030, 5, 15, 23, 30); // 15/06/2030 23:30 local
const criada: Tarefa = { id: 1, titulo: 'Pagar conta', prioridade: 'MEDIA', prazo: '2030-06-20', status: 'IDEALIZADO' };

function montar(resp: ResultadoCriacao | Promise<ResultadoCriacao> = { ok: true, tarefa: criada }) {
  const criarTarefa = vi.fn<(n: NovaTarefa) => Promise<ResultadoCriacao>>(async () => resp);
  const aoSalvo = vi.fn();
  // O modo criar não usa atualizar/excluir: se algum for chamado, o teste deve falhar.
  const atualizarTarefa = vi.fn(async (): Promise<never> => {
    throw new Error('atualizarTarefa não deveria ser chamada ao criar');
  });
  const excluirTarefa = vi.fn(async (): Promise<never> => {
    throw new Error('excluirTarefa não deveria ser chamada ao criar');
  });
  const d = criarDialogo(document, {
    criarTarefa,
    atualizarTarefa,
    excluirTarefa,
    aoSalvo,
    aoAlterado: vi.fn(),
    hoje: () => HOJE,
  });
  document.body.append(d.elemento);
  d.abrir();
  return { d, criarTarefa, aoSalvo };
}

const campo = <T extends HTMLElement>(id: string) => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} ausente`);
  return e as T;
};
const titulo = () => campo<HTMLInputElement>('campo-titulo');
const prioridade = () => campo<HTMLSelectElement>('campo-prioridade');
const prazo = () => campo<HTMLInputElement>('campo-prazo');
const erroDe = (nome: string) => campo<HTMLElement>(`erro-${nome}`);
const salvar = () => campo<HTMLButtonElement>('botao-salvar');
const cancelar = () => campo<HTMLButtonElement>('botao-cancelar');
const enviar = () => campo<HTMLFormElement>('form-cadastro').requestSubmit();
const esperar = () => new Promise((r) => setTimeout(r, 0));

function preencher(t: string, p: string, d: string) {
  titulo().value = t;
  prioridade().value = p;
  prazo().value = d;
}

describe('estrutura do diálogo', () => {
  it('abre com showModal, tem rótulos reais, Média como padrão e min = hoje local', () => {
    const { d } = montar();
    expect(d.elemento.open).toBe(true);
    for (const id of ['campo-titulo', 'campo-prioridade', 'campo-prazo']) {
      expect(document.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
    expect(prioridade().value).toBe('MEDIA');
    expect([...prioridade().options].map((o) => [o.value, o.textContent])).toEqual([
      ['ALTA', 'Alta'],
      ['MEDIA', 'Média'],
      ['BAIXA', 'Baixa'],
    ]);
    expect(prazo().type).toBe('date');
    expect(prazo().min).toBe('2030-06-15');
    expect(titulo().hasAttribute('maxlength')).toBe(false);
    expect(salvar().textContent).toBe('Salvar');
    expect(cancelar().textContent).toBe('Cancelar');
  });
});

describe('validação no cliente', () => {
  it.each([
    ['título vazio', '   ', 'ALTA', '2030-06-20', 'titulo', /título/i],
    ['título com 101 caracteres', 'x'.repeat(101), 'ALTA', '2030-06-20', 'titulo', /100/],
    ['prazo ontem', 'ok', 'ALTA', '2030-06-14', 'prazo', /anterior a hoje/i],
    ['prazo ausente', 'ok', 'ALTA', '', 'prazo', /prazo/i],
    ['prioridade ausente', 'ok', '', '2030-06-20', 'prioridade', /prioridade/i],
  ])('%s: erro no campo certo, sem chamar a API', (_n, t, p, d, nome, msg) => {
    const { criarTarefa } = montar();
    // prioridade ausente: injeta opção vazia, como um DOM adulterado.
    if (p === '') prioridade().add(new Option('', ''));
    preencher(t, p, d);
    enviar();
    expect(criarTarefa).not.toHaveBeenCalled();
    expect(erroDe(nome).textContent).toMatch(msg);
    const el = campo(`campo-${nome}`);
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toContain(`erro-${nome}`);
    expect(erroDe(nome).getAttribute('role')).toBe('alert');
    for (const outro of ['titulo', 'prioridade', 'prazo'].filter((x) => x !== nome)) {
      expect(erroDe(outro).textContent).toBe('');
      expect(campo(`campo-${outro}`).getAttribute('aria-invalid')).not.toBe('true');
    }
  });

  it('foca o primeiro campo com erro', () => {
    montar();
    preencher('', 'ALTA', '2030-06-14');
    enviar();
    expect(document.activeElement).toBe(titulo());
    preencher('ok', 'ALTA', '2030-06-14');
    enviar();
    expect(document.activeElement).toBe(prazo());
  });

  it('corrigir e reenviar limpa o erro anterior', async () => {
    const { criarTarefa } = montar();
    preencher('', 'ALTA', '2030-06-20');
    enviar();
    expect(erroDe('titulo').textContent).not.toBe('');
    preencher('ok', 'ALTA', '2030-06-20');
    enviar();
    await esperar();
    expect(criarTarefa).toHaveBeenCalledTimes(1);
    expect(erroDe('titulo').textContent).toBe('');
    expect(titulo().getAttribute('aria-invalid')).not.toBe('true');
  });
});

describe('salvar', () => {
  it('válido chama a API com título aparado, fecha, limpa o formulário e avisa para recarregar', async () => {
    const { d, criarTarefa, aoSalvo } = montar();
    preencher('  Pagar conta  ', 'ALTA', '2030-06-20');
    enviar();
    await esperar();
    expect(criarTarefa).toHaveBeenCalledWith({ titulo: 'Pagar conta', prioridade: 'ALTA', prazo: '2030-06-20' });
    expect(d.elemento.open).toBe(false);
    expect(aoSalvo).toHaveBeenCalledTimes(1);
    expect(titulo().value).toBe('');
    expect(prazo().value).toBe('');
    expect(prioridade().value).toBe('MEDIA');
  });

  it('aceita o prazo de hoje (data local, não UTC)', async () => {
    const { criarTarefa } = montar();
    preencher('ok', 'BAIXA', '2030-06-15');
    enviar();
    await esperar();
    expect(criarTarefa).toHaveBeenCalledTimes(1);
  });

  it('duplo clique em Salvar faz uma só chamada e desabilita o botão durante a requisição', async () => {
    let liberar: (r: ResultadoCriacao) => void = () => {};
    const pendente = new Promise<ResultadoCriacao>((r) => (liberar = r));
    const { criarTarefa } = montar(pendente);
    preencher('ok', 'ALTA', '2030-06-20');
    salvar().click();
    expect(salvar().disabled).toBe(true);
    salvar().click();
    enviar();
    expect(criarTarefa).toHaveBeenCalledTimes(1);
    liberar({ ok: true, tarefa: criada });
    await esperar();
    expect(salvar().disabled).toBe(false);
  });
});

describe('falhas do servidor', () => {
  it('400 mapeia os erros nos campos, mantém o diálogo aberto e os dados', async () => {
    const { d, aoSalvo } = montar({
      ok: false,
      tipo: 'validacao',
      erros: [
        { campo: 'prazo', mensagem: 'Prazo recusado pelo servidor.' },
        { campo: 'titulo', mensagem: 'Título recusado pelo servidor.' },
      ],
    });
    preencher('ok', 'ALTA', '2030-06-20');
    enviar();
    await esperar();
    expect(erroDe('prazo').textContent).toBe('Prazo recusado pelo servidor.');
    expect(erroDe('titulo').textContent).toBe('Título recusado pelo servidor.');
    expect(document.activeElement).toBe(titulo());
    expect(d.elemento.open).toBe(true);
    expect(prazo().value).toBe('2030-06-20');
    expect(aoSalvo).not.toHaveBeenCalled();
    expect(salvar().disabled).toBe(false);
  });

  it.each([
    ['rede', 'Sem conexão X'],
    ['servidor', 'Servidor Y'],
  ] as const)('falha de %s mostra mensagem no diálogo e mantém os dados', async (tipo, mensagem) => {
    const { d, aoSalvo } = montar({ ok: false, tipo, mensagem });
    preencher('Meu título', 'BAIXA', '2030-06-20');
    enviar();
    await esperar();
    const geral = campo('erro-geral');
    expect(geral.textContent).toContain('Não foi possível salvar');
    expect(geral.textContent).toContain(mensagem);
    expect(geral.getAttribute('role')).toBe('alert');
    expect(d.elemento.open).toBe(true);
    expect(titulo().value).toBe('Meu título');
    expect(prioridade().value).toBe('BAIXA');
    expect(prazo().value).toBe('2030-06-20');
    expect(aoSalvo).not.toHaveBeenCalled();
    expect(salvar().disabled).toBe(false);
  });
});

describe('cancelar', () => {
  it('Cancelar fecha sem chamar a API e limpa dados e erros', () => {
    const { d, criarTarefa, aoSalvo } = montar();
    preencher('', 'ALTA', '2030-06-14');
    enviar();
    expect(erroDe('titulo').textContent).not.toBe('');
    cancelar().click();
    expect(d.elemento.open).toBe(false);
    expect(criarTarefa).not.toHaveBeenCalled();
    expect(aoSalvo).not.toHaveBeenCalled();
    expect(erroDe('titulo').textContent).toBe('');
    expect(erroDe('prazo').textContent).toBe('');
    expect(titulo().getAttribute('aria-invalid')).not.toBe('true');
    expect(prazo().value).toBe('');
  });

  it('Esc (evento close nativo) também limpa erros e dados', () => {
    const { d } = montar();
    preencher('abc', 'ALTA', '2030-06-14');
    enviar();
    d.elemento.close();
    expect(erroDe('prazo').textContent).toBe('');
    expect(titulo().value).toBe('');
  });

  it('reabrir depois de erro mostra o formulário limpo', () => {
    const { d } = montar();
    preencher('', 'ALTA', '');
    enviar();
    d.elemento.close();
    d.abrir();
    expect(erroDe('titulo').textContent).toBe('');
    expect(d.elemento.open).toBe(true);
  });
});
