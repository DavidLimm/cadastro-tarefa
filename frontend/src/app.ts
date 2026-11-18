import { criarDialogo } from './dialogo.js';
import type { ResultadoCriacao, ResultadoLista } from './api.js';
import type { NovaTarefa } from '../../shared/contrato.js';
import { pedirFoco, renderizarQuadro, type EstadoQuadro } from './quadro.js';

export interface DepsApp {
  listarTarefas: () => Promise<ResultadoLista>;
  criarTarefa: (nova: NovaTarefa) => Promise<ResultadoCriacao>;
}

/** Liga quadro, diálogo e API. A API vem por parâmetro para o teste usar uma simulada. */
export function iniciar(raiz: HTMLElement, doc: Document, deps: DepsApp): void {
  const dialogo = criarDialogo(doc, {
    criarTarefa: deps.criarTarefa,
    aoSalvo: () => {
      pedirFoco(raiz, 'adicionar'); // o quadro é redesenhado: devolve o foco ao botão novo
      void carregar();
    },
  });
  doc.body.append(dialogo.elemento);

  function desenhar(estado: EstadoQuadro): void {
    renderizarQuadro(raiz, estado, { aoRecarregar: () => void carregar(), aoAdicionar: dialogo.abrir });
  }

  async function carregar(): Promise<void> {
    desenhar({ tipo: 'carregando' });
    const r = await deps.listarTarefas();
    if (r.ok) desenhar({ tipo: 'pronto', tarefas: r.tarefas });
    else if (r.tipo === 'validacao') desenhar({ tipo: 'erro', mensagem: 'Resposta inesperada do servidor.' });
    else desenhar({ tipo: 'erro', mensagem: r.mensagem });
  }

  void carregar();
}
