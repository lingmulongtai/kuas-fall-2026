/* Connect the ASCII Animals canvas to the dashboard's background lifecycle. */
(() => {
  'use strict';
  const canvas = document.getElementById('ascii-background');
  const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const frameInterval = 1000 / 30;
  let engine, frameId = 0, lastFrame = 0, suspended = false;
  let width = 0, height = 0, dpr = 0;

  function publishFrame() {
    window.dispatchEvent(new Event('asciiframe'));
  }

  function resize() {
    if (canvas.hidden || !engine) return;
    const rect = canvas.getBoundingClientRect();
    const density = Math.min(2, devicePixelRatio || 1);
    if (!rect.width || !rect.height || (width === rect.width && height === rect.height && dpr === density)) return;
    width = rect.width;
    height = rect.height;
    dpr = density;
    engine.resize(width, height, dpr);
    engine.draw(0);
    publishFrame();
  }

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
    engine?.leave();
  }

  function animate(now) {
    frameId = requestAnimationFrame(animate);
    const elapsed = lastFrame ? now - lastFrame : frameInterval;
    if (elapsed < frameInterval - 1) return;
    lastFrame = now;
    engine.draw(Math.min(elapsed / 1000, 0.05));
    publishFrame();
  }

  function refresh() {
    const show = BACKGROUND_EFFECT === 'ascii' && !transparency.matches && !contrast.matches;
    if (!show) {
      stop();
      if (!canvas.hidden) {
        canvas.hidden = true;
        publishFrame();
      }
      return;
    }
    if (!engine) {
      engine = window.AsciiAnimals?.create(canvas, ASCII_ANIMAL, reducedMotion);
      if (!engine) return;
      document.fonts?.load('600 12px "Geist Mono"').then(() => {
        if (!canvas.hidden && !frameId) { engine.draw(0); publishFrame(); }
      }).catch(() => {});
    }
    canvas.hidden = false;
    resize();
    if (!width || !height) return;
    engine.setAnimal(ASCII_ANIMAL);
    if (document.hidden || suspended || reducedMotion.matches) {
      stop();
      engine.draw(0);
      publishFrame();
    } else if (!frameId) {
      frameId = requestAnimationFrame(animate);
    }
  }

  window.addEventListener('ambiencechange', refresh);
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', refresh);
  for (const preference of [transparency, contrast, reducedMotion]) preference.addEventListener('change', refresh);
  for (const event of ['beforeprint', 'pagehide']) window.addEventListener(event, () => { suspended = true; refresh(); });
  for (const event of ['afterprint', 'pageshow']) window.addEventListener(event, () => { suspended = false; refresh(); });

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }
  document.addEventListener('pointermove', event => {
    if (frameId && event.isPrimary && event.pointerType !== 'touch') engine.move(...point(event));
  }, {passive:true});
  document.addEventListener('pointerdown', event => {
    if (!frameId || !event.isPrimary || event.button !== 0) return;
    if (event.target.closest('a,button,input,select,label,summary,[data-glass-surface],.sec,.masthead-in,.tabs')) return;
    engine.tap(...point(event));
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave', () => engine?.leave());
  window.addEventListener('blur', () => engine?.leave());
  refresh();
})();
