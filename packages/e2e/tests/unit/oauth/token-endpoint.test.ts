import { afterEach, describe, expect, it } from 'vitest';
import { requestTokens } from '../../../src/oauth/token-endpoint.ts';
import { useServers } from './helpers/server.ts';
const serve = useServers(afterEach);
describe('token endpoint response diagnostics', () => {
  it.each(['null', '[]', '{}', '"not a token"', '<html>upstream error</html>'])('reports malformed successful response %s as FLOW_FAILED', async (body) => {
    const endpoint = await serve((_request, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(body); });
    const failure = await requestTokens('local-vendor', endpoint.url, { grant_type: 'authorization_code', code: 'local-only' }).catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: 'OAuthError', code: 'FLOW_FAILED' });
    expect(failure).toBeInstanceOf(Error);
    if (!(failure instanceof Error)) throw new Error('expected an OAuth error');
    expect(failure.message).not.toContain('local-only');
    if (body.startsWith('<')) expect(failure.cause).toBeInstanceOf(SyntaxError);
  });
  it('accepts a valid response through native HTTP', async () => {
    const endpoint = await serve((_request, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end('{"access_token":"local-only","refresh_token":"local-refresh"}'); });
    await expect(requestTokens('local-vendor', endpoint.url, {})).resolves.toMatchObject({ access_token: 'local-only', refresh_token: 'local-refresh' });
  });
});
