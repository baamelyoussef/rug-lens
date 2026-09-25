chrome.storage.local.get({enabled:true,external:true},prefs=>{for(const id of ['enabled','external'])document.getElementById(id).checked=prefs[id];});
for(const id of ['enabled','external'])document.getElementById(id).addEventListener('change',async e=>{await chrome.storage.local.set({[id]:e.target.checked});document.getElementById('status').textContent='Saved';});
document.getElementById('export-history').addEventListener('click',async()=>{
  const status=document.getElementById('status');
  try{
    const {scanJournal=[]}=await chrome.storage.local.get('scanJournal');
    const snapshots=scanJournal.filter(s=>s.at>=Date.now()-7*86400000);
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),scope:'Local observed evidence, not validated predictions or trading outcomes',snapshots},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`rug-lens-scans-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`Exported ${snapshots.length} snapshots`;
  }catch{status.textContent='Could not export local snapshots';}
});
