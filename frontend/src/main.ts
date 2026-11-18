import { listarTarefas } from './api.js';
import { TITULO_PAGINA } from './inicio.js';
import { renderizarQuadro, type EstadoQuadro } from './quadro.js';

document.title = TITULO_PAGINA;

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Elemento #app não encontrado em index.html');

function desenhar(estado: EstadoQuadro): void {
  // T-09: passar aoAdicionar para abrir o diálogo de cadastro.
  if (raiz) renderizarQuadro(raiz, estado, { aoRecarregar: () => void carregar() });
}

async function carregar(): Promise<void> {
  desenhar({ tipo: 'carregando' });
  const r = await listarTarefas();
  if (r.ok) desenhar({ tipo: 'pronto', tarefas: r.tarefas });
  else if (r.tipo === 'validacao') desenhar({ tipo: 'erro', mensagem: 'Resposta inesperada do servidor.' });
  else desenhar({ tipo: 'erro', mensagem: r.mensagem });
}

void carregar();
