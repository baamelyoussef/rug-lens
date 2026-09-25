import {fixture,MARKET,MINT} from '../tests/fixtures.js';
let stage='migrated',mode='flagged',manual={},badge,chain=null;
const names={flagged:'COORDINATED HOLDERS',caution:'THIN LIQUIDITY',lower:'NO MAJOR FLAGS',partial:'WAIT FOR DATA',launch:'STAGE COMPARISON',rugged:'REPORTED RUG'};
function getModel(){
 const data=RugLensAdapter.read(document,`https://trade.padre.gg/trade/solana/${MARKET}`);
 let metrics={...data.metrics,liquidityUsd:8500,marketCapUsd:50000,bundlePct:38,watchers:83,holderCount:420,buys5m:20,sells5m:70,priceChange5m:-34};
 let holders=data.holders;
 let activity=RugLensActivity.summarize(Array.from({length:24},(_,i)=>({signature:'sim'+i,side:i<19?'sell':'buy',usd:40+i,at:Date.now()-i*5000,bundler:i<15,makerLabel:'wallet'+i})));
 if(mode==='lower'||mode==='launch'){metrics={mintActive:false,freezeActive:false,metadataMutable:false,permanentDelegate:false,nonTransferable:false,defaultFrozen:false,transferHook:false,transferFeePct:0,pausable:false,bundlePct:1,insiderPct:0,top10Pct:15,devPct:0,liquidityUsd:90000,marketCapUsd:500000,watchers:56,holderCount:900};holders=Array.from({length:10},(_,i)=>({address:'Example wallet '+i,pct:1+i*.1}));activity={};}
 if(mode==='caution'){metrics={mintActive:false,freezeActive:false,liquidityUsd:8000,watchers:32,holderCount:245};holders=[];activity={};}
 if(mode==='partial'||mode==='rugged'){metrics={mintActive:false};holders=[];activity={};}
 if(mode==='launch')metrics.bundlePct=15;
 const launchCurve=stage!=='migrated'&&!['partial','rugged'].includes(mode)?{status:'verified',mint:MINT,program:'pump',quoteIsNativeSol:true,complete:false,at:Date.now(),virtualTokenReservesRaw:'500000000000000',virtualQuoteReservesRaw:'80000000000',realTokenReservesRaw:'250000000000000',realQuoteReservesRaw:mode==='caution'?'0':'50000000000',tokenSupplyRaw:'1000000000000000',source:'SIMULATED curve inputs — not live account verification'}:undefined;
 const input={mint:MINT,marketMint:stage==='migrated'?MINT:undefined,marketLiquidityUsd:stage==='migrated'?metrics.liquidityUsd:undefined,marketAt:Date.now(),pairDex:stage==='migrated'?'pumpswap':undefined,pairAddress:stage==='migrated'?MARKET:undefined,stage,stageMint:MINT,stageAt:Date.now(),stageSource:'SIMULATED lifecycle selection',launchCurve,chain,metrics,holders,holdersTopComplete:['lower','launch','flagged'].includes(mode),manual,activity,rugged:mode==='rugged'};
 return {signals:{momentum:RugLensSignals.momentum(metrics,activity),events:mode==='flagged'?[{kind:'risk',label:'New risk evidence',detail:'SIMULATED: linked funding pattern found during this session.',at:Date.now()}]:[]},chain,canScanChain:true,market:'SIMULATED DATA — not a live token',name:names[mode],metrics,evidenceHolders:holders,page:true,pageAt:Date.now(),holderAt:Date.now(),manual,result:RugLensEngine.evaluate(input)};
}
function show(){RugLensUI.panel(getModel(),{chain:()=>{chain={at:Date.now(),walletsRead:6,sampled:6,parsed:18,requested:18,unavailable:0,scope:'SIMULATED scan evidence; not live blockchain data.',errors:[],closureGroups:[{payer:'SIMULATED payer',wallets:['SIMULATED holder A','SIMULATED holder B','SIMULATED holder C'],supply:27,creatorLinked:true,signatures:[]}],jointBuys:[]};badge.update(getModel().result);show();},refresh:()=>{badge.update(getModel().result);show();},manual:(id,status)=>{manual[id]={status,at:Date.now()};badge.update(getModel().result);show();}});}
function render(){
 RugLensUI.close();manual={};chain=null;const target=document.getElementById('fixture'),parsed=new DOMParser().parseFromString(fixture().replace('18%</span>','38%</span>'),'text/html');target.replaceChildren(...parsed.body.children);
 const stats=document.createElement('div');stats.className='stats';Array.from(target.children).filter(e=>e.tagName==='DIV').forEach(e=>stats.append(e));target.querySelector('main').after(stats);target.querySelector('.scroll').scrollTop=0;
 const heading=target.querySelector('h2');heading.textContent='DEMO / '+mode.toUpperCase();badge=RugLensUI.badge(show);heading.after(badge.host);badge.update(getModel().result);
 // Only the coordinated sample matches the holder fixture; keep other samples explicit.
 if(mode!=='flagged'){stats.remove();target.querySelector('section').remove();const note=document.createElement('p');note.textContent='Simulated scenario. Click the icon beside the name to inspect its evidence.';target.append(note);}
 for(const id of Object.keys(names))document.getElementById(id).className=id===mode?'selected':'';
}
for(const id of Object.keys(names))document.getElementById(id).onclick=()=>{mode=id;if(id==='launch'){stage='new';document.getElementById('stage').value=stage;}render();};document.getElementById('stage').onchange=e=>{stage=e.target.value;render();show();};render();
