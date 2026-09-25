const valid = v => typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const num = v => typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function normalizeReport(r,mint,{verifiedPoolOwners=[],holderAccounts={}}={}){
  if(!r||r.mint!==mint||!r.token)throw new Error('Report does not match this token');
  const metrics={},sources={};
  if(num(r.totalHolders))metrics.holderCount=r.totalHolders;
  const ext=r.token_extensions;
  if(ext&&typeof ext==='object'){
    for(const [key,field] of [['permanentDelegate','permanentDelegate'],['transferHook','transferHook'],['pausable','pausableConfig']]){
      if(Object.hasOwn(ext,field)){
        const v=ext[field];
        if(v===null){metrics[key]=false;if(key==='pausable')metrics.paused=false;}
        else if(typeof v==='string'&&valid(v))metrics[key]=v!=='11111111111111111111111111111111';
        else if(v&&typeof v==='object'){
          const authority=v.delegate??v.programId??v.authority;
          if(valid(authority))metrics[key]=authority!=='11111111111111111111111111111111';
          if(key==='pausable'&&typeof v.paused==='boolean')metrics.paused=v.paused;
        }
      }
    }
    if(typeof ext.nonTransferable==='boolean')metrics.nonTransferable=ext.nonTransferable;
    if(Object.hasOwn(ext,'defaultAccountState')){
      const state=ext.defaultAccountState?.state??ext.defaultAccountState;
      if(state===null||state===1||state==='initialized')metrics.defaultFrozen=false;
      else if(state===2||state==='frozen')metrics.defaultFrozen=true;
    }
  }
  if(r.tokenProgram==='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'){
    for(const key of ['permanentDelegate','transferHook','pausable','paused','nonTransferable','defaultFrozen','feeMutable'])metrics[key]=false;
    metrics.transferFeePct=0;
  }
  if(num(r.transferFee?.pct)&&r.transferFee.pct<=100)metrics.transferFeePct=r.transferFee.pct;
  if(r.transferFee&&Object.hasOwn(r.transferFee,'authority')&&(r.transferFee.authority===null||valid(r.transferFee.authority)))metrics.feeMutable=r.transferFee.authority!==null&&r.transferFee.authority!=='11111111111111111111111111111111';

  // Detailed Token-2022 config can contradict the report's convenience fields.
  const feeConfig=ext?.transferFeeConfig;
  if(feeConfig&&typeof feeConfig==='object'){
    const authority=feeConfig.transferFeeConfigAuthority;
    if(valid(authority)&&authority!=='11111111111111111111111111111111')metrics.feeMutable=true;
    else if(authority===null&&metrics.feeMutable!==true)metrics.feeMutable=false;
    const older=feeConfig.olderTransferFee?.transferFeeBasisPoints,newer=feeConfig.newerTransferFee?.transferFeeBasisPoints;
    // Only replace current fee when both schedules agree; no epoch guess.
    if(num(older)&&older<=10000&&older===newer){metrics.transferFeePct=older/100;sources.transferFee='RugCheck Token-2022 fee schedules (both agree)';}
    if(metrics.feeMutable===true)sources.feeMutable='RugCheck Token-2022 fee configuration';
  }

  for(const [key,field] of [['mintActive','mintAuthority'],['freezeActive','freezeAuthority']]){
    if(Object.hasOwn(r.token,field)&&(r.token[field]===null||valid(r.token[field])))metrics[key]=r.token[field]!==null;
  }
  if(typeof r.tokenMeta?.mutable==='boolean')metrics.metadataMutable=r.tokenMeta.mutable;
  // Token-2022 embedded metadata authority can override legacy metadata.
  if(valid(r.token_extensions?.tokenMetadata?.authority)&&r.token_extensions.tokenMetadata.authority!=='11111111111111111111111111111111')metrics.metadataMutable=true;
  const excluded=new Set();
  for(const owner of verifiedPoolOwners)if(valid(owner))excluded.add(owner);
  for(const [addr,info] of Object.entries(r.knownAccounts||{}))if(['AMM','POOL','LOCKER','BURN'].includes(info?.type))excluded.add(addr);
  for(const m of r.markets||[])for(const k of ['pubkey','liquidityA','liquidityB'])if(m[k])excluded.add(m[k]);
  const byOwner=new Map();
  for(const h of r.topHolders||[]){
    if(!num(h.pct)||h.pct>100||!valid(h.owner)||excluded.has(h.address)||excluded.has(h.owner))continue;
    const old=byOwner.get(h.owner)||{address:h.owner,pct:0,...(holderAccounts[h.owner]?{accountType:holderAccounts[h.owner]}:{})};old.pct+=h.pct;byOwner.set(h.owner,old);
  }
  const holders=[...byOwner.values()].filter(h=>h.pct<=100).sort((a,b)=>b.pct-a.pct);
  // Do not assume the holder list covers the global top ten after filtering pools.
  // No aggregate LP-lock inference: bonding curves, CLMM and lock expiries differ.
  for(const k of Object.keys(metrics))sources[{mintActive:'mint',freezeActive:'freeze',metadataMutable:'metadata',transferFeePct:'transferFee'}[k]||k]??='RugCheck report';
  return {mint,metrics,sources,holders,creator:valid(r.creator)?r.creator:null,reportDetectedAt:r.detectedAt||null,holdersTopComplete:false,holderSource:'RugCheck holder sample',rugged:r.rugged===true,
    providerWarnings:Array.isArray(r.risks)?r.risks.filter(x=>x&&typeof x==='object').map(x=>{
      const name=String(x.name||'').slice(0,160),description=String(x.description||'').slice(0,600),level=String(x.level||'');
      // Report-level warnings do not identify the selected pool. Re-evaluate
      // concentration from filtered holders and liquidity from the selected market.
      const unscoped=/\bliquidity\b|\blp\b|(?:single|large|top)\s+holders?\b|holders?\s+(?:concentration|ownership)\b|top\s?(?:10|ten)\b|high ownership|single wallet|supply concentration/i.test(name);
      return {name,description,level,scoringEligible:!unscoped,...(unscoped?{scope:'unscoped',contextOnly:true,reason:'Provider warning has no verified selected-pool scope. Holder concentration and selected-market liquidity are checked separately.'}:{})};
    }).slice(0,20):[]};
}
export function normalizePair(pair,mint){
  if(!pair||pair.chainId!=='solana'||pair.baseToken?.address!==mint)return {};
  const metrics={};if(num(pair.liquidity?.usd))metrics.liquidityUsd=pair.liquidity.usd;
  if(num(pair.volume?.h24))metrics.volume24hUsd=pair.volume.h24;
  if(num(pair.marketCap))metrics.marketCapUsd=pair.marketCap;
  if(num(pair.volume?.m5))metrics.volume5mUsd=pair.volume.m5;
  if(num(pair.txns?.m5?.buys)&&num(pair.txns?.m5?.sells)){metrics.buys5m=pair.txns.m5.buys;metrics.sells5m=pair.txns.m5.sells;}
  if(typeof pair.priceChange?.m5==='number'&&Number.isFinite(pair.priceChange.m5))metrics.priceChange5m=pair.priceChange.m5;
  if(num(pair.pairCreatedAt)&&pair.pairCreatedAt<=Date.now())metrics.pairAgeSeconds=(Date.now()-pair.pairCreatedAt)/1000;
  return {pairAddress:pair.pairAddress,pairDex:pair.dexId,metrics,sources:{sellPressure:'DEX Screener (5 minutes)',priceCrash:'DEX Screener (5 minutes)',liquidityDepth:'DEX Screener',liquidity:'DEX Screener',turnover:'DEX Screener (24h/current pool)'},name:String(pair.baseToken.name||'').slice(0,80)};
}
export {valid};
