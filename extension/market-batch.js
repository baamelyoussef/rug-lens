import {valid} from './providers.js';

// DEX Screener documents up to 30 mint addresses per /tokens/v1 request.
// All callers for the same mint share one request, including forced refreshes.
export function createMarketBatch(request,{windowMs=60,ttl=25000,emptyTtl=5000,limit=200,maxPending=120,now=()=>Date.now()}={}){
  const cache=new Map(),pending=new Map(),waiting=new Map();let timer=null;
  async function flush(){
    timer=null;
    const entries=[...waiting.entries()];waiting.clear();
    for(let i=0;i<entries.length;i+=30){
      const batch=entries.slice(i,i+30),mints=batch.map(([mint])=>mint);
      // Completion is independent across batches; the caller supplies rate limiting.
      Promise.resolve().then(()=>request(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`,Math.max(...batch.map(([,job])=>job.priority))))
        .then(pairs=>{
          if(!Array.isArray(pairs))throw Error('Market provider returned an invalid response');
          const at=now();
          for(const [mint,job] of batch){
            const data={mint,at,pairs:pairs.filter(p=>p?.chainId==='solana'&&p.baseToken?.address===mint&&valid(p.pairAddress))};
            cache.delete(mint);cache.set(mint,data);
            while(cache.size>limit)cache.delete(cache.keys().next().value);
            pending.delete(mint);job.resolve(data);
          }
        }).catch(error=>{for(const [mint,job] of batch){pending.delete(mint);job.reject(error);}});
    }
  }
  return function load(mint,{force=false,priority=0}={}){
    if(!valid(mint))return Promise.reject(Error('Invalid token address'));
    // Join an active refresh instead of returning its older cached predecessor.
    if(pending.has(mint)){
      const job=waiting.get(mint);if(job)job.priority=Math.max(job.priority,priority);
      return pending.get(mint);
    }
    const cached=cache.get(mint);
    if(!force&&cached&&now()-cached.at<(cached.pairs.length?ttl:emptyTtl))return Promise.resolve(cached);
    if(pending.size>=maxPending)return Promise.reject(Error('Market scanner queue full; retry shortly'));
    const promise=new Promise((resolve,reject)=>waiting.set(mint,{resolve,reject,priority}));pending.set(mint,promise);
    if(timer===null)timer=setTimeout(flush,windowMs);
    return promise;
  };
}

export function selectMarketPair(pairs,mint,market){
  const matches=(pairs||[]).filter(p=>p?.chainId==='solana'&&p.baseToken?.address===mint&&valid(p.pairAddress));
  // A token-detail route names a specific pool. Never substitute a more liquid pool.
  if(market&&market!==mint)return matches.find(p=>p.pairAddress===market)||null;
  return matches.sort((a,b)=>(Number.isFinite(b.liquidity?.usd)?b.liquidity.usd:0)-(Number.isFinite(a.liquidity?.usd)?a.liquidity.usd:0))[0]||null;
}
