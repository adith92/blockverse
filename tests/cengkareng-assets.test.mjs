import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ASSET_ROOT=resolve(ROOT,'public');
const manifest=JSON.parse(readFileSync(resolve(ASSET_ROOT,'assets/3d/jakarta/manifest.json'),'utf8'));
test('original generated 3D asset manifest has 125 entries in 7 categories',()=>{
 assert.equal(manifest.modelCount,125);
 assert.equal(manifest.assets.length,125);
 assert.equal(Object.keys(manifest.categories).length,7);
 assert.equal(new Set(manifest.assets.map(a=>a.src)).size,125);
});
test('all 125 GLB resources exist, start with glTF magic and have real 3D triangles',()=>{
 for(const item of manifest.assets){
  const path=resolve(ASSET_ROOT,item.src.replace(/^\//,''));
  assert.ok(path.startsWith(ASSET_ROOT+'/'));
  assert.ok(existsSync(path),item.src);
  const blob=readFileSync(path);
  assert.equal(blob.subarray(0,4).toString('ascii'),'glTF',item.src);
  assert.equal(blob.readUInt32LE(4),2,item.src);
  assert.ok(blob.length>700,item.src);
  assert.ok(item.triangleCount>40,item.src);
 }
});
test('geographic mode makes no unauthorized OSM accuracy claim',()=>{
 const world=readFileSync(resolve(ROOT,'src/world/cengkareng.js'),'utf8');
 assert.ok(world.includes('NOT an authoritative street-level model'));
 assert.ok(world.includes('Cengkareng Timur'));
 assert.ok(world.includes('Kali Apuran'));
 assert.ok(world.includes('DISTRICTS'));
});
