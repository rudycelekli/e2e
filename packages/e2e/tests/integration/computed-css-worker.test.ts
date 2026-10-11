import { it, expect } from 'vitest';
import { startFixtureApp } from '../helpers/fixture-app.ts';
import { runProjectWithConfigFile, workerConfigSource } from '../helpers/run-project.ts';
it('reads computed CSS through actual built runner/worker locators and refuses stale ownership', async () => {
 const app=await startFixtureApp();
 const {outcome,project}=await runProjectWithConfigFile({'tests/styles.e2e.ts': `
import {test} from '@e2e-dev/web';
import {expect, type Locator} from 'e2e';
let previous: Locator | undefined;
test('computed styles follow actual scope', async ({app,browser,screen}) => {
 await app.open('/');
 await browser.evaluate(() => {
  const button=document.createElement('button');button.textContent='Styled';button.id='styled';button.style.color='rgb(1, 2, 3)';button.style.setProperty('--accent','ready');document.body.append(button);
  const host=document.createElement('div');document.body.append(host);const root=host.attachShadow({mode:'closed'});root.innerHTML='<button style="opacity:0.5">Shadow</button>';
  const frame=document.createElement('iframe');frame.srcdoc='<button style="margin-left:9px">Frame</button>';document.body.append(frame);
  setTimeout(()=>button.style.opacity='0.75',80);
 });
 const styled=screen.getByRole('button','Styled');previous=styled;
 await expect(browser).toHaveCSS(styled,'color','rgb(1, 2, 3)');
 await expect(browser).toHaveCSS(styled,'--accent',/ready/);
 await expect(browser).toHaveCSS(styled,'opacity','0.75');
 await expect(browser).not.toHaveCSS(styled,'opacity','1');
 await expect(browser).toHaveCSS(screen.getByRole('button','Shadow'),'opacity','0.5');
 await expect(browser).toHaveCSS(browser.frameLocator('iframe').getByRole('button','Frame'),'margin-left','9px');
 let code: unknown;
 code=undefined;
 try { await expect(browser).not.toHaveCSS(screen.getByTestId('missing'),'color','red',{timeout:50}); } catch(error) { code=(error as {code:unknown}).code; }

 expect(code).toBe('ASSERTION_FAILED');
 await browser.evaluate(() => { const first=document.createElement('button');first.textContent='Repeated';const second=first.cloneNode(true);document.body.append(first,second); });
 code=undefined;
 try { await expect(browser).toHaveCSS(screen.getByRole('button','Repeated'),'color','red'); } catch(error) { code=(error as {code:unknown}).code; }
 expect(code).toBe('LOCATOR_AMBIGUOUS');
 code=undefined;
 try { await expect(browser).toHaveCSS(styled,' ','red'); } catch(error) { code=(error as {code:unknown}).code; }
 expect(code).toBe('INVALID_ARGUMENT');
 code=undefined;
 try { await expect(browser).toHaveCSS(styled,'color','red',{unexpected:true} as {timeout?:number}); } catch(error) { code=(error as {code:unknown}).code; }
 expect(code).toBe('INVALID_ARGUMENT');
});
test('old-attempt locator is refused before reading the page', async ({browser}) => {
 if(previous===undefined) throw new Error('previous real locator was not retained');
 let code: unknown;
 code=undefined;
 try { await expect(browser).toHaveCSS(previous,'color','red'); } catch(error) { code=(error as {code:unknown}).code; }
 expect(code).toBe('INVALID_LOCATOR');
});
`},{appUrl:app.url,configSource:workerConfigSource(1,"\n cache:'off',\n actionTimeout:3000,\n assertionTimeout:1000,")});
 try {expect(outcome.status,JSON.stringify(outcome.report.run.results,null,2)).toBe('passed');expect(outcome.report.run.summary.passed).toBe(2);}
 finally{project.cleanup();await app.close();}
},30000);
