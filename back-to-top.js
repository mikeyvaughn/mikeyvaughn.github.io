/* Shared, keyboard-accessible return control for Mikey's public pages. */
(() => {
  const button = document.querySelector('[data-back-to-top]');
  if (!button) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  const update = () => {
    button.hidden = window.scrollY < Math.max(600, window.innerHeight * 0.8);
    scheduled = false;
  };
  const requestUpdate = () => {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  };
  button.addEventListener('click', () => {
    const heading = document.querySelector('main h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('pageshow', update);
  update();
})();
