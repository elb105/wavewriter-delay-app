/*
 * Tutorial guiado. Se abre solo la primera vez (se recuerda en localStorage) y
 * con el botón «?» de la cabecera. Cada paso resalta un elemento de la página y
 * explica qué hay que rellenar o pulsar. Se puede saltar en cualquier momento
 * (botón «Saltar tutorial» o tecla Esc).
 */
(function () {
  'use strict';
  var I = window.I18N, t = I.t;
  var SEEN_KEY = 'ww-delay-tour-seen-v1';

  // Cada paso: elemento a resaltar (null = centrado) y clave de texto (tour.<k>.title / .text)
  var STEPS = [
    { sel: null, k: 'welcome' },
    { sel: '#pwFirst', box: 'fieldset', k: 'first' },
    { sel: '#pwLast', box: 'fieldset', k: 'last' },
    { sel: '#delay', box: 'fieldset', k: 'delay' },
    { sel: '#freq', box: 'fieldset', k: 'freq' },
    { sel: '.adv summary', k: 'adv' },
    { sel: '#rangeBar', k: 'ranges' },
    { sel: '#areas .area', k: 'areas' },
    { sel: '#notConfig', alt: '#summary', k: 'notconfig' },
    { sel: '#saveBtn', box: '.actions', k: 'log' },
    { sel: '.top-actions', k: 'lang' },
    { sel: null, k: 'done' }
  ];

  var overlay, spot, card, idx = 0, open = false, lastFocus = null;

  function seen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sin almacenamiento */ } }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    spot = document.createElement('div');
    spot.className = 'tour-spot';
    card = document.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'tour-title');
    card.innerHTML =
      '<div class="tour-step" id="tour-count"></div>' +
      '<h3 id="tour-title"></h3><p id="tour-text"></p>' +
      '<div class="tour-btns">' +
      '<button type="button" class="btn ghost small tour-skip"></button>' +
      '<span class="tour-nav"><button type="button" class="btn ghost small tour-prev"></button>' +
      '<button type="button" class="btn small tour-next"></button></span></div>';
    overlay.appendChild(spot);
    document.body.appendChild(overlay);
    document.body.appendChild(card);
    card.querySelector('.tour-skip').addEventListener('click', close);
    card.querySelector('.tour-prev').addEventListener('click', function () { go(idx - 1); });
    card.querySelector('.tour-next').addEventListener('click', function () { idx === STEPS.length - 1 ? close() : go(idx + 1); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { /* clic fuera: no cierra, evita saltos accidentales */ } });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); card.querySelector('.tour-next').click(); }
      else if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); go(idx - 1); }
      else if (e.key === 'Tab') {            // foco atrapado en la tarjeta
        var f = card.querySelectorAll('button:not([hidden])');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
  }

  function target(step) {
    if (!step.sel) return null;
    var el = document.querySelector(step.sel);
    if ((!el || el.hidden || !el.offsetParent) && step.alt) el = document.querySelector(step.alt);
    if (!el || !el.offsetParent) return null;
    if (step.box) el = el.closest(step.box) || el;
    return el;
  }

  function place() {
    if (!open) return;
    var el = target(STEPS[idx]);
    var vw = window.innerWidth, vh = window.innerHeight, pad = 8;
    if (!el) {
      spot.style.display = 'none';
      overlay.classList.add('solid');
      card.classList.add('center');
      card.style.top = card.style.left = '';
      return;
    }
    overlay.classList.remove('solid');
    card.classList.remove('center');
    var r = el.getBoundingClientRect();
    spot.style.display = 'block';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    var sheet = function () { card.classList.add('sheet'); card.style.top = card.style.left = ''; };
    if (vw < 640) { sheet(); return; }
    card.classList.remove('sheet');
    var cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    var top = r.bottom + pad + gap;
    if (top + ch > vh - 12) top = r.top - pad - gap - ch;          // encima si no cabe debajo
    if (top < 12) { sheet(); return; }                              // ni encima ni debajo: abajo fija
    var left = Math.min(vw - cw - 12, Math.max(12, r.left));
    card.style.top = top + 'px';
    card.style.left = left + 'px';
  }

  function go(i) {
    idx = Math.max(0, Math.min(STEPS.length - 1, i));
    var s = STEPS[idx];
    if (s.k === 'adv') { var d = document.querySelector('.adv'); if (d) d.open = true; }
    card.querySelector('#tour-count').textContent = t('tour.count', { i: idx + 1, n: STEPS.length });
    card.querySelector('#tour-title').textContent = t('tour.' + s.k + '.title');
    card.querySelector('#tour-text').innerHTML = t('tour.' + s.k + '.text');
    card.querySelector('.tour-skip').textContent = t('tour.skip');
    card.querySelector('.tour-skip').hidden = idx === STEPS.length - 1;
    var prev = card.querySelector('.tour-prev');
    prev.textContent = t('tour.prev'); prev.hidden = idx === 0;
    card.querySelector('.tour-next').textContent = idx === 0 ? t('tour.start') : idx === STEPS.length - 1 ? t('tour.finish') : t('tour.next');
    var el = target(s);
    if (el) {
      // el elemento arriba (con margen) para dejar sitio a la tarjeta debajo
      var y = el.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
    }
    place();
    requestAnimationFrame(place);
    card.querySelector('.tour-next').focus({ preventScroll: true });
  }

  function start() {
    if (!overlay) build();
    lastFocus = document.activeElement;
    open = true;
    document.body.classList.add('touring');
    overlay.hidden = false; card.hidden = false;
    go(0);
  }

  function close() {
    markSeen();
    if (!open || !overlay) { open = false; return; }
    open = false;
    overlay.hidden = true; card.hidden = true;
    document.body.classList.remove('touring');
    var d = document.querySelector('.adv'); if (d) d.open = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
    var back = document.getElementById('helpBtn') || lastFocus;
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  // Si cambia el idioma con el tutorial abierto, se retraduce el paso actual
  document.addEventListener('click', function (e) {
    if (open && e.target.closest && e.target.closest('[data-lang]')) setTimeout(function () { go(idx); }, 0);
  });

  window.WWTour = { start: start, close: close };
  var help = document.getElementById('helpBtn');
  if (help) help.addEventListener('click', start);
  if (!seen()) setTimeout(start, 350);
})();
