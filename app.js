(function () {
  'use strict';
  var C = window.WWCalc, SPEC = C.SPEC, I = window.I18N, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var PREFS_KEY = 'ww-delay-prefs-v1', LOG_KEY = 'ww-delay-log-v1';
  var COLORS = { A: 'var(--a)', B: 'var(--b)', C: 'var(--c)', D: 'var(--d)' };
  var fmt = function (n, d) { return Number(n).toLocaleString(I.locale, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var fmtAmp = function (a) { return fmt(a, 1); };

  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }

  // ---------- Frecuencias ----------
  SPEC.FREQUENCIES.forEach(function (f) {
    var o = document.createElement('option'); o.value = f; o.textContent = f + ' Hz'; $('freq').appendChild(o);
  });
  $('freq').value = '20';

  // ---------- Tabla de rangos ----------
  var rangeTxt = function (r) { return r.min === r.max ? fmt(r.min) + ' µs' : fmt(r.min) + ' – ' + fmt(r.max) + ' µs'; };
  function renderRanges(pwA, hop, delay, ok) {
    var validA = Number.isFinite(pwA) && pwA >= SPEC.PW_MIN && pwA <= SPEC.PW_MAX;
    var glob = C.globalRanges(hop);
    var rows = [1, 2, 3].map(function (h, i) {
      var r = validA ? C.range(pwA, h, hop) : null;
      var hit = Number.isFinite(delay) && r && delay >= r.min && delay <= r.max;
      return '<tr' + (hit ? ' class="hit"' : '') + '><td><b>A → ' + SPEC.AREAS[h] + '</b></td><td>' + (r ? rangeTxt(r) : '—') + '</td><td>' + rangeTxt(glob[i]) + '</td><td>' +
        (h === 1 ? t('rg.none') : h === 2 ? 'B: 20–1000 µs' : 'B + C: 40–2000 µs') + '</td></tr>';
    });
    $('ranges').innerHTML = '<thead><tr><th>' + t('rg.colLast') + '</th><th>' + t('rg.colWith', { pw: validA ? fmt(pwA) + ' µs' : '—' }) +
      '</th><th>' + t('rg.colAny') + '</th><th>' + t('rg.colInt') + '</th></tr></thead><tbody>' + rows.join('') + '</tbody>';

    // Barra: rangos con cualquier A (claro) y con el A actual (intenso)
    var maxT = 13000, W = 720, padL = 10, padR = 10, H = 74, y = 26;
    var x = function (t) { return padL + (Math.min(t, maxT) / maxT) * (W - padL - padR); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + t('rg.aria') + '">';
    s += '<line x1="' + x(0) + '" x2="' + x(maxT) + '" y1="' + (y + 8) + '" y2="' + (y + 8) + '" stroke="var(--line)" stroke-width="2"/>';
    glob.forEach(function (g) { s += '<rect x="' + x(g.min) + '" y="' + y + '" width="' + (x(g.max) - x(g.min)) + '" height="16" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.35"/>'; });
    if (validA) [1, 2, 3].forEach(function (h) {
      var r = C.range(pwA, h, hop);
      s += '<rect x="' + x(r.min) + '" y="' + y + '" width="' + Math.max(3, x(r.max) - x(r.min)) + '" height="16" rx="3" fill="var(--accent)"/>';
      s += '<text x="' + ((x(r.min) + x(r.max)) / 2) + '" y="' + (y - 6) + '" font-size="12" font-weight="700" fill="var(--text)" text-anchor="middle">A→' + SPEC.AREAS[h] + '</text>';
    });
    for (var tk = 0; tk <= 12000; tk += 2000) s += '<text x="' + x(tk) + '" y="' + (H - 6) + '" font-size="11" fill="var(--muted)" text-anchor="' + (tk === 0 ? 'start' : 'middle') + '">' + (tk / 1000) + ' ms</text>';
    if (Number.isFinite(delay) && delay > 0) {
      var col = ok ? 'var(--on)' : 'var(--err)';
      s += '<line x1="' + x(delay) + '" x2="' + x(delay) + '" y1="' + (y - 4) + '" y2="' + (y + 22) + '" stroke="' + col + '" stroke-width="3"/>';
      s += '<circle cx="' + x(delay) + '" cy="' + (y - 4) + '" r="5" fill="' + col + '"/>';
    }
    s += '</svg>';
    $('rangeBar').innerHTML = s + '<p class="legend"><span class="sw solid"></span>' + t('rg.legSolid') + ' <span class="sw soft"></span>' + t('rg.legSoft') + ' <span class="sw mark' + (ok ? ' ok' : '') + '"></span>' + t('rg.legMark') + '</p>';
  }

  function renderNotConfig(res) {
    var near = [];
    if (res.below) near.push(res.below);
    if (res.above) near.push(res.above);
    var h = '<div class="nc-head"><span class="nc-icon" aria-hidden="true">✕</span><div><b>' + t('nc.title', { d: fmt(res.delay) }) + '</b>' +
      '<p>' + (res.offGrid ? t('nc.offGrid')
        : t('nc.cannot', { pw: fmt(res.pwFirst), where: t(res.below && res.above ? 'nc.gap' : res.above ? 'nc.below' : 'nc.above') })) +
      ' ' + t('nc.noProg') + '</p></div></div>';
    if (near.length) {
      h += '<p class="nc-sub">' + t('nc.nearest', { pw: fmt(res.pwFirst) }) + '</p><div class="actions">' +
        near.map(function (n) { return '<button class="btn ghost" data-use="' + n.delay + '">' + t('nc.use', { d: fmt(n.delay), last: n.last, diff: (n.delay > res.delay ? '+' : '') + fmt(n.delay - res.delay) }) + '</button>'; }).join('') + '</div>';
    }
    if (res.pwSuggestions.length) {
      h += '<p class="nc-sub">' + t('nc.changeA') + '</p><ul>' + res.pwSuggestions.map(function (p) {
        return '<li>' + (p.min === p.max ? t('nc.aExact', { last: p.last, pw: fmt(p.min) }) : t('nc.aRange', { last: p.last, min: fmt(p.min), max: fmt(p.max) })) + '</li>';
      }).join('') + '</ul>';
    } else if (!res.offGrid) {
      h += '<p class="nc-sub">' + t('nc.impossible') + '</p>';
    }
    $('notConfig').innerHTML = h;
  }
  $('notConfig').addEventListener('click', function (ev) {
    var v = ev.target.closest('[data-use]'); if (!v) return;
    $('delay').value = v.getAttribute('data-use'); update();
  });

  // Papel de cada área (códigos; los registros antiguos guardaban el texto en español)
  var LEGACY_ROLE = { 'inicial': 'first', 'intermedia': 'intermediate', 'final': 'last', 'apagada': 'off', 'inicial y final': 'firstLast' };
  function roleText(r) { r = LEGACY_ROLE[r] || r; return t('role.' + r); }

  // ---------- Tarjetas de área (se crean una vez) ----------
  var contacts = load(PREFS_KEY, {}).contacts || { A: '', B: '', C: '', D: '' };
  function contactOptions() {
    var h = '<option value="">' + t('contact.none') + '</option>';
    for (var i = 1; i <= SPEC.CONTACTS; i++) {
      var port = SPEC.AREAS[Math.floor((i - 1) / 8)];
      h += '<option value="' + i + '">' + t('contact.opt', { n: i, p: port }) + '</option>';
    }
    return h;
  }
  var cardEls = {};
  SPEC.AREAS.forEach(function (name) {
    var el = document.createElement('article');
    el.className = 'area'; el.style.setProperty('--col', COLORS[name]);
    el.innerHTML =
      '<div class="area-head"><span class="area-name">' + name + '</span><span class="pill"></span></div>' +
      '<div class="role"></div>' +
      '<div class="kv"><span data-i18n="area.width"></span><b class="pw"></b></div>' +
      '<div class="kv"><span data-i18n="area.amp"></span><b class="amp"></b></div>' +
      '<div class="kv"><span data-i18n="area.start"></span><b class="start"></b></div>' +
      '<label><span data-i18n="area.contact"></span><select class="contact">' + contactOptions() + '</select></label>';
    $('areas').appendChild(el);
    var sel = el.querySelector('.contact');
    sel.value = contacts[name] || '';
    sel.addEventListener('change', function () { contacts[name] = sel.value; savePrefs(); });
    cardEls[name] = el;
  });

  // ---------- Lectura de entradas ----------
  var ids = ['pwFirst', 'ampFirst', 'pwLast', 'ampLast', 'delay', 'freq', 'splitMode', 'manualB', 'hop'];
  function readInput() {
    var num = function (id) { var v = $(id).value.replace(',', '.'); return v === '' ? NaN : Number(v); };
    return {
      pwFirst: num('pwFirst'), pwLast: num('pwLast'), delay: num('delay'),
      ampFirst: num('ampFirst'), ampLast: num('ampLast'), freq: num('freq'),
      hop: num('hop'), manualB: $('splitMode').value === 'manual' ? num('manualB') : null
    };
  }
  function savePrefs() {
    var p = { contacts: contacts, inputs: {} };
    ids.forEach(function (id) { p.inputs[id] = $(id).value; });
    store(PREFS_KEY, p);
  }
  (function restore() {
    var p = load(PREFS_KEY, null);
    if (p && p.inputs) ids.forEach(function (id) { if (p.inputs[id] != null && p.inputs[id] !== '') $(id).value = p.inputs[id]; });
  })();

  // ---------- Cronograma ----------
  function renderTimeline(res) {
    var on = res.areas.filter(function (a) { return a.on; });
    var hop = res.hop || 3010;
    var last = on[on.length - 1];
    var total = last.start + last.pw + 600;
    var W = 720, padL = 34, padR = 16, rowH = 26, top = 30, H = top + rowH * 4 + 44;
    var x = function (t) { return padL + (t / total) * (W - padL - padR); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + t('tl.aria') + '">';
    // grid ms
    var stepMs = total > 8000 ? 2000 : 1000;
    for (var tk = 0; tk <= total; tk += stepMs) {
      s += '<line x1="' + x(tk) + '" x2="' + x(tk) + '" y1="' + (top - 6) + '" y2="' + (top + rowH * 4) + '" stroke="var(--line)" />';
      s += '<text x="' + x(tk) + '" y="' + (top + rowH * 4 + 14) + '" font-size="11" fill="var(--muted)" text-anchor="middle">' + (tk / 1000) + ' ms</text>';
    }
    res.areas.forEach(function (a, i) {
      var y = top + i * rowH;
      s += '<text x="6" y="' + (y + 17) + '" font-size="13" font-weight="700" fill="' + (a.on ? COLORS[a.name] : 'var(--off)') + '">' + a.name + '</text>';
      s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (y + 20) + '" y2="' + (y + 20) + '" stroke="var(--line)" />';
      if (a.on) {
        var w = Math.max(3, x(a.start + a.pw) - x(a.start));
        var hgt = a.role === 'intermediate' ? 6 : 16;
        s += '<rect x="' + x(a.start) + '" y="' + (y + 20 - hgt) + '" width="' + w + '" height="' + hgt + '" rx="2" fill="' + COLORS[a.name] + '" />';
      } else {
        s += '<text x="' + (padL + 6) + '" y="' + (y + 16) + '" font-size="11" fill="var(--off)">' + t('tl.off') + '</text>';
      }
    });
    // corchete de retardo
    var y0 = top - 14;
    s += '<line x1="' + x(0) + '" x2="' + x(last.start) + '" y1="' + y0 + '" y2="' + y0 + '" stroke="var(--text)" stroke-width="1.5" />';
    s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="' + (y0 - 5) + '" y2="' + (y0 + 5) + '" stroke="var(--text)" stroke-width="1.5" />';
    s += '<line x1="' + x(last.start) + '" x2="' + x(last.start) + '" y1="' + (y0 - 5) + '" y2="' + (y0 + 5) + '" stroke="var(--text)" stroke-width="1.5" />';
    s += '<text x="' + ((x(0) + x(last.start)) / 2) + '" y="' + (y0 - 6) + '" font-size="12" font-weight="600" fill="var(--text)" text-anchor="middle">' + fmt(res.achieved) + ' µs</text>';
    s += '<text x="' + padL + '" y="' + (H - 6) + '" font-size="11" fill="var(--muted)">' + t('tl.legend', { hop: fmt(hop) }) + '</text>';
    s += '</svg>';
    $('timeline').innerHTML = s;
  }

  // ---------- Cálculo y pintado ----------
  var current = null;
  function msgHTML(list, cls) { return list.map(function (m) { return '<div class="msg ' + cls + '">' + m + '</div>'; }).join(''); }

  function update() {
    $('manualBWrap').hidden = $('splitMode').value !== 'manual';
    var input = readInput();
    var d = input.delay;
    $('delayMs').textContent = Number.isFinite(d) ? '= ' + fmt(d / 1000, 2) + ' ms' : '';
    var res = C.compute(input);
    current = { input: input, res: res };
    savePrefs();
    renderRanges(input.pwFirst, Number.isFinite(input.hop) && input.hop > 0 ? input.hop : SPEC.HOP_MEASURED, d, res.ok && res.configurable);

    $('errors').innerHTML = msgHTML(res.errors, 'err');
    var notConfig = res.ok && !res.configurable;
    $('notConfig').hidden = !notConfig;
    $('programming').hidden = notConfig;
    if (notConfig) {
      renderNotConfig(res);
      $('summary').innerHTML = '<span class="bad-strong">' + t('out.notConfigShort') + '</span>';
      $('saveBtn').disabled = true;
      return;
    }
    if (!res.ok) {
      $('summary').textContent = '';
      $('msgs').innerHTML = ''; $('timeline').innerHTML = '';
      SPEC.AREAS.forEach(function (n) { var el = cardEls[n]; el.classList.add('off'); el.querySelector('.pill').textContent = '—'; el.querySelector('.pill').className = 'pill off'; el.querySelector('.role').textContent = ''; ['.pw', '.amp', '.start'].forEach(function (k) { el.querySelector(k).textContent = '—'; }); });
      $('saveBtn').disabled = true;
      return;
    }
    $('saveBtn').disabled = false;

    res.areas.forEach(function (a) {
      var el = cardEls[a.name];
      el.classList.toggle('off', !a.on);
      var pill = el.querySelector('.pill');
      pill.className = 'pill ' + (a.on ? 'on' : 'off'); pill.textContent = t(a.on ? 'area.on' : 'area.off');
      el.querySelector('.role').textContent = a.on ? roleText(a.role) : t('area.unused');
      el.querySelector('.pw').textContent = a.on ? fmt(a.pw) + ' µs' : '—';
      el.querySelector('.amp').textContent = a.on ? fmtAmp(a.amp) + ' mA' : '0 mA';
      el.querySelector('.start').textContent = a.on ? fmt(a.start) + ' µs' : '—';
    });

    var lastName = res.zeroDelay ? 'A' : SPEC.AREAS[res.hops];
    $('summary').innerHTML = (res.zeroDelay ? t('out.summaryZero') : t('out.summary', { last: lastName, d: fmt(res.achieved) })) + ' <span class="ok">' + t('out.configurable') + '</span>';

    var info = [];
    if (!res.zeroDelay) {
      if (res.hops === 3) info.push(t('info.split', { s: fmt(res.sumIntermediate) }));
      if (res.period) info.push(t('info.cycle', { c: fmt(res.cycle), p: fmt(res.period), f: input.freq }));
    }
    $('msgs').innerHTML = msgHTML(res.warnings, 'warn') + msgHTML(res.notes.concat(info), 'note');
    if (!res.zeroDelay) renderTimeline(res); else $('timeline').innerHTML = '';
  }
  ids.forEach(function (id) { $(id).addEventListener('input', update); $(id).addEventListener('change', update); });

  // ---------- Registro ----------
  var log = load(LOG_KEY, []);
  function areaCell(a, contact) {
    if (!a || !a.on) return '<span class="mut">OFF</span>' + (contact ? ' <span class="mut">· c' + contact + '</span>' : '');
    return fmt(a.pw) + ' µs / ' + fmtAmp(a.amp) + ' mA' + (contact ? ' · c' + contact : '');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function renderLog() {
    var tb = $('logTable').querySelector('tbody');
    if (!log.length) { tb.innerHTML = '<tr><td colspan="10" class="mut">' + t('log.empty') + '</td></tr>'; }
    else tb.innerHTML = log.slice().reverse().map(function (e) {
      var A = {}; e.areas.forEach(function (a) { A[a.name] = a; });
      return '<tr><td>' + esc(new Date(e.date).toLocaleString(I.locale, { dateStyle: 'short', timeStyle: 'short' })) + '</td><td>' + esc(e.testId) + '</td><td>' + e.freq +
        '</td><td>' + fmt(e.achieved) + ' µs' + (e.error ? ' <span class="mut">(' + (e.error > 0 ? '+' : '') + e.error + ')</span>' : '') + '</td>' +
        SPEC.AREAS.map(function (n) { return '<td>' + areaCell(A[n], e.contacts[n]) + '</td>'; }).join('') +
        '<td class="notes">' + esc(e.notes) + '</td><td><button class="btn ghost small" data-load="' + e.id + '">' + t('log.load') + '</button><button class="btn ghost small" data-del="' + e.id + '">' + t('log.del') + '</button></td></tr>';
    }).join('');
    $('logInfo').textContent = log.length ? t('log.count', { n: log.length }) : t('log.local');
  }
  $('saveBtn').addEventListener('click', function () {
    if (!current || !current.res.ok) return;
    var r = current.res, i = current.input;
    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: new Date().toISOString(),
      testId: $('testId').value.trim(), notes: $('testNotes').value.trim(),
      freq: i.freq, delayTarget: i.delay, achieved: r.achieved, error: r.error, hop: r.hop || i.hop,
      pwFirst: i.pwFirst, pwLast: i.pwLast, ampFirst: i.ampFirst, ampLast: i.ampLast,
      splitMode: $('splitMode').value, manualB: i.manualB,
      areas: r.areas.map(function (a) { return { name: a.name, on: a.on, role: a.role, pw: a.pw, amp: a.amp, start: a.start }; }),
      contacts: Object.assign({}, contacts)
    };
    log.push(entry);
    if (!store(LOG_KEY, log)) alert(t('log.storeFail'));
    $('testNotes').value = '';
    renderLog();
  });
  $('logTable').addEventListener('click', function (ev) {
    var del = ev.target.getAttribute('data-del'), ld = ev.target.getAttribute('data-load');
    if (del) {
      if (!confirm(t('log.confirmDel'))) return;
      log = log.filter(function (e) { return e.id !== del; }); store(LOG_KEY, log); renderLog();
    } else if (ld) {
      var e = log.filter(function (x) { return x.id === ld; })[0]; if (!e) return;
      $('pwFirst').value = e.pwFirst; $('pwLast').value = e.pwLast; $('ampFirst').value = e.ampFirst; $('ampLast').value = e.ampLast;
      $('delay').value = e.delayTarget; $('freq').value = String(e.freq); $('hop').value = e.hop;
      $('splitMode').value = e.splitMode || 'auto'; if (e.manualB != null) $('manualB').value = e.manualB;
      contacts = Object.assign({ A: '', B: '', C: '', D: '' }, e.contacts);
      SPEC.AREAS.forEach(function (n) { cardEls[n].querySelector('.contact').value = contacts[n] || ''; });
      $('testId').value = e.testId || '';
      update(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function stamp() { return new Date().toISOString().slice(0, 10); }
  $('csvBtn').addEventListener('click', function () {
    var head = t('csv.head').split(';');
    SPEC.AREAS.forEach(function (n) { head = head.concat(t('csv.area', { a: n }).split(';')); });
    head.push(t('csv.notes'));
    var dec = I.lang === 'es' ? ',' : '.';
    var q = function (v) { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [head.join(';')].concat(log.map(function (e) {
      var row = [e.date, e.testId, e.freq, e.delayTarget, e.achieved, e.error, e.hop];
      e.areas.forEach(function (a) { row.push(a.on ? 'ON' : 'OFF', roleText(a.role), a.on ? a.pw : '', a.on ? String(a.amp).replace('.', dec) : 0, a.on ? a.start : '', e.contacts[a.name] || ''); });
      row.push(e.notes);
      return row.map(q).join(';');
    }));
    download(t('csv.file') + '_' + stamp() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  });
  $('jsonBtn').addEventListener('click', function () {
    download(t('csv.file') + '_' + stamp() + '.json', JSON.stringify({ app: 'ww-delay', version: 1, log: log }, null, 2), 'application/json');
  });
  $('importFile').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var data = JSON.parse(txt); var incoming = Array.isArray(data) ? data : data.log;
      if (!Array.isArray(incoming)) throw new Error('formato');
      var known = {}; log.forEach(function (e) { known[e.id] = true; });
      var added = incoming.filter(function (e) { return e && e.id && e.areas && !known[e.id]; });
      log = log.concat(added).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      store(LOG_KEY, log); renderLog();
      alert(t('log.added', { n: added.length }));
    }).catch(function () { alert(t('log.badFile')); });
    ev.target.value = '';
  });

  // ---------- Instalación (PWA) ----------
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
  $('installBtn').addEventListener('click', function () { if (deferred) { deferred.prompt(); deferred = null; $('installBtn').hidden = true; } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  // ---------- Idioma ----------
  function applyLang() {
    I.apply();
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      var on = b.getAttribute('data-lang') === I.lang;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    SPEC.AREAS.forEach(function (n) {
      var sel = cardEls[n].querySelector('.contact');
      sel.innerHTML = contactOptions(); sel.value = contacts[n] || '';
      sel.setAttribute('aria-label', t('area.contactAria', { a: n }));
    });
    update();
    renderLog();
  }
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { I.setLang(b.getAttribute('data-lang')); applyLang(); });
  });

  applyLang();
})();
