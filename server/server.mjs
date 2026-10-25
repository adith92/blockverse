import http from 'node:http';
import {WebSocketServer, WebSocket} from 'ws';
import {randomUUID} from 'node:crypto';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MAX_PLAYERS,ALLOWED_WORLDS,ALLOWED_EMOTES,roomId,displayName,avatar,position,rotation,originAllowed} from './validation.mjs';

const port = Number(process.env.PORT || 3001);
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('Invalid PORT');
const allowedOrigins = (process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://localhost:4173').split(',').map(x=>x.trim()).filter(Boolean);
const siteRoot=resolve(process.env.STATIC_ROOT||fileURLToPath(new URL('../dist/',import.meta.url)));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
if(!allowedOrigins.length) throw new Error('ALLOWED_ORIGINS must not be empty');
const rooms = new Map();
const connectionsByIp = new Map();
const startedAt=Date.now();
const server=http.createServer((req,res)=>{
  if (req.url === '/healthz' || req.url === '/readyz'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({ok:true,service:'blockverse-multiplayer',uptimeSeconds:Math.floor((Date.now()-startedAt)/1000),rooms:rooms.size}));return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD'){res.writeHead(405);res.end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(pathname.includes('\0')||pathname.split('/').includes('..')){res.writeHead(403);res.end();return;}
  let path=resolve(siteRoot,'.'+(pathname==='/'?'/index.html':pathname));
  if(path!==siteRoot && !path.startsWith(siteRoot+sep)){res.writeHead(403);res.end();return;}
  if(!existsSync(path)||!statSync(path).isFile()){
    // Reject unknown URLs instead of serving index.html for normalized traversal attempts.
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;
  }
  if(!existsSync(path)){res.writeHead(503,{'Content-Type':'text/plain'});res.end('Frontend build unavailable');return;}
  const ext=extname(path).toLowerCase();
  res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff',
    'Cache-Control':ext==='.html'?'no-store':'public, max-age=3600'});
  if(req.method==='HEAD'){res.end();return;}
  createReadStream(path).on('error',()=>res.destroy()).pipe(res);
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
function send(ws,event,data={}){if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({event,...data}));}
function broadcast(room,ex,event,data){for(const member of room.values())if(member.ws!==ex)send(member.ws,event,data);}
function leave(state){if(!state.roomKey)return;const r=rooms.get(state.roomKey);if(r){r.delete(state.id);broadcast(r,state.ws,'player:left',{playerId:state.id});if(r.size===0) rooms.delete(state.roomKey);}state.roomKey=null;}
function join(state,pkt){const id=roomId(pkt.roomId);const world=pkt.worldType;const name=displayName(pkt.displayName);const look=avatar(pkt.avatar);if(!id||!ALLOWED_WORLDS.has(world)||!name||!look){send(state.ws,'room:error',{code:'invalid_join'});return;}
 const key=`${id}:${world}`;if(state.roomKey!==key)leave(state);let r=rooms.get(key);if(!r){r=new Map();rooms.set(key,r);}if(!r.has(state.id)&&r.size>=MAX_PLAYERS){send(state.ws,'room:error',{code:'room_full'});return;}
 state.roomKey=key;state.name=name;state.avatar=look;state.position=[0,2,16];state.rotY=0;state.lastMove=0;state.lastChat=0;
 const others=[...r.values()].filter(p=>p.id!==state.id).map(snapshot);r.set(state.id,state);
 send(state.ws,'room:joined',{roomKey:key,playerId:state.id,capacity:MAX_PLAYERS,players:others});broadcast(r,state.ws,'player:join',{player:snapshot(state)});
}
function snapshot(s){return {playerId:s.id,roomKey:s.roomKey,displayName:s.name,position:s.position,rotY:s.rotY,avatar:s.avatar,timestamp:Date.now()};}
server.on('upgrade',(req,socket,head)=>{
 const origin=req.headers.origin;
 if(req.url?.split('?')[0]!=='/ws'|| !originAllowed(origin,allowedOrigins)) {socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
 const ip=req.socket.remoteAddress||'unknown';const count=connectionsByIp.get(ip)||0;
 if(count>=24){socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>{connectionsByIp.set(ip,count+1);ws.ip=ip;wss.emit('connection',ws,req);});
});
wss.on('connection',ws=>{
 const state={id:`p_${randomUUID().replaceAll('-','').slice(0,12)}`,roomKey:null,name:'Player',avatar:null,position:[0,2,16],rotY:0,ws,lastMove:0,lastChat:0,alive:true};
 ws.__state=state;
 ws.on('pong',()=>{state.alive=true;});
 ws.on('message',raw=>{
  let pkt;try{pkt=JSON.parse(String(raw));}catch{send(ws,'room:error',{code:'invalid_json'});return;}
  if(!pkt||typeof pkt!=='object'||Array.isArray(pkt))return;
  if(pkt.event==='room:join'){join(state,pkt);return;}
  const room=rooms.get(state.roomKey);if(!room)return;
  if(pkt.event==='player:move'){
   const now=Date.now();if(now-state.lastMove<55)return;
   const pos=position(pkt.position),rot=rotation(pkt.rotY);
   if(!pos||rot===null)return;
   // Reject obviously impossible teleports per message, yet allow the game's respawn/world resets.
   // World-specific collisions/race results are NOT authoritative here.
   state.lastMove=now;state.position=pos;state.rotY=rot;
   broadcast(room,ws,'player:move',{player:snapshot(state)});return;
  }
  if(pkt.event==='emote:send'){
   const now=Date.now();if(now-state.lastChat<2000||!ALLOWED_EMOTES.has(pkt.code))return;
   state.lastChat=now;broadcast(room,ws,'emote:send',{playerId:state.id,code:pkt.code});return;
  }
  if(pkt.event==='room:leave')leave(state);
 });
 ws.on('close',()=>{leave(state);const ip=ws.ip;const n=connectionsByIp.get(ip)||0;if(n<=1)connectionsByIp.delete(ip);else connectionsByIp.set(ip,n-1);});
 ws.on('error',()=>{});
 send(ws,'server:hello',{playerId:state.id,protocol:1});
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){const state=ws.__state; if(state && !state.alive){ws.terminate();continue;}if(state) state.alive=false;ws.ping();}},30000);heartbeat.unref();
server.listen(port,'0.0.0.0',()=>console.log(`BLOCKVERSE multiplayer listening on ${port}; origin allowlist ${allowedOrigins.join(', ')}`));
function shutdown(){clearInterval(heartbeat);for(const ws of wss.clients)ws.close(1001,'server_restart');server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
