/** Native manual gestures stop at cancellation and release their pressed mouse. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Page } from 'playwright-core';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { surfaceOf, web } from '../../src/index.ts';
import { noSecrets } from '../helpers/secrets.ts';

const engine = web();
const signal = new AbortController().signal;
const operation = { signal, timeoutMs: 5_000, runId: 'pointer', attemptId: 'pointer', origin: 'test' as const };
const dir = mkdtempSync(path.join(tmpdir(), 'e2e-pointer-cancel-'));
let page: Page;

beforeAll(async () => {
  await engine.init!({ runId: 'pointer', targetName: 'web', projectRoot: process.cwd(), app: {}, env: {}, headed: false, workerSlot: 0, signal, log: () => undefined });
  await engine.startAttempt!({ attemptId: 'pointer', artifactsDir: dir, signal, resolveSecret: noSecrets });
  await engine.session!.open!('about:blank', operation);
  page = surfaceOf(engine)!.page();
});

afterAll(async () => {
  await engine.dispose!({ signal, timeoutMs: 30_000 });
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  await page.goto('about:blank');
  await page.evaluate(() => {
    document.body.innerHTML = '<button style="width:100px;height:100px">Source</button><button style="width:100px;height:100px">Destination</button>';
    document.body.dataset.events = '';
    addEventListener('mousedown', () => {
      document.body.dataset.events += 'down,';
      if (document.body.dataset.cancel === 'down') {
        console.log('cancel-gesture');
        const ends = performance.now() + 150;
        while (performance.now() < ends) { /* Keep the native input pending while cancellation arrives. */ }
      }
    });
    addEventListener('mousemove', (event) => {
      if (!event.buttons) return;
      document.body.dataset.events += 'move,';
      if (document.body.dataset.cancel === 'move') {
        console.log('cancel-gesture');
        const ends = performance.now() + 150;
        while (performance.now() < ends) { /* Cancellation arrives before the next native move. */ }
      }
    });
    addEventListener('mouseup', () => { document.body.dataset.events += 'up,'; });
  });
});

it.each([['point', 'down'], ['observed', 'down'], ['point', 'move'], ['observed', 'move']] as const)('stops later movements in a %s drag cancelled on %s', async (kind, cancelAt) => {
  await page.evaluate((at) => { document.body.dataset.cancel = at; }, cancelAt);
  const controller = new AbortController();
  const cancel = (message: { text(): string }): void => { if (message.text() === 'cancel-gesture') controller.abort(); };
  page.on('console', cancel);
  try {
    const observed = await engine.observe!(operation);
    const source = observed.root.children!.find((node) => node.name === 'Source')!;
    const destination = observed.root.children!.find((node) => node.name === 'Destination')!;
    const current = { ...operation, signal: controller.signal };
    const gesture = kind === 'point'
      ? engine.performAt!({ x: 20, y: 20 }, { kind: 'dragTo', target: { x: 170, y: 20 } }, current)
      : engine.perform!(source.ref, { kind: 'dragTo', target: destination.ref }, current);
    await expect(gesture).rejects.toMatchObject({ code: 'CANCELLED' });
    await page.waitForFunction(() => document.body.dataset.events?.endsWith('up,') === true);
    expect(await page.getAttribute('body', 'data-events')).toBe(cancelAt === 'down' ? 'down,up,' : 'down,move,up,');
  } finally {
    page.off('console', cancel);
  }
});

it.each(['point', 'observed'] as const)('completes an uncancelled %s drag', async (kind) => {
  const observed = await engine.observe!(operation);
  if (kind === 'point') await engine.performAt!({ x: 20, y: 20 }, { kind: 'dragTo', target: { x: 170, y: 20 } }, operation);
  else {
    const source = observed.root.children!.find((node) => node.name === 'Source')!;
    const destination = observed.root.children!.find((node) => node.name === 'Destination')!;
    await engine.perform!(source.ref, { kind: 'dragTo', target: destination.ref }, operation);
  }
  expect(await page.getAttribute('body', 'data-events')).toBe(kind === 'point' ? 'down,move,move,up,' : 'down,move,move,move,up,');
});
