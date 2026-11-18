import { PRIORIDADES, STATUS, type EdicaoTarefa, type ErroCampo, type NovaTarefa, type Tarefa } from '../../shared/contrato.js';

/** Falhas que não são erro de campo: rede caída ou servidor/proxy com resposta inutilizável. */
export type ErroApi =
  | { ok: false; tipo: 'validacao'; erros: ErroCampo[] }
  | { ok: false; tipo: 'rede' | 'servidor'; mensagem: string };

export type ResultadoLista = { ok: true; tarefas: Tarefa[] } | ErroApi;
export type ResultadoCriacao = { ok: true; tarefa: Tarefa } | ErroApi;
/** Só PATCH/DELETE: o id não existe (mais) no servidor. Fica fora de ErroApi para não afetar listar/criar. */
export type NaoEncontrada = { ok: false; tipo: 'naoEncontrada' };
export type ResultadoAtualizacao = { ok: true; tarefa: Tarefa } | ErroApi | NaoEncontrada;
export type ResultadoExclusao = { ok: true } | ErroApi | NaoEncontrada;

const MSG_REDE = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.';
const MSG_SERVIDOR = 'O servidor não respondeu como esperado. Tente de novo em instantes.';

const CAMPOS: readonly string[] = ['titulo', 'prioridade', 'prazo', 'status'];

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function ehTarefa(v: unknown): v is Tarefa {
  return (
    ehObjeto(v) &&
    typeof v.id === 'number' &&
    typeof v.titulo === 'string' &&
    PRIORIDADES.some((p) => p === v.prioridade) &&
    typeof v.prazo === 'string' &&
    STATUS.some((st) => st === v.status)
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

/** 400 problem+json com erros por campo vira validação; qualquer outra forma é erro de servidor. */
async function lerValidacao(r: Response): Promise<ErroApi> {
  const ehProblem = (r.headers.get('Content-Type') ?? '').includes('application/problem+json');
  if (!ehProblem) return falhaServidor;
  const corpo = await lerJson(r);
  if (ehObjeto(corpo) && Array.isArray(corpo.errors) && corpo.errors.length > 0 && corpo.errors.every(ehErroCampo)) {
    return { ok: false, tipo: 'validacao', erros: corpo.errors };
  }
  return falhaServidor;
}

export async function criarTarefa(nova: NovaTarefa): Promise<ResultadoCriacao> {
  const r = await enviar('/api/tarefas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nova),
  });
  if (!(r instanceof Response)) return r;
  if (r.status === 400) return lerValidacao(r);
  if (!r.ok) return falhaServidor;
  const corpo = await lerJson(r);
  return ehTarefa(corpo) ? { ok: true, tarefa: corpo } : falhaServidor;
}

export async function atualizarTarefa(id: number, parcial: Partial<EdicaoTarefa>): Promise<ResultadoAtualizacao> {
  const r = await enviar(`/api/tarefas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parcial),
  });
  if (!(r instanceof Response)) return r;
  if (r.status === 404) return { ok: false, tipo: 'naoEncontrada' };
  if (r.status === 400) return lerValidacao(r);
  if (!r.ok) return falhaServidor;
  const corpo = await lerJson(r);
  return ehTarefa(corpo) ? { ok: true, tarefa: corpo } : falhaServidor;
}

export async function excluirTarefa(id: number): Promise<ResultadoExclusao> {
  // Sem Content-Type: o Fastify responde 400 a DELETE com esse header e corpo vazio.
  const r = await enviar(`/api/tarefas/${id}`, { method: 'DELETE' });
  if (!(r instanceof Response)) return r;
  if (r.status === 404) return { ok: false, tipo: 'naoEncontrada' };
  return r.status === 204 ? { ok: true } : falhaServidor;
}
