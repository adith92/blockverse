import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Supabase replaces Firebase in runtime, no tokens committed',()=>{
 const pkg=JSON.parse(read('package.json'));const js=read('src/game.js');
 assert.equal(pkg.dependencies['@supabase/supabase-js'],'2.118.0');
 assert.equal(pkg.dependencies.firebase,undefined);
 assert.match(js,/createClient\(/);
 assert.match(js,/auth\.signInAnonymously\(/);
 assert.match(js,/\.rpc\('bv_save_world'/);
 assert.doesNotMatch(js,/from 'firebase\//);
 assert.doesNotMatch(read('.env.example'),/sbp_[a-f0-9]{20}/i);
});
test('Safe RLS schema is namespaced and not applied to shared project',()=>{
 const sql=read('supabase/preview_blockverse_schema.sql');
 for(const t of ['bv_profiles','bv_worlds'])assert.match(sql,new RegExp('alter table public\\.'+t+' enable row level security'));
 assert.match(sql,/auth\.uid\(\)/);assert.match(sql,/security invoker/);
 assert.match(sql,/revision=p_expected_revision/);
 assert.doesNotMatch(sql,/drop table/i);
});
test('Offline and multiplayer continue without Supabase',()=>{
 const js=read('src/game.js');
 assert.match(js,/initIndexedDB\(/);assert.match(js,/loadFromIndexedDB\(/);
 assert.match(js,/if \(!__supabase_url \|\| !__supabase_key\) return;/);
 assert.match(js,/connectVpsServer\(/);
 assert.match(js,/BroadcastChannel/);
});
