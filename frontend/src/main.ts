import { TITULO_PAGINA, prioridadesDaTela } from './inicio.js';

document.title = TITULO_PAGINA;
// Página em branco por enquanto; as colunas vêm do contrato compartilhado (prova a resolução de shared/).
document.body.dataset.colunas = prioridadesDaTela().join(',');
