import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { resolve } from '../../src/config/esm-hooks.ts';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'e2e-main-cycle-'));
  roots.push(root);
  for (const directory of ['a', 'b']) mkdirSync(path.join(root, directory));
  writeFileSync(path.join(root, 'a/package.json'), JSON.stringify({ main: '../b' }));
  writeFileSync(path.join(root, 'b/package.json'), JSON.stringify({ main: '../a' }));
  return root;
}
function resolveA(root: string) {
  return resolve('./a', { parentURL: pathToFileURL(path.join(root, 'test.ts')).href, conditions: ['node', 'import'], importAttributes: {} }, (request) => { if (request === './a') throw Object.assign(new Error('Cannot find module ./a'), { code: 'ERR_MODULE_NOT_FOUND' }); return {url: request}; });
}
describe('directory main resolution', () => {
  it('falls back to the index when two package main entries cycle', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'a/index.ts'), 'export const value = 1;');
    expect(resolveA(root).url).toBe(pathToFileURL(path.join(root, 'a/index.ts')).href);
  });
  it('ends an unresolved cycle without overflowing the resolver', () => {
    expect(() => resolveA(fixture())).toThrowError(expect.objectContaining({code:'ERR_MODULE_NOT_FOUND'}));
  });
  it('falls back when a symlinked main returns to the same physical directory', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'a/package.json'), JSON.stringify({main:'./again'}));
    symlinkSync(path.join(root, 'a'), path.join(root, 'a/again'), 'junction');
    writeFileSync(path.join(root, 'a/index.ts'), 'export const value = 1;');
    expect(resolveA(root).url).toBe(pathToFileURL(path.join(root, 'a/index.ts')).href);
  });
  it('propagates the unresolved error for a symlinked main with no index', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'a/package.json'), JSON.stringify({main:'./again'}));
    symlinkSync(path.join(root, 'a'), path.join(root, 'a/again'), 'junction');
    expect(() => resolveA(root)).toThrowError(expect.objectContaining({code:'ERR_MODULE_NOT_FOUND'}));
  });
  it('keeps a valid main redirect ahead of its own index', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'b/package.json'), JSON.stringify({ main: './entry.ts' }));
    writeFileSync(path.join(root, 'b/entry.ts'), 'export const value = 2;');
    writeFileSync(path.join(root, 'a/index.ts'), 'export const value = 1;');
    expect(resolveA(root).url).toBe(pathToFileURL(path.join(root, 'b/entry.ts')).href);
  });
});
