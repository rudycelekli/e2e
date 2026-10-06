import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test.describe('browser fixture', { requires: ['browser'], tags: ['browser'] }, () => {
  test.beforeEach(async ({ app }) => {
    await app.open('/browser');
  });

  test('navigation verbs and the URL and title matchers', async ({ browser }) => {
    await expect(browser).toHaveTitle('Browser');

    await browser.goto('/about');
    await expect(browser).toHaveURL('/about');
    await expect(browser).toHaveTitle('About page');
    expect(await browser.url()).toMatch(/\/about$/);
    expect(await browser.title()).toBe('About page');

    await browser.back();
    await expect(browser).toHaveURL('/browser');
    await browser.forward();
    await expect(browser).toHaveURL(/about$/);
  });

  test('waitForURL waits out a delayed navigation', async ({ screen, browser }) => {
    await screen.getByRole('button', 'Go to about, soon').tap();
    await browser.waitForURL('/about');
    await expect(screen.getByRole('heading', 'About')).toBeVisible();
  });

  test('reload runs the page again', async ({ screen, browser }) => {
    await expect(screen.getByLabel('Loads')).toHaveText('loads: 1');
    await browser.reload();
    await expect(screen.getByLabel('Loads')).toHaveText('loads: 2');
  });

  test('an init script runs before the page reads it, from the next load on', async ({ screen, browser }) => {
    await expect(screen.getByLabel('Random')).toHaveText('random: unseeded');
    await browser.addInitScript((value) => { Math.random = () => value; }, 0.5);
    await browser.reload();
    await expect(screen.getByLabel('Random')).toHaveText('random: seeded');
  });

  test('evaluate accepts methods with arguments and asynchronous results', async ({ browser }) => {
    const functions = {
      title() { return document.title; },
      async add(value: number) { return value + 1; },
      async() { return 'ordinary'; },
    };
    // Preserve the method's original trivia rather than the TypeScript printer's whitespace.
    const unusual = new Function('return ({ async\twithTab(value) { return value + 2; }, async/**/withComment(value) { return value + 3; } })')() as {
      withTab(value: number): Promise<number>;
      withComment(value: number): Promise<number>;
    };
    expect(await browser.evaluate(functions.title)).toBe('Browser');
    expect(await browser.evaluate(functions.add, 4)).toBe(5);
    expect(await browser.evaluate(unusual.withTab, 4)).toBe(6);
    expect(await browser.evaluate(unusual.withComment, 4)).toBe(7);
    expect(await browser.evaluate(functions.async)).toBe('ordinary');
  });

  test('an init script accepts a method with an argument', async ({ browser, screen }) => {
    const functions = { seed(value: number) { Math.random = () => value; } };
    await browser.addInitScript(functions.seed, 0.5);
    await browser.reload();
    await expect(screen.getByLabel('Random')).toHaveText('random: seeded');
  });

  test('the viewport size is what the page measures', async ({ screen, browser }) => {
    await browser.setViewport({ width: 500, height: 700 });
    await expect(screen.getByLabel('Viewport')).toHaveText('500x700');
    await browser.setViewport({ width: 1024, height: 640 });
    await expect(screen.getByLabel('Viewport')).toHaveText('1024x640');
  });

  test('cookies set from the test reach the page and read back', async ({ screen, browser }) => {
    await expect(screen.getByLabel('Cookies')).toHaveText('no cookies');

    await browser.setCookies([{ name: 'theme', value: 'dark', url: await browser.url() }]);
    await browser.reload();
    await expect(screen.getByLabel('Cookies')).toContainText('theme=dark');
    const theme = (await browser.cookies()).find((cookie) => cookie.name === 'theme');
    expect(theme?.value).toBe('dark');
  });
});
