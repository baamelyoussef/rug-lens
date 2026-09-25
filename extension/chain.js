/* Static transaction evidence: never equate a shared service or a tip with ownership. */
import {valid} from './providers.js';
const NATIVE='So11111111111111111111111111111111111111112';
const TOKEN=new Set(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']);
export function inspectTransaction(tx,mint){
  if(!tx?.meta||tx.meta.err!==null)return null;
  const message=tx.transaction?.message,keys=message?.accountKeys;
  if(!Array.isArray(keys)||!keys.every(k=>valid(k.pubkey)))return null;
  const signature=tx.transaction.signatures?.[0];
  if(!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature||''))return null;
  const payer=keys[0]?.pubkey,signers=new Set(keys.filter(k=>k.signer).map(k=>k.pubkey));
  const ix=[...(message.instructions||[]),...(tx.meta.innerInstructions||[]).flatMap(g=>g.instructions||[])];
  const native=new Set();
  for(const b of [...tx.meta.preTokenBalances||[],...tx.meta.postTokenBalances||[]])if(b.mint===NATIVE&&keys[b.accountIndex])native.add(keys[b.accountIndex].pubkey);
  for(const i of ix){const p=i.parsed;if(!p)continue;
    if(TOKEN.has(i.programId)&&['initializeAccount','initializeAccount2','initializeAccount3'].includes(p.type)&&p.info?.mint===NATIVE)native.add(p.info.account);
    if(i.programId==='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'&&['create','createIdempotent'].includes(p.type)&&p.info?.mint===NATIVE)native.add(p.info.account);
  }
  const closures=[];
  for(const i of ix){const p=i.parsed,info=p?.info;
    if(!TOKEN.has(i.programId)||p?.type!=='closeAccount'||!native.has(info?.account))continue;
    const {destination,owner}=info,idx=keys.findIndex(k=>k.pubkey===destination);
    const before=tx.meta.preBalances?.[idx],after=tx.meta.postBalances?.[idx];
    if(!valid(destination)||!valid(owner)||owner===destination||!signers.has(owner)||!signers.has(payer)||payer===destination)continue;
    // Destination balance gain is corroboration only, never attributed entirely to this closure.
    if(!Number.isSafeInteger(before)||!Number.isSafeInteger(after)||after-before<5e6)continue;
    closures.push({destination,owner,payer,signature,slot:tx.slot});
  }
  const amounts=new Map();
  for(const [field,sign] of [['preTokenBalances',-1n],['postTokenBalances',1n]])for(const b of tx.meta[field]||[]){
    if(b.mint!==mint||!valid(b.owner)||!/^\d+$/.test(b.uiTokenAmount?.amount||''))continue;
    amounts.set(b.owner,(amounts.get(b.owner)||0n)+sign*BigInt(b.uiTokenAmount.amount));
  }
  const buyers=[...amounts].filter(([owner,delta])=>delta>0n&&signers.has(owner)).map(([owner])=>owner);
  return {signature,payer,closures,buyers,slot:tx.slot};
}
export function summarizeChain(transactions,holders,mint,creator){
  const hs=new Map(holders.filter(h=>valid(h.address)&&Number.isFinite(h.pct)&&h.pct>=0&&h.pct<=100&&!h.isPool).map(h=>[h.address,h]));
  const rows=[...new Map(transactions.map(t=>inspectTransaction(t,mint)).filter(Boolean).map(t=>[t.signature,t])).values()];
  const groups=new Map(),joint=[];
  for(const row of rows){
    for(const c of row.closures)if(hs.has(c.destination)){
      const g=groups.get(c.payer)||new Map();g.set(c.destination,c);groups.set(c.payer,g);
    }
    const buyers=row.buyers.filter(w=>hs.has(w));
    if(buyers.length>=3)joint.push({signature:row.signature,wallets:buyers,supply:buyers.reduce((n,w)=>n+hs.get(w).pct,0)});
  }
  const closureGroups=[...groups].map(([payer,cs])=>({payer,wallets:[...cs.keys()],supply:[...cs.keys()].reduce((n,w)=>n+hs.get(w).pct,0),creatorLinked:valid(creator)&&payer===creator,signatures:[...new Set([...cs.values()].map(c=>c.signature))]})).filter(g=>g.wallets.length>=3).sort((a,b)=>b.supply-a.supply);
  return {closureGroups,jointBuys:joint.sort((a,b)=>b.supply-a.supply),parsed:rows.length};
}
