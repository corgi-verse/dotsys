// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,sign,verify,createPublicKey} from 'node:crypto';
import {Broker,canonical,hash} from '../src/core.mjs';
test('published P-256 wire vector matches canonical bytes, action digest and WebAuthn challenge',()=>{
  const v=JSON.parse(readFileSync(new URL('../docs/protocol-vectors.json',import.meta.url)));
  assert.equal(canonical(v.payload),v.canonicalPayload);assert.equal(hash(v.canonicalPayload),v.actionHash);
  assert.equal(v.message,'zeke.authorize.decision/1\n'+canonical(v.decision));assert.equal(Buffer.from(v.message).toString('hex'),v.messageUtf8Hex);
  assert.equal(hash(v.message),v.webAuthnChallenge);assert.ok(verify('sha256',Buffer.from(v.message),createPublicKey(v.spki),Buffer.from(v.signatureDERBase64url,'base64url')));
  assert.equal(verify('sha256',Buffer.from(v.message+' '),createPublicKey(v.spki),Buffer.from(v.signatureDERBase64url,'base64url')),false);
});
test('phone keys, claim consumption and result survive broker restart',()=>{
  const dir=mkdtempSync(join(tmpdir(),'zeke-persist-')),file=join(dir,'broker.sqlite'),config={origin:'https://auth.example.org',ownerId:'test-owner'};
  const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});let b;
  try {
    b=new Broker(file,config);b.enroll(b.issueTicket(),{id:'phone',type:'native',data:{spki:pair.publicKey.export({type:'spki',format:'pem'})}});
    const r=b.create({id:'chat',agentId:'zeke',executorId:'runner',allowedKinds:['sandbox.note.append']},{kind:'sandbox.note.append',target:'sandbox:notes',parameters:{text:'Persistent note'}}),id=r.payload.requestId;
    b.nativeDecision(id,'approve','phone',sign('sha256',Buffer.from(b.decisionMessage(id,'approve')),pair.privateKey).toString('base64url'));b.close();
    b=new Broker(file,config);assert.equal(b.read(id).state,'approved');b.consume(id,'runner',r.actionHash);b.close();
    b=new Broker(file,config);assert.equal(b.read(id).state,'claimed');assert.throws(()=>b.consume(id,'runner',r.actionHash),/approval_unavailable/);
    b.finish(id,'runner','unknown',{reason:'reconcile_pending'});b.close();
    b=new Broker(file,config);assert.equal(b.read(id).state,'unknown');assert.equal(b.device('phone').type,'native');
  }finally{b?.close();rmSync(dir,{recursive:true,force:true});}
});
