import {randomUUID} from 'node:crypto';
import {EDUCATION_TOPICS,getNpc} from '../src/npc/catalog.mjs';
// Author-reviewed questions: there are no raw LLM-generated facts or client-visible answers.
export const QUIZ_BANK=Object.freeze([
 {id:'math-mangga',topic:'matematika',question:'Di pasar ada 3 mangga, lalu ditambah 2 mangga. Ada berapa mangga?',choices:['4','5','6'],answer:1,explain:'Tiga ditambah dua adalah lima. Kita bisa menghitung dengan jari!'},
 {id:'literasi-sopan',topic:'literasi',question:'Kata mana yang kita ucapkan saat dibantu teman?',choices:['Terima kasih','Pergi','Diam'],answer:0,explain:'Terima kasih menunjukkan penghargaan kepada orang yang membantu.'},
 {id:'sains-tumbuhan',topic:'sains',question:'Apa yang dibutuhkan tanaman agar tumbuh?',choices:['Plastik','Air dan cahaya','Asap'],answer:1,explain:'Air dan cahaya matahari membantu tanaman bertumbuh.'},
 {id:'geo-jakarta',topic:'geografi',question:'Cengkareng berada di wilayah kota administrasi mana?',choices:['Jakarta Barat','Bandung','Surabaya'],answer:0,explain:'Cengkareng merupakan kecamatan di Jakarta Barat.'},
 {id:'sejarah-nusantara',topic:'sejarah',question:'Bagaimana sikap kita kepada teman dengan budaya berbeda?',choices:['Mengejek','Menghargai','Menghindari'],answer:1,explain:'Kita menghormati keberagaman budaya Indonesia.'},
 {id:'lingkungan-sampah',topic:'lingkungan',question:'Ke mana kita membuang sampah setelah piknik?',choices:['Ke sungai','Di jalan','Ke tempat sampah'],answer:2,explain:'Sampah di tempatnya membuat sungai dan taman bersih.'},
 {id:'etika-antre',topic:'etika',question:'Saat dua teman ingin memakai ayunan, apa yang sebaiknya dilakukan?',choices:['Bergantian','Berebut','Mendorong'],answer:0,explain:'Bergiliran membuat permainan adil dan aman.'},
 {id:'seni-warna',topic:'seni',question:'Di antara ini mana warna primer dalam seni rupa tradisional?',choices:['Hijau','Biru','Ungu'],answer:1,explain:'Merah, biru, dan kuning adalah warna primer dalam teori warna tradisional.'},
 {id:'keselamatan-jalan',topic:'keselamatan',question:'Apa yang dilakukan sebelum menyeberang jalan?',choices:['Berlari tanpa melihat','Lihat kanan-kiri dengan pendamping','Bermain di jalan'],answer:1,explain:'Berhenti, periksa lalu lintas dan menyeberang dengan pendamping dewasa.'},
 {id:'logika-pola',topic:'logika',question:'Lanjutkan pola: lingkaran, bintang, lingkaran, bintang, ...',choices:['Persegi','Bintang','Lingkaran'],answer:2,explain:'Pola bergantian A-B-A-B dilanjutkan A, yaitu lingkaran.'}
].map(q=>Object.freeze(q)));
const byTopic=new Map(QUIZ_BANK.map(q=>[q.topic,q]));
const sessions=new Map();
function expire(now=Date.now()){for(const [id,s] of sessions)if(s.until<now)sessions.delete(id);while(sessions.size>300)sessions.delete(sessions.keys().next().value);}
function respond(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){const parts=[];let length=0;for await(const c of req){length+=c.length;if(length>1024)throw Error('too_large');parts.push(c);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('bad_json');}}
export function createQuizApi(){
 return async(req,res,allowedOrigins)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  if(route!=='/api/quiz/start'&&route!=='/api/quiz/answer')return false;
  if(req.method!=='POST'){respond(res,405,{error:'method_not_allowed'});return true;}
  if(!req.headers.origin||!allowedOrigins.includes(req.headers.origin)){respond(res,403,{error:'origin_denied'});return true;}
  if(req.headers['content-type']?.split(';')[0]!=='application/json'){respond(res,415,{error:'json_required'});return true;}
  let data;try{data=await body(req);}catch{respond(res,400,{error:'bad_json'});return true;}
  expire();
  if(route==='/api/quiz/start'){
   const npc=getNpc(data?.npcId);
   if(!npc){respond(res,404,{error:'npc_not_found'});return true;}
   const topic=typeof data.topic==='string'&&npc.topics.includes(data.topic)?data.topic:npc.topic;
   const quiz=byTopic.get(topic)||byTopic.get(npc.topic);
   if(!quiz||!EDUCATION_TOPICS[quiz.topic]){respond(res,404,{error:'topic_not_found'});return true;}
   const token=randomUUID();sessions.set(token,{quizId:quiz.id,until:Date.now()+120000,attempts:0});
   respond(res,200,{quizId:token,topic:quiz.topic,question:quiz.question,choices:quiz.choices.slice(),expiresIn:120});
   return true;
  }
  const session=typeof data?.quizId==='string'?sessions.get(data.quizId):null;
  if(!session){respond(res,404,{error:'quiz_expired'});return true;}
  if(!Number.isInteger(data.choice)||data.choice<0||data.choice>2){respond(res,400,{error:'invalid_choice'});return true;}
  sessions.delete(data.quizId);
  const quiz=QUIZ_BANK.find(q=>q.id===session.quizId);
  const correct=quiz.answer===data.choice;
  respond(res,200,{correct,explanation:quiz.explain,badge:correct?'🌟 Bintang Pengetahuan':'💛 Belajar Lagi',noPoints:true});
  return true;
 };
}
