import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createNpcApi} from '../npc-ai.mjs';

test('Piper speech path accepts only one-time server-issued ids',async()=>{
 const fakeWav=Buffer.alloc(48);fakeWav.write('RIFF',0);fakeWav.write('WAVE',8);
 let spoken='';
 const api=createNpcApi({env:{NPC_LLM_ENABLED:'0',NPC_TTS_ENABLED:'1',PIPER_VOICE_MODEL:'/tmp/voice.onnx'},
   ttsImpl:async text=>{spoken=text;return fakeWav;}});
 const server=http.createServer(async(req,res)=>{
  if(!await api(req,res,['http://localhost:5173'])){res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const headers={Origin:'http://localhost:5173'};
 try{
  const ask=await fetch(base+'/api/npc/talk',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({npcId:'maya',mode:'greeting'})});
  assert.equal(ask.status,200);
  const result=await ask.json();assert.match(result.speechId,/^[0-9a-f-]{36}$/);
  const wrong=await fetch(base+'/api/npc/speech/00000000-0000-0000-0000-000000000000',{headers});
  assert.equal(wrong.status,404);
  const r=await fetch(base+'/api/npc/speech/'+result.speechId,{headers:{'Sec-Fetch-Site':'same-origin'}});
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/audio\/wav/);
  assert.equal((await r.arrayBuffer()).byteLength,48);
  assert.equal(spoken,result.reply);
  const replay=await fetch(base+'/api/npc/speech/'+result.speechId,{headers});
  assert.equal(replay.status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
