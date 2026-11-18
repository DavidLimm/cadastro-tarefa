import { describe, expect, it } from 'vitest';
import { criarApp } from './app.js';

describe('GET /api/saude', () => {
  it('responde 200 com status ok', async () => {
    const app = criarApp();
    const resposta = await app.inject({ method: 'GET', url: '/api/saude' });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
