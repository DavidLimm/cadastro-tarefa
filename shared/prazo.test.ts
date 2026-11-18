import { describe, expect, it } from 'vitest';
import type { Status } from './contrato.js';
import { diaLocal, diasEntre, situacaoDoPrazo } from './prazo.js';

const HOJE = '2026-11-18';
const t = (prazo: string, status: Status = 'IDEALIZADO') => ({ prazo, status });

describe('diasEntre (de, ate) = ate - de em dias de calendário', () => {
  it('mesmo dia, seguinte e anterior', () => {
    expect(diasEntre('2026-11-18', '2026-11-18')).toBe(0);
    expect(diasEntre('2026-11-18', '2026-11-19')).toBe(1);
    expect(diasEntre('2026-11-18', '2026-11-17')).toBe(-1);
  });

  it('virada de mês e de ano', () => {
    expect(diasEntre('2026-01-31', '2026-02-01')).toBe(1);
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1);
    expect(diasEntre('2027-01-01', '2026-12-30')).toBe(-2);
  });

  it('ano bissexto: 29/02 existe em 2028 e 2000, não em 2100 (28/02 -> 01/03 = 1)', () => {
    expect(diasEntre('2028-02-28', '2028-03-01')).toBe(2);
    expect(diasEntre('2028-03-01', '2028-02-28')).toBe(-2);
    expect(diasEntre('2000-02-28', '2000-03-01')).toBe(2);
    expect(diasEntre('2100-02-28', '2100-03-01')).toBe(1);
  });

  it('intervalos longos', () => {
    expect(diasEntre('2026-01-01', '2027-01-01')).toBe(365);
    expect(diasEntre('2028-01-01', '2029-01-01')).toBe(366);
    expect(diasEntre('2000-01-01', '2026-11-18')).toBe(9818);
  });

  it('sem deriva de 23/25 h nos dias de horário de verão históricos (America/Sao_Paulo)', () => {
    // 2018-11-04 00:00 local nem existiu (relógio pulou para 01:00): ms/86400000 daria fração.
    expect(diasEntre('2018-11-03', '2018-11-04')).toBe(1);
    expect(diasEntre('2018-11-04', '2018-11-05')).toBe(1);
    expect(diasEntre('2018-11-03', '2018-11-05')).toBe(2);
    // fim do horário de verão: 2019-02-17 teve 25 h.
    expect(diasEntre('2019-02-16', '2019-02-17')).toBe(1);
    expect(diasEntre('2019-02-17', '2019-02-18')).toBe(1);
    expect(diasEntre('2018-10-01', '2019-03-01')).toBe(151);
  });
});

describe('diaLocal', () => {
  it('usa os getters locais, não UTC (23h30 local ainda é o mesmo dia)', () => {
    expect(diaLocal(new Date(2026, 10, 18, 23, 30))).toBe('2026-11-18');
    expect(diaLocal(new Date(2026, 10, 18, 0, 5))).toBe('2026-11-18');
  });

  it('completa mês e dia com zero', () => {
    expect(diaLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('situacaoDoPrazo em IDEALIZADO e FAZENDO', () => {
  it.each<Status>(['IDEALIZADO', 'FAZENDO'])('exemplos de R-02 (%s)', (status) => {
    expect(situacaoDoPrazo(t('2026-11-15', status), HOJE)).toEqual({ tipo: 'VENCIDO', dias: 3 });
    expect(situacaoDoPrazo(t('2026-11-17', status), HOJE)).toEqual({ tipo: 'VENCIDO', dias: 1 });
    expect(situacaoDoPrazo(t('2026-11-18', status), HOJE)).toEqual({ tipo: 'VENCE_HOJE' });
    expect(situacaoDoPrazo(t('2026-11-19', status), HOJE)).toEqual({ tipo: 'PERTO', dias: 1 });
    expect(situacaoDoPrazo(t('2026-11-20', status), HOJE)).toEqual({ tipo: 'PERTO', dias: 2 });
    expect(situacaoDoPrazo(t('2026-11-21', status), HOJE)).toEqual({ tipo: 'PERTO', dias: 3 });
    expect(situacaoDoPrazo(t('2026-11-22', status), HOJE)).toEqual({ tipo: 'NO_PRAZO' });
  });

  it('virada de mês e de ano', () => {
    expect(situacaoDoPrazo(t('2026-12-01'), '2026-11-30')).toEqual({ tipo: 'PERTO', dias: 1 });
    expect(situacaoDoPrazo(t('2026-12-30'), '2027-01-02')).toEqual({ tipo: 'VENCIDO', dias: 3 });
    expect(situacaoDoPrazo(t('2027-01-01'), '2026-12-31')).toEqual({ tipo: 'PERTO', dias: 1 });
  });

  it('29/02: hoje 2028-03-01 e prazo 2028-02-28 é VENCIDO 2', () => {
    expect(situacaoDoPrazo(t('2028-02-28'), '2028-03-01')).toEqual({ tipo: 'VENCIDO', dias: 2 });
    expect(situacaoDoPrazo(t('2028-02-29'), '2028-03-01')).toEqual({ tipo: 'VENCIDO', dias: 1 });
  });

  it('horário de verão histórico não desloca o resultado', () => {
    expect(situacaoDoPrazo(t('2018-11-03'), '2018-11-04')).toEqual({ tipo: 'VENCIDO', dias: 1 });
    expect(situacaoDoPrazo(t('2018-11-04'), '2018-11-03')).toEqual({ tipo: 'PERTO', dias: 1 });
    expect(situacaoDoPrazo(t('2018-11-04'), '2018-11-04')).toEqual({ tipo: 'VENCE_HOJE' });
    expect(situacaoDoPrazo(t('2018-11-07'), '2018-11-04')).toEqual({ tipo: 'PERTO', dias: 3 });
    expect(situacaoDoPrazo(t('2018-11-08'), '2018-11-04')).toEqual({ tipo: 'NO_PRAZO' });
  });

  it('limite diferente de 3 muda o corte do PERTO', () => {
    expect(situacaoDoPrazo(t('2026-11-22'), HOJE, 5)).toEqual({ tipo: 'PERTO', dias: 4 });
    expect(situacaoDoPrazo(t('2026-11-23'), HOJE, 5)).toEqual({ tipo: 'PERTO', dias: 5 });
    expect(situacaoDoPrazo(t('2026-11-24'), HOJE, 5)).toEqual({ tipo: 'NO_PRAZO' });
    expect(situacaoDoPrazo(t('2026-11-20'), HOJE, 1)).toEqual({ tipo: 'NO_PRAZO' });
    expect(situacaoDoPrazo(t('2026-11-19'), HOJE, 1)).toEqual({ tipo: 'PERTO', dias: 1 });
  });

  it('é determinística: depende só dos argumentos', () => {
    expect(situacaoDoPrazo(t('2026-11-20'), HOJE)).toEqual(situacaoDoPrazo(t('2026-11-20'), HOJE));
    expect(situacaoDoPrazo(t('2026-11-20'), '2026-11-19')).toEqual({ tipo: 'PERTO', dias: 1 });
  });
});

describe('situacaoDoPrazo em CONCLUIDO e ABANDONADO', () => {
  it.each<Status>(['CONCLUIDO', 'ABANDONADO'])('qualquer prazo é ENCERRADA (%s)', (status) => {
    for (const prazo of ['2020-01-01', '2026-11-17', '2026-11-18', '2026-11-19', '2030-01-01']) {
      expect(situacaoDoPrazo(t(prazo, status), HOJE)).toEqual({ tipo: 'ENCERRADA' });
    }
  });
});

// Caracterização (achado do qa): documenta o comportamento ATUAL com entradas fora do contrato.
// Em produção isso não acontece: o contrato (validarNovaTarefa/validarAtualizacao) valida o prazo
// antes, e limite é sempre o padrão. Estes testes só provam que a função não lança.
// 'abc' vira NaN (cai em NO_PRAZO); '2026-02-30' é lido como 30/02 sem validar (VENCIDO); '' vira dia 0 (VENCIDO).
const SITUACAO_ATUAL: Record<string, string> = { abc: 'NO_PRAZO', '2026-02-30': 'VENCIDO', '': 'VENCIDO' };
describe('situacaoDoPrazo com entradas inválidas (caracterização)', () => {
  it.each(['abc', '2026-02-30', ''])('prazo %j não lança e devolve uma situação definida', (prazo) => {
    const r = situacaoDoPrazo(t(prazo), HOJE);
    expect(r).toBeDefined();
    expect(r.tipo).toBe(SITUACAO_ATUAL[prazo]);
  });

  it.each([0, -1])('limite %d não lança; PERTO deixa de existir', (limite) => {
    expect(situacaoDoPrazo(t('2026-11-19'), HOJE, limite)).toEqual({ tipo: 'NO_PRAZO' });
    expect(situacaoDoPrazo(t('2026-11-18'), HOJE, limite)).toEqual({ tipo: 'VENCE_HOJE' });
  });
});
