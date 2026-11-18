import { PRIORIDADES, validarNovaTarefa, type ErroCampo, type NovaTarefa, type Prioridade } from '../../shared/contrato.js';
import type { ResultadoCriacao } from './api.js';

export interface DepsDialogo {
  criarTarefa: (nova: NovaTarefa) => Promise<ResultadoCriacao>;
  /** Chamado depois de salvar com sucesso (e de fechar o diálogo): o chamador recarrega a lista. */
  aoSalvo: () => void;
  /** "Hoje" local para a validação do prazo. Padrão: new Date() (não UTC). */
  hoje?: () => Date;
}

export interface Dialogo {
  elemento: HTMLDialogElement;
  abrir: () => void;
}

type Campo = keyof NovaTarefa;
const CAMPOS: readonly Campo[] = ['titulo', 'prioridade', 'prazo'];

const ROTULOS: Record<Prioridade, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
// Padrão Média (spec R-03): a opção já escolhida é válida e comum, sem "Escolha…" que obrigaria um clique extra.
const PRIORIDADE_PADRAO: Prioridade = 'MEDIA';

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
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
  h2.textContent = 'Adicionar tarefa';

  const erroGeral = doc.createElement('p');
  erroGeral.id = 'erro-geral';
  erroGeral.className = 'erro-geral';
  erroGeral.setAttribute('role', 'alert');

  const entradas = {} as Record<Campo, HTMLInputElement | HTMLSelectElement>;
  const erros = {} as Record<Campo, HTMLElement>;

  function linha(campo: Campo, rotulo: string, controle: HTMLInputElement | HTMLSelectElement): HTMLElement {
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
    entradas[campo] = controle;
    erros[campo] = erro;
    const div = doc.createElement('div');
    div.className = 'campo';
    div.append(label, controle, erro);
    return div;
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

  const acoes = doc.createElement('div');
  acoes.className = 'dialogo-acoes';
  acoes.append(cancelar, salvar);

  form.append(
    h2,
    linha('titulo', 'Título', titulo),
    linha('prioridade', 'Prioridade', prioridade),
    linha('prazo', 'Prazo', prazo),
    erroGeral,
    acoes,
  );
  dialogo.append(form);

  function limparErros(): void {
    erroGeral.textContent = '';
    for (const c of CAMPOS) {
      erros[c].textContent = '';
      entradas[c].removeAttribute('aria-invalid');
    }
  }

  function limparFormulario(): void {
    form.reset();
    titulo.value = '';
    prazo.value = '';
    prioridade.value = PRIORIDADE_PADRAO;
    limparErros();
  }

  function mostrarErros(lista: ErroCampo[]): void {
    limparErros();
    for (const e of lista) {
      if (e.campo === 'status') continue; // o diálogo de criação não tem campo status
      erros[e.campo].textContent = e.mensagem;
      entradas[e.campo].setAttribute('aria-invalid', 'true');
    }
    const primeiro = CAMPOS.find((c) => lista.some((e) => e.campo === c));
    if (primeiro) entradas[primeiro].focus();
  }

  let enviando = false;

  function definirEnviando(valor: boolean): void {
    enviando = valor;
    salvar.disabled = valor;
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (enviando) return;
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
          dialogo.close(); // o evento 'close' limpa o formulário
          deps.aoSalvo();
        } else if (r.tipo === 'validacao') {
          mostrarErros(r.erros);
        } else {
          erroGeral.textContent = `Não foi possível salvar. ${r.mensagem}`;
        }
      })
      .finally(() => definirEnviando(false));
  });

  cancelar.addEventListener('click', () => dialogo.close());
  // Esc (evento nativo) e Cancelar passam por aqui: fechar sempre descarta dados e erros.
  dialogo.addEventListener('close', limparFormulario);

  return {
    elemento: dialogo,
    abrir: () => {
      limparFormulario();
      prazo.min = diaLocal(hoje());
      if (!dialogo.open) dialogo.showModal();
    },
  };
}
