/* Local, deterministic heuristics. Scores are NOT probabilities of a rug. */
(() => {
  const numeric = v => typeof v === 'number' && Number.isFinite(v);
  const pct = v => numeric(v) && v >= 0 && v <= 100;
  const RULES = [
    ['closureFunding','Linked wrapped-SOL funding pattern','coordination',18,'At least 3 sampled holders and 10% combined supply receive net SOL in transactions closing native-token accounts to them, with a shared fee payer and signing close authorities. May be a distribution service; not proof of ownership. Partial history cannot clear this check.'],
    ['jointSigners','Jointly signed token acquisitions','coordination',20,'At least 3 sampled holders sign the same successful transaction and increase this token balance; at least 10% combined current sampled supply. Establishes joint authorization, not a rug or exact Jito membership.'],

    ['permanentDelegate','Tokens can be seized or burned','contract',30,'Active Token-2022 permanent delegate; token owners cannot revoke this authority.'],
    ['transferHook','Custom transfer restrictions','contract',12,'An active transfer-hook program can impose custom transfer rules. Its presence is not proof of a honeypot.'],
    ['nonTransferable','Transfers disabled','contract',30,'Token-2022 non-transferable mint; incompatible with ordinary freely transferable trading.'],
    ['defaultFrozen','New accounts frozen by default','contract',25,'New token accounts start frozen; permission may be required to transfer.'],
    ['pausable','Transfers can be paused','contract',18,'An active pause authority can interrupt trading.'],
    ['paused','Transfers currently paused','contract',30,'Provider reports the token pause state is active.'],
    ['transferFee','Transfer fee exposure','contract',20,'Current transfer fee above 3% / 10% / 25%; maximum fee caps and trade size affect the actual charge.'],
    ['feeMutable','Transfer fee can change','contract',8,'Transfer-fee authority remains active.'],
    ['liquidityDepth','Liquidity relative to valuation','liquidity',12,'Current selected-pool liquidity / market cap below 5% / 2% / 1%; exit-depth context, not executable slippage.'],
    ['sellPressure','Recent sell pressure','behaviour',12,'At least 20 trades in 5 minutes; sell-count share above 65% / 80% / 90%. Counts are not USD flow.'],
    ['priceCrash','Rapid price drawdown','behaviour',15,'Five-minute price change below -30% / -60% / -85%. A crash alone does not establish a rug.'],
    ['liquidityDrop','Observed liquidity loss','liquidity',25,'Same-pool observations 30–300 seconds apart: loss above 30% / 60% / 85%. Price moves and pool migration can also reduce USD liquidity.'],
    ['holderDrop','Observed holder loss','distribution',10,'Holder count falls more than 20% / 40% / 70% across comparable recent observations.'],
    ['sampleSelling','Visible trade sell flow','behaviour',12,'At least 10 priced trades and $100 in the recent visible sample; sell USD share above 70% / 85% / 95%. Filtered sample only.'],
    ['taggedSelling','Developer / insider / bundler selling','coordination',20,'At least $50 of labeled sales and 20% / 40% / 60% of visible USD turnover. Provider labels are not independently established identities.'],
    ['tradeSync','Synchronized equal-size buys','coordination',10,'At least 4 distinct displayed makers buy within one displayed second, with USD size within 2%. Not verified Jito bundle membership.'],
    ['traderConcentration','Single-wallet volume concentration','behaviour',8,'At least 20 sampled trades with full maker addresses on 80% of rows; a wallet contributes over 50% of USD volume.'],
    ['tradeLoops','Repeated wallet buy/sell loops','behaviour',8,'At least 20 sampled trades and 80% full maker addresses; 3 wallets each make 2+ buys and 2+ sells. Churn, not proof of wash trading.'],
    ['sharedSupply','Supply linked by common funder','coordination',20,'At least 3 sampled holders share a full non-service funder address and hold >10% / 20% / 35% of supply together.'],
    ['freshSupply','Fresh-wallet supply','coordination',12,'Reported fresh-wallet holdings above 10% / 20% / 35%. Fresh wallets alone do not prove coordination.'],
    ['largest','Largest non-pool holder','distribution',18,'Holder concentration above 4%; 5% and 10% increase concern.'],
    ['top10','Top 10 concentration','distribution',15,'Above 25% / 40% / 60% of supply.'],
    ['equalHoldings','Repeated holding sizes','coordination',10,'At least 4 of 8+ sampled holders within 0.05 percentage points; rounded display values are only a weak signal.'],
    ['similarBalances','Similar SOL balances','coordination',8,'At least 5 of 8+ holders with balances within 0.02 SOL or 2%; excludes near-zero balances.'],
    ['lowBalances','Near-empty holder wallets','coordination',10,'At least half of 8+ sampled wallets below 0.05 SOL.'],
    ['sharedFunding','Shared funding source','coordination',12,'3+ holders funded by the same full address; known exchanges/bridges excluded.'],
    ['fundingTime','Matching funding times','coordination',8,'3+ matching funding source and displayed time; recent times only.'],
    ['freshWallets','Fresh holder wallets','coordination',12,'At least 4 of 8+ sampled wallets carry Terminal’s fresh-wallet label.'],
    ['samePlatform','Trading-app concentration','coordination',4,'At least 80% of 8+ sampled wallets share a known app. Weak corroboration only.'],
    ['entryConcentration','Similar early entries','coordination',10,'At least 5 of 8+ wallets entered within 15% of one another below 25% of current market cap.'],
    ['zeroBuys','Holders with no recorded buys','coordination',12,'At least 5% of supply in sampled wallets with zero recorded buys; transfers are not proof of common ownership.'],
    ['insiders','Insider holdings','coordination',18,'Reported insider holdings above 10% / 20% / 35%.'],
    ['bundles','Bundle holdings','coordination',20,'Reported CURRENT bundle holdings above 10% / 20% / 35%. New Pairs reduces the 10–20% tier from 8 to 4 points unless linked funding or labeled selling is observed; >20% and the >=30% severe floor remain. Counts/initial participation are not current holdings.'],
    ['snipers','Sniper holdings','coordination',12,'Supply held by snipers above 10% / 20% / 35%; wallet count is not a percentage.'],
    ['clusters','Connected-wallet clusters','coordination',18,'Manual review of cluster supply, hidden nodes and historical maps. Connections alone do not establish ownership.'],
    ['mint','Mint authority','contract',25,'An active authority can issue additional supply.'],
    ['freeze','Freeze authority','contract',25,'An active authority can freeze token accounts.'],
    ['metadata','Mutable metadata','contract',4,'Names and links can change. Low-weight context.'],
    ['liquidity','Liquidity / curve capacity','liquidity',15,'DEX pools: below $5,000 / $10,000 / $20,000. Verified active Pump curves: New Pairs compares real reserves with the largest observed current holder/cohort exposure (no sum of overlapping labels); Final/unspecified launch phase uses hypothetical 1% / 5% / 10% total-supply stress scenarios. Before fees; neither circulating-supply measurement nor executable quote.'],
    ['lpLock','Liquidity lock / burn','liquidity',20,'Check pool model, locked share, controlling account and expiry. Unsupported pools remain unknown.'],
    ['devHolding','Developer holdings','distribution',12,'Developer holds above 4% / 10% / 20%. A zero balance does not clear side wallets.'],
    ['devHistory','Developer history','reputation',20,'Manual review of prior rugs, repeated projects, funding and liquidity patterns.'],
    ['walletHistory','Overlapping wallet history','coordination',15,'Manual comparison of the last 3–4 traded tokens across top holders; copy trading can look similar.'],
    ['earlyTrades','First 100 transactions','behaviour',15,'Manual review of same-second entries, repeated amounts/timing, sniping and developer pre-buys.'],
    ['chart','Chart and developer activity','behaviour',12,'Manual review of launch spike, smooth ramps, developer buy/sell loops and mirrored trades.'],
    ['social','Social authenticity','reputation',6,'Manual review of impersonation, recycled narrative and forced promotion.'],
    ['tracked','Tracked-wallet context','reputation',3,'Manual review; absence depends on your watchlist and is weak evidence. Presence is not a safety guarantee.'],
    ['fees','Volume versus fees','behaviour',6,'Manual, pool-specific comparison using matching currency and time window. No universal fee ratio.'],
    ['turnover','Volume versus liquidity','behaviour',6,'24h volume / current liquidity above 100× / 160× is context only, not proof of wash trading.']
  ].map(([id,label,group,max,method])=>({id,label,group,max,method}));
  const manualIds = ['clusters','lpLock','devHistory','walletHistory','earlyTrades','chart','social','tracked','fees'];
  const CAPS = {distribution:25,coordination:40,contract:35,liquidity:25,behaviour:20,reputation:20};
  const tier = (v, limits, max) => v > limits[2] ? max : v > limits[1] ? Math.round(max*.7) : v > limits[0] ? Math.round(max*.4) : 0;
  const fmt = n => Number(n.toFixed(2)).toLocaleString('en-US');
  function largestGroup(values, close) {
    return values.reduce((best,v)=>Math.max(best,values.filter(w=>close(v,w)).length),0);
  }
  const stageProfiles={
    new:{label:'New Pairs',focus:'Current launch exposure · real curve reserves · token controls'},
    final:{label:'Final Stretch',focus:'Retained coordinated supply · selling · migration readiness'},
    migrated:{label:'Migrated',focus:'Remaining coordinated supply · current pool · selling'},
    launch:{label:'Active curve',focus:'Curve confirmed; New / Final Stretch phase unavailable'},
    transition:{label:'Migration pending',focus:'Curve completed; destination-pool evidence still needed'},
    unknown:{label:'Stage unavailable',focus:'Standard weights until lifecycle evidence is available'}
  };
  function lifecycle(input,curve){
    const now=Date.now(),fresh=(at,ms)=>numeric(at)&&now-at>=0&&now-at<ms;
    const stageValid=typeof input.mint==='string'&&!!input.mint&&['new','final','migrated'].includes(input.stage)&&input.stageMint===input.mint&&fresh(input.stageAt,120000);
    let id=stageValid?input.stage:'unknown',source=stageValid?input.stageSource||'Terminal lifecycle label':'Unavailable',at=stageValid?input.stageAt:null,venue='unknown',conflict=false;
    const notes=[];
    const completed=input.launchCurve?.status==='verified'&&input.launchCurve.program==='pump'&&input.launchCurve.mint===input.mint&&input.launchCurve.complete===true&&fresh(input.launchCurve.at,30000);
    const pool=input.marketMint===input.mint&&fresh(input.marketAt,30000)&&typeof input.pairAddress==='string'&&['pumpswap','pump_swap','raydium','meteora','orca'].includes(input.pairDex)&&numeric(input.marketLiquidityUsd)&&input.marketLiquidityUsd>=0;
    const explicitPool=pool&&input.selectedMarket===input.pairAddress&&input.selectedMarket!==input.mint&&input.selectedMarket!==input.launchCurve?.address;
    if(curve&&explicitPool){
      venue='pool';if(id!=='migrated')id='unknown';source='Selected indexed AMM pool';at=input.marketAt;
      notes.push('This selected AMM is assessed separately from the active launch curve; migration is not inferred.');
    }else if(curve){
      venue='curve';
      if(id==='migrated'){id='unknown';conflict=true;notes.push('Terminal says Migrated but the verified Pump curve is still active; refresh lifecycle evidence.');}
      else if(id==='unknown'){id='launch';source='Solana verified active Pump curve';at=input.launchCurve.at;}
    }else if(completed){
      venue=pool?'pool':'transition';
      if(!pool){id='transition';source='Solana verified completed Pump curve';at=input.launchCurve.at;}
      else if(id!=='migrated'){id='unknown';source='Completed curve + indexed AMM; Terminal stage not confirmed';at=input.marketAt;notes.push('An AMM is indexed after curve completion; launch discounts are disabled.');}
    }else if(['new','final'].includes(id)){
      venue='curve';
      if(pool){id='unknown';venue='pool';source='Indexed AMM conflicts with cached launch stage';at=input.marketAt;notes.push('Refresh the launch stage; an indexed AMM now exists. No launch discount is applied.');}
    }else if(id==='migrated'||pool)venue='pool';
    return {id,...stageProfiles[id],source,at,venue,indexedPool:pool,conflict,notes,adjustments:[]};
  }
  function curveCapacity(curve,mint,exposureShare) {
    if(!curve||curve.status!=='verified'||curve.mint!==mint||curve.program!=='pump'||curve.complete!==false||!Number.isFinite(curve.at)||Date.now()-curve.at<0||Date.now()-curve.at>=30000)return null;
    const keys=['virtualTokenReservesRaw','virtualQuoteReservesRaw','realTokenReservesRaw','realQuoteReservesRaw','tokenSupplyRaw'];
    if(keys.some(k=>typeof curve[k]!=='string'||!/^\d{1,20}$/.test(curve[k])||BigInt(curve[k])>18446744073709551615n))return null;
    const [virtualToken,virtualQuote,realToken,realQuote,supply]=keys.map(k=>BigInt(curve[k]));
    if(!virtualToken||!virtualQuote||!supply||realToken>virtualToken||realToken>supply||realQuote>virtualQuote)return null;
    // Compare raw units within the same quote asset. Non-SOL quotes are never
    // priced as SOL, and virtual reserves are never called withdrawable liquidity.
    const scenarios=[1,5,10].map(share=>{const amount=supply*BigInt(share)/100n;const output=virtualQuote*amount/(virtualToken+amount);return {share,covered:amount>0n&&output>0n&&realQuote>=output};});
    const covered=scenarios.filter(s=>s.covered).at(-1)?.share||0;
    let exposureCovered=null;
    if(pct(exposureShare)&&exposureShare>0){const amount=supply*BigInt(Math.round(exposureShare*1000000))/100000000n;const output=virtualQuote*amount/(virtualToken+amount);exposureCovered=amount>0n&&output>0n&&realQuote>=output;}
    return {points:covered>=10?0:covered>=5?5:covered>=1?10:15,covered,exposureShare,exposureCovered,hasRealQuote:realQuote>0n,trustedQuote:curve.quoteIsNativeSol===true,source:curve.source||'Solana confirmed Pump curve account'};
  }
  function evaluate(input = {}) {
    const m=input.metrics || {}, sources=input.sources || {}, results=new Map();
    // Use the largest observed position/cohort, never sum overlapping labels or
    // infer circulating supply by subtracting curve sale inventory from supply.
    const exposureShare=Math.max(0,...(input.holders||[]).filter(h=>h&&!h.isPool&&h.accountType!=='unresolved'&&pct(h.pct)).map(h=>h.pct),...[m.bundlePct,m.insiderPct,m.devPct].filter(pct));
    const activeCurve=curveCapacity(input.launchCurve,input.mint,exposureShare),stage=lifecycle(input,activeCurve),curve=stage.venue==='curve'?activeCurve:null,poolChecks=!['curve','transition'].includes(stage.venue);
    // A page's curve USD figure cannot impersonate liquidity of an indexed AMM.
    const poolLiquidity=stage.venue==='pool'?(stage.indexedPool?input.marketLiquidityUsd:undefined):m.liquidityUsd;
    const put=(id,points,detail,source)=>results.set(id,{...RULES.find(r=>r.id===id),status:points?'flag':'clear',points,detail,source:source||sources[id]||'Terminal page'});
    const scalar=(id,key,limits)=>{ if(pct(m[key]))put(id,tier(m[key],limits,RULES.find(r=>r.id===id).max),`${fmt(m[key])}% of supply`); };
    scalar('freshSupply','freshHoldingPct',[10,20,35]);scalar('top10','top10Pct',[25,40,60]);scalar('insiders','insiderPct',[10,20,35]);
    scalar('bundles','bundlePct',[10,20,35]);scalar('snipers','sniperPct',[10,20,35]);scalar('devHolding','devPct',[4,10,20]);
    for(const [id,key] of [['mint','mintActive'],['freeze','freezeActive'],['metadata','metadataMutable'],['permanentDelegate','permanentDelegate'],['transferHook','transferHook'],['nonTransferable','nonTransferable'],['defaultFrozen','defaultFrozen'],['pausable','pausable'],['paused','paused'],['feeMutable','feeMutable']]) {
      if(typeof m[key]==='boolean')put(id,m[key]?RULES.find(r=>r.id===id).max:0,m[key]?'Enabled / changeable':'Disabled / immutable');
    }
    if(pct(m.transferFeePct))put('transferFee',tier(m.transferFeePct,[3,10,25],20),`${fmt(m.transferFeePct)}% transfer fee; caps may apply`,sources.transferFee||'RugCheck report');
    if(poolChecks&&numeric(poolLiquidity)&&poolLiquidity>=0&&numeric(m.marketCapUsd)&&m.marketCapUsd>0){const ratio=poolLiquidity/m.marketCapUsd*100;put('liquidityDepth',ratio<1?12:ratio<2?8:ratio<5?4:0,`${fmt(ratio)}% liquidity / market cap`);}
    if(numeric(m.buys5m)&&numeric(m.sells5m)&&m.buys5m+m.sells5m>=20){const ratio=m.sells5m/(m.buys5m+m.sells5m)*100;put('sellPressure',tier(ratio,[65,80,90],12),`${m.buys5m} buys / ${m.sells5m} sells in 5m (${fmt(ratio)}% sell count)`);}
    if(numeric(m.priceChange5m))put('priceCrash',tier(-m.priceChange5m,[30,60,85],15),`${fmt(m.priceChange5m)}% in 5 minutes`);
    const trend=input.trend||{};
    if(poolChecks&&numeric(trend.liquidityChangePct))put('liquidityDrop',tier(-trend.liquidityChangePct,[30,60,85],25),`${fmt(trend.liquidityChangePct)}% observed pool liquidity over ${trend.seconds}s; verify migration/price effects`,'Local observation history');
    if(numeric(trend.holderChangePct))put('holderDrop',tier(-trend.holderChangePct,[20,40,70],10),`${fmt(trend.holderChangePct)}% holders over ${trend.seconds}s`,'Local observation history');
    const chain=input.chain||{};
    const closure=(chain.closureGroups||[]).find(g=>g.wallets.length>=3&&g.supply>=10);
    const joint=(chain.jointBuys||[]).find(g=>g.wallets.length>=3&&g.supply>=10);
    if(closure)put('closureFunding',18,`${closure.wallets.length} holders / ${fmt(closure.supply)}% supply linked by wrapped-SOL closure transactions and a common fee payer${closure.creatorLinked?' matching the reported creator':''}. Service use remains possible.`,'Solana confirmed transactions; bounded sample');
    if(joint)put('jointSigners',20,`${joint.wallets.length} holders / ${fmt(joint.supply)}% current sampled supply jointly signed a token acquisition`,'Solana confirmed transaction signers / token deltas');
    const activity=input.activity||{};
    if(activity.count>=10&&activity.pricedCount>=10&&activity.volumeUsd>=100){
      put('sampleSelling',tier(activity.sellPct,[70,85,95],12),`${fmt(activity.sellPct)}% sell USD from ${activity.count} sampled trades / ${activity.spanSeconds}s`,'Terminal visible trades, last 5m');
      const ratio=activity.taggedSellUsd/activity.volumeUsd*100;
      put('taggedSelling',activity.taggedSellUsd>=50?tier(ratio,[20,40,60],20):0,`$${fmt(activity.taggedSellUsd)} labeled sales (${fmt(ratio)}% of sampled turnover)`,'Terminal visible maker labels');
      put('tradeSync',activity.synchronized>=4?10:0,`${activity.synchronized} displayed makers with same-second, similar-size buys; sample only`,'Terminal displayed times / amounts');
    }
    if(activity.count>=20&&activity.walletCoverage>=.8){
      put('traderConcentration',activity.largestTraderPct>50?8:0,`${fmt(activity.largestTraderPct||0)}% of sampled USD from one full maker address`,'Terminal full maker addresses');
      put('tradeLoops',activity.roundTripWallets>=3?8:0,`${activity.roundTripWallets} wallets repeatedly bought and sold in the sample`,'Terminal full maker addresses');
    }
    if(curve){
      const newPair=stage.id==='new',points=newPair?(!curve.hasRealQuote||curve.exposureCovered===false?15:0):curve.points;
      const detail=newPair?`${curve.hasRealQuote?'Real quote reserves present':'No real quote reserve'}. ${curve.exposureShare?`Reserves ${curve.exposureCovered?'cover':'do not cover'} a modeled ${fmt(curve.exposureShare)}%-of-supply sale, the largest reported current holder/cohort exposure (overlapping labels are not added).`:'No current holder-size scenario is available.'} Before fees; cohort selling is a stress scenario, not observed coordinated selling.`:`${curve.covered?`Real curve reserves cover a hypothetical sale of at least ${curve.covered}% of total supply`:'Real curve reserves do not cover the hypothetical 1%-of-total-supply sale'}. Scenarios: 1%, 5%, 10%; not measured circulating supply, before fees, not a live sell quote.`;
      put('liquidity',points,detail,curve.source);
      results.get('liquidity').label='Launch curve sell capacity';
    }else if(poolChecks&&numeric(poolLiquidity)&&poolLiquidity>=0)put('liquidity',poolLiquidity<5000?15:poolLiquidity<10000?10:poolLiquidity<20000?5:0,`$${fmt(poolLiquidity)} reported liquidity`,stage.indexedPool?'DEX Screener selected AMM pool':undefined);
    if(poolChecks&&numeric(m.volume24hUsd)&&poolLiquidity>0){const ratio=m.volume24hUsd/poolLiquidity;put('turnover',ratio>160?6:ratio>100?3:0,`${fmt(ratio)}× 24h volume / current liquidity; turnover is not proof of manipulation`,sources.turnover);}
    if(poolChecks&&typeof m.lpLockedPct==='number'&&pct(m.lpLockedPct))put('lpLock',m.lpLockedPct<50?20:m.lpLockedPct<95?10:0,`${fmt(m.lpLockedPct)}% locked/burned according to provider; verify expiry`,sources.lpLock);
    // An unidentified program-owned account may be a pool, not a whale. Keep the
    // verification gap visible, but do not turn it into a wallet accusation.
    const unresolvedHolders=(input.holders||[]).filter(h=>h&&!h.isPool&&pct(h.pct)&&h.accountType==='unresolved');
    const holders=(input.holders||[]).filter(h=>h && !h.isPool && pct(h.pct) && h.accountType!=='unresolved');
    const unique=[...new Map(holders.map((h,i)=>[h.address||`unknown-${i}`,h])).values()].sort((a,b)=>b.pct-a.pct).slice(0,10);
    const sample=unique.length;
    const holderSource=input.holderSource||'Terminal visible holder rows';
    if(sample) {
      const biggest=unique[0].pct;
      // A partial sample can reveal concentration, but cannot clear the largest-holder check.
      if(input.holdersTopComplete||biggest>4)put('largest',tier(biggest,[4,5,10],18),`${fmt(biggest)}% largest observed non-pool holder${input.holdersTopComplete?'':' (partial sample)'}`,holderSource);
      const zeroBuys=unique.filter(h=>h.bought===0).reduce((s,h)=>s+h.pct,0);
      if(zeroBuys>=5 || unique.filter(h=>numeric(h.bought)).length>=8)put('zeroBuys',zeroBuys>=10?12:zeroBuys>=5?7:0,`${fmt(zeroBuys)}% of sampled supply has no recorded buys`,holderSource);
    }
    const fundingGroups=new Map();
    for(const h of unique)if(h.funder&&!h.funderIsService){const group=fundingGroups.get(h.funder)||[];group.push(h);fundingGroups.set(h.funder,group);}
    const sharedSupply=Math.max(0,...[...fundingGroups.values()].filter(g=>g.length>=3).map(g=>g.reduce((n,h)=>n+h.pct,0)));
    if(sharedSupply>10||unique.filter(h=>h.funder).length>=8)put('sharedSupply',tier(sharedSupply,[10,20,35],20),`${fmt(sharedSupply)}% supply linked through a shared non-service funder; ownership unproven`,holderSource);
    if(sample>=8) {
      const eq=largestGroup(unique.filter(h=>h.pct>=.5).map(h=>h.pct),(a,b)=>Math.abs(a-b)<=.05);
      put('equalHoldings',eq>=4?10:0,`${eq} of ${sample} observed wallets have similar displayed holding sizes`,holderSource);
      const balances=unique.map(h=>h.sol).filter(numeric);
      if(balances.length>=8){
        const low=balances.filter(v=>v<.05).length;
        put('lowBalances',low>=balances.length*.5?10:0,`${low}/${balances.length} sampled wallets below 0.05 SOL`,holderSource);
        const same=largestGroup(balances.filter(v=>v>=.05),(a,b)=>Math.abs(a-b)<=Math.max(.02,Math.min(a,b)*.02));
        put('similarBalances',same>=5?8:0,`${same}/${balances.length} similar nonzero balances`,holderSource);
      }
      const fresh=unique.filter(h=>typeof h.fresh==='boolean');
      if(fresh.length>=8)put('freshWallets',fresh.filter(h=>h.fresh).length>=4?12:0,`${fresh.filter(h=>h.fresh).length}/${fresh.length} carry a fresh-wallet marker`,holderSource);
      const platforms=unique.map(h=>h.platform).filter(Boolean);
      if(platforms.length>=8){const same=largestGroup(platforms,(a,b)=>a===b);put('samePlatform',same>=platforms.length*.8?4:0,`${same}/${platforms.length} known apps match; weak signal`,holderSource);}
      const funders=unique.filter(h=>h.funder&&!h.funderIsService);
      if(unique.filter(h=>h.funder).length>=8){
        const same=largestGroup(funders.map(h=>h.funder),(a,b)=>a===b);
        put('sharedFunding',same>=3?12:0,`${same} wallets share a non-service funding source`,holderSource);
      }
      const times=funders.filter(h=>h.fundingAgeSeconds!=null&&h.fundingAgeSeconds<86400&&h.fundingTimeLabel);
      const grouped=largestGroup(times.map(h=>h.funder+'|'+h.fundingTimeLabel),(a,b)=>a===b);
      if(grouped>=3||unique.filter(h=>h.fundingTimeLabel).length>=8)put('fundingTime',grouped>=3?8:0,`${grouped} wallets share a source and rounded recent funding time; not a block-level proof`,holderSource);
      const entries=unique.map(h=>h.entryMc).filter(v=>numeric(v)&&v>0);
      if(entries.length>=8&&numeric(m.marketCapUsd)&&m.marketCapUsd>0){const same=largestGroup(entries.filter(v=>v<m.marketCapUsd*.25),(a,b)=>Math.abs(a-b)<=Math.min(a,b)*.15);put('entryConcentration',same>=5?10:0,`${same}/${entries.length} similar entries below 25% of current market cap`,holderSource);}
    }
    const providerWarnings=(input.providerWarnings||[]).filter(w=>w&&typeof w.name==='string'&&w.name.trim());
    const scopedWarnings=providerWarnings.filter(w=>w.scoringEligible!==false&&!w.contextOnly);
    const creatorHistory=scopedWarnings.find(w=>/creator.*rug|rug.*creator/i.test(w.name));
    if(creatorHistory)put('devHistory',20,`Provider reports ${creatorHistory.name.toLowerCase()}. This is creator reputation evidence, not proof this token has rugged.`,'RugCheck report');
    for(const id of manualIds){
      const v=input.manual?.[id];
      if(id==='lpLock'&&!poolChecks)continue;
      if(id==='devHistory'&&creatorHistory&&v?.status==='clear')continue;
      if(v && Date.now()-v.at<300000 && ['flag','clear'].includes(v.status))put(id,v.status==='flag'?RULES.find(r=>r.id===id).max:0,'Your manual assessment (expires after 5 minutes)','Manual review');
    }
    // Stage weights are explicit screening policy, not measured prevalence or
    // calibrated odds. Actual selling, private funding links and severe current
    // concentration are never discounted just because this is a new launch.
    const adjust=(id,factor)=>{const c=results.get(id);if(!c?.points||c.source==='Manual review')return;const before=c.points;c.points=Math.max(1,Math.round(before*factor));if(c.points!==before){c.detail+=` ${stage.label} weight: ${before} → ${c.points} points; launch-pattern context.`;stage.adjustments.push({id,from:before,to:c.points});}};
    if(stage.id==='new'){
      if(pct(m.bundlePct)&&m.bundlePct>10&&m.bundlePct<=20&&!['taggedSelling','sharedSupply','closureFunding','jointSigners'].some(id=>results.get(id)?.points))adjust('bundles',.5);
      if(pct(m.sniperPct)&&m.sniperPct<=20)adjust('snipers',.35);
      if(pct(m.freshHoldingPct)&&m.freshHoldingPct<=20)adjust('freshSupply',.35);
      for(const id of ['freshWallets','tradeSync','equalHoldings','entryConcentration'])adjust(id,.35);
    }else if(stage.id==='final'){
      if(pct(m.sniperPct)&&m.sniperPct<=20)adjust('snipers',.7);
      if(pct(m.freshHoldingPct)&&m.freshHoldingPct<=20)adjust('freshSupply',.7);
      for(const id of ['freshWallets','tradeSync','equalHoldings','entryConcentration'])adjust(id,.7);
    }
    const inapplicable=new Set(!poolChecks?['liquidityDepth','liquidityDrop','turnover','lpLock']:[]);
    const checks=RULES.map(r=>results.get(r.id)||{...r,status:inapplicable.has(r.id)?'not-applicable':'unknown',points:0,detail:inapplicable.has(r.id)?'Conventional pool check is not applied during an active curve or migration transition. Reassess the destination pool after migration.':manualIds.includes(r.id)?'Needs review or a supported data source':'Not available in the current data',source:inapplicable.has(r.id)?stage.label:'Unavailable'});
    const groups={};for(const c of checks)groups[c.group]=(groups[c.group]||0)+c.points;
    let score=Math.min(100,Object.entries(groups).reduce((n,[g,v])=>n+Math.min(v,CAPS[g]),0));
    // Independent severe evidence sets a risk floor, even with sparse coverage.
    const hardFlags=[];
    const hard=(condition,message,floor=50)=>{if(condition){hardFlags.push(message);score=Math.max(score,floor);}};
    hard(m.mintActive===true,'Active mint authority',70);
    hard(m.freezeActive===true,'Active freeze authority',75);
    hard(m.permanentDelegate===true,'Active permanent delegate',75);
    hard(m.nonTransferable===true||m.paused===true,'Token transfers restricted',80);
    hard(m.defaultFrozen===true,'New token accounts start frozen',65);
    hard(pct(m.transferFeePct)&&m.transferFeePct>=25,'Extreme transfer fee',65);
    hard(pct(m.bundlePct)&&m.bundlePct>=30,'At least 30% of supply held by reported bundles');
    hard(pct(m.insiderPct)&&m.insiderPct>=30,'At least 30% insider holdings');
    hard(pct(m.devPct)&&m.devPct>=20,'Developer holds at least 20% of supply');
    hard(pct(m.top10Pct)&&m.top10Pct>=70,'Top ten control at least 70% of supply');
    hard(unique[0]?.pct>=20,'One non-pool wallet holds at least 20%');
    hard(closure?.creatorLinked&&closure.supply>=25,'Creator-paid wrapped-SOL funding pattern links at least 25% supply');
    hard(joint?.supply>=25,'Jointly signing holders own at least 25% sampled supply');
    hard(sharedSupply>=25,'At least 25% supply shares a private funder');
    hard(poolChecks&&numeric(trend.liquidityChangePct)&&trend.liquidityChangePct<=-80,'At least 80% observed liquidity loss',70);
    hard(numeric(m.priceChange5m)&&numeric(m.sells5m)&&numeric(m.buys5m)&&m.priceChange5m<=-60&&m.sells5m>=20&&m.sells5m>m.buys5m*3,'Sharp drawdown with heavy selling',60);
    // Provider severity is a warning to investigate, not an independent fact or
    // automatic red verdict. Unscoped side-pool findings never set the decision.
    const providerDanger=scopedWarnings.filter(w=>w.level==='danger');
    if(input.rugged===true)score=100;
    const applicable=checks.filter(c=>c.status!=='not-applicable');
    const known=applicable.filter(c=>c.status!=='unknown').length;
    const coverage=Math.round(known/applicable.length*100);
    // Manual reviews must not make automatic coverage mathematically unattainable.
    const automatic=applicable.filter(c=>!manualIds.includes(c.id));
    const autoKnown=automatic.filter(c=>c.status!=='unknown').length;
    const autoTotal=automatic.length,autoCoverage=Math.round(autoKnown/autoTotal*100);
    const manualKnown=checks.filter(c=>manualIds.includes(c.id)&&c.source==='Manual review').length;
    const coreIds=['largest','mint','freeze','permanentDelegate','nonTransferable','defaultFrozen','transferHook','transferFee','pausable','liquidity','bundles','insiders'];
    const missingCore=coreIds.filter(id=>!results.has(id));
    const contractIds=['mint','freeze','permanentDelegate','nonTransferable','defaultFrozen','transferHook','transferFee','pausable'];
    const distributionBound=pct(m.top10Pct)&&m.top10Pct<=4;
    // A sufficiently broad observed sample plus a reported top-ten aggregate can
    // support "no major observed flags" without pretending the largest-holder
    // rule, or hidden-wallet/coordination checks, have been fully cleared.
    const distributionSample=sample>=8&&pct(m.top10Pct)&&m.top10Pct<=25&&!unresolvedHolders.length;
    const distributionAvailable=!unresolvedHolders.length&&(results.has('largest')||distributionBound||distributionSample);
    const missingBaseline=contractIds.filter(id=>!results.has(id));
    if(!results.has('liquidity'))missingBaseline.push('liquidity');
    if(curve&&!curve.trustedQuote)missingBaseline.push('quoteAsset');
    if(curve&&stage.id==='new'&&!curve.exposureShare)missingBaseline.push('exitSize');
    if(!distributionAvailable)missingBaseline.push('largest');
    const sourceConflicts=stage.conflict||(Array.isArray(input.sourceConflicts)?input.sourceConflicts.length>0:!!input.sourceConflicts);
    const baselineComplete=missingBaseline.length===0&&!input.staleEvidence&&!sourceConflicts;
    const adequate=missingCore.length===0&&baselineComplete&&!unresolvedHolders.length;
    const reasons=checks.filter(c=>c.points).sort((a,b)=>b.points-a.points);
    // Correlated ownership indicators are one family. Rounded amounts, app
    // preferences and fresh-wallet labels cannot manufacture corroboration.
    const weakIds=new Set(['equalHoldings','similarBalances','lowBalances','fundingTime','freshWallets','samePlatform','entryConcentration','zeroBuys','freshSupply','tradeSync','traderConcentration','tradeLoops','metadata','turnover','social','tracked']);
    const families={};
    for(const c of reasons)if(!weakIds.has(c.id)){
      const family={distribution:'ownership',coordination:'ownership',liquidity:'market',behaviour:'market'}[c.group]||c.group;
      families[family]=(families[family]||0)+c.points;
    }
    const materialFamilies=Object.entries(families).filter(([,points])=>points>=12).map(([family])=>family);
    const corroborated=score>=40&&materialFamilies.length>=2;
    const avoid=hardFlags.length>0||corroborated;
    let level=input.rugged===true?'rugged':avoid?(score>=70?'critical':'high'):score>=8||providerDanger.length?'caution':baselineComplete?'lower':known?'limited':'unknown';
    const label={rugged:'Reported rug',critical:'Avoid',high:'Avoid',caution:'Caution',lower:'No major flags',limited:'Wait for data',unknown:'Wait for data'}[level];
    const summary=input.rugged===true?'RugCheck explicitly reports this token as rugged. Verify the linked report.':hardFlags[0]||
      (corroborated?`Material warnings across ${materialFamilies.join(' and ')}.`:null)||
      (creatorHistory?'Creator history warning; this finding does not establish a current-token rug.':null)||
      (providerDanger.length?`Provider warning: ${providerDanger[0].name}; supporting evidence needs review.`:null)||
      (reasons[0]&&score>=8?reasons[0].label:null)||
      (input.staleEvidence?'Previous evidence needs a refresh before a current decision.':sourceConflicts?'Sources disagree; refresh and inspect the conflicting evidence.':missingBaseline.includes('quoteAsset')?'Curve reserves use another token; its value and transfer controls are not verified.':baselineComplete?'No major flags in the observed contract, liquidity and holder data.':'Waiting for baseline contract, liquidity or holder evidence.');
    const coordinationIds=['bundles','insiders','sharedSupply','closureFunding','jointSigners'];
    const coordinationKnown=coordinationIds.filter(id=>results.has(id)).length;
    const gaps=[];
    if(!results.has('bundles')&&!results.has('insiders'))gaps.push('Bundle/insider exposure not measured');
    else if(!results.has('bundles'))gaps.push('Bundle exposure not measured');
    else if(!results.has('insiders'))gaps.push('Insider exposure not measured');
    if(!results.has('largest'))gaps.push(distributionBound?'Individual holders not sampled; reported top ten bound the largest holding at 4% or less':'Largest holder is not fully established from the available sample');
    if(curve)gaps.push('Launch curve assessed directly; executable sell quote and post-migration pool remain unchecked');
    if(missingBaseline.includes('quoteAsset'))gaps.unshift('Curve quote-token value and transfer controls are not verified');
    if(missingBaseline.includes('exitSize'))gaps.push('Current holder/cohort size is needed for a launch exit-capacity scenario');
    if(stage.id==='transition')gaps.unshift('Completed curve is not an active pool; destination-pool evidence is still needed');
    if(unresolvedHolders.length)gaps.push(`${unresolvedHolders.length} holder account${unresolvedHolders.length===1?'':'s'} could not be distinguished from a pool`);
    if(input.staleEvidence)gaps.push('Evidence needs a refresh');
    if(sourceConflicts)gaps.push('Sources disagree');
    const decision={action:level==='rugged'?'reported-rug':avoid?'avoid':level==='caution'?'caution':baselineComplete?'no-major-flags':'wait',label,reason:summary,baselineComplete,missingBaseline,coordinationKnown,coordinationTotal:coordinationIds.length,gaps,materialFamilies,corroborated};
    const context=[];
    if(numeric(m.watchers)&&m.holderCount>0)context.push({label:'Watchers / holders',value:`${fmt(m.watchers/m.holderCount)}×`,detail:`${m.watchers} live viewers / ${m.holderCount} holders. Attention only; bot viewers and dust holders can distort it.`});
    else context.push({label:'Watchers / holders',value:'Unavailable',detail:'Requires both live viewers and current holder count. Never inferred from social follower counts.'});
    if(numeric(m.buys5m)&&numeric(m.sells5m))context.push({label:'5m transactions',value:`${m.buys5m} buys · ${m.sells5m} sells`,detail:'DEX Screener selected pool; indexed counts, not unique traders.'});
    if(numeric(m.holderCount))context.push({label:'Holders',value:fmt(m.holderCount),detail:'Accounts/wallets reported by the source; dust and pools may be included.'});
    if(numeric(m.bondingCurvePct))context.push({label:'Bonding curve',value:`${fmt(m.bondingCurvePct)}%`,detail:'Curve liquidity is not a conventional LP lock. Verify graduation/migration separately.'});
    if(numeric(m.burnedLiquidityPct))context.push({label:'Reported burned liquidity',value:`${fmt(m.burnedLiquidityPct)}%`,detail:'Terminal display only; not independently verified and not treated as a passed lock check.'});

    return {score:known||input.rugged?score:null,level,label,summary,decision,lifecycle:stage,hardFlags,context,activity,trend,reasons,coverage,known,total:checks.length,autoKnown,autoTotal,autoCoverage,manualKnown,manualTotal:manualIds.length,missingCore,adequate,checks,sample,groups,rugged:input.rugged===true,at:Date.now()};
  }
  globalThis.RugLensEngine={evaluate,RULES,manualIds,numeric};
})();
