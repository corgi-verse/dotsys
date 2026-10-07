// SPDX-License-Identifier: Apache-2.0
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Broker} from '../src/core.mjs';
if(!process.argv[2] || !process.argv[3]) throw new Error('Usage: node tools/revoke.mjs /absolute/private/state DEVICE_ID');
const dir=resolve(process.argv[2]),b=new Broker(resolve(dir,'broker.sqlite'),JSON.parse(readFileSync(resolve(dir,'config.json'))));
console.log(JSON.stringify(b.revoke(process.argv[3])));b.close();
