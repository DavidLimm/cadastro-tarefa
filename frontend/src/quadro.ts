import type { Status, Tarefa } from '../../shared/contrato.js';
import { diaLocal } from '../../shared/prazo.js';
import { criarMenuMover, descreverCartao, type Selo } from './cartao.js';
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
  /** Abrir o diálogo de edição do cartão (clique no título ou em área vazia do cartão). */
  aoEditar?: (id: number) => void;
  /** Único ponto de saída para mudar o status: menu, atalho "Mover para Abandonado" e soltar um cartão numa coluna. */
  aoMover?: (id: number, status: Status) => void;
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

// Arrastar e soltar nativo (ADR 0008). O cartão em arrasto vive numa variável do módulo porque `getData`
// não é legível em `dragover`; o `dataTransfer` só é preenchido por exigência do Firefox.
let arrastado: { id: number; origem: Status } | undefined;
// Profundidade de dragenter/dragleave por coluna: entrar num filho dispara dragleave no pai, e sem contar a marca piscaria.
const profundidade = new WeakMap<HTMLElement, number>();
const ATRIBUTO_ALVO = 'data-alvo-arrasto'; // o visual (borda tracejada) é do estilo.css

function limparArrasto(raiz: ParentNode): void {
  arrastado = undefined;
  for (const col of raiz.querySelectorAll<HTMLElement>(`[${ATRIBUTO_ALVO}]`)) col.removeAttribute(ATRIBUTO_ALVO);
  for (const col of raiz.querySelectorAll<HTMLElement>('.coluna')) profundidade.delete(col);
}

function cartao(doc: Document, tarefa: Tarefa, hoje: string, acoes: AcoesQuadro): HTMLElement {
  const d = descreverCartao(tarefa, hoje);
  const c = el(doc, 'article', 'cartao');
  c.dataset.id = String(tarefa.id);
  c.dataset.status = tarefa.status;
  c.dataset.urgencia = d.urgencia; // o CSS (T-12) pinta a borda esquerda a partir daqui
  c.draggable = true;
  c.addEventListener('dragstart', (ev) => {
    if (ev.target !== c) return; // arrastar texto selecionado dentro do cartão não é arrastar o cartão
    arrastado = { id: tarefa.id, origem: tarefa.status };
    const dt = (ev as DragEvent).dataTransfer;
    if (dt) {
      dt.setData('text/plain', String(tarefa.id));
      dt.effectAllowed = 'move';
    }
  });
  c.addEventListener('dragend', () => limparArrasto(c.ownerDocument));
  const editar = () => acoes.aoEditar?.(tarefa.id);
  const titulo = botao(doc, tarefa.titulo, 'cartao-titulo', `cartao-${tarefa.id}`, editar);
  // Área vazia do cartão também abre a edição; cliques em botões (título, sugestão) têm ação própria.
  c.addEventListener('click', (ev) => {
    if (!(ev.target instanceof Element) || ev.target.closest('button') === null) editar();
  });
  const selos = el(doc, 'div', 'cartao-selos');
  selos.append(selo(doc, 'prioridade', d.prioridade));
  if (d.prazo) selos.append(selo(doc, 'prazo', d.prazo));
  const h3 = el(doc, 'h3', 'cartao-cabecalho');
  h3.append(titulo);
  c.append(h3, selos, el(doc, 'p', 'prazo', `Prazo: ${formatarPrazo(tarefa.prazo)}`));
  const rodape = el(doc, 'div', 'cartao-acoes');
  rodape.append(criarMenuMover(doc, tarefa, acoes.aoMover));
  // Sugestão, nunca ação automática: só move quando o usuário clica.
  if (d.sugerirAbandono) {
    rodape.append(
      botao(doc, 'Mover para Abandonado', 'botao-abandonar', `abandonar-${tarefa.id}`, () =>
        acoes.aoMover?.(tarefa.id, 'ABANDONADO'),
      ),
    );
  }
  c.append(rodape);
  return c;
}

function coluna(doc: Document, status: Status, tarefas: Tarefa[], hoje: string, acoes: AcoesQuadro): HTMLElement {
  const sec = el(doc, 'section', 'coluna');
  sec.dataset.status = status;
  // Alvo válido: há cartão arrastado e a coluna não é a de origem (soltar onde já está não faz nada).
  const aceita = () => arrastado !== undefined && arrastado.origem !== status;
  sec.addEventListener('dragenter', () => {
    if (!aceita()) return;
    profundidade.set(sec, (profundidade.get(sec) ?? 0) + 1);
    sec.setAttribute(ATRIBUTO_ALVO, '');
  });
  sec.addEventListener('dragover', (ev) => {
    if (aceita()) ev.preventDefault(); // sem isso o navegador não permite soltar aqui
  });
  sec.addEventListener('dragleave', () => {
    const n = (profundidade.get(sec) ?? 0) - 1;
    profundidade.set(sec, Math.max(n, 0));
    if (n <= 0) sec.removeAttribute(ATRIBUTO_ALVO);
  });
  sec.addEventListener('drop', (ev) => {
    const atual = arrastado;
    if (!atual) return; // texto/arquivo arrastado de fora: ignora e deixa o navegador agir
    ev.preventDefault();
    limparArrasto(sec.ownerDocument);
    if (atual.origem !== status) acoes.aoMover?.(atual.id, status);
  });
  const cab = el(doc, 'header', 'coluna-cabecalho');
  const h2 = el(doc, 'h2');
  h2.append(el(doc, 'span', 'coluna-nome', ROTULOS_STATUS[status]), ' ', ...contagem(doc, tarefas.length));
  cab.append(h2);
  const lista = el(doc, 'div', 'coluna-cartoes'); // a rolagem vertical é desta lista (CSS na T-12)
  if (tarefas.length === 0) lista.append(el(doc, 'p', 'vazio', 'Nenhuma tarefa'));
  for (const t of tarefas) lista.append(cartao(doc, t, hoje, acoes));
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
      quadro.append(coluna(doc, status, estado.tarefas.filter((t) => t.status === status), hoje, acoes));
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
