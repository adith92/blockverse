import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Geographic inspiration, NOT an authoritative street-level model or a derivative OSM extract.
// Admin reference: https://barat.jakarta.go.id/kelurahan/cengkareng-timur
// Cengkareng Timur: bordered by Kapuk Raya, Pedongkelan Raya, Daan Mogot, Outer Ring Road,
// with Kali Apuran / Cengkareng Drain water context. Every building position is fictional.
export const DISTRICTS = Object.freeze([
  {id:'kapuk',name:'Kapuk Raya Gateway',cx:-440,cz:-300,accent:0xf4ae4d,hint:'Gapura selamat datang, koridor angkot & pepohonan trembesi.'},
  {id:'ruko',name:'Ruko Boulevard',cx:-150,cz:-300,accent:0x72c8ee,hint:'Deretan ruko niaga, kanopi toko, dan trotoar ramah pejalan.'},
  {id:'market',name:'Pasar & Kuliner',cx:150,cz:-300,accent:0xff9d84,hint:'Pasar rakyat, warung tenda, dan gerobak kuliner malam.'},
  {id:'canal',name:'Kali Apuran Walk',cx:420,cz:-300,accent:0x67d1e8,hint:'Promenade tepi Kali Apuran dengan jembatan lengkung yang bisa diseberangi.'},
  {id:'kampung',name:'Kampung Ceria',cx:-440,cz:0,accent:0x94cc71,hint:'Gang paving block, rumah kampung warna-warni, dan pos kamling RW.'},
  {id:'fajar',name:'Fajar Baru',cx:-150,cz:0,accent:0xffcd68,hint:'Masjid berkubah hijau, mushola, dan balai warga pendopo.'},
  {id:'plaza',name:'Cengkareng Plaza',cx:150,cz:0,accent:0xae92ed,hint:'Alun-alun utama Jakarta Barat, gedung midrise & titik kumpul.'},
  {id:'transit',name:'Transit Jakarta Barat',cx:420,cz:0,accent:0x73b1ee,hint:'Halte transit, jembatan penyeberangan (JPO), dan koridor bus.'},
  {id:'school',name:'Sekolah & Lapangan',cx:-440,cz:300,accent:0x9bd893,hint:'Gedung sekolah berlantai dua, puskesmas, dan lapangan upacara.'},
  {id:'park',name:'Taman Kota',cx:-150,cz:300,accent:0x66d7ac,hint:'Taman botani tropis, kolam teratai, dan bangku santai.'},
  {id:'rooftop',name:'Rooftop Explorer',cx:150,cz:300,accent:0xf2ae7e,hint:'Tantangan parkour tangga atap menuju dek observasi langit!'},
  {id:'daan-mogot',name:'Daan Mogot Gateway',cx:420,cz:300,accent:0xf9d177,hint:'Bundaran tugu, jalan layang (overpass), dan kawasan bengkel.'}
]);

export const MAP_EXTENTS = Object.freeze({width:1440,height:1110});
const MODEL_ROOT='/assets/3d/jakarta/';
const NEAR_LOD_DISTANCE=135; // Full GLB detail radius
const FAR_LOD_DISTANCE=265;  // Low-poly LOD proxy radius
const MAX_LOADS_PER_TICK=18;
const QUALITY_ASSET_CAP={low:48,medium:76,high:98};

function seedFloat(n){const v=Math.sin(n*217.57+11.34)*8765.23;return v-Math.floor(v);}
function solid(x,y,z,w,h,d,color,mat={}){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:0.84,...mat}));
  mesh.position.set(x,y,z);mesh.receiveShadow=true;return mesh;
}
function districtLabel(name,subtitle=''){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#14213D';ctx.fillRect(0,0,512,112);
  ctx.strokeStyle='#4CC9F0';ctx.lineWidth=4;ctx.strokeRect(4,4,504,104);
  ctx.fillStyle='#FFCB47';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText(name,256,50,480);
  if(subtitle){ctx.fillStyle='#CFE8F6';ctx.font='18px sans-serif';ctx.fillText(subtitle,256,84,480);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(18,4.0),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
  mesh.userData.disposeTexture=texture;mesh.position.y=9.2;return mesh;
}

export class CengkarengExploration {
  constructor(sceneRoot, options = {}){
    this.root=sceneRoot;
    this.onDistrictVisited=options.onDistrictVisited||null;
    this.quality=options.quality||'high';
    this.group=new THREE.Group();this.group.name='Cengkareng Explorer 12 Districts';
    this.lodGroup=new THREE.Group();this.lodGroup.name='Cengkareng Distant LOD Proxies';
    this.osmGroup=new THREE.Group();this.osmGroup.name='Cengkareng Optional OSM Reference';
    this.osmGroup.visible=false;
    this.root.add(this.group,this.lodGroup,this.osmGroup);
    this.loader=new GLTFLoader();
    this.catalog=[];this.placements=[];this.visible=new Map();this.lodMeshes=new Map();this.cache=new Map();
    this.staticColliders=[];this.placementColliders=[];
    this.beacons=[];this.visitedDistricts=new Set();this.activeQuestIndex=0;
    this.osmData=null;this.osmEnabled=false;
    this.lastAt=0;this.disposed=false;this.inflight=0;
    this.sharedLodGeo=new THREE.BoxGeometry(1,1,1);
    this.sharedLodMats={
      buildings:new THREE.MeshStandardMaterial({color:0xe8dcc8,roughness:0.85}),
      nature:new THREE.MeshStandardMaterial({color:0x5cb86e,roughness:0.8}),
      vehicles:new THREE.MeshStandardMaterial({color:0x419cbd,roughness:0.6}),
      default:new THREE.MeshStandardMaterial({color:0x95a5b5,roughness:0.8})
    };
    this.drawCity();
  }

  setQuality(q){
    if(QUALITY_ASSET_CAP[q]) this.quality=q;
  }

  _addColliderBox(x,y,z,sx,sy,sz,colorHex,opts={}){
    const mesh=solid(x,y,z,sx,sy,sz,colorHex,opts.mat||{});
    if(opts.castShadow) mesh.castShadow=true;
    this.group.add(mesh);
    this.staticColliders.push({
      minX:x-sx/2,maxX:x+sx/2,
      minY:y-sy/2,maxY:y+sy/2,
      minZ:z-sz/2,maxZ:z+sz/2,
      sx,sy,sz,baseX:x,baseY:y,baseZ:z,
      isRamp:Boolean(opts.isRamp),
      isHazard:Boolean(opts.isHazard),
      cengkarengStatic:true,
      mesh
    });
    return mesh;
  }

  drawCity(){
    const grass=solid(0,-0.095,0,1440,0.19,1100,0x76b87d);
    this.group.add(grass);

    // East-West avenues & sidewalks aligned with district rows (-300, 0, 300)
    for(const z of [-300,0,300]){
      this.group.add(solid(0,0.04,z+52,1120,0.08,18,0x434c5e));
      this.group.add(solid(0,0.09,z+41.5,1120,0.12,2.6,0xdce3df));
      this.group.add(solid(0,0.09,z+62.5,1120,0.12,2.6,0xdce3df));
      for(let i=-15;i<=15;i++) this.group.add(solid(i*34,0.09,z+52,8.5,0.025,0.28,0xf8d674));
    }
    // North-South avenues aligned with district columns (-440, -150, 150, 420)
    for(const x of [-440,-150,150,420]){
      this.group.add(solid(x-52,0.045,0,18,0.08,860,0x4d5566));
      this.group.add(solid(x-62.5,0.09,0,2.6,0.12,860,0xdce3df));
      this.group.add(solid(x-41.5,0.09,0,2.6,0.12,860,0xdce3df));
      for(let i=-12;i<=12;i++) this.group.add(solid(x-52,0.095,i*34,0.3,0.025,8.5,0xf2cd68));
    }

    // Kali Apuran inspired scenic canal at x=355 running North-South with walkable bridges!
    const canalX=355;
    this.group.add(solid(canalX,0.02,0,18,0.06,820,0x46b1d4,{metalness:0.24,roughness:0.22}));
    // Canal embankments with openings at the 3 bridge crossings (z = -248, 52, 352)
    const bridgeZs=[-248,52,352];
    const segBounds=[[-410,-258],[-238,42],[62,342],[362,410]];
    for(const [zStart,zEnd] of segBounds){
      const len=zEnd-zStart;
      const cz=(zStart+zEnd)/2;
      for(const bankX of [canalX-9.8,canalX+9.8]){
        this._addColliderBox(bankX,0.55,cz,1.4,1.1,len,0xd8cbb8);
      }
    }
    // Walkable Arched Canal Bridges at each East-West avenue
    for(const bz of bridgeZs){
      this._addColliderBox(canalX-11,0.32,bz,5.0,0.55,14,0xd8cbb8,{isRamp:true});
      this._addColliderBox(canalX,0.62,bz,18.0,0.45,14,0xe6dfd3,{isRamp:true});
      this._addColliderBox(canalX+11,0.32,bz,5.0,0.55,14,0xd8cbb8,{isRamp:true});
      // Bridge side railings
      this._addColliderBox(canalX,1.25,bz-6.6,18.0,0.9,0.6,0x3f5068);
      this._addColliderBox(canalX,1.25,bz+6.6,18.0,0.9,0.6,0x3f5068);
    }

    // District Plazas, Landmarks, Quest Beacons & Rooftop Parkour Course
    DISTRICTS.forEach((d,idx)=>{
      const pad=solid(d.cx,0.015,d.cz,210,0.03,210,0xc8ddc4);
      pad.material.color.setHex(d.accent).lerp(new THREE.Color(0xa6cea8),0.84);
      this.group.add(pad);

      // Welcome Gate / Signboard north of district center
      const supportL=this._addColliderBox(d.cx-7.5,4.2,d.cz-68,0.9,8.4,0.9,0x2b3a67);
      const supportR=this._addColliderBox(d.cx+7.5,4.2,d.cz-68,0.9,8.4,0.9,0x2b3a67);
      const plaque=districtLabel(`${idx+1}. ${d.name}`,d.hint.slice(0,46));
      plaque.position.set(d.cx,8.2,d.cz-68);
      this.group.add(supportL,supportR,plaque);

      // Central walkable plaza & Spawn Pad at (d.cx, 0.1, d.cz + 20)
      this._addColliderBox(d.cx,0.08,d.cz,24,0.16,24,0xe9dbc5);
      this.group.add(solid(d.cx,0.09,d.cz+20,6.5,0.12,6.5,0x4cc9f0));

      // Interactive District Quest Beacon at (d.cx, y, d.cz)
      const pedestal=this._addColliderBox(d.cx,0.55,d.cz,2.4,0.9,2.4,0x14213d);
      const gem=new THREE.Mesh(
        new THREE.OctahedronGeometry(0.95,0),
        new THREE.MeshStandardMaterial({color:d.accent,emissive:d.accent,emissiveIntensity:0.55,roughness:0.2,metalness:0.3})
      );
      gem.position.set(d.cx,2.35,d.cz);
      const beam=new THREE.Mesh(
        new THREE.CylinderGeometry(0.28,0.65,22,10,1,true),
        new THREE.MeshBasicMaterial({color:d.accent,transparent:true,opacity:0.22,side:THREE.DoubleSide,depthWrite:false})
      );
      beam.position.set(d.cx,11.5,d.cz);
      this.group.add(pedestal,gem,beam);
      this.beacons.push({district:d,index:idx,gem,beam,visited:false});

      // Special Playable Vertical Parkour in District 11 (Rooftop Explorer)
      if(d.id==='rooftop'){
        const steps=[
          [d.cx-16,0.7,d.cz+10,4.5,1.2,4.5,{isRamp:true}],
          [d.cx-22,1.6,d.cz+4,4.5,1.2,4.5,{isRamp:true}],
          [d.cx-22,2.6,d.cz-3,4.5,1.2,4.5,{isRamp:true}],
          [d.cx-16,3.6,d.cz-9,5.0,1.2,5.0,{isRamp:true}],
          [d.cx-8,4.6,d.cz-9,6.0,0.8,4.0,{isRamp:true}],
          [d.cx+2,5.6,d.cz-9,9.0,0.8,9.0,{isRamp:true}]
        ];
        for(const [sx,sy,sz,w,h,dp,o] of steps){
          this._addColliderBox(sx,sy,sz,w,h,dp,0xf2ae7e,o);
        }
      }
    });
  }

  _isNearSpawnOrRoad(x,z){
    for(const d of DISTRICTS){
      // Keep 11m around district center beacon and 9m around spawn pad (d.cx, d.cz+20) clear
      if(Math.hypot(x-d.cx,z-d.cz)<11.5) return true;
      if(Math.hypot(x-d.cx,z-(d.cz+20))<9.5) return true;
    }
    // Keep main avenues & canal clear
    for(const rz of [-248,52,352]) if(Math.abs(z-rz)<11) return true;
    for(const rx of [-492,-202,98,368]) if(Math.abs(x-rx)<11) return true;
    if(Math.abs(x-355)<12.5) return true;
    return false;
  }

  _categoryScale(category){
    switch(category){
      case 'buildings': return 2.45;
      case 'infrastructure': return 1.85;
      case 'nature': return 2.25;
      case 'vehicles': return 1.65;
      case 'street_props': return 1.55;
      case 'gameplay': return 1.45;
      default: return 1.35;
    }
  }

  async initialize(){
    const res=await fetch(`${MODEL_ROOT}manifest.json`);
    if(!res.ok)throw new Error('3D asset manifest failed: HTTP '+res.status);
    const manifest=await res.json();
    if(manifest.modelCount<100||!Array.isArray(manifest.assets))throw new Error('Need 100+ exported GLB assets');
    this.catalog=manifest.assets;

    const byCat={};
    for(const a of manifest.assets){
      if(!byCat[a.category]) byCat[a.category]=[];
      byCat[a.category].push(a);
    }

    // 1. Place every one of the 125 unique GLB models in a lively inner neighborhood ring around each district plaza
    for(let i=0;i<manifest.assets.length;i++){
      const a=manifest.assets[i];
      const zone=DISTRICTS[i%DISTRICTS.length];
      const k=Math.floor(i/DISTRICTS.length);
      let angle=-Math.PI*0.85+(k*0.52)+((i%3)*0.22);
      let radius=16+(k%4)*6.5;
      let px=zone.cx+Math.cos(angle)*radius;
      let pz=zone.cz+Math.sin(angle)*radius;
      let guard=0;
      while(this._isNearSpawnOrRoad(px,pz)&&guard<14){
        angle+=0.42;radius+=3.5;
        px=zone.cx+Math.cos(angle)*radius;
        pz=zone.cz+Math.sin(angle)*radius;
        guard++;
      }
      const scale=this._categoryScale(a.category);
      const dims=Array.isArray(a.dimensions)&&a.dimensions.length===3?a.dimensions:[4,4,4];
      const rot=Math.atan2(zone.cx-px,zone.cz-pz);
      this._registerPlacement({
        id:`unique-${i}`,src:a.src,category:a.category,zone:zone.id,
        pos:[px,0,pz],rot,scale,dims
      });
    }

    // 2. Add curated neighborhood streetscape rings for all 12 districts (buildings, trees, vehicles, warung & street props)
    let extraIdx=0;
    const buildingsList=byCat.buildings||manifest.assets;
    const natureList=byCat.nature||manifest.assets;
    const propsList=byCat.street_props||manifest.assets;
    const vehiclesList=byCat.vehicles||manifest.assets;
    const infraList=byCat.infrastructure||manifest.assets;

    for(let dIdx=0;dIdx<DISTRICTS.length;dIdx++){
      const zone=DISTRICTS[dIdx];
      // Ring of 8 main buildings facing the central plaza & avenue
      const bOffsets=[
        [-22,-18],[-24,4],[-22,24],
        [22,-18],[24,4],[22,24],
        [-14,-30],[14,-30]
      ];
      for(let b=0;b<bOffsets.length;b++){
        const asset=buildingsList[(dIdx*5+b*3)%buildingsList.length];
        const [ox,oz]=bOffsets[b];
        const px=zone.cx+ox,pz=zone.cz+oz;
        if(this._isNearSpawnOrRoad(px,pz)) continue;
        const scale=this._categoryScale('buildings')*(0.92+(b%3)*0.1);
        const dims=Array.isArray(asset.dimensions)&&asset.dimensions.length===3?asset.dimensions:[4,4,4];
        const rot=Math.atan2(zone.cx-px,zone.cz-pz);
        this._registerPlacement({
          id:`extra-b-${extraIdx++}`,src:asset.src,category:asset.category,zone:zone.id,
          pos:[px,0,pz],rot,scale,dims
        });
      }
      // 6 tropical trees & planters framing the plaza
      const tOffsets=[[-13,-12],[13,-12],[-14,12],[14,12],[-18,-2],[18,-2]];
      for(let t=0;t<tOffsets.length;t++){
        const asset=natureList[(dIdx*3+t*2)%natureList.length];
        const [ox,oz]=tOffsets[t];
        const px=zone.cx+ox,pz=zone.cz+oz;
        const scale=this._categoryScale('nature')*(0.9+(t%3)*0.12);
        const dims=Array.isArray(asset.dimensions)&&asset.dimensions.length===3?asset.dimensions:[3,4,3];
        this._registerPlacement({
          id:`extra-n-${extraIdx++}`,src:asset.src,category:asset.category,zone:zone.id,
          pos:[px,0,pz],rot:t*1.1,scale,dims
        });
      }
      // 6 street props, vehicles & lamps around the plaza perimeter
      const pOffsets=[[-9,8],[9,8],[-10,-6],[10,-6],[-6,26],[6,26]];
      for(let p=0;p<pOffsets.length;p++){
        const pool=p%3===0?vehiclesList:p%3===1?propsList:infraList;
        const asset=pool[(dIdx*4+p*3)%pool.length];
        const [ox,oz]=pOffsets[p];
        const px=zone.cx+ox,pz=zone.cz+oz;
        const scale=this._categoryScale(asset.category);
        const dims=Array.isArray(asset.dimensions)&&asset.dimensions.length===3?asset.dimensions:[2,2,2];
        const rot=Math.atan2(zone.cx-px,zone.cz-pz);
        this._registerPlacement({
          id:`extra-p-${extraIdx++}`,src:asset.src,category:asset.category,zone:zone.id,
          pos:[px,0,pz],rot,scale,dims
        });
      }
    }

    return {assetCount:manifest.modelCount,instanceCount:this.placements.length,districts:DISTRICTS.length};
  }

  _registerPlacement(p){
    this.placements.push(p);
    // Register physical Swept-AABB collider for solid buildings, vehicles & tree trunks
    if(p.category==='buildings'||p.category==='vehicles'){
      const hx=Math.min(6.5,Math.max(1.2,(p.dims[0]*p.scale)*0.42));
      const hy=Math.min(12.0,Math.max(1.4,p.dims[1]*p.scale));
      const hz=Math.min(6.5,Math.max(1.2,(p.dims[2]*p.scale)*0.42));
      this.placementColliders.push({
        minX:p.pos[0]-hx,maxX:p.pos[0]+hx,
        minY:0,maxY:hy,
        minZ:p.pos[2]-hz,maxZ:p.pos[2]+hz,
        cx:p.pos[0],cz:p.pos[2]
      });
    }else if(p.category==='nature'&&!p.src.includes('cloud')){
      this.placementColliders.push({
        minX:p.pos[0]-0.45,maxX:p.pos[0]+0.45,
        minY:0,maxY:2.6,
        minZ:p.pos[2]-0.45,maxZ:p.pos[2]+0.45,
        cx:p.pos[0],cz:p.pos[2]
      });
    }
  }

  /**
   * Returns nearby physical colliders for Swept-AABB player collision resolution in src/game.js.
   */
  getActiveColliders(playerPos){
    if(this.disposed) return [];
    const out=[...this.staticColliders];
    const px=playerPos.x,pz=playerPos.z;
    for(let i=0;i<this.placementColliders.length;i++){
      const c=this.placementColliders[i];
      const dx=c.cx-px,dz=c.cz-pz;
      if(dx*dx+dz*dz<=1600) out.push(c); // 40m active physics broadphase
    }
    return out;
  }

  async toggleOsmReferenceLayer(){
    this.osmEnabled=!this.osmEnabled;
    if(this.osmEnabled&&!this.osmData){
      try{
        const r=await fetch('/assets/geo/cengkareng_osm_overlay.json');
        if(r.ok){
          this.osmData=await r.json();
          this._buildOsm3DRibbons();
        }
      }catch(e){
        console.warn('Optional OSM overlay load skipped:',e);
      }
    }
    this.osmGroup.visible=this.osmEnabled;
    return {enabled:this.osmEnabled,data:this.osmData};
  }

  _buildOsm3DRibbons(){
    if(!this.osmData?.features) return;
    while(this.osmGroup.children.length) this.osmGroup.remove(this.osmGroup.children[0]);
    const addRibbon=(lines,colorHex,yHeight,width)=>{
      const mat=new THREE.MeshBasicMaterial({color:colorHex,transparent:true,opacity:0.58,side:THREE.DoubleSide});
      for(const item of lines){
        const pts=item.points||[];
        for(let i=0;i<pts.length-1;i++){
          const [x1,z1]=pts[i],[x2,z2]=pts[i+1];
          const len=Math.hypot(x2-x1,z2-z1);
          if(len<1) continue;
          const seg=new THREE.Mesh(new THREE.PlaneGeometry(width,len),mat);
          seg.rotation.x=-Math.PI/2;
          seg.rotation.z=-Math.atan2(x2-x1,z2-z1);
          seg.position.set((x1+x2)/2,yHeight,(z1+z2)/2);
          this.osmGroup.add(seg);
        }
      }
    };
    addRibbon(this.osmData.features.roads||[],0xffcb47,0.16,2.2);
    addRibbon(this.osmData.features.waterways||[],0x3dd6d0,0.18,3.2);
  }

  update(pos,now){
    if(this.disposed||!this.catalog.length) return;

    // 1. Animate District Quest Beacons & check discovery proximity
    const nowSec=now*0.001;
    for(const b of this.beacons){
      b.gem.rotation.y=nowSec*2.1+b.index;
      b.gem.position.y=2.35+Math.sin(nowSec*3+b.index)*0.22;
      const distSq=(pos.x-b.district.cx)**2+(pos.z-b.district.cz)**2;
      if(!b.visited&&distSq<18.5){
        b.visited=true;
        this.visitedDistricts.add(b.district.id);
        b.beam.material.opacity=0.06;
        b.gem.scale.setScalar(0.65);
        if(this.visitedDistricts.size<DISTRICTS.length){
          const nextIdx=this.beacons.findIndex(x=>!x.visited);
          if(nextIdx!==-1) this.activeQuestIndex=nextIdx;
        }
        if(this.onDistrictVisited){
          this.onDistrictVisited({
            district:b.district,
            visitedCount:this.visitedDistricts.size,
            totalDistricts:DISTRICTS.length
          });
        }
      }
    }

    // 2. Throttled District Asset Streaming & 2-Tier LOD (every 220ms)
    if(now-this.lastAt<220) return;
    this.lastAt=now;

    const maxVisible=QUALITY_ASSET_CAP[this.quality]||85;
    const nearSq=NEAR_LOD_DISTANCE*NEAR_LOD_DISTANCE;
    const farSq=FAR_LOD_DISTANCE*FAR_LOD_DISTANCE;

    const scored=[];
    const lodWanted=new Set();
    for(let i=0;i<this.placements.length;i++){
      const p=this.placements[i];
      const d=(p.pos[0]-pos.x)**2+(p.pos[2]-pos.z)**2;
      if(d<=nearSq){
        scored.push({p,d});
      }else if(d<=farSq&&(p.category==='buildings'||p.category==='nature'||p.category==='vehicles')){
        lodWanted.add(p.id);
        if(!this.lodMeshes.has(p.id)){
          const mat=this.sharedLodMats[p.category]||this.sharedLodMats.default;
          const proxy=new THREE.Mesh(this.sharedLodGeo,mat);
          const w=Math.max(1.5,(p.dims?.[0]||4)*p.scale*0.75);
          const h=Math.max(2.0,(p.dims?.[1]||4)*p.scale*0.8);
          const dp=Math.max(1.5,(p.dims?.[2]||4)*p.scale*0.75);
          proxy.scale.set(w,h,dp);
          proxy.position.set(p.pos[0],h*0.5,p.pos[2]);
          proxy.rotation.y=p.rot;
          this.lodGroup.add(proxy);
          this.lodMeshes.set(p.id,proxy);
        }
      }
    }

    for(const [id,proxy] of this.lodMeshes){
      if(!lodWanted.has(id)){
        this.lodGroup.remove(proxy);
        this.lodMeshes.delete(id);
      }
    }

    scored.sort((a,b)=>a.d-b.d);
    const chosen=scored.slice(0,maxVisible);
    const wanted=new Set(chosen.map(x=>x.p.id));
    for(const [id,model] of this.visible){
      if(!wanted.has(id)){
        this.group.remove(model);
        this.visible.delete(id);
      }
    }

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
        if(d2>nearSq)return;
        const obj=model.clone(true);obj.name=`district-prop:${p.id}`;
        obj.position.set(...p.pos);obj.rotation.y=p.rot;obj.scale.setScalar(p.scale);
        obj.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=true;}});
        this.group.add(obj);this.visible.set(p.id,obj);
      });
    }
  }

  getQuestStatus(playerPos){
    const target=DISTRICTS[this.activeQuestIndex]||DISTRICTS[0];
    const dist=Math.round(Math.hypot(target.cx-playerPos.x,target.cz-playerPos.z));
    return {
      visitedCount:this.visitedDistricts.size,
      totalCount:DISTRICTS.length,
      targetDistrict:target,
      distanceMeters:dist
    };
  }

  dispose(){
    this.disposed=true;
    this.group.traverse(o=>{if(o.userData.disposeTexture)o.userData.disposeTexture.dispose();});
    this.root.remove(this.group,this.lodGroup,this.osmGroup);
    this.cache.clear();this.visible.clear();this.lodMeshes.clear();
  }
}

export function makeCengkarengMapUI({onTravel,getPlayer,explorer}){
  const card=document.createElement('aside');card.id='jakarta-world-panel';
  card.setAttribute('aria-label','Panel Peta & Misi Cengkareng Explorer');
  card.innerHTML=`
    <div class="bv-city-header">
      <div>
        <strong>🗺️ JAKARTA BARAT</strong>
        <small>Cengkareng Explorer • 12 Distrik</small>
      </div>
      <button type="button" id="bv-map-toggle" aria-expanded="true" aria-label="Buka atau tutup peta">−</button>
    </div>
    <canvas id="bv-city-minimap" width="240" height="148" aria-label="Peta ilustratif Cengkareng"></canvas>
    <div id="bv-current-district">📍 Cengkareng Plaza</div>
    <div id="bv-quest-tracker" class="text-[10px] text-bvCyan font-semibold pb-1.5">🎯 Misi: 0/12 Lentera Distrik • Arah: Kapuk Raya</div>
    <div class="bv-city-actions">
      <button id="bv-nearest-district" type="button" aria-expanded="false">📍 Fast Travel (12)</button>
      <button id="bv-osm-toggle" type="button" aria-pressed="false" title="Tampilkan referensi koridor publik OpenStreetMap">🌐 Koridor OSM</button>
      <button id="bv-back-hub" type="button">🏠 Hub</button>
    </div>
    <div id="bv-city-districts" class="bv-city-districts" role="list"></div>
    <small id="bv-osm-attribution" class="bv-map-disclaimer">Denah game fiksi terinspirasi Cengkareng, bukan peta navigasi.</small>
  `;
  document.body.appendChild(card);
  // Phones start with a compact map badge so movement and game world remain visible.
  if(typeof matchMedia==='function' && matchMedia('(max-width: 700px)').matches){
    card.classList.add('bv-map-collapsed');
    const toggle=card.querySelector('#bv-map-toggle');toggle.textContent='+';toggle.setAttribute('aria-expanded','false');
  }

  const buttons=card.querySelector('#bv-city-districts');
  for(const [i,d] of DISTRICTS.entries()){
    const b=document.createElement('button');
    b.type='button';
    b.setAttribute('role','listitem');
    b.textContent=`${i+1}. ${d.name}`;
    b.title=d.hint||'';
    b.onclick=()=>onTravel(d);
    buttons.appendChild(b);
  }

  const canvas=card.querySelector('canvas'),ctx=canvas.getContext('2d');
  const toPx=(x,z)=>[120+x/1440*230,74+z/1110*140];

  const draw=()=>{
    ctx.fillStyle='#142436';ctx.fillRect(0,0,240,148);
    // Draw Kali Apuran canal strip
    const [cx0,cy0]=toPx(355,-450),[cx1,cy1]=toPx(355,450);
    ctx.strokeStyle='#3dd6d0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx0,cy0);ctx.lineTo(cx1,cy1);ctx.stroke();

    // Draw stylized avenues
    ctx.lineWidth=1.5;ctx.strokeStyle='#5d8294';
    for(const z of [-248,52,352]){const a=toPx(-680,z),b=toPx(680,z);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
    for(const x of [-492,-202,98,368]){const a=toPx(x,-510),b=toPx(x,510);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}

    // Draw Optional OSM Public Corridor Overlay if active
    if(explorer?.osmEnabled&&explorer?.osmData?.features){
      ctx.strokeStyle='#ffcb47aa';ctx.lineWidth=1.2;
      for(const r of explorer.osmData.features.roads||[]){
        ctx.beginPath();
        r.points.forEach(([ox,oz],idx)=>{
          const [px,py]=toPx(ox,oz);
          if(idx===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        });
        ctx.stroke();
      }
    }

    const p=getPlayer();
    const q=explorer?explorer.getQuestStatus(p):null;

    // Draw line to active quest beacon
    if(q?.targetDistrict){
      const [px,py]=toPx(p.x,p.z);
      const [tx,ty]=toPx(q.targetDistrict.cx,q.targetDistrict.cz);
      ctx.strokeStyle='#ffcb47';ctx.setLineDash([3,3]);ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.setLineDash([]);
    }

    DISTRICTS.forEach((d,i)=>{
      const [x,y]=toPx(d.cx,d.cz);
      const visited=explorer?.visitedDistricts?.has(d.id);
      ctx.fillStyle=visited?'#6fcf97':'#cce9d8';
      ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#14213d';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),x,y+3);
    });

    const [px,py]=toPx(p.x,p.z);
    ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.arc(px,py,4.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.2;ctx.stroke();

    const nearest=DISTRICTS.reduce((a,b)=>(b.cx-p.x)**2+(b.cz-p.z)**2<(a.cx-p.x)**2+(a.cz-p.z)**2?b:a,DISTRICTS[0]);
    card.querySelector('#bv-current-district').textContent=`📍 ${nearest.name}`;
    if(q){
      const tracker=card.querySelector('#bv-quest-tracker');
      tracker.textContent=q.visitedCount>=q.totalCount
        ? '🏆 Semua 12 Lentera Distrik Cengkareng terkumpul!'
        : `🎯 Misi (${q.visitedCount}/${q.totalCount}): ${q.targetDistrict.name} (${q.distanceMeters}m)`;
    }
  };

  const toggleBtn=card.querySelector('#bv-map-toggle');
  toggleBtn.onclick=()=>{
    const collapsed=card.classList.toggle('bv-map-collapsed');
    toggleBtn.textContent=collapsed?'+':'−';
    toggleBtn.setAttribute('aria-expanded',String(!collapsed));
  };
  const districtBtn=card.querySelector('#bv-nearest-district');
  districtBtn.onclick=()=>{
    const expanded=card.classList.toggle('bv-map-expanded');
    districtBtn.setAttribute('aria-expanded',String(expanded));
  };
  const osmBtn=card.querySelector('#bv-osm-toggle');
  osmBtn.onclick=async()=>{
    if(!explorer)return;
    const {enabled,data}=await explorer.toggleOsmReferenceLayer();
    osmBtn.setAttribute('aria-pressed',String(enabled));
    const attr=card.querySelector('#bv-osm-attribution');
    if(enabled&&data?.license){
      attr.textContent=`Koridor OSM aktif (${data.counts?.roads||0} jalan, ${data.counts?.waterways||0} kanal) • ${data.license.attribution} (ODbL 1.0). Bukan untuk navigasi.`;
    }else{
      attr.textContent='Denah game fiksi terinspirasi Cengkareng, bukan peta navigasi.';
    }
    draw();
  };
  card.querySelector('#bv-back-hub').onclick=()=>onTravel(null);
  const loop=setInterval(draw,450);draw();
  return ()=>{clearInterval(loop);card.remove();};
}
