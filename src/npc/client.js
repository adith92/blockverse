import * as THREE from 'three';
import {NPC_CATALOG,EDUCATION_TOPICS} from './catalog.mjs';
import './npc.css';

// 13 kid-friendly fictional NPCs: animated meshes + nearby interaction.
// All dialogue is generated via same-origin server; never send user input to cloud APIs.
export class NpcSchool {
 constructor({root,getPlayer,getWorld,isPlaying}) {
  this.root=root;this.getPlayer=getPlayer;this.getWorld=getWorld;this.isPlaying=isPlaying;
  this.rigs=[];this.active=null;this.lastUpdate=0;this.speechId=null;this.audio=null;
  this.dialog=document.createElement('section');
  this.dialog.id='bv-npc-dialog';this.dialog.hidden=true;
  this.dialog.setAttribute('role','dialog');this.dialog.setAttribute('aria-label','Guru virtual BLOCKVERSE');
  this.dialog.innerHTML=`<div class="bv-npc-header">
   <div><span class="bv-npc-tag">🏫 Sahabat Belajar</span><strong id="bv-npc-name">NPC</strong><small id="bv-npc-role"></small></div>
   <button id="bv-npc-close" type="button" aria-label="Tutup percakapan">✕</button></div>
   <p id="bv-npc-reply" aria-live="polite"></p>
   <p class="bv-npc-privacy">🔒 Jangan berikan nama lengkap, alamat, nomor HP, atau rahasia pribadi.</p>
   <div id="bv-npc-topics"></div>
   <div class="bv-npc-actions"><button id="bv-npc-greet" type="button">👋 Sapa</button>
   <button id="bv-npc-listen" type="button" hidden>🔊 Dengarkan</button></div>
   <form id="bv-npc-freeform" hidden><label for="bv-npc-question">Tanya dengan kata-katamu (mode diawasi)</label>
   <input id="bv-npc-question" maxlength="180" autocomplete="off" placeholder="Apa yang ingin kamu pelajari?"/>
   <button type="submit">Tanya Kakak NPC</button></form>`;
  this.prompt=document.createElement('button');this.prompt.id='bv-npc-nearby';this.prompt.type='button';
  this.prompt.textContent='💬 Bicara dengan guru';this.prompt.hidden=true;
  document.body.append(this.dialog,this.prompt);
  this.abort=new AbortController();const signal=this.abort.signal;
  this.dialog.querySelector('#bv-npc-close').addEventListener('click',()=>this.close(),{signal});
  this.dialog.querySelector('#bv-npc-greet').addEventListener('click',()=>this.ask('greeting'),{signal});
  this.dialog.querySelector('#bv-npc-listen').addEventListener('click',()=>this.listen(),{signal});
  this.dialog.querySelector('#bv-npc-freeform').addEventListener('submit',event=>{
   event.preventDefault();this.ask('question',null,this.dialog.querySelector('#bv-npc-question').value);
  },{signal});
  this.prompt.addEventListener('click',()=>this.openClosest(),{signal});
  window.addEventListener('keydown',event=>{
   if(event.key.toLowerCase()==='n'&&!event.repeat&&this.isPlaying()&&
      !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')){
    if(this.active)this.close();else this.openClosest();
   }
   if(event.key==='Escape'&&this.active)this.close();
  },{signal});
 }
 buildRig(npc){
  const c=new THREE.Group();c.name=`Education NPC: ${npc.name}`;
  c.position.set(...npc.position);
  const base=new THREE.MeshStandardMaterial({color:npc.color,roughness:.6});
  const skin=new THREE.MeshStandardMaterial({color:0xffd5a6,roughness:.9});
  const shoe=new THREE.MeshStandardMaterial({color:0x29344b,roughness:.8});
  const eyes=new THREE.MeshStandardMaterial({color:0x18283f,roughness:.55});
  const items=[[new THREE.CapsuleGeometry(.46,.8,4,8),base,0,1.25,0],
   [new THREE.SphereGeometry(.46,12,8),skin,0,2.23,0],
   [new THREE.BoxGeometry(.24,.65,.32),shoe,-.24,.43,0],
   [new THREE.BoxGeometry(.24,.65,.32),shoe,.24,.43,0],
   [new THREE.BoxGeometry(.18,.7,.2),base,-.6,1.27,0],
   [new THREE.BoxGeometry(.18,.7,.2),base,.6,1.27,0],
   [new THREE.SphereGeometry(.052,8,6),eyes,-.16,2.31,-.4],
   [new THREE.SphereGeometry(.052,8,6),eyes,.16,2.31,-.4]];
  for(const [geo,mat,x,y,z] of items){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=false;c.add(o);}
  const wave=new THREE.Mesh(new THREE.TorusGeometry(.43,.095,6,16),new THREE.MeshStandardMaterial({color:0xffdc67,emissive:0x6b4700}));
  wave.position.set(0,.07,0);wave.rotation.x=-Math.PI/2;c.add(wave);
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshStandardMaterial({color:0xffe882,emissive:0x806600}));
  star.position.set(0,3.05,0);c.add(star);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#14213d';ctx.fillRect(0,0,512,64);
  ctx.fillStyle='#ffcb47';ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillText(npc.name,256,45,490);
  const tex=new THREE.CanvasTexture(canvas);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  label.position.set(0,3.55,0);label.scale.set(4.7,.59,1);c.add(label);
  this.root.add(c);this.rigs.push({npc,group:c,star,wave});
 }
 showWorld(world){for(const n of NPC_CATALOG)if(n.world===world)this.buildRig(n);}
 nearest(){
  const world=this.getWorld(),p=this.getPlayer();if(!p)return null;
  let best=null,d=64;
  for(const item of this.rigs){if(item.npc.world!==world)continue;
   const dx=p.x-item.group.position.x,dz=p.z-item.group.position.z;
   const v=dx*dx+dz*dz;if(v<d){d=v;best=item;}}
  return best;
 }
 update(time){
  for(const o of this.rigs){o.star.rotation.y+=.008;o.star.position.y=3.05+Math.sin(time*.002+o.group.position.x)*.08;}
  if(time-this.lastUpdate<220)return;this.lastUpdate=time;
  const close=this.nearest();this.prompt.hidden=!close||!this.isPlaying()||Boolean(this.active);
  if(close)this.prompt.textContent=`💬 N • Sapa ${close.npc.name}`;
  if(this.active&&this.active.npc.world!==this.getWorld())this.close();
 }
 openClosest(){const rig=this.nearest();if(rig)this.open(rig);}
 async open(item){
  this.stopAudio();this.active=item;this.speechId=null;
  this.dialog.hidden=false;this.prompt.hidden=true;
  const npc=item.npc;
  this.dialog.querySelector('#bv-npc-name').textContent=npc.name;
  this.dialog.querySelector('#bv-npc-role').textContent=npc.role;
  this.dialog.querySelector('#bv-npc-reply').textContent=npc.greeting;
  this.dialog.querySelector('#bv-npc-listen').hidden=true;
  const holder=this.dialog.querySelector('#bv-npc-topics');holder.replaceChildren();
  for(const topic of npc.topics){
   const button=document.createElement('button');button.type='button';
   button.textContent='📚 '+topic.charAt(0).toUpperCase()+topic.slice(1);
   button.title=EDUCATION_TOPICS[topic];button.addEventListener('click',()=>this.ask('lesson',topic),{signal:this.abort.signal});
   holder.appendChild(button);
  }
  try{
   const status=await fetch('/api/npc/catalog',{cache:'no-store'});
   if(status.ok){const j=await status.json();this.dialog.querySelector('#bv-npc-freeform').hidden=!j.freeformEnabled;}
  }catch{}
 }
 stopAudio(){if(this.audio){this.audio.pause();this.audio.src='';this.audio=null;}}
 close(){this.active=null;this.speechId=null;this.stopAudio();this.dialog.hidden=true;}
 async ask(mode,topic=null,question=''){
  const current=this.active;if(!current)return;
  const info=this.dialog.querySelector('#bv-npc-reply');info.textContent='💭 Sebentar ya, sedang menyusun pelajaran...';
  this.dialog.querySelector('#bv-npc-listen').hidden=true;this.speechId=null;
  try{
   const response=await fetch('/api/npc/talk',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({npcId:current.npc.id,topic:topic||current.npc.topic,mode,question}),cache:'no-store'});
   const json=await response.json();
   if(this.active!==current)return;
   if(!response.ok){info.textContent='Kita belajar dari pilihan pelajaran dulu, ya. 💛';return;}
   info.textContent=json.reply;
   this.speechId=json.speechId;
   this.dialog.querySelector('#bv-npc-listen').hidden=!this.speechId;
  }catch{if(this.active===current)info.textContent=current.npc.lesson;}
 }
 async listen(){
  if(!this.speechId)return;
  this.stopAudio();const speechId=this.speechId;this.speechId=null;
  this.dialog.querySelector('#bv-npc-listen').hidden=true;
  try{
   const r=await fetch('/api/npc/speech/'+encodeURIComponent(speechId),{cache:'no-store'});
   if(!r.ok)throw Error('not_available');
   const blob=await r.blob();const url=URL.createObjectURL(blob);
   this.audio=new Audio(url);
   this.audio.onended=()=>{URL.revokeObjectURL(url);this.audio=null;};
   await this.audio.play();
  }catch{this.dialog.querySelector('#bv-npc-reply').textContent+=' 🔈 Suara lokal belum aktif di server, tapi pelajarannya tetap bisa dibaca.';}
 }
 dispose(){
  this.close();this.abort.abort();this.prompt.remove();this.dialog.remove();
  for(const {group} of this.rigs){this.root.remove(group);group.traverse(o=>{
   if(o.geometry)o.geometry.dispose();
   if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.map?.dispose();m.dispose();}}
  });}this.rigs.length=0;
 }
}
