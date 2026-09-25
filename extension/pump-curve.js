const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',ZERO='11111111111111111111111111111111';
const DISCRIMINATOR=[23,183,248,55,96,216,172,96],ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SOURCE='Solana confirmed Pump bonding curve: canonical mint PDA, program owner and account discriminator';
const P=(1n<<255n)-19n,D=37095705934669439343138083508754565189542113879843219016388785533085940283555n;
const mod=n=>((n%P)+P)%P;
function pow(base,exponent){let result=1n;base=mod(base);while(exponent){if(exponent&1n)result=result*base%P;base=base*base%P;exponent>>=1n;}return result;}
function encode(bytes){let n=0n,out='';for(const b of bytes)n=n*256n+BigInt(b);while(n){out=ALPHABET[Number(n%58n)]+out;n/=58n;}for(const b of bytes){if(b!==0)break;out='1'+out;}return out;}
function decode(value){
 if(typeof value!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))throw Error('Invalid address');
 let n=0n;for(const ch of value)n=n*58n+BigInt(ALPHABET.indexOf(ch));
 const bytes=new Uint8Array(32);for(let i=31;i>=0;i--){bytes[i]=Number(n%256n);n/=256n;}
 if(n||encode(bytes)!==value)throw Error('Invalid address');return bytes;
}
// Edwards25519 decompression existence test: x²=(y²-1)/(d*y²+1).
// Euler's criterion on numerator*denominator has the same quadratic character
// as their ratio. Canonical y / x=0 sign checks match @solana/web3.js's decoder.
// This only classifies public hashes for PDAs; no signing/key operations occur.
export function isEd25519Point(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==32)return false;
 let y=BigInt(bytes[31]&127);for(let i=30;i>=0;i--)y=y*256n+BigInt(bytes[i]);
 if(y>=P)return false;
 const y2=y*y%P,numerator=mod(y2-1n),denominator=mod(D*y2+1n);
 if(denominator===0n)return false;
 if(numerator===0n)return !(bytes[31]&128);
 return pow(numerator*denominator,(P-1n)/2n)===1n;
}
const pdaCache=new Map();
// Solana derivation: SHA256(seeds || bump || program || "ProgramDerivedAddress"),
// first off-curve result for bumps 255..0. Official reference:
// github.com/solana-labs/solana-web3.js/blob/maintenance/v1.x/src/publickey.ts
export async function derivePumpCurveAddress(mint){
 if(pdaCache.has(mint))return pdaCache.get(mint);
 const mintBytes=decode(mint),program=decode(PUMP),prefix=new TextEncoder().encode('bonding-curve'),marker=new TextEncoder().encode('ProgramDerivedAddress');
 const input=new Uint8Array(prefix.length+32+1+32+marker.length);let offset=0;
 input.set(prefix,offset);offset+=prefix.length;input.set(mintBytes,offset);offset+=32;const bumpOffset=offset;offset++;input.set(program,offset);offset+=32;input.set(marker,offset);
 for(let bump=255;bump>=0;bump--){
  input[bumpOffset]=bump;const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',input));
  if(!isEd25519Point(hash)){const address=encode(hash);pdaCache.set(mint,address);while(pdaCache.size>500)pdaCache.delete(pdaCache.keys().next().value);return address;}
 }
 throw Error('No canonical Pump curve address');
}
const u64=(bytes,offset)=>{let n=0n;for(let i=offset+7;i>=offset;i--)n=n*256n+BigInt(bytes[i]);return n;};

// Current layout and legacy trailing-field defaults are documented in:
// https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json
// https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md
// In particular quote_mint=Pubkey::default() (including legacy absent field)
// means native SOL. A nonzero quote mint MUST NOT be valued as SOL.
export async function verifyPumpCurve(mint,address,account,slot,at){
 try{
  if(account?.owner!==PUMP||account.executable!==false||account.data?.[1]!=='base64'||typeof account.data[0]!=='string')return null;
  decode(mint);decode(address);
  const bytes=Uint8Array.from(atob(account.data[0]),c=>c.charCodeAt(0));
  if(bytes.length<49||!DISCRIMINATOR.every((b,i)=>bytes[i]===b))return null;
  // Legacy accounts can stop at field boundaries. A partial pubkey/u64 is not
  // a supported legacy layout, and must not silently become a zero field.
  if(bytes.length<125&&![49,81,82,83,115,123,124].includes(bytes.length))return null;
  if(account.space!==undefined&&account.space!==bytes.length)return null;
  for(const offset of [48,81,82,123,124])if(bytes.length>offset&&bytes[offset]>1)return null;
  if(!Number.isSafeInteger(slot)||slot<0||!Number.isFinite(at)||at<=0)return null;
  if(await derivePumpCurveAddress(mint)!==address)return null;
  const virtualToken=u64(bytes,8),virtualQuote=u64(bytes,16),realToken=u64(bytes,24),realQuote=u64(bytes,32),supply=u64(bytes,40);
  if(supply===0n||realToken>supply||realToken>virtualToken||realQuote>virtualQuote)return null;
  const complete=bytes[48]===1;
  if(complete&&realToken!==0n)return null;
  const quoteMint=bytes.length>=115?encode(bytes.slice(83,115)):ZERO,quoteIsNativeSol=quoteMint===ZERO;
  return {status:'verified',mint,address,program:'pump',complete,
   realTokenReservesRaw:realToken.toString(),realQuoteReservesRaw:realQuote.toString(),virtualTokenReservesRaw:virtualToken.toString(),virtualQuoteReservesRaw:virtualQuote.toString(),tokenSupplyRaw:supply.toString(),
   quoteMint,quoteIsNativeSol,...(quoteIsNativeSol?{quoteDecimals:9,...(realQuote<=BigInt(Number.MAX_SAFE_INTEGER)?{realQuoteSol:Number(realQuote)/1e9}:{})}:{}),
   creator:bytes.length>=81?encode(bytes.slice(49,81)):ZERO,mayhem:bytes.length>=82?bytes[81]===1:false,cashback:bytes.length>=83?bytes[82]===1:false,
   creatorFeeBpsRaw:bytes.length>=123?u64(bytes,115).toString():'0',holderReward:bytes.length>=125?bytes[124]===1:false,
   slot,at,source:SOURCE};
 }catch{return null;}
}
