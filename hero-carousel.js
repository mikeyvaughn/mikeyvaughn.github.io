(() => {
  const carousel = document.querySelector('[data-hero-carousel]');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.hero-carousel-slide')];
  const dots = [...carousel.querySelectorAll('.hero-carousel-dot')];
  const stage = carousel.querySelector('.hero-carousel-stage');
  const playButton = carousel.querySelector('[data-playback]');
  const title = carousel.querySelector('[data-caption-title]');
  const meta = carousel.querySelector('[data-caption-meta]');
  const caption = carousel.querySelector('.hero-carousel-caption');
  const position = carousel.querySelector('[data-position]');
  const story = carousel.querySelector('[data-caption-story]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 3000;
  let current = 0;
  let userPaused = reducedMotion.matches;
  let hovered = false;
  let visible = true;
  let timer;
  let pointerStart;
  let requestId = 0;
  const loadPhoto = index => {
    const image = slides[(index + slides.length) % slides.length].querySelector('img');
    if (image.dataset.src && !image.getAttribute('src')) image.src = image.dataset.src;
    return image;
  };
  const updatePlayback = () => {
    playButton.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
    playButton.title = userPaused ? 'Play slideshow' : 'Pause slideshow';
    playButton.querySelector('[data-pause-icon]').toggleAttribute('hidden', userPaused);
    playButton.querySelector('[data-play-icon]').toggleAttribute('hidden', !userPaused);
    caption.setAttribute('aria-live', userPaused ? 'polite' : 'off');
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!userPaused && !hovered && visible && !document.hidden) {
      timer = setTimeout(() => show(current + 1), interval);
    }
  };
  const show = async (index, manual = false) => {
    if (manual) userPaused = true;
    updatePlayback();
    clearTimeout(timer);
    const target = (index + slides.length) % slides.length;
    const id = ++requestId;
    const image = loadPhoto(target);
    if (!image.complete || !image.naturalWidth) {
      try { await image.decode(); }
      catch { if (id === requestId) schedule(); return; }
    }
    if (id !== requestId) return;
    current = target;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
    title.textContent = slides[current].dataset.title;
    meta.textContent = slides[current].dataset.meta;
    if (story) story.hidden = slides[current].dataset.photo !== 'original';
    position.textContent = `${current + 1} / ${slides.length}`;
    loadPhoto(current + 1);
    updatePlayback();
    schedule();
  };
  playButton.addEventListener('click', () => {
    userPaused = !userPaused;
    updatePlayback();
    schedule();
  });
  carousel.querySelector('[data-previous]').addEventListener('click', () => show(current - 1, true));
  carousel.querySelector('[data-next]').addEventListener('click', () => show(current + 1, true));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
  carousel.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; schedule(); }
  });
  carousel.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; schedule(); }
  });
  carousel.addEventListener('focusin', event => {
    if (event.target !== playButton && event.target.matches(':focus-visible')) {
      userPaused = true; updatePlayback(); schedule();
    }
  });
  stage.addEventListener('keydown', event => {
    if (event.target !== stage) return;
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1);
      show(target, true);
    }
  });
  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    // A touch may start a vertical page scroll. Pause only after a confirmed
    // horizontal swipe, explicit control action, or keyboard interaction.
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.25) show(current + (dx < 0 ? 1 : -1), true);
    pointerStart = null;
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .25 }).observe(stage);
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { userPaused = true; updatePlayback(); schedule(); }
  });
  show(0);
})();
