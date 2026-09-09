import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const USER='11111111-1111-4111-8111-111111111111';
let render,dir;
const components=['ClockHistoryTable','EvidencePanel','LifetimeSummary','ProfileDataQuality','ProfileHeader','ProfileHowToPanel','ProfileNotFound','RecentSessionsTable','WeekdaySessionStrip','ProfileWeeklyTrends','PasswordRecoveryPanel'];
before(async()=>{
 dir=await mkdtemp(join(tmpdir(),'zz-recovery-profile-'));const outfile=join(dir,'page.cjs');
 await build({stdin:{contents:`import Page from './app/(site)/mobile-app/users/[id]/page';import {renderToStaticMarkup} from 'react-dom/server';export async function render(id){return renderToStaticMarkup(await Page({params:Promise.resolve({id})}))}`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',outfile,plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'fixture'}));
  b.onResolve({filter:/^@\/components\/mobile-app\/user-profile\//},()=>({path:'components',namespace:'fixture'}));
  b.onResolve({filter:/^@\/lib\/mobile\/(api|auth)$/},args=>({path:args.path.endsWith('api')?'api':'auth',namespace:'fixture'}));
  b.onResolve({filter:/^(next\/link|lucide-react)$/},args=>({path:args.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',resolveDir:process.cwd(),contents:a.path==='server-only'?'':a.path==='api'?
   `export async function getMobileUserProfile(){return globalThis.pageFixture.result}`:a.path==='auth'?
   `export async function getAuthenticatedMobileSession(){return {role:globalThis.pageFixture.role}}`:a.path==='next/link'?
   `import React from 'react';export default function Link(p){return React.createElement('a',{href:p.href},p.children)}`:a.path==='lucide-react'?
   `export function AlertTriangle(){return null} export function ArrowLeft(){return null}`:
   `import React from 'react';${components.map(n=>`export function ${n}(p){return React.createElement('aside',{'data-component':'${n}','data-user':p.userId})}`).join('\n')}`}));
 }}]});render=createRequire(import.meta.url)(outfile).render;
});
after(async()=>{await rm(dir,{recursive:true,force:true})});
function fixture(role='admin',id=USER){process.env.ZZ_PASSWORD_RECOVERY_SCOPE='all';globalThis.pageFixture={role,result:{ok:true,data:{user_id:id,identity:{display_name:'EA One'},lifetime:{totals:{}},recent_weekday_sessions:{dates:[],cells:[]}}}};}
for(const role of ['admin','zz_data_manager']){
 test(`${role} can see recovery only for the exact resolved user`,async()=>{fixture(role);const html=await render(USER);assert.match(html,/data-component="PasswordRecoveryPanel"/);assert.match(html,new RegExp(`data-user="${USER}"`));});
}
for(const role of ['senior_staff','junior_staff','ea','teacher','funder',undefined]){
 test(`${role} cannot see account recovery`,async()=>{fixture(role);globalThis.pageFixture.role=role;assert.doesNotMatch(await render(USER),/PasswordRecoveryPanel/)});
}
test('mismatched profile identity cannot expose a mutating recovery control',async()=>{
 fixture('admin','33333333-3333-4333-8333-333333333333');const html=await render(USER);assert.doesNotMatch(html,/PasswordRecoveryPanel/);assert.match(html,/ProfileDataQuality/);
});

test('profile recovery is hidden unless the rollout scope permits this exact account',async()=>{
 for(const scope of [undefined,'disabled','ALL','33333333-3333-4333-8333-333333333333']){
  fixture();if(scope===undefined)delete process.env.ZZ_PASSWORD_RECOVERY_SCOPE;else process.env.ZZ_PASSWORD_RECOVERY_SCOPE=scope;
  assert.doesNotMatch(await render(USER),/PasswordRecoveryPanel/);
 }
 fixture();process.env.ZZ_PASSWORD_RECOVERY_SCOPE=USER;assert.match(await render(USER),/PasswordRecoveryPanel/);
});
