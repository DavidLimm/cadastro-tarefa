import Fastify, { type FastifyInstance } from 'fastify';
import { TarefaRepositorioMemoria, type TarefaRepositorio } from './repositorio.js';

export interface OpcoesApp {
  repositorio?: TarefaRepositorio;
  agora?: () => Date;
}

export function criarApp(opcoes: OpcoesApp = {}): FastifyInstance {
  // Usado a partir da T-04 (rotas); por ora só resolve o default em memória.
  const _repositorio = opcoes.repositorio ?? new TarefaRepositorioMemoria();
  void _repositorio;
  const app = Fastify();

  // Rota de fumaça (T-01), removível.
  app.get('/api/saude', async () => ({ status: 'ok' }));

  return app;
}
