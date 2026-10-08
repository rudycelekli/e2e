/** Public SDK shard options, through the built package and a real web target. */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureApp, type FixtureApp } from '../helpers/fixture-app.ts';
import { createProject, webTarget } from '../helpers/run-project.ts';

const publicRunner = 'e2e/runner';
const { list, run } = (await import(publicRunner)) as typeof import('../../src/run/runner.ts');
const invalidShards: [string, number, number][] = [
  ['index zero', 0, 2],
  ['total zero', 1, 0],
  ['negative index', -1, 2],
  ['negative total', 1, -2],
  ['fractional index', 1.5, 2],
  ['fractional total', 1, 2.5],
  ['NaN index', Number.NaN, 2],
  ['NaN total', 1, Number.NaN],
  ['infinite index', Number.POSITIVE_INFINITY, 2],
  ['infinite total', 1, Number.POSITIVE_INFINITY],
  ['unsafe index', Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1],
  ['unsafe total', 1, Number.MAX_SAFE_INTEGER + 1],
  ['index above total', 3, 2],
];
const declarations = `import { writeFileSync } from 'node:fs';
import { test } from 'e2e';
writeFileSync(new URL('./collected', import.meta.url), 'collected');
test('first', async () => {});
test('second', async () => {});`;

describe('public SDK shard options', () => {
  let app: FixtureApp;
  beforeAll(async () => { app = await startFixtureApp(); });
  afterAll(async () => { await app?.close(); });

  for (const api of ['list', 'run'] as const) {
    it.each(invalidShards)(`${api} refuses %s before collection even with passWithNoTests`, async (_name, index, total) => {
      const project = createProject({ 'proof.e2e.ts': declarations });
      const config = { tests: ['proof.e2e.ts'], targets: [webTarget('web', app.url)] };
      const options = { cwd: project.dir, shard: { index, total }, passWithNoTests: true };
      try {
        if (api === 'list') {
          await expect(list({ ...options, config })).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
        } else {
          const outcome = await run({ ...options, rawConfig: config, quiet: true });
          expect(outcome.exitCode).toBe(2);
          expect(outcome.results).toEqual([]);
          expect(outcome.report.run.errors).toEqual([expect.objectContaining({ code: 'INVALID_CONFIG', phase: 'config' })]);
        }
        expect(existsSync(path.join(project.dir, 'collected'))).toBe(false);
      } finally {
        project.cleanup();
      }
    });

    it.each<[string, number | undefined, number | undefined, number]>([
      ['unsharded', undefined, undefined, 2],
      ['first', 1, 2, 1],
      ['second', 2, 2, 1],
      ['valid empty shard', 3, 3, 0],
    ])(`${api} preserves %s`, async (_name, index, total, count) => {
      const project = createProject({ 'proof.e2e.ts': declarations });
      const config = { tests: ['proof.e2e.ts'], targets: [webTarget('web', app.url)] };
      const options = { cwd: project.dir, passWithNoTests: true, ...(index === undefined ? {} : { shard: { index, total: total! } }) };
      try {
        if (api === 'list') {
          const result = await list({ ...options, config });
          expect(result.pairs.filter(pair => pair.disposition === 'run')).toHaveLength(count);
        } else {
          const outcome = await run({ ...options, rawConfig: config, quiet: true });
          expect(outcome.exitCode).toBe(0);
          expect(outcome.results).toHaveLength(count);
        }
        expect(existsSync(path.join(project.dir, 'collected'))).toBe(true);
      } finally {
        project.cleanup();
      }
    });
  }
});
