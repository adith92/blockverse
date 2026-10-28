import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(f)=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('HTML loads actual modular game entry; no CDN runtime scripts',()=>{
 const html=read('index.html');
 assert.match(html,/<script type="module" src="\/src\/game.js"><\/script>/);
 assert.doesNotMatch(html,/cdn\.tailwindcss\.com|three\.min\.js/);
 assert.match(html,/id="btn-home-play"/);
 assert.match(html,/id="btn-builder-save"/);
});
test('source contains all four worlds and actual obstacle course markers',()=>{
 const js=read('src/game.js');
 for(const world of ['hub','obby','builder','coindash']) assert.match(js,new RegExp(`worldName === '${world}'`));
 const obby=js.split('function buildSkyObbyCourse() {')[1]?.split('// ---------------- WORLD 3:')[0];
 assert.ok(obby,'course builder missing');
 for (const no of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]) {
   // original comments label obstacles (#7 & #8 together)
   assert.match(obby,new RegExp(`#${no}(?:\\b|\\s)`),`missing obstacle marker #${no}`);
 }
 assert.match(obby,/checkpointIdx: 1/);
 assert.match(obby,/checkpointIdx: 2/);
 assert.match(obby,/isFinish: true/);
});
test('Supabase replaces Firebase while local mode and WebSockets are intact',()=>{
 const js=read('src/game.js');
 assert.match(js,/createClient\(/);
 assert.match(js,/signInAnonymously\(/);
 assert.match(js,/this\.supabase\.rpc\('bv_save_world'/);
 assert.match(js,/this\.idbSet\('builder_world'/);
 assert.doesNotMatch(js,/firebase\/app|firebase\/firestore|runTransaction\(/);
 assert.match(js,/connectVpsServer\(/);
});
test('SQL schema enables owner-only RLS and server-side revision checking',()=>{
 const sql=read('supabase/preview_blockverse_schema.sql');
 for(const table of ['bv_profiles','bv_worlds'])assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/revision=p_expected_revision/);
 assert.doesNotMatch(sql,/drop table/i);
});
test('no production secrets or duplicate bundle in project HTML',()=>{
 for(const file of ['index.html','src/game.js','vite.config.js','supabase/preview_blockverse_schema.sql','vercel.json']) {
  const body=read(file);
  assert.doesNotMatch(body,/-----BEGIN PRIVATE KEY-----|service_account\.json/);
 }
 assert.doesNotMatch(read('src/game.js'),/onAuthStateChanged\(/);
});
