(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Header: estado ao rolar + menu mobile ---------- */
  const header = $('.header');
  const burger = $('.burger');
  const nav = $('#menu');
  const dock = $('[data-dock]');
  const hero = $('.hero');

  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Scroll: header, dock, parallax (um único rAF) ---------- */
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  let ticking = false;

  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (dock) dock.classList.toggle('is-visible', y > hero.offsetHeight * .7);

    const vh = innerHeight;
    for (const el of parallaxEls) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const speed = parseFloat(el.dataset.parallax) || 0;
      const offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  // o hero usa animação CSS de entrada; só inicia o parallax nele depois dela
  const heroImg = $('.hero__media img');
  if (heroImg) heroImg.addEventListener('animationend', () => { heroImg.style.animation = 'none'; onScroll(); }, { once: true });
  onScroll();

  /* ---------- Link ativo no menu ---------- */
  const links = $$('.nav a[href^="#"]');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navObs.observe(s));

  /* ---------- Índice lateral ---------- */
  const rail = $('.rail');
  if (rail) {
    const railLinks = $$('a', rail);
    railLinks.forEach((a) => { const t = a.textContent; a.textContent = ''; const sp = document.createElement('span'); sp.textContent = t; a.appendChild(sp); });
    const railObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        railLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    railLinks.forEach((a) => { const t = $(a.getAttribute('href')); if (t) railObs.observe(t); });
    const toggleRail = () => rail.classList.toggle('is-visible', scrollY > hero.offsetHeight * .6);
    addEventListener('scroll', toggleRail, { passive: true }); toggleRail();
  }

  /* ---------- Reveal + contadores ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (reduceMotion || !target) return;
    const fmt = new Intl.NumberFormat('pt-BR');
    const dur = 1400;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      $$('[data-count]', en.target).forEach(animateCount);
      revealObs.unobserve(en.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => revealObs.observe(el));

  /* ---------- Pausa animações contínuas fora da tela ---------- */
  const pauseObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-paused', !en.isIntersecting));
  });
  $$('.hero, .tape').forEach((el) => pauseObs.observe(el));

  /* ---------- Luz vermelha que acompanha o ponteiro ---------- */
  if (finePointer && !reduceMotion) {
    $$('.glow-area').forEach((area) => {
      let raf = 0;
      area.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = area.getBoundingClientRect();
          area.style.setProperty('--mx', `${e.clientX - r.left}px`);
          area.style.setProperty('--my', `${e.clientY - r.top}px`);
          raf = 0;
        });
      });
    });
  }

  /* ---------- Horários: aberto agora (fuso de Araguatins) ---------- */
  const SCHEDULE = { 0: null, 1: [5, 23], 2: [5, 23], 3: [5, 23], 4: [5, 23], 5: [5, 23], 6: [8, 13] };
  const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const nowInTO = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Araguaina', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, hour: parseInt(get('hour'), 10) + parseInt(get('minute'), 10) / 60 };
  };

  const nextOpening = (day, hour) => {
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const s = SCHEDULE[d];
      if (s && (i > 0 || hour < s[0])) {
        const when = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : DAY_NAMES[d];
        return `Abre ${when} às ${String(s[0]).padStart(2, '0')}h`;
      }
    }
    return '';
  };

  const updateStatus = () => {
    const { day, hour } = nowInTO();
    const s = SCHEDULE[day];
    const open = !!s && hour >= s[0] && hour < s[1];
    const label = open
      ? `Aberto agora · até ${s[1]}h`
      : `Fechado · ${nextOpening(day, hour)}`;

    $$('[data-status]').forEach((el) => {
      el.textContent = label;
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
    });

    $$('.hrow').forEach((row) => {
      const days = (row.dataset.days || '').split(',').map(Number);
      const today = days.includes(day);
      row.classList.toggle('is-today', today);
      const bar = $('.hrow__bar', row);
      let marker = $('.now', bar);
      if (today) {
        if (!marker) { marker = document.createElement('span'); marker.className = 'now'; bar.appendChild(marker); }
        marker.style.setProperty('--now', hour.toFixed(2));
      } else if (marker) marker.remove();
    });
  };
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Mapa sob demanda (não pesa no carregamento) ---------- */
  const mapBtn = $('[data-map]');
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.title = 'Mapa: Doctor Small Academia, Rua Bartolomeu Bueno da Silva, 1031, Araguatins-TO';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.src = 'https://www.google.com/maps?q=' + encodeURIComponent('Rua Bartolomeu Bueno da Silva, 1031, Centro, Araguatins - TO') + '&output=embed';
      mapBtn.replaceWith(iframe);
    }, { once: true });
  }

  /* ---------- Depoimentos ---------- */
  const list = $('[data-reviews]');
  const empty = $('[data-reviews-empty]');
  const reviews = Array.isArray(window.DEPOIMENTOS) ? window.DEPOIMENTOS.filter((r) => r && r.nome && r.texto) : [];
  if (list && reviews.length) {
    reviews.forEach((r, i) => {
      const fig = document.createElement('figure');
      fig.className = 'review reveal';
      fig.style.setProperty('--d', i % 3);
      const nota = Math.max(0, Math.min(5, r.nota | 0));
      if (nota) {
        const stars = document.createElement('span');
        stars.className = 'review__stars';
        stars.setAttribute('aria-label', `Nota ${nota} de 5`);
        stars.textContent = '★'.repeat(nota);
        fig.appendChild(stars);
      }
      const q = document.createElement('blockquote');
      q.textContent = `“${r.texto}”`;
      const cap = document.createElement('figcaption');
      const name = document.createElement('strong');
      name.textContent = r.nome;
      cap.appendChild(name);
      if (r.detalhe) cap.append(r.detalhe);
      fig.append(q, cap);
      list.appendChild(fig);
      revealObs.observe(fig);
    });
    if (empty) empty.hidden = true;
  }

  /* ---------- Ano no rodapé ---------- */
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
