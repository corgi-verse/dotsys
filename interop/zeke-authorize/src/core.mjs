// SPDX-License-Identifier: Apache-2.0
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, createPublicKey, verify } from 'node:crypto';

export const canonical = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
};
export const hash = value => createHash('sha256').update(value).digest('base64url');
export const secret = () => randomBytes(32).toString('base64url');
export function demand(ok, code = 'refused', status = 403) {
  if (!ok) throw Object.assign(new Error(code), { status });
}
const clean = (s, n) => typeof s === 'string' && s.length > 0 && s.length <= n && !/[\x00-\x08\x0b-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(s);

export class Broker {
  constructor(file, config, now = Date.now) {
    this.config = config; this.now = now;
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id=1), epoch INTEGER NOT NULL);
      INSERT OR IGNORE INTO meta VALUES(1,1);
      CREATE TABLE IF NOT EXISTS tickets (digest TEXT PRIMARY KEY, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, payload TEXT NOT NULL, digest TEXT NOT NULL, view_hash TEXT NOT NULL,
        state TEXT NOT NULL, device TEXT, evidence TEXT, receipt TEXT);
      CREATE TABLE IF NOT EXISTS ceremonies (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS notes (request_id TEXT PRIMARY KEY, text TEXT NOT NULL, created INTEGER NOT NULL);
    `);
  }
  close() { this.db.close(); }
  epoch() { return this.db.prepare('SELECT epoch FROM meta WHERE id=1').get().epoch; }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  issueTicket() {
    const token = secret();
    this.db.prepare('INSERT INTO tickets(digest,expires) VALUES(?,?)').run(hash(token), this.now()+900000);
    return token;
  }
  ticket(token) {
    demand(typeof token === 'string', 'invalid_enrollment_ticket');
    const t = this.db.prepare('SELECT * FROM tickets WHERE digest=?').get(hash(token));
    demand(t && !t.used && t.expires > this.now(), 'invalid_enrollment_ticket');
    return hash(token);
  }
  enroll(ticket, device) {
    return this.transaction(() => {
      const digest = this.ticket(ticket);
      demand(clean(device.id, 1024) && ['passkey','native'].includes(device.type), 'invalid_device',400);
      this.db.prepare('INSERT INTO devices(id,type,data) VALUES(?,?,?)').run(device.id,device.type,JSON.stringify(device.data));
      this.db.prepare('UPDATE tickets SET used=1 WHERE digest=?').run(digest);
      return { id: device.id, type: device.type };
    });
  }
  device(id) {
    demand(typeof id === 'string', 'unknown_device');
    const d = this.db.prepare('SELECT * FROM devices WHERE id=? AND revoked=0').get(id);
    demand(d, 'unknown_device'); return {...d, data:JSON.parse(d.data)};
  }
  devices(type) {
    return this.db.prepare('SELECT * FROM devices WHERE revoked=0 AND type=?').all(type).map(d=>({...d,data:JSON.parse(d.data)}));
  }
  revoke(id) {
    return this.transaction(() => {
      this.device(id);
      this.db.prepare('UPDATE devices SET revoked=1 WHERE id=?').run(id);
      this.db.exec('UPDATE meta SET epoch=epoch+1 WHERE id=1');
      this.db.exec("UPDATE requests SET state='revoked' WHERE state IN ('pending','approved')");
      return { revoked:id, epoch:this.epoch() };
    });
  }
  create(client, input) {
    demand(input && Object.keys(input).sort().join(',') === 'kind,parameters,target', 'invalid_action_fields',400);
    demand(client.allowedKinds.includes(input.kind), 'kind_not_allowed');
    if (input.kind === 'sandbox.note.append') {
      demand(input.target === 'sandbox:notes' && input.parameters && Object.keys(input.parameters).join(',') === 'text'
        && clean(input.parameters.text,2000), 'invalid_note',400);
    } else demand(false,'connector_not_implemented',400);
    const id=randomUUID(), token=secret();
    const payload={v:1,origin:this.config.origin,requestId:id,ownerId:this.config.ownerId,
      clientId:client.id,agentId:client.agentId,executorId:client.executorId,
      ...input,createdAt:this.now(),expiresAt:this.now()+120000,epoch:this.epoch(),nonce:secret()};
    const digest=hash(canonical(payload));
    this.db.prepare('INSERT INTO requests(id,payload,digest,view_hash,state) VALUES(?,?,?,?,?)')
      .run(id,canonical(payload),digest,hash(token),'pending');
    return {...this.read(id),reviewUrl:`${this.config.origin}/approve#${new URLSearchParams({id,t:token})}`};
  }
  row(id) {
    const r=this.db.prepare('SELECT * FROM requests WHERE id=?').get(id); demand(r,'unknown_request',404); return r;
  }
  read(id) {
    const r=this.row(id), payload=JSON.parse(r.payload);
    let state=r.state;
    if (['pending','approved'].includes(state)) {
      if (payload.epoch!==this.epoch()) state='revoked';
      else if (payload.expiresAt<=this.now()) state='expired';
      if(state!==r.state) this.db.prepare('UPDATE requests SET state=? WHERE id=?').run(state,id);
    }
    return {payload,actionHash:r.digest,state,receipt:r.receipt?JSON.parse(r.receipt):null};
  }
  review(id, token) {
    demand(typeof token==='string' && hash(token)===this.row(id).view_hash,'invalid_review_link');
    const request=this.read(id);
    demand(request.payload.expiresAt>this.now(),'review_link_expired',410);
    return request;
  }
  pending(id) { const r=this.read(id); demand(r.state==='pending','request_not_pending',409); return r; }
  decisionMessage(id, decision) {
    demand(['approve','deny'].includes(decision),'invalid_decision',400);
    const {payload:p,actionHash}=this.pending(id);
    return 'zeke.authorize.decision/1\n'+canonical({actionHash,decision,epoch:p.epoch,expiresAt:p.expiresAt,
      nonce:p.nonce,origin:p.origin,ownerId:p.ownerId,requestId:p.requestId});
  }
  ceremony(data, expires=this.now()+120000) {
    const id=secret(); this.db.prepare('INSERT INTO ceremonies VALUES(?,?,?)').run(id,JSON.stringify(data),expires); return id;
  }
  takeCeremony(id) {
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT * FROM ceremonies WHERE id=?').get(id);
      demand(row && row.expires>this.now(),'expired_or_used_challenge');
      this.db.prepare('DELETE FROM ceremonies WHERE id=?').run(id); return JSON.parse(row.data);
    });
  }
  commitDecision(id, decision, deviceId, evidence, updateDevice) {
    return this.transaction(()=>{
      const r=this.pending(id); const d=this.device(deviceId);
      demand(r.payload.epoch===this.epoch(),'revoked');
      if(updateDevice) this.db.prepare('UPDATE devices SET data=? WHERE id=?').run(JSON.stringify(updateDevice(d.data)),d.id);
      const state=decision==='approve'?'approved':'denied';
      this.db.prepare('UPDATE requests SET state=?,device=?,evidence=? WHERE id=?').run(state,d.id,JSON.stringify(evidence),id);
      return this.read(id);
    });
  }
  nativeDecision(id,decision,deviceId,signature) {
    const message=this.decisionMessage(id,decision), d=this.device(deviceId);
    demand(d.type==='native','wrong_key_type');
    demand(typeof signature==='string' && signature.length<512,'invalid_signature',400);
    demand(verify('sha256',Buffer.from(message),createPublicKey(d.data.spki),Buffer.from(signature,'base64url')),'invalid_signature');
    return this.commitDecision(id,decision,deviceId,{type:'native',message,signature});
  }
  cancel(id,clientId) {
    return this.transaction(()=>{
      const r=this.read(id); demand(r.payload.clientId===clientId,'wrong_client');
      demand(['pending','approved'].includes(r.state),'not_cancelable',409);
      this.db.prepare("UPDATE requests SET state='canceled' WHERE id=?").run(id); return this.read(id);
    });
  }
  consume(id,executorId,actionHash,local=false) {
    return this.transaction(()=>{
      const r=this.read(id); demand(r.payload.executorId===executorId,'wrong_executor');
      demand(r.state==='approved','approval_unavailable',409); demand(r.actionHash===actionHash,'action_changed',409);
      this.device(this.row(id).device);
      let receipt={requestId:id,actionHash,executorId,claimedAt:this.now(),status:'claimed'};
      if(local) {
        demand(r.payload.kind==='sandbox.note.append','connector_not_implemented');
        this.db.prepare('INSERT INTO notes VALUES(?,?,?)').run(id,r.payload.parameters.text,this.now());
        receipt={...receipt,status:'succeeded',completedAt:this.now(),result:{noteId:id}};
      }
      this.db.prepare('UPDATE requests SET state=?,receipt=? WHERE id=?').run(local?'succeeded':'claimed',JSON.stringify(receipt),id);
      return {payload:r.payload,actionHash,receipt};
    });
  }
  finish(id,executorId,status,result) {
    return this.transaction(()=>{
      const r=this.read(id); demand(r.payload.executorId===executorId,'wrong_executor');
      demand(r.state==='claimed','not_claimed',409); demand(['succeeded','failed','unknown'].includes(status),'invalid_result',400);
      demand(result && typeof result==='object' && canonical(result).length<=4000,'invalid_result',400);
      const receipt={...r.receipt,status,completedAt:this.now(),result};
      this.db.prepare('UPDATE requests SET state=?,receipt=? WHERE id=?').run(status,JSON.stringify(receipt),id);
      return receipt;
    });
  }
}
