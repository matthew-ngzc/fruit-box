import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom, SoloRoom } from './game-room.js';
import { resolve } from 'node:path';

export async function startServer(port = 2567, host = '127.0.0.1') {
  const http = createServer();
  const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false, gracefullyShutdown: false,
    express: app => {
      app.get('/', (_req, res) => res.sendFile(resolve('web/index.html')));
      app.get('/app.js', (_req, res) => res.sendFile(resolve('dist/web/app.js')));
      app.get('/style.css', (_req, res) => res.sendFile(resolve('web/style.css')));
      app.get('/third-party-license', (_req, res) => res.type('text').sendFile(resolve('vendor/fruit-box-game/LICENSE')));
    },
  });
  server.define('versus', GameRoom);
  server.define('solo', SoloRoom);
  await server.listen(port, host);
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listening address');
  return { server, url: `http://${host}:${address.port}` };
}
