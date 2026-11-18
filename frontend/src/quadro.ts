import type { Prioridade, Tarefa } from '../../shared/contrato.js';
import { TITULO_PAGINA, prioridadesDaTela } from './inicio.js';

export type EstadoQuadro =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; tarefas: Tarefa[] };

export interface AcoesQuadro {
  aoRecarregar: () => void;
  /** Gancho da T-09: abrir o diálogo de cadastro. Sem ação até lá. */
  aoAdicionar?: () => void;
}

const ROTULOS: Record<Prioridade, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };

/** AAAA-MM-DD -> dd/mm/aaaa por texto (Date/UTC deslocaria o dia no fuso do Brasil). */
export function formatarPrazo(prazo: string): string {
  const [ano, mes, dia] = prazo.split('-');
  return `${dia}/${mes}/${ano}`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  classe?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (classe !== undefined) e.className = classe;
  if (texto !== undefined) e.textContent = texto; // sempre texto: nunca innerHTML com dado do usuário
  return e;
}

function botao(doc: Document, texto: string, classe: string, aoClicar?: () => void): HTMLButtonElement {
  const b = el(doc, 'button', classe, texto);
  b.type = 'button';
  if (aoClicar) b.addEventListener('click', aoClicar);
  return b;
}

function cartao(doc: Document, tarefa: Tarefa): HTMLElement {
  const c = el(doc, 'article', 'cartao');
  c.append(
    el(doc, 'h3', 'cartao-titulo', tarefa.titulo),
    el(doc, 'span', `selo selo-${tarefa.prioridade.toLowerCase()}`, ROTULOS[tarefa.prioridade]),
    el(doc, 'p', 'prazo', `Prazo: ${formatarPrazo(tarefa.prazo)}`),
  );
  return c;
}

function coluna(doc: Document, prioridade: Prioridade, tarefas: Tarefa[]): HTMLElement {
  const sec = el(doc, 'section', 'coluna');
  sec.dataset.prioridade = prioridade;
  const cab = el(doc, 'header', 'coluna-cabecalho');
  cab.append(el(doc, 'h2', undefined, ROTULOS[prioridade]), el(doc, 'span', 'contador', String(tarefas.length)));
  sec.append(cab);
  if (tarefas.length === 0) sec.append(el(doc, 'p', 'vazio', 'Nenhuma tarefa'));
  for (const t of tarefas) sec.append(cartao(doc, t));
  return sec;
}

function cabecalho(doc: Document, total: number | undefined, acoes: AcoesQuadro): HTMLElement {
  const cab = el(doc, 'header', 'cabecalho');
  const h1 = el(doc, 'h1', undefined, TITULO_PAGINA);
  if (total !== undefined) h1.append(' ', el(doc, 'span', 'contador', String(total)));
  cab.append(h1, botao(doc, 'Adicionar tarefa', 'botao-primario', acoes.aoAdicionar));
  return cab;
}

/** Redesenha todo o quadro dentro de `raiz` conforme o estado. */
export function renderizarQuadro(raiz: HTMLElement, estado: EstadoQuadro, acoes: AcoesQuadro): void {
  const doc = raiz.ownerDocument;
  const filhos: HTMLElement[] = [];

  if (estado.tipo === 'carregando') {
    doc.title = TITULO_PAGINA;
    filhos.push(cabecalho(doc, undefined, acoes), el(doc, 'p', 'carregando', 'Carregando tarefas...'));
  } else if (estado.tipo === 'erro') {
    doc.title = TITULO_PAGINA;
    const erro = el(doc, 'div', 'erro');
    erro.setAttribute('role', 'alert');
    erro.append(el(doc, 'p', undefined, estado.mensagem), botao(doc, 'Tentar de novo', 'botao-secundario', acoes.aoRecarregar));
    filhos.push(cabecalho(doc, undefined, acoes), erro);
  } else {
    const total = estado.tarefas.length;
    doc.title = `${TITULO_PAGINA} (${total})`;
    filhos.push(cabecalho(doc, total, acoes));
    if (total === 0) filhos.push(el(doc, 'p', 'vazio-geral', 'Nenhuma tarefa cadastrada ainda.'));
    const quadro = el(doc, 'main', 'quadro');
    for (const p of prioridadesDaTela()) {
      quadro.append(coluna(doc, p, estado.tarefas.filter((t) => t.prioridade === p)));
    }
    filhos.push(quadro);
  }
  raiz.replaceChildren(...filhos);
}
