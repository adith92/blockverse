import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {WebSocket} from 'ws';
import {setTimeout as delay} from 'node:timers/promises';

function getOpenPort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});s.on('error',reject);});}
function mailbox(socket){const pending=[];const backlog=[];socket.on('message',raw=>{let message;try{message=JSON.parse(String(raw));}catch{return;}const hit=pending.findIndex(p=>p.event===message.event);if(hit!==-1){const req=pending.splice(hit,1)[0];clearTimeout(req.timer);req.resolve(message);}else backlog.push(message);});return {wait(event,ms=5000){const i=backlog.findIndex(x=>x.event===event);if(i!==-1)return Promise.resolve(backlog.splice(i,1)[0]);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{const i=pending.findIndex(p=>p.resolve===resolve);if(i!==-1)pending.splice(i,1);reject(new Error(`Timed out waiting ${event}`));},ms);pending.push({event,resolve,timer});});}};}
async function open(port,origin='http://localhost:5173'){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});return {ws,box:mailbox(ws)};}
const defaultAvatar={torsoColor:'#4CC9F0',headColor:'#FFCB47',limbColor:'#14213D',accessory:'cap'};
function join(client,id='FRIENDS1'){client.ws.send(JSON.stringify({event:'room:join',roomId:id,worldType:'hub',displayName:'Player123',avatar:defaultAvatar}));return client.box.wait('room:joined');}

test('VPS two-client realtime, safe emote, capacity 16, and leave event', {timeout:30000}, async()=>{
 const port=await getOpenPort();
 const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),ALLOWED_ORIGINS:'http://localhost:5173'},stdio:'pipe'});
 const clients=[];
 try{
  let ready=false;for(let i=0;i<80;i++){if(server.exitCode!==null)throw new Error('server terminated early');try{const x=await fetch(`http://127.0.0.1:${port}/healthz`);if(x.ok){ready=true;break;}}catch{}await delay(80);}assert.ok(ready,'VPS server health endpoint is ready');
  const a=await open(port);clients.push(a);const aj=await join(a);assert.equal(aj.capacity,16);assert.ok(aj.playerId.startsWith('p_'));
  const b=await open(port);clients.push(b);const bjoin=await join(b);assert.equal(bjoin.players.length,1);const peerJoined=await a.box.wait('player:join');assert.equal(peerJoined.player.playerId,bjoin.playerId);
  a.ws.send(JSON.stringify({event:'player:move',position:[3,1.2,4],rotY:0.3}));const moved=await b.box.wait('player:move');assert.deepEqual(moved.player.position,[3,1.2,4]);assert.equal(moved.player.playerId,aj.playerId);
  b.ws.send(JSON.stringify({event:'emote:send',code:'WAVE'}));const emote=await a.box.wait('emote:send');assert.equal(emote.code,'WAVE');
  for(let i=0;i<14;i++){const p=await open(port);clients.push(p);const j=await join(p);assert.equal(j.capacity,16);}
  const overflow=await open(port);clients.push(overflow);
  overflow.ws.send(JSON.stringify({event:'room:join',roomId:'FRIENDS1',worldType:'hub',displayName:'Player999',avatar:defaultAvatar}));
  const rejected=await overflow.box.wait('room:error');assert.equal(rejected.code,'room_full');
  b.ws.close();const left=await a.box.wait('player:left');assert.equal(left.playerId,bjoin.playerId);
 }finally{
  for(const c of clients)try{c.ws.terminate();}catch{}
  server.kill('SIGTERM');
  await delay(100);
 }
});
