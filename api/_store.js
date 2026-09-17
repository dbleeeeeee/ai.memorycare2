// 저장소: Upstash Redis(Vercel Marketplace)가 연결되어 있으면 사용, 없으면 메모리(데모용)
import { Redis } from '@upstash/redis';

const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY='stories:v1';
const LIMIT=500;

let redis=null;
if(url&&token) redis=new Redis({url,token});
const mem=globalThis.__mem_stories||(globalThis.__mem_stories=[]);

export const persistent=!!redis;

export async function addStory(story){
  if(redis){ await redis.lpush(KEY, JSON.stringify(story)); await redis.ltrim(KEY,0,LIMIT-1); }
  else { mem.unshift(story); if(mem.length>LIMIT) mem.length=LIMIT; }
  return story;
}
export async function listStories(n=30){
  if(redis){ const rows=await redis.lrange(KEY,0,n-1); return rows.map(r=>typeof r==='string'?JSON.parse(r):r); }
  return mem.slice(0,n);
}
export async function removeStory(id){
  if(redis){
    const rows=await redis.lrange(KEY,0,LIMIT-1);
    const hit=rows.find(r=>(typeof r==='string'?JSON.parse(r):r).id===id);
    if(hit) await redis.lrem(KEY,1,typeof hit==='string'?hit:JSON.stringify(hit));
    return !!hit;
  }
  const i=mem.findIndex(s=>s.id===id); if(i>=0) mem.splice(i,1); return i>=0;
}
export async function countStories(){
  if(redis) return await redis.llen(KEY);
  return mem.length;
}
