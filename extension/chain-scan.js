import {valid} from './providers.js';
import {createAccountBatch} from './account-batch.js';
import {summarizeChain} from './chain.js';
export const RPC_URL='https://api.mainnet-beta.solana.com';
const txCache=new Map();let next=0,cooldown=0;
async function rpcRequest(method,params){
  if(Date.now()<cooldown)throw Error('Solana RPC rate limited; retry after one minute');
  const delay=Math.max(0,next-Date.now());next=Math.max(Date.now(),next)+1100;
  if(delay)await new Promise(r=>setTimeout(r,delay));
  if(Date.now()<cooldown)throw Error('Solana RPC rate limited; retry after one minute');
  const res=await fetch(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8000)});
  if(res.status===429){cooldown=Date.now()+60000;throw Error('Solana RPC rate limited; retry after one minute');}
  if(!res.ok)throw Error(`Solana RPC HTTP ${res.status}`);
  const data=await res.json();if(data.error)throw Error(`Solana RPC error ${data.error.code}`);return data.result;
}
export const rpc=createAccountBatch(rpcRequest);
export async function scanChain({mint,holders,creator},call=rpc){
  const sampled=[...new Map((holders||[]).filter(h=>valid(h.address)&&!h.isPool&&h.accountType!=='unresolved'&&typeof h.pct==='number'&&h.pct>=0&&h.pct<=100).map(h=>[h.address,{address:h.address,pct:h.pct}])).values()].sort((a,b)=>b.pct-a.pct).slice(0,6);
  const transactions=[],seen=new Set(),errors=[];let walletsRead=0,requested=0,unavailable=0;
  const started=Date.now();
  outer:for(const h of sampled){
    try{
      if(Date.now()-started>45000){errors.push('Scan time budget reached');break;}
      const signatures=await call('getSignaturesForAddress',[h.address,{limit:4,commitment:'confirmed'}]);
      if(!Array.isArray(signatures))throw Error('RPC returned no signature history');
      walletsRead++;
      for(const s of signatures){
        if(s.err!==null||!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(s.signature||'')||seen.has(s.signature))continue;
        if(Date.now()-started>45000){errors.push('Scan time budget reached');break outer;}
        seen.add(s.signature);requested++;
        let tx=call===rpc?txCache.get(s.signature):null;
        if(!tx){tx=await call('getTransaction',[s.signature,{encoding:'jsonParsed',maxSupportedTransactionVersion:0,commitment:'confirmed'}]);if(tx&&call===rpc){txCache.set(s.signature,tx);while(txCache.size>200)txCache.delete(txCache.keys().next().value);}}
        if(tx?.transaction?.signatures?.[0]===s.signature)transactions.push(tx);else unavailable++;
      }
    }catch(e){errors.push(e.message);break;}
  }
  return {...summarizeChain(transactions,sampled,mint,creator),mint,at:Date.now(),sampled:sampled.length,walletsRead,requested,unavailable,errors,scope:'Latest 4 transactions per sampled holder; up to 6 holders. Not launch history.',partial:true};
}
