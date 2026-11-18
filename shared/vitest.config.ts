import { defineConfig } from 'vitest/config';

// Fixa o fuso para que os testes de data (ex.: 23h30 local vs UTC) valham em qualquer máquina.
process.env.TZ = 'America/Sao_Paulo';

export default defineConfig({});
