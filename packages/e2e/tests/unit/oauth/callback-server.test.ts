import { getEventListeners } from 'node:events';
import { describe, expect, it } from 'vitest';
import { startCallbackServer } from '../../../src/oauth/callback-server.ts';
describe('callback wait cleanup', () => {
  it('removes the abort listener when the browser wait expires', async () => {
    const server = await startCallbackServer({ port: 0, path: '/callback', state: 'local-state', productName: 'Local test' });
    expect(server).toBeDefined();
    if (server === undefined) return;
    const controller = new AbortController();
    try {
      await expect(server.waitForAnswer(controller.signal, 5)).rejects.toMatchObject({ code: 'TIMEOUT' });
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
      const waiting = server.waitForAnswer(controller.signal, 1000);
      const url = new URL(server.redirectUri.replace('localhost', '127.0.0.1'));
      url.search = 'state=local-state&code=local-code';
      const response = await fetch(url);
      expect(response.status).toBe(200);
      await expect(waiting).resolves.toEqual({ code: 'local-code' });
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    } finally { server.close(); }
  });
});
