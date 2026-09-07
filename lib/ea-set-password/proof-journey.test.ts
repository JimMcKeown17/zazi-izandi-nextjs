import assert from 'node:assert/strict';
import test from 'node:test';
import { captureProofLink, createProofJourney } from './proof-journey';
const id = '123e4567-e89b-42d3-a456-426614174000';
const hash = 'b'.repeat(56);
const href = `https://www.zazi-izandi.co.za/ea-set-password#operation_id=${id}&token_hash=${hash}`;
test('captures exact proof fragment and scrubs before any I/O', () => {
  let scrubbed = false;
  assert.deepEqual(captureProofLink(href, () => { scrubbed = true; }), {operationId:id, credential:hash});
  assert.equal(scrubbed,true);
  for (const invalid of [href+'&token_hash='+hash,href.replace('#','?'),href+'&extra=x']) {
    assert.equal(captureProofLink(invalid,()=>{}),null);
  }
});
test('deliberate redemption and password-bearing submission use access bearer only', async () => {
  const calls: Array<[string,unknown,string|undefined]> = [];
  const journey = createProofJourney({operationId:id,credential:hash}, async (route,body,bearer) => {
    calls.push([route,body,bearer]);
    return route === 'redeem' ? {kind:'ready',access_token:'temporary'} : route === 'submit' ? {kind:'password_accepted',journey:'invite'} : {kind:'discarded'};
  });
  assert.equal(calls.length,0);
  assert.equal((await journey.redeem()).kind,'ready');
  const result = await journey.submit('chosen-password','chosen-password');
  assert.equal(result.kind,'success');
  assert.ok('message' in result && !result.message.includes('sign in'));
  assert.deepEqual(calls[1],['submit',{operation_id:id,password:'chosen-password'},'temporary']);
});
test('weak password retries the same session; unknown results cannot claim success', async () => {
  let submissions = 0;
  const journey = createProofJourney({operationId:id,credential:hash}, async route => route === 'redeem'
    ? {kind:'ready',access_token:'temporary'} : route === 'submit'
    ? (++submissions === 1 ? {kind:'weak_password'} : {kind:'unconfirmed'}) : {kind:'discarded'});
  await journey.redeem();
  assert.equal((await journey.submit('password','password')).kind,'recoverable_error');
  const result = await journey.submit('password','password');
  assert.equal(result.kind,'terminal_error');
  assert.ok('message' in result && result.message.includes('may'));
});
test('late redemption after disposal discards its session and never permits submission', async () => {
  let resolve!: (value: unknown) => void;
  const calls: string[] = [];
  const journey = createProofJourney({operationId:id,credential:hash}, async route => {
    calls.push(route);
    return route==='redeem' ? new Promise(r=>{resolve=r;}) : {kind:'discarded'};
  });
  const pending=journey.redeem(); await journey.dispose(); resolve({kind:'ready',access_token:'temporary'});
  assert.equal((await pending).kind,'terminal_error');
  assert.equal((await journey.submit('password','password')).kind,'terminal_error');
  assert.deepEqual(calls,['redeem','discard']);
});
