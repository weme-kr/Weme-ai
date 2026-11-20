// 사이트 공통 설정
window.WEME = {
  brand: '위미(weme)',
  contactEmail: 'asperato@gmail.com'
};

// mailto 링크 만들기 (제목·본문 자동 입력)
window.wemeMailto = function (subject, body) {
  return 'mailto:' + window.WEME.contactEmail +
    '?subject=' + encodeURIComponent(subject) +
    (body ? '&body=' + encodeURIComponent(body) : '');
};

// data-mail-subject 속성이 있는 링크에 mailto 연결
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-mail-subject]').forEach(function (a) {
    a.href = window.wemeMailto(a.dataset.mailSubject, a.dataset.mailBody || '');
  });
  document.querySelectorAll('[data-mail-text]').forEach(function (el) {
    el.textContent = window.WEME.contactEmail;
  });
});
