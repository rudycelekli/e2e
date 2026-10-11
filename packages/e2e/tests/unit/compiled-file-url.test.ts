import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compiledSource } from '../../src/config/compiled-files.ts';
describe('compiled source file URLs', () => {
  it.each([['ts', 'ts', 'module'], ['tsx', 'tsx', 'module'], ['jsx', 'jsx', 'module'], ['mts', 'ts', 'module'], ['cts', 'ts', 'commonjs']])('recognizes an encoded %s extension', (extension, lang, format) => {
    const result = compiledSource(`file:///fixture/export%20source%2E${extension}`);
    expect(result).toEqual({ file: fileURLToPath(`file:///fixture/export%20source%2E${extension}`), kind: {lang, format}, project: true });
  });
  it('preserves installed-package compilation defaults', () => {
    expect(compiledSource('file:///fixture/node_modules/pkg/index%2Etsx')?.project).toBe(false);
  });
  it.each(['n%6Fde_modules', 'node_mod%75les'])('classifies encoded %s as an installed package', (segment) => {
    expect(compiledSource(`file:///fixture/${segment}/pkg/index%2Etsx`)?.project).toBe(false);
  });
  it('keeps unsupported files and protocols out of compilation', () => {
    expect(compiledSource('file:///fixture/data%2Ejson')).toBeUndefined();
    expect(compiledSource('https://example.invalid/index.ts')).toBeUndefined();
    expect(compiledSource(undefined)).toBeUndefined();
  });
});
