/** Actual component in Chromium; staff server action and all network are synthetic. */
import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const USER='11111111-1111-4111-8111-111111111111';
const OTHER='33333333-3333-4333-8333-333333333333';
let browser,bundle;
before(async()=>{
 const result=await build({stdin:{contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';
 import {PasswordRecoveryPanel} from './components/mobile-app/user-profile/password-recovery-panel';
 const root=createRoot(document.getElementById('root'));
 window.calls=[];window.pending=[];window.unmount=()=>root.unmount();
 window.renderAccount=(userId='${USER}',displayName='EA One')=>root.render(<React.StrictMode><PasswordRecoveryPanel userId={userId} displayName={displayName}/></React.StrictMode>);
 window.renderAccount();`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'staff-boundary',setup(b){
 b.onResolve({filter:/^@\/app\/\(site\)\/mobile-app\/users\/actions$/},()=>({path:'action',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export function requestMobilePasswordReset(input){window.calls.push(input);return new Promise((resolve,reject)=>window.pending.push({resolve,reject}));}`,loader:'js'}));
 }}]});bundle=result.outputFiles[0].text;browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close()});
async function mount(t){
 const page=await browser.newPage();page.setDefaultTimeout(3000);let escaped=0;
 await page.route('**/*',route=>{
  if(route.request().url()==='https://recovery.test/')return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'});
  escaped++;return route.abort();
 });
 t.after(async()=>{await page.close();assert.equal(escaped,0,'No external calls')});
 await page.goto('https://recovery.test/');await page.addScriptTag({content:bundle});
 await page.getByRole('heading',{name:'Password reset',exact:true}).waitFor();return page;
}
async function begin(page,replacement=false){
 await page.getByRole('button',{name:replacement?'Prepare replacement link':'Send password reset link',exact:true}).click();
 await page.getByRole('button',{name:replacement?'Send replacement link':'Confirm and send link',exact:true}).click();
}
async function finish(page,kind,index=0){await page.evaluate(({kind,index})=>window.pending[index].resolve({kind}),{kind,index});}
test('staff deliberately confirms one exact-account send; SMTP acceptance is not delivery',async t=>{
 const page=await mount(t);
 assert.equal(await page.evaluate(()=>window.calls.length),0);
 await begin(page);
 assert.equal(await page.evaluate(()=>window.calls.length),1);
 assert.equal(await page.evaluate(()=>window.calls[0].userId),USER);
 await finish(page,'mail_accepted');
 await page.getByRole('status').filter({hasText:'accepted the message'}).waitFor();
 assert.match(await page.getByRole('status').innerText(),/does not confirm inbox delivery/);
});

test('cancel and Strict Mode mount never send; a rapid double confirmation sends once',async t=>{
 const page=await mount(t);
 await page.getByRole('button',{name:'Send password reset link',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.calls.length),0);
 await page.getByRole('button',{name:'Send password reset link',exact:true}).click();
 await page.getByRole('button',{name:'Confirm and send link',exact:true}).evaluate(button=>{button.click();button.click()});
 assert.equal(await page.evaluate(()=>window.calls.length),1);
 assert.equal(await page.getByRole('button',{name:'Prepare replacement link',exact:true}).isDisabled(),true);
 await finish(page,'unconfirmed');
});

test('lost response retries the same attempt; only explicit replacement creates a new UUID',async t=>{
 const page=await mount(t);await begin(page);
 await page.evaluate(()=>window.pending[0].reject(Error('PRIVATE_BACKEND_ERROR')));
 await page.getByRole('status').filter({hasText:'could not confirm'}).waitFor();
 const first=await page.evaluate(()=>window.calls[0]);
 assert.equal((await page.content()).includes('PRIVATE_BACKEND_ERROR'),false);
 await page.getByRole('button',{name:'Check this request again',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>window.calls[1]),first);
 await finish(page,'mail_accepted',1);
 await page.getByRole('status').filter({hasText:'accepted the message'}).waitFor();
 await begin(page,true);
 const replacement=await page.evaluate(()=>window.calls[2]);
 assert.equal(replacement.userId,first.userId);assert.notEqual(replacement.operationId,first.operationId);
 await finish(page,'mail_accepted',2);
});

test('navigation discards the old attempt and ignores its late result',async t=>{
 const page=await mount(t);await begin(page);
 const original=await page.evaluate(()=>window.calls[0]);
 await page.evaluate(id=>window.renderAccount(id,'EA Two'),OTHER);
 await page.getByText('Send EA Two a link',{exact:false}).waitFor();
 assert.equal(await page.getByRole('status').count(),0);
 await finish(page,'mail_accepted',0);
 assert.equal(await page.getByRole('status').count(),0);
 await begin(page);
 const next=await page.evaluate(()=>window.calls[1]);
 assert.equal(next.userId,OTHER);assert.notEqual(next.operationId,original.operationId);
 await finish(page,'unconfirmed',1);
 await page.getByRole('status').filter({hasText:'could not confirm'}).waitFor();
});

test('unmount while sending never follows up or sends a replacement',async t=>{
 const page=await mount(t);await begin(page);await page.evaluate(()=>window.unmount());
 await finish(page,'mail_accepted');
 assert.equal(await page.locator('#root').innerText(),'');
 assert.equal(await page.evaluate(()=>window.calls.length),1);
});

for(const kind of ['refused','unauthorized','unconfirmed']){
 test(`${kind} remains explicit and never claims delivery`,async t=>{
  const page=await mount(t);await begin(page);await finish(page,kind);
  const status=page.getByRole('status');await status.waitFor();
  assert.doesNotMatch(await status.innerText(),/accepted the message|successfully sent|delivered/);
  assert.equal(await page.evaluate(()=>window.calls.length),1);
 });
}
