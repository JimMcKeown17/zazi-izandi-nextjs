import assert from 'node:assert/strict';
import test from 'node:test';
import { forwardProofRequest } from './proof-route';
const id='123e4567-e89b-42d3-a456-426614174000';
test('forwards bounded password JSON and bearer only to fixed Django route',async()=>{
 let captured:unknown[]=[];
 const response=await forwardProofRequest(new Request('https://www.zazi-izandi.co.za/api/mobile/password-setup/submit',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer temporary'},body:JSON.stringify({operation_id:id,password:'chosen'})}),'submit',async (...args)=>{captured=args;return Response.json({kind:'password_accepted',journey:'invite'});});
 assert.equal(response.status,200);
 assert.deepEqual(captured[0],'/api/mobile/accounts/password-setup/submit/');
 assert.deepEqual(captured[1],{operation_id:id,password:'chosen'});
 assert.equal(new Headers((captured[2] as RequestInit).headers).get('Authorization'),'Bearer temporary');
 assert.deepEqual(response.body,{kind:'password_accepted',journey:'invite'});
});
test('refuses duplicate keys, oversized payloads and foreign Origin before forwarding',async()=>{
 for(const [body,origin] of [[`{"operation_id":"${id}","password":"one","password":"two"}`,'https://www.zazi-izandi.co.za'],[JSON.stringify({operation_id:id,password:'x'.repeat(9000)}),'https://www.zazi-izandi.co.za'],[JSON.stringify({operation_id:id,password:'chosen'}),'https://attacker.example']]){
 let called=false;
 const response=await forwardProofRequest(new Request('https://www.zazi-izandi.co.za/api/mobile/password-setup/submit',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer temporary',origin},body}),'submit',async()=>{called=true;return Response.json({});});
 assert.equal(called,false);assert.ok(response.status>=400);
 }
});
