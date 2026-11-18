import { PRIORIDADES, type Prioridade } from '../../shared/contrato.js';

export const TITULO_PAGINA = 'Tarefas';

/** Ordem das colunas do quadro: da prioridade mais alta para a mais baixa. */
export function prioridadesDaTela(): Prioridade[] {
  return [...PRIORIDADES].reverse();
}
