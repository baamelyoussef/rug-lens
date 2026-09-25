// Coalesce confirmed account reads across the curve, holder and mint scanners.
// Transport spacing, HTTP timeouts and rate-limit cooldown remain in rpcRequest.
export function createAccountBatch(call,{windowMs=40,maxAddresses=100,maxPending=120,maxActive=2,timeoutMs=10000}={}){
 const waiting=[];let timer=null,pending=0,active=0;
 const busy=()=>Error('Solana account verifier is busy; retry next scan');
 function supported(method,params){
  if(method!=='getMultipleAccounts'||!Array.isArray(params)||params.length!==2)return false;
  const [addresses,options]=params;
  if(!Array.isArray(addresses)||!addresses.length||addresses.length>maxAddresses||addresses.some(a=>typeof a!=='string'||!a)||!options||options.commitment!=='confirmed'||!['base64','jsonParsed'].includes(options.encoding))return false;
  if(Object.keys(options).some(k=>!['encoding','commitment','minContextSlot','dataSlice'].includes(k)))return false;
  if(options.minContextSlot!==undefined&&(!Number.isSafeInteger(options.minContextSlot)||options.minContextSlot<0))return false;
  if(options.dataSlice!==undefined){const slice=options.dataSlice;if(options.encoding!=='base64'||!slice||Object.keys(slice).some(k=>!['offset','length'].includes(k))||![slice.offset,slice.length].every(v=>Number.isSafeInteger(v)&&v>=0)||slice.offset>Number.MAX_SAFE_INTEGER-slice.length)return false;}
  return true;
 }
 function sliceAccount(account,slice){
  if(!slice||account===null)return account;
  if(!Array.isArray(account?.data)||account.data[1]!=='base64'||typeof account.data[0]!=='string')throw Error('Solana account response cannot satisfy requested data slice');
  const bytes=atob(account.data[0]);
  return {...account,data:[btoa(bytes.slice(slice.offset,slice.offset+slice.length)),'base64']};
 }
 function finish(job,error,result){pending--;if(error)job.reject(error);else job.resolve(result);}
 async function run(jobs,options,addresses){
  if(active>=maxActive){for(const job of jobs)finish(job,busy());return;}
  active++;let timeout;
  const transport=Promise.resolve().then(()=>call('getMultipleAccounts',[addresses,options])).finally(()=>{active--;});
  try{
   const result=await Promise.race([transport,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Solana account batch timed out; retry next scan')),timeoutMs);})]);
   if(!Array.isArray(result?.value)||result.value.length!==addresses.length||!Number.isSafeInteger(result.context?.slot)||result.context.slot<0)throw Error('Incomplete Solana account batch response');
   const accounts=new Map(addresses.map((address,index)=>[address,result.value[index]]));
   for(const job of jobs){
    try{finish(job,null,{...result,value:job.addresses.map(address=>sliceAccount(accounts.get(address),job.slice))});}
    catch(error){finish(job,error);}
   }
  }catch(error){for(const job of jobs)finish(job,error);}
  finally{clearTimeout(timeout);}
 }
 function flush(){
  timer=null;const groups=new Map();
  for(const job of waiting.splice(0)){
   const key=JSON.stringify(job.options);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(job);
  }
  for(const jobs of groups.values()){
   let batch=[],addresses=new Set();
   for(const job of jobs){
    const merged=new Set([...addresses,...job.addresses]);
    if(batch.length&&merged.size>maxAddresses){run(batch,batch[0].options,[...addresses]);batch=[];addresses=new Set(job.addresses);}
    else addresses=merged;
    batch.push(job);
   }
   if(batch.length)run(batch,batch[0].options,[...addresses]);
  }
 }
 return function rpc(method,params){
  if(!supported(method,params))return call(method,params);
  if(pending>=maxPending)return Promise.reject(busy());
  const [addresses,config]=params,options={encoding:config.encoding,commitment:config.commitment};
  if(config.minContextSlot!==undefined)options.minContextSlot=config.minContextSlot;
  // Shared base64 reads request whole accounts. Restore each caller's original
  // dataSlice only in its own reply, preserving account order and common slot.
  pending++;
  const result=new Promise((resolve,reject)=>waiting.push({addresses:[...addresses],options,slice:config.dataSlice?{...config.dataSlice}:null,resolve,reject}));
  if(timer===null)timer=setTimeout(flush,windowMs);
  return result;
 };
}
