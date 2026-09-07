import { canonicalOperationId, SAFE_MESSAGES, type PasswordJourneyResult } from './contract';
export type ProofLink = {operationId:string;credential:string};
type Send = (route:'redeem'|'submit'|'discard',body:Record<string,string>,bearer?:string)=>Promise<unknown>;
export function captureProofLink(href:string,scrub:()=>void): ProofLink|null {
  let link: ProofLink|null=null;
  try {
    const url=new URL(href);
    const values=new URLSearchParams(url.hash.slice(1));
    const operationId=canonicalOperationId(values.get('operation_id'));
    const credential=values.get('token_hash');
    if (!url.search && url.pathname==='/ea-set-password' && [...values.keys()].length===2 &&
        values.getAll('operation_id').length===1 && values.getAll('token_hash').length===1 &&
        operationId && credential && /^[0-9a-f]{56}$/.test(credential)) link={operationId,credential};
  } catch { /* Every malformed URL is scrubbed too. */ }
  try {scrub();} catch {return null;}
  return link;
}
function record(value:unknown):Record<string,unknown> {
  return value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
}
const invalid=():PasswordJourneyResult=>({kind:'terminal_error',code:'invalid_link',message:SAFE_MESSAGES.invalidLink});
const unconfirmed=():PasswordJourneyResult=>({kind:'terminal_error',code:'completion_unconfirmed',message:'Your password may have changed, but we could not confirm completion. Contact your programme manager for a new link.'});
export function createProofJourney(link:ProofLink,send:Send) {
  let credential:string|null=link.credential;
  const operationId=link.operationId;
  let bearer:string|null=null;
  let disposed=false;
  let busy=false;
  async function discard() {
    const token=bearer; bearer=null; credential=null;
    if (token) {try {await send('discard',{operation_id:operationId},token);} catch { /* Local references are already gone. */ }}
  }
  return {
    async dispose() {disposed=true; await discard();},
    async redeem():Promise<PasswordJourneyResult> {
      if (disposed || busy || !credential) return invalid();
      busy=true;
      const token=credential; credential=null;
      try {
        const response=record(await send('redeem',{operation_id:operationId,token_hash:token}));
        if (response.kind!=='ready' || Object.keys(response).length!==2 || typeof response.access_token!=='string' || !response.access_token || response.access_token.length>8192 || /\s/.test(response.access_token)) return invalid();
        bearer=response.access_token;
        if (disposed) {await discard(); return invalid();}
        return {kind:'ready'};
      } catch {return invalid();} finally {busy=false;}
    },
    async submit(password:string,confirmation:string):Promise<PasswordJourneyResult> {
      if (disposed || busy || !bearer) return invalid();
      if (password!==confirmation) return {kind:'recoverable_error',code:'password_mismatch',message:SAFE_MESSAGES.passwordMismatch};
      busy=true;
      try {
        const response=record(await send('submit',{operation_id:operationId,password},bearer));
        if (disposed) {await discard(); return invalid();}
        if (response.kind==='weak_password' && Object.keys(response).length===1) return {kind:'recoverable_error',code:'weak_password',message:SAFE_MESSAGES.weakPassword};
        await discard();
        if (response.kind==='password_accepted' && Object.keys(response).length===2 && ['invite','recovery'].includes(String(response.journey))) {
          return {kind:'success',message:response.journey==='invite'
            ? 'Your password has been set. Your programme manager will confirm when your account is ready.'
            : 'Your password has been updated. Return to the Zazi iZandi app to sign in.'};
        }
        return unconfirmed();
      } catch {await discard(); return unconfirmed();} finally {busy=false;}
    },
  };
}
