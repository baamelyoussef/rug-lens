import {normalizeReport} from './providers.js';
import {decodePumpPool} from './pool-resolution.js';
import {rpc} from './chain-scan.js';

const SYSTEM='11111111111111111111111111111111';
const SOURCE='Solana confirmed account owner + PumpSwap pool discriminator/base mint';

// Coalesce different coins' holder requests into a single account RPC. Cached
// classifications never rely on a provider-supplied AMM label or PDA appearance.
export function createHolderVerifier({call=rpc,timeoutMs=1500,ttlMs=120000,now=Date.now}={}){
  const cache=new Map(),pending=new Map(),queued=new Map();let timer=null,active=0;
  function remember(address,value){
    cache.delete(address);cache.set(address,value);
    while(cache.size>500)cache.delete(cache.keys().next().value);
  }
  function schedule(){if(timer===null)timer=setTimeout(flush,10);}
  function decode(account,slot){
    if(!account)return {type:'unresolved',reason:'Holder authority account was not found',at:now(),slot};
    const baseMint=decodePumpPool(account);
    return {type:baseMint?'pump-pool':account.owner===SYSTEM&&account.executable===false?'wallet':'unresolved',baseMint,at:now(),slot,
      ...(!baseMint&&account.owner!==SYSTEM?{reason:'Holder authority uses an unsupported program; pool identity is unresolved'}:{})};
  }
  async function flush(){
    timer=null;
    const batch=[...queued.entries()].slice(0,50);
    for(const [address] of batch)queued.delete(address);
    if(queued.size)schedule();
    if(!batch.length)return;
    let result,error,timedOut=false;
    try{
      if(active>=2)throw Error('Holder account verification is busy; retry next scan');
      let timeout;
      active++;
      const request=Promise.resolve().then(()=>call('getMultipleAccounts',[batch.map(([address])=>address),{encoding:'base64',commitment:'confirmed',dataSlice:{offset:0,length:211}}])).finally(()=>{active--;});
      // A slow shared RPC must not hold contract checks hostage. If it finishes
      // later, cache its classifications for the next scan without mutating this report.
      request.then(late=>{
        if(!timedOut||!Array.isArray(late?.value)||late.value.length!==batch.length)return;
        batch.forEach(([address],index)=>remember(address,decode(late.value[index],late.context?.slot)));
      },()=>{});
      try{result=await Promise.race([
        request,
        new Promise((_,reject)=>{timeout=setTimeout(()=>{timedOut=true;reject(Error('Holder account verification timed out'));},timeoutMs);})
      ]);}finally{clearTimeout(timeout);}
      if(!Array.isArray(result?.value)||result.value.length!==batch.length)throw Error('Incomplete holder account verification response');
    }catch(e){error=e?.message||'Holder account verification unavailable';}
    for(let index=0;index<batch.length;index++){
      const [address,resolve]=batch[index],account=result?.value?.[index];
      let value;
      if(error)value={type:'unavailable',reason:error,at:now()};
      else value=decode(account,result.context?.slot);
      remember(address,value);pending.delete(address);resolve(value);
    }
  }
  function classify(address){
    const cached=cache.get(address);
    if(cached&&now()-cached.at<(cached.type==='unavailable'?15000:ttlMs))return Promise.resolve(cached);
    if(pending.has(address))return pending.get(address);
    const promise=new Promise(resolve=>queued.set(address,resolve));pending.set(address,promise);schedule();return promise;
  }
  return async function verify(raw,mint){
    // Validate identity before making any network requests.
    const initial=normalizeReport(raw,mint);
    const suspicious=initial.holders.filter(h=>h.pct>=4),sample=suspicious.slice(0,12);
    const checked=await Promise.all(sample.map(async h=>({address:h.address,pct:h.pct,...await classify(h.address)})));
    const pools=checked.filter(h=>h.type==='pump-pool'&&h.baseMint===mint);
    const unresolved=checked.filter(h=>h.type!=='wallet'&&!(h.type==='pump-pool'&&h.baseMint===mint)).map(h=>({address:h.address,pct:h.pct,reason:h.type==='pump-pool'?'Pool base mint does not match this token':h.reason||'Holder account type unresolved'}));
    unresolved.push(...suspicious.slice(12).map(h=>({address:h.address,pct:h.pct,reason:'Holder verification sample limit reached'})));
    const holderAccounts=Object.fromEntries(checked.map(h=>[h.address,h.type==='wallet'?'wallet':'unresolved']));
    for(const h of suspicious.slice(12))holderAccounts[h.address]='unresolved';
    const report=normalizeReport(raw,mint,{verifiedPoolOwners:pools.map(h=>h.address),holderAccounts});
    return {...report,holderSource:pools.length?'RugCheck holder sample; PumpSwap pools excluded by Solana account verification':report.holderSource,
      holderVerification:{status:!suspicious.length?'not-needed':!unresolved.length?'verified':checked.every(h=>h.type==='unavailable')?'unavailable':'partial',
        source:SOURCE,fetchedAt:now(),checkedAt:checked.length?Math.min(...checked.map(h=>h.at)):null,checked:checked.length,scope:'Holder authorities with at least 4% reported supply, up to 12; supported pools: PumpSwap; account cache up to 2 minutes',
        excludedPools:pools.map(h=>({address:h.address,mint:h.baseMint,slot:h.slot,checkedAt:h.at})),unresolved}};
  };
}

const verifiers=new WeakMap();
export function verifyReportHolders(raw,mint,{call=rpc,timeoutMs=1500}={}){
  let verifier=verifiers.get(call);
  if(!verifier){verifier=createHolderVerifier({call,timeoutMs});verifiers.set(call,verifier);}
  return verifier(raw,mint);
}
