import { describe, expect, it } from 'vitest';
import { STATUS, validarAtualizacao, validarNovaTarefa, type Tarefa } from './contrato.js';

const hoje = new Date(2026, 10, 18);
const valida = { titulo: 'Estudar', prioridade: 'MEDIA', prazo: '2026-11-18' };

function campos(entrada: unknown, dia: Date = hoje): string[] {
  const r = validarNovaTarefa(entrada, dia);
  return r.ok ? [] : r.erros.map((e) => e.campo);
}

describe('validarNovaTarefa', () => {
  it('aceita entrada válida e apara o título', () => {
    const r = validarNovaTarefa({ ...valida, titulo: '  Estudar  ' }, hoje);
    expect(r).toEqual({ ok: true, valor: { titulo: 'Estudar', prioridade: 'MEDIA', prazo: '2026-11-18' } });
  });

  it('rejeita título ausente, vazio ou só espaços', () => {
    expect(campos({ ...valida, titulo: undefined })).toEqual(['titulo']);
    expect(campos({ ...valida, titulo: '' })).toEqual(['titulo']);
    expect(campos({ ...valida, titulo: '   ' })).toEqual(['titulo']);
  });

  it('rejeita título que não é texto', () => {
    expect(campos({ ...valida, titulo: 5 })).toEqual(['titulo']);
  });

  it('aceita 100 caracteres e rejeita 101', () => {
    expect(campos({ ...valida, titulo: 'a'.repeat(100) })).toEqual([]);
    expect(campos({ ...valida, titulo: 'a'.repeat(101) })).toEqual(['titulo']);
  });

  it('conta caracteres visíveis: 100 emojis passam e 101 não', () => {
    expect(campos({ ...valida, titulo: '😀'.repeat(100) })).toEqual([]);
    expect(campos({ ...valida, titulo: '😀'.repeat(101) })).toEqual(['titulo']);
  });

  it('rejeita prioridade inválida ou ausente', () => {
    expect(campos({ ...valida, prioridade: 'URGENTE' })).toEqual(['prioridade']);
    expect(campos({ ...valida, prioridade: undefined })).toEqual(['prioridade']);
  });

  it('aceita BAIXA, MEDIA e ALTA', () => {
    for (const p of ['BAIXA', 'MEDIA', 'ALTA']) {
      expect(campos({ ...valida, prioridade: p })).toEqual([]);
    }
  });

  it('rejeita prazo ausente', () => {
    expect(campos({ ...valida, prazo: undefined })).toEqual(['prazo']);
  });

  it('rejeita formato de prazo errado', () => {
    expect(campos({ ...valida, prazo: '18/11/2026' })).toEqual(['prazo']);
    expect(campos({ ...valida, prazo: '2026-1-5' })).toEqual(['prazo']);
    expect(campos({ ...valida, prazo: 20261118 })).toEqual(['prazo']);
  });

  it('rejeita data inexistente (2026-02-30)', () => {
    expect(campos({ ...valida, prazo: '2026-02-30' })).toEqual(['prazo']);
  });

  it('rejeita ontem e aceita hoje', () => {
    expect(campos({ ...valida, prazo: '2026-11-17' })).toEqual(['prazo']);
    expect(campos({ ...valida, prazo: '2026-11-18' })).toEqual([]);
  });

  it('usa a data local de hoje, não UTC (23:30 no Brasil)', () => {
    const noite = new Date(2026, 10, 18, 23, 30);
    expect(campos({ ...valida, prazo: '2026-11-18' }, noite)).toEqual([]);
    expect(campos({ ...valida, prazo: '2026-11-17' }, noite)).toEqual(['prazo']);
  });

  it('lista todos os erros de uma vez, com mensagem em português', () => {
    const r = validarNovaTarefa({ titulo: ' ', prioridade: 'X', prazo: 'abc' }, hoje);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erros.map((e) => e.campo)).toEqual(['titulo', 'prioridade', 'prazo']);
      expect(r.erros.every((e) => e.mensagem.length > 0)).toBe(true);
    }
  });

  it.each([null, 'texto', [], 42, undefined])('rejeita entrada que não é objeto: %j', (entrada) => {
    expect(campos(entrada)).toEqual(['titulo', 'prioridade', 'prazo']);
  });
});

describe('STATUS', () => {
  it('tem a ordem das colunas', () => {
    expect([...STATUS]).toEqual(['IDEALIZADO', 'FAZENDO', 'CONCLUIDO', 'ABANDONADO']);
  });
});

describe('validarAtualizacao', () => {
  const atual: Tarefa = { id: 7, titulo: 'Estudar', prioridade: 'MEDIA', prazo: '2026-11-20', status: 'IDEALIZADO' };
  const vencida: Tarefa = { ...atual, prazo: '2026-11-10' };

  function camposAtu(entrada: unknown, t: Tarefa = atual): string[] {
    const r = validarAtualizacao(entrada, t, hoje);
    return r.ok ? [] : r.erros.map((e) => e.campo);
  }

  it('aceita só status e mantém os demais campos', () => {
    const r = validarAtualizacao({ status: 'FAZENDO' }, atual, hoje);
    expect(r).toEqual({
      ok: true,
      valor: { titulo: 'Estudar', prioridade: 'MEDIA', prazo: '2026-11-20', status: 'FAZENDO' },
    });
  });

  it('aceita todos os campos, apara o título e não devolve id', () => {
    const r = validarAtualizacao(
      { titulo: '  Novo  ', prioridade: 'ALTA', prazo: '2026-12-01', status: 'CONCLUIDO', id: 99 },
      atual,
      hoje,
    );
    expect(r).toEqual({
      ok: true,
      valor: { titulo: 'Novo', prioridade: 'ALTA', prazo: '2026-12-01', status: 'CONCLUIDO' },
    });
  });

  it('aceita título de 100 caracteres e rejeita 101 e vazio', () => {
    expect(camposAtu({ titulo: 'a'.repeat(100) })).toEqual([]);
    expect(camposAtu({ titulo: 'a'.repeat(101) })).toEqual(['titulo']);
    expect(camposAtu({ titulo: '   ' })).toEqual(['titulo']);
  });

  it('rejeita status, prioridade e prazo inválidos, por campo', () => {
    expect(camposAtu({ status: 'PAUSADO' })).toEqual(['status']);
    expect(camposAtu({ status: null })).toEqual(['status']);
    expect(camposAtu({ prioridade: 'URGENTE' })).toEqual(['prioridade']);
    expect(camposAtu({ prazo: '2026-02-30' })).toEqual(['prazo']);
    expect(camposAtu({ prazo: '18/11/2026' })).toEqual(['prazo']);
    expect(camposAtu({ prazo: 5 })).toEqual(['prazo']);
  });

  it('acumula erros de vários campos', () => {
    expect(camposAtu({ titulo: '', status: 'X' })).toEqual(['titulo', 'status']);
  });

  it('aceita reenviar o mesmo prazo vencido', () => {
    expect(camposAtu({ prazo: '2026-11-10' }, vencida)).toEqual([]);
    expect(camposAtu({ titulo: 'Outro', status: 'ABANDONADO' }, vencida)).toEqual([]);
  });

  it('rejeita prazo vencido diferente do atual', () => {
    expect(camposAtu({ prazo: '2026-11-11' }, vencida)).toEqual(['prazo']);
    expect(camposAtu({ prazo: '2026-11-17' })).toEqual(['prazo']);
  });

  it('aceita prazo igual a hoje e futuro', () => {
    expect(camposAtu({ prazo: '2026-11-18' }, vencida)).toEqual([]);
    expect(camposAtu({ prazo: '2027-01-01' }, vencida)).toEqual([]);
  });

  it('rejeita objeto vazio, só campos desconhecidos e entrada que não é objeto', () => {
    expect(validarAtualizacao({}, atual, hoje).ok).toBe(false);
    expect(validarAtualizacao({ foo: 1 }, atual, hoje).ok).toBe(false);
    expect(validarAtualizacao(null, atual, hoje).ok).toBe(false);
    expect(validarAtualizacao([], atual, hoje).ok).toBe(false);
    expect(validarAtualizacao('x', atual, hoje).ok).toBe(false);
  });
});

describe('validarNovaTarefa e status (achado do qa)', () => {
  it('status enviado no corpo é descartado: valor não tem a chave status', () => {
    const r = validarNovaTarefa(
      { titulo: 'a', prioridade: 'ALTA', prazo: '2030-06-20', status: 'CONCLUIDO' },
      new Date(2030, 5, 15),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.valor).sort()).toEqual(['prazo', 'prioridade', 'titulo']);
    expect(r.valor).not.toHaveProperty('status');
  });
});
