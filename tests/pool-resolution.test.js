import test from 'node:test';import assert from 'node:assert/strict';import {decodePumpPool,resolvePumpPool} from '../extension/pool-resolution.js';
const data='8ZptBBGxbbz+AACTCWImwEFUKru39+KserApNSNL1jm5b+E980WniOT4r3xYcNvZ7iIRMW9q0DhUZNrEhgJJqCtVnwTN2BMwFivvBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAGKt4s5tO9MSLcYhZN7rJLEeo9DHR6JZYRTgdXdZqiSaUJyLd+ejH0m+DqCzllPZvtlrG4A2zuujwj/p+bsx2gsyky+QyYQVPFrnl4CkWT0xnAdDj7OU+4v/X3ZCreYT90QlGtZ0AMAAOhV1H5sSn36mXLy01nqxkNCAXlGcFLbcq9QT4gcIgsuAAB2Qh4YBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const account={owner:'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',executable:false,data:[data,'base64']};
test('reported pool address decodes to merci mint using canonical owner and discriminator',async()=>{
 assert.equal(decodePumpPool(account),'9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump');
 assert.equal(await resolvePumpPool('2RyKJCowXHSxxuSjAwVtKHgABaSDM5shyBgjKPnZU2YB',async()=>({value:account})),'9NPmnDgL39NmoivaE1XfiFWm7o61repcfkVyvyv9pump');
});
test('unsupported owners, discriminators and truncated accounts cannot change token identity',()=>{
 assert.equal(decodePumpPool({...account,owner:'other'}),null);assert.equal(decodePumpPool({...account,executable:true}),null);
 assert.equal(decodePumpPool({...account,data:['AAAA'+data.slice(4),'base64']}),null);
 assert.equal(decodePumpPool({...account,data:[data.slice(0,40),'base64']}),null);
});
