import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
test('real proxy bypasses Clerk before handling exact password document and recipient API routes',async()=>{
 const bundle=await build({entryPoints:['proxy.ts'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'provider-probe',setup(b){
  b.onResolve({filter:/^(@clerk\/nextjs\/server|next\/server)$/},args=>({path:args.path,namespace:'probe'}));
  b.onLoad({filter:/.*/,namespace:'probe'},args=>({contents:args.path.startsWith('@clerk')?'exports.clerkMiddleware = () => () => { throw Error("Clerk was invoked"); };':'exports.NextResponse = {next: () => "public"};',loader:'js'}));
 }}]});
 const fixtureModule={exports:{} as {default:(request:unknown,event:unknown)=>unknown}};
 new Function('module','exports',bundle.outputFiles[0].text)(fixtureModule,fixtureModule.exports);
 for(const path of ['/ea-set-password','/api/mobile/password-setup/redeem','/api/mobile/password-setup/submit','/api/mobile/password-setup/discard','/api/mobile/password-completion']) {
  assert.equal(await fixtureModule.exports.default({nextUrl:{pathname:path}},{}),'public');
 }
 for(const path of ['/mobile-app','/ea-set-password/extra','/api/mobile/password-setup/request']){
  assert.throws(()=>fixtureModule.exports.default({nextUrl:{pathname:path}},{}),/Clerk was invoked/);
 }
});
