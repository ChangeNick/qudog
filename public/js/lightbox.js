// Просмотр изображений: картинка вырастает из миниатюры, листается внутри своей секции.
// Какие картинки открываются: задаётся селектором SELECTOR. Разметка окна в конце index.html.
(() => {
  'use strict';

  const SELECTOR = 'main img:not(.hero img)';
  const OPEN_MS = 420;
  const CLOSE_MS = 260;
  const EASE = 'cubic-bezier(.19, 1, .22, 1)';

  const dialog = document.getElementById('lightbox');
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const prevBtn = dialog.querySelector('[data-prev]');
  const nextBtn = dialog.querySelector('[data-next]');
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let group = [];
  let index = 0;
  let closing = false;

  // Самый большой файл из srcset
  const largestSrc = (img) => {
    const set = img.getAttribute('srcset');
    if (!set) return img.getAttribute('src');
    return set.split(',')
      .map((s) => s.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1], 10) - parseInt(a[1], 10))[0][0];
  };

  const captionFor = (img) => {
    const own = img.closest('figure')?.querySelector('figcaption');
    const title = img.closest('.case, .robot, .timeline li, .case-main')?.querySelector('h3');
    return (own || title)?.textContent.trim() || img.alt;
  };

  const show = (i) => {
    index = (i + group.length) % group.length;
    const thumb = group[index];
    // Размер задаётся сразу, поэтому окно не прыгает, пока грузится большой файл.
    // Маленькие кадры показываем крупнее, чем они есть, но не больше чем вдвое.
    const w = Number(thumb.getAttribute('width'));
    const h = Number(thumb.getAttribute('height'));
    const k = w < 1000 ? 2 : 1;
    image.style.setProperty('--w', `${w * k}px`);
    image.style.setProperty('--ratio', w / h);
    image.src = thumb.currentSrc || thumb.src;
    image.alt = thumb.alt;
    caption.textContent = captionFor(thumb);

    const large = largestSrc(thumb);
    const loader = new Image();
    loader.src = large;
    loader.decode().then(() => { if (group[index] === thumb) image.src = large; }).catch(() => {});
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
  };

  const inViewport = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

  // Кадр анимации, в котором большая картинка точно совпадает с миниатюрой, включая её обрезку
  const thumbFrame = (thumb) => {
    const t = thumb.getBoundingClientRect();
    if (!inViewport(t)) return null;
    const i = image.getBoundingClientRect();
    const scale = Math.max(t.width / i.width, t.height / i.height);
    const insetX = Math.max(0, (i.width - t.width / scale) / 2);
    const insetY = Math.max(0, (i.height - t.height / scale) / 2);
    const dx = t.left + t.width / 2 - (i.left + i.width / 2);
    const dy = t.top + t.height / 2 - (i.top + i.height / 2);
    const radius = parseFloat(getComputedStyle(thumb).borderTopLeftRadius) / scale;
    return {
      transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
      clipPath: `inset(${insetY}px ${insetX}px round ${radius}px)`,
    };
  };
  const FULL = { transform: 'none', clipPath: 'inset(0 0 0 0 round 10px)' };
  const SMALL = { transform: 'scale(.96)', opacity: 0 };

  // Полоса прокрутки исчезает, поэтому место под неё сохраняем, чтобы страница не дёргалась
  const lockScroll = (lock) => {
    root.style.setProperty('--scrollbar', `${innerWidth - root.clientWidth}px`);
    root.classList.toggle('has-lightbox', lock);
  };

  const open = (thumb) => {
    group = [...thumb.closest('section').querySelectorAll('img')].filter((i) => i.matches(SELECTOR));
    closing = false;
    show(group.indexOf(thumb));
    lockScroll(true);
    dialog.showModal();
    dialog.classList.add('is-visible');
    if (!reduced.matches) {
      const from = thumbFrame(thumb);
      if (from) {
        thumb.style.visibility = 'hidden';
        image.animate([from, FULL], { duration: OPEN_MS, easing: EASE });
      } else {
        image.animate([SMALL, { transform: 'none', opacity: 1 }], { duration: OPEN_MS, easing: EASE });
      }
    }
  };

  const finishClose = () => {
    group.forEach((i) => { i.style.visibility = ''; });
    dialog.classList.remove('is-visible');
    dialog.close();
    lockScroll(false);
    image.removeAttribute('src');
  };

  const close = () => {
    if (closing || !dialog.open) return;
    closing = true;
    dialog.classList.remove('is-visible');
    if (reduced.matches) return finishClose();
    const thumb = group[index];
    const to = thumbFrame(thumb) || SMALL;
    const anim = image.animate([FULL, to], { duration: CLOSE_MS, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = () => {
      finishClose();
      anim.cancel();
    };
    return undefined;
  };

  const step = (dir) => {
    if (group.length < 2) return;
    group[index].style.visibility = '';
    show(index + dir);
    group[index].style.visibility = 'hidden';
    if (!reduced.matches) {
      image.animate(
        [{ transform: `translateX(${dir * 28}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 260, easing: EASE },
      );
    }
  };

  // Миниатюры: мышь, клавиатура, подсказка для скринридера
  document.querySelectorAll(SELECTOR).forEach((img) => {
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Открыть изображение: ${img.alt}`);
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(img);
      }
    });
  });

  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  dialog.querySelector('[data-close]').addEventListener('click', close);

  // Клик мимо картинки закрывает окно
  dialog.addEventListener('click', (e) => { if (!e.target.closest('img, button')) close(); });

  // Esc: закрываем сами, чтобы сработала анимация
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // Свайп вбок листает, два пальца не трогаем: это масштабирование
  let touch = null;
  dialog.addEventListener('touchstart', (e) => {
    touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
