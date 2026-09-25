export const MINT='A'.repeat(32), MARKET='B'.repeat(32);
export function fixture({mint=MINT,market=MARKET,authority='No',snipers='8',rows=10,pool=true}={}){
  const stat=(label,value)=>`<div><div><span>${value}</span></div><span>${label}</span></div>`;
  const holder=(i,isPool=false)=>`<div style="top:${i*40}px" data-frontrun-padre-address="${'C'.repeat(31)}${i}" data-frontrun-padre-fund-from="${'D'.repeat(32)}"><div class="_columns_hash_1 _row_hash_9">
  <div><span>${isPool?'VAULT':'Holder '+i}</span><span aria-label="${isPool?'Launch Lab Vault':'Terminal app'}"></span>${i<4&&!isPool?'<span aria-label="Address had 0 SOL until 5m ago"></span>':''}</div>
  <div><span>${i===0?'0':'0.01'}</span><span>(<span>10s</span>)</span></div>
  <div><span class="_value_hash_19">${i===1?'0':'1.5'}</span><span class="_price_hash_42">$4K</span></div>
  <div><span>0</span></div><div>0</div><div>5m</div>
  <div><span class="_valueText_hash_26">$400</span><span class="_percent_hash_35">${isPool?'70':'2.5'}%</span></div>
  <div><span class="fund_addr">Fund…111</span><span>5m</span><span>•</span><span>1.5</span></div><div></div></div></div>`;
  return `<html><body><main><div><div><h2 class="notranslate">TEST TOKEN</h2></div><button id="button-copy-address-context-${mint}">CA</button><a href="https://dexscreener.com/solana/${market}">Chart</a></div></main>
  ${stat('Mint Auth.',authority)}${stat('Freeze Auth.','No')}${stat('Top 10 H.','25%')}${stat('Insiders H.','22%')}${stat('Bundles H.','18%')}${stat('Dev holding','0%')}${stat('Snipers',snipers)}
  <section><div><div class="_columns_hash_1">${['Address','Balance(Last activity)','Bought (Avg MC)','Sold (Avg MC)','R. PnL','Hold For','Remaining','Funded By',''].map(v=>`<div><span>${v}</span></div>`).join('')}</div></div><div class="scroll"><div>${pool?holder(0,true):''}${Array.from({length:rows},(_,i)=>holder(i+1)).join('')}</div></div></section></body></html>`;
}
