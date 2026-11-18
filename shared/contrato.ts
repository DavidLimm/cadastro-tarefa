// Contrato compartilhado entre backend e frontend (importado por caminho relativo).

export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export interface NovaTarefa {
  titulo: string;
  prioridade: Prioridade;
  /** Formato YYYY-MM-DD */
  prazo: string;
}

export interface Tarefa extends NovaTarefa {
  id: number;
}

export interface ErroCampo {
  campo: keyof NovaTarefa;
  mensagem: string;
}

export type ResultadoValidacao =
  | { ok: true; valor: NovaTarefa }
  | { ok: false; erros: ErroCampo[] };

export const TITULO_MAX = 100;

function ehPrioridade(v: unknown): v is Prioridade {
  return PRIORIDADES.some((p) => p === v);
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

export function validarNovaTarefa(entrada: unknown, hoje: Date): ResultadoValidacao {
  const obj: Record<string, unknown> =
    typeof entrada === 'object' && entrada !== null && !Array.isArray(entrada)
      ? Object.fromEntries(Object.entries(entrada))
      : {};
  const erros: ErroCampo[] = [];

  const titulo = typeof obj.titulo === 'string' ? obj.titulo.trim() : '';
  if (titulo === '') {
    erros.push({ campo: 'titulo', mensagem: 'Informe o título.' });
  } else if ([...titulo].length > TITULO_MAX) {
    erros.push({ campo: 'titulo', mensagem: `O título deve ter no máximo ${TITULO_MAX} caracteres.` });
  }

  const prioridade = obj.prioridade;
  if (!ehPrioridade(prioridade)) {
    erros.push({ campo: 'prioridade', mensagem: 'Escolha a prioridade: BAIXA, MEDIA ou ALTA.' });
  }

  const prazo = obj.prazo;
  if (typeof prazo !== 'string' || prazo === '') {
    erros.push({ campo: 'prazo', mensagem: 'Informe o prazo.' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || !dataExiste(prazo)) {
    erros.push({ campo: 'prazo', mensagem: 'Prazo inválido. Use uma data existente no formato AAAA-MM-DD.' });
  } else if (prazo < formatarDia(hoje)) {
    erros.push({ campo: 'prazo', mensagem: 'O prazo não pode ser anterior a hoje.' });
  }

  if (erros.length > 0 || !ehPrioridade(prioridade) || typeof prazo !== 'string') {
    return { ok: false, erros };
  }
  return { ok: true, valor: { titulo, prioridade, prazo } };
}
