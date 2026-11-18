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
    expect(a).toEqual({ id: 1, ...nova('a') });
  });

  it('alterar o resultado de listar não altera o estado interno', () => {
    const repo = new TarefaRepositorioMemoria();
    repo.salvar(nova('a'));
    const lista = repo.listar();
    lista.push({ id: 99, ...nova('x') });
    const primeira = lista[0];
    if (primeira) primeira.titulo = 'alterado';
    expect(repo.listar()).toEqual([{ id: 1, ...nova('a') }]);
  });

  it('alterar a tarefa devolvida por salvar não altera o estado interno', () => {
    const repo = new TarefaRepositorioMemoria();
    const t = repo.salvar(nova('a'));
    t.titulo = 'alterado';
    expect(repo.listar()[0]?.titulo).toBe('a');
  });
});
