/** Actual computed-style reads release pinned references without evicting user-held nodes. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, expect, vi } from 'vitest';
import type { LocatorExpression, OperationContext, NodeRef } from 'e2e/engine';
import { startFixtureApp } from '../helpers/fixture-app.ts';
import { ignoreTrace, noSecrets } from '../helpers/secrets.ts';
const builtSurface = '../../dist/surface.js';
const builtRefs = '../../dist/refs.js';
const { PlaywrightSurface } = await import(builtSurface) as typeof import('../../src/surface.ts');
const { RefRegistry } = await import(builtRefs) as typeof import('../../src/refs.ts');
const operation = (): OperationContext => ({ runId: 'css-refs', attemptId: 'css-refs', origin: 'test', timeoutMs: 10000, signal: new AbortController().signal });

it('releases real pinned CSS reads and ambiguous matches at retained-reference capacity', async () => {
  const app = await startFixtureApp();
  const artifactsDir = mkdtempSync(path.join(tmpdir(), 'e2e-css-refs-'));
  const surface = new PlaywrightSurface({});
  const stored = vi.spyOn(RefRegistry.prototype, 'storeLocated');
  try {
    await surface.init({ runId: 'css-refs', targetName: 'web', projectRoot: process.cwd(), app: { site: '127.0.0.1' }, env: {}, headed: false, workerSlot: 0, signal: new AbortController().signal, log: () => undefined });
    await surface.startAttempt({ attemptId: 'css-refs', artifactsDir, signal: new AbortController().signal, resolveSecret: noSecrets, ...ignoreTrace });
    await surface.open(app.url, operation());
    await surface.requirePage().evaluate(() => {
      document.body.innerHTML = '<label>Styled<input id="styled" style="opacity:0.5"></label><label>Repeated<input></label><label>Repeated<input></label>';
    });
    const expression: LocatorExpression = { kind: 'query', query: { kind: 'label', value: { kind: 'string', value: 'Styled', exact: true } } };
    const retained = (await surface.locate(expression, operation()))[0]!.ref as NodeRef;
    const refs = stored.mock.contexts[0]! as InstanceType<typeof RefRegistry>;
    for (let i = 1; i < 2048; i += 1) refs.storeLocated({ kind: 'locator', locator: surface.requirePage().locator('#styled') });
    stored.mockClear();
    const method = typeof RefRegistry.prototype.storeTemporary === 'function' ? 'storeTemporary' : 'storeLocated';
    const original = RefRegistry.prototype[method];
    const disposals: ReturnType<typeof vi.fn>[] = [];
    const temporaryIds: string[] = [];
    vi.spyOn(RefRegistry.prototype, method).mockImplementation(function (this: InstanceType<typeof RefRegistry>, target) {
      if (target.kind === 'element') disposals.push(vi.spyOn(target.element, 'dispose'));
      const id = original.call(this, target);
      temporaryIds.push(id);
      return id;
    });
    for (let i = 0; i < 5; i += 1) expect(await surface.readComputedStyle(expression, 'opacity', operation())).toBe('0.5');
    const ambiguous: LocatorExpression = { kind: 'query', query: { kind: 'label', value: { kind: 'string', value: 'Repeated', exact: true } } };
    await expect(surface.readComputedStyle(ambiguous, 'opacity', operation())).rejects.toMatchObject({ code: 'LOCATOR_AMBIGUOUS' });
    expect(temporaryIds).toHaveLength(7);
    expect(disposals).toHaveLength(7);
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
    for (const id of temporaryIds) expect(() => refs.lookup({ id, revision: '' })).toThrow(/stale/);
    expect(refs.lookup(retained).kind).toBe('element');
  } finally {
    vi.restoreAllMocks();
    await surface.dispose({ timeoutMs: 10000, signal: new AbortController().signal });
    await app.close();
    rmSync(artifactsDir, { recursive: true, force: true });
  }
}, 30000);
