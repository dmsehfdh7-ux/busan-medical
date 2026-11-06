# 채채의 생일 앱 (2001.11.08)

설치형 웹앱(PWA)입니다. 외부 라이브러리·유료 서비스 없이 HTML 하나로 동작합니다.

## 폰에 설치하기
1. 아래 중 한 방법으로 주소를 엽니다.
   - GitHub Pages: 저장소 Settings → Pages → Source를 **GitHub Actions**로 바꾸면 `.github/workflows/birthday-pages.yml`이 `birthday/` 폴더를 자동 배포합니다.
   - 아무 정적 호스팅(Netlify Drop, Vercel 등)에 `birthday/` 폴더를 올려도 됩니다.
2. 아이폰 Safari: 공유 → **홈 화면에 추가**. 안드로이드 Chrome: 메뉴 → **홈 화면에 추가 / 앱 설치**.
3. 한 번 열고 나면 오프라인에서도 열립니다(`sw.js`가 사진까지 캐시).

## 내용 바꾸기
`index.html` 안의 `CONFIG` 블록만 고치면 됩니다.
- `photos`: 사진 파일과 한 줄 캡션
- `letter`, `sign`: 편지 본문과 서명
- `coupons`: 쿠폰 목록

사진은 `photos/pNN.js`처럼 base64 데이터로 들어 있습니다(저장소에 바이너리 없이 텍스트만 두기 위해). 새 사진을 넣으려면 같은 형식의 js 파일을 만들고 `index.html`의 `<script src="photos/...">` 줄과 `sw.js` 캐시 목록, `CONFIG.photos`에 추가하세요.

## 화면
- 홈: 생일까지 카운트다운(한국 시간), 태어난 지 며칠인지, 초 불기(5개 다 끄면 색종이)
- 사진: 폴라로이드 가로 넘김 + 전체 보기, 탭하면 크게 보기(스와이프 가능)
- 편지: 타이핑되는 편지
- 쿠폰: "사용하기" 누르면 사용 완료 도장(폰에 저장), 되돌리기 가능
- 상단 음표 버튼: Web Audio로 만든 생일 축하 노래
- 11월 8일 당일에는 홈 화면에 색종이가 계속 내려옵니다.
