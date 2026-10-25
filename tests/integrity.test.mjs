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
test('world writes use Firestore transaction and do not silently report cloud success',()=>{
 const js=read('src/game.js');
 assert.match(js,/await runTransaction\(this\.db/);
 assert.match(js,/Cloud save failed:/);
 assert.match(js,/tx\.set\(worldRef/);
});
test('server security rules prohibit client-edited reward data',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/request\.auth\.uid == userId/);
 assert.match(rules,/p\.keys\(\)\.hasOnly\(\['displayName','avatar'\]\)/);
 assert.match(rules,/playerId == request\.auth\.uid/);
 assert.match(rules,/request\.resource\.data\.revision == resource\.data\.revision \+ 1/);
 assert.match(rules,/allow read, write: if false/);
});
test('no production secrets or duplicate bundle in project HTML',()=>{
 for(const file of ['index.html','src/game.js','vite.config.js','firestore.rules','vercel.json']) {
  const body=read(file);
  assert.doesNotMatch(body,/-----BEGIN PRIVATE KEY-----|service_account\.json/);
 }
 assert.doesNotMatch(read('src/game.js'),/onAuthStateChanged\(/);
});
