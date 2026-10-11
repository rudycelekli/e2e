/** Element-backed located refs release their handles when pruned or cleared, like observation refs. */

import type { ElementHandle } from 'playwright-core';
import { describe, expect, it, vi } from 'vitest';
import { RefRegistry } from '../../src/refs.ts';

function handle(): { element: ElementHandle<Element>; dispose: ReturnType<typeof vi.fn> } {
  const dispose = vi.fn(() => Promise.resolve());
  return { element: { dispose } as unknown as ElementHandle<Element>, dispose };
}

describe('located element refs', () => {
  it('are disposed when the attempt clears its refs', async () => {
    const refs = new RefRegistry();
    const pinned = handle();
    const id = refs.storeLocated({ kind: 'element', element: pinned.element });
    expect(refs.lookup({ id, revision: '' })).toEqual({ kind: 'element', element: pinned.element });
    refs.clear();
    await Promise.resolve();
    expect(pinned.dispose).toHaveBeenCalledTimes(1);
    expect(() => refs.lookup({ id, revision: '' })).toThrow(/stale/);
  });

  it('are disposed when pruned past the registry bound', async () => {
    const refs = new RefRegistry();
    const first = handle();
    refs.storeLocated({ kind: 'element', element: first.element });
    for (let i = 0; i < 2048; i += 1) refs.storeLocated({ kind: 'element', element: handle().element });
    await Promise.resolve();
    expect(first.dispose).toHaveBeenCalledTimes(1);
  });
});


describe('temporary located refs', () => {
  it('release only their own pinned handles and do not evict retained refs at capacity', async () => {
    const refs = new RefRegistry();
    const retained = handle();
    const retainedId = refs.storeLocated({ kind: 'element', element: retained.element });
    for (let i = 1; i < 2048; i += 1) refs.storeLocated({ kind: 'element', element: handle().element });
    const temporary = handle();
    const id = refs.storeTemporary({ kind: 'element', element: temporary.element });
    expect(refs.lookup({ id, revision: '' })).toEqual({ kind: 'element', element: temporary.element });
    await refs.releaseTemporary({ id, revision: '' });
    await refs.releaseTemporary({ id, revision: '' });
    expect(temporary.dispose).toHaveBeenCalledTimes(1);
    expect(retained.dispose).not.toHaveBeenCalled();
    expect(refs.lookup({ id: retainedId, revision: '' }).kind).toBe('element');
    expect(() => refs.lookup({ id, revision: '' })).toThrow(/stale/);
    refs.clear();
  });

  it('clears temporary handles when the attempt ends', async () => {
    const refs = new RefRegistry();
    const temporary = handle();
    const id = refs.storeTemporary({ kind: 'element', element: temporary.element });
    refs.clear();
    await Promise.resolve();
    expect(temporary.dispose).toHaveBeenCalledTimes(1);
    expect(() => refs.lookup({ id, revision: '' })).toThrow(/stale/);
    await refs.releaseTemporary({ id, revision: '' });
    expect(temporary.dispose).toHaveBeenCalledTimes(1);
  });
});
