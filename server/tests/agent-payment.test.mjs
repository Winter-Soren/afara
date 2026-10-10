import test from 'node:test';
import assert from 'node:assert/strict';
import { priceUSDC, validateAgentFile } from '../dist/utils/agent-payment.js';
test('Base quote uses USD and ceil micro-USDC consistently',()=>{
 assert.equal(priceUSDC(1,30,3e-12,7).atomic,'1');
 assert.equal(priceUSDC(262144,30,3e-12,7).atomic,'24');
 assert.equal(priceUSDC(100000,1,3e-12,7).effectiveDuration,7);
 for(const value of [-1,0,NaN,Infinity,1.5])assert.throws(()=>priceUSDC(value,30,3e-12,7));
});
test('payment gate binds size and optional hash to uploaded bytes',()=>{
 const file={size:3,buffer:Buffer.from('abc'),originalname:'report.md'};
 assert.doesNotThrow(()=>validateAgentFile(file,{size:'3',duration:'30'}));
 assert.throws(()=>validateAgentFile(file,{size:'4',duration:'30'}));
 assert.throws(()=>validateAgentFile(file,{size:'3',duration:'30',sha256:'0'.repeat(64)}));
});
