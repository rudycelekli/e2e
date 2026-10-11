import type {Browser,CookieFilter} from '../../src/index.ts';
declare const browser: Browser;
const filter: CookieFilter={name:/session/,domain:'localhost',path:'/'};
void (browser.clearCookies(filter) satisfies Promise<void>);
void browser.clearCookies();
// @ts-expect-error filter values must be string or RegExp
void browser.clearCookies({name:1});
// @ts-expect-error unknown options are rejected
void browser.clearCookies({url:'http://localhost'});
