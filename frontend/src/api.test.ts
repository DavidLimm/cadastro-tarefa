import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NovaTarefa, Tarefa } from '../../shared/contrato.js';
import { atualizarTarefa, criarTarefa, excluirTarefa, listarTarefas } from './api.js';

function resposta(corpo: string | null, status: number, contentType: string): Response {
  return new Response(corpo, { status, headers: { 'Content-Type': contentType } });
}

function simularFetch(r: Response | Error) {
  const fetchFalso = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (r instanceof Error) throw r;
    return r;
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

const tarefa: Tarefa = { id: 1, titulo: 'Pagar conta', prioridade: 'ALTA', prazo: '2030-06-15', status: 'IDEALIZADO' };
const nova: NovaTarefa = { titulo: 'Pagar conta', prioridade: 'ALTA', prazo: '2030-06-15' };

afterEach(() => vi.unstubAllGlobals());

describe('listarTarefas', () => {
  it('200 devolve a lista tipada e chama GET /api/tarefas', async () => {
    const f = simularFetch(resposta(JSON.stringify([tarefa]), 200, 'application/json'));
    const r = await listarTarefas();
    expect(r).toEqual({ ok: true, tarefas: [tarefa] });
    expect(f).toHaveBeenCalledWith('/api/tarefas');
  });

  it('200 com lista vazia', async () => {
    simularFetch(resposta('[]', 200, 'application/json'));
    expect(await listarTarefas()).toEqual({ ok: true, tarefas: [] });
  });

  it('JSON de forma inesperada vira erro de servidor, sem confiar no dado', async () => {
    simularFetch(resposta(JSON.stringify([{ id: 'x', titulo: 1 }]), 200, 'application/json'));
    const r = await listarTarefas();
    expect(r).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('JSON que não é array vira erro de servidor', async () => {
    simularFetch(resposta(JSON.stringify({ tarefas: [] }), 200, 'application/json'));
    expect(await listarTarefas()).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('502 com corpo vazio text/plain vira erro de servidor em pt-BR', async () => {
    simularFetch(resposta('', 502, 'text/plain'));
    const r = await listarTarefas();
    expect(r).toMatchObject({ ok: false, tipo: 'servidor' });
    if (!r.ok && r.tipo !== 'validacao') expect(r.mensagem).toMatch(/servidor/i);
  });

  it('rede caída vira erro de rede em pt-BR', async () => {
    simularFetch(new TypeError('Failed to fetch'));
    const r = await listarTarefas();
    expect(r).toMatchObject({ ok: false, tipo: 'rede' });
    if (!r.ok && r.tipo !== 'validacao') expect(r.mensagem).toMatch(/conex|rede/i);
  });
});

describe('criarTarefa', () => {
  it('201 devolve a tarefa criada e envia POST JSON', async () => {
    const f = simularFetch(resposta(JSON.stringify(tarefa), 201, 'application/json'));
    const r = await criarTarefa(nova);
    expect(r).toEqual({ ok: true, tarefa });
    expect(f).toHaveBeenCalledWith('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nova),
    });
  });

  it('201 com corpo de forma inesperada vira erro de servidor', async () => {
    simularFetch(resposta(JSON.stringify({ id: 1 }), 201, 'application/json'));
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('400 problem+json devolve os erros por campo', async () => {
    const erros = [
      { campo: 'titulo', mensagem: 'Informe o título.' },
      { campo: 'prazo', mensagem: 'Informe o prazo.' },
    ];
    simularFetch(
      resposta(JSON.stringify({ type: 'about:blank', title: 'Dados inválidos', status: 400, errors: erros }), 400, 'application/problem+json'),
    );
    expect(await criarTarefa(nova)).toEqual({ ok: false, tipo: 'validacao', erros });
  });

  it('400 problem+json com campo desconhecido não é aceito como validação', async () => {
    simularFetch(
      resposta(JSON.stringify({ status: 400, errors: [{ campo: 'outro', mensagem: 'x' }] }), 400, 'application/problem+json'),
    );
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('400 com corpo que não é problem+json vira erro de servidor', async () => {
    simularFetch(resposta('<html>Bad Request</html>', 400, 'text/html'));
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('502 vazio vira erro de servidor', async () => {
    simularFetch(resposta('', 502, 'text/plain'));
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('500 com JSON válido de erro continua erro de servidor', async () => {
    simularFetch(resposta(JSON.stringify({ message: 'boom' }), 500, 'application/json'));
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('rede caída vira erro de rede', async () => {
    simularFetch(new TypeError('Failed to fetch'));
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'rede' });
  });
});

describe('ehTarefa exige status', () => {
  it('lista com tarefa sem status vira erro de servidor', async () => {
    simularFetch(resposta(JSON.stringify([{ id: 1, titulo: 'A', prioridade: 'ALTA', prazo: '2030-06-15' }]), 200, 'application/json'));
    expect(await listarTarefas()).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('lista com status fora dos 4 valores vira erro de servidor', async () => {
    simularFetch(resposta(JSON.stringify([{ ...tarefa, status: 'ATRASADO' }]), 200, 'application/json'));
    expect(await listarTarefas()).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('201 do POST sem status vira erro de servidor', async () => {
    const { status: _s, ...semStatus } = tarefa;
    simularFetch(resposta(JSON.stringify(semStatus), 201, 'application/json'));
    expect(await criarTarefa(nova)).toMatchObject({ ok: false, tipo: 'servidor' });
  });
});

describe('atualizarTarefa', () => {
  const editada: Tarefa = { ...tarefa, status: 'FAZENDO' };

  it('200 devolve a tarefa e envia PATCH JSON para /api/tarefas/:id', async () => {
    const f = simularFetch(resposta(JSON.stringify(editada), 200, 'application/json'));
    const r = await atualizarTarefa(1, { status: 'FAZENDO' });
    expect(r).toEqual({ ok: true, tarefa: editada });
    expect(f).toHaveBeenCalledWith('/api/tarefas/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'FAZENDO' }),
    });
  });

  it('200 sem status vira erro de servidor', async () => {
    const { status: _s, ...semStatus } = tarefa;
    simularFetch(resposta(JSON.stringify(semStatus), 200, 'application/json'));
    expect(await atualizarTarefa(1, { titulo: 'x' })).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('400 problem+json devolve os erros por campo, inclusive status', async () => {
    const erros = [
      { campo: 'status', mensagem: 'Escolha o status.' },
      { campo: 'prazo', mensagem: 'O prazo não pode ser anterior a hoje.' },
    ];
    simularFetch(resposta(JSON.stringify({ status: 400, errors: erros }), 400, 'application/problem+json'));
    expect(await atualizarTarefa(1, { prazo: '2000-01-01' })).toEqual({ ok: false, tipo: 'validacao', erros });
  });

  it('400 que não é problem+json vira erro de servidor', async () => {
    simularFetch(resposta('<html>', 400, 'text/html'));
    expect(await atualizarTarefa(1, { titulo: 'x' })).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('404 vira naoEncontrada', async () => {
    simularFetch(resposta(JSON.stringify({ status: 404, title: 'Tarefa não encontrada' }), 404, 'application/problem+json'));
    expect(await atualizarTarefa(99, { titulo: 'x' })).toEqual({ ok: false, tipo: 'naoEncontrada' });
  });

  it('500 vira erro de servidor', async () => {
    simularFetch(resposta('', 500, 'text/plain'));
    expect(await atualizarTarefa(1, { titulo: 'x' })).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('rede caída vira erro de rede', async () => {
    simularFetch(new TypeError('Failed to fetch'));
    expect(await atualizarTarefa(1, { titulo: 'x' })).toMatchObject({ ok: false, tipo: 'rede' });
  });
});

describe('excluirTarefa', () => {
  it('204 é sucesso e envia DELETE para /api/tarefas/:id', async () => {
    const f = simularFetch(new Response(null, { status: 204 }));
    expect(await excluirTarefa(7)).toEqual({ ok: true });
    expect(f.mock.calls[0]?.[0]).toBe('/api/tarefas/7');
    expect(f.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('DELETE NÃO envia Content-Type (Fastify devolve 400 com corpo vazio) e PATCH envia', async () => {
    const fd = simularFetch(new Response(null, { status: 204 }));
    await excluirTarefa(7);
    const initDelete = fd.mock.calls[0]?.[1];
    const cabecalhosDelete = new Headers(initDelete?.headers);
    expect(cabecalhosDelete.has('Content-Type')).toBe(false);
    expect(initDelete?.body).toBeUndefined();

    const fp = simularFetch(resposta(JSON.stringify(tarefa), 200, 'application/json'));
    await atualizarTarefa(1, { titulo: 'x' });
    const initPatch = fp.mock.calls[0]?.[1];
    expect(new Headers(initPatch?.headers).get('Content-Type')).toBe('application/json');
  });

  it('404 vira naoEncontrada', async () => {
    simularFetch(resposta('{}', 404, 'application/problem+json'));
    expect(await excluirTarefa(7)).toEqual({ ok: false, tipo: 'naoEncontrada' });
  });

  it('500 vira erro de servidor', async () => {
    simularFetch(resposta('', 500, 'text/plain'));
    expect(await excluirTarefa(7)).toMatchObject({ ok: false, tipo: 'servidor' });
  });

  it('rede caída vira erro de rede', async () => {
    simularFetch(new TypeError('Failed to fetch'));
    expect(await excluirTarefa(7)).toMatchObject({ ok: false, tipo: 'rede' });
  });
});
