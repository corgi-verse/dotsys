// SPDX-License-Identifier: Apache-2.0
const $=id=>document.getElementById(id);let request,clientToken,timer;
async function api(path,token,body) {
  const r=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;
}
function show(r) {
  $('status').textContent=`${r.state.toUpperCase()} · ${r.payload.agentId} · expires ${new Date(r.payload.expiresAt).toLocaleTimeString()}`;
  $('details').textContent=JSON.stringify({action:r.payload,actionHash:r.actionHash,receipt:r.receipt},null,2);
  $('execute').disabled=r.state!=='approved';$('cancel').disabled=!['pending','approved'].includes(r.state);
  if(!['pending','approved'].includes(r.state))clearInterval(timer);
}
$('request-form').addEventListener('submit',async e=>{e.preventDefault();clearInterval(timer);$('status').textContent='Creating request…';try{
  clientToken=$('client-token').value;
  request=await api('/api/requests',clientToken,{kind:'sandbox.note.append',target:'sandbox:notes',parameters:{text:$('note').value}});
  $('qr').src=request.qrDataUrl;$('qr').hidden=false;$('review').href=request.reviewUrl;$('review').hidden=false;$('details').hidden=false;$('execution').hidden=false;
  show(request);timer=setInterval(async()=>{try{show(await api(`/api/requests/${request.payload.requestId}`,clientToken));}catch(e){$('status').textContent=e.message;clearInterval(timer);}},2000);
}catch(e){$('status').textContent=e.message;}});
$('execute').addEventListener('click',async()=>{try{const r=await api('/api/execute',$('executor-token').value,{id:request.payload.requestId,actionHash:request.actionHash});show({payload:r.payload,actionHash:r.actionHash,state:r.receipt.status,receipt:r.receipt});}catch(e){$('status').textContent=e.message;}});
$('cancel').addEventListener('click',async()=>{try{show(await api('/api/cancel',clientToken,{id:request.payload.requestId}));}catch(e){$('status').textContent=e.message;}});
