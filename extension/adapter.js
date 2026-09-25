(() => {
  const BASE58=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',identityCache=new Map();
  const text=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
  const leafText=e=>e?Array.from(e.querySelectorAll('span')).filter(x=>!x.querySelector('span')).map(text).filter(Boolean).join(' '):'';
  function number(s){
    if(typeof s!=='string'||!s.trim()||/[<>]/.test(s))return null;
    const m=s.replace(/,/g,'').trim().match(/^\$?(-?\d+(?:\.\d+)?)\s*([KMB])?\b/i);
    return m?Number(m[1])*({K:1e3,M:1e6,B:1e9}[m[2]?.toUpperCase()]||1):null;
  }
  function percent(s){const m=String(s||'').match(/(?:^|\s)(\d+(?:\.\d+)?)\s*%/),v=m?Number(m[1]):null;return v!==null&&Number.isFinite(v)&&v<=100?v:null;}
  function age(s){const m=String(s||'').match(/^(\d+)\s*(s|m|h|d|mo|yr)$/);return m?Number(m[1])*({s:1,m:60,h:3600,d:86400,mo:2592000,yr:31536000}[m[2]]):null;}
  // New analysis fields require a whole readable amount, not a numeric prefix.
  // Terminal abbreviations are retained as estimates, never exact token balances.
  function amount(s,{signed=false}={}){
    const m=String(s||'').trim().match(/^([+-]?)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)\s*([KMB])?$/i);
    if(!m||(!signed&&m[1]==='-'))return null;
    const value=Number(`${m[1]}${m[2].replace(/,/g,'')}`)*({K:1e3,M:1e6,B:1e9}[m[3]?.toUpperCase()]||1);
    return Number.isFinite(value)&&Math.abs(value)<=Number.MAX_SAFE_INTEGER?{value,approximate:!!m[3]}:null;
  }
  function quoteAmount(cell,header,{signed=false}={}){
    if(!cell)return null;
    const valueElement=cell.querySelector('[class*="_value_"]')||cell;
    let value=text(valueElement),symbol=null;
    const usd=value.match(/^([+-]?)\$(.+)$/);
    const explicit=value.match(/^(.+?)\s+(SOL|USD|USDC|USDT)$/i);
    if(usd){symbol='USD';value=usd[1]+usd[2];}
    else if(explicit){symbol=explicit[2].toUpperCase();value=explicit[1];}
    // A unit in "Avg MC" is a price unit, not the bought/sold amount unit.
    const heading=String(header||'').replace(/\([^)]*Avg\s*MC[^)]*\)/ig,'');
    const units=new Set((heading.match(/\b(?:SOL|USD|USDC|USDT)\b/ig)||[]).map(s=>s.toUpperCase()));
    for(const e of [valueElement,...valueElement.querySelectorAll('[aria-label],[title],img[alt]')]){
      for(const attr of ['aria-label','title','alt']){const unit=e.getAttribute(attr);if(/^(SOL|USD|USDC|USDT)$/i.test(unit||''))units.add(unit.toUpperCase());}
    }
    if(symbol)units.add(symbol);
    if(units.size!==1)return null;
    symbol=[...units][0];
    const parsed=amount(value,{signed});return parsed?{...parsed,symbol}:null;
  }
  function identity(cell,attributes=[]){
    const addresses=new Set(attributes.filter(publicKey));
    for(const a of cell?.querySelectorAll('a[href]')||[]){
      try{const u=new URL(a.getAttribute('href'),'https://trade.padre.gg');const m=u.pathname.match(/^\/account\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/);if(u.protocol==='https:'&&u.hostname==='solscan.io'&&m&&publicKey(m[1]))addresses.add(m[1]);}catch{}
    }
    // Conflicting rendered identities are not a usable wallet observation.
    return addresses.size===1?[...addresses][0]:null;
  }
  function publicKey(value){
    if(typeof value!=='string'||!BASE58.test(value))return false;
    if(identityCache.has(value))return identityCache.get(value);
    let n=0n;for(const ch of value)n=n*58n+BigInt(ALPHABET.indexOf(ch));
    let bytes=0;for(;n>0n;n>>=8n)bytes++;
    const valid=bytes+(value.match(/^1*/)?.[0].length||0)===32;
    identityCache.set(value,valid);if(identityCache.size>1024)identityCache.delete(identityCache.keys().next().value);
    return valid;
  }
  function duration(s){
    const value=String(s||'').trim();if(!/^(?:\d+\s*(?:yr|mo|d|h|m|s)\s*)+$/.test(value))return null;
    let total=0,previous=Infinity;const sizes={yr:31536000,mo:2592000,d:86400,h:3600,m:60,s:1};
    for(const m of value.matchAll(/(\d+)\s*(yr|mo|d|h|m|s)/g)){const size=sizes[m[2]];if(size>=previous)return null;previous=size;total+=Number(m[1])*size;}
    return Number.isSafeInteger(total)&&total<=3153600000?total:null;
  }
  function holderTrades(cell){
    // Terminal exposes "trade count | tokens" separately from the quote value
    // and average market cap. An unlabeled zero quote cannot substitute for it.
    const minors=Array.from(cell?.querySelectorAll('[class*="_transactions_"] [class*="_minor_"]')||[]);
    if(minors.length!==1)return null;
    const parts=text(minors[0]).split('|').map(s=>s.trim());if(parts.length!==2||!/^\d+$/.test(parts[0]))return null;
    const count=Number(parts[0]),tokens=amount(parts[1]);
    if(!Number.isSafeInteger(count)||!tokens||(count===0&&tokens.value>0)||(count>0&&tokens.value===0))return null;
    return {count,...tokens};
  }
  const display=e=>text(e).slice(0,120)||null;
  function route(url){try{const u=new URL(url,'https://trade.padre.gg');const m=u.pathname.match(/^\/trade\/solana\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/);return m?m[1]:null;}catch{return null;}}
  function exact(doc,label){return Array.from(doc.querySelectorAll('span,div,p')).find(e=>e.children.length===0&&text(e)===label);}
  function metric(doc,label){const e=exact(doc,label);return e?percent(leafText(e.parentElement)):null;}
  function read(doc,url){
    const market=route(url);if(!market)return null;
    const heading=doc.querySelector('h2.notranslate')||doc.querySelector('h2');
    const copy=Array.from(doc.querySelectorAll('[id^="button-copy-address-context-"]')).find(e=>{
      let p=heading;for(let i=0;p&&i<6;i++,p=p.parentElement)if(p.contains(e))return true;return false;
    });
    const mint=copy?.id.replace('button-copy-address-context-','');
    if(!BASE58.test(mint||''))return null;
    let header=heading;
    for(let i=0;header&&i<7;i++,header=header.parentElement){
      const links=Array.from(header.querySelectorAll('a[href*="dexscreener.com/solana/"]'));
      if(links.length){if(!links.some(a=>a.href.split('/').pop()?.split('?')[0]===market))return null;break;}
    }
    const metrics={};
    for(const [key,label] of Object.entries({top10Pct:'Top 10 H.',insiderPct:'Insiders H.',bundlePct:'Bundles H.',devPct:'Dev holding',sniperPct:'Snipers',freshHoldingPct:'Fresh holding',burnedLiquidityPct:'Burned Liq.'})){
      const value=metric(doc,label);if(value!==null)metrics[key]=value;
    }
    // A field label alone is not its value. Terminal renders "No" separately.
    for(const [key,label] of [['mintActive','Mint Auth.'],['freezeActive','Freeze Auth.']]){
      const e=exact(doc,label),value=e?leafText(e.parentElement).replace(label,'').trim():'';
      if(value==='No')metrics[key]=false;else if(value==='Yes')metrics[key]=true;
    }
    {for(const [key,label] of [['marketCapUsd','Market cap'],['liquidityUsd','Liquidity']]){
      const e=exact(doc,label);const candidates=[e?.nextElementSibling,e?.parentElement?.nextElementSibling];
      const v=candidates.map(el=>number(text(el))).find(v=>v!==null&&v>=0);if(v!==undefined)metrics[key]=v;
    }}
    const holdersTab=Array.from(doc.querySelectorAll('[role="tab"]')).find(e=>/^Holders\s*\(/.test(text(e)));
    const count=text(holdersTab).match(/\(([\d,.]+[KMB]?)\)/i);if(count)metrics.holderCount=number(count[1]);
    const viewers=header?.querySelector('svg path[d^="M0.666992 8.00002"]')?.closest('svg')?.parentElement;
    const viewerCount=number(text(viewers));if(viewerCount!==null)metrics.watchers=viewerCount;
    const curve=exact(doc,'B. Curve');if(curve){const v=percent(leafText(curve.parentElement.parentElement));if(v!==null)metrics.bondingCurvePct=v;}
    const label=exact(doc,'Funded By');const columns=label?.parentElement?.parentElement;
    const holders=[];let holdersTopComplete=false;
    if(columns&&text(columns).includes('Remaining')&&text(columns).includes('Bought')){
      const names=Array.from(columns.children).map(text);
      const index=regex=>names.findIndex(s=>regex.test(s));
      const indexes={address:index(/^Address$/),sol:index(/^Balance/),bought:index(/^Bought/),remaining:index(/^Remaining/),funded:index(/^Funded By$/)};
      const optional={sold:index(/^Sold(?:\s|$)/),pnl:index(/^(?:R\.\s*PnL|Realized\s+PnL)(?:\s|$)/i),held:index(/^Hold For$/i)};
      const body=columns.parentElement.nextElementSibling;
      if(Object.values(indexes).every(i=>i>=0)&&body){
        const rows=Array.from(body.querySelectorAll('[class*="_row_"]'));
        for(const row of rows){
          const cells=Array.from(row.children);if(cells.length!==names.length)continue;
          const cell=k=>cells[indexes[k]], addressCell=cell('address');
          const labels=Array.from(addressCell.querySelectorAll('[aria-label]')).map(e=>e.getAttribute('aria-label'));
          const isPool=labels.some(s=>/vault|liquidity pool|bonding curve|burn address/i.test(s))||/^(VAULT|POOL|BURN)$/i.test(text(addressCell));
          const wrapper=row.parentElement;
          const address=identity(addressCell,[wrapper.getAttribute('data-frontrun-padre-address'),row.getAttribute('data-frontrun-padre-address'),addressCell.getAttribute('data-frontrun-padre-address')]);
          const fundCell=cell('funded'), fundingWords=leafText(fundCell).split(' ');
          const fundingTimeLabel=fundingWords.find(w=>age(w)!==null)||null;
          const solWords=leafText(cell('sol'));const balanceString=solWords.split('(')[0].trim();
          const remaining=cell('remaining').querySelector('[class*="_percent_"]');
          const boughtCell=cell('bought');const boughtValue=boughtCell.querySelector('[class*="_value_"]');
          const entry=boughtCell.querySelector('[class*="_price_"]');
          const soldCell=cells[optional.sold],pnlCell=cells[optional.pnl],heldCell=cells[optional.held];
          const boughtQuote=quoteAmount(boughtCell,names[indexes.bought]),soldQuote=quoteAmount(soldCell,names[optional.sold]),pnlQuote=quoteAmount(pnlCell,names[optional.pnl],{signed:true});
          const boughtTrades=holderTrades(boughtCell),soldTrades=holderTrades(soldCell);
          const holding=percent(text(remaining)||leafText(cell('remaining')));
          if(holding===null)continue;
          holders.push({address,addressLabel:display(addressCell),pct:holding,isPool,sol:number(balanceString),bought:number(text(boughtValue)),entryMc:number(text(entry)),
            soldDisplay:display(soldCell),realizedPnlDisplay:display(pnlCell),holdDurationDisplay:display(heldCell),holdingAgeSeconds:duration(text(heldCell)),
            boughtQuoteAmount:boughtQuote?.value??null,boughtQuoteSymbol:boughtQuote?.symbol??null,boughtQuoteApproximate:boughtQuote?.approximate??null,
            soldQuoteAmount:soldQuote?.value??null,soldQuoteSymbol:soldQuote?.symbol??null,soldQuoteApproximate:soldQuote?.approximate??null,
            realizedPnlQuoteAmount:pnlQuote?.value??null,realizedPnlQuoteSymbol:pnlQuote?.symbol??null,realizedPnlQuoteApproximate:pnlQuote?.approximate??null,
            boughtTokenAmount:boughtTrades?.value??null,boughtTokenAmountApproximate:boughtTrades?.approximate??null,boughtTradeCount:boughtTrades?.count??null,
            soldTokenAmount:soldTrades?.value??null,soldTokenAmountApproximate:soldTrades?.approximate??null,soldTradeCount:soldTrades?.count??null,
            fresh:labels.some(s=>/Address had 0 SOL until|fresh wallet/i.test(s)),
            platform:labels.find(s=>/bot|app|axiom|terminal|padre/i.test(s))||null,
            insider:labels.includes('Insider'),bundler:labels.includes('Bundler'),
            funder:identity(fundCell,[wrapper.getAttribute('data-frontrun-padre-fund-from')]),
            funderIsService:/binance|coinbase|kraken|bybit|okx|fixed.?float|relay|bridge|changenow|mexc|kucoin|gate\.io|bitget|htx|crypto\.com/i.test(text(fundCell)),
            fundingTimeLabel,fundingAgeSeconds:age(fundingTimeLabel)});
        }
        holdersTopComplete=body.scrollTop===0&&holders.filter(h=>!h.isPool).length>=10;
      }
    }
    return {mint,market,name:text(heading)||mint.slice(0,6),heading,metrics,holders,holdersTopComplete,trades:readTrades(doc),...detailStage(heading,mint),at:Date.now()};
  }
  function readTrades(doc){
    const now=Date.now(),rows=[];
    for(const row of doc.querySelectorAll('[data-trade-shell="true"]')){
      if(row.closest('#tracked-wallets-left,[id*="tracked-wallet"]'))continue;
      const cells=Array.from(row.children),sideIndex=cells.findIndex(e=>/^(Buy|Sell)$/.test(text(e)));
      // Validated Terminal layout: age, balance, side, cap, tokens, USD, SOL, maker, action.
      if(sideIndex!==2||cells.length!==9)continue;
      const link=cells[0].querySelector('a[href*="solscan.io/tx/"]');
      let signature=null;
      try{const u=new URL(link?.getAttribute('href'),'https://trade.padre.gg'),m=u.pathname.match(/^\/tx\/([1-9A-HJ-NP-Za-km-z]{64,88})\/?$/);if(u.protocol==='https:'&&u.hostname==='solscan.io'&&m)signature=m[1];}catch{}
      const ago=age(text(link));if(!signature||ago===null)continue;
      const maker=row.querySelector('[class*="_makerCell_"]');
      const labels=Array.from(maker?.querySelectorAll('[aria-label]')||[]).map(e=>e.getAttribute('aria-label'));
      const address=identity(maker,[maker?.getAttribute('data-frontrun-padre-address'),row.getAttribute('data-frontrun-padre-address')]);
      const makerLabel=text(maker?.querySelector('[class*="_address_"]'));
      const usdText=text(cells[5]);
      const tokens=amount(text(cells[4])),usd=usdText.startsWith('$')?amount(usdText.slice(1)):null,sol=quoteAmount(cells[6],'');
      rows.push({signature,side:text(cells[2]).toLowerCase(),at:now-ago*1000,usd:usd?.value??null,
        tokenAmount:tokens?.value??null,tokenAmountApproximate:tokens?.approximate??null,quoteSol:sol?.symbol==='SOL'?sol.value:null,
        marketCapUsd:number(text(cells[3])),wallet:address,makerLabel,
        developer:labels.some(x=>/^Dev(eloper)?$/i.test(x)),insider:labels.includes('Insider'),bundler:labels.includes('Bundler')});
    }
    return rows;
  }
  function links(doc){
    // Trenches cards navigate through row handlers, not their social/trade links.
    // The copy-address control identifies the card's own mint reliably.
    return Array.from(doc.querySelectorAll('#main-page [id^="button-copy-address-context-"]')).flatMap(copy=>{
      const mint=copy.id.replace('button-copy-address-context-','');
      if(!BASE58.test(mint)||!copy.querySelector('h1'))return [];
      let row=copy.parentElement;
      for(let i=0;row&&i<4;i++,row=row.parentElement){
        const heading=Array.from(row.children).find(e=>e.matches('h1.notranslate'));
        if(heading){
          let card=row;
          for(let j=0;card&&j<7;j++,card=card.parentElement){
            if(card.querySelectorAll('[id^="button-copy-address-context-"]').length>1){card=null;break;}
            if(card.querySelector('[aria-label="Top 10 holders"]'))break;
          }
          const metrics={};
          for(const [key,label] of [['top10Pct','Top 10 holders'],['devPct','Dev holding'],['sniperPct','Snipers count & holdings'],['insiderPct','Insiders holding']]){
            const field=card?.querySelector(`[aria-label="${label}"]`);
            const value=percent(leafText(field)||text(field));
            if(value!==null)metrics[key]=value;
          }
          const stage=columnStage(card||row);
          return [{element:heading,mint,market:mint,name:text(heading),metrics,...stage,stageMint:mint,stageSource:stage.stage==='unknown'?null:'Terminal Trenches column',stageAt:stage.stage==='unknown'?null:Date.now(),at:Date.now()}];
        }
      }
      return [];
    });
  }
  function columnStage(element){
    // Sound-control IDs are stable even when Terminal changes its column labels.
    const stages={NEW:['new',3],ALMOST_BONDED:['final',2],RECENTLY_BONDED:['migrated',1]};
    const headingStage=heading=>{const label=text(heading).toLowerCase();return /^(new|new pairs)$/.test(label)?stages.NEW:/^(soon|final stretch)$/.test(label)?stages.ALMOST_BONDED:label==='migrated'?stages.RECENTLY_BONDED:null;};
    function sharedColumn(marker,ancestor){
      let branch=marker;while(branch.parentElement&&branch.parentElement!==ancestor)branch=branch.parentElement;
      // A sibling subtree containing both a stage marker and its own cards is
      // another column, rather than this card's header. Never borrow its stage.
      return branch.contains(element)||!branch.querySelector('[id^="button-copy-address-context-"]');
    }
    for(let p=element;p&&p.id!=='main-page';p=p.parentElement){
      const controls=Array.from(p.querySelectorAll('[id^="button-sound-effect-select-"]'));
      const headings=Array.from(p.querySelectorAll('h2')).filter(headingStage);
      if(controls.length>1||headings.length>1)break;
      if(controls.length===1){
        if(!sharedColumn(controls[0],p))break;
        const entry=stages[controls[0].id.replace('button-sound-effect-select-','')];if(entry)return {stage:entry[0],stagePriority:entry[1]};
      }
      if(headings.length===1){if(!sharedColumn(headings[0],p))break;const entry=headingStage(headings[0]);return {stage:entry[0],stagePriority:entry[1]};}
    }
    return {stage:'unknown',stagePriority:0};
  }

  function detailStage(heading,mint){
    // Only a lifecycle field in this token's header is evidence. Nearby column
    // headings, token names, age and market cap do not identify its stage.
    const values={'new':'new','new pairs':'new','final stretch':'final','soon':'final','migrated':'migrated'};
    for(let p=heading?.parentElement,i=0;p&&i<6;p=p.parentElement,i++){
      if(p.matches('body,html')||Array.from(p.querySelectorAll('[id^="button-copy-address-context-"]')).some(copy=>copy.id!==`button-copy-address-context-${mint}`))break;
      const fields=Array.from(p.querySelectorAll('span,div,p,dt')).filter(el=>el.children.length===0&&/^(stage|lifecycle)$/i.test(text(el)));
      const stages=new Set(fields.map(el=>values[text(el.nextElementSibling).toLowerCase()]).filter(Boolean));
      if(stages.size>1)break;
      if(stages.size===1)return {stage:[...stages][0],stageMint:mint,stageSource:'Terminal token header',stageAt:Date.now()};
    }
    return {stage:'unknown',stageMint:mint,stageSource:null,stageAt:null};
  }

  globalThis.RugLensAdapter={read,links,readTrades,route,number,percent,age,BASE58};
})();
