// Шапка, мобильное меню, большое видео, видео-петли, письмо из формы.
(() => {
  'use strict';

  // Шапка прозрачная только в самом верху страницы и при закрытом меню
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  let menuOpen = false;

  const syncHeader = () => header.classList.toggle('is-over-hero', window.scrollY <= 4 && !menuOpen);
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  const setMenu = (open) => {
    menuOpen = open;
    menuPanel.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    syncHeader();
  };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  menuPanel.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => { if (menuOpen && !header.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); }
  });

  // Большое видео: своя кнопка вместо штатных контролов, пока ролик не запущен.
  // Без JS остаются обычные контролы.
  const film = document.getElementById('film-video');
  const filmPlay = document.getElementById('film-play');
  film.controls = false;
  filmPlay.hidden = false;
  filmPlay.addEventListener('click', () => {
    filmPlay.hidden = true;
    film.controls = true;
    film.play();
  });

  // Тихие короткие ролики играют только в зоне видимости.
  // При «уменьшить движение» остаются с нативными контролами и не запускаются сами.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loops = document.querySelectorAll('video[data-loop]');
  if (reduced) {
    loops.forEach((v) => { v.controls = true; v.preload = 'metadata'; });
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.play().catch(() => { target.controls = true; });
        else target.pause();
      });
    }, { threshold: 0.25 });
    loops.forEach((v) => io.observe(v));
  }

  // На GitHub Pages нет сервера, поэтому заявка уходит черновиком письма
  const form = document.getElementById('contact-form');
  const error = document.getElementById('form-error');
  const showError = (text) => { error.textContent = text; error.hidden = !text; };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const name = (v.name || '').trim();
    const phone = (v.phone || '').trim();
    const email = (v.email || '').trim();

    if (!name) return showError('Укажите имя.');
    if (!phone && !email) return showError('Укажите телефон или email, чтобы мы могли ответить.');
    if (email && !form.elements.email.checkValidity()) return showError('Проверьте адрес email.');
    if (!v.consent) return showError('Подтвердите согласие на связь.');
    showError('');

    const body = [
      `Имя: ${name}`,
      `Компания: ${(v.company || '').trim()}`,
      `Телефон: ${phone}`,
      `Email: ${email}`,
      '',
      'Объект и задача:',
      (v.message || '').trim(),
    ].join('\r\n');
    location.href = `mailto:info@qubot.ru?subject=${encodeURIComponent('Заявка с qudog.ru')}&body=${encodeURIComponent(body)}`;
  });
})();
