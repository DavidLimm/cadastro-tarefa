import { STATUS, type Status } from '../../shared/contrato.js';

export const TITULO_PAGINA = 'Tarefas';

export const ROTULOS_STATUS: Record<Status, string> = {
  IDEALIZADO: 'Idealizado',
  FAZENDO: 'Fazendo',
  CONCLUIDO: 'Concluído',
  ABANDONADO: 'Abandonado',
};

/** Ordem das colunas do quadro: a ordem de STATUS em shared/contrato. */
export function statusDaTela(): Status[] {
  return [...STATUS];
}
