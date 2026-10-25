import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createQuizApi,QUIZ_BANK} from '../education-quiz.mjs';
test('Quiz subjects cover the whole school curriculum with private answer keys',()=>{
 assert.equal(QUIZ_BANK.length,10);
 assert.equal(new Set(QUIZ_BANK.map(q=>q.topic)).size,10);
 for(const q of QUIZ_BANK){assert.equal(q.choices.length,3);assert.ok(q.answer>=0&&q.answer<3);}
});
test('server quiz never exposes correct answer and rejects replay/foreign origins',async()=>{
 const handle=createQuizApi();
 const server=http.createServer(async(req,res)=>{if(!(await handle(req,res,['http://localhost:5173']))){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(route,data,origin='http://localhost:5173')=>fetch(base+route,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(data)});
 try{
  const start=await post('/api/quiz/start',{npcId:'rio',topic:'matematika'});
  assert.equal(start.status,200);
  const q=await start.json();assert.equal(q.topic,'matematika');
  assert.equal(q.choices.length,3);assert.equal('answer' in q,false);assert.equal('correct' in q,false);
  const wrong=await post('/api/quiz/answer',{quizId:q.quizId,choice:0});
  assert.equal(wrong.status,200);const outcome=await wrong.json();assert.equal(outcome.correct,false);
  assert.equal(outcome.noPoints,true);assert.equal(typeof outcome.explanation,'string');
  const replay=await post('/api/quiz/answer',{quizId:q.quizId,choice:1});
  assert.equal(replay.status,404);
  const b=await post('/api/quiz/start',{npcId:'rio',topic:'matematika'});
  const second=await b.json();const good=await post('/api/quiz/answer',{quizId:second.quizId,choice:1});
  assert.equal((await good.json()).correct,true);
  const denied=await post('/api/quiz/start',{npcId:'rio'},'https://evil.example');
  assert.equal(denied.status,403);
  const absent=await post('/api/quiz/start',{npcId:'not-here'});
  assert.equal(absent.status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});