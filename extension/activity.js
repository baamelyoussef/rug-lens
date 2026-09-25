/* Local observation only: a visible/filtered sample is never the complete chain. */
(() => {
  const finite=n=>typeof n==='number'&&Number.isFinite(n),sum=(rows,key)=>rows.reduce((n,r)=>n+(finite(r[key])&&r[key]>=0?r[key]:0),0);
  const BASE58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',MIN_USD=5,addressCache=new Map();
  // A displayed abbreviation or arbitrary 32-character string is not a wallet identity.
  function address(value){
    if(typeof value!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))return false;
    if(addressCache.has(value))return addressCache.get(value);
    let n=0n;for(const ch of value)n=n*58n+BigInt(BASE58.indexOf(ch));
    let bytes=0;for(;n>0n;n>>=8n)bytes++;
    const valid=bytes+(value.match(/^1*/)?.[0].length||0)===32;
    addressCache.set(value,valid);if(addressCache.size>1024)addressCache.delete(addressCache.keys().next().value);
    return valid;
  }
  function observedTrades(rows,now){
    const dedup=new Map();
    for(const r of (Array.isArray(rows)?rows:[]).slice(-1000))if(r&&typeof r.signature==='string'&&r.signature.trim()&&r.signature.length<=128&&['buy','sell'].includes(r.side)&&finite(r.at)&&r.at<=now){
      // Re-reading relative ages must not turn an already observed signature into a new trade.
      const previous=dedup.get(r.signature);
      if(!previous||r.at<previous.at)dedup.set(r.signature,r);
    }
    return [...dedup.values()].filter(r=>now-r.at<=300000).sort((a,b)=>a.at-b.at).slice(-500);
  }
  function windowSummary(trades,seconds,now){
    const rows=trades.filter(r=>now-r.at<=seconds*1000),priced=rows.filter(r=>finite(r.usd)&&r.usd>=0),eligible=priced.filter(r=>r.usd>=MIN_USD);
    const identified=eligible.filter(r=>address(r.wallet)),readable=identified.filter(r=>finite(r.tokenAmount)&&r.tokenAmount>0),byWallet=new Map();
    for(const r of identified){const list=byWallet.get(r.wallet)||[];list.push(r);byWallet.set(r.wallet,list);}
    // Missing USD cannot establish that an opposing trade was below the $5 filter.
    const unknownValueWallets=new Set(rows.filter(r=>address(r.wallet)&&!(finite(r.usd)&&r.usd>=0)).map(r=>r.wallet));
    const complete=[...byWallet.entries()].filter(([wallet,rs])=>!unknownValueWallets.has(wallet)&&rs.every(r=>finite(r.tokenAmount)&&r.tokenAmount>0)).map(([,rs])=>rs),completeRows=complete.flat();
    const pricedCoverage=rows.length?priced.length/rows.length:0,walletCoverage=eligible.length?identified.length/eligible.length:0,quantityCoverage=identified.length?readable.length/identified.length:0;
    const reasons=[];
    if(eligible.length<5)reasons.push('Fewer than 5 observed trades of at least $5.');
    if(pricedCoverage<.8)reasons.push('Fewer than 80% of observed trades have readable USD amounts.');
    if(walletCoverage<.8)reasons.push('Fewer than 80% of eligible trades have full wallet addresses.');
    if(quantityCoverage<.8)reasons.push('Fewer than 80% of identified trades have readable token amounts.');
    if(complete.length<3)reasons.push('Fewer than 3 observed wallets have complete readable quantities.');
    const available=!reasons.length;
    let netBuyingWallets=0,netSellingWallets=0,balancedWallets=0,indeterminateWallets=0;
    for(const rs of complete){
      // Displayed abbreviations do not have enough precision to establish a two-sided net direction.
      if(rs.some(r=>r.side==='buy')&&rs.some(r=>r.side==='sell')&&rs.some(r=>r.tokenAmountApproximate===true)){indeterminateWallets++;continue;}
      const bought=sum(rs.filter(r=>r.side==='buy'),'tokenAmount'),sold=sum(rs.filter(r=>r.side==='sell'),'tokenAmount');
      const tolerance=Math.max(bought,sold)*1e-9;
      if(bought-sold>tolerance)netBuyingWallets++;else if(sold-bought>tolerance)netSellingWallets++;else balancedWallets++;
    }
    const buyUsd=sum(eligible.filter(r=>r.side==='buy'),'usd'),sellUsd=sum(eligible.filter(r=>r.side==='sell'),'usd');
    const buyTokenAmount=sum(completeRows.filter(r=>r.side==='buy'),'tokenAmount'),sellTokenAmount=sum(completeRows.filter(r=>r.side==='sell'),'tokenAmount');
    return {seconds,status:available?'available':'insufficient',reasons,minUsd:MIN_USD,observedCount:rows.length,pricedCount:priced.length,eligibleCount:eligible.length,
      walletCount:byWallet.size,fullWalletTradeCount:identified.length,readableCount:readable.length,walletCoverage,quantityCoverage,pricedCoverage,
      completeWallets:complete.length,incompleteWallets:byWallet.size-complete.length,
      netBuyingWallets:available?netBuyingWallets:null,netSellingWallets:available?netSellingWallets:null,balancedWallets:available?balancedWallets:null,
      indeterminateWallets:available?indeterminateWallets:null,
      twoSidedWallets:available?complete.filter(rs=>rs.some(r=>r.side==='buy')&&rs.some(r=>r.side==='sell')).length:null,
      buyUsd,sellUsd,netTradeUsd:buyUsd-sellUsd,buyTokenAmount:available?buyTokenAmount:null,sellTokenAmount:available?sellTokenAmount:null,netTokenAmount:available?buyTokenAmount-sellTokenAmount:null,
      spanSeconds:rows.length>1?Math.round((rows.at(-1).at-rows[0].at)/1000):0,newestAt:rows.at(-1)?.at??null,oldestAt:rows[0]?.at??null,
      approximate:completeRows.some(r=>r.tokenAmountApproximate===true),sampleOnly:true};
  }
  function summarize(rows=[],now=Date.now()){
    const trades=observedTrades(rows,now);
    const buys=trades.filter(r=>r.side==='buy'),sells=trades.filter(r=>r.side==='sell');
    const priced=trades.filter(r=>finite(r.usd)&&r.usd>=0),volume=sum(priced,'usd'),sellUsd=sum(sells,'usd');
    const tagged=sells.filter(r=>r.developer||r.insider||r.bundler);
    const byWallet=new Map();for(const r of trades)if(address(r.wallet)){const list=byWallet.get(r.wallet)||[];list.push(r);byWallet.set(r.wallet,list);}
    const walletVolumes=[...byWallet.values()].map(rs=>sum(rs,'usd'));
    const loops=[...byWallet.values()].filter(rs=>rs.length>=4&&rs.filter(r=>r.side==='buy').length>=2&&rs.filter(r=>r.side==='sell').length>=2&&Math.min(sum(rs.filter(r=>r.side==='buy'),'usd'),sum(rs.filter(r=>r.side==='sell'),'usd'))>=10);
    const buyGroups=new Map();for(const r of buys)if(finite(r.usd)&&r.usd>=5&&r.makerLabel){const key=Math.floor(r.at/1000);const list=buyGroups.get(key)||[];list.push(r);buyGroups.set(key,list);}
    let synchronized=0;
    // Sliding amount window preserves the same 2% rule without pairwise comparisons.
    for(const group of buyGroups.values()){
      const rs=group.map(r=>({...r,identity:address(r.wallet)?r.wallet:r.makerLabel})).sort((a,b)=>a.usd-b.usd),makers=new Map();
      let left=0,right=0;
      for(const r of rs){
        const tolerance=Math.max(.05,r.usd*.02),low=r.usd-tolerance,high=r.usd+tolerance;
        while(right<rs.length&&rs[right].usd<=high){const key=rs[right++].identity;makers.set(key,(makers.get(key)||0)+1);}
        while(left<right&&rs[left].usd<low){const key=rs[left++].identity,count=makers.get(key)-1;if(count)makers.set(key,count);else makers.delete(key);}
        synchronized=Math.max(synchronized,makers.size);
      }
    }
    return {count:trades.length,buys:buys.length,sells:sells.length,volumeUsd:volume,sellUsd,sellPct:volume>0?sellUsd/volume*100:null,
      pricedCount:priced.length,taggedSellUsd:sum(tagged,'usd'),taggedSellCount:tagged.length,developerSellUsd:sum(sells.filter(r=>r.developer),'usd'),
      fullWalletCount:byWallet.size,walletCoverage:trades.length?trades.filter(r=>address(r.wallet)).length/trades.length:0,
      largestTraderPct:volume>0&&walletVolumes.length?Math.max(...walletVolumes)/volume*100:null,roundTripWallets:loops.length,synchronized,
      spanSeconds:trades.length>1?Math.round((trades.at(-1).at-trades[0].at)/1000):0,newestAt:trades.at(-1)?.at||null,
      signatures:tagged.slice(-5).map(r=>r.signature),windows:Object.fromEntries([30,120,300].map(seconds=>[`${seconds}s`,windowSummary(trades,seconds,now)])),sampleOnly:true};
  }
  function holdingMap(snapshot){
    const holders=new Map(),conflicts=new Set();
    for(const row of (Array.isArray(snapshot.holders)?snapshot.holders:[]).slice(0,100)){
      if(!row||!address(row.address)||row.isPool||['unresolved','program'].includes(row.accountType)||!finite(row.pct)||row.pct<0||row.pct>100)continue;
      if(holders.has(row.address)&&holders.get(row.address)!==row.pct){holders.delete(row.address);conflicts.add(row.address);}
      if(!conflicts.has(row.address))holders.set(row.address,row.pct);
    }
    return holders;
  }
  function cohort(history=[],now=Date.now()){
    const base={status:'insufficient',reasons:[],from:null,to:null,seconds:null,matchedCount:0,previousObservedCount:0,currentObservedCount:0,
      previousPct:null,currentPct:null,changePp:null,increasedWallets:null,decreasedWallets:null,unchangedWallets:null,sampleOnly:true};
    const recent=(Array.isArray(history)?history:[]).slice(-100).filter(x=>x&&finite(x.at)&&x.at<=now&&now-x.at<=600000).sort((a,b)=>a.at-b.at),last=recent.at(-1);
    if(!last||now-last.at>=30000)return {...base,reasons:['No current holder observation within 30 seconds.']};
    if(!address(last.mint)||!['new','final','migrated'].includes(last.stage))return {...base,reasons:['A verified mint and lifecycle stage are needed for comparison.']};
    const current=holdingMap(last),candidates=recent.filter(x=>x.mint===last.mint&&x.stage===last.stage&&last.at-x.at>=30000&&last.at-x.at<=300000);
    const comparisons=candidates.map(x=>{const previous=holdingMap(x);return {snapshot:x,previous,matched:[...previous.keys()].filter(key=>current.has(key))};});
    const comparison=comparisons.find(x=>x.matched.length>=3)||comparisons.at(0);
    if(!comparison)return {...base,to:last.at,currentObservedCount:current.size,reasons:['Needs observations at least 30 seconds apart for the same mint and stage.']};
    const {snapshot:first,previous,matched}=comparison,previousPct=matched.reduce((n,key)=>n+previous.get(key),0),currentPct=matched.reduce((n,key)=>n+current.get(key),0);
    const common={...base,from:first.at,to:last.at,seconds:Math.round((last.at-first.at)/1000),matchedCount:matched.length,previousObservedCount:previous.size,currentObservedCount:current.size};
    if(matched.length<3)return {...common,reasons:['Fewer than 3 full wallet addresses appear in both observed samples.']};
    if(previousPct>100.01||currentPct>100.01)return {...common,reasons:['Observed holder percentages exceed total supply.']};
    const changes=matched.map(key=>current.get(key)-previous.get(key));
    return {...common,status:'available',reasons:[],previousPct,currentPct,changePp:currentPct-previousPct,
      increasedWallets:changes.filter(n=>n>1e-9).length,decreasedWallets:changes.filter(n=>n< -1e-9).length,unchangedWallets:changes.filter(n=>Math.abs(n)<=1e-9).length};
  }
  function holderContext(holders=[]){
    const observations=new Map(),conflicts=new Set(),symbols=new Set(['SOL','WSOL','USD','USDC','USDT']);
    const fields=['soldQuoteAmount','soldQuoteSymbol','soldTokenAmount','realizedPnlQuoteAmount','realizedPnlQuoteSymbol','holdingAgeSeconds'];
    for(const row of (Array.isArray(holders)?holders:[]).slice(0,100)){
      if(!row||!address(row.address)||row.isPool||['unresolved','program'].includes(row.accountType))continue;
      if(observations.has(row.address)){if(fields.some(key=>(observations.get(row.address)[key]??null)!==(row[key]??null)))conflicts.add(row.address);continue;}
      observations.set(row.address,row);
    }
    // Duplicated holder rows can be separate rendered tables; never count the same wallet twice.
    const rows=[...observations.entries()].filter(([key])=>!conflicts.has(key)).map(([,row])=>row);
    const readableSale=row=>(finite(row.soldQuoteAmount)&&row.soldQuoteAmount>=0&&symbols.has(row.soldQuoteSymbol))||(finite(row.soldTokenAmount)&&row.soldTokenAmount>=0);
    const positiveSale=row=>(finite(row.soldQuoteAmount)&&row.soldQuoteAmount>0&&symbols.has(row.soldQuoteSymbol))||(finite(row.soldTokenAmount)&&row.soldTokenAmount>0);
    const sales=rows.filter(readableSale);
    const pnl=rows.filter(row=>finite(row.realizedPnlQuoteAmount)&&symbols.has(row.realizedPnlQuoteSymbol));
    const durations=rows.map(row=>row.holdingAgeSeconds).filter(n=>finite(n)&&n>=0).sort((a,b)=>a-b),middle=Math.floor(durations.length/2);
    return {sampleCount:rows.length,saleKnownCount:sales.length,rowsWithSales:sales.filter(positiveSale).length,
      durationKnownCount:durations.length,medianHoldingSeconds:durations.length?(durations.length%2?durations[middle]:(durations[middle-1]+durations[middle])/2):null,
      pnlKnownCount:pnl.length,positivePnlCount:pnl.filter(row=>row.realizedPnlQuoteAmount>0).length,negativePnlCount:pnl.filter(row=>row.realizedPnlQuoteAmount<0).length,sampleOnly:true};
  }
  function trend(history=[],now=Date.now()){
    const recent=history.filter(x=>now-x.at<=600000&&x.at<=now).sort((a,b)=>a.at-b.at),last=recent.at(-1);
    if(!last||now-last.at>=30000)return {};
    const sameScope=x=>x.pool===last.pool&&(!x.mint&&!last.mint||x.mint===last.mint)&&(!x.stage&&!last.stage||x.stage===last.stage);
    const first=recent.find(x=>last.at-x.at>=30000&&last.at-x.at<=300000&&sameScope(x));
    if(!first)return {};
    const out={seconds:Math.round((last.at-first.at)/1000),from:first.at,to:last.at};
    for(const [key,name] of [['liquidityUsd','liquidityChangePct'],['holderCount','holderChangePct'],['marketCapUsd','marketCapChangePct']])if(finite(first[key])&&first[key]>0&&finite(last[key])&&last[key]>=0)out[name]=(last[key]/first[key]-1)*100;
    return out;
  }
  globalThis.RugLensActivity={summarize,trend,cohort,holderContext};
})();
