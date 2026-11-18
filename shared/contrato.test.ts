import { describe, expect, it } from 'vitest';
import { validarNovaTarefa } from './contrato.js';

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
