// SPDX-License-Identifier: Apache-2.0
const $=id=>document.getElementById(id);const args=new URLSearchParams(location.hash.slice(1));
const id=args.get('id'),token=args.get('t');history.replaceState(null,'',location.pathname);
async function api(path,body) {
  const r=await fetch(path,{method:body?'POST':'GET',headers:{...(token?{'X-Review-Token':token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;
}
const status=s=>$('status').textContent=s;
if($('enroll-form'))$('enroll-form').addEventListener('submit',async e=>{e.preventDefault();try{
  const enrollmentToken=$('ticket').value;
  const {options,ceremonyId}=await api('/api/enroll/options',{enrollmentToken});
  const response=await SimpleWebAuthnBrowser.startRegistration({optionsJSON:options});
  const result=await api('/api/enroll/verify',{enrollmentToken,ceremonyId,response});$('ticket').value='';
  status(`Phone key enrolled. Keep this device ID for recovery: ${result.id}`);
}catch(e){status(e.message);}});
async function load() {
  if(!id || !token)throw Error('This review link is missing its request. Open it again from the original chat.');
  const r=await api(`/api/requests/${id}`);const p=r.payload;
  status(`${r.state.toUpperCase()} · expires ${new Date(p.expiresAt).toLocaleTimeString()}`);
  const values=[['Verified service origin',location.origin],['Requesting agent',p.agentId],['Chat client',p.clientId],['Executing system',p.executorId],['Action',p.kind],['Destination',p.target],['Note to add',p.parameters.text]];
  $('summary').replaceChildren();for(const [name,value]of values){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;$('summary').append(dt,dd);}
  $('details').textContent=JSON.stringify({action:p,actionHash:r.actionHash,receipt:r.receipt},null,2);
  $('approve').disabled=$('deny').disabled=r.state!=='pending';
  return r;
}
async function decide(decision) {
  $('approve').disabled=$('deny').disabled=true;
  try {
    const {options,ceremonyId}=await api('/api/decision/options',{id,decision});
    const response=await SimpleWebAuthnBrowser.startAuthentication({optionsJSON:options});
    const r=await api('/api/decision/verify',{ceremonyId,response});
    status(r.state==='approved'?'Approved. The connected executor may now perform this exact action.':'Denied. This action cannot run.');
  }catch(e){status(e.message);try{await load();}catch{}}
}
if($('approve')){load().catch(e=>status(e.message));$('approve').addEventListener('click',()=>decide('approve'));$('deny').addEventListener('click',()=>decide('deny'));}
