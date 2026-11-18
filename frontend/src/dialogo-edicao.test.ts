// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EdicaoTarefa, NovaTarefa, Tarefa } from '../../shared/contrato.js';
import type { ResultadoAtualizacao, ResultadoCriacao, ResultadoExclusao } from './api.js';
import { criarDialogo, type ResultadoDialogo } from './dialogo.js';

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

const HOJE = new Date(2030, 5, 15, 12, 0); // 15/06/2030
const tarefa: Tarefa = { id: 7, titulo: 'Pagar conta', prioridade: 'MEDIA', prazo: '2030-06-20', status: 'IDEALIZADO' };
const vencida: Tarefa = { ...tarefa, id: 8, titulo: 'Atrasada', prazo: '2030-06-01', prioridade: 'ALTA', status: 'FAZENDO' };

interface Opcoes {
  atualizar?: ResultadoAtualizacao | Promise<ResultadoAtualizacao>;
  excluir?: ResultadoExclusao | Promise<ResultadoExclusao>;
  tarefa?: Tarefa;
}

function montar(o: Opcoes = {}) {
  const t = o.tarefa ?? tarefa;
  const atualizarTarefa = vi.fn<(id: number, p: Partial<EdicaoTarefa>) => Promise<ResultadoAtualizacao>>(
    async () => o.atualizar ?? { ok: true, tarefa: t },
  );
  const excluirTarefa = vi.fn<(id: number) => Promise<ResultadoExclusao>>(async () => o.excluir ?? { ok: true });
  const criarTarefa = vi.fn<(n: NovaTarefa) => Promise<ResultadoCriacao>>(async () => ({ ok: true, tarefa: t }));
  const aoSalvo = vi.fn();
  const aoAlterado = vi.fn<(r: ResultadoDialogo) => void>();
  const d = criarDialogo(document, { criarTarefa, atualizarTarefa, excluirTarefa, aoSalvo, aoAlterado, hoje: () => HOJE });
  document.body.append(d.elemento);
  d.abrirEditar(t);
  return { d, atualizarTarefa, excluirTarefa, criarTarefa, aoSalvo, aoAlterado };
}

const campo = <T extends HTMLElement>(id: string) => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} ausente`);
  return e as T;
};
const titulo = () => campo<HTMLInputElement>('campo-titulo');
const prioridade = () => campo<HTMLSelectElement>('campo-prioridade');
const prazo = () => campo<HTMLInputElement>('campo-prazo');
const status = () => campo<HTMLSelectElement>('campo-status');
const erroDe = (nome: string) => campo<HTMLElement>(`erro-${nome}`);
const salvar = () => campo<HTMLButtonElement>('botao-salvar');
const excluir = () => campo<HTMLButtonElement>('botao-excluir');
const enviar = () => campo<HTMLFormElement>('form-cadastro').requestSubmit();
const esperar = () => new Promise((r) => setTimeout(r, 0));
const botaoPorTexto = (texto: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === texto);

describe('abrir em modo editar', () => {
  it('preenche os quatro campos, mostra o status e foca o título', () => {
    const { d } = montar({ tarefa: vencida });
    expect(d.elemento.open).toBe(true);
    expect(campo('dialogo-titulo').textContent).toBe('Editar tarefa');
    expect(titulo().value).toBe('Atrasada');
    expect(prioridade().value).toBe('ALTA');
    expect(prazo().value).toBe('2030-06-01');
    expect(status().value).toBe('FAZENDO');
    expect(campo('linha-status').hidden).toBe(false);
    expect([...status().options].map((o) => o.textContent)).toEqual(['Idealizado', 'Fazendo', 'Concluído', 'Abandonado']);
    expect(document.querySelector('label[for="campo-status"]')).not.toBeNull();
    expect(document.activeElement).toBe(titulo());
  });

  it('prazo já vencido: sem min (não invalida o valor); prazo futuro: min = hoje', () => {
    montar({ tarefa: vencida });
    expect(prazo().min).toBe('');
    document.body.innerHTML = '';
    montar();
    expect(prazo().min).toBe('2030-06-15');
  });

  it('o modo criar continua sem campo status, sem Excluir, com título "Adicionar tarefa"', () => {
    const { d } = montar();
    d.elemento.close();
    d.abrir();
    expect(campo('dialogo-titulo').textContent).toBe('Adicionar tarefa');
    expect(campo('linha-status').hidden).toBe(true);
    expect(excluir().hidden).toBe(true);
    expect(titulo().value).toBe('');
  });
});

describe('salvar edição', () => {
  it('envia só o que mudou, com o id certo, fecha e avisa', async () => {
    const { d, atualizarTarefa, aoAlterado } = montar();
    titulo().value = '  Novo nome ';
    enviar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledTimes(1);
    expect(atualizarTarefa).toHaveBeenCalledWith(7, { titulo: 'Novo nome' });
    expect(d.elemento.open).toBe(false);
    expect(aoAlterado).toHaveBeenCalledWith({ tipo: 'editada', id: 7 });
  });

  it('mudar o status e a prioridade envia os dois campos', async () => {
    const { atualizarTarefa } = montar();
    status().value = 'CONCLUIDO';
    prioridade().value = 'ALTA';
    enviar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledWith(7, { prioridade: 'ALTA', status: 'CONCLUIDO' });
  });

  it('sem alteração fecha sem chamar a API', async () => {
    const { d, atualizarTarefa, aoAlterado } = montar();
    enviar();
    await esperar();
    expect(atualizarTarefa).not.toHaveBeenCalled();
    expect(d.elemento.open).toBe(false);
    expect(aoAlterado).not.toHaveBeenCalled();
  });

  it('tarefa vencida: editar só o título salva sem erro de prazo', async () => {
    const { atualizarTarefa } = montar({ tarefa: vencida });
    titulo().value = 'Atrasada, mas viva';
    enviar();
    await esperar();
    expect(erroDe('prazo').textContent).toBe('');
    expect(atualizarTarefa).toHaveBeenCalledWith(8, { titulo: 'Atrasada, mas viva' });
  });

  it('tarefa vencida: trocar para OUTRA data passada dá erro no prazo e não chama a API', () => {
    const { atualizarTarefa } = montar({ tarefa: vencida });
    prazo().value = '2030-06-02';
    enviar();
    expect(atualizarTarefa).not.toHaveBeenCalled();
    expect(erroDe('prazo').textContent).toMatch(/anterior a hoje/i);
    expect(prazo().getAttribute('aria-invalid')).toBe('true');
  });

  it('tarefa vencida: mudar para uma data de hoje é aceito', async () => {
    const { atualizarTarefa } = montar({ tarefa: vencida });
    prazo().value = '2030-06-15';
    enviar();
    await esperar();
    expect(atualizarTarefa).toHaveBeenCalledWith(8, { prazo: '2030-06-15' });
  });

  it.each([
    ['título vazio', () => (titulo().value = '   '), 'titulo', /título/i],
    ['título com 101 caracteres', () => (titulo().value = 'x'.repeat(101)), 'titulo', /100/],
    ['prazo apagado', () => (prazo().value = ''), 'prazo', /prazo/i],
  ])('%s: erro no campo, aria, foco e nenhuma chamada', (_n, mexer, nome, msg) => {
    const { atualizarTarefa } = montar();
    mexer();
    enviar();
    expect(atualizarTarefa).not.toHaveBeenCalled();
    expect(erroDe(nome).textContent).toMatch(msg);
    expect(erroDe(nome).getAttribute('role')).toBe('alert');
    expect(campo(`campo-${nome}`).getAttribute('aria-invalid')).toBe('true');
    expect(campo(`campo-${nome}`).getAttribute('aria-describedby')).toContain(`erro-${nome}`);
    expect(document.activeElement).toBe(campo(`campo-${nome}`));
  });

  it('duplo clique em Salvar faz uma só chamada e desabilita o botão', async () => {
    let liberar: (r: ResultadoAtualizacao) => void = () => {};
    const pendente = new Promise<ResultadoAtualizacao>((r) => (liberar = r));
    const { atualizarTarefa } = montar({ atualizar: pendente });
    titulo().value = 'Outro';
    salvar().click();
    expect(salvar().disabled).toBe(true);
    salvar().click();
    enviar();
    expect(atualizarTarefa).toHaveBeenCalledTimes(1);
    liberar({ ok: true, tarefa });
    await esperar();
    expect(salvar().disabled).toBe(false);
  });
});

describe('falhas ao salvar edição', () => {
  it('400 do servidor vai para os campos (inclusive status), mantém aberto e os dados', async () => {
    const { d, aoAlterado } = montar({
      atualizar: {
        ok: false,
        tipo: 'validacao',
        erros: [
          { campo: 'status', mensagem: 'Status recusado.' },
          { campo: 'prazo', mensagem: 'Prazo recusado.' },
        ],
      },
    });
    titulo().value = 'Novo';
    status().value = 'FAZENDO';
    enviar();
    await esperar();
    expect(erroDe('status').textContent).toBe('Status recusado.');
    expect(status().getAttribute('aria-invalid')).toBe('true');
    expect(erroDe('prazo').textContent).toBe('Prazo recusado.');
    expect(document.activeElement).toBe(prazo()); // primeiro na ordem da tela: título, prioridade, prazo, status
    expect(d.elemento.open).toBe(true);
    expect(titulo().value).toBe('Novo');
    expect(aoAlterado).not.toHaveBeenCalled();
    expect(salvar().disabled).toBe(false);
  });

  it('404 fecha o diálogo e avisa que a tarefa não existe mais', async () => {
    const { d, aoAlterado } = montar({ atualizar: { ok: false, tipo: 'naoEncontrada' } });
    titulo().value = 'Novo';
    enviar();
    await esperar();
    expect(d.elemento.open).toBe(false);
    expect(aoAlterado).toHaveBeenCalledWith({ tipo: 'naoEncontrada', id: 7 });
  });

  it.each([
    ['rede', 'Sem conexão X'],
    ['servidor', 'Servidor Y'],
  ] as const)('falha de %s: mensagem no diálogo, dados mantidos, nada fecha', async (tipo, mensagem) => {
    const { d, aoAlterado } = montar({ atualizar: { ok: false, tipo, mensagem } });
    titulo().value = 'Meu novo título';
    status().value = 'ABANDONADO';
    enviar();
    await esperar();
    const geral = campo('erro-geral');
    expect(geral.textContent).toContain('Não foi possível salvar');
    expect(geral.textContent).toContain(mensagem);
    expect(geral.getAttribute('role')).toBe('alert');
    expect(d.elemento.open).toBe(true);
    expect(titulo().value).toBe('Meu novo título');
    expect(status().value).toBe('ABANDONADO');
    expect(aoAlterado).not.toHaveBeenCalled();
    expect(salvar().disabled).toBe(false);
  });
});

describe('cancelar edição', () => {
  it('Cancelar fecha sem API e devolve o foco a quem abriu o diálogo', () => {
    const origem = document.createElement('button');
    document.body.append(origem);
    origem.focus();
    const { d, atualizarTarefa } = montar();
    titulo().value = 'mudei';
    campo<HTMLButtonElement>('botao-cancelar').click();
    expect(d.elemento.open).toBe(false);
    expect(atualizarTarefa).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(origem);
  });
});

describe('excluir com confirmação', () => {
  const pedirExclusao = () => excluir().click();

  it('o botão "Excluir tarefa" só pede confirmação: nada é chamado ainda', () => {
    const { excluirTarefa } = montar();
    expect(excluir().textContent).toBe('Excluir tarefa');
    pedirExclusao();
    expect(excluirTarefa).not.toHaveBeenCalled();
    const conf = campo('confirmacao-exclusao');
    expect(conf.hidden).toBe(false);
    expect(conf.textContent).toContain("Excluir 'Pagar conta'? Não dá para desfazer.");
    expect(campo<HTMLFormElement>('form-cadastro').hidden).toBe(true);
  });

  it('o foco inicial da confirmação é "Cancelar"', () => {
    montar();
    pedirExclusao();
    expect(document.activeElement).toBe(campo('botao-excluir-cancelar'));
    expect(campo('botao-excluir-cancelar').textContent).toBe('Cancelar');
  });

  it('Cancelar volta ao formulário sem excluir, com o diálogo aberto e o foco em Excluir', () => {
    const { d, excluirTarefa } = montar();
    titulo().value = 'em edição';
    pedirExclusao();
    campo('botao-excluir-cancelar').click();
    expect(excluirTarefa).not.toHaveBeenCalled();
    expect(d.elemento.open).toBe(true);
    expect(campo('confirmacao-exclusao').hidden).toBe(true);
    expect(campo<HTMLFormElement>('form-cadastro').hidden).toBe(false);
    expect(titulo().value).toBe('em edição');
    expect(document.activeElement).toBe(excluir());
  });

  it('Esc na confirmação volta ao formulário em vez de fechar o diálogo', () => {
    const { d, excluirTarefa } = montar();
    pedirExclusao();
    const esc = new Event('cancel', { cancelable: true });
    d.elemento.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true);
    expect(campo('confirmacao-exclusao').hidden).toBe(true);
    expect(d.elemento.open).toBe(true);
    expect(excluirTarefa).not.toHaveBeenCalled();
  });

  it('Esc fora da confirmação não é interceptado (fecha normalmente)', () => {
    const { d } = montar();
    const esc = new Event('cancel', { cancelable: true });
    d.elemento.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(false);
  });

  it('"Sim, excluir" chama excluirTarefa com o id, fecha e avisa', async () => {
    const { d, excluirTarefa, aoAlterado } = montar();
    pedirExclusao();
    botaoPorTexto('Sim, excluir')?.click();
    await esperar();
    expect(excluirTarefa).toHaveBeenCalledTimes(1);
    expect(excluirTarefa).toHaveBeenCalledWith(7);
    expect(d.elemento.open).toBe(false);
    expect(aoAlterado).toHaveBeenCalledWith({ tipo: 'excluida', id: 7 });
  });

  it('404 ao excluir conta como sucesso (a tarefa já não existe)', async () => {
    const { d, aoAlterado } = montar({ excluir: { ok: false, tipo: 'naoEncontrada' } });
    pedirExclusao();
    botaoPorTexto('Sim, excluir')?.click();
    await esperar();
    expect(d.elemento.open).toBe(false);
    expect(aoAlterado).toHaveBeenCalledWith({ tipo: 'excluida', id: 7 });
  });

  it('duplo clique em "Sim, excluir" faz uma só chamada', () => {
    const { excluirTarefa } = montar({ excluir: new Promise(() => {}) });
    pedirExclusao();
    const sim = botaoPorTexto('Sim, excluir');
    sim?.click();
    sim?.click();
    expect(excluirTarefa).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['rede', 'Sem conexão X'],
    ['servidor', 'Servidor Y'],
  ] as const)('falha de %s ao excluir: mensagem, continua na confirmação, nada fecha', async (tipo, mensagem) => {
    const { d, aoAlterado } = montar({ excluir: { ok: false, tipo, mensagem } });
    pedirExclusao();
    botaoPorTexto('Sim, excluir')?.click();
    await esperar();
    const erro = campo('erro-exclusao');
    expect(erro.textContent).toContain('Não foi possível excluir');
    expect(erro.textContent).toContain(mensagem);
    expect(erro.getAttribute('role')).toBe('alert');
    expect(d.elemento.open).toBe(true);
    expect(campo('confirmacao-exclusao').hidden).toBe(false);
    expect(aoAlterado).not.toHaveBeenCalled();
    expect(botaoPorTexto('Sim, excluir')).toHaveProperty('disabled', false); // dá para tentar de novo
  });

  it('o título com HTML aparece como texto na confirmação', () => {
    montar({ tarefa: { ...tarefa, titulo: '<img src=x onerror=alert(1)>' } });
    pedirExclusao();
    expect(campo('confirmacao-exclusao').querySelector('img')).toBeNull();
    expect(campo('confirmacao-exclusao').textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('reabrir depois de fechar na confirmação mostra o formulário, não a confirmação', () => {
    const { d } = montar();
    pedirExclusao();
    d.elemento.close();
    d.abrirEditar(tarefa);
    expect(campo('confirmacao-exclusao').hidden).toBe(true);
    expect(campo<HTMLFormElement>('form-cadastro').hidden).toBe(false);
  });
});
