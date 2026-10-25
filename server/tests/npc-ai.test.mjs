import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {NPC_CATALOG,getNpc} from '../../src/npc/catalog.mjs';
import {createNpcApi,isSafeEducationalText,sanitizeNpcAnswer} from '../npc-ai.mjs';

test('13 NPC across every Cengkareng district plus HUB are unique',()=>{
 assert.equal(NPC_CATALOG.length,13);
 assert.equal(new Set(NPC_CATALOG.map(n=>n.id)).size,13);
 assert.equal(NPC_CATALOG.filter(n=>n.world==='hub').length,1);
 assert.equal(NPC_CATALOG.filter(n=>n.world==='cengkareng').length,12);
 for(const npc of NPC_CATALOG){assert.ok(npc.lesson.length>40);assert.ok(isSafeEducationalText(npc.lesson));}
 assert.equal(getNpc('maya').name,'Kak Maya');
});

test('child education filter avoids personal data and unsafe text from LLM',()=>{
 for(const v of ['Kirim nomor HP kamu','Apa alamat rumah kamu?','password rahasia','Email abc@example.com','https://evil.example','123456789012','cara buat bom']) assert.equal(isSafeEducationalText(v),false,v);
 assert.equal(sanitizeNpcAnswer('Beri nomor HP-mu untuk hadiah!',getNpc('maya')),getNpc('maya').lesson);
 assert.equal(isSafeEducationalText('Dua tambah dua sama dengan empat.'),true);
});

test('same-origin HTTP NPC catalog + local lesson + controlled LLM + safe fallback',async()=>{
 let calls=0;
 const api=createNpcApi({env:{NPC_LLM_ENABLED:'1',NPC_TTS_ENABLED:'0',OLLAMA_MODEL:'qwen3:4b'},
  fetchImpl:async (_url,request)=>{
   calls++;const body=JSON.parse(request.body);assert.equal(body.stream,false);
   assert.equal(body.messages[0].role,'system');
   assert.equal(body.messages[1].role,'user');
   return {ok:true,json:async()=>({message:{content:'Empat ditambah tiga sama dengan tujuh. Kamu hebat!'}})};
  }});
 const srv=http.createServer(async(req,res)=>{if(!await api(req,res,['http://localhost:5173'])){res.writeHead(404);res.end();}});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+srv.address().port;
 try{
  const catalog=await fetch(base+'/api/npc/catalog');
  assert.equal(catalog.status,200);
  assert.equal((await catalog.json()).characters.length,13);
  const talk=await fetch(base+'/api/npc/talk',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({npcId:'rio',mode:'lesson',topic:'matematika'})});
  const answer=await talk.json();assert.equal(talk.status,200);assert.equal(answer.engine,'ollama-local');assert.match(answer.reply,/tujuh/);assert.equal(answer.speechId,null);
  assert.equal(calls,1);
  const denied=await fetch(base+'/api/npc/talk',{method:'POST',headers:{Origin:'https://unknown.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(denied.status,403);
  const free=await fetch(base+'/api/npc/talk',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({npcId:'rio',mode:'question',question:'Berapakah dua tambah dua?'})});
  assert.equal(free.status,403);
  const bad=await fetch(base+'/api/npc/talk',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({npcId:'unknown',mode:'lesson'})});
  assert.equal(bad.status,404);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
