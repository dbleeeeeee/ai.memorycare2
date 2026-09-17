# 이천, 이야기로 잇다 — 기억 잇기 (GitHub + Vercel)

정적 사이트(`public/index.html`) + Vercel 서버리스 함수(`api/link.js`)로 **기억 잇기**가 실제로 동작합니다.
관람자가 남긴 한 문장은 서버에 저장되고, 주제·연도·단어 겹침으로 어르신 기억과 매칭되어 모두가 보는 벽에 붙습니다.

```
├─ public/index.html   첫 화면 · 이음선(비주얼) 버전 (기억 잇기가 /api/link 를 호출)
├─ public/cards.html   같은 사이트의 카드형 버전 · 주소 뒤에 /cards.html
├─ api/link.js         GET 목록 · POST 저장+매칭 · DELETE 관리자 삭제
├─ api/_elders.js      어르신 문장 데이터 + 매칭 규칙 (자서전 확정 시 여기만 교체)
├─ api/_store.js       저장소 (Upstash Redis 연결 시 영구, 아니면 메모리)
├─ package.json / vercel.json / .env.example
```

## 배포 순서 (약 10분)

### 1. GitHub에 올리기
1. github.com 에서 새 저장소 생성 (예: `icheon-story-archive`, Private 가능)
2. 이 폴더의 파일을 그대로 업로드하거나, 터미널에서:
   ```bash
   git init
   git add .
   git commit -m "기억 잇기 첫 배포"
   git branch -M main
   git remote add origin https://github.com/<계정>/icheon-story-archive.git
   git push -u origin main
   ```

### 2. Vercel에 연결
1. vercel.com 로그인 → **Add New… → Project** → 방금 만든 GitHub 저장소 **Import**
2. Framework Preset은 **Other** 그대로, 나머지 설정도 그대로 두고 **Deploy**
3. 1~2분 뒤 `https://<프로젝트명>.vercel.app` 주소가 나옵니다. 이 상태로도 기억 잇기가 동작합니다
   (단, 저장소를 연결하기 전까지는 서버가 잠들면 문장이 사라집니다 — 화면에도 안내가 뜹니다)

### 3. 영구 저장소 연결 (권장, 무료 플랜 있음)
1. Vercel 프로젝트 → **Storage** 탭 → **Create Database** → **Upstash (Redis)** 선택 → Create
2. 프로젝트에 연결(Connect)하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 들어갑니다
3. **Deployments → 최신 배포 → Redeploy** 한 번 (환경변수 반영)
4. 사이트에서 문장을 남겨 보고, 새로고침해도 벽에 남아 있으면 완료

### 4. (선택) 관리자 삭제
- Vercel → Settings → Environment Variables 에 `ADMIN_TOKEN=원하는비밀번호` 추가 후 Redeploy
- 삭제: `curl -X DELETE "https://<주소>/api/link?id=<문장id>" -H "x-admin-token: 원하는비밀번호"`
  (문장 id는 `GET /api/link` 응답에 있습니다)

이후에는 GitHub `main`에 push 할 때마다 자동으로 다시 배포됩니다.

## API
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/link?n=30` | 최근 이어진 이야기 `{stories, total, persistent}` |
| POST | `/api/link` | `{text, from}` → 저장 후 `{story}` 반환 (5~140자, 1분 10회 제한, 금칙어 필터) |
| DELETE | `/api/link?id=` | 관리자 삭제 (`x-admin-token` 헤더) |

## 매칭 규칙 (`api/_elders.js`)
1. 관람자 문장에서 주제 키워드(음식·가족·일·첫사랑·전쟁·고향·살림)를 세어 주제 추정
2. 문장에 연도가 있으면 ±8년 이내 기억 우선
3. 남은 후보 중 단어 겹침이 가장 많은 기억, 동점이면 무작위

자서전 원문이 확정되면 `ELDERS` 배열(30줄)과 `public/index.html`의 `S` 배열을 같은 내용으로 교체하세요.
필요하면 이 매칭을 Claude API 기반 의미 매칭으로 바꿀 수 있습니다 (환경변수 하나 추가).

## 로컬에서 돌려보기
```bash
npm i -g vercel
npm install
vercel dev      # http://localhost:3000
```
