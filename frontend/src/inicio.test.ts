import { describe, expect, it } from 'vitest';
import { STATUS } from '../../shared/contrato.js';
import { ROTULOS_STATUS, TITULO_PAGINA, statusDaTela } from './inicio.js';

describe('esqueleto do frontend', () => {
  it('título da página é "Tarefas"', () => {
    expect(TITULO_PAGINA).toBe('Tarefas');
  });

  it('colunas da tela vêm de shared/contrato, na ordem Idealizado, Fazendo, Concluído, Abandonado', () => {
    expect(statusDaTela()).toEqual([...STATUS]);
    expect(statusDaTela()).toEqual(['IDEALIZADO', 'FAZENDO', 'CONCLUIDO', 'ABANDONADO']);
  });

  it('cada status tem rótulo pt-BR', () => {
    expect(statusDaTela().map((s) => ROTULOS_STATUS[s])).toEqual(['Idealizado', 'Fazendo', 'Concluído', 'Abandonado']);
  });
});
