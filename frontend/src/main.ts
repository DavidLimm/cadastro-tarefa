import './estilo.css';
import { criarTarefa, listarTarefas } from './api.js';
import { iniciar } from './app.js';
import { TITULO_PAGINA } from './inicio.js';

document.title = TITULO_PAGINA;

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Elemento #app não encontrado em index.html');

iniciar(raiz, document, { criarTarefa, listarTarefas });
