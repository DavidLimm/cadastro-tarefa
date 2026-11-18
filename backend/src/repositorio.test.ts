import { describe, expect, it } from 'vitest';
import type { NovaTarefa } from '../../shared/contrato.js';
import { TarefaRepositorioMemoria } from './repositorio.js';

const nova = (titulo: string): NovaTarefa => ({ titulo, prioridade: 'MEDIA', prazo: '2026-11-18' });

describe('TarefaRepositorioMemoria', () => {
  it('listar vazio devolve []', () => {
    expect(new TarefaRepositorioMemoria().listar()).toEqual([]);
  });

  it('salvar atribui ids sequenciais 1, 2, 3', () => {
    const repo = new TarefaRepositorioMemoria();
    expect(repo.salvar(nova('a')).id).toBe(1);
    expect(repo.salvar(nova('b')).id).toBe(2);
    expect(repo.salvar(nova('c')).id).toBe(3);
  });

  it('listar devolve o que foi salvo', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    const b = repo.salvar(nova('b'));
    expect(repo.listar()).toEqual([a, b]);
    expect(a).toEqual({ id: 1, ...nova('a'), status: 'IDEALIZADO' });
  });

  it('alterar o resultado de listar não altera o estado interno', () => {
    const repo = new TarefaRepositorioMemoria();
    repo.salvar(nova('a'));
    const lista = repo.listar();
    lista.push({ id: 99, ...nova('x'), status: 'IDEALIZADO' });
    const primeira = lista[0];
    if (primeira) primeira.titulo = 'alterado';
    expect(repo.listar()).toEqual([{ id: 1, ...nova('a'), status: 'IDEALIZADO' }]);
  });

  it('alterar a tarefa devolvida por salvar não altera o estado interno', () => {
    const repo = new TarefaRepositorioMemoria();
    const t = repo.salvar(nova('a'));
    t.titulo = 'alterado';
    expect(repo.listar()[0]?.titulo).toBe('a');
  });

  it('obter devolve cópia da tarefa ou undefined', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    const lida = repo.obter(a.id);
    expect(lida).toEqual(a);
    if (lida) lida.titulo = 'alterado';
    expect(repo.obter(a.id)?.titulo).toBe('a');
    expect(repo.obter(99)).toBeUndefined();
  });

  it('atualizar devolve a tarefa mesclada, mantém o id e persiste', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    const r = repo.atualizar(a.id, { titulo: 'novo', prioridade: 'ALTA', prazo: '2030-01-01', status: 'FAZENDO' });
    expect(r).toEqual({ id: a.id, titulo: 'novo', prioridade: 'ALTA', prazo: '2030-01-01', status: 'FAZENDO' });
    expect(repo.obter(a.id)).toEqual(r);
  });

  it('atualizar com mudança parcial preserva os demais campos', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    expect(repo.atualizar(a.id, { status: 'CONCLUIDO' })).toEqual({ ...a, status: 'CONCLUIDO' });
  });

  it('atualizar não deixa trocar o id', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    const r = repo.atualizar(a.id, { id: 50, status: 'FAZENDO' } as never);
    expect(r?.id).toBe(a.id);
    expect(repo.obter(50)).toBeUndefined();
  });

  it('atualizar inexistente devolve undefined e não cria nada', () => {
    const repo = new TarefaRepositorioMemoria();
    expect(repo.atualizar(7, { status: 'FAZENDO' })).toBeUndefined();
    expect(repo.listar()).toEqual([]);
  });

  it('alterar o retorno de atualizar não altera o estado interno', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    const r = repo.atualizar(a.id, { status: 'FAZENDO' });
    if (r) r.titulo = 'alterado';
    expect(repo.obter(a.id)?.titulo).toBe('a');
  });

  it('excluir devolve true uma vez e false depois; some do listar', () => {
    const repo = new TarefaRepositorioMemoria();
    const a = repo.salvar(nova('a'));
    const b = repo.salvar(nova('b'));
    expect(repo.excluir(a.id)).toBe(true);
    expect(repo.excluir(a.id)).toBe(false);
    expect(repo.excluir(99)).toBe(false);
    expect(repo.obter(a.id)).toBeUndefined();
    expect(repo.listar()).toEqual([b]);
  });

  it('id excluído não é reaproveitado, nem o último', () => {
    const repo = new TarefaRepositorioMemoria();
    repo.salvar(nova('a'));
    const b = repo.salvar(nova('b'));
    repo.excluir(b.id);
    expect(repo.salvar(nova('c')).id).toBe(3);
  });
});
