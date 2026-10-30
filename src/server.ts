import { startServer } from './app.js';
// npm engines only warns by default; refuse known pre-fix runtimes on actual startup.
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const minimum: Record<number, [number, number]> = { 22: [23, 4], 24: [22, 1], 26: [12, 1] };
const floor = minimum[major];
if (!floor || minor < floor[0] || (minor === floor[0] && patch < floor[1])) {
  throw new Error('Install a patched Node runtime: 22.23.4+, 24.22.1+ or 26.12.1+ within those release lines');
}
const { server, url } = await startServer(Number(process.env.PORT ?? 2567), process.env.HOST ?? '127.0.0.1');
console.log(`Fruit Box room server listening at ${url}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void server.gracefullyShutdown(false); });
}
