#!/usr/bin/env python3
"""Deterministic original stylized Jakarta/Cengkareng modular glTF/GLB assets.
No scraped photos, maps, third-party textures or copyrighted architecture. MIT source.
"""
from __future__ import annotations
import json, math, random, pathlib
import numpy as np
import trimesh

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'public/assets/3d/jakarta'
OUTPUT.mkdir(parents=True,exist_ok=True)
CATS={
 'buildings':['kampung_home','terrace_home','corner_home','roof_garden_home','contract_house','two_storey_house','three_storey_house','ruko_small','ruko_double','ruko_tall','market_hall','market_kiosk','warung','coffee_stall','mini_mart','school_block','clinic','community_hall','mushola','mosque_courtyard','warehouse','office_midrise','apartments','guard_post','workshop'],
 'infrastructure':['road_straight','road_corner','road_crossing','road_tjunction','road_bend','sidewalk','zebra_crossing','pedestrian_bridge','overpass','bridge_canal','canal_wall','drainage_module','parking_lot','alley_pavers','roundabout'],
 'nature':['rain_tree','rain_tree_bloom','tamarind','palm_tree','banana_tree','mango_tree','mango_fruiting','tree_sapling','flower_shrub','hedge','fern','flower_planter','lotus_planter','river_reeds','cloud_cluster'],
 'street_props':['street_lamp_modern','street_lamp_vintage','power_pole','cable_bundle','street_sign','laneway_sign','direction_sign','bus_stop','bus_shelter','traffic_cone','traffic_bollard','bench','trash_bin','park_fence','garden_fence','market_awning','flagpole_indonesia','billboard_blank','food_cart','bicycle_rack'],
 'vehicles':['angkot','city_bus','minibus','compact_car','taxi_generic','light_truck','pickup','scooter','motorcycle','bicycle'],
 'gameplay':['checkpoint_crystal','prism_portal','quest_terminal','save_totem','spring_pad','moving_platform','floating_island','race_arch','coin_star','collectible_chest','hazard_spinner','jump_platform','build_station','teleport_pad','zipline_anchor'],
 'interiors':['table_wood','chair_wood','stool','shelf_shop','cashier_desk','ceiling_fan','shop_fridge','display_counter','crate_wood','crate_plastic','water_tank','ac_unit','roof_antenna','small_tv','sign_blank','cafe_table','cafe_chair','lamp_hanging','flower_pot','carpet','board_school','school_desk','market_basket','bamboo_bench','lamp_neon']}
COLORS={
 'wall':'#F2E8D7','wall2':'#BEE7E8','wall3':'#F9C9B8','wall4':'#E6DAF5','roof':'#B85C53','roof2':'#465E89',
 'roof3':'#F3B34C','wood':'#98664A','wood2':'#C9946C','green':'#437C59','foliage':'#6ABF75','leaf2':'#88C966',
 'leaf3':'#2F946E','stone':'#8A9CA7','concrete':'#CDD6D6','road':'#505966','metal':'#44556C','metal2':'#899BA7',
 'glass':'#69C9D8','shadow':'#2A3C56','sun':'#F2BB50','salmon':'#F47A77','purple':'#9574D4','white':'#FFF7E7',
 'pink':'#EFB9DE','blue':'#419CBD','soil':'#79573C','dark':'#273B51','orange':'#F28B4F'}

def rgb(c):
 s=c.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))+(255,)
class Model:
 def __init__(self,seed):self.r=random.Random(seed);self.bits={};self.detail=0
 def add(self,mesh,color):
  if mesh.is_empty:return
  mesh.visual.vertex_colors=rgb(COLORS.get(color,color))
  self.bits.setdefault(color,[]).append(mesh);self.detail+=1
 def box(self,xyz,ext,color):
  m=trimesh.creation.box(extents=ext);m.apply_translation(xyz);self.add(m,color)
 def cyl(self,xyz,r,h,color,section=10):
  m=trimesh.creation.cylinder(radius=r,height=h,sections=section);m.apply_translation(xyz);self.add(m,color)
 def sphere(self,xyz,r,color,subdiv=1):
  m=trimesh.creation.icosphere(subdivisions=subdiv,radius=r);m.apply_translation(xyz);self.add(m,color)
 def cone(self,xyz,r,h,color):
  m=trimesh.creation.cone(radius=r,height=h,sections=12);m.apply_translation(xyz);self.add(m,color)
 def pipe(self,xyz,r1,r2,h,color):
  m=trimesh.creation.annulus(r_min=r1,r_max=r2,height=h,sections=24);m.apply_translation(xyz);self.add(m,color)
 def finish(self,file):
  s=trimesh.Scene()
  for col,parts in self.bits.items():s.add_geometry(trimesh.util.concatenate(parts),geom_name=col)
  # gltf Y-up conversion is carried by exporter; raw design uses Z-up coordinates.
  data=s.export(file_type='glb')
  (OUTPUT/file).write_bytes(data)
  return len(data),sum(len(x) for x in self.bits.values()),sum(len(m.faces) for arr in self.bits.values() for m in arr)

def build_building(m,name,n):
 r=m.r; w=6+r.uniform(-1,4);d=5+r.uniform(0,4);h=4.4+(n%4)*1.6
 palette=['wall','wall2','wall3','wall4']; wall=palette[n%4]; roof=['roof','roof2','roof3'][n%3]
 m.box((0,0,h/2),(w,d,h),wall);m.box((0,0,h+.18),(w+.8,d+.7,.36),roof)
 m.box((0,-d/2-.035,1.2),(1.8,.08,2.4),'wood');m.box((0,-d/2-.09,1.2),(1.36,.09,1.9),'metal2')
 floors=max(1,round(h/2.7))
 for floor in range(floors):
  for side in [-1,1]:
   for i in range(2+(n%2)):
    x=(-w*.31+i*(w*.31))*side;y=-d/2-.07;z=min(h-.7,2.1+floor*2.5)
    m.box((x,y,z),(.85,.10,1.0),'white');m.box((x,y-.055,z),(.66,.09,.8),'glass')
    m.box((x,y-.13,z-.47),(1,.12,.1),'wood')
 m.box((0,-d/2-.75,2.75),(w*.75,1.4,.15),'sun')
 for j in range(5):m.box((-w*.38+j*w*.18,-d/2-1,2.58),(.12,.12,.4),'metal')
 for j in range(3):m.box((-w*.3+j*w*.3,-d/2-.95,.15),(.45,.45,.3),'green')
 m.box((w/3,d/4,h+.6),(.7,.7,.95),'metal2');m.cyl((w/3,d/4,h+1.18),.47,.1,'glass')
 if n%3==0:
  m.box((0,-d/2-.8,h*.53),(w*.8,.15,.12),'metal')
  for j in range(8):m.box((-w*.36+j*w*.1,-d/2-.9,h*.53+.43),(.045,.06,.7),'metal2')
 if 'mosque' in name or 'mushola' in name:
  m.sphere((0,0,h+.9),1.2,'green',2);m.cone((0,0,h+1.75),.2,.65,'sun')
  m.cyl((w/2-.8,d/2-.8,h+1.5),.35,3.0,'wall');m.cone((w/2-.8,d/2-.8,h+3.2),.55,1.2,'green')
 if 'school' in name or 'clinic' in name:m.box((0,-d/2-.2,h*.6),(2,.2,.45),'white')

def build_infra(m,name,n):
 if 'canal' in name or 'bridge' in name:
  m.box((0,0,0),(15,6,.8),'concrete')
  for x in [-7.2,7.2]:m.box((x,0,.9),(.3,6,1.8),'metal2')
  for j in range(8):m.box((-7+j*2,0,.07),(.07,5.4,.16),'metal')
 elif 'road' in name or name in ['parking_lot','roundabout','zebra_crossing']:
  m.box((0,0,-.1),(14,8,.18),'road')
  for j in range(4):m.box((-5+j*3.3,0,.015),(1.6,.13,.02),'sun')
  for y in [-3.9,3.9]:m.box((0,y,.07),(14,.22,.16),'concrete')
  if name=='zebra_crossing':
   for j in range(7):m.box((-5+j*1.6,0,.03),(.65,6,.035),'white')
 else:
  m.box((0,0,0),(12,3,.3),'concrete')
  for i in range(9):m.box((-5+i*1.2,0,.19),(.09,2.6,.04),'stone')

def build_nature(m,name,n):
 if 'cloud' in name:
  for i in range(12):
   x=m.r.uniform(-3.7,3.7);y=m.r.uniform(-1.5,1.5);z=m.r.uniform(.3,1.4)
   m.sphere((x,y,z),m.r.uniform(.7,1.8),'white',1)
 elif 'flower' in name or 'planter' in name or 'hedge' in name or 'fern' in name:
  m.box((0,0,.26),(2.5,1.3,.5),'wood')
  for j in range(12):
   x=m.r.uniform(-1,1);y=m.r.uniform(-.5,.5);z=m.r.uniform(.8,1.8)
   m.sphere((x,y,z),.26,'leaf2',1)
   if j%3==0:m.sphere((x,y,z+.28),.13,'salmon',1)
 else:
  m.cyl((0,0,2.2),.31,4.4,'wood',10)
  if 'palm' in name:
   for j in range(9):
    a=j*math.tau/9
    m.cone((math.cos(a)*1.45,math.sin(a)*1.45,4.6),.7,2.0,'green')
  else:
   for j in range(15+(n%8)):
    a=j*2.4; r=1+(j%4)*.39
    m.sphere((math.cos(a)*r,math.sin(a)*r,3.7+(j%5)*.38),.7 if j%3 else 1.0,['green','foliage','leaf2','leaf3'][j%4],1)
   if 'mango' in name:
    for j in range(6):m.sphere((m.r.uniform(-1.7,1.7),m.r.uniform(-1.7,1.7),4),.18,'sun',1)

def build_street(m,name,n):
 if any(t in name for t in ['lamp','pole','flag','sign','billboard','cable']):
  m.cyl((0,0,2.6),.16,5.2,'metal2')
  m.box((0,0,5.2),(2.2,.25,.35),'metal')
  m.box((0,-.15,4.9),(1.75,.17,.65),'white' if n%2 else 'blue')
  m.cyl((0,0,.1),.75,.2,'concrete')
  if 'flag' in name:m.box((.8,0,4.6),(1.7,.08,.4),'salmon');m.box((.8,0,4.2),(1.7,.08,.4),'white')
 elif any(t in name for t in ['fence','barrier','bollard','rack']):
  for j in range(6):m.cyl((-3+j*1.2,0,.75),.09,1.5,'metal')
  m.box((0,0,1.35),(7.2,.12,.16),'metal2');m.box((0,0,.55),(7.2,.12,.12),'metal2')
 elif 'bench' in name:
  m.box((0,0,.9),(2.3,.7,.18),'wood2');m.box((0,.3,1.45),(2.3,.13,1),'wood')
  for x in [-.9,.9]:m.box((x,0,.45),(.15,.65,.85),'metal')
 else:
  m.box((0,0,.55),(2.7,1.35,1.1),'wood2');m.box((0,-.4,1.38),(3.1,1.2,.18),'salmon')
  for j in range(5):m.box((-1+j*.5,-.7,.86),(.36,.16,.3),['leaf2','sun','salmon'][j%3])
  for x in [-1,1]:m.cyl((x,.4,.22),.28,.25,'metal')

def build_vehicle(m,name,n):
 length=5 if any(x in name for x in ['bus','truck']) else 3.3
 is_bike=name in ['scooter','motorcycle','bicycle']
 if is_bike:
  for x in [-1.05,1.05]:
   m.cyl((x,0,.53),.5,.16,'dark',12);m.cyl((x,-.1,.53),.28,.19,'metal2')
  m.box((0,0,1.2),(2,.38,.32),'salmon');m.box((-.4,0,1.5),(.6,.65,.22),'metal')
  m.box((.95,0,1.7),(.1,.8,.1),'metal2')
 else:
  tone=['blue','salmon','sun','green','purple'][n%5]
  m.box((0,0,1.03),(length,2.1,1.35),tone)
  m.box((-.25,0,2.02),(length*.64,1.8,.75),'white')
  for x in [-length*.31,length*.31]:
   for y in [-1.09,1.09]:m.cyl((x,y,.52),.49,.22,'dark',12)
  for y in [-1.11,1.11]:m.box((0,y,2.05),(length*.48,.08,.47),'glass')
  m.box((length/2+.05,0,1.1),(.13,1.5,.35),'metal2')
  m.box((-length/2-.05,0,1.1),(.13,1.4,.31),'salmon')

def build_gameplay(m,name,n):
 col=['glass','sun','purple','salmon','green'][n%5]
 if 'portal' in name or 'arch' in name:
  for a in range(22):
   t=a*math.tau/22
   m.sphere((math.cos(t)*2,0,math.sin(t)*2+2.5),.24,col,1)
  for x in [-2.1,2.1]:m.box((x,0,1.4),(.3,.7,2.8),'metal')
  m.box((0,0,.1),(5,2,.2),'purple')
 elif 'platform' in name or 'pad' in name or 'island' in name:
  m.box((0,0,.5),(5,5,1),'purple')
  m.box((0,0,1.05),(4.5,4.5,.13),col)
  for x in [-2,2]:
   for y in [-2,2]:m.sphere((x,y,1.13),.22,'sun')
 else:
  m.box((0,0,.16),(2.6,2.6,.32),'metal');m.cyl((0,0,.9),.52,1.4,'wood')
  m.sphere((0,0,2.02),.78,col,2)
  for j in range(6):m.sphere((math.cos(j)*.65,math.sin(j)*.65,1.8),.13,'sun')

def build_interior(m,name,n):
 if any(s in name for s in ['table','desk','counter','shelf','fridge','board','tv','sign','unit']):
  m.box((0,0,1.4),(2.5,.9,2.6),'wood2');m.box((0,-.5,1.4),(2.2,.11,1.9),'glass')
  for j in range(4):m.box((0,-.6,.35+j*.55),(2,.18,.09),'metal')
  for j in range(5):m.box((-1+j*.48,-.76,1.4),(.27,.25,.38),['sun','green','salmon'][j%3])
 elif any(s in name for s in ['chair','stool','bench']):
  m.box((0,0,.95),(1,.9,.15),'wood2');m.box((0,.38,1.5),(1,.11,1),'wood')
  for x in [-.37,.37]:
   for y in [-.34,.34]:m.box((x,y,.45),(.13,.13,.95),'metal')
 elif any(s in name for s in ['plant','pot','basket']):
  m.cyl((0,0,.48),.48,.92,'wood2')
  for j in range(8):m.sphere((m.r.uniform(-.45,.45),m.r.uniform(-.45,.45),1.2+m.r.random()*.7),.27,'green')
 else:
  m.box((0,0,.8),(1.8,1.8,1.5),'metal2')
  for j in range(8):
   m.box((-0.75+(j%4)*.5,-.94,.55+(j//4)*.65),(.37,.12,.38),['sun','glass','salmon','green'][j%4])

ALL=[]
for cat,names in CATS.items():
 for i,name in enumerate(names):
  m=Model(f'{cat}/{name}/BLOCKVERSE/2026')
  {'buildings':build_building,'infrastructure':build_infra,'nature':build_nature,'street_props':build_street,'vehicles':build_vehicle,'gameplay':build_gameplay,'interiors':build_interior}[cat](m,name,i)
  file=f'{cat}/{name}.glb';(OUTPUT/cat).mkdir(exist_ok=True)
  # Relative file location, exporter writes to category folder rather than root.
  original=OUTPUT/file
  s=trimesh.Scene()
  for color,geoms in m.bits.items():s.add_geometry(trimesh.util.concatenate(geoms),geom_name=color)
  blob=s.export(file_type='glb')
  original.write_bytes(blob)
  ALL.append({'id':f'{cat}/{name}','category':cat,'label':name.replace('_',' ').title(),'src':f'/assets/3d/jakarta/{file}','format':'glb','bytes':len(blob),'triangleCount':sum(len(g.faces) for arr in m.bits.values() for g in arr),'design':'original procedural stylized mesh','collision':'decorative','license':'Original BLOCKVERSE'})
manifest={'schemaVersion':1,'title':'BLOCKVERSE Jakarta/Cengkareng Stylized 3D Asset Pack','attribution':'Original procedural models; not real building photographs or official geospatial data','modelCount':len(ALL),'categories':{k:len(v) for k,v in CATS.items()},'assets':ALL}
(ROOT/'public/assets/3d/jakarta/manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('GENERATED',len(ALL),'ASSETS',sum(a['bytes'] for a in ALL)/1048576,'MiB','TRIANGLES',sum(a['triangleCount'] for a in ALL))
