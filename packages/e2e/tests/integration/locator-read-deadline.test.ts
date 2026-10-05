/** A stale direct read must not renew the operation's action timeout. */
import { expect, it } from 'vitest';
import { startFixtureApp } from '../helpers/fixture-app.ts';
import { resultByTitle, runProjectWithConfigFile } from '../helpers/run-project.ts';

const CONFIG = `import { defineEngine, EngineError, withTimeout, type OperationContext, type LocatorExpression } from 'e2e/engine';
import { web } from '@e2e-dev/web';
let calls = 0;
let release!: () => void;
const pairReady = new Promise<void>(resolve => { release = resolve; });
const original = web();
const wrapped = Object.create(original);
Object.defineProperty(wrapped, 'locate', { value: async (expression: LocatorExpression, operation: OperationContext) => {
  const call = ++calls;
  const started = Date.now();
  const nodes = await original.locate!(expression, operation);
  console.log('locate-budget', call, operation.timeoutMs);
  const wait = async () => {
    if (call <= 2) {
      if (call === 2) setTimeout(release, 260);
      await pairReady;
    } else {
      await new Promise(resolve => setTimeout(resolve, 260));
    }
    return nodes.map(node => ({ ...node, ref: { ...node.ref, id: 'shared-heading' } }));
  };
  return withTimeout(wait(), Math.max(1, operation.timeoutMs - (Date.now() - started)), () => new EngineError('OPERATION_TIMEOUT', 'read budget exhausted', { retryable: false }));
} });
export default {
  projectId: 'native-read-budget-proof',
  actionTimeout: 400,
  tests: ['tests/read.e2e.ts'],
  targets: [{ name: 'web', engine: defineEngine(wrapped), app: { url: process.env.APP_URL! } }],
};
`;

const SUITE = `import { test, expect } from 'e2e';
test('bounds stale direct read retries by one action timeout', async ({ screen, app }) => {
  await app.open('/');
  const node = screen.getByRole('button', 'Increment');
  const reading = node.textContent();
  const ignored = node.count();
  const started = Date.now();
  const result = await reading.then(value => ({ value }), error => ({ error: error.code }));
  await ignored;
  console.log('read-result', JSON.stringify(result), 'elapsed', Date.now() - started);
  expect(result).toEqual({ error: 'ACTION_FAILED' });
});
`;

it('bounds stale direct-read resolution by the original deadline', async () => {
  const app = await startFixtureApp();
  let cleanup: (() => void) | undefined;
  try {
    const { outcome, project } = await runProjectWithConfigFile({ 'tests/read.e2e.ts': SUITE }, { appUrl: app.url, configSource: CONFIG });
    cleanup = () => project.cleanup();
    const result = resultByTitle(outcome, 'bounds stale direct read retries by one action timeout');
    expect(result.status, JSON.stringify(result.attempts[0]?.error)).toBe('passed');
  } finally {
    cleanup?.();
    await app.close();
  }
}, 30_000);
