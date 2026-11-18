import { PRIORIDADES, type ErroCampo, type NovaTarefa, type Tarefa } from '../../shared/contrato.js';

/** Falhas que não são erro de campo: rede caída ou servidor/proxy com resposta inutilizável. */
export type ErroApi =
  | { ok: false; tipo: 'validacao'; erros: ErroCampo[] }
  | { ok: false; tipo: 'rede' | 'servidor'; mensagem: string };

export type ResultadoLista = { ok: true; tarefas: Tarefa[] } | ErroApi;
export type ResultadoCriacao = { ok: true; tarefa: Tarefa } | ErroApi;

const MSG_REDE = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.';
const MSG_SERVIDOR = 'O servidor não respondeu como esperado. Tente de novo em instantes.';

const CAMPOS: readonly string[] = ['titulo', 'prioridade', 'prazo'];

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function ehTarefa(v: unknown): v is Tarefa {
  return (
    ehObjeto(v) &&
    typeof v.id === 'number' &&
    typeof v.titulo === 'string' &&
    PRIORIDADES.some((p) => p === v.prioridade) &&
    typeof v.prazo === 'string'
  );
}

function ehErroCampo(v: unknown): v is ErroCampo {
  return ehObjeto(v) && typeof v.campo === 'string' && CAMPOS.includes(v.campo) && typeof v.mensagem === 'string';
}

function ehListaDeTarefas(v: unknown): v is Tarefa[] {
  return Array.isArray(v) && v.every(ehTarefa);
}

const falhaServidor: ErroApi = { ok: false, tipo: 'servidor', mensagem: MSG_SERVIDOR };

async function enviar(url: string, init?: RequestInit): Promise<Response | ErroApi> {
  try {
    return init === undefined ? await fetch(url) : await fetch(url, init);
  } catch {
    return { ok: false, tipo: 'rede', mensagem: MSG_REDE };
  }
}

async function lerJson(r: Response): Promise<unknown> {
  try {
    return await r.json();
  } catch {
    return undefined;
  }
}

export async function listarTarefas(): Promise<ResultadoLista> {
  const r = await enviar('/api/tarefas');
  if (!(r instanceof Response)) return r;
  if (!r.ok) return falhaServidor;
  const corpo = await lerJson(r);
  return ehListaDeTarefas(corpo) ? { ok: true, tarefas: corpo } : falhaServidor;
}

export async function criarTarefa(nova: NovaTarefa): Promise<ResultadoCriacao> {
  const r = await enviar('/api/tarefas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nova),
  });
  if (!(r instanceof Response)) return r;

  if (r.status === 400) {
    const ehProblem = (r.headers.get('Content-Type') ?? '').includes('application/problem+json');
    if (!ehProblem) return falhaServidor;
    const corpo = await lerJson(r);
    if (ehObjeto(corpo) && Array.isArray(corpo.errors) && corpo.errors.length > 0 && corpo.errors.every(ehErroCampo)) {
      return { ok: false, tipo: 'validacao', erros: corpo.errors };
    }
    return falhaServidor;
  }

  if (!r.ok) return falhaServidor;
  const corpo = await lerJson(r);
  return ehTarefa(corpo) ? { ok: true, tarefa: corpo } : falhaServidor;
}
