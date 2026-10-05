/** A handler failure closes an unanswered native dialog so the page can finish its operation. */

import { chromium } from 'playwright-core';
import { expect, it } from 'vitest';
import { DialogRouter } from '../../src/dialogs.ts';

it('dismisses a dialog when its handler throws before deciding', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const router = new DialogRouter();
    const failure = new Error('handler exploded');
    router.add(() => { throw failure; });
    page.on('dialog', (dialog) => { void router.dispatch(dialog); });
    const result = await Promise.race([
      page.evaluate(() => confirm('Really delete everything?')),
      new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 1_000)),
    ]);
    expect(result).toBe(false);
    expect(() => router.throwPending()).toThrowError(expect.objectContaining({
      code: 'ENGINE_FAILURE',
      cause: failure,
    }));
    expect(await page.evaluate(() => 'page still responds')).toBe('page still responds');
  } finally {
    await browser.close();
  }
});
