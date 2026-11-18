import {
  PRIORIDADES,
  STATUS,
  validarAtualizacao,
  validarNovaTarefa,
  type EdicaoTarefa,
  type ErroCampo,
  type NovaTarefa,
  type Prioridade,
  type Status,
  type Tarefa,
} from '../../shared/contrato.js';
import type { ErroApi, ResultadoAtualizacao, ResultadoCriacao, ResultadoExclusao } from './api.js';
import { ROTULOS_STATUS } from './inicio.js';

/** O que aconteceu com uma tarefa aberta em modo editar (o chamador recarrega e decide o foco). */
export interface ResultadoDialogo {
  tipo: 'editada' | 'excluida' | 'naoEncontrada';
  id: number;
}

export interface DepsDialogo {
  criarTarefa: (nova: NovaTarefa) => Promise<ResultadoCriacao>;
  atualizarTarefa: (id: number, parcial: Partial<EdicaoTarefa>) => Promise<ResultadoAtualizacao>;
  excluirTarefa: (id: number) => Promise<ResultadoExclusao>;
  /** Chamado depois de criar com sucesso (e de fechar o diálogo): o chamador recarrega a lista. */
  aoSalvo: () => void;
  /** Chamado depois de editar/excluir (e de fechar o diálogo) ou quando a tarefa sumiu (404 ao editar). */
  aoAlterado: (resultado: ResultadoDialogo) => void;
  /** "Hoje" local para a validação do prazo. Padrão: new Date() (não UTC). */
  hoje?: () => Date;
}

export interface Dialogo {
  elemento: HTMLDialogElement;
  /** Modo criar: sem campo status, nasce Idealizado. */
  abrir: () => void;
  /** Modo editar: formulário preenchido, campo status e botão "Excluir tarefa". */
  abrirEditar: (tarefa: Tarefa) => void;
}

type Campo = keyof EdicaoTarefa;
const CAMPOS_EDICAO: readonly Campo[] = ['titulo', 'prioridade', 'prazo', 'status'];
const CAMPOS_CRIACAO: readonly Campo[] = ['titulo', 'prioridade', 'prazo'];

type Modo = { tipo: 'criar' } | { tipo: 'editar'; tarefa: Tarefa };

const ROTULOS: Record<Prioridade, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
// Padrão Média (spec R-03): a opção já escolhida é válida e comum, sem "Escolha…" que obrigaria um clique extra.
const PRIORIDADE_PADRAO: Prioridade = 'MEDIA';
const STATUS_PADRAO: Status = 'IDEALIZADO';

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

function textoDaFalha(r: ErroApi): string {
  return r.tipo === 'validacao' ? 'Resposta inesperada do servidor.' : r.mensagem;
}

export function criarDialogo(doc: Document, deps: DepsDialogo): Dialogo {
  const hoje = deps.hoje ?? (() => new Date());

  const dialogo = doc.createElement('dialog');
  dialogo.className = 'dialogo';
  dialogo.setAttribute('aria-labelledby', 'dialogo-titulo');

  const form = doc.createElement('form');
  form.id = 'form-cadastro';
  form.noValidate = true; // a validação é a de shared/, igual à do servidor

  const h2 = doc.createElement('h2');
  h2.id = 'dialogo-titulo';

  const erroGeral = doc.createElement('p');
  erroGeral.id = 'erro-geral';
  erroGeral.className = 'erro-geral';
  erroGeral.setAttribute('role', 'alert');

  function linha(campo: Campo, rotulo: string, controle: HTMLInputElement | HTMLSelectElement) {
    controle.id = `campo-${campo}`;
    controle.name = campo;
    controle.setAttribute('aria-describedby', `erro-${campo}`);
    const label = doc.createElement('label');
    label.htmlFor = controle.id;
    label.textContent = rotulo;
    const erro = doc.createElement('p');
    erro.id = `erro-${campo}`;
    erro.className = 'erro-campo';
    erro.setAttribute('role', 'alert');
    const div = doc.createElement('div');
    div.className = 'campo';
    div.id = `linha-${campo}`;
    div.append(label, controle, erro);
    return { div, erro };
  }

  const titulo = doc.createElement('input');
  titulo.type = 'text';
  titulo.autocomplete = 'off';
  // Sem maxlength de propósito: o limite é validado e a mensagem aparece, em vez de cortar o texto em silêncio.

  const prioridade = doc.createElement('select');
  for (const p of [...PRIORIDADES].reverse()) {
    const o = doc.createElement('option');
    o.value = p;
    o.textContent = ROTULOS[p];
    prioridade.append(o);
  }

  const prazo = doc.createElement('input');
  prazo.type = 'date';

  const status = doc.createElement('select');
  for (const s of STATUS) {
    const o = doc.createElement('option');
    o.value = s;
    o.textContent = ROTULOS_STATUS[s];
    status.append(o);
  }

  const linhas = {
    titulo: linha('titulo', 'Título', titulo),
    prioridade: linha('prioridade', 'Prioridade', prioridade),
    prazo: linha('prazo', 'Prazo', prazo),
    status: linha('status', 'Status', status),
  };
  const entradas: Record<Campo, HTMLInputElement | HTMLSelectElement> = { titulo, prioridade, prazo, status };
  const erros: Record<Campo, HTMLElement> = {
    titulo: linhas.titulo.erro,
    prioridade: linhas.prioridade.erro,
    prazo: linhas.prazo.erro,
    status: linhas.status.erro,
  };
  linhas.status.div.hidden = true; // só aparece ao editar

  const salvar = doc.createElement('button');
  salvar.type = 'submit';
  salvar.id = 'botao-salvar';
  salvar.className = 'botao-primario';
  salvar.textContent = 'Salvar';

  const cancelar = doc.createElement('button');
  cancelar.type = 'button';
  cancelar.id = 'botao-cancelar';
  cancelar.className = 'botao-secundario';
  cancelar.textContent = 'Cancelar';

  const botaoExcluir = doc.createElement('button');
  botaoExcluir.type = 'button';
  botaoExcluir.id = 'botao-excluir';
  botaoExcluir.className = 'botao-perigo';
  botaoExcluir.textContent = 'Excluir tarefa';
  botaoExcluir.hidden = true; // só aparece ao editar

  const acoes = doc.createElement('div');
  acoes.className = 'dialogo-acoes';
  acoes.append(botaoExcluir, cancelar, salvar);

  form.append(
    h2,
    linhas.titulo.div,
    linhas.prioridade.div,
    linhas.prazo.div,
    linhas.status.div,
    erroGeral,
    acoes,
  );

  // Confirmação de exclusão (ADR 0010): painel dentro do mesmo diálogo, no lugar do formulário.
  const confirmacao = doc.createElement('section');
  confirmacao.id = 'confirmacao-exclusao';
  confirmacao.className = 'confirmacao';
  confirmacao.hidden = true;
  const textoConfirmacao = doc.createElement('p');
  textoConfirmacao.className = 'confirmacao-texto';
  const erroExclusao = doc.createElement('p');
  erroExclusao.id = 'erro-exclusao';
  erroExclusao.className = 'erro-geral';
  erroExclusao.setAttribute('role', 'alert');
  const excluirCancelar = doc.createElement('button');
  excluirCancelar.type = 'button';
  excluirCancelar.id = 'botao-excluir-cancelar';
  excluirCancelar.className = 'botao-secundario';
  excluirCancelar.textContent = 'Cancelar';
  const excluirSim = doc.createElement('button');
  excluirSim.type = 'button';
  excluirSim.id = 'botao-excluir-sim';
  excluirSim.className = 'botao-perigo';
  excluirSim.textContent = 'Sim, excluir';
  const acoesConfirmacao = doc.createElement('div');
  acoesConfirmacao.className = 'dialogo-acoes';
  acoesConfirmacao.append(excluirCancelar, excluirSim);
  confirmacao.append(textoConfirmacao, erroExclusao, acoesConfirmacao);

  dialogo.append(form, confirmacao);

  let modo: Modo = { tipo: 'criar' };
  let origem: Element | null = null; // quem tinha o foco ao abrir: recebe o foco de volta ao cancelar
  let concluido = false; // true quando o diálogo fecha por sucesso (o chamador cuida do foco)

  function camposAtivos(): readonly Campo[] {
    return modo.tipo === 'editar' ? CAMPOS_EDICAO : CAMPOS_CRIACAO;
  }

  function limparErros(): void {
    erroGeral.textContent = '';
    erroExclusao.textContent = '';
    for (const c of CAMPOS_EDICAO) {
      erros[c].textContent = '';
      entradas[c].removeAttribute('aria-invalid');
    }
  }

  function mostrarFormulario(): void {
    confirmacao.hidden = true;
    form.hidden = false;
  }

  function limparFormulario(): void {
    form.reset();
    titulo.value = '';
    prazo.value = '';
    prioridade.value = PRIORIDADE_PADRAO;
    status.value = STATUS_PADRAO;
    limparErros();
    mostrarFormulario();
  }

  function mostrarErros(lista: ErroCampo[]): void {
    limparErros();
    const ativos = camposAtivos();
    for (const e of lista) {
      if (!ativos.includes(e.campo)) continue; // ex.: o diálogo de criação não tem campo status
      erros[e.campo].textContent = e.mensagem;
      entradas[e.campo].setAttribute('aria-invalid', 'true');
    }
    const primeiro = ativos.find((c) => lista.some((e) => e.campo === c));
    if (primeiro) entradas[primeiro].focus();
  }

  let enviando = false;

  function definirEnviando(valor: boolean): void {
    enviando = valor;
    salvar.disabled = valor;
  }

  function fecharComSucesso(): void {
    concluido = true;
    dialogo.close(); // o evento 'close' limpa o formulário
  }

  function aoSubmeter(): void {
    if (enviando) return;
    if (modo.tipo === 'editar') {
      salvarEdicao(modo.tarefa);
      return;
    }
    const v = validarNovaTarefa(
      { titulo: titulo.value, prioridade: prioridade.value, prazo: prazo.value },
      hoje(),
    );
    if (!v.ok) {
      mostrarErros(v.erros);
      return;
    }
    limparErros();
    definirEnviando(true);
    void deps
      .criarTarefa(v.valor)
      .then((r) => {
        if (r.ok) {
          fecharComSucesso();
          deps.aoSalvo();
        } else if (r.tipo === 'validacao') {
          mostrarErros(r.erros);
        } else {
          erroGeral.textContent = `Não foi possível salvar. ${r.mensagem}`;
        }
      })
      .finally(() => definirEnviando(false));
  }

  function salvarEdicao(atual: Tarefa): void {
    // Só o que mudou vai no PATCH. O prazo vencido não alterado nem entra, então nunca é rejeitado.
    const mudou: Partial<Record<Campo, string>> = {};
    if (titulo.value.trim() !== atual.titulo) mudou.titulo = titulo.value;
    if (prioridade.value !== atual.prioridade) mudou.prioridade = prioridade.value;
    if (prazo.value !== atual.prazo) mudou.prazo = prazo.value;
    if (status.value !== atual.status) mudou.status = status.value;
    if (Object.keys(mudou).length === 0) {
      dialogo.close(); // nada a salvar: fecha como cancelar (foco volta a quem abriu)
      return;
    }
    const v = validarAtualizacao(mudou, atual, hoje());
    if (!v.ok) {
      mostrarErros(v.erros);
      return;
    }
    const parcial: Partial<EdicaoTarefa> = {};
    if (mudou.titulo !== undefined) parcial.titulo = v.valor.titulo;
    if (mudou.prioridade !== undefined) parcial.prioridade = v.valor.prioridade;
    if (mudou.prazo !== undefined) parcial.prazo = v.valor.prazo;
    if (mudou.status !== undefined) parcial.status = v.valor.status;
    limparErros();
    definirEnviando(true);
    void deps
      .atualizarTarefa(atual.id, parcial)
      .then((r) => {
        if (r.ok) {
          fecharComSucesso();
          deps.aoAlterado({ tipo: 'editada', id: atual.id });
          return;
        }
        switch (r.tipo) {
          case 'naoEncontrada':
            fecharComSucesso();
            deps.aoAlterado({ tipo: 'naoEncontrada', id: atual.id });
            break;
          case 'validacao':
            mostrarErros(r.erros);
            break;
          case 'rede':
          case 'servidor':
            erroGeral.textContent = `Não foi possível salvar. ${r.mensagem}`;
            break;
          default: {
            const _exaustivo: never = r;
            return _exaustivo;
          }
        }
      })
      .finally(() => definirEnviando(false));
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    aoSubmeter();
  });

  cancelar.addEventListener('click', () => dialogo.close());

  botaoExcluir.addEventListener('click', () => {
    if (modo.tipo !== 'editar') return;
    textoConfirmacao.textContent = `Excluir '${modo.tarefa.titulo}'? Não dá para desfazer.`; // texto puro
    erroExclusao.textContent = '';
    form.hidden = true;
    confirmacao.hidden = false;
    excluirCancelar.focus(); // o botão seguro recebe o foco
  });

  function voltarDaConfirmacao(): void {
    mostrarFormulario();
    erroExclusao.textContent = '';
    botaoExcluir.focus();
  }

  excluirCancelar.addEventListener('click', voltarDaConfirmacao);

  // Esc (evento 'cancel') na confirmação só volta ao formulário; no formulário, fecha normalmente.
  dialogo.addEventListener('cancel', (ev) => {
    if (!confirmacao.hidden) {
      ev.preventDefault();
      voltarDaConfirmacao();
    }
  });

  let excluindo = false;
  excluirSim.addEventListener('click', () => {
    if (excluindo || modo.tipo !== 'editar') return;
    const id = modo.tarefa.id;
    excluindo = true;
    excluirSim.disabled = true;
    erroExclusao.textContent = '';
    void deps
      .excluirTarefa(id)
      .then((r) => {
        if (r.ok) {
          fecharComSucesso();
          deps.aoAlterado({ tipo: 'excluida', id });
          return;
        }
        switch (r.tipo) {
          case 'naoEncontrada': // já não existe: o objetivo foi atingido
            fecharComSucesso();
            deps.aoAlterado({ tipo: 'excluida', id });
            break;
          case 'validacao':
          case 'rede':
          case 'servidor':
            erroExclusao.textContent = `Não foi possível excluir. ${textoDaFalha(r)}`;
            break;
          default: {
            const _exaustivo: never = r;
            return _exaustivo;
          }
        }
      })
      .finally(() => {
        excluindo = false;
        excluirSim.disabled = false;
      });
  });

  // Fechar (Esc, Cancelar ou sucesso) sempre descarta dados e erros.
  dialogo.addEventListener('close', () => {
    limparFormulario();
    if (!concluido && origem instanceof HTMLElement && origem.isConnected) origem.focus();
    origem = null;
  });

  function abrirComo(novo: Modo): void {
    modo = novo;
    concluido = false;
    origem = doc.activeElement;
    limparFormulario();
    const editando = novo.tipo === 'editar';
    h2.textContent = editando ? 'Editar tarefa' : 'Adicionar tarefa';
    linhas.status.div.hidden = !editando;
    botaoExcluir.hidden = !editando;
    const hojeTexto = diaLocal(hoje());
    if (novo.tipo === 'editar') {
      const t = novo.tarefa;
      titulo.value = t.titulo;
      prioridade.value = t.prioridade;
      prazo.value = t.prazo;
      status.value = t.status;
      // Prazo já vencido: sem min, para o valor atual continuar válido no campo (ADR 0010).
      if (t.prazo < hojeTexto) prazo.removeAttribute('min');
      else prazo.min = hojeTexto;
    } else {
      prazo.min = hojeTexto;
    }
    if (!dialogo.open) dialogo.showModal();
    titulo.focus();
  }

  return {
    elemento: dialogo,
    abrir: () => abrirComo({ tipo: 'criar' }),
    abrirEditar: (tarefa) => abrirComo({ tipo: 'editar', tarefa }),
  };
}
