/* Bounded concurrency avoids head-of-line blocking while retaining request spacing. */
export function createQueue({spacing=700,concurrency=2,priorityBurst=3,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const waiting=[];let active=0,next=0,prioritized=0;
 async function run(job){
  active++;
  const delay=Math.max(0,next-now());next=Math.max(next,now())+spacing;
  try{if(delay)await sleep(delay);job.resolve(await job.work());}catch(e){job.reject(e);}finally{active--;drain();}
 }
 function drain(){while(active<concurrency&&waiting.length){
  waiting.sort((a,b)=>a.order-b.order);
  // Selected > New pairs > Final stretch > Migrated. One oldest job after a
  // bounded priority burst prevents a continuous new-pair feed starving others.
  let index=0;
  if(prioritized<priorityBurst)for(let i=1;i<waiting.length;i++)if(waiting[i].priority>waiting[index].priority)index=i;
  const [job]=waiting.splice(index,1);prioritized=index>0?prioritized+1:0;run(job);
 }}
 let order=0;
 return (work,priority=0)=>{
  let job;const promise=new Promise((resolve,reject)=>{job={work,priority,order:order++,resolve,reject};waiting.push(job);drain();});
  promise.promote=value=>{if(Number.isFinite(value))job.priority=Math.max(job.priority,value);};
  return promise;
 };
}
