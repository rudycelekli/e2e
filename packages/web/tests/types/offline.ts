import type {Browser} from '../../src/index.ts';
declare const browser: Browser;
void (browser.setOffline(true) satisfies Promise<void>);
void browser.setOffline(false);
// @ts-expect-error offline must be boolean
void browser.setOffline('offline');
