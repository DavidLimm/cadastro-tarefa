import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { validarNovaTarefa, type ErroCampo } from '../../shared/contrato.js';
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

export function criarApp(opcoes: OpcoesApp = {}): FastifyInstance {
  const repositorio = opcoes.repositorio ?? new TarefaRepositorioMemoria();
  const agora = opcoes.agora ?? (() => new Date());
  const app = Fastify();

  // Qualquer falha de corpo (JSON quebrado, vazio, content-type errado) vira 400 problem+json.
  app.setErrorHandler((erro, _requisicao, resposta) => {
    const status = erro instanceof Error && 'statusCode' in erro && typeof erro.statusCode === 'number' ? erro.statusCode : 500;
    if (status >= 400 && status < 500 && erro instanceof Error) {
      return problema(resposta, 400, 'Requisição inválida', [], erro.message);
    }
    return problema(resposta, 500, 'Erro interno');
  });

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

  return app;
}
