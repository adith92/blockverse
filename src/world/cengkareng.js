import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Geographic inspiration, NOT an authoritative street-level model or a derivative OSM extract.
// Admin reference: https://barat.jakarta.go.id/kelurahan/cengkareng-timur
// Cengkareng Timur: bordered by Kapuk Raya, Pedongkelan Raya, Daan Mogot, Outer Ring Road,
// with Kali Apuran / Cengkareng Drain water context. Every building position is fictional.
export const DISTRICTS = Object.freeze([
  {id:'kapuk',name:'Kapuk Raya Gateway',cx:-480,cz:-320,accent:0xf4ae4d},
  {id:'ruko',name:'Ruko Boulevard',cx:-160,cz:-320,accent:0x72c8ee},
  {id:'market',name:'Pasar & Kuliner',cx:160,cz:-320,accent:0xff9d84},
  {id:'canal',name:'Kali Apuran Walk',cx:480,cz:-320,accent:0x67d1e8},
  {id:'kampung',name:'Kampung Ceria',cx:-480,cz:0,accent:0x94cc71},
  {id:'fajar',name:'Fajar Baru',cx:-160,cz:0,accent:0xffcd68},
  {id:'plaza',name:'Cengkareng Plaza',cx:160,cz:0,accent:0xae92ed},
  {id:'transit',name:'Transit Jakarta Barat',cx:480,cz:0,accent:0x73b1ee},
  {id:'school',name:'Sekolah & Lapangan',cx:-480,cz:320,accent:0x9bd893},
  {id:'park',name:'Taman Kota',cx:-160,cz:320,accent:0x66d7ac},
  {id:'rooftop',name:'Rooftop Explorer',cx:160,cz:320,accent:0xf2ae7e},
  {id:'daan-mogot',name:'Daan Mogot Gateway',cx:480,cz:320,accent:0xf9d177}
]);

export const MAP_EXTENTS = Object.freeze({width:1440,height:1110});
const MODEL_ROOT='/assets/3d/jakarta/';
const CAM_DISTANCE=270; // metres in stylized game coordinates
const MAX_VISIBLE_ASSETS=85; // mobile-friendly bounded scene dressing
const MAX_LOADS_PER_TICK=9;
const textureCache=new Map();

function seedFloat(n){const v=Math.sin(n*217.57+11.34)*8765.23;return v-Math.floor(v);}
function solid(x,y,z,w,h,d,color,mat={}){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:0.86,...mat}));
  mesh.position.set(x,y,z);mesh.receiveShadow=true;return mesh;
}
function districtLabel(name,color){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#14213D';ctx.fillRect(0,0,512,96);
  ctx.fillStyle='#ffffff';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(name,256,60,480);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(20,3.8),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
  mesh.userData.disposeTexture=texture;mesh.position.y=10;return mesh;
}

export class CengkarengExploration {
  constructor(sceneRoot){
    this.root=sceneRoot;
    this.group=new THREE.Group();this.group.name='Cengkareng Explorer 12 Districts';
    this.root.add(this.group);
    this.loader=new GLTFLoader();
    this.catalog=[];this.placements=[];this.visible=new Map();this.cache=new Map();
    this.lastAt=0;this.disposed=false;this.inflight=0;
    this.drawCity();
  }
  drawCity(){
    const grass=solid(0,-.095,0,1440,.19,1100,0x79bb80);
    this.group.add(grass);
    // Low urban skyline, pedestrian axes, canal context and stylized district signboards.
    for(let j=0;j<3;j++){
      const z=(j-1)*320;
      this.group.add(solid(0,.042,z,1420,.082,24,0x444d60));
      this.group.add(solid(0,.10,z-13,1420,.13,2.8,0xdce3df));
      this.group.add(solid(0,.10,z+13,1420,.13,2.8,0xdce3df));
      for(let i=-16;i<=16;i++)this.group.add(solid(i*42,.09,z,10,.025,.3,0xf8d674));
    }
    for(let j=0;j<4;j++){
      const x=(j-1.5)*320;
      this.group.add(solid(x,.05,0,24,.08,1080,0x515869));
      this.group.add(solid(x-13,.09,0,2.8,.13,1080,0xdce3df));
      this.group.add(solid(x+13,.09,0,2.8,.13,1080,0xdce3df));
      for(let i=-13;i<=13;i++)this.group.add(solid(x,.1,i*40,.35,.02,10,0xf2cd68));
    }
    // Fictitious canal inspired by Kali Apuran. This is not a surveyed waterway geometry.
    this.group.add(solid(630,-.01,-170,21,.06,930,0x5aaecf,{metalness:0.22,roughness:0.22}));
    for(const x of [616,644])this.group.add(solid(x,.35,-170,1.6,.7,930,0xe8dac6));
    for(const d of DISTRICTS){
      const pad=solid(d.cx,.015,d.cz,285,.03,285,0xc8ddc4);
      pad.material.color.setHex(d.accent).lerp(new THREE.Color(0xa8cfaa),.86);
      this.group.add(pad);
      const support=solid(d.cx,4,d.cz-92,1.1,8,1.1,0x32415e);
      const plaque=districtLabel(d.name,d.accent);plaque.position.x=d.cx;plaque.position.z=d.cz-92;
      this.group.add(support,plaque);
      const plaza=solid(d.cx,.085,d.cz,26,.13,26,0xe9dbc5);this.group.add(plaza);
      for(let k=0;k<8;k++){
        const ang=k*Math.PI/4;
        this.group.add(solid(d.cx+Math.cos(ang)*24,.21,d.cz+Math.sin(ang)*24,2.2,.38,2.2,d.accent));
      }
    }
  }
  async initialize(){
    const res=await fetch(`${MODEL_ROOT}manifest.json`);
    if(!res.ok)throw new Error('3D asset manifest failed: HTTP '+res.status);
    const manifest=await res.json();
    if(manifest.modelCount<100||!Array.isArray(manifest.assets))throw new Error('Need 100+ exported GLB assets');
    this.catalog=manifest.assets;
    // Every exported model has at least one designed world location, then 2-3 decorative instances.
    for(let i=0;i<manifest.assets.length;i++){
      const a=manifest.assets[i];const zone=DISTRICTS[i%DISTRICTS.length];
      const k=Math.floor(i/DISTRICTS.length);
      const angle=k*2.4+i*.37;const radius=45+(k%5)*14;
      this.placements.push({id:`unique-${i}`,src:a.src,category:a.category,zone:zone.id,
        pos:[zone.cx+Math.cos(angle)*radius,0,zone.cz+Math.sin(angle)*radius],rot:(i%8)*.785,
        scale:a.category==='buildings'?1.05:a.category==='infrastructure'?.72:a.category==='nature'?1.1:1});
    }
    for(let i=0;i<170;i++){
      const original=manifest.assets[(i*23+11)%manifest.assets.length];
      const zone=DISTRICTS[(i*7)%DISTRICTS.length];const a=seedFloat(i+1)*Math.PI*2;
      const distance=35+seedFloat(i+533)*94;
      this.placements.push({id:`extra-${i}`,src:original.src,category:original.category,zone:zone.id,
        pos:[zone.cx+Math.sin(a)*distance,0,zone.cz+Math.cos(a)*distance],rot:a,scale:.7+(i%6)*.12});
    }
    return {assetCount:manifest.modelCount,instanceCount:this.placements.length,districts:DISTRICTS.length};
  }
  update(pos,now){
    if(this.disposed||!this.catalog.length||now-this.lastAt<240)return;
    this.lastAt=now;
    const chosen=this.placements.map(p=>({p,d:(p.pos[0]-pos.x)**2+(p.pos[2]-pos.z)**2}))
      .filter(x=>x.d<CAM_DISTANCE*CAM_DISTANCE).sort((a,b)=>a.d-b.d).slice(0,MAX_VISIBLE_ASSETS);
    const wanted=new Set(chosen.map(x=>x.p.id));
    for(const [id,model] of this.visible){if(!wanted.has(id)){this.group.remove(model);this.visible.delete(id);}}
    let initiated=0;
    for(const {p} of chosen){
      if(this.visible.has(p.id)||this.inflight>=MAX_LOADS_PER_TICK||initiated>=MAX_LOADS_PER_TICK)continue;
      if(!this.cache.has(p.src)){
        this.inflight++;initiated++;
        const promise=new Promise(resolve=>this.loader.load(p.src,g=>resolve(g.scene),undefined,()=>resolve(null)));
        this.cache.set(p.src,promise.finally(()=>{this.inflight=Math.max(0,this.inflight-1);}));
      }
      this.cache.get(p.src).then(model=>{
        if(!model||this.disposed||this.visible.has(p.id))return;
        const d2=(pos.x-p.pos[0])**2+(pos.z-p.pos[2])**2;
        if(d2>CAM_DISTANCE*CAM_DISTANCE)return;
        const obj=model.clone(true);obj.name=`district-prop:${p.id}`;
        obj.position.set(...p.pos);obj.rotation.y=p.rot;obj.scale.setScalar(p.scale);
        obj.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=true;}});
        this.group.add(obj);this.visible.set(p.id,obj);
      });
    }
  }
  dispose(){
    this.disposed=true;
    this.group.traverse(o=>{if(o.userData.disposeTexture)o.userData.disposeTexture.dispose();});
    this.root.remove(this.group);this.cache.clear();this.visible.clear();
  }
}

export function makeCengkarengMapUI({onTravel,getPlayer}){
  const card=document.createElement('aside');card.id='jakarta-world-panel';
  card.innerHTML=`<div class="bv-city-header"><div><strong>🗺️ JAKARTA BARAT</strong><small>Cengkareng Explorer • 12 distrik</small></div><button type="button" id="bv-map-toggle" aria-label="Buka atau tutup peta">−</button></div><canvas id="bv-city-minimap" width="240" height="148" aria-label="Peta ilustratif Cengkareng"></canvas><div id="bv-current-district">📍 Cengkareng Plaza</div><div class="bv-city-actions"><button id="bv-nearest-district" type="button">📍 Pergi ke distrik</button><button id="bv-back-hub" type="button">🏠 Hub</button></div><div id="bv-city-districts" class="bv-city-districts"></div><small class="bv-map-disclaimer">Denah game fiksi terinspirasi Cengkareng, bukan peta navigasi.</small>`;
  document.body.appendChild(card);
  const buttons=card.querySelector('#bv-city-districts');
  for(const [i,d] of DISTRICTS.entries()){
    const b=document.createElement('button');b.type='button';b.textContent=`${i+1}. ${d.name}`;b.onclick=()=>onTravel(d);buttons.appendChild(b);
  }
  const canvas=card.querySelector('canvas'),ctx=canvas.getContext('2d');
  const toPx=(x,z)=>[120+x/1440*230,74+z/1110*140];
  const draw=()=>{
    ctx.fillStyle='#182a3c';ctx.fillRect(0,0,240,148);ctx.lineWidth=2;
    ctx.strokeStyle='#739da7';
    for(const z of [-320,0,320]){const a=toPx(-700,z),b=toPx(700,z);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
    for(const x of [-480,-160,160,480]){const a=toPx(x,-520),b=toPx(x,520);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
    DISTRICTS.forEach((d,i)=>{const [x,y]=toPx(d.cx,d.cz);ctx.fillStyle='#cce9d8';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263d46';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),x,y+3);});
    const p=getPlayer();const [x,y]=toPx(p.x,p.z);ctx.fillStyle='#ffcc50';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
    const nearest=DISTRICTS.reduce((a,b)=>(b.cx-p.x)**2+(b.cz-p.z)**2<(a.cx-p.x)**2+(a.cz-p.z)**2?b:a,DISTRICTS[0]);
    card.querySelector('#bv-current-district').textContent=`📍 ${nearest.name}`;
  };
  card.querySelector('#bv-map-toggle').onclick=()=>{card.classList.toggle('bv-map-collapsed');card.querySelector('#bv-map-toggle').textContent=card.classList.contains('bv-map-collapsed')?'+':'−';};
  card.querySelector('#bv-nearest-district').onclick=()=>card.classList.toggle('bv-map-expanded');
  card.querySelector('#bv-back-hub').onclick=()=>onTravel(null);
  const loop=setInterval(draw,550);draw();
  return ()=>{clearInterval(loop);card.remove();};
}
