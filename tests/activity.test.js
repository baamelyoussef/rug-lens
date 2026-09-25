import test from 'node:test';import assert from 'node:assert/strict';import '../extension/activity.js';
const {summarize,trend}=RugLensActivity;
const now=Date.now();const trade=(i,more={})=>({signature:'sig'+i,side:'buy',usd:100,at:now-1000*i,makerLabel:'maker'+i,...more});
test('activity deduplicates signatures, expires old trades and does not infer full wallet identity',()=>{
 const r=summarize([trade(1),trade(1),trade(2,{at:now-301000}),trade(3,{side:'sell',bundler:true})],now);
 assert.equal(r.count,2);assert.equal(r.sellPct,50);assert.equal(r.taggedSellUsd,100);assert.equal(r.fullWalletCount,0);assert.equal(r.walletCoverage,0);
});
test('synchronized buys require distinct displayed makers and similar non-dust amounts',()=>{
 assert.equal(summarize(Array.from({length:4},(_,i)=>trade(i,{at:now-1000})),now).synchronized,4);
 assert.equal(summarize(Array.from({length:4},(_,i)=>trade(i,{at:now-1000,makerLabel:'same'})),now).synchronized,1);
 assert.equal(summarize(Array.from({length:4},(_,i)=>trade(i,{at:now-1000,usd:.01})),now).synchronized,0);
});
test('history changes never compare different pools or near-instant observations',()=>{
 assert.deepEqual(trend([{at:now-60000,pool:'a',liquidityUsd:10000},{at:now,pool:'b',liquidityUsd:100}],now),{});
 assert.deepEqual(trend([{at:now-1000,pool:'a',liquidityUsd:10000},{at:now,pool:'a',liquidityUsd:100}],now),{});
 assert.equal(trend([{at:now-60000,pool:'a',liquidityUsd:10000},{at:now,pool:'a',liquidityUsd:100}],now).liquidityChangePct,-99);
});


test('liquidity trends do not compare different mints or lifecycle phases during migration',()=>{
 const now=Date.now(),start={pool:'same-route',mint:'mint',stage:'final',at:now-60000,liquidityUsd:10000},end={...start,stage:'migrated',at:now,liquidityUsd:100};
 assert.deepEqual(RugLensActivity.trend([start,end],now),{});
 assert.deepEqual(RugLensActivity.trend([start,{...end,stage:'final',mint:'other'}],now),{});
 assert.equal(RugLensActivity.trend([start,{...end,stage:'final'}],now).liquidityChangePct,-99);
});


test('old local liquidity loss is not presented as a current observation',()=>{
 const now=Date.now();assert.deepEqual(trend([{at:now-240000,pool:'a',liquidityUsd:10000},{at:now-180000,pool:'a',liquidityUsd:100}],now),{});
});

// These are complete 32-byte base58 identities, unlike shortened table labels.
const wallets=Array.from({length:12},(_,i)=>'1'.repeat(31)+'23456789ABCD'[i]);
const mint=wallets[11];
const reliableRows=()=>[
 trade('a',{at:now-1000,wallet:wallets[0],tokenAmount:100,usd:10}),
 trade('b',{at:now-2000,wallet:wallets[0],tokenAmount:90,usd:1000,side:'sell'}),
 trade('c',{at:now-3000,wallet:wallets[1],tokenAmount:30,usd:10}),
 trade('d',{at:now-4000,wallet:wallets[1],tokenAmount:30,usd:200,side:'sell'}),
 trade('e',{at:now-5000,wallet:wallets[2],tokenAmount:15,usd:10,side:'sell'})
];
const holder=(i,pct,extra={})=>({address:wallets[i],pct,...extra});
const snapshot=(at,holders,extra={})=>({at,mint,stage:'new',holders,...extra});

test('sample windows use token quantities rather than USD proceeds to count net buying wallets',()=>{
 const r=summarize(reliableRows(),now).windows['30s'];
 assert.equal(r.status,'available');assert.equal(r.netBuyingWallets,1);assert.equal(r.netSellingWallets,1);assert.equal(r.balancedWallets,1);
 assert.equal(r.twoSidedWallets,2);assert.equal(r.netTokenAmount,-5);assert.equal(r.netTradeUsd,-1190);assert.equal(r.completeWallets,3);assert.equal(r.sampleOnly,true);
});

test('windows exclude dust and preserve the earliest observation when a signature is repeated',()=>{
 const rows=reliableRows(),original=rows[0];
 const r=summarize([...rows, {...original,at:now},trade('dust',{at:now,wallet:wallets[0],usd:.01,side:'sell',tokenAmount:999999})],now).windows['30s'];
 assert.equal(r.observedCount,6);assert.equal(r.eligibleCount,5);assert.equal(r.netBuyingWallets,1);assert.equal(r.minUsd,5);
 const old=trade('old',{at:now-301000});assert.equal(summarize([old,{...old,at:now}],now).count,0);
});

test('missing or abbreviated wallet identities and unreadable quantities cannot produce net-wallet claims',()=>{
 const rows=reliableRows();rows[0].wallet='AbCd…XYZ';rows[1].wallet='A'.repeat(32); // 24 decoded bytes, not a public key.
 let r=summarize(rows,now);assert.equal(r.fullWalletCount,2);assert.equal(r.windows['30s'].status,'insufficient');assert.equal(r.windows['30s'].netBuyingWallets,null);
 const missing=reliableRows();delete missing[0].tokenAmount;
 r=summarize(missing,now).windows['30s'];assert.equal(r.incompleteWallets,1);assert.equal(r.completeWallets,2);assert.equal(r.netTokenAmount,null);
 const unknownUsd=reliableRows();delete unknownUsd[0].usd;delete unknownUsd[1].usd;
 r=summarize(unknownUsd,now).windows['30s'];assert.equal(r.status,'insufficient');assert.match(r.reasons.join(' '),/USD amounts/);
});

test('unreadable quantities exclude the entire affected wallet rather than converting one side to zero',()=>{
 const rows=[...reliableRows(),trade('six',{at:now-1000,wallet:wallets[3],tokenAmount:100,usd:10}),trade('seven',{at:now-1000,wallet:wallets[4],tokenAmount:100,usd:10})];
 delete rows[0].tokenAmount;
 const r=summarize(rows,now).windows['30s'];assert.equal(r.status,'available');assert.equal(r.completeWallets,4);assert.equal(r.incompleteWallets,1);
 assert.equal(r.netBuyingWallets,2);assert.equal(r.netSellingWallets,1);assert.equal(r.netTokenAmount,185);
});

test('window boundaries, future rows and stale rows do not become fresh flow',()=>{
 const rows=reliableRows().map(r=>({...r,at:now-60000}));
 const result=summarize([...rows,trade('future',{at:now+1}),trade('old',{at:now-300001}),trade('bad',{at:NaN}),trade('badside',{side:'transfer'})],now);
 assert.equal(result.count,5);assert.equal(result.windows['30s'].status,'insufficient');assert.equal(result.windows['120s'].status,'available');assert.equal(result.windows['300s'].status,'available');
});

test('approximate displayed token quantities remain explicitly approximate',()=>{
 const rows=reliableRows();rows[0].tokenAmountApproximate=true;assert.equal(summarize(rows,now).windows['30s'].approximate,true);
});

test('bounded trade input avoids unbounded evidence accumulation',()=>{
 const rows=Array.from({length:1100},(_,i)=>trade(i,{at:now-i,wallet:wallets[i%3],tokenAmount:1}));
 assert.equal(summarize(rows,now).count,500);
});

test('cohort compares only matched visible wallets and never turns disappearance into a sale',()=>{
 const first=[holder(0,10),holder(1,5),holder(2,3),holder(3,20)];
 const last=[holder(0,8),holder(1,6),holder(2,3),holder(4,10)];
 const r=RugLensActivity.cohort([snapshot(now-60000,first),snapshot(now,last)],now);
 assert.equal(r.status,'available');assert.equal(r.matchedCount,3);assert.equal(r.previousObservedCount,4);assert.equal(r.currentObservedCount,4);
 assert.equal(r.previousPct,18);assert.equal(r.currentPct,17);assert.equal(r.changePp,-1);assert.equal(r.decreasedWallets,1);assert.equal(r.increasedWallets,1);
 assert.equal(r.unchangedWallets,1);assert.equal(r.sampleOnly,true);assert.equal('sales' in r,false);
});

test('cohort will not compare mints, lifecycle phases, stale observations or near-instant snapshots',()=>{
 const hs=[holder(0,10),holder(1,5),holder(2,3)];
 for(const rows of [
  [snapshot(now-60000,hs),snapshot(now,hs,{mint:wallets[10]})],
  [snapshot(now-60000,hs),snapshot(now,hs,{stage:'final'})],
  [snapshot(now-60000,hs),snapshot(now-30000,hs)],
  [snapshot(now-1000,hs),snapshot(now,hs)],
  [snapshot(now-60000,hs,{stage:'unknown'}),snapshot(now,hs,{stage:'unknown'})],
  [snapshot(now-60000,hs),snapshot(now+1,hs)],
 ])assert.equal(RugLensActivity.cohort(rows,now).status,'insufficient');
});

test('cohort excludes pools, unresolved/program accounts, invalid identities and conflicting duplicate rows',()=>{
 const hs=[holder(0,10),holder(1,5),holder(2,3),holder(3,20,{isPool:true}),holder(4,10,{accountType:'unresolved'}),holder(5,10,{accountType:'program'}),holder(6,5),holder(6,6),{address:'ABC…XYZ',pct:1}];
 const r=RugLensActivity.cohort([snapshot(now-60000,hs),snapshot(now,hs)],now);
 assert.equal(r.status,'available');assert.equal(r.matchedCount,3);assert.equal(r.currentPct,18);
 const duplicates=[holder(0,10),holder(0,10),holder(1,5),holder(2,3)];
 assert.equal(RugLensActivity.cohort([snapshot(now-60000,duplicates),snapshot(now,duplicates)],now).matchedCount,3);
});

test('cohort requires at least three matched wallets and never treats impossible percentages as supply',()=>{
 const hs=[holder(0,10),holder(1,5)],r=RugLensActivity.cohort([snapshot(now-60000,hs),snapshot(now,hs)],now);
 assert.equal(r.status,'insufficient');assert.equal(r.changePp,null);
 const bad=[holder(0,50),holder(1,50),holder(2,50)];assert.equal(RugLensActivity.cohort([snapshot(now-60000,bad),snapshot(now,bad)],now).status,'insufficient');
});

test('holder context only counts explicit quote units and keeps PnL and duration as sample descriptions',()=>{
 const hs=[
  holder(0,10,{soldQuoteAmount:5,soldQuoteSymbol:'SOL',realizedPnlQuoteAmount:-2,realizedPnlQuoteSymbol:'SOL',holdingAgeSeconds:60}),
  holder(1,5,{soldQuoteAmount:0,soldQuoteSymbol:'USD',realizedPnlQuoteAmount:100,realizedPnlQuoteSymbol:'USD',holdingAgeSeconds:180}),
  holder(2,3,{soldQuoteAmount:123,realizedPnlQuoteAmount:999999,holdingAgeSeconds:NaN}),
  holder(3,10,{isPool:true,soldQuoteAmount:100,soldQuoteSymbol:'SOL'}),
  holder(4,10,{accountType:'unresolved',soldQuoteAmount:100,soldQuoteSymbol:'SOL'}),
 ];
 const r=RugLensActivity.holderContext(hs);
 assert.equal(r.sampleCount,3);assert.equal(r.saleKnownCount,2);assert.equal(r.rowsWithSales,1);assert.equal(r.durationKnownCount,2);assert.equal(r.medianHoldingSeconds,120);
 assert.equal(r.pnlKnownCount,2);assert.equal(r.positivePnlCount,1);assert.equal(r.negativePnlCount,1);assert.equal('pnlTotal' in r,false);
 const duplicated=[hs[0],hs[0],hs[1]];assert.equal(RugLensActivity.holderContext(duplicated).sampleCount,2);
 assert.equal(RugLensActivity.holderContext([...duplicated,{...hs[0],holdingAgeSeconds:999}]).sampleCount,1);
});

test('synchronized amount windows retain the original center-relative threshold and distinct maker counts',()=>{
 const amounts=[100,101,102,104,108,108,108];
 const rows=amounts.map((usd,i)=>trade(i,{at:now-1000,usd,makerLabel:i>=4?'same':`distinct${i}`}));
 assert.equal(summarize(rows,now).synchronized,4);
 const naive=rows=>{let max=0;for(const r of rows){const matched=rows.filter(x=>Math.abs(x.usd-r.usd)<=Math.max(.05,r.usd*.02));max=Math.max(max,new Set(matched.map(x=>x.makerLabel)).size);}return max;};
 for(let seed=1;seed<20;seed++){
  const sample=Array.from({length:40},(_,i)=>trade(i,{at:now-1000,usd:5+((i*seed*7)%102)/10,makerLabel:`maker${i%11}`}));
  assert.equal(summarize(sample,now).synchronized,naive(sample));
 }
});

test('holder context accepts explicit sold token quantities without inventing quote units or exit fractions',()=>{
 const r=RugLensActivity.holderContext([
  holder(0,10,{soldQuoteAmount:null,soldQuoteSymbol:null,soldTokenAmount:25000000}),
  holder(1,10,{soldTokenAmount:0}),
  holder(2,10,{soldTokenAmount:-1}),
 ]);
 assert.equal(r.sampleCount,3);assert.equal(r.saleKnownCount,2);assert.equal(r.rowsWithSales,1);assert.equal('exitedPct' in r,false);
});

test('rounded two-sided quantities are indeterminate even when their displayed difference is positive',()=>{
 const rows=reliableRows();rows[0].tokenAmount=1040000;rows[0].tokenAmountApproximate=true;rows[1].tokenAmount=1000000;rows[1].tokenAmountApproximate=true;
 const r=summarize(rows,now).windows['30s'];
 assert.equal(r.status,'available');assert.equal(r.indeterminateWallets,1);assert.equal(r.netBuyingWallets,0);assert.equal(r.netSellingWallets,1);assert.equal(r.balancedWallets,1);assert.equal(r.approximate,true);
 const oneSided=reliableRows();oneSided[4].tokenAmountApproximate=true;const single=summarize(oneSided,now).windows['30s'];assert.equal(single.netSellingWallets,1);assert.equal(single.indeterminateWallets,0);
});

test('a same-wallet row with unknown USD makes that wallet incomplete instead of assuming the row was dust',()=>{
 const rows=[...reliableRows(),trade('six',{at:now-1000,wallet:wallets[3],tokenAmount:100,usd:10}),trade('seven',{at:now-1000,wallet:wallets[4],tokenAmount:100,usd:10}),trade('unknown',{at:now-1000,wallet:wallets[0],tokenAmount:99999999,usd:null,side:'sell'})];
 const r=summarize(rows,now).windows['30s'];
 assert.equal(r.status,'available');assert.equal(r.pricedCoverage,7/8);assert.equal(r.incompleteWallets,1);assert.equal(r.completeWallets,4);
 assert.equal(r.netBuyingWallets,2);assert.equal(r.netSellingWallets,1);assert.equal(r.netTokenAmount,185);
 const negative=rows.map(row=>row.signature==='sigunknown'?{...row,usd:-1}:row);assert.equal(summarize(negative,now).windows['30s'].incompleteWallets,1);
});
