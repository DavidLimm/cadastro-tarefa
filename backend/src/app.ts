import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { PRIORIDADES, validarNovaTarefa, type ErroCampo, type Tarefa } from '../../shared/contrato.js';
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

export function criarApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const repositorio = opcoes.repositorio ?? new TarefaRepositorioMemoria();
  const agora = opcoes.agora ?? (() => new Date());
  const app = Fastify();

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

  app.get('/api/tarefas', async () => repositorio.listar().sort(compararTarefas));

  return app;
}
