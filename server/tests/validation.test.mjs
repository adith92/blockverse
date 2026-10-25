import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PLAYERS,roomId,displayName,avatar,position,rotation,originAllowed} from '../validation.mjs';
test('room capacity exactly 16',()=>assert.equal(MAX_PLAYERS,16));
test('reject invalid or long codes',()=>{assert.equal(roomId('HUB-1'),'HUB-1');assert.equal(roomId('<script>'),null);assert.equal(roomId('A'.repeat(17)),null);});
test('deny custom free-text usernames',()=>{assert.equal(displayName('Kai123'),'Kai123');assert.equal(displayName('<h1>x</h1>'),null);});
test('reject unsafe avatar and float values',()=>{assert.equal(avatar({torsoColor:'#000000',headColor:'#FFCB47',limbColor:'#14213D',accessory:'cap'}),null);assert.equal(position([NaN,0,0]),null);assert.equal(rotation(Infinity),null);});
test('allow only explicit origins',()=>{assert.equal(originAllowed('https://blockverse.example',['https://blockverse.example']),true);assert.equal(originAllowed('https://evil.example',['https://blockverse.example']),false);});
