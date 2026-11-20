// weme 매칭 챗봇: 기업 정보 → 인원·일정·예산 → 원하는 교육 → 추천 → 견적서·품의서
(function () {
  'use strict';

  const CATALOG = window.WEME_CATALOG;
  const CATS = window.WEME_CATS;
  const TARGETS = window.WEME_TARGETS;
  const INDUSTRY = ['IT·인터넷', '핀테크·금융', '커머스·유통', '게임·콘텐츠', '제조', '기타'];
  const SIZE = ['50인 미만', '50~299인', '300인 이상'];
  const DUR = [['2시간', 2], ['반나절(4시간)', 4], ['하루(8시간)', 8]];
  const BUDGET = [['상관없음', [0, Infinity]], ['1인 5만원 이하', [0, 50000]], ['1인 5~10만원', [50000, 100000]], ['1인 10만원 이상', [100000, Infinity]]];

  const S = { co: { name: '', ind: '', size: '' }, ppl: '', date: '', dur: '', budget: '', cats: [], targets: [], want: '', brief: null, recs: [], pick: null, drafter: { dept: '', name: '' } };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => n.toLocaleString('ko-KR') + '원';
  const durLabel = h => (DUR.find(d => d[1] == h) || [h + '시간'])[0];
  const dateLabel = d => { if (!d) return ''; const x = new Date(d + 'T00:00'); return `${x.getFullYear()}년 ${x.getMonth() + 1}월 ${x.getDate()}일 (${'일월화수목금토'[x.getDay()]})`; };
  const todayISO = () => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };
  const todayDot = () => { const t = new Date(); return `${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}.`; };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function show(id, step) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    [...$('steps').children].forEach((s, i) => s.classList.toggle('on', i === step));
    if (id !== 's-chat') window.scrollTo(0, 0);
  }
  function say(html, me) {
    const d = document.createElement('div');
    d.className = 'msg ' + (me ? 'me' : 'bot');
    d.innerHTML = html;
    $('log').append(d);
    d.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return d;
  }
  function typing() { const d = say('<div class="typing"><i></i><i></i><i></i></div>'); d.style.padding = '0'; return d; }
  async function bot(html) { const t = typing(); await wait(450); t.remove(); return say(html); }
  const card = rows => '<dl class="card">' + rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
  const chips = (name, list, cur, multi) => '<div class="row" role="group">' + list.map(v =>
    `<button type="button" class="chip" data-g="${name}" data-v="${esc(v)}" aria-pressed="${multi ? cur.includes(v) : cur == v}">${esc(v)}</button>`).join('') + '</div>';
  function bindChips(multi) {
    $('dock').querySelectorAll('.chip[data-g]').forEach(b => b.onclick = () => {
      const g = b.dataset.g;
      if (multi && multi.includes(g)) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      else $('dock').querySelectorAll(`.chip[data-g="${g}"]`).forEach(x => x.setAttribute('aria-pressed', x === b));
    });
  }
  const picked = g => [...$('dock').querySelectorAll(`.chip[data-g="${g}"][aria-pressed=true]`)].map(b => b.dataset.v);

  // ---------- 1. 기업 정보 ----------
  function stepCompany() {
    show('s-chat', 0);
    $('dock').innerHTML = `<div><label for="coName">회사 이름</label><input class="field" id="coName" value="${esc(S.co.name)}" placeholder="예: 위미 주식회사" autocomplete="organization"></div>
      <div><span class="lbl">업종</span>${chips('ind', INDUSTRY, S.co.ind)}</div>
      <div><span class="lbl">회사 규모</span>${chips('size', SIZE, S.co.size)}</div>
      <p class="err" id="err"></p><button class="cta" id="next">다음</button>`;
    bindChips();
    $('next').onclick = async () => {
      S.co = { name: $('coName').value.trim(), ind: picked('ind')[0] || '', size: picked('size')[0] || '' };
      const miss = [!S.co.name && '회사 이름', !S.co.ind && '업종', !S.co.size && '회사 규모'].filter(Boolean);
      if (miss.length) { $('err').textContent = miss.join(', ') + '을(를) 입력해 주세요.'; return; }
      $('dock').innerHTML = '';
      say(esc(`${S.co.name} · ${S.co.ind} · ${S.co.size}`), true);
      await bot('기업 정보를 정리했어요.' + card([['회사', S.co.name], ['업종', S.co.ind], ['규모', S.co.size]]));
      await bot('참석 인원, 일정, 예산을 알려주세요.');
      stepWhen();
    };
  }

  // ---------- 2. 인원·일정·예산 ----------
  function stepWhen() {
    show('s-chat', 1);
    $('dock').innerHTML = `<div class="two"><div><label for="ppl">참석 인원</label><input class="field" id="ppl" type="number" inputmode="numeric" min="1" value="${esc(S.ppl)}" placeholder="예: 40"></div>
      <div><label for="date">희망 날짜</label><input class="field" id="date" type="date" min="${todayISO()}" value="${esc(S.date)}"></div></div>
      <div class="row">${[10, 30, 50, 100].map(n => `<button type="button" class="chip" data-add="${n}">+${n}명</button>`).join('')}</div>
      <div><span class="lbl">진행 시간</span>${chips('dur', DUR.map(d => d[0]), S.dur ? durLabel(S.dur) : '')}</div>
      <div><span class="lbl">예산 <small>(VAT 별도)</small></span>${chips('budget', BUDGET.map(b => b[0]), S.budget || '상관없음')}</div>
      <p class="err" id="err"></p><button class="cta" id="next">다음</button>`;
    bindChips();
    $('dock').querySelectorAll('[data-add]').forEach(b => b.onclick = () => { $('ppl').value = (+$('ppl').value || 0) + +b.dataset.add; });
    $('next').onclick = async () => {
      const p = parseInt($('ppl').value, 10), d = $('date').value, du = picked('dur')[0], bu = picked('budget')[0] || '상관없음';
      const miss = [!(p > 0) && '참석 인원', !d && '날짜', !du && '진행 시간'].filter(Boolean);
      if (miss.length) { $('err').textContent = miss.join(', ') + '이(가) 비어 있어요.'; return; }
      if (d < todayISO()) { $('err').textContent = '오늘 이후 날짜를 골라 주세요.'; return; }
      S.ppl = p; S.date = d; S.dur = DUR.find(x => x[0] === du)[1]; S.budget = bu;
      $('dock').innerHTML = '';
      say(esc(`${p}명 · ${dateLabel(d)} · ${du} · ${bu}`), true);
      await bot('일정을 정리했어요.' + card([['인원', p + '명'], ['날짜', dateLabel(d)], ['진행 시간', du], ['예산', bu]]));
      await bot('어떤 교육이 필요하세요? 목적과 수강 대상을 고르고, 다루고 싶은 주제나 툴을 적어 주세요.');
      stepWant();
    };
  }

  // ---------- 3. 원하는 교육 ----------
  function stepWant() {
    show('s-chat', 2);
    $('dock').innerHTML = `<div><span class="lbl">교육 목적 <small>(여러 개 선택 가능)</small></span>${chips('cat', CATS, S.cats, true)}</div>
      <div><span class="lbl">수강 대상 <small>(여러 개 선택 가능)</small></span>${chips('tg', TARGETS, S.targets, true)}</div>
      <div><label for="want">다루고 싶은 주제·툴·분위기</label><textarea class="field" id="want" placeholder="예: 개발자들이 AI 코딩 도구를 실무에 바로 쓰게 하고 싶어요. 뻔한 강의는 피하고 싶어요.">${esc(S.want)}</textarea></div>
      <p class="err" id="err"></p><button class="cta" id="next">정리해 보기</button>`;
    bindChips(['cat', 'tg']);
    $('next').onclick = async () => {
      S.cats = picked('cat'); S.targets = picked('tg'); S.want = $('want').value.trim();
      if (!S.cats.length && !S.want) { $('err').textContent = '목적을 하나 고르거나 원하는 내용을 적어 주세요.'; return; }
      $('dock').innerHTML = '';
      say(esc([S.cats.join('·'), S.targets.join('·'), S.want].filter(Boolean).join(' / ')), true);
      S.brief = makeBrief();
      await bot('이렇게 이해했어요. 맞나요?' + card([
        ['목적', S.brief.purpose],
        ['교육 분야', S.brief.cats.join(', ') || '지정 안 함'],
        ['수강 대상', S.targets.join(', ') || '지정 안 함'],
        ['원하는 조건', S.brief.cond || '없음']]));
      $('dock').innerHTML = '<div class="bar"><button class="cta" id="ok">맞아요, 추천 받기</button><button class="ghost" id="fix">수정</button></div>';
      $('fix').onclick = () => { say('수정할게요', true); stepWant(); };
      $('ok').onclick = () => { say('맞아요', true); $('dock').innerHTML = ''; recommend(); };
    };
  }

  // 자유 입력에서 교육 분야 추정
  const CAT_HINTS = {
    'AI·데이터': ['AI', 'ai', 'GPT', 'LLM', '데이터', '자동화', '프롬프트', 'SQL', '생성형'],
    '개발문화': ['개발', '코드', '엔지니어', '리뷰', '회고', '테크'],
    '리더십': ['리더', '팀장', '관리자', '매니저', '임원', '경영진', '코칭', '1on1'],
    '협업·소통': ['협업', '소통', '갈등', '부서', '대화', '커뮤니케이션', '친해'],
    '조직문화': ['문화', '가치', '타운홀', '온보딩', '번아웃', '웰빙', '일하는 방식'],
    '커리어·성장': ['커리어', '성장', '발표', '문서', '글쓰기', '역량']
  };
  function makeBrief() {
    const guessed = CATS.filter(c => CAT_HINTS[c].some(k => S.want.includes(k)));
    const cats = [...new Set([...S.cats, ...guessed])];
    const purpose = cats.length ? cats.slice(0, 2).join('·') + ' 역량 강화' : '맞춤 교육 탐색';
    return { purpose, cats, cond: S.want };
  }

  // ---------- 4. 추천 (규칙 기반 점수) ----------
  function score(p) {
    if (S.ppl > p.ppl[1] || S.ppl < p.ppl[0]) return null;
    const text = S.want.toLowerCase();
    const catHit = p.cats.filter(c => S.brief.cats.includes(c));
    const tgHit = p.targets.filter(t => S.targets.includes(t));
    const kwHit = p.kw.filter(k => text.includes(k.toLowerCase()));
    const durOk = S.dur >= p.h[0] && S.dur <= p.h[1];
    const durShort = S.dur < p.h[0];
    const range = (BUDGET.find(b => b[0] === S.budget) || BUDGET[0])[1];
    const budgetOk = p.price >= range[0] && p.price <= range[1];
    const s = catHit.length * 3 + tgHit.length * 2 + kwHit.length * 1.5 + (durOk ? 2 : durShort ? -4 : 0) + (budgetOk ? 1 : -3);
    return s >= 3 ? { p, s, catHit, tgHit, kwHit, durOk, budgetOk } : null;
  }
  function reason(r) {
    const bits = [];
    if (r.catHit.length) bits.push(`${r.catHit.join('·')} 목적에 맞아요`);
    if (r.tgHit.length) bits.push(`${r.tgHit.join('·')} 대상 과정이에요`);
    if (r.kwHit.length) bits.push(`요청하신 '${r.kwHit.slice(0, 2).join("', '")}' 내용을 다뤄요`);
    if (!bits.length) bits.push(`${S.ppl}명 규모로 진행하기 좋아요`);
    let s = bits.join(', ') + '.';
    if (!r.durOk) s += ` (${r.p.h[0]}~${r.p.h[1]}시간 과정이라 시간 조율이 필요해요)`;
    if (!r.budgetOk) s += ' (예산 범위를 벗어나요)';
    return s;
  }

  async function recommend() {
    show('s-results', 3);
    $('results').innerHTML = '<h2>맞춤 강사를 찾고 있어요</h2><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    const ranked = CATALOG.map(score).filter(Boolean).sort((a, b) => b.s - a.s);
    S.recs = ranked.slice(0, 3).map(r => ({ ...r, reason: reason(r) }));
    await wait(700);
    renderResults();
  }

  function renderResults() {
    show('s-results', 3);
    if (!S.recs.length) {
      $('results').innerHTML = `<div class="empty"><h2>조건에 맞는 강사를 찾지 못했어요</h2>
        <p class="note">인원·진행 시간·예산을 바꾸거나, 원하는 교육을 조금 더 넓게 적어 보세요. 전담 매니저에게 직접 요청하실 수도 있어요.</p>
        <div class="bar"><button class="cta" id="b1">조건 바꾸기</button><button class="ghost" id="b2">일정·예산 다시 입력</button>
        <a class="ghost" href="${wemeMailto('[weme] 맞춤 강사 요청', leadBody())}">매니저에게 요청하기</a></div></div>`;
      $('b1').onclick = () => { stepWant(); };
      $('b2').onclick = () => { stepWhen(); };
      return;
    }
    $('results').innerHTML = `<h2>${esc(S.co.name)}에 맞는 강사 ${S.recs.length}명을 찾았어요</h2>
      <p class="note">${S.ppl}명 · ${esc(dateLabel(S.date))} · ${durLabel(S.dur)} · ${esc(S.budget)}</p>` +
      S.recs.map((r, i) => `<button class="rec" data-i="${i}"><span class="rank">추천 ${i + 1}</span>
        <div class="meta"><span>${esc(r.p.cats.join(' · '))}</span><span>${r.p.h[0]}~${r.p.h[1]}시간</span><span>1인 ${won(r.p.price)}</span></div>
        <h3>${esc(r.p.name)}</h3><div class="note" style="font-size:15px">${esc(r.p.trainer)} 강사 · ${esc(r.p.role)}</div>
        <div class="why"><b>추천 이유</b>${esc(r.reason)}</div></button>`).join('') +
      `<div class="bar"><button class="ghost" id="again">조건 바꿔서 다시 찾기</button></div>
      <p class="note">현재 강사·프로그램·단가는 서비스 시연용 샘플 데이터입니다.</p>`;
    $('results').querySelectorAll('.rec').forEach(b => b.onclick = () => detail(+b.dataset.i));
    $('again').onclick = () => stepWant();
  }

  // ---------- 상세 ----------
  function detail(i) {
    const r = S.recs[i], p = r.p;
    S.pick = r;
    show('s-detail', 3);
    $('detail').innerHTML = `<button class="ghost" id="back" style="justify-self:start">← 추천 결과로</button>
      <div class="meta"><span>${esc(p.cats.join(' · '))}</span><span>${esc(p.targets.join(' · '))}</span><span>${p.ppl[0]}~${p.ppl[1]}명</span></div>
      <h2>${esc(p.name)}</h2>
      <dl class="card"><dt>강사</dt><dd>${esc(p.trainer)} · ${esc(p.role)}</dd><dt>진행 시간</dt><dd>${p.h[0]}~${p.h[1]}시간</dd>
      <dt>1인 단가</dt><dd>${won(p.price)} (VAT 별도)</dd><dt>기대 효과</dt><dd>${esc(p.effect)}</dd></dl>
      <div class="why"><b>추천 이유</b>${esc(r.reason)}</div>
      <p style="margin:0">${esc(p.desc)}</p>
      <p class="note">섭외·일정 조율·계약·세금계산서 발행·수료증까지 weme가 대행합니다.</p>
      <button class="cta" id="q" style="justify-self:start">견적서·품의서 받기</button>`;
    $('back').onclick = renderResults;
    $('q').onclick = docs;
  }

  // ---------- 견적서·품의서 ----------
  function money() {
    const p = S.pick.p, sub = p.price * S.ppl, vat = Math.round(sub * 0.1);
    return { sub, vat, total: sub + vat };
  }
  function quoteHTML() {
    const p = S.pick.p, m = money();
    return `<h3>견 적 서</h3><p class="sm">발행일 ${todayDot()} · 유효기간 발행일로부터 30일</p>
      <table><tbody>
        <tr><th>수신</th><td>${esc(S.co.name)} 귀중</td></tr>
        <tr><th>교육명</th><td>${esc(p.name)}</td></tr>
        <tr><th>강사</th><td>${esc(p.trainer)} (${esc(p.role)})</td></tr>
        <tr><th>일정</th><td>${esc(dateLabel(S.date))} · ${durLabel(S.dur)}</td></tr>
        <tr><th>인원</th><td>${S.ppl}명</td></tr></tbody></table>
      <table class="gap"><thead><tr><th style="width:auto">항목</th><th class="n">금액</th></tr></thead><tbody>
        <tr><td>교육 프로그램 (1인 ${won(p.price)} × ${S.ppl}명)</td><td class="n">${won(m.sub)}</td></tr>
        <tr><td>섭외·계약·정산·수료증 턴키 행정 대행</td><td class="n">포함</td></tr>
        <tr><td>부가세 (10%)</td><td class="n">${won(m.vat)}</td></tr>
        <tr class="tot"><td>합계 (VAT 포함)</td><td class="n">${won(m.total)}</td></tr></tbody></table>
      <p class="foot">· 강사 당일 불참 시 동급 이상 대체 강사를 배정합니다.<br>· 전자세금계산서는 weme 단일 공급자로 일괄 발행됩니다.<br>· 본 견적은 시연용 샘플 단가 기준이며, 최종 금액은 상담 후 확정됩니다.</p>
      <p class="supplier">공급자: 위미(weme)</p>`;
  }
  function approvalHTML() {
    const p = S.pick.p, m = money();
    const purpose = [S.brief.purpose, S.brief.cond].filter(Boolean).join(' — ');
    return `<div class="sign"><table><tbody><tr><th>담당</th><th>팀장</th><th>본부장</th><th>대표</th></tr><tr><td></td><td></td><td></td><td></td></tr></tbody></table></div>
      <h3>품 의 서</h3><p class="sm">${esc(S.co.name)} · 기안일 ${todayDot()}</p>
      <table><tbody>
        <tr><th>기안 부서</th><td data-f="dept">${esc(S.drafter.dept || '　')}</td></tr>
        <tr><th>기안자</th><td data-f="name">${esc(S.drafter.name || '　')}</td></tr>
        <tr><th>제목</th><td>「${esc(p.name)}」 사내 교육 실시의 건</td></tr>
        <tr><th>교육 목적</th><td>${esc(purpose)}</td></tr>
        <tr><th>교육 대상</th><td>${esc(S.targets.join(', ') || '전 직군')} ${S.ppl}명</td></tr>
        <tr><th>교육 일시</th><td>${esc(dateLabel(S.date))} · ${durLabel(S.dur)}</td></tr>
        <tr><th>교육 내용</th><td>${esc(p.desc)}</td></tr>
        <tr><th>강사</th><td>${esc(p.trainer)} (${esc(p.role)})</td></tr>
        <tr><th>소요 예산</th><td><b>${won(m.total)}</b> (VAT 포함, 1인 ${won(p.price)} × ${S.ppl}명 + 부가세)</td></tr>
        <tr><th>기대 효과</th><td>${esc(p.effect)}</td></tr>
        <tr><th>운영 방식</th><td>위미(weme) 턴키 대행 — 강사 섭외·일정 조율·계약·세금계산서 일괄 발행·수료증 발급 및 교육 후 만족도 리포트 제공</td></tr>
        <tr><th>첨부</th><td>견적서 1부</td></tr></tbody></table>
      <p class="foot">위와 같이 사내 교육을 실시하고자 하오니 검토 후 재가하여 주시기 바랍니다.</p>`;
  }

  function leadBody() {
    const lines = [
      '안녕하세요, weme 맞춤 강사 추천을 보고 상담을 요청합니다.', '',
      `회사: ${S.co.name} (${S.co.ind} · ${S.co.size})`,
      `인원·일정: ${S.ppl}명 · ${dateLabel(S.date)} · ${durLabel(S.dur)}`,
      `예산: ${S.budget}`,
      `목적: ${S.brief ? S.brief.cats.join(', ') : ''}`,
      `수강 대상: ${S.targets.join(', ') || '-'}`,
      `요청 내용: ${S.want || '-'}`
    ];
    if (S.pick) {
      const m = money();
      lines.push(`선택 프로그램: ${S.pick.p.name} (${S.pick.p.trainer} 강사)`, `예상 금액: ${won(m.total)} (VAT 포함)`);
    }
    lines.push('', '담당자 이름:', '연락처:', '희망 상담 시간:');
    return lines.join('\n');
  }

  function docs() {
    show('s-docs', 3);
    const p = S.pick.p;
    $('docs').innerHTML = `<button class="ghost" id="back" style="justify-self:start">← 프로그램 상세로</button>
      <h2>견적서와 품의서가 준비됐어요</h2>
      <p class="note">기안 부서와 기안자를 적으면 품의서에 바로 반영돼요. 그대로 PDF로 받아 결재에 올리세요.</p>
      <div class="docs-form"><div><label for="dDept">기안 부서</label><input class="field" id="dDept" value="${esc(S.drafter.dept)}" placeholder="예: 피플앤컬처팀"></div>
        <div><label for="dName">기안자</label><input class="field" id="dName" value="${esc(S.drafter.name)}" placeholder="예: 김민서 팀장"></div></div>
      <div class="bar"><button class="cta" id="pdf">품의서 + 견적서 PDF 받기</button><button class="ghost" id="copy">견적 내용 복사</button></div>
      <p class="toast" id="toast" role="status"></p>
      <p class="doc-label">품의서</p><div class="paper" id="paperA">${approvalHTML()}</div>
      <p class="doc-label">견적서</p><div class="paper" id="paperQ">${quoteHTML()}</div>
      <div class="lead"><h3>이 조건으로 진행할까요?</h3>
        <p>상담을 신청하시면 전담 매니저가 강사 일정을 확인하고 1영업일 안에 연락드려요.</p>
        <div class="bar"><a class="cta" id="leadBtn" href="#">상담 신청 메일 보내기</a><button class="ghost" id="restart">처음부터 다시</button></div>
        <p class="note">메일 앱이 열리고 지금까지 입력한 내용이 자동으로 채워져요. 받는 주소: <span data-mail-text></span></p></div>`;
    $('docs').querySelector('[data-mail-text]').textContent = WEME.contactEmail;
    $('leadBtn').href = wemeMailto(`[weme 상담 신청] ${S.co.name} · ${p.name}`, leadBody());
    $('back').onclick = () => detail(S.recs.indexOf(S.pick));
    $('restart').onclick = () => location.reload();
    const sync = () => {
      S.drafter = { dept: $('dDept').value.trim(), name: $('dName').value.trim() };
      $('paperA').querySelector('[data-f=dept]').textContent = S.drafter.dept || '　';
      $('paperA').querySelector('[data-f=name]').textContent = S.drafter.name || '　';
    };
    $('dDept').oninput = sync; $('dName').oninput = sync;
    $('copy').onclick = async () => {
      const m = money();
      const txt = `[견적서] ${S.co.name}\n교육: ${p.name} (${p.trainer} 강사)\n일정: ${dateLabel(S.date)} · ${durLabel(S.dur)} · ${S.ppl}명\n금액: ${won(m.sub)} + 부가세 ${won(m.vat)} = 합계 ${won(m.total)}`;
      try { await navigator.clipboard.writeText(txt); $('toast').textContent = '견적 내용을 복사했어요.'; }
      catch (e) { $('toast').textContent = '이 브라우저에서는 복사할 수 없어요.'; }
    };
    $('pdf').onclick = savePdf;
  }

  async function savePdf() {
    const t = $('toast'), btn = $('pdf');
    if (!window.html2canvas || !window.jspdf) { t.textContent = 'PDF 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; return; }
    btn.disabled = true; t.textContent = 'PDF를 만들고 있어요…';
    try {
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pages = [$('paperA'), $('paperQ')];
      for (let i = 0; i < pages.length; i++) {
        const c = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff' });
        let w = 190, h = c.height * w / c.width;
        if (h > 273) { h = 273; w = c.width * h / c.height; }
        if (i) pdf.addPage();
        pdf.addImage(c.toDataURL('image/png'), 'PNG', (210 - w) / 2, 12, w, h);
      }
      pdf.save(`품의서_견적서_${S.co.name}.pdf`);
      t.textContent = 'PDF를 내려받았어요.';
    } catch (e) {
      t.textContent = 'PDF를 만들지 못했어요. 견적 내용 복사를 이용해 주세요.';
    } finally { btn.disabled = false; }
  }

  // ---------- 시작 ----------
  (async () => {
    show('s-chat', 0);
    await bot('안녕하세요, weme예요. 몇 가지만 알려주시면 우리 팀에 맞는 강사 3명을 추천하고, 견적서와 품의서까지 바로 만들어 드릴게요.');
    await bot('먼저 회사 정보를 알려주세요.');
    stepCompany();
  })();
})();
