import test from 'node:test';
import assert from 'node:assert/strict';
import { Validator, MAX_WORLD_OBJECTS, escapeHtml } from '../src/schema.mjs';
const block=(id='id_1')=>({id,type:'block',position:[5,1,5],rotation:[0,0,0],scale:[1,1,1],color:'#4CC9F0'});
const owner='player_1';
const world={ ownerPlayerId:owner, revision:2 };

test('rejects unsafe and unsupported world objects',()=>{
 for(const obj of [
  {...block(),type:'script_injector'},
  {...block(),position:[NaN,1,2]},
  {...block(),position:[Infinity,1,2]},
  {...block(),position:[121,1,2]},
  {...block(),rotation:[0,22,0]},
  {...block(),scale:[0,1,1]},
  {...block(),scale:[21,1,1]},
  {...block(),color:'red'},
  {...block(),position:[0,1,18]},
  {...block(),id:'x'},
 ]) assert.equal(Validator.validateWorldObject(obj).ok,false,JSON.stringify(obj));
});
test('accepts valid object types and bounds',()=>{
 for(const type of ['block','ramp','platform','cylinder','sphere','tree','lamp','spawn'])
  assert.equal(Validator.validateWorldObject({...block(),type}).ok,true,type);
});
test('rejects non-owner, revision mismatch and quota',()=>{
 assert.equal(Validator.validateWorldPayload({revision:2,objects:[block()]},world,'other').status,403);
 assert.equal(Validator.validateWorldPayload({revision:1,objects:[block()]},world,owner).status,409);
 assert.equal(Validator.validateWorldPayload({revision:2,objects:Array.from({length:MAX_WORLD_OBJECTS+1},(_,i)=>block(`obj_${i}`))},world,owner).status,400);
 assert.equal(Validator.validateWorldPayload({revision:2,objects:[block()]},world,owner).status,200);
});
test('validates avatar palette and names',()=>{
 const avatar={torsoColor:'#4CC9F0',headColor:'#FFCB47',limbColor:'#14213D',accessory:'cap'};
 assert.equal(Validator.validateAvatar(avatar).ok,true);
 assert.equal(Validator.validateAvatar({...avatar,accessory:'script'}).ok,false);
 assert.equal(Validator.validateAvatar({...avatar,headColor:'<img>'}).ok,false);
 assert.match(Validator.sanitizeDisplayName('<img src=x onerror=alert(1)>'),/^[A-Za-z0-9_-]{3,16}$/);
});
test('blocks invalid moves and escapes dynamic nametags',()=>{
 assert.equal(Validator.validatePlayerMovePacket({position:[2,1,5],rotY:1}).valueOf(),true);
 assert.equal(Validator.validatePlayerMovePacket({position:[NaN,1,5],rotY:1}),false);
 assert.equal(Validator.validatePlayerMovePacket({position:[5000,1,5],rotY:1}),false);
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
