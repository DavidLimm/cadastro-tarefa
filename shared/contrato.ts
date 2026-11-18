// Contrato compartilhado entre backend e frontend (importado por caminho relativo).

export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

/** A ordem do array é a ordem das colunas do quadro. */
export const STATUS = ['IDEALIZADO', 'FAZENDO', 'CONCLUIDO', 'ABANDONADO'] as const;
export type Status = (typeof STATUS)[number];

export interface NovaTarefa {
  titulo: string;
  prioridade: Prioridade;
  /** Formato YYYY-MM-DD */
  prazo: string;
}

export interface EdicaoTarefa extends NovaTarefa {
  status: Status;
}

export interface Tarefa extends EdicaoTarefa {
  id: number;
}

export interface ErroCampo {
  campo: keyof EdicaoTarefa;
  mensagem: string;
}

export type ResultadoValidacao =
  | { ok: true; valor: NovaTarefa }
  | { ok: false; erros: ErroCampo[] };

export type ResultadoAtualizacao =
  | { ok: true; valor: EdicaoTarefa }
  | { ok: false; erros: ErroCampo[] };

export const TITULO_MAX = 100;

function ehPrioridade(v: unknown): v is Prioridade {
  return PRIORIDADES.some((p) => p === v);
}

function ehStatus(v: unknown): v is Status {
  return STATUS.some((s) => s === v);
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

// Data local de hoje (getters locais; toISOString usaria UTC e erraria à noite no Brasil).
function formatarDia(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

function dataExiste(prazo: string): boolean {
  const [a, m, d] = prazo.split('-').map(Number);
  if (a === undefined || m === undefined || d === undefined) return false;
  const data = new Date(a, m - 1, d);
  return data.getFullYear() === a && data.getMonth() === m - 1 && data.getDate() === d;
}

function objetoDe(entrada: unknown): Record<string, unknown> {
  return typeof entrada === 'object' && entrada !== null && !Array.isArray(entrada)
    ? Object.fromEntries(Object.entries(entrada))
    : {};
}

// Devolve o título aparado ou o erro.
function checarTitulo(valor: unknown): { titulo: string } | ErroCampo {
  const titulo = typeof valor === 'string' ? valor.trim() : '';
  if (titulo === '') return { campo: 'titulo', mensagem: 'Informe o título.' };
  if ([...titulo].length > TITULO_MAX) {
    return { campo: 'titulo', mensagem: `O título deve ter no máximo ${TITULO_MAX} caracteres.` };
  }
  return { titulo };
}

// Formato e existência; a regra "não anterior a hoje" fica com quem chama.
function erroDeFormatoDoPrazo(prazo: unknown): ErroCampo | undefined {
  if (typeof prazo !== 'string' || prazo === '') {
    return { campo: 'prazo', mensagem: 'Informe o prazo.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || !dataExiste(prazo)) {
    return { campo: 'prazo', mensagem: 'Prazo inválido. Use uma data existente no formato AAAA-MM-DD.' };
  }
  return undefined;
}

const ERRO_PRIORIDADE: ErroCampo = {
  campo: 'prioridade',
  mensagem: 'Escolha a prioridade: BAIXA, MEDIA ou ALTA.',
};
const ERRO_PRAZO_PASSADO: ErroCampo = { campo: 'prazo', mensagem: 'O prazo não pode ser anterior a hoje.' };

export function validarNovaTarefa(entrada: unknown, hoje: Date): ResultadoValidacao {
  const obj = objetoDe(entrada);
  const erros: ErroCampo[] = [];

  const t = checarTitulo(obj.titulo);
  if ('campo' in t) erros.push(t);

  const prioridade = obj.prioridade;
  if (!ehPrioridade(prioridade)) erros.push(ERRO_PRIORIDADE);

  const prazo = obj.prazo;
  const erroPrazo = erroDeFormatoDoPrazo(prazo);
  if (erroPrazo) {
    erros.push(erroPrazo);
  } else if (typeof prazo === 'string' && prazo < formatarDia(hoje)) {
    erros.push(ERRO_PRAZO_PASSADO);
  }

  if (erros.length > 0 || 'campo' in t || !ehPrioridade(prioridade) || typeof prazo !== 'string') {
    return { ok: false, erros };
  }
  return { ok: true, valor: { titulo: t.titulo, prioridade, prazo } };
}

function presente(obj: Record<string, unknown>, chave: string): boolean {
  return Object.hasOwn(obj, chave) && obj[chave] !== undefined;
}

/**
 * Validação parcial para PATCH: só os campos presentes são validados e mesclados com `atual`.
 * O prazo só é rejeitado por ser anterior a hoje se for diferente do prazo atual (ADR 0009).
 */
export function validarAtualizacao(entrada: unknown, atual: Tarefa, hoje: Date): ResultadoAtualizacao {
  const obj = objetoDe(entrada);
  const valor: EdicaoTarefa = {
    titulo: atual.titulo,
    prioridade: atual.prioridade,
    prazo: atual.prazo,
    status: atual.status,
  };
  const erros: ErroCampo[] = [];

  if (!['titulo', 'prioridade', 'prazo', 'status'].some((c) => presente(obj, c))) {
    return {
      ok: false,
      erros: [{ campo: 'titulo', mensagem: 'Informe ao menos um campo para alterar.' }],
    };
  }

  if (presente(obj, 'titulo')) {
    const t = checarTitulo(obj.titulo);
    if ('campo' in t) erros.push(t);
    else valor.titulo = t.titulo;
  }

  if (presente(obj, 'prioridade')) {
    if (ehPrioridade(obj.prioridade)) valor.prioridade = obj.prioridade;
    else erros.push(ERRO_PRIORIDADE);
  }

  if (presente(obj, 'status')) {
    if (ehStatus(obj.status)) valor.status = obj.status;
    else erros.push({ campo: 'status', mensagem: 'Escolha o status: IDEALIZADO, FAZENDO, CONCLUIDO ou ABANDONADO.' });
  }

  if (presente(obj, 'prazo')) {
    const prazo = obj.prazo;
    const erroPrazo = erroDeFormatoDoPrazo(prazo);
    if (erroPrazo) {
      erros.push(erroPrazo);
    } else if (typeof prazo === 'string') {
      if (prazo !== atual.prazo && prazo < formatarDia(hoje)) erros.push(ERRO_PRAZO_PASSADO);
      else valor.prazo = prazo;
    }
  }

  return erros.length > 0 ? { ok: false, erros } : { ok: true, valor };
}
