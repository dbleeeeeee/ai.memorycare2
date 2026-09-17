// 기억 잇기 API
//   GET    /api/link              → 최근 이어진 이야기 { stories, total, persistent }
//   POST   /api/link {text,from}  → 저장 + 매칭 { story }
//   DELETE /api/link?id=...       → 관리자 삭제 (헤더 x-admin-token = ADMIN_TOKEN)
import { findMatch } from './_elders.js';
import { addStory, listStories, removeStory, countStories, persistent } from './_store.js';

const BANNED=['시발','씨발','병신','새끼']; // 최소 필터. 운영 시 확장
const rate=globalThis.__rate||(globalThis.__rate=new Map());

function ip(req){ return (req.headers['x-forwarded-for']||'').split(',')[0].trim()||'local'; }
function limited(key){
  const now=Date.now(); const arr=(rate.get(key)||[]).filter(t=>now-t<60_000);
  arr.push(now); rate.set(key,arr); return arr.length>10;
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    if(req.method==='GET'){
      const n=Math.min(100,+(req.query.n||30));
      const [stories,total]=await Promise.all([listStories(n),countStories()]);
      return res.status(200).json({stories,total,persistent});
    }
    if(req.method==='POST'){
      if(limited(ip(req))) return res.status(429).json({error:'잠시 후 다시 시도해 주세요. (1분에 10회까지)'});
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const text=String(body.text||'').trim().replace(/\s+/g,' ');
      const from=String(body.from||'익명').trim().slice(0,20)||'익명';
      if(text.length<5) return res.status(400).json({error:'다섯 글자 이상 적어 주세요.'});
      if(text.length>140) return res.status(400).json({error:'140자 이내로 적어 주세요.'});
      if(BANNED.some(w=>text.includes(w))) return res.status(400).json({error:'게시할 수 없는 표현이 있어요.'});
      const {topic,match}=findMatch(text);
      const story={
        id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),
        text, from, topic,
        elder:{id:match.id,name:match.name,sentence:match.sentence,year:match.year,place:match.place},
        at:new Date().toISOString(),
      };
      await addStory(story);
      return res.status(201).json({story,persistent});
    }
    if(req.method==='DELETE'){
      const t=process.env.ADMIN_TOKEN;
      if(!t||req.headers['x-admin-token']!==t) return res.status(401).json({error:'unauthorized'});
      const ok=await removeStory(String(req.query.id||''));
      return res.status(ok?200:404).json({ok});
    }
    res.setHeader('Allow','GET, POST, DELETE');
    return res.status(405).json({error:'method not allowed'});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:'서버 오류가 났어요. 잠시 후 다시 시도해 주세요.'});
  }
}
