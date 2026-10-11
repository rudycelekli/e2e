import {it,expect,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright-core';
import type {EngineFixtureContext,EngineHandle,OperationContext} from 'e2e/engine';
import {web,surfaceOf,type Browser} from '../../src/index.ts';
import {launchRemoteChrome,closeRemoteChrome} from '../helpers/cdp-host.ts';
import {startFixtureApp} from '../helpers/fixture-app.ts';
import {ignoreTrace,noSecrets} from '../helpers/secrets.ts';
const op=():OperationContext=>({runId:'offline-run',attemptId:'offline-attempt',origin:'test',timeoutMs:10000,signal:new AbortController().signal});
const cleanup=()=>({timeoutMs:10000,signal:new AbortController().signal});
function fixture(engine:EngineHandle,url:string):Browser {
 return engine.fixtures!.browser!({operation:op,app:{resolveUrl:(value:string)=>new URL(value,url).href},fixture:(_name:string,value:object)=>value,expectable:(value:object)=>value} as unknown as EngineFixtureContext) as Browser;
}
async function init(engine:EngineHandle,dir:string,url:string):Promise<void> {
 await engine.init!({runId:'offline-run',targetName:'web',projectRoot:process.cwd(),app:{site:new URL(url).hostname},env:{},headed:false,workerSlot:0,signal:new AbortController().signal,log:()=>undefined});
 await engine.startAttempt!({attemptId:'offline-attempt',artifactsDir:dir,signal:new AbortController().signal,resolveSecret:noSecrets,...ignoreTrace});
 await engine.session!.open!(url,op());
}
it('keeps offline state through restart, reset and storage restore',async()=>{
 const app=await startFixtureApp();const dir=mkdtempSync(path.join(tmpdir(),'e2e-offline-'));const engine=web();
 try {
 await init(engine,dir,app.url);const browser=fixture(engine,app.url);const state=await engine.state!.capture(op());
 await browser.setOffline(true);
 await engine.session!.restart!(op());expect(await surfaceOf(engine)!.page().evaluate(()=>navigator.onLine)).toBe(false);
 await engine.session!.reset!(op());expect(await surfaceOf(engine)!.page().evaluate(()=>navigator.onLine)).toBe(false);
 await engine.state!.restore(state,op());await engine.session!.open!('about:blank',op());
 expect(await surfaceOf(engine)!.page().evaluate(()=>navigator.onLine)).toBe(false);
 await expect(engine.session!.open!(app.url,op())).rejects.toThrow();
 await browser.setOffline(false);await engine.session!.open!(app.url,op());
 expect(await surfaceOf(engine)!.page().evaluate(()=>navigator.onLine)).toBe(true);
 }finally{await engine.dispose!(cleanup());await app.close();rmSync(dir,{recursive:true,force:true});}
},30000);
it('reapplies explicit offline state after a real CDP drop and host network reset',async()=>{
 const app=await startFixtureApp();const remote=await launchRemoteChrome();const dir=mkdtempSync(path.join(tmpdir(),'e2e-offline-recovery-'));
 const engine=web({connect:{cdpEndpoint:()=>remote.endpoint,reconnectEndpoint:()=>remote.endpoint}});
 try {
 await init(engine,dir,app.url);const browser=fixture(engine,app.url);await browser.setOffline(true);
 await surfaceOf(engine)!.context().browser()!.close();
 const host=await chromium.connectOverCDP(remote.endpoint);
 try {await host.contexts()[0]!.setOffline(false);expect(await host.contexts()[0]!.pages()[0]!.evaluate(()=>navigator.onLine)).toBe(true);}finally{await host.close();}
 expect(await browser.evaluate(()=>navigator.onLine)).toBe(false);
 expect(await browser.evaluate(async()=>{try{await fetch('/?recovery',{cache:'no-store'});return true;}catch{return false;}})).toBe(false);
 await browser.setOffline(false);
 expect(await browser.evaluate(async()=> (await fetch('/?restored',{cache:'no-store'})).ok)).toBe(true);
 }finally{await engine.dispose!(cleanup());await closeRemoteChrome(remote);await app.close();rmSync(dir,{recursive:true,force:true});}
},60000);

it('keeps an actual offline change while its context opens a replacement tab',async()=>{
 const app=await startFixtureApp();const dir=mkdtempSync(path.join(tmpdir(),'e2e-offline-tab-'));const engine=web();
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 let applied!:()=>void;const appliedState=new Promise<void>(resolve=>{applied=resolve;});
 let changing:Promise<void>|undefined;
 try {
 await init(engine,dir,app.url);const surface=surfaceOf(engine)!;const context=surface.context();
 await surface.page().close();
 const setOffline=context.setOffline.bind(context);
 const spy=vi.spyOn(context,'setOffline').mockImplementation(async offline=>{await setOffline(offline);applied();await held;});
 changing=fixture(engine,app.url).setOffline(true);
 await Promise.race([appliedState, changing]);
 await engine.session!.open!('about:blank',op());expect(surface.context()).toBe(context);
 release();await changing;spy.mockRestore();
 expect(await surface.page().evaluate(()=>navigator.onLine)).toBe(false);
 await engine.session!.reset!(op());
 expect(await surface.page().evaluate(()=>navigator.onLine)).toBe(false);
 }finally{release();await changing?.catch(()=>undefined);vi.restoreAllMocks();await engine.dispose!(cleanup());await app.close();rmSync(dir,{recursive:true,force:true});}
},30000);
