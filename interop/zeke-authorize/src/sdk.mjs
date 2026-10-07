// SPDX-License-Identifier: Apache-2.0
import {canonical,demand} from './core.mjs';
async function call(origin,path,token,body) {
  const r=await fetch(`${origin}${path}`,{method:body?'POST':'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await r.json();demand(r.ok,value.error??'broker_unavailable',r.status);return value;
}
export const requestApproval=(origin,clientToken,action)=>call(origin,'/api/requests',clientToken,action);
export const readApproval=(origin,clientToken,id)=>call(origin,`/api/requests/${id}`,clientToken);
// The callback MUST use the returned immutable operation, rather than a different queued action.
// External effects need downstream idempotency; a crash after claim requires reconciliation.
export async function executeApproved({origin,executorToken,id,actionHash,expectedAction,perform}) {
  const claim=await call(origin,'/api/claim',executorToken,{id,actionHash});
  const p=claim.payload,actual={kind:p.kind,target:p.target,parameters:p.parameters};
  if(canonical(actual)!==canonical(expectedAction)) {
    await call(origin,'/api/result',executorToken,{id,status:'failed',result:{reason:'executor_action_changed_no_effect'}});
    demand(false,'executor_action_changed',409);
  }
  let result;
  try { result=await perform(Object.freeze(structuredClone(actual)),{idempotencyKey:id}); }
  catch(e) {
    await call(origin,'/api/result',executorToken,{id,status:'unknown',result:{reason:'connector_threw_reconcile_before_retry'}});
    throw e;
  }
  return call(origin,'/api/result',executorToken,{id,status:'succeeded',result:result??{}});
}
