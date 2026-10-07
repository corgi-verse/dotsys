// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {Broker,secret} from '../src/core.mjs';
const config={origin:'https://auth.example.org',ownerId:'test-owner'};
const client={id:'zeke-chat',agentId:'zeke',executorId:'runner',allowedKinds:['sandbox.note.append']};
const action={kind:'sandbox.note.append',target:'sandbox:notes',parameters:{text:'Only this exact note'}};
function setup() {
  let time=1000000;const b=new Broker(':memory:',config,()=>time);
  const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const id='test-phone';b.enroll(b.issueTicket(),{id,type:'native',data:{spki:publicKey.export({type:'spki',format:'pem'})}});
  const r=b.create(client,action);
  const approve=(decision='approve',request=r)=>b.nativeDecision(request.payload.requestId,decision,id,sign('sha256',Buffer.from(b.decisionMessage(request.payload.requestId,decision)),privateKey).toString('base64url'));
  return {b,id,r,privateKey,approve,advance:()=>time+=120001};
}
test('native decision executes exactly once and writes approved text',()=>{
  const {b,r,approve}=setup();approve();const value=b.consume(r.payload.requestId,'runner',r.actionHash,true);
  assert.equal(value.receipt.status,'succeeded');assert.equal(b.db.prepare('SELECT text FROM notes').get().text,action.parameters.text);
  assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash,true),/approval_unavailable/);b.close();
});
test('QR cannot approve and contains no private signing material',()=>{
  const {b,r}=setup();assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash,true),/approval_unavailable/);
  assert.throws(()=>b.nativeDecision(r.payload.requestId,'approve','test-phone',secret()),/invalid_signature/);
  assert.equal(new URL(r.reviewUrl).search,'');assert.match(r.reviewUrl,/#id=/);b.close();
});
test('wrong executor and changed action digest refuse execution',()=>{
  const {b,r,approve}=setup();approve();assert.throws(()=>b.consume(r.payload.requestId,'other',r.actionHash,true),/wrong_executor/);
  assert.throws(()=>b.consume(r.payload.requestId,'runner','changed',true),/action_changed/);b.close();
});
test('expired request cannot be approved',()=>{const {b,r,advance}=setup();advance();assert.equal(b.read(r.payload.requestId).state,'expired');assert.throws(()=>b.decisionMessage(r.payload.requestId,'approve'),/request_not_pending/);b.close();});
test('review links stop exposing details after expiry',()=>{
  const {b,r,advance}=setup(),token=new URLSearchParams(new URL(r.reviewUrl).hash.slice(1)).get('t');
  advance();assert.throws(()=>b.review(r.payload.requestId,token),/review_link_expired/);b.close();
});
test('expired approved request cannot run',()=>{const {b,r,approve,advance}=setup();approve();advance();assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash,true),/approval_unavailable/);b.close();});
test('denial is signed and terminal',()=>{const {b,r,approve}=setup();approve('deny');assert.equal(b.read(r.payload.requestId).state,'denied');assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash,true),/approval_unavailable/);b.close();});
test('approval signature cannot be substituted for denial or another request',()=>{
  const {b,r,id,privateKey}=setup();const signature=sign('sha256',Buffer.from(b.decisionMessage(r.payload.requestId,'approve')),privateKey).toString('base64url');
  assert.throws(()=>b.nativeDecision(r.payload.requestId,'deny',id,signature),/invalid_signature/);
  const second=b.create(client,action);assert.throws(()=>b.nativeDecision(second.payload.requestId,'approve',id,signature),/invalid_signature/);b.close();
});
test('revocation fences every outstanding grant with a new epoch',()=>{const {b,r,id,approve}=setup();approve();const epoch=b.epoch();b.revoke(id);assert.equal(b.epoch(),epoch+1);assert.equal(b.read(r.payload.requestId).state,'revoked');assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash,true),/approval_unavailable/);b.close();});
test('challenge and enrollment ticket are one-use and expire',()=>{
  const {b,advance}=setup();const ticket=b.issueTicket();b.enroll(ticket,{id:'second',type:'native',data:{}});assert.throws(()=>b.ticket(ticket),/invalid_enrollment_ticket/);
  const ceremony=b.ceremony({v:1});assert.deepEqual(b.takeCeremony(ceremony),{v:1});assert.throws(()=>b.takeCeremony(ceremony),/expired_or_used_challenge/);
  const expired=b.ceremony({v:2});advance();assert.throws(()=>b.takeCeremony(expired),/expired_or_used_challenge/);b.close();
});
test('view token, requesting client, schemas and policy are enforced',()=>{
  const {b,r}=setup();assert.throws(()=>b.review(r.payload.requestId,secret()),/invalid_review_link/);
  const token=new URLSearchParams(new URL(r.reviewUrl).hash.slice(1)).get('t');assert.equal(b.review(r.payload.requestId,token).state,'pending');
  assert.throws(()=>b.cancel(r.payload.requestId,'other'),/wrong_client/);
  assert.throws(()=>b.create(client,{...action,agentId:'forged'}),/invalid_action_fields/);
  assert.throws(()=>b.create(client,{...action,kind:'shell.run'}),/kind_not_allowed/);
  assert.throws(()=>b.create(client,{...action,target:'/etc/passwd'}),/invalid_note/);
  assert.throws(()=>b.create(client,{...action,parameters:{text:'\u202Eevil'}}),/invalid_note/);b.close();
});
test('cancel after approval fences execution',()=>{const {b,r,approve}=setup();approve();b.cancel(r.payload.requestId,client.id);assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash,true),/approval_unavailable/);b.close();});
test('external claim is durable and cannot be retried as a second effect',()=>{
  const {b,r,approve}=setup();approve();b.consume(r.payload.requestId,'runner',r.actionHash);
  assert.equal(b.read(r.payload.requestId).state,'claimed');assert.throws(()=>b.consume(r.payload.requestId,'runner',r.actionHash),/approval_unavailable/);
  b.finish(r.payload.requestId,'runner','unknown',{reason:'crash'});assert.equal(b.read(r.payload.requestId).state,'unknown');b.close();
});
