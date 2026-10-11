import {it,expect,vi} from 'vitest';
import type {Locator} from 'e2e';
import type {EngineFixtureContext} from 'e2e/engine';
import {createBrowserFixture,type BrowserExpectation} from '../../src/browser.ts';
import type {PlaywrightSurface} from '../../src/surface.ts';
it('refuses a pre-0.20 fixture context before any browser IO',()=>{
 let factory: (()=>unknown)|undefined;
 const read=vi.fn();
 const context={
  fixture: (_name:string,value:object)=>value,
  expectable: (value:object,make:()=>unknown)=>{factory=make;return value;},
 } as unknown as EngineFixtureContext;
 createBrowserFixture({readComputedStyle:read} as unknown as PlaywrightSurface,context);
 const assertion=factory!() as BrowserExpectation;
 let error:unknown;
 try {void assertion.toHaveCSS({} as Locator,'color','red');} catch(cause){error=cause;}
 expect(error).toMatchObject({code:'UNSUPPORTED_CAPABILITY',message:expect.stringContaining('e2e >=0.20.0')});
 expect(read).not.toHaveBeenCalled();
});
