import { criarApp } from './app.js';

const porta = Number(process.env.PORT ?? 8080);
const app = criarApp();

app.listen({ port: porta, host: '127.0.0.1' }).catch((erro) => {
  app.log.error(erro);
  process.exit(1);
});
