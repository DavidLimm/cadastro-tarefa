// Descrição pura do cartão (ADR 0007): selos, urgência da borda e sugestão de abandono.
// Sem DOM e sem relógio: `hoje` é texto 'YYYY-MM-DD' injetado por quem chama.

import type { Prioridade, Tarefa } from '../../shared/contrato.js';
import { situacaoDoPrazo } from '../../shared/prazo.js';
import type { NomeIcone } from './icones.js';

export type TomPrioridade = 'alta' | 'media' | 'baixa';
export type TomPrazo = 'vencido' | 'hoje' | 'perto' | 'no-prazo';

export interface Selo<Tom extends string> {
  icone: NomeIcone;
  texto: string;
  tom: Tom;
}

/** Destaque da borda esquerda: do mais para o menos urgente. */
export type Urgencia = 'vencido' | 'hoje' | 'perto' | 'alta' | 'nenhuma';

export interface DescricaoCartao {
  prioridade: Selo<TomPrioridade>;
  /** Ausente em CONCLUIDO/ABANDONADO (só a data aparece). */
  prazo: Selo<TomPrazo> | undefined;
  urgencia: Urgencia;
  /** Vencida e ainda em IDEALIZADO/FAZENDO: mostrar "Mover para Abandonado" (nunca move sozinho). */
  sugerirAbandono: boolean;
}

const PRIORIDADES_SELO: Record<Prioridade, Selo<TomPrioridade>> = {
  ALTA: { icone: 'seta-cima', texto: 'Alta', tom: 'alta' },
  MEDIA: { icone: 'traco', texto: 'Média', tom: 'media' },
  BAIXA: { icone: 'seta-baixo', texto: 'Baixa', tom: 'baixa' },
};

export function descreverCartao(tarefa: Tarefa, hoje: string): DescricaoCartao {
  const prioridade = PRIORIDADES_SELO[tarefa.prioridade];
  const situacao = situacaoDoPrazo(tarefa, hoje);

  switch (situacao.tipo) {
    case 'ENCERRADA':
      return { prioridade, prazo: undefined, urgencia: 'nenhuma', sugerirAbandono: false };
    case 'VENCIDO':
      return {
        prioridade,
        prazo: { icone: 'alerta', texto: `Atrasada ${situacao.dias}d`, tom: 'vencido' },
        urgencia: 'vencido',
        sugerirAbandono: true,
      };
    case 'VENCE_HOJE':
      return {
        prioridade,
        prazo: { icone: 'alerta', texto: 'Vence hoje', tom: 'hoje' },
        urgencia: 'hoje',
        sugerirAbandono: false,
      };
    case 'PERTO':
      return {
        prioridade,
        prazo: { icone: 'relogio', texto: `Vence em ${situacao.dias}d`, tom: 'perto' },
        urgencia: 'perto',
        sugerirAbandono: false,
      };
    case 'NO_PRAZO':
      return {
        prioridade,
        prazo: { icone: 'calendario', texto: 'No prazo', tom: 'no-prazo' },
        urgencia: tarefa.prioridade === 'ALTA' ? 'alta' : 'nenhuma',
        sugerirAbandono: false,
      };
  }
}
