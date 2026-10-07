// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createPublicKey, verify, timingSafeEqual } from 'node:crypto';
import { generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse } from '@simplewebauthn/server';
import QRCode from 'qrcode';
import { Broker,hash,secret,canonical,demand } from './core.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const tokenEqual=(a,b)=>typeof a==='string' && typeof b==='string' && timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
export function validateConfig(c) {
  const u=new URL(c.origin);
  demand(u.origin===c.origin && !u.username && !u.password,'origin_must_be_exact',400);
  demand(u.protocol==='https:' || (u.protocol==='http:' && u.hostname==='localhost'),'https_required_except_localhost',400);
  demand(typeof c.ownerId==='string' && Array.isArray(c.clients) && Array.isArray(c.executors),'invalid_config',400);
  for(const p of [...c.clients,...c.executors]) demand(p.id && typeof p.token==='string' && p.token.length>=32,'weak_identity_token',400);
  demand(new Set(c.clients.map(p=>p.id)).size===c.clients.length && new Set(c.executors.map(p=>p.id)).size===c.executors.length,'duplicate_identity',400);
  for(const p of c.clients) demand(c.executors.some(e=>e.id===p.executorId) && typeof p.agentId==='string' && Array.isArray(p.allowedKinds),'invalid_client',400);
  return c;
}
export function makeServer(config,dbFile) {
  validateConfig(config);
  const broker=new Broker(dbFile,config), origin=config.origin, rpID=new URL(origin).hostname;
  const limits=new Map();
  function auth(req,group) {
    const token=req.headers.authorization?.replace(/^Bearer /,'');
    const identity=config[group].find(c=>tokenEqual(token,c.token)); demand(identity,'unauthorized',401); return identity;
  }
  function send(res,status,data,type='application/json') {
    res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      ...(origin.startsWith('https:')?{'Strict-Transport-Security':'max-age=31536000'}:{})});
    res.end(type==='application/json'?JSON.stringify(data):data);
  }
  async function body(req) {
    demand(req.headers['content-type']?.split(';')[0]==='application/json','json_required',415);
    let bytes=0,parts=[];
    for await(const chunk of req){bytes+=chunk.length;demand(bytes<=32768,'body_too_large',413);parts.push(chunk);}
    try {return JSON.parse(Buffer.concat(parts).toString());}catch{demand(false,'invalid_json',400);}
  }
  const server=http.createServer(async(req,res)=>{
    try {
      demand(req.headers.host===new URL(origin).host,'wrong_host',400);
      if(req.headers.origin) demand(req.headers.origin===origin,'wrong_origin');
      demand(!['cross-site','same-site'].includes(req.headers['sec-fetch-site']),'cross_origin_refused');
      const url=new URL(req.url,origin), path=url.pathname, method=req.method;
      if(path.startsWith('/api/')) {
        const key=req.socket.remoteAddress, now=Date.now();
        if(limits.size>10000) for(const [k,v] of limits) if(v.until<now) limits.delete(k);
        const l=limits.get(key); if(!l || l.until<now) limits.set(key,{until:now+60000,n:1});
        else {demand(++l.n<=240,'rate_limited',429);}
      }
      if(method==='GET') {
        const files={'/':'index.html','/approve':'approve.html','/enroll':'enroll.html','/app.js':'app.js','/phone.js':'phone.js','/style.css':'style.css'};
        if(files[path]) return send(res,200,readFileSync(resolve(root,'public',files[path])),path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');
        if(path==='/webauthn.js') return send(res,200,readFileSync(resolve(root,'node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js')),'text/javascript');
        if(path==='/api/health') return send(res,200,{service:'zeke-authorize',version:'0.1.0',mode:'reference-single-owner'});
        const m=path.match(/^\/api\/requests\/([a-f0-9-]+)$/);
        if(m) {
          let r;
          if(req.headers['x-review-token']) r=broker.review(m[1],req.headers['x-review-token']);
          else {const c=auth(req,'clients');r=broker.read(m[1]);demand(r.payload.clientId===c.id,'wrong_client');}
          return send(res,200,r);
        }
        demand(false,'not_found',404);
      }
      demand(method==='POST','method_not_allowed',405);
      const b=await body(req);
      if(path==='/api/requests') {
        const c=auth(req,'clients');const r=broker.create(c,b);
        return send(res,201,{...r,qrDataUrl:await QRCode.toDataURL(r.reviewUrl,{errorCorrectionLevel:'M',margin:4,width:320})});
      }
      if(path==='/api/enroll/options') {
        const ticketHash=broker.ticket(b.enrollmentToken);
        const options=await generateRegistrationOptions({rpName:'Zeke Authorize by Corgi-verse',rpID,
          userID:new TextEncoder().encode(config.ownerId),userName:config.ownerId,
          attestationType:'none',supportedAlgorithmIDs:[-7],authenticatorSelection:{residentKey:'required',userVerification:'required',authenticatorAttachment:'platform'},
          excludeCredentials:broker.devices('passkey').map(d=>({id:d.id}))});
        const ceremonyId=broker.ceremony({type:'registration',ticketHash,challenge:options.challenge});
        return send(res,200,{options,ceremonyId});
      }
      if(path==='/api/enroll/verify') {
        const c=broker.takeCeremony(b.ceremonyId);
        demand(c.type==='registration' && c.ticketHash===broker.ticket(b.enrollmentToken),'wrong_ceremony');
        const v=await verifyRegistrationResponse({response:b.response,expectedChallenge:c.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,supportedAlgorithmIDs:[-7]});
        demand(v.verified && v.registrationInfo,'invalid_registration');
        const {credential,credentialDeviceType,credentialBackedUp}=v.registrationInfo;
        const device=broker.enroll(b.enrollmentToken,{id:credential.id,type:'passkey',data:{publicKey:Buffer.from(credential.publicKey).toString('base64url'),counter:credential.counter,transports:credential.transports,credentialDeviceType,credentialBackedUp}});
        return send(res,201,device);
      }
      if(path==='/api/enroll/native/options') {
        const ticketHash=broker.ticket(b.enrollmentToken);
        const deviceId=secret(),nonce=secret();
        const message='zeke.authorize.enrollment/1\n'+canonical({origin,ownerId:config.ownerId,deviceId,nonce,ticketHash});
        const ceremonyId=broker.ceremony({type:'native-registration',ticketHash,deviceId,message});
        return send(res,200,{deviceId,message,ceremonyId});
      }
      if(path==='/api/enroll/native/verify') {
        const c=broker.takeCeremony(b.ceremonyId);
        demand(c.type==='native-registration' && c.ticketHash===broker.ticket(b.enrollmentToken),'wrong_ceremony');
        demand(typeof b.spki==='string' && b.spki.length<1000 && typeof b.signature==='string' && b.signature.length<512,'invalid_public_key',400);
        const key=createPublicKey(b.spki);
        demand(key.asymmetricKeyType==='ec' && key.asymmetricKeyDetails.namedCurve==='prime256v1','p256_required');
        demand(verify('sha256',Buffer.from(c.message),key,Buffer.from(b.signature,'base64url')),'invalid_signature');
        return send(res,201,broker.enroll(b.enrollmentToken,{id:c.deviceId,type:'native',data:{spki:key.export({type:'spki',format:'pem'}),assurance:'hardware-unverified'}}));
      }
      if(path==='/api/decision/options') {
        broker.review(b.id,req.headers['x-review-token']);
        const message=broker.decisionMessage(b.id,b.decision);
        const options=await generateAuthenticationOptions({rpID,userVerification:'required',challenge:hash(message),
          allowCredentials:broker.devices('passkey').map(d=>({id:d.id,transports:d.data.transports}))});
        demand(options.allowCredentials.length>0,'no_phone_key_enrolled',409);
        const ceremonyId=broker.ceremony({type:'decision',id:b.id,decision:b.decision,message,challenge:options.challenge});
        return send(res,200,{options,ceremonyId});
      }
      if(path==='/api/decision/verify') {
        const c=broker.takeCeremony(b.ceremonyId); demand(c.type==='decision','wrong_ceremony');
        broker.review(c.id,req.headers['x-review-token']);
        demand(broker.decisionMessage(c.id,c.decision)===c.message,'action_changed');
        const d=broker.device(b.response.id);demand(d.type==='passkey','wrong_key_type');
        const counter=d.data.counter;
        const v=await verifyAuthenticationResponse({response:b.response,expectedChallenge:c.challenge,expectedOrigin:origin,expectedRPID:rpID,
          credential:{id:d.id,publicKey:Buffer.from(d.data.publicKey,'base64url'),counter,transports:d.data.transports},requireUserVerification:true});
        demand(v.verified,'invalid_signature');
        return send(res,200,broker.commitDecision(c.id,c.decision,d.id,{type:'passkey',message:c.message,response:b.response},data=>{
          demand(data.counter===counter,'concurrent_key_use',409);return {...data,counter:v.authenticationInfo.newCounter};
        }));
      }
      if(path==='/api/native/message') {
        broker.review(b.id,req.headers['x-review-token']);
        return send(res,200,{message:broker.decisionMessage(b.id,b.decision)});
      }
      if(path==='/api/native/decision') {
        broker.review(b.id,req.headers['x-review-token']);
        return send(res,200,broker.nativeDecision(b.id,b.decision,b.deviceId,b.signature));
      }
      if(path==='/api/cancel') return send(res,200,broker.cancel(b.id,auth(req,'clients').id));
      if(path==='/api/execute' || path==='/api/claim') return send(res,200,broker.consume(b.id,auth(req,'executors').id,b.actionHash,path==='/api/execute'));
      if(path==='/api/result') return send(res,200,broker.finish(b.id,auth(req,'executors').id,b.status,b.result));
      demand(false,'not_found',404);
    } catch(e) { send(res,e.status??400,{error:e.status?e.message:'request_rejected'}); }
  });
  server.on('close',()=>broker.close());
  return {server,broker};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const configFile=process.argv[2];
  if(!configFile) throw new Error('Usage: node src/server.mjs /absolute/private/state/config.json');
  const config=JSON.parse(readFileSync(configFile));
  const {server}=makeServer(config,resolve(dirname(configFile),'broker.sqlite'));
  server.listen(config.port??8787,config.bind??'127.0.0.1',()=>console.log(`Zeke Authorize ready at ${config.origin}; TLS must be provided by the configured reverse proxy for phone use.`));
}
