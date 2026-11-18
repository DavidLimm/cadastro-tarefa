import { describe, expect, it } from 'vitest';
import { PRIORIDADES } from '../../shared/contrato.js';
import { TITULO_PAGINA, prioridadesDaTela } from './inicio.js';

describe('esqueleto do frontend', () => {
  it('título da página é "Tarefas"', () => {
    expect(TITULO_PAGINA).toBe('Tarefas');
  });

  it('prioridades da tela vêm de shared/contrato, da mais alta para a mais baixa', () => {
    expect(prioridadesDaTela()).toEqual([...PRIORIDADES].reverse());
    expect(prioridadesDaTela()).toEqual(['ALTA', 'MEDIA', 'BAIXA']);
  });
});
