// SPDX-License-Identifier: Apache-2.0
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Broker} from '../src/core.mjs';
const dir=resolve(process.argv[2]??'');
if(!process.argv[2]) throw new Error('Usage: node tools/ticket.mjs /absolute/private/state');
const b=new Broker(resolve(dir,'broker.sqlite'),JSON.parse(readFileSync(resolve(dir,'config.json'))));
writeFileSync(resolve(dir,'enrollment.json'),JSON.stringify({enrollmentToken:b.issueTicket(),expiresInSeconds:900}),{mode:0o600});b.close();
console.log('A one-use 15-minute enrollment ticket was saved in the private state directory.');
