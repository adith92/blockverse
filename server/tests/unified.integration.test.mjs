import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {WebSocket} from 'ws';
const PORT=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{let p=s.address().port;s.close(()=>resolve(p));});});
const getMessage=ws=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('ws timeout')),4000);ws.once('message',b=>{clearTimeout(timer);resolve(JSON.parse(b.toString()));});});
test('single-origin serves HTML, GLB, WSS route (local ws test), health check and Cengkareng room', {timeout:20000},async()=>{
 const root=mkdtempSync(join(tmpdir(),'blockverse-unified-'));
 const dir=join(root,'assets');mkdirSync(dir,{recursive:true});writeFileSync(join(root,'index.html'),'<!doctype html><html><body>BLOCKVERSE v2</body></html>');
 const model=Buffer.alloc(12);model.write('glTF');model.writeUInt32LE(2,4);model.writeUInt32LE(12,8);writeFileSync(join(dir,'sample.glb'),model);
 const port=await PORT();const origin=`http://127.0.0.1:${port}`;
 const processServer=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),STATIC_ROOT:root,ALLOWED_ORIGINS:origin},stdio:'pipe'});
 let ws;
 try{
  let ready=false;for(let i=0;i<75;i++){
   if(processServer.exitCode!==null)throw new Error('server exited early');
   try{const r=await fetch(origin+'/healthz');if(r.ok){ready=true;break;}}catch{}
   await delay(65);
  }
  assert.ok(ready);
  const html=await fetch(origin+'/');assert.equal(html.status,200);assert.match(await html.text(),/BLOCKVERSE v2/);
  assert.match(html.headers.get('content-type'),/text\/html/);
  const glb=await fetch(origin+'/assets/sample.glb');assert.equal(glb.status,200);assert.equal(glb.headers.get('content-type'),'model/gltf-binary');
  const missing=await fetch(origin+'/assets/missing.glb');assert.equal(missing.status,404);
  const invalid=await fetch(origin+'/assets/%2e%2e/%2e%2e/server/server.mjs');assert.notEqual(invalid.status,200);
  ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  assert.equal((await getMessage(ws)).event,'server:hello');
  ws.send(JSON.stringify({event:'room:join',roomId:'CITY',worldType:'cengkareng',displayName:'Player123',avatar:{torsoColor:'#4CC9F0',headColor:'#FFCB47',limbColor:'#14213D',accessory:'cap'}}));
  const joined=await getMessage(ws);assert.equal(joined.event,'room:joined');assert.equal(joined.roomKey,'CITY:cengkareng');
 }finally{ws?.terminate();processServer.kill('SIGTERM');rmSync(root,{recursive:true,force:true});}
});
