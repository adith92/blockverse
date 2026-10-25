/** Portable zip export built with Node built-ins only: npm run zip. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const ROOT = process.cwd();
const DEST = path.resolve(ROOT, 'BLOCKVERSE_SOURCE_HARDENED.zip');
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', '.firebase', '.vercel']);
const EXCLUDED = /^\.env(\.|$)/;
function gather(dir = '') {
  const result=[];
  for(const entry of fs.readdirSync(path.join(ROOT,dir), {withFileTypes:true})) {
    if (SKIP.has(entry.name)||EXCLUDED.test(entry.name)&&entry.name!=='.env.example'||entry.name.endsWith('.zip')||entry.name==='.DS_Store')continue;
    const rel=path.posix.join(dir,entry.name);
    if(entry.isDirectory())result.push(...gather(rel));
    else if(entry.isFile())result.push(rel);
  }
  return result;
}
const crcTable=new Uint32Array(256);
for(let i=0;i<256;i++) { let c=i; for(let j=0;j<8;j++)c=((c&1)?(0xedb88320^(c>>>1)):(c>>>1)); crcTable[i]=c>>>0; }
function crc32(buffer) {let c=0xffffffff;for(let i=0;i<buffer.length;i++)c=crcTable[(c^buffer[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function dosTime(){return 0;}
function dosDate(){return ((2026-1980)<<9)|(10<<5)|25;}
const out=[];const central=[];const sha={};let offset=0;
for(const name of gather().sort()) {
 const bytes=fs.readFileSync(path.join(ROOT,name));
 const filename=Buffer.from(name,'utf8');
 const crc=crc32(bytes);
 const local=Buffer.alloc(30);
 local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);
 local.writeUInt16LE(0,8);local.writeUInt16LE(dosTime(),10);local.writeUInt16LE(dosDate(),12);
 local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
 const header=Buffer.alloc(46);
 header.writeUInt32LE(0x02014b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(20,6);
 header.writeUInt16LE(0x0800,8);header.writeUInt16LE(0,10);header.writeUInt16LE(dosTime(),12);header.writeUInt16LE(dosDate(),14);
 header.writeUInt32LE(crc,16);header.writeUInt32LE(bytes.length,20);header.writeUInt32LE(bytes.length,24);
 header.writeUInt16LE(filename.length,28);header.writeUInt32LE(offset,42);
 out.push(local,filename,bytes);central.push(header,filename);
 sha[name]=createHash('sha256').update(bytes).digest('hex');
 offset+=local.length+filename.length+bytes.length;
}
const centralOffset=offset;const centralBytes=Buffer.concat(central);
const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(sha).length,8);end.writeUInt16LE(Object.keys(sha).length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(centralOffset,16);
fs.writeFileSync(DEST,Buffer.concat([...out,centralBytes,end]));
console.log(JSON.stringify({file:DEST,files:Object.keys(sha).length,bytes:fs.statSync(DEST).size,sha256:createHash('sha256').update(fs.readFileSync(DEST)).digest('hex')},null,2));
