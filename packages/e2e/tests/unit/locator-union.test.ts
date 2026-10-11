/** Portable locator alternatives preserve strict matching and ownership. */
import { describe, expect, it } from 'vitest';
import { resolveExpression, type SemanticNode } from '../../src/engine/index.ts';
import { screenOver } from '../helpers/screen-over.ts';
import { snapshot } from '../helpers/snapshot.ts';
const nodes: SemanticNode[] = [
 { ref: { id: 'first', revision: '' }, role: 'tab', name: 'Discover', text: 'Discover' },
 { ref: { id: 'second', revision: '' }, role: 'tab', name: 'Odkrywaj', text: 'Odkrywaj' },
];
function fixture() {
 let calls = 0;
 const { screen } = screenOver({ observe: () => snapshot(nodes), locate: expression => { calls++; return resolveExpression(expression,nodes); }, timeoutMs: 50 });
 return { screen, calls: () => calls };
}
describe('locator.or', () => {
 it('deduplicates overlap and keeps traversal order instead of branch order', async () => {
  const { screen } = fixture();
  const first = screen.getByRole('tab', { name: 'Discover' });
  const second = screen.getByRole('tab', { name: 'Odkrywaj' });
  expect(await second.or(first).allTextContents()).toEqual(['Discover','Odkrywaj']);
  expect(await first.or(first).count()).toBe(1);
  expect(await second.or(first).first().textContent()).toBe('Discover');
 });
 it('retains strict ambiguity and names both branches in diagnostics', async () => {
  const { screen } = fixture();
  await expect(screen.getByRole('tab',{ name: 'Discover' }).or(screen.getByRole('tab',{ name: 'Odkrywaj' })).textContent()).rejects.toMatchObject({ code: 'LOCATOR_AMBIGUOUS', message: expect.stringContaining('.or(') });
 });
 it('rejects a different screen and nonlocator before any dispatch', () => {
  const left=fixture(); const right=fixture();
  expect(() => left.screen.getByRole('tab').or(right.screen.getByRole('tab'))).toThrow(expect.objectContaining({ code: 'INVALID_LOCATOR' }));
  expect(() => left.screen.getByRole('tab').or({} as never)).toThrow(expect.objectContaining({ code: 'INVALID_LOCATOR' }));
  expect(left.calls()).toBe(0); expect(right.calls()).toBe(0);
 });
 it('composes filtering and handles an absent alternative', async () => {
  const { screen }=fixture();
  expect(await screen.getByRole('link').or(screen.getByRole('tab')).filter({hasText:'Discover'}).count()).toBe(1);
  expect(await screen.getByRole('link').or(screen.getByRole('button')).count()).toBe(0);
 });
});
