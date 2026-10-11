import { describe, expect, it } from 'vitest';
import { link } from '../../src/report/markdown-text.ts';
import { renderMarkdownReport } from '../../src/report/markdown.ts';
import { reportDocument } from '../helpers/report.ts';
describe('artifact link destination identity', () => {
  it.each(['./artifacts/export  final.csv', './artifacts/ leading .csv', './artifacts/a\u00a0b.csv', './artifacts/a\u2003b.csv', './artifacts/a(1)<2>.csv'])('round trips %s', (destination) => {
    const rendered = link('artifact', destination);
    const encoded = rendered.slice('[artifact]('.length, -1);
    expect(decodeURIComponent(encoded)).toBe(destination);
    expect(encoded).not.toMatch(/[\s()<>]/);
  });
  it('preserves already encoded URLs and unrelated query separators', () => {
    expect(link('artifact', 'https://example.invalid/a%20b?q=a&v=b#part')).toBe('[artifact](https://example.invalid/a%20b?q=a&v=b#part)');
  });
  it('retains repeated spaces in the actual run-artifact destination', () => {
    const url = 'https://example.invalid/run  artifacts/';
    const body = renderMarkdownReport(reportDocument(), { artifactsUrl: url });
    expect(body).toContain('[run artifacts](https://example.invalid/run%20%20artifacts/)');
  });
});
