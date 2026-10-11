import type { BrowserExpectation } from '../../src/index.ts';
import type { Locator } from 'e2e';
import type { EngineFixtureContext, LocatorExpression } from 'e2e/engine';
declare const assertion: BrowserExpectation;
declare const target: Locator;
declare const context: EngineFixtureContext;
void (context.locatorExpression(target) satisfies LocatorExpression);
void (assertion.toHaveCSS(target,'color',/red/,{timeout:100}) satisfies Promise<void>);
// @ts-expect-error the target must be a Locator
void assertion.toHaveCSS('button','color','red');
// @ts-expect-error unknown matcher options
void assertion.toHaveCSS(target,'color','red',{pollInterval:10});
