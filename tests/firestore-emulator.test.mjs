// This is a REAL integration test, NOT a mock. Must be run via Firebase Emulator.
import test, { after } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Start the Firestore emulator with `npm run test:rules:emulator`.');
}
const env=await initializeTestEnvironment({
  projectId:'blockverse-ci',
  firestore:{rules:fs.readFileSync(new URL('../firestore.rules', import.meta.url),'utf8')}
});
after(async()=>env.cleanup());
const alice=env.authenticatedContext('uid_alice').firestore();
const bob=env.authenticatedContext('uid_bob').firestore();
const appId='blockverse-ci';
const avatar={ torsoColor:'#4CC9F0', headColor:'#FFCB47', limbColor:'#14213D', accessory:'none' };
const aliceProfile=doc(alice,'artifacts',appId,'users','uid_alice','profile','main');
const bobAliceProfile=doc(bob,'artifacts',appId,'users','uid_alice','profile','main');
const alicePresence=doc(alice,'artifacts',appId,'public','data','room_presence','uid_alice');
const bobAlicePresence=doc(bob,'artifacts',appId,'public','data','room_presence','uid_alice');
const aliceWorld=doc(alice,'artifacts',appId,'users','uid_alice','worlds','my_island');
const bobAliceWorld=doc(bob,'artifacts',appId,'users','uid_alice','worlds','my_island');
const presence={playerId:'uid_alice',displayName:'Alice123',roomKey:'HUB-1:hub',position:[0,1,16],rotY:0,avatar,emoteCode:null,timestamp:Date.now()};
const world=(revision)=>({id:'world_default',ownerPlayerId:'uid_alice',title:'My Builder Island',visibility:'private',revision,objectsJson:'[{"type":"block"}]',updatedAt:new Date().toISOString()});

test('profile owner may read/write identity only',async()=>{
 await assertSucceeds(setDoc(aliceProfile,{displayName:'Alice123',avatar}));
 await assertSucceeds(getDoc(aliceProfile));
 await assertFails(getDoc(bobAliceProfile));
 await assertFails(setDoc(bobAliceProfile,{displayName:'Admin',avatar}));
});
test('stars and rewardClaims cannot be written by untrusted browser',async()=>{
 await assertFails(setDoc(aliceProfile,{displayName:'Alice123',avatar,stars:999999}));
 await assertFails(setDoc(aliceProfile,{displayName:'Alice123',avatar,rewardClaims:{win:true}}));
});
test('room presence cannot spoof or delete another Firebase UID',async()=>{
 await assertSucceeds(setDoc(alicePresence,presence));
 await assertFails(setDoc(bobAlicePresence,{...presence,timestamp:Date.now()}));
 await assertFails(deleteDoc(bobAlicePresence));
 await assertFails(setDoc(alicePresence,{...presence,roomKey:'HACKED:unknown'}));
 await assertFails(setDoc(alicePresence,{...presence,displayName:'<script>'}));
});
test('world ownership, schema and revision enforcement',async()=>{
 await assertSucceeds(setDoc(aliceWorld,world(2)));
 await assertFails(setDoc(bobAliceWorld,world(3)));
 await assertFails(setDoc(aliceWorld,world(4)));
 await assertSucceeds(setDoc(aliceWorld,world(3)));
 await assertFails(setDoc(aliceWorld,{...world(4),stars:1000}));
});
