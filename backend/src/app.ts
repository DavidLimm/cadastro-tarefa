import Fastify, { type FastifyInstance } from 'fastify';

// Assinatura prevista; repositorio entra na T-03/T-04.
export interface OpcoesApp {
  repositorio?: unknown;
  agora?: () => Date;
}

export function criarApp(_opcoes: OpcoesApp = {}): FastifyInstance {
  const app = Fastify();

  // Rota de fumaça (T-01), removível.
  app.get('/api/saude', async () => ({ status: 'ok' }));

  return app;
}
