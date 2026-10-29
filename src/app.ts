import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { VersusRoom } from './versus-room.js';

export async function startServer(port = 2567, host = '127.0.0.1') {
  const http = createServer();
  const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false, gracefullyShutdown: false });
  server.define('versus', VersusRoom);
  await server.listen(port, host);
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listening address');
  return { server, url: `http://${host}:${address.port}` };
}
