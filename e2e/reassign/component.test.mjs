/** Actual React UI in Chromium. Navigation and server actions are synthetic;
 * all browser network is blocked. This is component proof, not a live transfer. */
import assert from 'node:assert/strict';
import {before, after, test} from 'node:test';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const EA_A='00000000-0000-4000-8000-000000000001';
const EA_B='00000000-0000-4000-8000-000000000003';
const SUCCESSOR='00000000-0000-4000-8000-000000000002';
const JOB='00000000-0000-4000-8000-000000000200';
const actions=`
export function loadMobileReassignment(id){window.calls.load.push(id);if(window.deferLoads)return new Promise(resolve=>window.pendingLoads.push({id,resolve}));return Promise.resolve({ok:true,data:window.fixtureJob});}
export function previewMobileReassignRoster(input){window.calls.preview.push(input);return new Promise((resolve,reject)=>window.pendingPreviews.push({resolve,reject,input}));}
export async function createMobileReassignment(input){window.calls.create.push(input);if(window.acceptCreate){const data=structuredClone(window.fixtureJob);data.job.status='created';data.job.retryable=false;data.job.total_items=2;data.job.progress_cursor=-1;data.items[0].state='pending';data.items.push({...data.items[0],position:1,entity_id:'00000000-0000-4000-8000-000000000099'});window.twoItemJob=data;return {ok:true,data};}if(window.deferCreate)return new Promise(resolve=>window.finishCreate=resolve);if(window.rejectCreate)throw Error('Synthetic transport loss');return {ok:false,status:502,code:'mobile_handover_unavailable',message:'Synthetic create boundary'};}
export async function executeMobileReassignment(id){window.calls.execute.push(id);if(window.deferExec)return new Promise(resolve=>(window.pendingExecs??=[]).push({id,resolve}));throw Error('Synthetic transport loss');}
`;
const navigation=`
import {useSyncExternalStore} from 'react';
const listeners=new Set();
window.navigateQuery=query=>{window.query=query;listeners.forEach(fn=>fn());};
export function usePathname(){return '/mobile-app/reassign';}
export function useSearchParams(){return new URLSearchParams(useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>window.query));}
export function useRouter(){return {replace(url){window.calls.navigation.push(url);const query=url.split('?')[1]||'';if(window.deferNavigation){window.finishNavigation=()=>window.navigateQuery(query);return;}window.navigateQuery(query);}};}
`;
const entry=`
import React from 'react';import {createRoot} from 'react-dom/client';
import {MobileReassignRosterFlow} from './components/mobile-app/reassign/reassign-roster-flow';
import {VALID_REASSIGN_JOB_PAYLOAD,VALID_REASSIGN_ROSTER_PAYLOAD} from './lib/mobile/reassign/test-fixtures';
window.fixtureJob=structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
window.fixtureJob.job.status=window.jobStatus;window.fixtureJob.job.retryable=window.jobStatus==='running';
window.fixtureJob.items[0].state=window.jobStatus==='complete'?'transferred':'pending';
window.fixturePreview=structuredClone(VALID_REASSIGN_ROSTER_PAYLOAD);window.fixturePreview.from_ea_name='EA A';
window.calls={load:[],preview:[],create:[],execute:[],navigation:[]};window.pendingPreviews=[];window.pendingLoads=[];
const root=createRoot(document.getElementById('root'));window.unmount=()=>root.unmount();const element=(<MobileReassignRosterFlow candidates={[
 {userId:'${EA_A}',displayName:'EA A',school:'Fixture school',employmentStatus:'active'},
 {userId:'${EA_B}',displayName:'EA B',school:'Fixture school',employmentStatus:'active'}
]}/>);root.render(window.strictMode?<React.StrictMode>{element}</React.StrictMode>:element);
`;
let browser,bundle;
before(async()=>{
 const built=await build({stdin:{contents:entry,loader:'tsx',resolveDir:process.cwd()},absWorkingDir:process.cwd(),bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'closed-boundaries',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
 b.onResolve({filter:/^@\/app\/\(site\)\/mobile-app\/reassign\/actions$/},()=>({path:'actions',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='navigation'?navigation:actions,loader:'js',resolveDir:process.cwd()}));
 }}]});bundle=built.outputFiles[0].text;browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close()});
async function mount(t,{query='',jobStatus='complete',deferLoads=false,deferNavigation=false,strictMode=false}={}){
 const page=await browser.newPage();page.setDefaultTimeout(3000);let requests=0;
 await page.route('**/*',route=>{requests++;return route.abort()});
 t.after(async()=>{await page.close();assert.equal(requests,0,'No hosted/browser network allowed')});
 await page.goto('about:blank');await page.setContent('<div id="root"></div>');
 await page.evaluate(v=>Object.assign(window,v),{query,jobStatus,deferLoads,deferNavigation,strictMode});await page.addScriptTag({content:bundle});
 await page.getByRole('heading',{name:'EA left — reassign roster'}).waitFor();return page;
}
async function resolvePreview(page,index=0){
 await page.evaluate(i=>{const p=window.pendingPreviews[i];const data=structuredClone(window.fixturePreview);data.from_ea=p.input.fromEa;data.from_ea_name=p.input.fromEa.endsWith('3')?'EA B':'EA A';data.scope=p.input.scope;data.scope_class_id=p.input.scopeClassId??null;p.resolve({ok:true,data});},index);
}

test('preview keeps departing identity locked until resolved; changing EA afterward requires its own preview',async t=>{
 const page=await mount(t);await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_A);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();
 assert.equal(await page.getByLabel('Departing EA',{exact:true}).isDisabled(),true);
 assert.equal(await page.getByLabel('Departing EA UUID',{exact:true}).isDisabled(),true);
 await resolvePreview(page);await page.getByText('Preview for EA A',{exact:true}).waitFor();
 await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_B);
 assert.equal(await page.getByText('Preview for EA A',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page,1);
 await page.getByText('Preview for EA B',{exact:true}).waitFor();
 await page.getByLabel('Successor EA UUID').fill(SUCCESSOR);await page.getByLabel('Reason for reassignment').fill('Controlled handover');
 await page.getByRole('button',{name:'Review and confirm'}).click();await page.getByRole('button',{name:'Create and execute handover'}).click();
 const calls=await page.evaluate(()=>window.calls.create);assert.equal(calls.length,1);assert.equal(calls[0].fromEa,EA_B);
});

test('a saved terminal job can start another handover without losing its recovery link',async t=>{
 const page=await mount(t,{query:`job=${JOB}`});await page.getByText('Handover complete',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Start another handover',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.query),'');
 assert.equal(await page.getByRole('link',{name:'Previous handover',exact:true}).getAttribute('href'),`/mobile-app/reassign?job=${JOB}`);
 await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_B);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page);
 await page.getByText('Preview for EA B',{exact:true}).waitFor();
 const calls=await page.evaluate(()=>window.calls);assert.equal(calls.load.length,1);assert.equal(calls.preview[0].fromEa,EA_B);
});

test('running and refused handovers preserve the mobile account and never direct EA retirement to Clerk',async t=>{
 for(const jobStatus of ['running','complete_with_refusals','complete']){
  const page=await mount(t,{query:`job=${JOB}`,jobStatus});await page.getByText(`Handover ${jobStatus.replaceAll('_',' ')}`,{exact:true}).waitFor();
  assert.equal(await page.getByText(/Clerk/).count(),0);
  assert.equal(await page.getByText('If the EA is missing from this list, paste their mobile app user UUID below.',{exact:true}).isVisible(),true);
  if(jobStatus==='complete'){
   assert.equal(await page.getByText(/Before an administrator retires/).isVisible(),true);
  }else{
   assert.equal(await page.getByText('Keep the departing EA’s mobile account active while this handover needs attention.',{exact:true}).isVisible(),true);
   assert.equal(await page.getByText(/Before an administrator retires/).count(),0);
  }
 }
});

test('a rejected preview releases controls and allows a fresh successful preview',async t=>{
 const page=await mount(t);await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_A);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();
 await page.evaluate(()=>window.pendingPreviews[0].reject(new Error('Synthetic network loss')));
 await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Departing EA',{exact:true}).isDisabled(),false);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page,1);
 await page.getByText('Preview for EA A',{exact:true}).waitFor();
});

test('changing EA after a class preview starts with the new EA whole roster',async t=>{
 const page=await mount(t);await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_A);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page);
 const classId=await page.evaluate(()=>window.fixturePreview.classes[0].entity_id);
 await page.getByLabel('Roster scope').selectOption(classId);await resolvePreview(page,1);
 await page.getByText('Preview for EA A',{exact:true}).waitFor();
 await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_B);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();
 const input=await page.evaluate(()=>window.pendingPreviews[2].input);assert.equal(input.scope,'roster');assert.equal(input.scopeClassId,null);
 await resolvePreview(page,2);await page.getByText('Preview for EA B',{exact:true}).waitFor();
});


test('late saved-job responses cannot replace the job selected by the current URL',async t=>{
 const otherJob='00000000-0000-4000-8000-000000000201';
 const page=await mount(t,{query:`job=${JOB}`,deferLoads:true});
 await page.waitForFunction(()=>window.pendingLoads.length===1);
 await page.evaluate(id=>window.navigateQuery(`job=${id}`),otherJob);
 await page.waitForFunction(()=>window.pendingLoads.length===2);
 await page.evaluate(({id,from})=>{const data=structuredClone(window.fixtureJob);data.job.id=id;data.job.from_ea_user_id=from;window.pendingLoads[1].resolve({ok:true,data});},{id:otherJob,from:EA_B});
 await page.getByText('Handover complete',{exact:true}).waitFor();
 await page.evaluate(()=>{const data=structuredClone(window.fixtureJob);data.job.status='running';window.pendingLoads[0].resolve({ok:true,data});});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.getByLabel('Departing EA',{exact:true}).inputValue(),EA_B);
 assert.equal(await page.getByText('Handover complete',{exact:true}).isVisible(),true);
 assert.equal(await page.getByRole('button',{name:'Continue handover',exact:true}).count(),0);
});

test('a failed final roster recheck leaves the saved job recoverable and controls available',async t=>{
 const page=await mount(t,{query:`job=${JOB}`});await page.getByText('Handover complete',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Re-run roster preview',exact:true}).click();
 await page.evaluate(()=>window.pendingPreviews[0].reject(new Error('Synthetic transport loss')));
 await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('button',{name:'Start another handover',exact:true}).isDisabled(),false);
 assert.equal(await page.evaluate(()=>window.query),`job=${JOB}`);
});


test('a lost create response reports uncertainty without retrying automatically or locking the dialog',async t=>{
 const page=await mount(t);await page.evaluate(()=>window.rejectCreate=true);
 await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_A);await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page);
 await page.getByLabel('Successor EA UUID').fill(SUCCESSOR);await page.getByLabel('Reason for reassignment').fill('Controlled handover');
 await page.getByRole('button',{name:'Review and confirm'}).click();await page.getByRole('button',{name:'Create and execute handover'}).click();
 await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.calls.create.length),1);
 assert.equal(await page.getByRole('button',{name:'Review and confirm'}).isDisabled(),false);
});

test('a lost continuation response preserves the job link and permits explicit recovery',async t=>{
 const page=await mount(t,{query:`job=${JOB}`,jobStatus:'running'});await page.getByText('Handover running',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Continue handover',exact:true}).click();await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('button',{name:'Continue handover',exact:true}).isDisabled(),false);
 assert.equal(await page.evaluate(()=>window.calls.execute.length),1);assert.equal(await page.evaluate(()=>window.query),`job=${JOB}`);
});

test('a preview for a different identity is refused before confirmation becomes available',async t=>{
 const page=await mount(t);await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_B);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();
 await page.evaluate(()=>window.pendingPreviews[0].resolve({ok:true,data:window.fixturePreview}));
 await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Review and confirm'}).count(),0);
 assert.equal(await page.evaluate(()=>window.calls.create.length),0);
});


test('a delayed new-handover URL transition keeps actions locked until navigation finishes',async t=>{
 const page=await mount(t,{query:`job=${JOB}`,deferNavigation:true});await page.getByText('Handover complete',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Start another handover',exact:true}).click();
 assert.equal(await page.getByLabel('Departing EA',{exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.calls.load.length),1);
 await page.evaluate(()=>window.finishNavigation());await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_B);
 await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page);
 await page.getByText('Preview for EA B',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.calls.load.length),1);
});


test('a create response arriving after unmount cannot start browser execution',async t=>{
 const page=await mount(t);await page.evaluate(()=>window.deferCreate=true);
 await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_A);await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page);
 await page.getByLabel('Successor EA UUID').fill(SUCCESSOR);await page.getByLabel('Reason for reassignment').fill('Controlled handover');
 await page.getByRole('button',{name:'Review and confirm'}).click();await page.getByRole('button',{name:'Create and execute handover'}).click();
 await page.evaluate(()=>{window.unmount();const data=structuredClone(window.fixtureJob);data.job.status='created';window.finishCreate({ok:true,data});});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>window.calls.execute.length),0);assert.equal(await page.evaluate(()=>window.calls.navigation.length),0);
});


test('Strict Mode replacement recovery accepts its response and ignores the cancelled first setup',async t=>{
 const page=await mount(t,{query:`job=${JOB}`,deferLoads:true,strictMode:true});
 await page.waitForFunction(()=>window.pendingLoads.length===2);
 await page.evaluate(()=>window.pendingLoads[1].resolve({ok:true,data:window.fixtureJob}));
 await page.getByText('Handover complete',{exact:true}).waitFor();
 await page.evaluate(()=>{const data=structuredClone(window.fixtureJob);data.job.status='running';window.pendingLoads[0].resolve({ok:true,data});});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.getByText('Handover complete',{exact:true}).isVisible(),true);
 assert.equal(await page.getByRole('button',{name:'Start another handover',exact:true}).isEnabled(),true);
});

test('unmount after creating a job stops subsequent automatic continuation passes',async t=>{
 const page=await mount(t,{strictMode:true});await page.evaluate(()=>{window.acceptCreate=true;window.deferExec=true;});
 await page.getByLabel('Departing EA',{exact:true}).selectOption(EA_A);await page.getByRole('button',{name:'Preview roster',exact:true}).click();await resolvePreview(page);
 await page.getByLabel('Successor EA UUID').fill(SUCCESSOR);await page.getByLabel('Reason for reassignment').fill('Controlled handover');
 await page.getByRole('button',{name:'Review and confirm'}).click();await page.getByRole('button',{name:'Create and execute handover'}).click();
 await page.waitForFunction(()=>window.pendingExecs?.length===1);await page.evaluate(()=>window.unmount());
 await page.evaluate(()=>{const data=structuredClone(window.twoItemJob);data.job.status='running';data.job.retryable=true;data.job.progress_cursor=0;data.items[0].state='transferred';window.pendingExecs[0].resolve({ok:true,data});});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>window.calls.execute.length),1);
});
