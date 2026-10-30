import { createRouter } from '@colyseus/core';

export interface HttpLimits {
  maxBodyBytes: number;
  maxConcurrentBodies: number;
  bodyTimeoutMs: number;
  requestBurst: number;
  requestRefillMs: number;
}

export function createHttpRouter(options: Partial<HttpLimits> = {}) {
  const limits = { maxBodyBytes: 4096, maxConcurrentBodies: 16, bodyTimeoutMs: 5000, requestBurst: 60, requestRefillMs: 100, ...options };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid HTTP limit: ' + name);
  }
  let reading = 0;
  let tokens = limits.requestBurst;
  let refilledAt = performance.now();
  return createRouter({}, { onRequest: async request => {
    const reject = (status: number, error: string) => Response.json({ error }, { status, headers: { connection: 'close' } });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const now = performance.now();
      if (now < refilledAt) refilledAt = now;
      const refill = Math.floor((now - refilledAt) / limits.requestRefillMs);
      tokens = Math.min(limits.requestBurst, tokens + refill);
      refilledAt += refill * limits.requestRefillMs;
      if (tokens < 1) {
        return Response.json({ error: 'Too many requests' }, {
          status: 429, headers: { connection: 'close', 'retry-after': String(Math.ceil(limits.requestRefillMs / 1000)) },
        });
      }
      tokens--;
    }
    if (Number(request.headers.get('content-length')) > limits.maxBodyBytes) {
      return reject(413, 'Request body too large');
    }
    if (!request.body) return;
    if (reading >= limits.maxConcurrentBodies) return reject(503, 'Too many request bodies');
    reading++;
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Request body timed out')), limits.bodyTimeoutMs);
    });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await Promise.race([reader.read(), deadline]);
        if (done) break;
        size += value.byteLength;
        if (size > limits.maxBodyBytes) return reject(413, 'Request body too large');
        chunks.push(value);
      }
      return new Request(request, { body: Buffer.concat(chunks) });
    } catch (error) {
      return reject(error instanceof Error && error.message === 'Request body timed out' ? 408 : 400, 'Could not read request body');
    } finally {
      // Cancelling the adapter stream destroys its socket before a response can be sent.
      // Rejected responses close that socket after sending; release the paused reader now.
      clearTimeout(timer!);
      reading--;
      reader.releaseLock();
    }
  } });
}
