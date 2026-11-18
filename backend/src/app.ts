import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { PRIORIDADES, validarAtualizacao, validarNovaTarefa, type ErroCampo, type Tarefa } from '../../shared/contrato.js';
import { TarefaRepositorioMemoria, type TarefaRepositorio } from './repositorio.js';

export interface OpcoesApp {
  repositorio?: TarefaRepositorio;
  agora?: () => Date;
}

// Resposta de erro no formato RFC 9457 (ADR 0004), montada à mão.
function problema(resposta: FastifyReply, status: number, title: string, errors: ErroCampo[] = [], detail?: string) {
  return resposta
    .code(status)
    .type('application/problem+json')
    .send({ type: 'about:blank', title, status, ...(detail === undefined ? {} : { detail }), errors });
}

// Prazo (YYYY-MM-DD compara como texto), depois prioridade (ALTA primeiro), depois id.
function compararTarefas(a: Tarefa, b: Tarefa): number {
  if (a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
  const porPrioridade = PRIORIDADES.indexOf(b.prioridade) - PRIORIDADES.indexOf(a.prioridade);
  return porPrioridade !== 0 ? porPrioridade : a.id - b.id;
}

// Texto em pt-BR por código de erro do Fastify; nunca repassa a mensagem crua (inglês).
function detalheDeCorpo(erro: Error): string {
  const codigo = 'code' in erro ? erro.code : undefined;
  switch (codigo) {
    case 'FST_ERR_CTP_BODY_TOO_LARGE':
      return 'O corpo da requisição é grande demais.';
    case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
      return 'O tipo de conteúdo deve ser application/json.';
    case 'FST_ERR_CTP_EMPTY_JSON_BODY':
      return 'O corpo da requisição está vazio.';
    default:
      return 'O corpo da requisição não é um JSON válido.';
  }
}

// Só inteiros positivos em texto puro ('abc', '1.5', '0', '-1', '01' não são ids).
function idDaRota(parametros: unknown): number | undefined {
  const texto = typeof parametros === 'object' && parametros !== null && 'id' in parametros ? parametros.id : undefined;
  return typeof texto === 'string' && /^[1-9]\d*$/.test(texto) && Number.isSafeInteger(Number(texto)) ? Number(texto) : undefined;
}

export function criarApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const repositorio = opcoes.repositorio ?? new TarefaRepositorioMemoria();
  const agora = opcoes.agora ?? (() => new Date());
  const app = Fastify();
  // O Fastify aceita text/plain por padrão e entregaria uma string à validação (mensagem enganosa).
  // Sem o parser, qualquer tipo que não seja JSON cai em FST_ERR_CTP_INVALID_MEDIA_TYPE.
  app.removeContentTypeParser('text/plain');

  // Qualquer falha de corpo (JSON quebrado, vazio, content-type errado) vira 400 problem+json.
  app.setErrorHandler((erro, _requisicao, resposta) => {
    const status = erro instanceof Error && 'statusCode' in erro && typeof erro.statusCode === 'number' ? erro.statusCode : 500;
    if (status >= 400 && status < 500 && erro instanceof Error) {
      return problema(resposta, 400, 'Requisição inválida', [], detalheDeCorpo(erro));
    }
    return problema(resposta, 500, 'Erro interno');
  });

  // Rota inexistente ou método não suportado: mesmo formato problem+json.
  app.setNotFoundHandler((_requisicao, resposta) => problema(resposta, 404, 'Recurso não encontrado'));

  // Rota de fumaça (T-01), removível.
  app.get('/api/saude', async () => ({ status: 'ok' }));

  app.post('/api/tarefas', async (requisicao, resposta) => {
    const resultado = validarNovaTarefa(requisicao.body, agora());
    if (!resultado.ok) {
      return problema(resposta, 400, 'Dados inválidos', resultado.erros);
    }
    const tarefa = repositorio.salvar(resultado.valor);
    return resposta.code(201).header('Location', `/api/tarefas/${tarefa.id}`).send(tarefa);
  });

  // 404 antes de qualquer outra coisa (ADR 0009): onRequest roda antes de o corpo ser lido/validado.
  const exigirTarefa = async (requisicao: FastifyRequest, resposta: FastifyReply) => {
    const id = idDaRota(requisicao.params);
    if (id === undefined || repositorio.obter(id) === undefined) {
      return problema(resposta, 404, 'Tarefa não encontrada');
    }
  };

  app.patch('/api/tarefas/:id', { onRequest: exigirTarefa }, async (requisicao, resposta) => {
    const id = idDaRota(requisicao.params);
    const atual = id === undefined ? undefined : repositorio.obter(id);
    if (id === undefined || atual === undefined) return problema(resposta, 404, 'Tarefa não encontrada');
    const resultado = validarAtualizacao(requisicao.body, atual, agora());
    if (!resultado.ok) return problema(resposta, 400, 'Dados inválidos', resultado.erros);
    return repositorio.atualizar(id, resultado.valor);
  });

  // Sem corpo e sem Content-Type (Fastify rejeita JSON vazio). O 404 já saiu no onRequest.
  app.delete('/api/tarefas/:id', { onRequest: exigirTarefa }, async (requisicao, resposta) => {
    const id = idDaRota(requisicao.params);
    if (id === undefined || !repositorio.excluir(id)) return problema(resposta, 404, 'Tarefa não encontrada');
    return resposta.code(204).send();
  });

  app.get('/api/tarefas', async () => repositorio.listar().sort(compararTarefas));

  return app;
}
