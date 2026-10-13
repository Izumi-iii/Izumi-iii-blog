(() => {
  'use strict';
  const banner = document.getElementById('banner');
  if (!banner) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const cards = [...document.querySelectorAll('.index-card')];
  const article = document.querySelector('.post-content');
  const text = banner.querySelector('.banner-text');
  const down = document.querySelector('.scroll-down-bar');
  if (down) {
    down.setAttribute('role', 'button');
    down.setAttribute('tabindex', '0');
    down.setAttribute('aria-label', '浏览文章');
    down.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      document.getElementById('board')?.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
    });
  }
  document.addEventListener('click', (event) => {
    if (!reduced.matches) return;
    const control = event.target.closest('.scroll-down-bar, #scroll-top-button');
    if (!control) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (control.id === 'scroll-top-button') scrollTo({ top: 0, behavior: 'instant' });
    else document.getElementById('board')?.scrollIntoView({ behavior: 'instant' });
  }, true);
  if (cards.length && text) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hero-eyebrow';
    eyebrow.textContent = 'NOTES / CODE / EXPLORATION';
    text.prepend(eyebrow);
    const description = document.createElement('p');
    description.className = 'hero-description';
    description.textContent = '记录编程学习、项目实践与问题排查';
    text.append(description);
    const links = document.createElement('nav');
    links.className = 'hero-links';
    links.setAttribute('aria-label', '阅读方向');
    for (const [label, href] of [['macOS & Swift', '/categories/macOS/'], ['AI Agent', '/tags/AI-Agent/'], ['算法题解', '/categories/题解/']]) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = href;
      links.append(link);
    }
    text.append(links);
    const heading = document.createElement('div');
    heading.className = 'journal-heading';
    heading.innerHTML = '<div><small>THE JOURNAL</small><h2>最近的记录</h2></div><a href="/archives/">全部文章 ↗</a>';
    cards[0].before(heading);
  }
  let observer;
  function configureReveals() {
    observer?.disconnect();
    if (reduced.matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => card.classList.add('is-visible'));
      return;
    }
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: .08, rootMargin: '0px 0px 30px 0px' });
    cards.forEach((card) => {
      card.classList.add('motion-ready');
      observer.observe(card);
    });
  }
  let progress;
  if (article) {
    progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.append(progress);
  }
  let scheduled = 0;
  let bannerVisible = true;
  const light = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let lightFrame = 0;
  function animateLight() {
    lightFrame = 0;
    if (reduced.matches || document.hidden || !bannerVisible || !finePointer.matches) return;
    light.x += (light.targetX - light.x) * .09;
    light.y += (light.targetY - light.y) * .09;
    banner.style.setProperty('--light-x', `${light.x.toFixed(2)}px`);
    banner.style.setProperty('--light-y', `${light.y.toFixed(2)}px`);
    if (Math.abs(light.targetX - light.x) + Math.abs(light.targetY - light.y) > .1) lightFrame = requestAnimationFrame(animateLight);
  }
  function updateScroll() {
    scheduled = 0;
    const bounds = banner.getBoundingClientRect();
    bannerVisible = bounds.bottom > 0;
    document.body.classList.toggle('effects-paused', !bannerVisible || document.hidden || reduced.matches);
    if (!reduced.matches && bannerVisible) banner.style.setProperty('--hero-shift', `${Math.min(scrollY * .08, 45)}px`);
    if (progress) {
      const rect = article.getBoundingClientRect();
      const distance = Math.max(rect.height - innerHeight, 1);
      const value = Math.max(0, Math.min(1, -rect.top / distance));
      progress.style.transform = `scaleX(${value})`;
    }
  }
  function scheduleScroll() { if (!scheduled) scheduled = requestAnimationFrame(updateScroll); }
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', scheduleScroll, { passive: true });
  addEventListener('pageshow', scheduleScroll);
  addEventListener('load', scheduleScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(lightFrame); lightFrame = 0; }
    scheduleScroll();
  });
  banner.addEventListener('pointermove', (event) => {
    if (reduced.matches || !finePointer.matches || !bannerVisible) return;
    const rect = banner.getBoundingClientRect();
    light.targetX = ((event.clientX - rect.left) / rect.width - .5) * 28;
    light.targetY = ((event.clientY - rect.top) / rect.height - .5) * 20;
    if (!lightFrame) lightFrame = requestAnimationFrame(animateLight);
  }, { passive: true });
  banner.addEventListener('pointerleave', () => {
    light.targetX = light.targetY = 0;
    if (!lightFrame && !reduced.matches) lightFrame = requestAnimationFrame(animateLight);
  });
  for (const card of cards) {
    let frame = 0;
    let point;
    card.addEventListener('pointermove', (event) => {
      if (reduced.matches || !finePointer.matches) return;
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (reduced.matches) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--card-x', `${point.x - rect.left}px`);
        card.style.setProperty('--card-y', `${point.y - rect.top}px`);
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); frame = 0; });
  }
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(lightFrame);
    lightFrame = 0;
    if (reduced.matches) {
      banner.style.removeProperty('--hero-shift');
      banner.style.removeProperty('--light-x');
      banner.style.removeProperty('--light-y');
      light.x = light.y = light.targetX = light.targetY = 0;
    }
    configureReveals();
    scheduleScroll();
  });
  configureReveals();
  updateScroll();
})();
