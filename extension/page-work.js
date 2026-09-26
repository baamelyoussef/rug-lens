(() => {
  // Cooperative main-thread work. No timeout forces analysis into a busy frame.
  function create(options={}){
    const now=options.now||(()=>performance.now());
    const idle=options.idle||globalThis.requestIdleCallback?.bind(globalThis);
    const cancelIdle=options.cancelIdle||globalThis.cancelIdleCallback?.bind(globalThis);
    const later=options.later||setTimeout,cancelLater=options.cancelLater||clearTimeout;
    const canRun=options.canRun||(()=>true),ready=options.ready||(()=>document.readyState==='complete');
    const jobs=new Map();let handle=null,wake=null,blockedUntil=now()+(options.startupDelay??1500),running=false;
    function schedule(){
      if(running||handle!==null||wake!==null||!jobs.size||!canRun())return;
      const delay=blockedUntil-now();
      if(delay>0||!ready()){wake=later(()=>{wake=null;schedule();},Math.max(50,delay,ready()?0:250));return;}
      if(idle)handle=idle(drain);else wake=later(()=>{wake=null;drain({timeRemaining:()=>5});},50);
    }
    function drain(deadline){
      handle=null;if(!canRun())return;
      if(now()<blockedUntil||!ready()||deadline.timeRemaining()<5){wake=later(()=>{wake=null;schedule();},100);return;}
      running=true;const started=now();let count=0;
      try{
        while(jobs.size&&count<2&&now()-started<4&&deadline.timeRemaining()>=5&&canRun()&&now()>=blockedUntil){
          const [key,job]=jobs.entries().next().value;jobs.delete(key);count++;job();
        }
      }finally{
        running=false;
        if(jobs.size){wake=later(()=>{wake=null;schedule();},16);}
      }
    }
    return {
      post(key,job){jobs.set(key,job);schedule();},
      pause(ms=350){blockedUntil=Math.max(blockedUntil,now()+ms);},
      clear(){jobs.clear();if(handle!==null)cancelIdle?.(handle);if(wake!==null)cancelLater(wake);handle=null;wake=null;},
      resume:schedule
    };
  }
  globalThis.RugLensWork={create};
})();
