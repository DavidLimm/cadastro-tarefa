import { describe, expect, it } from 'vitest';
import { criarApp } from './app.js';
import { TarefaRepositorioMemoria } from './repositorio.js';

describe('GET /api/saude', () => {
  it('responde 200 com status ok', async () => {
    const app = criarApp();
    const resposta = await app.inject({ method: 'GET', url: '/api/saude' });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});

describe('POST /api/tarefas', () => {
  const agora = () => new Date(2030, 5, 15);
  const valida = { titulo: 'Pagar conta', prioridade: 'ALTA', prazo: '2030-06-20' };

  async function postar(corpo: unknown, app = criarApp({ agora })) {
    const resposta = await app.inject({ method: 'POST', url: '/api/tarefas', payload: JSON.stringify(corpo), headers: { 'content-type': 'application/json' } });
    return { app, resposta };
  }

  function camposComErro(resposta: { json: () => unknown }): string[] {
    const corpo = resposta.json();
    if (typeof corpo !== 'object' || corpo === null || !('errors' in corpo) || !Array.isArray(corpo.errors)) {
      throw new Error('corpo sem errors');
    }
    return corpo.errors.map((e: { campo: string }) => e.campo);
  }

  it('cria tarefa válida: 201, Location e corpo', async () => {
    const { app, resposta } = await postar({ ...valida, titulo: '  Pagar conta  ' });
    expect(resposta.statusCode).toBe(201);
    expect(resposta.headers.location).toBe('/api/tarefas/1');
    expect(resposta.json()).toEqual({ id: 1, titulo: 'Pagar conta', prioridade: 'ALTA', prazo: '2030-06-20', status: 'IDEALIZADO' });
    await app.close();
  });

  it('400 problem+json com erros por campo quando título vazio', async () => {
    const { app, resposta } = await postar({ ...valida, titulo: '   ' });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    expect(resposta.json()).toMatchObject({ status: 400, title: expect.any(String), errors: [{ campo: 'titulo', mensagem: expect.any(String) }] });
    await app.close();
  });

  it('título com 100 caracteres é aceito e com 101 é rejeitado', async () => {
    const ok = await postar({ ...valida, titulo: 'a'.repeat(100) });
    expect(ok.resposta.statusCode).toBe(201);
    const erro = await postar({ ...valida, titulo: 'a'.repeat(101) }, ok.app);
    expect(erro.resposta.statusCode).toBe(400);
    expect(camposComErro(erro.resposta)).toEqual(['titulo']);
    await ok.app.close();
  });

  it('prioridade inválida -> 400 no campo prioridade', async () => {
    const { app, resposta } = await postar({ ...valida, prioridade: 'URGENTE' });
    expect(resposta.statusCode).toBe(400);
    expect(camposComErro(resposta)).toEqual(['prioridade']);
    await app.close();
  });

  it('prazo ausente, formato errado e data inexistente -> 400 no campo prazo', async () => {
    const app = criarApp({ agora });
    for (const prazo of [undefined, '20/06/2030', '2030-02-30']) {
      const { resposta } = await postar({ ...valida, prazo }, app);
      expect(resposta.statusCode).toBe(400);
      expect(camposComErro(resposta)).toEqual(['prazo']);
    }
    await app.close();
  });

  it('prazo de ontem é rejeitado e o de hoje é aceito', async () => {
    const app = criarApp({ agora });
    const ontem = await postar({ ...valida, prazo: '2030-06-14' }, app);
    expect(ontem.resposta.statusCode).toBe(400);
    expect(camposComErro(ontem.resposta)).toEqual(['prazo']);
    const hoje = await postar({ ...valida, prazo: '2030-06-15' }, app);
    expect(hoje.resposta.statusCode).toBe(201);
    await app.close();
  });

  it('vários erros juntos são listados todos', async () => {
    const { app, resposta } = await postar({ titulo: '', prioridade: 'X', prazo: 'abc' });
    expect(resposta.statusCode).toBe(400);
    expect(camposComErro(resposta)).toEqual(['titulo', 'prioridade', 'prazo']);
    await app.close();
  });

  it('corpo que não é JSON -> 400 problem+json', async () => {
    const app = criarApp({ agora });
    const resposta = await app.inject({ method: 'POST', url: '/api/tarefas', payload: '{quebrado', headers: { 'content-type': 'application/json' } });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    expect(resposta.json()).toMatchObject({ status: 400 });
    await app.close();
  });

  it('corpo vazio com content-type json -> 400 problem+json', async () => {
    const app = criarApp({ agora });
    const resposta = await app.inject({ method: 'POST', url: '/api/tarefas', payload: '', headers: { 'content-type': 'application/json' } });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    await app.close();
  });

  it('sem corpo e sem content-type -> 400 problem+json', async () => {
    const app = criarApp({ agora });
    const resposta = await app.inject({ method: 'POST', url: '/api/tarefas' });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    await app.close();
  });

  it('content-type errado (text/plain) -> 400 problem+json', async () => {
    const app = criarApp({ agora });
    const resposta = await app.inject({ method: 'POST', url: '/api/tarefas', payload: JSON.stringify(valida), headers: { 'content-type': 'text/plain' } });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    await app.close();
  });

  it('JSON que não é objeto (array) -> 400 com os três campos', async () => {
    const { app, resposta } = await postar([1, 2]);
    expect(resposta.statusCode).toBe(400);
    expect(camposComErro(resposta)).toEqual(['titulo', 'prioridade', 'prazo']);
    await app.close();
  });

  it('campos extras são ignorados', async () => {
    const { app, resposta } = await postar({ ...valida, id: 99, admin: true, status: 'CONCLUIDO' });
    expect(resposta.statusCode).toBe(201);
    expect(resposta.json()).toEqual({ id: 1, titulo: 'Pagar conta', prioridade: 'ALTA', prazo: '2030-06-20', status: 'IDEALIZADO' });
    await app.close();
  });

  it('50 POSTs simultâneos geram 50 ids únicos', async () => {
    const repositorio = new TarefaRepositorioMemoria();
    const app = criarApp({ repositorio, agora });
    const respostas = await Promise.all(
      Array.from({ length: 50 }, (_, i) => postar({ ...valida, titulo: `Tarefa ${i}` }, app).then((r) => r.resposta)),
    );
    expect(respostas.every((r) => r.statusCode === 201)).toBe(true);
    const ids = respostas.map((r) => r.headers.location);
    expect(new Set(ids).size).toBe(50);
    expect(repositorio.listar()).toHaveLength(50);
    await app.close();
  });

  it('dois criarApp() sem repositório injetado não compartilham estado', async () => {
    const a = criarApp({ agora });
    const b = criarApp({ agora });
    await postar(valida, a);
    const { resposta } = await postar(valida, b);
    expect(resposta.headers.location).toBe('/api/tarefas/1');
    await a.close();
    await b.close();
  });
});

describe('GET /api/tarefas', () => {
  const agora = () => new Date(2030, 5, 15);

  async function postar(app: ReturnType<typeof criarApp>, titulo: string, prioridade: string, prazo: string) {
    const r = await app.inject({ method: 'POST', url: '/api/tarefas', payload: { titulo, prioridade, prazo } });
    expect(r.statusCode).toBe(201);
  }

  it('sem tarefas devolve 200 e []', async () => {
    const app = criarApp({ agora });
    const resposta = await app.inject({ method: 'GET', url: '/api/tarefas' });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual([]);
    await app.close();
  });

  it('ordena por prazo, depois prioridade (ALTA, MEDIA, BAIXA), depois id', async () => {
    const app = criarApp({ agora });
    await postar(app, 'a', 'BAIXA', '2030-07-01'); // id 1
    await postar(app, 'b', 'ALTA', '2030-07-05'); // id 2
    await postar(app, 'c', 'MEDIA', '2030-07-01'); // id 3
    await postar(app, 'd', 'BAIXA', '2030-06-20'); // id 4
    await postar(app, 'e', 'ALTA', '2030-07-01'); // id 5
    await postar(app, 'f', 'MEDIA', '2030-07-01'); // id 6
    const resposta = await app.inject({ method: 'GET', url: '/api/tarefas' });
    expect(resposta.statusCode).toBe(200);
    const ids = resposta.json().map((t: { id: number }) => t.id);
    expect(ids).toEqual([4, 5, 3, 6, 1, 2]);
    await app.close();
  });

  it('ordena ids numericamente (10 depois de 9)', async () => {
    const app = criarApp({ agora });
    for (let i = 0; i < 10; i++) await postar(app, `t${i}`, 'ALTA', '2030-07-01');
    const resposta = await app.inject({ method: 'GET', url: '/api/tarefas' });
    expect(resposta.json().map((t: { id: number }) => t.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await app.close();
  });

  it('50 POSTs simultâneos e depois GET devolve 50 tarefas com ids únicos', async () => {
    const app = criarApp({ agora });
    await Promise.all(Array.from({ length: 50 }, (_, i) => postar(app, `Tarefa ${i}`, 'MEDIA', '2030-07-01')));
    const resposta = await app.inject({ method: 'GET', url: '/api/tarefas' });
    const tarefas: { id: number }[] = resposta.json();
    expect(tarefas).toHaveLength(50);
    expect(new Set(tarefas.map((t) => t.id)).size).toBe(50);
    await app.close();
  });
});

describe('rotas inexistentes e erros de corpo', () => {
  it.each([
    ['GET', '/api/nao-existe'],
    ['PUT', '/api/tarefas'],
    ['DELETE', '/api/tarefas'],
  ] as const)('%s %s -> 404 problem+json em pt-BR', async (method, url) => {
    const app = criarApp();
    const resposta = await app.inject({ method, url });
    expect(resposta.statusCode).toBe(404);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    expect(resposta.json()).toEqual({ type: 'about:blank', title: 'Recurso não encontrado', status: 404, errors: [] });
    await app.close();
  });

  it('corpo JSON quebrado -> detail em pt-BR, sem texto cru do Fastify', async () => {
    const app = criarApp();
    const resposta = await app.inject({ method: 'POST', url: '/api/tarefas', payload: '{quebrado', headers: { 'content-type': 'application/json' } });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().detail).toBe('O corpo da requisição não é um JSON válido.');
    await app.close();
  });

  it('corpo grande demais -> 400 com detail em pt-BR', async () => {
    const app = criarApp();
    const resposta = await app.inject({
      method: 'POST',
      url: '/api/tarefas',
      payload: JSON.stringify({ titulo: 'a'.repeat(2_000_000) }),
      headers: { 'content-type': 'application/json' },
    });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().detail).toBe('O corpo da requisição é grande demais.');
    await app.close();
  });
});

describe('PATCH /api/tarefas/:id', () => {
  const agora = () => new Date(2030, 5, 15);
  const JSON_H = { 'content-type': 'application/json' };

  async function criar(app: ReturnType<typeof criarApp>, prazo = '2030-06-20', titulo = 'Pagar conta') {
    const r = await app.inject({ method: 'POST', url: '/api/tarefas', payload: JSON.stringify({ titulo, prioridade: 'MEDIA', prazo }), headers: JSON_H });
    return r.json() as { id: number; titulo: string; prioridade: string; prazo: string; status: string };
  }
  // Tarefa vencida: criada com relógio no passado, depois lida por um app com relógio de 2030 (mesmo repositório).
  async function appComVencida() {
    const repositorio = new TarefaRepositorioMemoria();
    const antigo = criarApp({ repositorio, agora: () => new Date(2030, 0, 1) });
    const t = await criar(antigo, '2030-01-10');
    await antigo.close();
    return { app: criarApp({ repositorio, agora }), t };
  }
  const patch = (app: ReturnType<typeof criarApp>, id: number | string, corpo: unknown) =>
    app.inject({ method: 'PATCH', url: `/api/tarefas/${id}`, payload: JSON.stringify(corpo), headers: JSON_H });

  it('só {status} -> 200 com a tarefa completa e demais campos intactos', async () => {
    const app = criarApp({ agora });
    const t = await criar(app);
    const r = await patch(app, t.id, { status: 'FAZENDO' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ...t, status: 'FAZENDO' });
    await app.close();
  });

  it('todos os campos -> 200 atualizado e título aparado; GET reflete', async () => {
    const app = criarApp({ agora });
    const t = await criar(app);
    const r = await patch(app, t.id, { titulo: '  Novo  ', prioridade: 'ALTA', prazo: '2030-06-15', status: 'CONCLUIDO' });
    const esperado = { id: t.id, titulo: 'Novo', prioridade: 'ALTA', prazo: '2030-06-15', status: 'CONCLUIDO' };
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual(esperado);
    expect((await app.inject({ method: 'GET', url: '/api/tarefas' })).json()).toEqual([esperado]);
    await app.close();
  });

  it.each([
    ['titulo', { titulo: '   ' }],
    ['titulo', { titulo: 'a'.repeat(101) }],
    ['prioridade', { prioridade: 'URGENTE' }],
    ['status', { status: 'FEITO' }],
    ['prazo', { prazo: '2030-02-30' }],
    ['prazo', { prazo: '20/06/2030' }],
  ])('inválido (%s) -> 400 problem+json com errors por campo e tarefa intacta', async (campo, corpo) => {
    const app = criarApp({ agora });
    const t = await criar(app);
    const r = await patch(app, t.id, corpo);
    expect(r.statusCode).toBe(400);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json().errors.map((e: { campo: string }) => e.campo)).toEqual([campo]);
    expect((await app.inject({ method: 'GET', url: '/api/tarefas' })).json()).toEqual([t]);
    await app.close();
  });

  it('título com 100 caracteres é aceito', async () => {
    const app = criarApp({ agora });
    const t = await criar(app);
    expect((await patch(app, t.id, { titulo: 'a'.repeat(100) })).statusCode).toBe(200);
    await app.close();
  });

  it('tarefa vencida: mover para ABANDONADO e CONCLUIDO funciona', async () => {
    const { app, t } = await appComVencida();
    const r = await patch(app, t.id, { status: 'ABANDONADO' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'ABANDONADO', prazo: '2030-01-10' });
    expect((await patch(app, t.id, { status: 'CONCLUIDO' })).statusCode).toBe(200);
    await app.close();
  });

  it('prazo vencido: o mesmo é aceito, outro vencido -> 400 em prazo, hoje e futuro -> 200', async () => {
    const { app, t } = await appComVencida();
    expect((await patch(app, t.id, { prazo: '2030-01-10' })).statusCode).toBe(200);
    const ruim = await patch(app, t.id, { prazo: '2030-01-11' });
    expect(ruim.statusCode).toBe(400);
    expect(ruim.json().errors.map((e: { campo: string }) => e.campo)).toEqual(['prazo']);
    expect((await patch(app, t.id, { prazo: '2030-06-15' })).statusCode).toBe(200);
    expect((await patch(app, t.id, { prazo: '2030-07-01' })).statusCode).toBe(200);
    await app.close();
  });

  it.each([[{}], [{ foo: 1 }], [[]], [null]])('corpo %j sem campos conhecidos -> 400', async (corpo) => {
    const app = criarApp({ agora });
    const t = await criar(app);
    expect((await patch(app, t.id, corpo)).statusCode).toBe(400);
    await app.close();
  });

  it('corpo ausente (sem content-type) e corpo não JSON -> 400 problem+json', async () => {
    const app = criarApp({ agora });
    const t = await criar(app);
    const ausente = await app.inject({ method: 'PATCH', url: `/api/tarefas/${t.id}` });
    expect(ausente.statusCode).toBe(400);
    expect(ausente.headers['content-type']).toContain('application/problem+json');
    const quebrado = await app.inject({ method: 'PATCH', url: `/api/tarefas/${t.id}`, payload: '{quebrado', headers: JSON_H });
    expect(quebrado.statusCode).toBe(400);
    expect(quebrado.json().detail).toBe('O corpo da requisição não é um JSON válido.');
    const vazio = await app.inject({ method: 'PATCH', url: `/api/tarefas/${t.id}`, payload: '', headers: JSON_H });
    expect(vazio.statusCode).toBe(400);
    await app.close();
  });

  it.each(['99', 'abc', '1.5', '0', '-1'])('id %s inexistente/inválido -> 404 problem+json', async (id) => {
    const app = criarApp({ agora });
    await criar(app);
    const r = await patch(app, id, { status: 'FAZENDO' });
    expect(r.statusCode).toBe(404);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json()).toMatchObject({ status: 404, errors: [] });
    await app.close();
  });

  it('404 vem antes de 400: id inexistente com corpo inválido, vazio ou quebrado', async () => {
    const app = criarApp({ agora });
    expect((await patch(app, 99, { titulo: '' })).statusCode).toBe(404);
    expect((await patch(app, 99, {})).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/api/tarefas/99', payload: '{quebrado', headers: JSON_H })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: '/api/tarefas/99' })).statusCode).toBe(404);
    await app.close();
  });

  it('a posição no GET reflete o novo prazo e prioridade', async () => {
    const app = criarApp({ agora });
    const a = await criar(app, '2030-06-20', 'A');
    const b = await criar(app, '2030-06-25', 'B');
    await patch(app, b.id, { prazo: '2030-06-16' });
    const ids = (await app.inject({ method: 'GET', url: '/api/tarefas' })).json().map((x: { id: number }) => x.id);
    expect(ids).toEqual([b.id, a.id]);
    await app.close();
  });
});
