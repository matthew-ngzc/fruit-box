import { startServer } from './app.js';
const { server, url } = await startServer(Number(process.env.PORT ?? 2567), process.env.HOST ?? '127.0.0.1');
console.log(`Fruit Box room server listening at ${url}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void server.gracefullyShutdown(false); });
}
