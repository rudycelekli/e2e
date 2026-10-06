import { describe, expect, it } from 'vitest';
import { startFixtureApp } from '../helpers/fixture-app.ts';
import { resultByTitle, runProjectWithConfigFile, type FixtureProject } from '../helpers/run-project.ts';

/** A native engine extension declaring when its captured state becomes invalid. */
const configSource = `import { web } from '@e2e-dev/web';
import { defineEngine } from 'e2e/engine';
const base = web();
const { capabilities, ...spec } = base;
const engine = defineEngine({
  ...spec,
  name: 'web-with-state-lifetime',
  state: {
    ...base.state,
    async capture(operation) {
      const state = await base.state.capture(operation);
      return { ...state, expiresAt: new Date(Date.now() + 5000).toISOString() };
    },
  },
});
export default {
  tests: ['tests/state.e2e.ts'],
  workers: 1,
  targets: [{ name: 'web', engine, app: { url: process.env.APP_URL! } }],
};
`;

const consumers = `import { test, expect } from 'e2e';
test.setup('capture native state', { sessions: ['state'] }, async ({ app, browser, session }) => {
  await app.open();
  await browser.evaluate(() => localStorage.setItem('test-marker', 'captured'));
  await session.save('state');
});
test('restore before expiry', { session: 'state' }, async ({ app, browser }) => {
  await app.open();
  expect(await browser.evaluate(() => localStorage.getItem('test-marker'))).toBe('captured');
  await new Promise((resolve) => setTimeout(resolve, 6000));
});
test('restore after expiry', { session: 'state' }, async () => {
  throw new Error('expired state reached the test body');
});
`;

describe('session expiry in a reused worker', () => {
  it('restores native state before its lifetime ends and refuses the later consumer', async () => {
    const app = await startFixtureApp();
    let project: FixtureProject | undefined;
    try {
      const result = await runProjectWithConfigFile({ 'tests/state.e2e.ts': consumers }, {
        appUrl: app.url,
        configSource,
      });
      project = result.project;
      expect(resultByTitle(result.outcome, 'capture native state').status).toBe('passed');
      expect(resultByTitle(result.outcome, 'restore before expiry').status).toBe('passed');
      const expired = resultByTitle(result.outcome, 'restore after expiry');
      expect(expired.status).toBe('failed');
      expect(expired.attempts[0]!.error?.code).toBe('SESSION_EXPIRED');
      expect(result.outcome.exitCode).toBe(2);
    } finally {
      project?.cleanup();
      await app.close();
    }
  });
});
