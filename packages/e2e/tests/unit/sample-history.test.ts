/**
 * An assertion poll's readings as one event: how many rounds it read, and,
 * when the reading changed or the poll gave up, the readings in order, so a
 * wrong expectation reads differently from a race.
 */

import { describe, expect, it } from 'vitest';
import { SampleHistory } from '../../src/expect/samples.ts';

describe('SampleHistory', () => {
  it('counts the reads of a poll that passed at once and tells no readings', () => {
    const history = new SampleHistory('expect', (text) => text);
    history.add('text "Saved"');
    expect(history.event('passed')).toMatchObject({ kind: 'poll', name: 'expect', status: 'passed', count: 1 });
    expect(history.event('passed').detail).toBeUndefined();
  });

  it('folds repeated readings and says when each new one first showed', () => {
    const history = new SampleHistory('expect', (text) => text);
    for (const value of ['text "Saving"', 'text "Saving"', 'text "Saved"']) history.add(value);
    const event = history.event('passed');
    expect(event.count).toBe(3);
    expect(event.detail).toMatch(/^text "Saving" x2 -> at \d+ms text "Saved"$/);
  });

  it('tells the one reading of a poll that gave up', () => {
    const history = new SampleHistory('waitFor', (text) => text);
    for (let index = 0; index < 4; index += 1) history.add('absent');
    expect(history.event('failed')).toMatchObject({ name: 'waitFor', status: 'failed', count: 4, detail: 'absent x4' });
  });

  it('keeps the first reading and the latest ones when the value kept changing', () => {
    const history = new SampleHistory('expect', (text) => text);
    for (let index = 0; index < 8; index += 1) history.add(`count ${index}`);
    const detail = history.event('failed').detail!;
    expect(detail.startsWith('count 0 -> … -> ')).toBe(true);
    expect(detail).toContain('count 7');
    expect(detail).not.toContain('count 3');
  });

  it('redacts a reading before it is clipped, so no cut leaves the head of a secret', () => {
    const history = new SampleHistory('expect', (text) => text.replaceAll('eyJsecret-token-value', '[secret]'));
    history.add(`value "${'x'.repeat(70)}eyJsecret-token-value"`);
    const detail = history.event('failed').detail!;
    expect(detail).toBe(`value "${'x'.repeat(70)}[s…`);
  });

  it('folds two long readings apart when they differ only past the clip', () => {
    const history = new SampleHistory('expect', (text) => text);
    const head = 'y'.repeat(100);
    history.add(`${head}a`);
    history.add(`${head}b`);
    expect(history.event('failed').detail).toMatch(/^y+… -> at \d+ms y+…$/u);
  });
});

import { execFileSync } from 'node:child_process';
it('retains bounded memory while preserving the first and recent readings', () => {
  const source = new URL('../../src/expect/samples.ts', import.meta.url).href;
  const loader = new URL('../../src/config/register.ts', import.meta.url).href;
  const script = `
    import { SampleHistory } from ${JSON.stringify(source)};
    global.gc();
    const started = process.memoryUsage().heapUsed;
    const history = new SampleHistory('expect', value => value);
    for (let index = 0; index < 20000; index++) {
      const buffer = Buffer.alloc(4096, 120);
      buffer.write(String(index));
      history.add(buffer.toString('utf8'));
    }
    history.add('final');
    history.add('final');
    global.gc();
    console.log(JSON.stringify({ heapBytes: process.memoryUsage().heapUsed - started, event: history.event('failed') }));
  `;
  const output = execFileSync(process.execPath, ['--import', loader, '--expose-gc', '--input-type=module', '-e', script], { encoding: 'utf8' });
  const measured = JSON.parse(output) as { heapBytes: number; event: { count: number; detail: string } };
  expect(measured.event.count).toBe(20002);
  expect(measured.event.detail).toMatch(/^0x+… -> … -> /u);
  expect(measured.event.detail).toContain('19998');
  expect(measured.event.detail).toContain('19999');
  expect(measured.event.detail).toMatch(/final x2$/u);
  expect(measured.heapBytes).toBeLessThan(16 * 1024 * 1024);
});
