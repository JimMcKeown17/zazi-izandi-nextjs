import assert from 'node:assert/strict';
import {before, test} from 'node:test';
import {build} from 'esbuild';
const USER='11111111-1111-4111-8111-111111111111';
const OP='22222222-2222-4222-8222-222222222222';
let action;
before(async()=>{
 const result=await build({entryPoints:['app/(site)/mobile-app/users/actions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'fixture'}));
  b.onResolve({filter:/^@\/lib\/mobile\/auth$/},()=>({path:'auth',namespace:'fixture'}));
  b.onResolve({filter:/^@\/lib\/django-fetch$/},()=>({path:'django',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='server-only'?'':a.path==='auth'?
   `export async function requireMobileCapability(c){globalThis.fixture.capabilities.push(c);if(globalThis.fixture.denied)throw Error('AUTH_DENIED');return {getToken:async()=>globalThis.fixture.token}}`:
   `export async function djangoPost(...args){globalThis.fixture.calls.push(args);if(globalThis.fixture.failure)throw Error('PRIVATE_PROVIDER_ERROR');return globalThis.fixture.response}`,loader:'js'}));
 }}]});
 action=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).requestMobilePasswordReset;
});
function fixture(response=Response.json({kind:'mail_accepted',operation_id:OP},{status:202})){
 process.env.ZZ_PASSWORD_RECOVERY_SCOPE='all';
 globalThis.fixture={response,capabilities:[],calls:[],token:'actual-session-bearer'};return globalThis.fixture;
}
test('authenticated staff request forwards exact target and operation with actual session token',async()=>{
 const f=fixture();
 assert.deepEqual(await action({userId:USER,operationId:OP}),{kind:'mail_accepted'});
 assert.deepEqual(f.capabilities,['mobile.accounts.recover']);
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0][0],'/api/mobile/accounts/password-setup/request/');
 assert.deepEqual(f.calls[0][1],{operation_id:OP,user_id:USER});
 assert.equal(f.calls[0][2].headers.Authorization,'Bearer actual-session-bearer');
 assert.equal(f.calls[0][2].redirect,'manual');
 assert.ok(f.calls[0][2].signal instanceof AbortSignal);
});

test('denied staff cannot call Django, even with valid target and operation',async()=>{
 const f=fixture();f.denied=true;
 await assert.rejects(action({userId:USER,operationId:OP}),/AUTH_DENIED/);
 assert.equal(f.calls.length,0);
});
test('missing actual session token never falls back to service or client authority',async()=>{
 const f=fixture();f.token=null;
 assert.deepEqual(await action({userId:USER,operationId:OP}),{kind:'unauthorized'});
 assert.equal(f.calls.length,0);
});
for(const input of [null,{}, {userId:'not-uuid',operationId:OP}, {userId:USER,operationId:'NOT-UUID'}, {userId:USER,operationId:OP,email:'replacement@example.test'}]){
 test('malformed or expanded input refuses before Django: '+JSON.stringify(input),async()=>{
  const f=fixture();assert.deepEqual(await action(input),{kind:'refused'});assert.equal(f.calls.length,0);
 });
}
for(const [status,body,kind] of [
 [202,{kind:'mail_accepted',operation_id:OP},'mail_accepted'],
 [202,{kind:'unconfirmed',operation_id:OP},'unconfirmed'],
 [202,{kind:'mail_accepted',operation_id:USER},'unconfirmed'],
 [202,{kind:'mail_accepted',operation_id:OP,link:'PRIVATE_LINK'},'unconfirmed'],
 [409,{kind:'unconfirmed'},'unconfirmed'],
 [409,{kind:'refused'},'refused'],
 [503,{kind:'unconfirmed'},'unconfirmed'],
 [401,{error:'PRIVATE'},'unauthorized'],
 [403,{error:'PRIVATE'},'unauthorized'],
 [429,{kind:'unavailable'},'unconfirmed'],
 [200,{kind:'mail_accepted',operation_id:OP},'unconfirmed'],
]){
 test(`closed response decoding ${status} ${JSON.stringify(body)}`,async()=>{
  fixture(Response.json(body,{status}));assert.deepEqual(await action({userId:USER,operationId:OP}),{kind});
 });
}
test('transport loss retains uncertainty and never exposes exception text',async()=>{
 const f=fixture();f.failure=true;assert.deepEqual(await action({userId:USER,operationId:OP}),{kind:'unconfirmed'});
});
test('invalid, oversized and nonobject responses stay unconfirmed',async()=>{
 for(const text of ['PRIVATE_INVALID_JSON','x'.repeat(4097),'null','[]']){
  fixture(new Response(text,{status:202}));assert.deepEqual(await action({userId:USER,operationId:OP}),{kind:'unconfirmed'});
 }
});
test('UUID-like arrays are not canonical string identifiers and never reach Django',async()=>{
 const f=fixture();assert.deepEqual(await action({userId:[USER],operationId:OP}),{kind:'refused'});assert.equal(f.calls.length,0);
});

test('disabled or invalid rollout scope refuses before token forwarding or Django',async()=>{
 for(const scope of [undefined,'disabled','ALL','not-a-uuid','33333333-3333-4333-8333-333333333333']){
  const f=fixture();if(scope===undefined)delete process.env.ZZ_PASSWORD_RECOVERY_SCOPE;else process.env.ZZ_PASSWORD_RECOVERY_SCOPE=scope;
  assert.deepEqual(await action({userId:USER,operationId:OP}),{kind:'refused'});assert.equal(f.calls.length,0);
 }
});
test('the exact configured canary can request recovery',async()=>{
 fixture();process.env.ZZ_PASSWORD_RECOVERY_SCOPE=USER;assert.deepEqual(await action({userId:USER,operationId:OP}),{kind:'mail_accepted'});
});
