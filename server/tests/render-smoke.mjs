import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
const base=(process.env.BLOCKVERSE_STAGING_URL||'').replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9.-]+$/.test(base))throw Error('Provide HTTPS BLOCKVERSE_STAGING_URL');
const url=base.replace(/^http/,'ws')+'/ws';
async function get(path){const resp=await fetch(base+path,{signal:AbortSignal.timeout(25000)});return resp;}
async function post(path,data){return fetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)});}
function inbox(ws){
 const messages=[];const awaiting=[];
 ws.on('message',raw=>{let x;try{x=JSON.parse(raw.toString());}catch{return;}const listener=awaiting.shift();if(listener)listener(x);else messages.push(x);});
 return ()=>messages.length?Promise.resolve(messages.shift()):new Promise((resolve,reject)=>{
  const waiter=x=>{clearTimeout(id);resolve(x)};
  const id=setTimeout(()=>{const p=awaiting.indexOf(waiter);if(p>=0)awaiting.splice(p,1);reject(Error('WebSocket message timeout'));},20000);
  awaiting.push(waiter);
 });
}
const connections=[];
try{
 let up=false;for(let i=0;i<24;i++){
  try{const r=await get('/healthz');if(r.ok){const j=await r.json();assert.equal(j.ok,true);up=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,8000));
 }
 assert.ok(up,'Render staging never returned healthy /healthz');
 console.log('OK: HTTPS /healthz');
 const home=await get('/');assert.equal(home.status,200);
 const html=await home.text();assert.match(html,/BLOCKVERSE/);
 console.log('OK: game HTML');
 const manifest=await get('/assets/3d/jakarta/manifest.json');assert.equal(manifest.status,200);
 const assets=await manifest.json();assert.equal(assets.assets.length,125);
 console.log('OK: all 125 assets listed in manifest');
 const sample=await get(assets.assets[0].path||'/assets/3d/jakarta/buildings/rumah_kecil_a.glb');
 assert.equal(sample.status,200);assert.ok((await sample.arrayBuffer()).byteLength>100);
 console.log('OK: actual 3D model served');
 const catalog=await get('/api/npc/catalog');assert.equal(catalog.status,200);
 const teachers=await catalog.json();assert.equal(teachers.characters.length,13);assert.equal(teachers.freeformEnabled,false);
 console.log('OK: 13 teachers and freeform disabled');
 const greet=await post('/api/npc/talk',{npcId:'maya',mode:'greeting'});
 assert.equal(greet.status,200);const reply=await greet.json();assert.ok(reply.reply.length>=30);
 assert.equal(reply.engine,'offline-lesson');assert.equal(reply.speechId,null);
 console.log('OK: moderated NPC lesson fallback without uninstalled AI/TTS');
 const quiz=await post('/api/quiz/start',{npcId:'rio',topic:'matematika'});
 assert.equal(quiz.status,200);const question=await quiz.json();assert.equal(question.choices.length,3);
 assert.equal('answer' in question,false);
 const answer=await post('/api/quiz/answer',{quizId:question.quizId,choice:1});
 assert.equal(answer.status,200);const checked=await answer.json();assert.equal(checked.correct,true);
 const replay=await post('/api/quiz/answer',{quizId:question.quizId,choice:0});
 assert.equal(replay.status,404);
 console.log('OK: server-only quiz grading and replay protection');
 for(let i=0;i<2;i++){
  const ws=new WebSocket(url,{origin:base,handshakeTimeout:25000});
  const next=inbox(ws);connections.push(ws);
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  assert.equal((await next()).event,'server:hello');
  ws.send(JSON.stringify({event:'room:join',roomId:'SCHOOL',worldType:'cengkareng',displayName:'Learner'+i,avatar:{torsoColor:'#4CC9F0',headColor:'#FFCB47',limbColor:'#14213D',accessory:'cap'}}));
  let joined=await next();assert.equal(joined.event,'room:joined');
 }
 console.log('OK: two live WebSockets joined same district room');
 console.log('ALL RENDER STAGING SMOKE CHECKS PASSED');
}catch(e){console.error('RENDER STAGING SMOKE FAILED',e);process.exitCode=1;}
finally{for(const ws of connections)ws.terminate();}
