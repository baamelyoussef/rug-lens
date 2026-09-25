import {rpc} from './chain-scan.js';
const AMM='pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
const discriminator=[241,154,109,4,17,177,109,188];
function base58(bytes){
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n,out='';
 for(const b of bytes)n=n*256n+BigInt(b);
 while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}
 for(const b of bytes){if(b!==0)break;out='1'+out;}return out;
}
// Official pump-public-docs/idl/pump_amm.json: discriminator, u8, u16, creator, base_mint.
export function decodePumpPool(account){
 if(account?.owner!==AMM||account.executable!==false||account.data?.[1]!=='base64')return null;
 let bytes;try{bytes=Uint8Array.from(atob(account.data[0]),c=>c.charCodeAt(0));}catch{return null;}
 if(bytes.length<211||!discriminator.every((b,i)=>bytes[i]===b))return null;
 return base58(bytes.slice(43,75));
}
export async function resolvePumpPool(address,call=rpc){
 const result=await call('getAccountInfo',[address,{encoding:'base64',commitment:'confirmed'}]);
 return decodePumpPool(result?.value);
}
