// Situação do prazo (ADR 0007). Datas como texto YYYY-MM-DD; sem Date/UTC na conta de dias.

import type { Status, Tarefa } from './contrato.js';

export type SituacaoPrazo =
  | { tipo: 'VENCIDO'; dias: number }
  | { tipo: 'VENCE_HOJE' }
  | { tipo: 'PERTO'; dias: number }
  | { tipo: 'NO_PRAZO' }
  | { tipo: 'ENCERRADA' };

export const LIMITE_PERTO_PADRAO = 3;

// Número do dia (dias desde 1970-01-01) pelo algoritmo de calendário gregoriano proléptico.
function numeroDoDia(dia: string): number {
  const [a = 0, m = 0, d = 0] = dia.split('-').map(Number);
  const ano = m <= 2 ? a - 1 : a;
  const era = Math.floor(ano / 400);
  const anoDaEra = ano - era * 400;
  const diaDoAno = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const diaDaEra = anoDaEra * 365 + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100) + diaDoAno;
  return era * 146097 + diaDaEra - 719468;
}

/** Dias de calendário de `de` até `ate` (positivo se `ate` é depois). Ambos 'YYYY-MM-DD' válidos. */
export function diasEntre(de: string, ate: string): number {
  return numeroDoDia(ate) - numeroDoDia(de);
}

/** Data local de um Date como 'YYYY-MM-DD' (getters locais; toISOString usaria UTC). */
export function diaLocal(d: Date): string {
  const dois = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function encerrado(status: Status): boolean {
  return status === 'CONCLUIDO' || status === 'ABANDONADO';
}

export function situacaoDoPrazo(
  tarefa: Pick<Tarefa, 'prazo' | 'status'>,
  hoje: string,
  limite: number = LIMITE_PERTO_PADRAO,
): SituacaoPrazo {
  if (encerrado(tarefa.status)) return { tipo: 'ENCERRADA' };
  const dias = diasEntre(hoje, tarefa.prazo);
  if (dias < 0) return { tipo: 'VENCIDO', dias: -dias };
  if (dias === 0) return { tipo: 'VENCE_HOJE' };
  if (dias <= limite) return { tipo: 'PERTO', dias };
  return { tipo: 'NO_PRAZO' };
}
