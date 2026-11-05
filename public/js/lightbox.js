// Просмотр изображений. Какие картинки открываются, задаёт SELECTOR. Разметка окна в конце index.html.
// Анимируются только transform и opacity: они идут на видеокарте и не зависят от загрузки страницы.
(() => {
  'use strict';

  const SELECTOR = 'main img:not(.hero img, .robot__img)';
  const OPEN_MS = 460;
  const CLOSE_MS = 340;
  const SLIDE_MS = 420;
  const SLIDE_PX = 70;
  const EASE = 'cubic-bezier(.32, .72, 0, 1)'; // кривая анимаций iOS

  const dialog = document.getElementById('lightbox');
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const prevBtn = dialog.querySelector('[data-prev]');
  const nextBtn = dialog.querySelector('[data-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let group = [];
  let index = 0;
  let closing = false;
  let stepToken = 0;

  const largestSrc = (img) => {
    const set = img.getAttribute('srcset');
    if (!set) return img.getAttribute('src');
    return set.split(',')
      .map((s) => s.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1], 10) - parseInt(a[1], 10))[0][0];
  };

  // Большие файлы декодируются заранее, чтобы подмена не попадала на кадры анимации
  const cache = new Map();
  const preload = (thumb) => {
    const src = largestSrc(thumb);
    if (!cache.has(src)) {
      const img = new Image();
      img.src = src;
      const entry = { img, ready: false };
      entry.promise = img.decode().then(() => { entry.ready = true; return true; }).catch(() => false);
      cache.set(src, entry);
    }
    return cache.get(src).promise;
  };
  const bestSrc = (thumb) => {
    const entry = cache.get(largestSrc(thumb));
    return entry && entry.ready ? largestSrc(thumb) : (thumb.currentSrc || thumb.src);
  };

  const captionFor = (img) => {
    const own = img.closest('figure')?.querySelector('figcaption');
    const title = img.closest('.case, .timeline li, .case-main')?.querySelector('h3');
    return (own || title)?.textContent.trim() || img.alt;
  };

  const fill = (thumb) => {
    // Размер задаётся сразу, поэтому окно не прыгает, когда приходит большой файл.
    // Маленькие кадры показываем крупнее, чем они есть, но не больше чем вдвое.
    const w = Number(thumb.getAttribute('width'));
    const h = Number(thumb.getAttribute('height'));
    image.style.setProperty('--w', `${w < 1000 ? w * 2 : w}px`);
    image.style.setProperty('--ratio', w / h);
    image.src = bestSrc(thumb);
    image.alt = thumb.alt;
    caption.textContent = captionFor(thumb);
  };

  // Большой файл подставляется только после анимации
  const upgrade = (thumb, after) => {
    Promise.all([preload(thumb), after]).then(([ok]) => {
      const src = largestSrc(thumb);
      if (ok && dialog.open && !closing && group[index] === thumb && image.getAttribute('src') !== src) image.src = src;
    }).catch(() => {});
  };
  const preloadNeighbours = () => {
    if (group.length < 2) return;
    preload(group[(index + 1) % group.length]);
    preload(group[(index - 1 + group.length) % group.length]);
  };

  const inViewport = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

  // Положение и масштаб, при которых большая картинка лежит точно поверх миниатюры
  const thumbTransform = (thumb) => {
    const t = thumb.getBoundingClientRect();
    if (!inViewport(t)) return 'scale(.94)';
    const i = image.getBoundingClientRect();
    const scale = Math.max(t.width / i.width, t.height / i.height);
    const dx = t.left + t.width / 2 - (i.left + i.width / 2);
    const dy = t.top + t.height / 2 - (i.top + i.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  };

  const open = async (thumb) => {
    if (dialog.open) return;
    group = [...thumb.closest('section').querySelectorAll('img')].filter((i) => i.matches(SELECTOR));
    index = group.indexOf(thumb);
    closing = false;
    fill(thumb);
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
    image.style.opacity = '0';
    dialog.showModal();
    await image.decode().catch(() => {});
    // Пересчёт страницы от showModal остаётся в предыдущем кадре, анимация стартует в чистом
    requestAnimationFrame(() => {
      if (!dialog.open || closing) return;
      image.style.opacity = '';
      dialog.classList.add('is-visible');
      thumb.style.visibility = 'hidden';
      let done = Promise.resolve();
      if (!reduced.matches) {
        done = image.animate(
          [{ transform: thumbTransform(thumb), opacity: 0 }, { opacity: 1, offset: 0.14 }, { transform: 'none', opacity: 1 }],
          { duration: OPEN_MS, easing: EASE },
        ).finished;
      }
      upgrade(thumb, done);
      done.then(preloadNeighbours).catch(() => {});
    });
  };

  const finishClose = () => {
    group.forEach((i) => { i.style.visibility = ''; });
    dialog.querySelectorAll('.lightbox__ghost').forEach((g) => g.remove());
    dialog.close();
    image.removeAttribute('src');
  };

  const close = () => {
    if (closing || !dialog.open) return;
    closing = true;
    stepToken += 1;
    dialog.classList.remove('is-visible');
    if (reduced.matches) {
      finishClose();
      return;
    }
    image.getAnimations().forEach((a) => a.cancel());
    const anim = image.animate(
      [{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.8 }, { transform: thumbTransform(group[index]), opacity: 0 }],
      { duration: CLOSE_MS, easing: EASE, fill: 'forwards' },
    );
    anim.onfinish = () => {
      finishClose();
      anim.cancel();
    };
  };

  const step = async (dir) => {
    if (group.length < 2 || closing || !dialog.open) return;
    const token = ++stepToken;
    const nextIndex = (index + dir + group.length) % group.length;
    const next = group[nextIndex];
    // Ждём большой файл недолго: обычно он уже готов, иначе покажем миниатюру и заменим позже
    await Promise.race([preload(next), new Promise((r) => { setTimeout(r, 220); })]);
    if (token !== stepToken) return;

    // Уходящая картинка остаётся копией на своём месте и растворяется
    const ghost = image.cloneNode();
    const rect = image.getBoundingClientRect();
    ghost.className = 'lightbox__ghost';
    ghost.removeAttribute('style');
    Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    dialog.append(ghost);

    group[index].style.visibility = '';
    index = nextIndex;
    next.style.visibility = 'hidden';
    image.getAnimations().forEach((a) => a.cancel());
    image.style.opacity = '0';
    image.style.transform = '';
    fill(next);
    await image.decode().catch(() => {});
    if (token !== stepToken) {
      ghost.remove();
      return;
    }
    image.style.opacity = '';

    if (reduced.matches) {
      ghost.remove();
      upgrade(next, Promise.resolve());
      preloadNeighbours();
      return;
    }
    const out = ghost.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * SLIDE_PX}px)`, opacity: 0 }],
      { duration: SLIDE_MS * 0.7, easing: EASE, fill: 'forwards' },
    );
    out.onfinish = () => ghost.remove();
    const done = image.animate(
      [{ transform: `translateX(${dir * SLIDE_PX}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: SLIDE_MS, easing: EASE },
    ).finished;
    upgrade(next, done);
    done.then(preloadNeighbours).catch(() => {});
  };

  // Миниатюры
  document.querySelectorAll(SELECTOR).forEach((img) => {
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Открыть изображение: ${img.alt}`);
    img.addEventListener('pointerenter', () => preload(img), { passive: true });
    img.addEventListener('touchstart', () => preload(img), { passive: true });
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
  dialog.addEventListener('click', (e) => { if (!e.target.closest('img, button')) close(); });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  // Страница под окном не прокручивается. Блокировка через overflow заставила бы
  // браузер пересчитывать всю страницу и дала бы рывок в начале анимации.
  dialog.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
    const scrolls = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key);
    if (scrolls || (e.key === ' ' && !e.target.closest('button'))) e.preventDefault();
  });

  // Палец: картинка идёт за ним, отпустили — листаем или возвращаем на место.
  // Два пальца и уже увеличенную страницу не трогаем: это масштабирование.
  let touch = null;
  const canPan = () => !window.visualViewport || window.visualViewport.scale <= 1.01;
  dialog.addEventListener('touchstart', (e) => {
    touch = e.touches.length === 1 && canPan() ? { x: e.touches[0].clientX, dx: 0 } : null;
    if (touch) image.getAnimations().forEach((a) => a.cancel());
  }, { passive: true });
  dialog.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || !canPan()) {
      touch = null;
      image.style.transform = '';
      return;
    }
    e.preventDefault();
    if (!touch || group.length < 2) return;
    touch.dx = e.touches[0].clientX - touch.x;
    image.style.transform = `translateX(${touch.dx}px)`;
  }, { passive: false });
  dialog.addEventListener('touchend', () => {
    if (!touch) return;
    const { dx } = touch;
    touch = null;
    if (Math.abs(dx) > 60) {
      step(dx < 0 ? 1 : -1);
    } else if (dx) {
      image.style.transform = '';
      if (!reduced.matches) image.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 320, easing: EASE });
    }
  }, { passive: true });
})();
