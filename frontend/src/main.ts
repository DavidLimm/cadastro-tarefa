import './estilo.css';
import { criarTarefa, listarTarefas } from './api.js';
import { criarDialogo } from './dialogo.js';
import { TITULO_PAGINA } from './inicio.js';
import { pedirFoco, renderizarQuadro, type EstadoQuadro } from './quadro.js';

document.title = TITULO_PAGINA;

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Elemento #app não encontrado em index.html');

const dialogo = criarDialogo(document, {
  criarTarefa,
  aoSalvo: () => {
    if (raiz) pedirFoco(raiz, 'adicionar'); // o quadro é redesenhado: devolve o foco ao botão novo
    void carregar();
  },
});
document.body.append(dialogo.elemento);

function desenhar(estado: EstadoQuadro): void {
  if (raiz) renderizarQuadro(raiz, estado, { aoRecarregar: () => void carregar(), aoAdicionar: dialogo.abrir });
}

async function carregar(): Promise<void> {
  desenhar({ tipo: 'carregando' });
  const r = await listarTarefas();
  if (r.ok) desenhar({ tipo: 'pronto', tarefas: r.tarefas });
  else if (r.tipo === 'validacao') desenhar({ tipo: 'erro', mensagem: 'Resposta inesperada do servidor.' });
  else desenhar({ tipo: 'erro', mensagem: r.mensagem });
}

void carregar();
