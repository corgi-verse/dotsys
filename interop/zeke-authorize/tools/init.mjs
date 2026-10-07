// SPDX-License-Identifier: Apache-2.0
import { mkdirSync,writeFileSync,existsSync,chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { Broker,secret } from '../src/core.mjs';
import { validateConfig } from '../src/server.mjs';
const [dirArg,origin='http://localhost:8787']=process.argv.slice(2);
if(!dirArg) throw new Error('Usage: node tools/init.mjs /absolute/private/state [https://auth.example.org]');
const dir=resolve(dirArg);
if(existsSync(resolve(dir,'config.json'))) throw new Error('Existing configuration preserved; use ticket.mjs to enroll another phone.');
mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
const config=validateConfig({origin,ownerId:'owner',port:8787,bind:'127.0.0.1',
  clients:[{id:'zeke-chat',agentId:'zeke',executorId:'sandbox-runner',allowedKinds:['sandbox.note.append'],token:secret()},
    {id:'dots-chat',agentId:'dots',executorId:'sandbox-runner',allowedKinds:['sandbox.note.append'],token:secret()}],
  executors:[{id:'sandbox-runner',token:secret()}]});
writeFileSync(resolve(dir,'config.json'),JSON.stringify(config,null,2),{mode:0o600,flag:'wx'});
const broker=new Broker(resolve(dir,'broker.sqlite'),config);
writeFileSync(resolve(dir,'enrollment.json'),JSON.stringify({enrollmentToken:broker.issueTicket(),expiresInSeconds:900}),{mode:0o600});
broker.close();chmodSync(resolve(dir,'broker.sqlite'),0o600);
console.log('Private configuration and a one-use 15-minute enrollment ticket were saved. No credentials were printed.');
