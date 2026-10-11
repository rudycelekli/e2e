import { it, expect } from 'vitest';
import { startFixtureApp } from '../helpers/fixture-app.ts';
import { createProject, runExistingWithConfigFile, workerConfigSource } from '../helpers/run-project.ts';
it('clears matching real cookies through the built worker while preserving other storage', async () => {
 const app=await startFixtureApp();
 const project=createProject({'tests/cookies.e2e.ts': `
import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
test('selective cookie deletion preserves unrelated state', async ({app,browser}) => {
 await app.open('/');
 await browser.evaluate(() => {localStorage.setItem('preference','kept');sessionStorage.setItem('tab','kept');});
 await browser.setCookies([
 {name:'session',value:'root',domain:'127.0.0.1',path:'/',httpOnly:true},
 {name:'session',value:'admin',domain:'127.0.0.1',path:'/admin',httpOnly:true},
 {name:'language',value:'en',domain:'127.0.0.1',path:'/'}]);
 await browser.clearCookies({name:/^session$/,path:new RegExp('^/admin$')});
 const first=await browser.cookies();expect(first.length).toBe(2);
 expect(first.find(cookie=>cookie.name==='session')?.value).toBe('root');
 expect(first.find(cookie=>cookie.name==='language')?.value).toBe('en');
 let code: unknown;
 code=undefined;
 try { await browser.clearCookies({name:12} as unknown as {name:string}); } catch(error) {code=(error as {code:unknown}).code;}
 expect(code).toBe('INVALID_ARGUMENT');
 code=undefined;
 try { await browser.clearCookies({unknown:'x'} as {name?:string}); } catch(error) {code=(error as {code:unknown}).code;}
 expect(code).toBe('INVALID_ARGUMENT');
 code=undefined;
 try { await browser.clearCookies(Object.defineProperty({},'name',{value:12}) as {name?:string}); } catch(error) {code=(error as {code:unknown}).code;}
 expect(code).toBe('INVALID_ARGUMENT');
 expect((await browser.cookies()).length).toBe(2);
 await browser.clearCookies({domain:'127.0.0.1',name:'session'});
 const second=await browser.cookies();expect(second.length).toBe(1);expect(second[0]?.name).toBe('language');
 await browser.clearCookies();expect((await browser.cookies()).length).toBe(0);
 expect(await browser.evaluate(()=>localStorage.getItem('preference'))).toBe('kept');
 expect(await browser.evaluate(()=>sessionStorage.getItem('tab'))).toBe('kept');
});
`, 'e2e.config.ts':workerConfigSource(1,"\n cache:'off',\n actionTimeout:3000,")});
 try {
 const outcome=await runExistingWithConfigFile(project,{appUrl:app.url});
 expect(outcome.status,JSON.stringify(outcome,null,2)).toBe('passed');expect(outcome.report.run.summary.passed).toBe(1);}
 finally{project.cleanup();await app.close();}
},30000);
