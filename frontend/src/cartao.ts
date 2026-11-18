// Descrição pura do cartão (ADR 0007): selos, urgência da borda e sugestão de abandono.
// `descreverCartao` é pura: sem DOM e sem relógio (`hoje` é texto 'YYYY-MM-DD' injetado por quem chama).
// `criarMenuMover` é a parte de DOM do cartão (menu "Mover para…").

import { STATUS, type Prioridade, type Status, type Tarefa } from '../../shared/contrato.js';
import { situacaoDoPrazo } from '../../shared/prazo.js';
import type { NomeIcone } from './icones.js';
import { ROTULOS_STATUS } from './inicio.js';

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

/**
 * Menu "Mover para…" em disclosure (ADR 0008): um botão com aria-expanded que abre uma lista de botões
 * comuns, um por status de destino (a coluna atual não é opção). Não é <select>: no Chrome/Windows as
 * setas mudariam o valor sem querer. Enter/Espaço são o comportamento nativo de <button>; Esc fecha.
 */
export function criarMenuMover(
  doc: Document,
  tarefa: Tarefa,
  aoMover: ((id: number, status: Status) => void) | undefined,
): HTMLElement {
  const idLista = `menu-mover-${tarefa.id}`;
  const menu = doc.createElement('div');
  menu.className = 'menu-mover';

  const botao = doc.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-mover botao-secundario';
  botao.dataset.foco = `mover-${tarefa.id}`;
  botao.textContent = 'Mover para…';
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', idLista);

  const lista = doc.createElement('ul');
  lista.className = 'menu-mover-lista';
  lista.id = idLista;
  lista.hidden = true;

  // Clique fora fecha o menu. Escuta no documento só enquanto aberto; não mexe no foco (quem foi clicado o mantém).
  const aoClicarFora = (ev: Event): void => {
    if (!(ev.target instanceof Node) || !menu.contains(ev.target)) definirAberto(false);
  };

  // U-1: o mousedown em outro botão move o foco e dispararia o focusout abaixo; fechar nesse instante
  // sobe o layout (a lista é em fluxo) e o mouseup cai em outro elemento, perdendo o clique. Então um focusout
  // causado por mouse é ignorado: o `click` fora (aoClicarFora) já fecha, depois do clique completo.
  let focoPorMouse = false;
  const aoApertarMouse = (): void => {
    focoPorMouse = true;
    setTimeout(() => {
      focoPorMouse = false; // a troca de foco do mousedown acontece na mesma tarefa, antes deste timer
    }, 0);
  };

  function definirAberto(aberto: boolean): void {
    botao.setAttribute('aria-expanded', String(aberto));
    lista.hidden = !aberto;
    if (aberto) {
      doc.addEventListener('click', aoClicarFora);
      doc.addEventListener('mousedown', aoApertarMouse, true);
    } else {
      doc.removeEventListener('click', aoClicarFora);
      doc.removeEventListener('mousedown', aoApertarMouse, true);
      focoPorMouse = false;
    }
  }

  for (const destino of STATUS.filter((s) => s !== tarefa.status)) {
    const item = doc.createElement('li');
    const opcao = doc.createElement('button');
    opcao.type = 'button';
    opcao.textContent = ROTULOS_STATUS[destino]; // texto fixo; o título nunca entra aqui
    opcao.addEventListener('click', () => {
      definirAberto(false);
      botao.focus();
      aoMover?.(tarefa.id, destino);
    });
    item.append(opcao);
    lista.append(item);
  }

  botao.addEventListener('click', () => definirAberto(botao.getAttribute('aria-expanded') !== 'true'));
  // Tab (ou foco programático) para fora do menu fecha. relatedTarget nulo (janela perdeu o foco) não fecha.
  menu.addEventListener('focusout', (ev) => {
    if (focoPorMouse) return;
    if (ev.relatedTarget instanceof Node && !menu.contains(ev.relatedTarget)) definirAberto(false);
  });
  menu.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
      ev.stopPropagation();
      definirAberto(false);
      botao.focus();
    }
  });

  menu.append(botao, lista);
  return menu;
}
