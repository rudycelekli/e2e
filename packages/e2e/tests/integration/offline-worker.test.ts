import { it, expect } from 'vitest';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import { createProject, runExistingWithConfigFile, workerConfigSource, type FixtureProject } from '../helpers/run-project.ts';
it('emulates real network loss and resets it for the next built worker attempt', async () => {
 const reached:string[]=[];
 const server=createServer((req,res)=>{if(req.url?.startsWith('/reach'))reached.push(req.url);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',req.url?.startsWith('/reach')?'text/plain':'text/html');res.end(req.url?.startsWith('/reach')?'network':'<!doctype html><h1>Offline app</h1>');});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+String((server.address() as AddressInfo).port);
 let project: FixtureProject | undefined;
 try {
 project=createProject({'e2e.config.ts':workerConfigSource(1,"\n cache:'off',\n actionTimeout:3000,"),'tests/offline.e2e.ts': `
import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
test('offline and online use actual network reachability', async ({app,browser}) => {
 await app.open('/');await browser.setOffline(true);
 expect(await browser.evaluate(()=>navigator.onLine)).toBe(false);
 expect(await browser.evaluate(async()=>{try {await fetch('/reach?offline',{cache:'no-store'});return true;}catch{return false;}})).toBe(false);
 await browser.setOffline(false);
 expect(await browser.evaluate(()=>navigator.onLine)).toBe(true);
 expect(await browser.evaluate(async()=>await (await fetch('/reach?online',{cache:'no-store'})).text())).toBe('network');
 let code: unknown;
 try {await browser.setOffline('yes' as unknown as boolean);}catch(error){code=(error as {code:unknown}).code;}
 expect(code).toBe('INVALID_ARGUMENT');expect(await browser.evaluate(()=>navigator.onLine)).toBe(true);
 await browser.setOffline(true);
});
test('the next attempt has an independent online context', async ({app,browser}) => {
 await app.open('/');expect(await browser.evaluate(()=>navigator.onLine)).toBe(true);
 expect(await browser.evaluate(async()=>await (await fetch('/reach?fresh',{cache:'no-store'})).text())).toBe('network');
});
`});
 const outcome=await runExistingWithConfigFile(project,{appUrl:url});
 expect(outcome.status,JSON.stringify(outcome,null,2)).toBe('passed');expect(outcome.report.run.summary.passed).toBe(2);expect(reached).toEqual(['/reach?online','/reach?fresh']);}
 finally{project?.cleanup();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
},30000);
