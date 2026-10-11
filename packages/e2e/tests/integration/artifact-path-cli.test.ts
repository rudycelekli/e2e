import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createProject, workerFakeConfigSource } from '../helpers/run-project.ts';
it('the built CLI keeps hosted artifact destinations identical to the output path', () => {
  const output = 'results  \u00a0space';
  const configSource = workerFakeConfigSource(1, `
    cache: 'off',
    retries: 0,
    reporters: [{ name: 'hosted', onRunFinished: run => {
      writeFileSync(path.join(run.projectRoot, 'hosted-summary.md'), renderMarkdownReport(run.report, {
        artifactsUrl: ${JSON.stringify('https://example.test/' + output)},
      }));
    } }],
  `).replace("import type { E2EConfig } from 'e2e';", "import type { E2EConfig } from 'e2e'; import { renderMarkdownReport } from 'e2e'; import { writeFileSync } from 'node:fs'; import path from 'node:path';");
  const project = createProject({
    'e2e.config.ts': configSource,
    'tests/failed.e2e.ts': "import { test, expect } from 'e2e'; test('visible failure', () => { expect(1).toBe(2); });",
  });
  try {
    const result = spawnSync(process.execPath, [path.resolve('dist/cli/bin.js'), 'run', '--reporter', 'json,markdown', '--output', output, '--trace', 'on'], {
      cwd: project.dir, env: { ...process.env, CI: '1', E2E_TELEMETRY_DISABLED: '1' }, encoding: 'utf8', timeout: 30_000,
    });
    expect(result.status, result.stderr + result.stdout).toBe(1);
    const report = JSON.parse(readFileSync(path.join(project.dir, output, 'report.json'), 'utf8'));
    expect(report.run.summary.failed).toBe(1);
    expect(report.run.usage.maxModelCallsInStep).toBe(0);
    const summary = readFileSync(path.join(project.dir, 'hosted-summary.md'), 'utf8');
    const destinations = Array.from(summary.matchAll(/\]\(([^)]+)\)/g), match => match[1]!);
    const hosted = destinations.find(destination => destination.startsWith('https://example.test/'));
    expect(hosted, summary).toBeDefined();
    expect(decodeURIComponent(new URL(hosted!).pathname).slice(1)).toBe(output);
    expect(existsSync(path.join(project.dir, decodeURIComponent(new URL(hosted!).pathname).slice(1), 'report.json'))).toBe(true);
  } finally { project.cleanup(); }
}, 35_000);
