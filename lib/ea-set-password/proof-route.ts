import { djangoPost } from '@/lib/django-fetch';
import { canonicalOperationId } from './contract';
type Action='redeem'|'submit'|'discard';
type Result={status:number;body:Record<string,unknown>};
async function boundedText(stream:ReadableStream<Uint8Array>|null,limit:number):Promise<string> {
 if(!stream) throw Error();
 const reader=stream.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let size=0;let text='';
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error();text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}
 finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export async function forwardProofRequest(request:Request,action:Action,post:typeof djangoPost=djangoPost):Promise<Result> {
 const refused:Result={status:400,body:{kind:'refused'}};
 const unknown:Result={status:503,body:{kind:'unconfirmed'}};
 try {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)return refused;
  if(request.headers.get('content-type')!=='application/json')return refused;
  const raw=await boundedText(request.body,8192);
  const value=JSON.parse(raw);
  if(!value || typeof value!=='object' || Array.isArray(value) || !canonicalOperationId(value.operation_id))return refused;
  let body:Record<string,string>={operation_id:value.operation_id};
  if(action==='redeem'){
   if(typeof value.token_hash!=='string'|| !/^[0-9a-f]{56}$/.test(value.token_hash))return refused;
   body={...body,token_hash:value.token_hash};
  } else if(action==='submit'){
   if(typeof value.password!=='string'||!value.password||new TextEncoder().encode(value.password).length>1024)return refused;
   body={...body,password:value.password};
  }
  // Canonical encoding rejects duplicates and extra fields before Django sees secrets.
  if(raw!==JSON.stringify(body))return refused;
  const authorization=request.headers.get('authorization');
  const bearer=authorization?.startsWith('Bearer ')?authorization.slice(7):'';
  if(action!=='redeem' && (!bearer||bearer.length>8192||/\s/.test(bearer)))return refused;
  const response=await post(`/api/mobile/accounts/password-setup/${action}/`,body,{headers:action==='redeem'?{}:{Authorization:authorization!},redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(response.status===429)return {status:429,body:{kind:'unavailable'}};
  if(response.status===409)return {status:409,body:{kind:'refused'}};
  if(![200,422].includes(response.status))return unknown;
  const result=JSON.parse(await boundedText(response.body,16384));
  if(!result||typeof result!=='object'||Array.isArray(result))return unknown;
  if(action==='redeem' && response.status===200 && result.kind==='ready' && Object.keys(result).length===2 && typeof result.access_token==='string' && result.access_token && result.access_token.length<=8192 && !/\s/.test(result.access_token))return {status:200,body:{kind:'ready',access_token:result.access_token}};
  if(action==='submit'){
   if(response.status===422 && result.kind==='weak_password' && Object.keys(result).length===1)return {status:422,body:{kind:'weak_password'}};
   if(response.status===200 && result.kind==='password_accepted' && Object.keys(result).length===2 && ['invite','recovery'].includes(result.journey))return {status:200,body:{kind:'password_accepted',journey:result.journey}};
  }
  if(action==='discard' && response.status===200 && result.kind==='discarded' && Object.keys(result).length===1)return {status:200,body:{kind:'discarded'}};
  return unknown;
 }catch{return unknown;}
}
