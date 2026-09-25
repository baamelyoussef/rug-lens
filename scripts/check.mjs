import {readFileSync,readdirSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(readFileSync('extension/manifest.json'));
for(const f of readdirSync('extension').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',`extension/${f}`]);
for(const f of [...manifest.content_scripts[0].js,manifest.background.service_worker,manifest.action.default_popup])if(!existsSync(`extension/${f}`))throw Error(`Missing ${f}`);
if(manifest.manifest_version!==3)throw Error('Manifest v3 required');
console.log('Syntax and manifest references OK');
