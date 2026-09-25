import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';import {fixture,MINT,MARKET} from './fixtures.js';import '../extension/adapter.js';
const A=globalThis.RugLensAdapter;
const read=opts=>{const {document}=parseHTML(fixture(opts));document.querySelector('.scroll').scrollTop=0;return A.read(document,`https://trade.padre.gg/trade/solana/${MARKET}`);};
test('use contract from header instead of market route',()=>{const r=read();assert.equal(r.mint,MINT);assert.equal(r.market,MARKET);assert.notEqual(r.mint,r.market);});
test('No authority is false; label alone and unknown value are not active',()=>{assert.equal(read().metrics.mintActive,false);assert.equal(read({authority:'Yes'}).metrics.mintActive,true);assert.equal(read({authority:'Loading'}).metrics.mintActive,undefined);});
test('sniper wallet count cannot be confused with supply percentage',()=>{assert.equal(read({snipers:'8'}).metrics.sniperPct,undefined);assert.equal(read({snipers:'4% 11'}).metrics.sniperPct,4);});
test('holders parse percentages independently of remaining currency value',()=>{const r=read();assert.equal(r.holders.length,11);assert.equal(r.holders[0].isPool,true);assert.equal(r.holders[1].pct,2.5);assert.equal(r.holders[1].bought,0);assert.equal(r.holders[1].entryMc,4000);assert.equal(r.holders[1].sol,.01);assert.equal(r.holdersTopComplete,true);assert.equal(r.holders[1].fresh,true);});
test('stale header after SPA navigation discarded',()=>{assert.equal(read({market:'E'.repeat(32)}),null);});
test('non Solana route ignored',()=>{assert.equal(A.route('https://trade.padre.gg/trade/ethereum/0xabc'),null);assert.equal(A.route('https://trade.padre.gg/sign-in'),null);});
test('numeric parsing does not turn missing or inequalities into zero',()=>{assert.equal(A.number(''),null);assert.equal(A.number('<0.01'),null);assert.equal(A.number('$12.8K'),12800);assert.equal(A.number('0'),0);assert.equal(A.percent('8'),null);});
test('Trenches anchors the actual mint to its name, ignoring unrelated trade links',()=>{
  const {document}=parseHTML(`<main id="main-page"><article><div><h1 class="notranslate">COIN</h1><div><span><button id="button-copy-address-context-${MINT}"><div><h1>Coin name</h1></div></button></span></div></div><a href="/trade/solana/${MARKET}">Open unrelated coin</a></article></main>`);
  const entries=A.links(document);assert.equal(entries.length,1);assert.equal(entries[0].mint,MINT);assert.equal(entries[0].element,document.querySelector('h1'));assert.equal(entries[0].name,'COIN');
});
test('Trenches reads available card checks immediately and keeps unavailable fields unknown',()=>{
 const {document}=parseHTML(`<main id="main-page"><article><div><h1 class="notranslate">COIN</h1><span><button id="button-copy-address-context-${MINT}"><h1>Coin</h1></button></span></div><div aria-label="Top 10 holders"><span>37%</span></div><div aria-label="Snipers count &amp; holdings"><span>6</span><span>•</span><span>12%</span></div><div aria-label="Insiders holding"><span>0%</span></div><div aria-label="Dev sold">DS</div></article></main>`);
 const m=A.links(document)[0].metrics;assert.deepEqual(m,{top10Pct:37,sniperPct:12,insiderPct:0});assert.equal(m.mintActive,undefined);assert.equal(m.devPct,undefined);
});
test('trade reader reads validated columns, ignores sidebar and rejects missing USD units',()=>{
 const row=(usd)=>`<div data-trade-shell="true"><div><a href="https://solscan.io/tx/${'C'.repeat(88)}">2s</a></div><div>0.5</div><span>Sell</span><div>30K</div><div>1M</div><div>${usd}</div><div>2.0</div><div class="_makerCell_hash"><span aria-label="Bundler"></span><div class="_address_hash">Abc…xyz</div></div><div></div></div>`;
 const {document}=parseHTML(`<body><aside id="tracked-wallets-left">${row('$999')}</aside><main>${row('$123.45')}</main></body>`);
 const trades=A.readTrades(document);assert.equal(trades.length,1);assert.equal(trades[0].usd,123.45);assert.equal(trades[0].bundler,true);assert.equal(trades[0].wallet,null);assert.equal(trades[0].side,'sell');
 const other=parseHTML(row('123.45')).document;assert.equal(A.readTrades(other)[0].usd,null);
});

function holderDocument(values={}){
 const {document}=parseHTML(fixture({pool:false,rows:1}));
 document.querySelector('.scroll').scrollTop=0;
 const row=document.querySelector('[class*="_row_"]'),cells=Array.from(row.children);
 for(const [key,index] of Object.entries({address:0,bought:2,sold:3,pnl:4,held:5,remaining:6,funded:7}))if(key in values)cells[index].innerHTML=values[key];
 return {document,row,cells,read:()=>A.read(document,`https://trade.padre.gg/trade/solana/${MARKET}`)};
}
test('holder trade fields preserve visible text without inventing missing currency units',()=>{
 const h=holderDocument().read().holders[0];
 assert.equal(h.soldDisplay,'0');assert.equal(h.realizedPnlDisplay,'0');assert.equal(h.holdDurationDisplay,'5m');assert.equal(h.holdingAgeSeconds,300);
 assert.equal(h.soldQuoteAmount,null);assert.equal(h.soldQuoteSymbol,null);assert.equal(h.boughtQuoteAmount,null);assert.equal(h.realizedPnlQuoteAmount,null);
});
test('holder bought and sold quotes use explicit value units independently of average market cap',()=>{
 const h=holderDocument({bought:'<span class="_value_a">1.5 SOL</span><span class="_price_a">$4K</span>',sold:'<span class="_value_a">$1.2K</span><span class="_price_a">$8K</span>',pnl:'<span class="_value_a">-$15.25</span><span>-20%</span>',held:'1h 2m 3s'}).read().holders[0];
 assert.equal(h.boughtQuoteAmount,1.5);assert.equal(h.boughtQuoteSymbol,'SOL');assert.equal(h.boughtQuoteApproximate,false);
 assert.equal(h.soldQuoteAmount,1200);assert.equal(h.soldQuoteSymbol,'USD');assert.equal(h.soldQuoteApproximate,true);
 assert.equal(h.realizedPnlQuoteAmount,-15.25);assert.equal(h.realizedPnlQuoteSymbol,'USD');assert.equal(h.holdingAgeSeconds,3723);
});
test('holder header currency is usable only outside the average market cap annotation',()=>{
 const s=holderDocument({sold:'1.25'}),headers=Array.from(s.document.querySelector('[class*="_columns_"]').children);
 headers[3].textContent='Sold (Avg MC USD)';assert.equal(s.read().holders[0].soldQuoteAmount,null);
 headers[3].textContent='Sold (SOL) (Avg MC USD)';assert.equal(s.read().holders[0].soldQuoteAmount,1.25);assert.equal(s.read().holders[0].soldQuoteSymbol,'SOL');
 s.cells[3].textContent='$1.25';assert.equal(s.read().holders[0].soldQuoteAmount,null);
 headers[3].textContent='Sold SOL / USD';assert.equal(s.read().holders[0].soldQuoteAmount,null);
});
test('holder quantities reject negative amounts, prefixes, bad grouping and inequalities',()=>{
 for(const value of ['-1 SOL','<0.01 SOL','1.2? SOL','1,2 SOL','999999999999999999999999999 SOL','Loading','']){
  const h=holderDocument({sold:value}).read().holders[0];assert.equal(h.soldQuoteAmount,null,value);
 }
 for(const value of ['-1m','Loading','5m later','1h 1h','1s 1m','999999999999yr',''])assert.equal(holderDocument({held:value}).read().holders[0].holdingAgeSeconds,null,value);
 assert.equal(holderDocument({sold:'0 USDC',held:'0s'}).read().holders[0].soldQuoteAmount,0);
});
test('holder percentages outside actual supply bounds are not observations',()=>{
 for(const value of ['101%','-1%','9999999999999999999999999999999999%'])assert.equal(holderDocument({remaining:value}).read().holders.length,0,value);
 assert.equal(A.percent('101%'),null);assert.equal(A.percent('100%'),100);
});
test('holder token totals come only from the observed trade count and token quantity structure',()=>{
 const markup=value=>`<span class="_value_a">5.663<svg><image href="data:image/svg+xml;base64,aaa"></image></svg></span><span class="_transactions_a"><span class="_minor_a">${value}</span></span><span class="_price_a">$26.4K</span>`;
 const h=holderDocument({bought:markup('1 | 25.2M'),sold:markup('3 | 1,234.5')}).read().holders[0];
 assert.equal(h.boughtTokenAmount,25.2e6);assert.equal(h.boughtTokenAmountApproximate,true);assert.equal(h.boughtTradeCount,1);
 assert.equal(h.soldTokenAmount,1234.5);assert.equal(h.soldTokenAmountApproximate,false);assert.equal(h.soldTradeCount,3);
 assert.equal(h.boughtQuoteAmount,null);assert.equal(h.soldQuoteAmount,null);
 for(const value of ['1 |','1 | <0.01','1 | -1','1 | 1,2','1.5 | 2M','-1 | 2M','1 | 0','0 | 2M','1 | 2M | 3','Loading'])assert.equal(holderDocument({sold:markup(value)}).read().holders[0].soldTokenAmount,null,value);
 assert.equal(holderDocument({sold:markup('0 | 0')}).read().holders[0].soldTokenAmount,0);
 assert.equal(holderDocument({sold:'<span>1 | 25.2M</span>'}).read().holders[0].soldTokenAmount,null);
 assert.equal(holderDocument({sold:markup('1 | 2M')+markup('2 | 3M')}).read().holders[0].soldTokenAmount,null);
});
test('holder identity requires an actual address and rejects conflicting or deceptive links',()=>{
 const full='1'.repeat(31)+'E',s=holderDocument({address:'Abc…xyz'});s.row.parentElement.removeAttribute('data-frontrun-padre-address');
 assert.equal(s.read().holders[0].address,null);assert.equal(s.read().holders[0].addressLabel,'Abc…xyz');
 s.cells[0].innerHTML=`<a href="https://solscan.io/account/${full}?cluster=mainnet-beta">Abc…xyz</a>`;assert.equal(s.read().holders[0].address,full);
 s.row.parentElement.setAttribute('data-frontrun-padre-address','1'.repeat(31)+'F');assert.equal(s.read().holders[0].address,null);
 s.row.parentElement.removeAttribute('data-frontrun-padre-address');s.cells[0].innerHTML=`<a href="https://fake.test/solscan.io/account/${full}">Abc…xyz</a>`;assert.equal(s.read().holders[0].address,null);
 s.cells[0].innerHTML=`<a href="https://solscan.io/account/Abc…xyz">Abc…xyz</a>`;assert.equal(s.read().holders[0].address,null);
 s.cells[0].innerHTML=`<a href="https://solscan.io/account/${'A'.repeat(32)}">Invalid public key</a>`;assert.equal(s.read().holders[0].address,null);
});

function tradeDocument({tokens='1M',usd='$123.45',sol='2.0',maker='<div class="_address_hash">Abc…xyz</div>',extra=''}={}){
 return parseHTML(`<div data-trade-shell="true" ${extra}><div><a href="https://solscan.io/tx/${'C'.repeat(88)}">2s</a></div><div>0.5</div><span>Buy</span><div>30K</div><div>${tokens}</div><div>${usd}</div><div>${sol}</div><div class="_makerCell_hash">${maker}</div><div></div></div>`).document;
}
test('trade token amounts are bounded estimates from the validated token column',()=>{
 const t=A.readTrades(tradeDocument())[0];assert.equal(t.tokenAmount,1e6);assert.equal(t.tokenAmountApproximate,true);assert.equal(t.quoteSol,null);
 const exact=A.readTrades(tradeDocument({tokens:'1,234.5',sol:'2.0 SOL'}))[0];assert.equal(exact.tokenAmount,1234.5);assert.equal(exact.tokenAmountApproximate,false);assert.equal(exact.quoteSol,2);
 for(const tokens of ['','Loading','<0.01','-2','1,2','1M tokens','99999999999999999999999','1e1000','$100']){
  const row=A.readTrades(tradeDocument({tokens}))[0];assert.equal(row.tokenAmount,null,tokens);assert.equal(row.tokenAmountApproximate,null,tokens);
 }
 const zero=A.readTrades(tradeDocument({tokens:'0'}))[0];assert.equal(zero.tokenAmount,0);assert.equal(zero.tokenAmountApproximate,false);
 const bad=tradeDocument();bad.querySelector('[data-trade-shell]').appendChild(bad.createElement('div'));assert.deepEqual(A.readTrades(bad),[]);
});
test('trade quote amounts reject negative and malformed values and do not infer SOL units',()=>{
 for(const usd of ['$-1','$1,2','$100 garbage','$<0.01'])assert.equal(A.readTrades(tradeDocument({usd}))[0].usd,null,usd);
 for(const sol of ['1.5','$1.5','1.5 USDC','-1.5 SOL','1.5 SOL more'])assert.equal(A.readTrades(tradeDocument({sol}))[0].quoteSol,null,sol);
});
test('trade full wallet observations require valid account links or explicit address attributes',()=>{
 const full='1'.repeat(31)+'E',other='1'.repeat(31)+'F';
 assert.equal(A.readTrades(tradeDocument({maker:`<a href="https://solscan.io/account/${full}">Abc…xyz</a>`}))[0].wallet,full);
 assert.equal(A.readTrades(tradeDocument({extra:`data-frontrun-padre-address="${full}"`}))[0].wallet,full);
 assert.equal(A.readTrades(tradeDocument({extra:`data-frontrun-padre-address="${'A'.repeat(32)}"`}))[0].wallet,null);
 assert.equal(A.readTrades(tradeDocument({maker:`<a href="https://fake.test/solscan.io/account/${full}">Abc…xyz</a>`}))[0].wallet,null);
 assert.equal(A.readTrades(tradeDocument({maker:`<a href="https://solscan.io/account/${full}">Abc…xyz</a>`,extra:`data-frontrun-padre-address="${other}"`}))[0].wallet,null);
});
test('a transaction row needs an actual Solscan transaction reference in the age column',()=>{
 const d=tradeDocument(),link=d.querySelector('a');link.setAttribute('href',`https://fake.test/solscan.io/tx/${'C'.repeat(88)}`);assert.deepEqual(A.readTrades(d),[]);
 link.setAttribute('href','https://solscan.io/tx/Loading');assert.deepEqual(A.readTrades(d),[]);
});

function stageCard(mint=MINT,name='COIN'){return `<article><div><h1 class="notranslate">${name}</h1><span><button id="button-copy-address-context-${mint}"><h1>${name}</h1></button></span></div><div aria-label="Top 10 holders">20%</div></article>`;}
function stageEntries(html){return A.links(parseHTML(`<main id="main-page">${html}</main>`).document);}
test('Trenches stage IDs map New, Final Stretch and Migrated within their own columns',()=>{
 const entries=stageEntries([['NEW','new',3],['ALMOST_BONDED','final',2],['RECENTLY_BONDED','migrated',1]].map(([id],i)=>`<section><header><h2>Localized title</h2><button id="button-sound-effect-select-${id}"></button></header><div>${stageCard('ABC'[i].repeat(32),id)}</div></section>`).join(''));
 assert.deepEqual(entries.map(e=>[e.stage,e.stagePriority]),[['new',3],['final',2],['migrated',1]]);
});
test('Trenches stage headings support Terminal labels and their expanded names',()=>{
 for(const [label,stage,priority] of [['New','new',3],['NEW','new',3],['New Pairs','new',3],['Soon','final',2],['Final Stretch','final',2],['Migrated','migrated',1]]){
  const [entry]=stageEntries(`<section><header><h2>${label}</h2></header><div>${stageCard()}</div></section>`);assert.equal(entry.stage,stage,label);assert.equal(entry.stagePriority,priority,label);
 }
});
test('global stage headings and controls cannot classify an unscoped card',()=>{
 const [entry]=stageEntries(`<h2>New</h2><button id="button-sound-effect-select-NEW"></button>${stageCard()}`);assert.equal(entry.stage,'unknown');assert.equal(entry.stagePriority,0);
 const [ambiguous]=stageEntries(`<div><h2>New</h2><h2>Migrated</h2><button id="button-sound-effect-select-NEW"></button><button id="button-sound-effect-select-RECENTLY_BONDED"></button>${stageCard()}</div>`);assert.equal(ambiguous.stage,'unknown');
});
test('a column with no stage marker cannot borrow the neighboring column marker',()=>{
 const entries=stageEntries(`<div><section><header><h2>New</h2><button id="button-sound-effect-select-NEW"></button></header>${stageCard(MINT,'known')}</section><section>${stageCard('C'.repeat(32),'unknown')}</section></div>`);
 assert.deepEqual(entries.map(e=>[e.name,e.stage,e.stagePriority]),[['known','new',3],['unknown','unknown',0]]);
});
test('a single-column stable control is usable alongside unrelated subsection headings',()=>{
 const [entry]=stageEntries(`<section><header><h2>New</h2><button id="button-sound-effect-select-NEW"></button></header><h2>Filters</h2>${stageCard()}</section>`);assert.equal(entry.stage,'new');assert.equal(entry.stagePriority,3);
});
test('Trenches lifecycle provenance is attached to the exact card mint',()=>{
 const [entry]=stageEntries(`<section><h2>Final Stretch</h2>${stageCard()}</section>`);assert.equal(entry.stageMint,MINT);assert.equal(entry.stageSource,'Terminal Trenches column');assert.equal(entry.stageAt,entry.at);
});
test('detail lifecycle reads an explicit stage field within the token header',()=>{
 for(const [value,stage] of [['New Pairs','new'],['Final Stretch','final'],['Migrated','migrated']]){
  const {document}=parseHTML(fixture().replace('</h2></div>',`</h2></div><div><span>Stage</span><span>${value}</span></div>`));const result=A.read(document,`https://trade.padre.gg/trade/solana/${MARKET}`);
  assert.equal(result.stage,stage);assert.equal(result.stageMint,MINT);assert.equal(result.stageSource,'Terminal token header');assert.ok(result.stageAt<=result.at);
 }
});
test('detail lifecycle remains unknown for unrelated headings, market cap and neighboring token fields',()=>{
 for(const extra of ['<h2>New Pairs</h2>','<div>Market cap</div><div>$100K</div>',`<aside><div><span>Stage</span><span>Migrated</span></div><button id="button-copy-address-context-${'D'.repeat(32)}">CA</button></aside>`]){
  const {document}=parseHTML(fixture().replace('</main>',`${extra}</main>`));const result=A.read(document,`https://trade.padre.gg/trade/solana/${MARKET}`);assert.equal(result.stage,'unknown');assert.equal(result.stageSource,null);
 }
});
