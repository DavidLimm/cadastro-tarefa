import type { Status, Tarefa } from '../../shared/contrato.js';
import { diaLocal } from '../../shared/prazo.js';
import { descreverCartao, type Selo } from './cartao.js';
import { criarIcone } from './icones.js';
import { ROTULOS_STATUS, TITULO_PAGINA, statusDaTela } from './inicio.js';

export type EstadoQuadro =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; tarefas: Tarefa[] };

export interface AcoesQuadro {
  aoRecarregar: () => void;
  /** Gancho da T-09: abrir o diálogo de cadastro. Sem ação até lá. */
  aoAdicionar?: () => void;
  /** Relógio injetável (testes). Padrão: a hora do navegador; o "hoje" dos selos é a data local. */
  hoje?: () => Date;
}

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

function botao(doc: Document, texto: string, classe: string, foco: string, aoClicar?: () => void): HTMLButtonElement {
  const b = el(doc, 'button', classe, texto);
  b.type = 'button';
  b.dataset.foco = foco; // identifica o botão para restaurar o foco depois de redesenhar
  if (aoClicar) b.addEventListener('click', aoClicar);
  return b;
}

function contagem(doc: Document, n: number): Node[] {
  // O número visual fica fora do nome acessível; o leitor de tela lê "5 tarefas" (singular: "1 tarefa").
  const visual = el(doc, 'span', 'contador', String(n));
  visual.setAttribute('aria-hidden', 'true');
  return [visual, el(doc, 'span', 'so-leitor', `${n} ${n === 1 ? 'tarefa' : 'tarefas'}`)];
}

function selo(doc: Document, tipo: 'prioridade' | 'prazo', s: Selo<string>): HTMLElement {
  const e = el(doc, 'span', `selo selo-${tipo} selo-${s.tom}`);
  e.append(criarIcone(doc, s.icone), el(doc, 'span', 'selo-texto', s.texto));
  return e;
}

function cartao(doc: Document, tarefa: Tarefa, hoje: string): HTMLElement {
  const d = descreverCartao(tarefa, hoje);
  const c = el(doc, 'article', 'cartao');
  c.dataset.id = String(tarefa.id);
  c.dataset.status = tarefa.status;
  c.dataset.urgencia = d.urgencia; // o CSS (T-12) pinta a borda esquerda a partir daqui
  const titulo = botao(doc, tarefa.titulo, 'cartao-titulo', `cartao-${tarefa.id}`); // abrir edição: T-09
  const selos = el(doc, 'div', 'cartao-selos');
  selos.append(selo(doc, 'prioridade', d.prioridade));
  if (d.prazo) selos.append(selo(doc, 'prazo', d.prazo));
  const h3 = el(doc, 'h3', 'cartao-cabecalho');
  h3.append(titulo);
  c.append(h3, selos, el(doc, 'p', 'prazo', `Prazo: ${formatarPrazo(tarefa.prazo)}`));
  // Sugestão, nunca ação automática; o clique é ligado na T-10.
  if (d.sugerirAbandono) c.append(botao(doc, 'Mover para Abandonado', 'botao-abandonar', `abandonar-${tarefa.id}`));
  return c;
}

function coluna(doc: Document, status: Status, tarefas: Tarefa[], hoje: string): HTMLElement {
  const sec = el(doc, 'section', 'coluna');
  sec.dataset.status = status;
  const cab = el(doc, 'header', 'coluna-cabecalho');
  const h2 = el(doc, 'h2');
  h2.append(el(doc, 'span', 'coluna-nome', ROTULOS_STATUS[status]), ' ', ...contagem(doc, tarefas.length));
  cab.append(h2);
  const lista = el(doc, 'div', 'coluna-cartoes'); // a rolagem vertical é desta lista (CSS na T-12)
  if (tarefas.length === 0) lista.append(el(doc, 'p', 'vazio', 'Nenhuma tarefa'));
  for (const t of tarefas) lista.append(cartao(doc, t, hoje));
  sec.append(cab, lista);
  return sec;
}

function cabecalho(doc: Document, total: number | undefined, acoes: AcoesQuadro): HTMLElement {
  const cab = el(doc, 'header', 'cabecalho');
  const h1 = el(doc, 'h1', undefined, TITULO_PAGINA);
  if (total !== undefined) {
    h1.append(' ', ...contagem(doc, total));
  }
  cab.append(h1, botao(doc, 'Adicionar tarefa', 'botao-primario', 'adicionar', acoes.aoAdicionar));
  return cab;
}

/** Pede que o foco vá para o botão `data-foco=id` assim que ele existir no quadro (sobrevive a redesenhos). */
export function pedirFoco(raiz: HTMLElement, id: string): void {
  raiz.dataset.focoPendente = id;
}

/** Redesenha todo o quadro dentro de `raiz` conforme o estado. */
export function renderizarQuadro(raiz: HTMLElement, estado: EstadoQuadro, acoes: AcoesQuadro): void {
  const doc = raiz.ownerDocument;
  // O redesenho apaga os elementos: guarda quem tinha o foco para devolvê-lo ao equivalente novo.
  const ativo = doc.activeElement;
  const focoAtual = ativo instanceof HTMLElement && raiz.contains(ativo) ? ativo.dataset.foco : undefined;
  const alvo = raiz.dataset.focoPendente ?? focoAtual;
  const filhos: HTMLElement[] = [];

  if (estado.tipo === 'carregando') {
    doc.title = TITULO_PAGINA;
    filhos.push(cabecalho(doc, undefined, acoes), el(doc, 'p', 'carregando', 'Carregando tarefas...'));
  } else if (estado.tipo === 'erro') {
    doc.title = TITULO_PAGINA;
    const erro = el(doc, 'div', 'erro');
    erro.setAttribute('role', 'alert');
    erro.append(el(doc, 'p', undefined, estado.mensagem), botao(doc, 'Tentar de novo', 'botao-secundario', 'tentar', acoes.aoRecarregar));
    filhos.push(cabecalho(doc, undefined, acoes), erro);
  } else {
    const total = estado.tarefas.length;
    doc.title = `${TITULO_PAGINA} (${total})`;
    filhos.push(cabecalho(doc, total, acoes));
    if (total === 0) filhos.push(el(doc, 'p', 'vazio-geral', 'Nenhuma tarefa cadastrada ainda.'));
    const quadro = el(doc, 'main', 'quadro');
    const hoje = diaLocal((acoes.hoje ?? (() => new Date()))());
    for (const status of statusDaTela()) {
      quadro.append(coluna(doc, status, estado.tarefas.filter((t) => t.status === status), hoje));
    }
    filhos.push(quadro);
  }
  raiz.replaceChildren(...filhos);

  if (alvo === undefined) return;
  const novo = raiz.querySelector<HTMLElement>(`[data-foco="${alvo}"]`);
  if (novo) {
    novo.focus();
    delete raiz.dataset.focoPendente;
  } else if (estado.tipo === 'carregando') {
    raiz.dataset.focoPendente = alvo; // o botão ainda não existe: tenta de novo no próximo desenho
  } else {
    delete raiz.dataset.focoPendente;
    raiz.querySelector<HTMLElement>('[data-foco="adicionar"]')?.focus(); // ex.: o erro sumiu
  }
}
