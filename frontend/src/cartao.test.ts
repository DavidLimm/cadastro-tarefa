import { describe, expect, it } from 'vitest';
import { PRIORIDADES, STATUS, type Prioridade, type Status, type Tarefa } from '../../shared/contrato.js';
import { descreverCartao } from './cartao.js';

const HOJE = '2026-11-18';
const t = (status: Status, prioridade: Prioridade, prazo: string): Tarefa => ({
  id: 1,
  titulo: 'X',
  prioridade,
  prazo,
  status,
});

const PRAZOS = {
  vencido3: '2026-11-15',
  vencido1: '2026-11-17',
  hoje: '2026-11-18',
  perto1: '2026-11-19',
  perto2: '2026-11-20',
  perto3: '2026-11-21',
  noPrazo: '2026-11-22',
} as const;

describe('descreverCartao: selo de prioridade (sempre presente)', () => {
  it.each([
    ['ALTA', 'Alta', 'alta'],
    ['MEDIA', 'Média', 'media'],
    ['BAIXA', 'Baixa', 'baixa'],
  ] as const)('%s vira "%s" com tom %s e ícone', (p, texto, tom) => {
    const d = descreverCartao(t('FAZENDO', p, PRAZOS.noPrazo), HOJE);
    expect(d.prioridade).toMatchObject({ texto, tom });
    expect(d.prioridade.icone).toBeTruthy();
  });

  it.each(STATUS)('o selo de prioridade continua em %s', (s) => {
    for (const p of PRIORIDADES) {
      expect(descreverCartao(t(s, p, PRAZOS.vencido3), HOJE).prioridade.texto).not.toBe('');
    }
  });
});

describe('descreverCartao: selo de prazo em IDEALIZADO e FAZENDO', () => {
  it.each(['IDEALIZADO', 'FAZENDO'] as const)('textos e tons em %s', (s) => {
    const sel = (prazo: string) => descreverCartao(t(s, 'MEDIA', prazo), HOJE).prazo;
    expect(sel(PRAZOS.vencido3)).toMatchObject({ texto: 'Atrasada 3d', tom: 'vencido' });
    expect(sel(PRAZOS.vencido1)).toMatchObject({ texto: 'Atrasada 1d', tom: 'vencido' });
    expect(sel(PRAZOS.hoje)).toMatchObject({ texto: 'Vence hoje', tom: 'hoje' });
    expect(sel(PRAZOS.perto1)).toMatchObject({ texto: 'Vence em 1d', tom: 'perto' });
    expect(sel(PRAZOS.perto2)).toMatchObject({ texto: 'Vence em 2d', tom: 'perto' });
    expect(sel(PRAZOS.perto3)).toMatchObject({ texto: 'Vence em 3d', tom: 'perto' });
    expect(sel(PRAZOS.noPrazo)).toMatchObject({ texto: 'No prazo', tom: 'no-prazo' });
  });

  it('todo selo de prazo tem ícone (cor nunca é o único sinal)', () => {
    for (const prazo of Object.values(PRAZOS)) {
      expect(descreverCartao(t('FAZENDO', 'BAIXA', prazo), HOJE).prazo?.icone).toBeTruthy();
    }
  });
});

describe('descreverCartao: tarefa encerrada', () => {
  it.each(['CONCLUIDO', 'ABANDONADO'] as const)('%s vencida: sem selo de prazo, sem borda, sem sugestão', (s) => {
    for (const p of PRIORIDADES) {
      const d = descreverCartao(t(s, p, PRAZOS.vencido3), HOJE);
      expect(d.prazo).toBeUndefined();
      expect(d.urgencia).toBe('nenhuma');
      expect(d.sugerirAbandono).toBe(false);
    }
  });

  it('CONCLUIDO atrasada NÃO é atrasada, mesmo sendo Alta', () => {
    const d = descreverCartao(t('CONCLUIDO', 'ALTA', PRAZOS.vencido3), HOJE);
    expect(d.prazo).toBeUndefined();
    expect(d.urgencia).toBe('nenhuma'); // Alta também não dá borda quando encerrada
    expect(d.prioridade).toMatchObject({ texto: 'Alta', tom: 'alta' });
  });

  it.each(['CONCLUIDO', 'ABANDONADO'] as const)('%s com prazo hoje/perto também não tem urgência', (s) => {
    for (const prazo of [PRAZOS.hoje, PRAZOS.perto1, PRAZOS.noPrazo]) {
      const d = descreverCartao(t(s, 'ALTA', prazo), HOJE);
      expect(d.urgencia).toBe('nenhuma');
      expect(d.prazo).toBeUndefined();
    }
  });
});

describe('descreverCartao: urgência da borda (vencido > hoje > perto > Alta > nenhuma)', () => {
  const u = (p: Prioridade, prazo: string, s: Status = 'FAZENDO') => descreverCartao(t(s, p, prazo), HOJE).urgencia;

  it('vencido vence tudo, até Alta', () => {
    expect(u('ALTA', PRAZOS.vencido1)).toBe('vencido');
    expect(u('MEDIA', PRAZOS.vencido3)).toBe('vencido');
    expect(u('BAIXA', PRAZOS.vencido3, 'IDEALIZADO')).toBe('vencido');
  });

  it('vence hoje vem antes de Alta', () => {
    expect(u('ALTA', PRAZOS.hoje)).toBe('hoje');
    expect(u('BAIXA', PRAZOS.hoje)).toBe('hoje');
  });

  it('perto de vencer vem antes de Alta', () => {
    expect(u('ALTA', PRAZOS.perto3)).toBe('perto');
    expect(u('MEDIA', PRAZOS.perto1)).toBe('perto');
  });

  it('Alta sem urgência de prazo dá borda de Alta; Média e Baixa não dão borda', () => {
    expect(u('ALTA', PRAZOS.noPrazo)).toBe('alta');
    expect(u('MEDIA', PRAZOS.noPrazo)).toBe('nenhuma');
    expect(u('BAIXA', PRAZOS.noPrazo)).toBe('nenhuma');
  });

  it('Alta + perto de vencer: dois selos e borda do mais urgente (perto)', () => {
    const d = descreverCartao(t('FAZENDO', 'ALTA', PRAZOS.perto2), HOJE);
    expect(d.prioridade.texto).toBe('Alta');
    expect(d.prazo?.texto).toBe('Vence em 2d');
    expect(d.urgencia).toBe('perto');
  });

  it('Alta + vencida: dois selos e borda vencido', () => {
    const d = descreverCartao(t('IDEALIZADO', 'ALTA', PRAZOS.vencido3), HOJE);
    expect(d.prioridade.texto).toBe('Alta');
    expect(d.prazo?.texto).toBe('Atrasada 3d');
    expect(d.urgencia).toBe('vencido');
  });
});

describe('descreverCartao: sugestão de abandono', () => {
  it('só quando vencida e ainda em IDEALIZADO/FAZENDO', () => {
    expect(descreverCartao(t('IDEALIZADO', 'BAIXA', PRAZOS.vencido1), HOJE).sugerirAbandono).toBe(true);
    expect(descreverCartao(t('FAZENDO', 'ALTA', PRAZOS.vencido3), HOJE).sugerirAbandono).toBe(true);
    expect(descreverCartao(t('CONCLUIDO', 'ALTA', PRAZOS.vencido3), HOJE).sugerirAbandono).toBe(false);
    expect(descreverCartao(t('ABANDONADO', 'ALTA', PRAZOS.vencido3), HOJE).sugerirAbandono).toBe(false);
  });

  it('vence hoje, perto e no prazo não sugerem abandono', () => {
    for (const prazo of [PRAZOS.hoje, PRAZOS.perto1, PRAZOS.noPrazo]) {
      expect(descreverCartao(t('FAZENDO', 'ALTA', prazo), HOJE).sugerirAbandono).toBe(false);
    }
  });
});

describe('descreverCartao: determinismo', () => {
  it('depende só de (tarefa, hoje): outro hoje muda o resultado', () => {
    const tarefa = t('FAZENDO', 'MEDIA', '2026-11-20');
    expect(descreverCartao(tarefa, '2026-11-18').prazo?.texto).toBe('Vence em 2d');
    expect(descreverCartao(tarefa, '2026-11-20').prazo?.texto).toBe('Vence hoje');
    expect(descreverCartao(tarefa, '2026-11-25').prazo?.texto).toBe('Atrasada 5d');
  });
});
