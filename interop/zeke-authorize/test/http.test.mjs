// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {generateKeyPairSync,sign,createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isoCBOR} from '@simplewebauthn/server/helpers';
import {makeServer,validateConfig} from '../src/server.mjs';
import {secret} from '../src/core.mjs';
import {executeApproved} from '../src/sdk.mjs';
const sha=x=>createHash('sha256').update(x).digest();
const action={kind:'sandbox.note.append',target:'sandbox:notes',parameters:{text:'HTTP approved note'}};
async function setup(t) {
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const config={origin:`http://localhost:${port}`,ownerId:'test-owner',clients:[{id:'zeke-chat',agentId:'zeke',executorId:'runner',allowedKinds:['sandbox.note.append'],token:secret()},{id:'dots-chat',agentId:'dots',executorId:'runner',allowedKinds:['sandbox.note.append'],token:secret()}],executors:[{id:'runner',token:secret()}]};
  const dir=mkdtempSync(join(tmpdir(),'zeke-auth-test-'));const {server,broker}=makeServer(config,join(dir,'broker.sqlite'));
  await new Promise(r=>server.listen(port,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
  async function call(path,body,headers={}) {
    const res=await fetch(config.origin+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    const value=res.headers.get('content-type').startsWith('application/json')?await res.json():await res.text();return {status:res.status,value,headers:res.headers};
  }
  const client={Authorization:`Bearer ${config.clients[0].token}`},executor={Authorization:`Bearer ${config.executors[0].token}`};
  return {call,config,client,executor,broker};
}
function virtualPhone(origin) {
  const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'}),id=randomBytes(32),id64=id.toString('base64url');let counter=0;
  const cose=isoCBOR.encode(new Map([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]));
  const clientData=(type,challenge,change={})=>Buffer.from(JSON.stringify({type,challenge,origin,crossOrigin:false,...change}));
  const authData=(flags)=>{const c=Buffer.alloc(4);c.writeUInt32BE(++counter);return Buffer.concat([sha('localhost'),Buffer.from([flags]),c]);};
  return {id:id64,
    register(options){const length=Buffer.alloc(2);length.writeUInt16BE(id.length);const auth=Buffer.concat([authData(0x45),Buffer.alloc(16),length,id,cose]);
      return {id:id64,rawId:id64,type:'public-key',clientExtensionResults:{},authenticatorAttachment:'platform',response:{clientDataJSON:clientData('webauthn.create',options.challenge).toString('base64url'),attestationObject:Buffer.from(isoCBOR.encode(new Map([['fmt','none'],['attStmt',new Map()],['authData',auth]]))).toString('base64url'),transports:['internal']}};
    },
    authenticate(options,{flags=5,change={}}={}){const cd=clientData('webauthn.get',options.challenge,change),ad=authData(flags);return {id:id64,rawId:id64,type:'public-key',clientExtensionResults:{},response:{clientDataJSON:cd.toString('base64url'),authenticatorData:ad.toString('base64url'),signature:sign('sha256',Buffer.concat([ad,sha(cd)]),privateKey).toString('base64url'),userHandle:Buffer.from('test-owner').toString('base64url')}};}
  };
}
async function enroll(s) {
  const enrollmentToken=s.broker.issueTicket(),phone=virtualPhone(s.config.origin);
  const opts=await s.call('/api/enroll/options',{enrollmentToken});assert.equal(opts.status,200);
  const registration=await s.call('/api/enroll/verify',{enrollmentToken,ceremonyId:opts.value.ceremonyId,response:phone.register(opts.value.options)});assert.equal(registration.status,201,JSON.stringify(registration.value));return phone;
}
async function request(s) {
  const result=await s.call('/api/requests',action,s.client);assert.equal(result.status,201);
  const id=result.value.payload.requestId,token=new URLSearchParams(new URL(result.value.reviewUrl).hash.slice(1)).get('t');
  return {...result.value,id,review:{'X-Review-Token':token}};
}
test('full HTTP WebAuthn enrollment, approval, and atomic sandbox execution',async t=>{
  const s=await setup(t),phone=await enroll(s),r=await request(s);
  assert.match(r.qrDataUrl,/^data:image\/png;base64,/);
  const opts=await s.call('/api/decision/options',{id:r.id,decision:'approve'},r.review);
  const response=phone.authenticate(opts.value.options);
  const approved=await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response},r.review);assert.equal(approved.status,200,JSON.stringify(approved.value));assert.equal(approved.value.state,'approved');
  const run=await s.call('/api/execute',{id:r.id,actionHash:r.actionHash},s.executor);assert.equal(run.value.receipt.status,'succeeded');
  const replay=await s.call('/api/execute',{id:r.id,actionHash:r.actionHash},s.executor);assert.equal(replay.status,409);
  const reused=await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response},r.review);assert.equal(reused.status,403);
});
test('WebAuthn refuses missing verification, foreign origin, changed challenge and corrupt signature',async t=>{
  const s=await setup(t),phone=await enroll(s);
  for(const scenario of ['no-uv','origin','challenge','signature']) {
    const r=await request(s),opts=await s.call('/api/decision/options',{id:r.id,decision:'approve'},r.review);
    const response=phone.authenticate(opts.value.options,scenario==='no-uv'?{flags:1}:scenario==='origin'?{change:{origin:'https://evil.example'}}:scenario==='challenge'?{change:{challenge:secret()}}:{});
    if(scenario==='signature')response.response.signature=secret();
    const rejected=await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response},r.review);assert.ok(rejected.status>=400,scenario);
    assert.equal(s.broker.read(r.id).state,'pending');
  }
});
test('HTTP native enrollment proof and native decision interoperate with P-256 DER signatures',async t=>{
  const s=await setup(t),enrollmentToken=s.broker.issueTicket();const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const options=await s.call('/api/enroll/native/options',{enrollmentToken});const c=options.value;
  const enrollment=await s.call('/api/enroll/native/verify',{enrollmentToken,ceremonyId:c.ceremonyId,spki:pair.publicKey.export({type:'spki',format:'pem'}),signature:sign('sha256',Buffer.from(c.message),pair.privateKey).toString('base64url')});assert.equal(enrollment.status,201);
  const r=await request(s),msg=await s.call('/api/native/message',{id:r.id,decision:'approve'},r.review);
  const decision=await s.call('/api/native/decision',{id:r.id,decision:'approve',deviceId:c.deviceId,signature:sign('sha256',Buffer.from(msg.value.message),pair.privateKey).toString('base64url')},r.review);assert.equal(decision.value.state,'approved');
});
test('revocation during WebAuthn ceremony blocks late approval',async t=>{
  const s=await setup(t),phone=await enroll(s),r=await request(s),opts=await s.call('/api/decision/options',{id:r.id,decision:'approve'},r.review);
  const response=phone.authenticate(opts.value.options);s.broker.revoke(phone.id);
  const result=await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response},r.review);assert.equal(result.status,409);assert.equal(s.broker.read(r.id).state,'revoked');
});
test('two concurrent executions produce one effect',async t=>{
  const s=await setup(t),phone=await enroll(s),r=await request(s),opts=await s.call('/api/decision/options',{id:r.id,decision:'approve'},r.review);
  await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response:phone.authenticate(opts.value.options)},r.review);
  const results=await Promise.all([s.call('/api/execute',{id:r.id,actionHash:r.actionHash},s.executor),s.call('/api/execute',{id:r.id,actionHash:r.actionHash},s.executor)]);
  assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);assert.equal(s.broker.db.prepare('SELECT COUNT(*) AS n FROM notes').get().n,1);
});
test('HTTP client ownership, origin and input boundaries',async t=>{
  const s=await setup(t),r=await request(s);
  assert.equal((await s.call('/api/requests',action)).status,401);
  assert.equal((await s.call(`/api/requests/${r.id}`,null,{Authorization:`Bearer ${s.config.clients[1].token}`})).status,403);
  assert.equal((await s.call('/api/requests',action,{...s.client,Origin:'https://evil.example'})).status,403);
  assert.equal((await s.call('/api/requests',{...action,parameters:{text:'x'.repeat(33000)}},s.client)).status,413);
  const page=await s.call('/approve');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal((await s.call('/api/enroll/options',{enrollmentToken:secret()})).status,403);
});
test('configuration refuses remote HTTP and a non-origin URL',()=>{
  assert.throws(()=>validateConfig({origin:'http://192.168.1.5:8787'}),/https_required/);
  assert.throws(()=>validateConfig({origin:'https://auth.example.org/path'}),/origin_must_be_exact/);
});
test('SDK refuses changed queued parameters without calling the connector',async t=>{
  const s=await setup(t),phone=await enroll(s),r=await request(s),opts=await s.call('/api/decision/options',{id:r.id,decision:'approve'},r.review);
  await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response:phone.authenticate(opts.value.options)},r.review);
  let invoked=false;
  await assert.rejects(()=>executeApproved({origin:s.config.origin,executorToken:s.config.executors[0].token,id:r.id,actionHash:r.actionHash,
    expectedAction:{...action,parameters:{text:'different queued text'}},perform:()=>{invoked=true;}}),/executor_action_changed/);
  assert.equal(invoked,false);assert.equal(s.broker.read(r.id).state,'failed');
});
test('SDK records uncertain connector failures without automatic retry',async t=>{
  const s=await setup(t),phone=await enroll(s),r=await request(s),opts=await s.call('/api/decision/options',{id:r.id,decision:'approve'},r.review);
  await s.call('/api/decision/verify',{ceremonyId:opts.value.ceremonyId,response:phone.authenticate(opts.value.options)},r.review);
  let invoked=0;
  await assert.rejects(()=>executeApproved({origin:s.config.origin,executorToken:s.config.executors[0].token,id:r.id,actionHash:r.actionHash,
    expectedAction:action,perform:()=>{invoked++;throw Error('simulated uncertain network failure');}}),/simulated uncertain network failure/);
  assert.equal(invoked,1);assert.equal(s.broker.read(r.id).state,'unknown');
});
