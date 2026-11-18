import { criarDialogo, type ResultadoDialogo } from './dialogo.js';
import type { ResultadoAtualizacao, ResultadoCriacao, ResultadoExclusao, ResultadoLista } from './api.js';
import type { EdicaoTarefa, NovaTarefa, Status, Tarefa } from '../../shared/contrato.js';
import { ROTULOS_STATUS } from './inicio.js';
import { pedirFoco, renderizarQuadro, type EstadoQuadro } from './quadro.js';

export interface DepsApp {
  listarTarefas: () => Promise<ResultadoLista>;
  criarTarefa: (nova: NovaTarefa) => Promise<ResultadoCriacao>;
  atualizarTarefa: (id: number, parcial: Partial<EdicaoTarefa>) => Promise<ResultadoAtualizacao>;
  excluirTarefa: (id: number) => Promise<ResultadoExclusao>;
}

const MSG_SUMIU = 'Esta tarefa não existe mais.';

/** Liga quadro, diálogo e API. A API vem por parâmetro para o teste usar uma simulada. */
export function iniciar(raiz: HTMLElement, doc: Document, deps: DepsApp): void {
  let tarefasAtuais: Tarefa[] = [];

  // Região de avisos de erro, criada UMA vez e fora do que o quadro redesenha (um alerta precisa
  // existir antes de o texto mudar para ser anunciado).
  const aviso = doc.createElement('div');
  aviso.className = 'aviso';
  aviso.setAttribute('role', 'alert');
  doc.body.append(aviso);

  function avisar(texto: string): void {
    aviso.textContent = texto;
  }

  // Anúncio de sucesso para leitor de tela, também criado uma vez e fora do quadro.
  const anuncio = doc.createElement('div');
  anuncio.className = 'so-leitor';
  anuncio.setAttribute('role', 'status');
  anuncio.setAttribute('aria-live', 'polite');
  doc.body.append(anuncio);

  const movendo = new Set<number>(); // ids com PATCH em andamento: evita duas movidas simultâneas

  const dialogo = criarDialogo(doc, {
    criarTarefa: deps.criarTarefa,
    atualizarTarefa: deps.atualizarTarefa,
    excluirTarefa: deps.excluirTarefa,
    aoSalvo: () => {
      pedirFoco(raiz, 'adicionar'); // o quadro é redesenhado: devolve o foco ao botão novo
      void carregar();
    },
    aoAlterado: (r) => depoisDeAlterar(r),
  });
  doc.body.append(dialogo.elemento);

  function depoisDeAlterar(r: ResultadoDialogo): void {
    switch (r.tipo) {
      case 'editada':
        pedirFoco(raiz, `cartao-${r.id}`);
        break;
      case 'excluida':
        pedirFoco(raiz, 'adicionar');
        break;
      case 'naoEncontrada':
        avisar(MSG_SUMIU);
        pedirFoco(raiz, 'adicionar');
        break;
      default: {
        const _exaustivo: never = r.tipo;
        return _exaustivo;
      }
    }
    void carregar(true);
  }

  function aoEditar(id: number): void {
    const tarefa = tarefasAtuais.find((t) => t.id === id);
    if (!tarefa) return;
    avisar('');
    dialogo.abrirEditar(tarefa);
  }

  /** Único caminho para mudar o status de um cartão (menu, atalho e, na T-11, arrastar). */
  async function aoMover(id: number, status: Status): Promise<void> {
    if (movendo.has(id)) return;
    movendo.add(id);
    avisar('');
    anuncio.textContent = '';
    try {
      const r = await deps.atualizarTarefa(id, { status });
      if (r.ok) {
        pedirFoco(raiz, `cartao-${id}`);
        await carregar(true);
        anuncio.textContent = `«${r.tarefa.titulo}» movido para ${ROTULOS_STATUS[status]}.`;
        return;
      }
      switch (r.tipo) {
        case 'naoEncontrada':
          avisar(MSG_SUMIU);
          await carregar(true);
          break;
        case 'validacao':
        case 'rede':
        case 'servidor':
          avisar(`Não foi possível mover. ${r.tipo === 'validacao' ? 'Resposta inesperada do servidor.' : r.mensagem}`);
          break;
        default: {
          const _exaustivo: never = r;
          return _exaustivo;
        }
      }
    } finally {
      movendo.delete(id);
    }
  }

  function desenhar(estado: EstadoQuadro): void {
    renderizarQuadro(raiz, estado, {
      aoRecarregar: () => void carregar(),
      aoAdicionar: () => {
        avisar('');
        dialogo.abrir();
      },
      aoEditar,
      aoMover: (id, status) => void aoMover(id, status),
    });
  }

  /** `silencioso`: recarga sem a tela "Carregando…" (editar/mover/excluir não piscam o quadro). */
  async function carregar(silencioso = false): Promise<void> {
    if (!silencioso) desenhar({ tipo: 'carregando' });
    const r = await deps.listarTarefas();
    if (r.ok) {
      tarefasAtuais = r.tarefas;
      desenhar({ tipo: 'pronto', tarefas: r.tarefas });
    } else if (r.tipo === 'validacao') desenhar({ tipo: 'erro', mensagem: 'Resposta inesperada do servidor.' });
    else desenhar({ tipo: 'erro', mensagem: r.mensagem });
  }

  void carregar();
}
