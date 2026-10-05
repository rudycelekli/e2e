import { test as base } from '@e2e-dev/web';
import { expect } from 'e2e';
import { appendFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const marker = path.resolve('.e2e/stress-fixture.log');
const log = (entry: string): void => { appendFileSync(marker, `${entry}\n`); };
const test = base.extend<{ slow: string }>({
  slow: async (_fixtures, use) => {
    writeFileSync(marker, 'setup:slow\n');
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await use('slow');
    log('teardown:slow');
  },
}).extend<{ later: string }>({
  later: async (_fixtures, use) => {
    log('unreachable:later');
    await use('later');
  },
});

test.describe('fixture timeout', () => {
  test.beforeEach(() => { log('unreachable:beforeEach'); });
  test('times out in fixture setup', { timeout: 500 }, async () => {
    log('unreachable:body');
  });
});

base('releases the late fixture without continuing its test', async () => {
  try {
    await expect.poll(() => readFileSync(marker, 'utf8')).toContain('teardown:slow');
    expect(readFileSync(marker, 'utf8').trim().split('\n')).toEqual(['setup:slow', 'teardown:slow']);
  } finally {
    rmSync(marker, { force: true });
  }
});
