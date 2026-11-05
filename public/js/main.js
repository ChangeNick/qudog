// Шапка над первым экраном, мобильное меню, видео-петли, письмо из формы.
(() => {
  'use strict';

  // Шапка прозрачная, пока виден первый экран
  const header = document.getElementById('header');
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([e]) => header.classList.toggle('is-over-hero', e.isIntersecting), {
    rootMargin: `-${header.offsetHeight}px 0px 0px 0px`,
  }).observe(hero);

  // Мобильное меню закрывается по клику на пункт и по Esc
  const menu = document.getElementById('menu');
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { menu.open = false; }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });

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
