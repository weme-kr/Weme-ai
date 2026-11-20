# 위미(weme) — AI 기업교육 강사 매칭 MVP

IT·스타트업 피플팀이 교육 조건을 입력하면 맞춤 강사 3명을 추천하고, **견적서·사내 결재용 품의서 PDF**를 바로 만들어 주는 웹 서비스 MVP입니다.

## 페이지
| 파일 | 내용 |
|---|---|
| `index.html` | 랜딩페이지 (Hero / 목표 지표 / 문제 / 솔루션 / 진행 방식 / 도입 효과·파일럿 모집 / FAQ / 최종 CTA) |
| `match.html` | 매칭 챗봇: 기업 정보 → 인원·일정·예산 → 원하는 교육 → 추천 3개 → 견적서·품의서 PDF → 상담 신청 메일 |

## 구조
```
assets/
  css/base.css      공통 디자인 토큰 (라이트/다크)
  css/landing.css   랜딩페이지
  css/match.css     매칭 챗봇·문서
  js/config.js      문의 이메일 등 공통 설정
  js/catalog.js     강사·프로그램 데이터 (샘플)
  js/match.js       대화 흐름, 추천 점수, PDF 생성
docs/               기획 문서 (페르소나, 여정맵, 메시지, 랜딩 카피)
```

## 자주 바꾸는 곳
- **문의 이메일**: `assets/js/config.js`의 `contactEmail`
- **강사·프로그램**: `assets/js/catalog.js`의 `WEME_CATALOG` (현재는 시연용 샘플)
- **추천 기준**: `assets/js/match.js`의 `score()` — 목적 일치 3점, 대상 일치 2점, 키워드 1.5점, 시간·예산 적합 가점

## 로컬에서 보기
빌드 없이 `index.html`을 브라우저로 열면 됩니다. 로컬 서버가 필요하면:
```bash
ruby -run -e httpd . -p 8080
```

## 배포
GitHub Pages: 저장소 Settings → Pages → Branch `main` / `/ (root)`.

## 참고
- 랜딩페이지 수치는 **서비스 목표치**이며 실제 실적이 아닙니다.
- 추천은 서버 없이 브라우저에서 규칙 기반으로 계산합니다. 실제 AI 추천은 이후 서버리스(예: Cloudflare Workers + Claude API)로 확장 예정입니다.
