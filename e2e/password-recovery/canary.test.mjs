import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const USER='11111111-1111-4111-8111-111111111111';let dir,render;
before(async()=>{
 dir=await mkdtemp(join(tmpdir(),'zz-recovery-canary-'));const outfile=join(dir,'page.cjs');
 await build({stdin:{contents:`import Page from './app/(site)/mobile-app/password-recovery-test/page';import {renderToStaticMarkup} from 'react-dom/server';export async function render(){return renderToStaticMarkup(await Page())}`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',outfile,plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'fixture'}));
 b.onResolve({filter:/^@clerk\/nextjs\/server$/},()=>({path:'clerk',namespace:'fixture'}));
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
 b.onResolve({filter:/^@\/lib\/mobile\/api$/},()=>{throw Error('reporting API must not be used for the synthetic canary')});
 b.onResolve({filter:/^@\/components\/mobile-app\/user-profile\/password-recovery-panel$/},()=>({path:'panel',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',resolveDir:process.cwd(),contents:a.path==='empty'?'':a.path==='clerk'?`export async function auth(){return globalThis.canarySession}`:a.path==='navigation'?`export function redirect(path){throw Error('redirect:'+path)} export function notFound(){throw Error('notFound')}`:`import React from 'react';export function PasswordRecoveryPanel(p){return React.createElement('aside',{'data-user':p.userId},p.displayName)}`}));
 }}]});render=createRequire(import.meta.url)(outfile).render;
});
after(async()=>rm(dir,{recursive:true,force:true}));
function fixture(role='admin',scope=USER){globalThis.canarySession={userId:'clerk-test',sessionClaims:{metadata:{role}},getToken:()=>{throw Error('page must not fetch token')}};if(scope===undefined)delete process.env.ZZ_PASSWORD_RECOVERY_SCOPE;else process.env.ZZ_PASSWORD_RECOVERY_SCOPE=scope;}
for(const role of ['admin','zz_data_manager'])test(`${role} can open the exact controlled recovery account without a reporting profile`,async()=>{fixture(role);const html=await render();assert.match(html,/Password setup test/);assert.match(html,new RegExp(`data-user="${USER}"`));});
test('no general or disabled rollout exposes this controlled entrypoint',async()=>{for(const scope of ['all','disabled','ALL','invalid','11111111-1111-4111-8111-11111111111A','']){fixture('admin',scope);await assert.rejects(render,/notFound/);}fixture();delete process.env.ZZ_PASSWORD_RECOVERY_SCOPE;await assert.rejects(render,/notFound/);});
for(const role of ['senior_staff','junior_staff','ea','teacher','funder',undefined])test(`${role} cannot open the controlled recovery entrypoint`,async()=>{fixture();globalThis.canarySession.sessionClaims.metadata.role=role;await assert.rejects(render,/redirect:\/login\?error=insufficient_role/);});
test('anonymous session must sign in before any controlled account is rendered',async()=>{fixture();globalThis.canarySession.userId=null;await assert.rejects(render,/redirect:\/login$/);});
