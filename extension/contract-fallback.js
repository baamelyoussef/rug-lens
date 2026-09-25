import {rpc} from './chain-scan.js';
import {decodePumpPool} from './pool-resolution.js';
import {valid} from './providers.js';
const SPL='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',TOKEN2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ZERO='11111111111111111111111111111111',SOURCE='Solana RPC confirmed mint account';
const supportedExtensions=new Set(['transferFeeConfig','defaultAccountState','nonTransferable','permanentDelegate','transferHook','metadataPointer','tokenMetadata','groupPointer','groupMemberPointer','tokenGroup','tokenGroupMember','pausableConfig']);
function publicKey(value){
 if(!valid(value))return false;
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n;
 for(const ch of value)n=n*58n+BigInt(alphabet.indexOf(ch));
 let size=0;while(n){size++;n/=256n;}for(const ch of value){if(ch!=='1')break;size++;}return size===32;
}
const authority=v=>v===null||publicKey(v),active=v=>v!==null&&v!==ZERO;
// Schema: github.com/anza-xyz/agave/blob/master/account-decoder-client-types/src/token.rs
// Match Agave's jsonParsed UiMint / UiExtension schema. Missing or unparseable
// Token-2022 extension lists never imply that dangerous controls are absent.
export function decodeMintAccount(mint,account,{slot,at=Date.now()}={}){
 if(!publicKey(mint)||![SPL,TOKEN2022].includes(account?.owner)||account.executable!==false)throw Error('Address is not a verified SPL token mint');
 const parsed=account.data?.parsed,info=parsed?.info;
 if(!['spl-token','spl-token-2022'].includes(account.data?.program)||parsed?.type!=='mint'||info?.isInitialized!==true||!authority(info.mintAuthority)||!authority(info.freezeAuthority)||!Number.isInteger(info.decimals)||info.decimals<0||info.decimals>255||!/^\d+$/.test(info.supply||'')||BigInt(info.supply)>18446744073709551615n)throw Error('RPC did not return a complete initialized mint account');
 const metrics={mintActive:info.mintAuthority!==null,freezeActive:info.freezeAuthority!==null},issues=[];
 const clear={permanentDelegate:false,transferHook:false,pausable:false,paused:false,nonTransferable:false,defaultFrozen:false,feeMutable:false,transferFeePct:0};
 if(account.owner===SPL)Object.assign(metrics,clear);
 else {
  const extensions=Array.isArray(info.extensions)?info.extensions:null;
  const complete=extensions!==null&&extensions.every(e=>e&&supportedExtensions.has(e.extension))&&new Set(extensions.map(e=>e.extension)).size===extensions.length;
  if(!complete)issues.push('Token-2022 extension coverage is incomplete; absent controls were not cleared');
  const byName=new Map((extensions||[]).filter(e=>e&&typeof e.extension==='string'&&extensions.filter(other=>other?.extension===e.extension).length===1).map(e=>[e.extension,e.state]));
  const groups=[['permanentDelegate',['permanentDelegate']],['transferHook',['transferHook']],['pausableConfig',['pausable','paused']],['nonTransferable',['nonTransferable']],['defaultAccountState',['defaultFrozen']],['transferFeeConfig',['feeMutable','transferFeePct']]];
  if(complete)for(const [name,keys]of groups)if(!byName.has(name))for(const key of keys)metrics[key]=clear[key];
  const delegate=byName.get('permanentDelegate');if(authority(delegate?.delegate))metrics.permanentDelegate=active(delegate.delegate);
  const hook=byName.get('transferHook');if(authority(hook?.programId)&&authority(hook?.authority))metrics.transferHook=active(hook.programId)||active(hook.authority);
  const pause=byName.get('pausableConfig');if(authority(pause?.authority))metrics.pausable=active(pause.authority);if(typeof pause?.paused==='boolean')metrics.paused=pause.paused;
  if(byName.has('nonTransferable'))metrics.nonTransferable=true;
  const state=byName.get('defaultAccountState')?.accountState;if(state==='initialized'||state==='frozen')metrics.defaultFrozen=state==='frozen';
  const fee=byName.get('transferFeeConfig');if(authority(fee?.transferFeeConfigAuthority))metrics.feeMutable=active(fee.transferFeeConfigAuthority);
  const older=fee?.olderTransferFee?.transferFeeBasisPoints,newer=fee?.newerTransferFee?.transferFeeBasisPoints;
  if(Number.isInteger(older)&&older>=0&&older<=10000&&older===newer)metrics.transferFeePct=older/100;
  else if(fee)issues.push('Transfer fee schedules differ or are incomplete; current fee was not inferred');
  const metadata=byName.get('tokenMetadata');if(metadata?.mint===mint&&authority(metadata?.updateAuthority))metrics.metadataMutable=active(metadata.updateAuthority);
 }
 const sources=Object.fromEntries(Object.keys(metrics).map(key=>[{mintActive:'mint',freezeActive:'freeze',transferFeePct:'transferFee',metadataMutable:'metadata'}[key]||key,SOURCE]));
 return {mint,metrics,sources,holders:[],holdersTopComplete:false,providerWarnings:[],errors:issues,at,
  contractSource:SOURCE,contractSlot:Number.isSafeInteger(slot)?slot:undefined,tokenProgram:account.owner,tokenSupply:{raw:info.supply,decimals:info.decimals},partial:true};
}

// A single shared batch covers newly launched mints the report indexer has not
// reached yet. It also identifies PumpSwap pool addresses without a second RPC.
export function createContractFallback({call=rpc,windowMs=50,ttl=25000,failureTtl=3000,maxPending=120,now=Date.now}={}){
 const cache=new Map(),pending=new Map(),waiting=new Map();let timer=null,active=false;
 function schedule(){if(timer===null&&!active&&waiting.size)timer=setTimeout(flush,windowMs);}
 function remember(mint,data){cache.delete(mint);cache.set(mint,data);while(cache.size>200)cache.delete(cache.keys().next().value);}
 async function flush(){
  timer=null;active=true;const batch=[...waiting.entries()].slice(0,50);for(const [mint]of batch)waiting.delete(mint);
  try{
   const result=await call('getMultipleAccounts',[batch.map(([mint])=>mint),{encoding:'jsonParsed',commitment:'confirmed'}]);
   if(!Array.isArray(result?.value)||result.value.length!==batch.length)throw Error('Incomplete mint account response');
   const at=now();batch.forEach(([mint,job],index)=>{
    let data;try{
     const account=result.value[index],resolved=decodePumpPool(account);
     data=resolved?{mint:resolved,resolution:{address:mint,mint:resolved,source:'Solana PumpSwap pool account'},at}:decodeMintAccount(mint,account,{slot:result.context?.slot,at});
    }catch(e){data={error:e.message,at};}
    remember(mint,data);pending.delete(mint);job.resolve(data);
   });
  }catch(e){for(const [mint,job]of batch){const data={error:e?.message||'Direct mint verification unavailable',at:now()};remember(mint,data);pending.delete(mint);job.resolve(data);}}
  finally{active=false;schedule();}
 }
 return function load(mint,{force=false}={}){
  if(!publicKey(mint))return Promise.resolve({error:'Invalid Solana mint address',at:now()});
  if(pending.has(mint))return pending.get(mint);
  const cached=cache.get(mint);if(!force&&cached&&now()-cached.at<(cached.error?failureTtl:ttl))return Promise.resolve(cached);
  if(pending.size>=maxPending)return Promise.resolve({error:'Direct mint verification queue full; retry shortly',at:now()});
  const promise=new Promise(resolve=>waiting.set(mint,{resolve}));pending.set(mint,promise);schedule();return promise;
 };
}
