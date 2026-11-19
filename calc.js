/*
 * Modelo de retardo entre áreas del WaveWriter Alpha (SC-1232).
 *
 * Regla medida con el Power 1401 / Spike2 (informe REWIRE, 16-11-2026):
 *   inicio(área siguiente) = inicio(área anterior) + PW(área anterior) + SALTO
 *   con SALTO = 3010 µs (el fabricante indica 3000 µs).
 * Las áreas se emiten siempre en orden A → B → C → D dentro de cada ciclo.
 * Retardo primera → última área = PW_A + Σ PW_intermedias + nSaltos · SALTO.
 *
 * Límites del equipo (datasheet y caracterización BIOS):
 *   ancho de pulso 20–1000 µs en pasos de 10 µs
 *   amplitud 0–25,5 mA en pasos de 0,1 mA (0,1 mA = mínimo encendido)
 *   frecuencia 2–1200 Hz (valores discretos)
 *
 * La frecuencia y el contacto elegido NO intervienen en el cálculo.
 */
(function (root) {
  'use strict';

  var SPEC = {
    PW_MIN: 20, PW_MAX: 1000, PW_STEP: 10,
    AMP_MIN_ON: 0.1, AMP_MAX: 25.5, AMP_STEP: 0.1,
    HOP_MEASURED: 3010, HOP_MANUFACTURER: 3000,
    INTERMEDIATE_AMP: 0.1,
    AREAS: ['A', 'B', 'C', 'D'],
    FREQUENCIES: [2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130,
      150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 900,
      1000, 1100, 1200],
    CONTACTS: 32,
    // Frecuencias a las que la regla se ha comprobado experimentalmente
    VALIDATED_FREQ: { 2: 'tests de comportamiento BIOS (osciloscopio)',
      20: '7 tests con Power 1401 / Spike2',
      40: 'informe Boston Scientific (osciloscopio)',
      50: 'informe Boston Scientific (osciloscopio)' }
  };

  function round10(x) { return Math.round(x / SPEC.PW_STEP) * SPEC.PW_STEP; }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  function checkPW(pw) {
    return Number.isFinite(pw) && pw >= SPEC.PW_MIN && pw <= SPEC.PW_MAX &&
      Math.abs(pw / SPEC.PW_STEP - Math.round(pw / SPEC.PW_STEP)) < 1e-9;
  }
  function checkAmp(a) {
    return Number.isFinite(a) && a >= SPEC.AMP_MIN_ON && a <= SPEC.AMP_MAX + 1e-9 &&
      Math.abs(a * 10 - Math.round(a * 10)) < 1e-6;
  }

  /** Rango de retardos posible con nSaltos (1 = A→B, 2 = A→C, 3 = A→D). */
  function range(pwFirst, hops, hop) {
    var nInt = hops - 1;
    return {
      hops: hops,
      min: pwFirst + hops * hop + nInt * SPEC.PW_MIN,
      max: pwFirst + hops * hop + nInt * SPEC.PW_MAX
    };
  }

  /** Reparte la suma de anchos S entre nInt áreas intermedias. */
  function split(S, nInt, manualFirst) {
    if (nInt === 0) return { pws: [], adjusted: false };
    if (nInt === 1) return { pws: [S], adjusted: false };
    // nInt === 2: B y C
    var lo = Math.max(SPEC.PW_MIN, S - SPEC.PW_MAX);
    var hi = Math.min(SPEC.PW_MAX, S - SPEC.PW_MIN);
    var b, adjusted = false;
    if (manualFirst != null && Number.isFinite(manualFirst)) {
      b = round10(manualFirst);
      if (b < lo || b > hi || b !== manualFirst) { adjusted = true; b = clamp(b, lo, hi); }
    } else {
      b = clamp(round10(S / 2), lo, hi);
    }
    return { pws: [b, S - b], adjusted: adjusted, lo: lo, hi: hi };
  }

  /** Mejor configuración para un número de saltos dado. */
  function candidate(input, hops) {
    var hop = input.hop;
    var r = range(input.pwFirst, hops, hop);
    var target = clamp(input.delay, r.min, r.max);
    var S = round10(target - input.pwFirst - hops * hop);
    S = clamp(S, (hops - 1) * SPEC.PW_MIN, (hops - 1) * SPEC.PW_MAX);
    if (hops === 1) S = 0;
    var sp = split(S, hops - 1, input.manualB);
    var achieved = input.pwFirst + hops * hop + S;
    return {
      hops: hops, range: r, sumIntermediate: S, intermediatePWs: sp.pws,
      splitAdjusted: sp.adjusted, splitRange: sp.lo != null ? [sp.lo, sp.hi] : null,
      achieved: achieved, error: achieved - input.delay
    };
  }

  /** Ancho del área A que haría alcanzable exactamente el retardo con nSaltos. */
  function suggestPWFirst(delay, hops, hop) {
    var nInt = hops - 1;
    var lo = delay - hops * hop - nInt * SPEC.PW_MAX;
    var hi = delay - hops * hop - nInt * SPEC.PW_MIN;
    lo = Math.max(SPEC.PW_MIN, Math.ceil(lo / 10) * 10);
    hi = Math.min(SPEC.PW_MAX, Math.floor(hi / 10) * 10);
    return lo <= hi ? [lo, hi] : null;
  }

  /**
   * input: { pwFirst, pwLast, delay, ampFirst, ampLast, freq, hop, manualB }
   */
  function compute(input) {
    var errors = [], warnings = [], notes = [];
    var hop = Number.isFinite(input.hop) && input.hop > 0 ? input.hop : SPEC.HOP_MEASURED;
    input = Object.assign({}, input, { hop: hop });

    if (!checkPW(input.pwFirst)) errors.push('El ancho de pulso del área inicial debe estar entre 20 y 1000 µs, en pasos de 10 µs.');
    if (!checkPW(input.pwLast)) errors.push('El ancho de pulso del área final debe estar entre 20 y 1000 µs, en pasos de 10 µs.');
    if (!checkAmp(input.ampFirst)) errors.push('La amplitud del área inicial debe estar entre 0,1 y 25,5 mA, en pasos de 0,1 mA.');
    if (!checkAmp(input.ampLast)) errors.push('La amplitud del área final debe estar entre 0,1 y 25,5 mA, en pasos de 0,1 mA.');
    if (!Number.isFinite(input.delay) || input.delay < 0) errors.push('El retardo deseado debe ser un número positivo (µs).');
    if (errors.length) return { ok: false, errors: errors, warnings: [], notes: [] };

    if (input.delay === 0) {
      return {
        ok: true, zeroDelay: true, errors: [], warnings: [],
        notes: ['Retardo 0 (Hebb−): no se consigue con dos áreas distintas. Use una sola área (A) con dos contactos y reparta el porcentaje de corriente entre ellos; ambos estimulan a la vez.'],
        areas: SPEC.AREAS.map(function (name, i) {
          return i === 0
            ? { name: name, on: true, role: 'inicial y final', pw: input.pwFirst, amp: input.ampFirst, start: 0 }
            : { name: name, on: false, role: 'apagada', pw: null, amp: 0, start: null };
        }),
        achieved: 0, error: 0, hops: 0, alternatives: []
      };
    }

    var cands = [1, 2, 3].map(function (h) { return candidate(input, h); });
    var best = cands.slice().sort(function (a, b) {
      return Math.abs(a.error) - Math.abs(b.error) || a.hops - b.hops;
    })[0];

    // Áreas
    var areas = [], t = 0;
    for (var i = 0; i < 4; i++) {
      var name = SPEC.AREAS[i], a;
      if (i === 0) a = { name: name, on: true, role: 'inicial', pw: input.pwFirst, amp: input.ampFirst };
      else if (i < best.hops) a = { name: name, on: true, role: 'intermedia', pw: best.intermediatePWs[i - 1], amp: SPEC.INTERMEDIATE_AMP };
      else if (i === best.hops) a = { name: name, on: true, role: 'final', pw: input.pwLast, amp: input.ampLast };
      else a = { name: name, on: false, role: 'apagada', pw: null, amp: 0 };
      if (a.on) { a.start = t; t += a.pw + hop; } else a.start = null;
      areas.push(a);
    }

    if (best.error !== 0) {
      var exactRequested = Math.abs(best.error) <= SPEC.PW_STEP / 2 && input.delay % 10 !== 0;
      if (exactRequested) {
        notes.push('El retardo se ajusta en pasos de 10 µs (resolución del ancho de pulso). Se usa ' + best.achieved + ' µs.');
      } else {
        warnings.push('El retardo deseado no se puede conseguir exactamente con A = ' + input.pwFirst +
          ' µs. Se muestra la configuración más cercana (' + best.achieved + ' µs, diferencia ' +
          (best.error > 0 ? '+' : '') + best.error + ' µs).');
        var sugg = [];
        [1, 2, 3].forEach(function (h) {
          var s = suggestPWFirst(input.delay, h, hop);
          if (s) sugg.push('con ' + SPEC.AREAS[h] + ' como área final, ancho de A entre ' + s[0] + ' y ' + s[1] + ' µs');
        });
        if (sugg.length) notes.push('Para conseguirlo exactamente habría que cambiar el ancho del área inicial: ' + sugg.join('; ') + '.');
        else notes.push('Ningún ancho de A permite este retardo. Rango posible del equipo: ' +
          (SPEC.PW_MIN + hop) + '–' + (SPEC.PW_MAX + 3 * hop + 2 * SPEC.PW_MAX) + ' µs, con huecos entre ' +
          'A→B, A→C y A→D.');
      }
    }
    if (best.splitAdjusted) {
      warnings.push('El ancho de B indicado no es compatible con la suma necesaria (' + best.sumIntermediate +
        ' µs). Se ha ajustado a ' + best.intermediatePWs[0] + ' µs (rango válido ' + best.splitRange[0] + '–' + best.splitRange[1] + ' µs).');
    }

    // Frecuencia: solo avisos, no cambia el cálculo
    var nOn = best.hops + 1;
    var cycle = areas.reduce(function (s, a) { return s + (a.on ? a.pw + hop : 0); }, 0);
    var period = input.freq ? 1e6 / input.freq : null;
    if (period) {
      if (cycle > period) {
        warnings.push('A ' + input.freq + ' Hz el periodo es de ' + Math.round(period) + ' µs y el ciclo calculado dura ' + cycle +
          ' µs (anchos + ' + nOn + ' × ' + hop + ' µs). No cabe: el equipo comprime los huecos y el retardo real será distinto (en el Test 5, a 150 Hz, la regla no se cumplió). Baje la frecuencia.');
      }
      if (!SPEC.VALIDATED_FREQ[input.freq]) {
        notes.push('La regla de retardo no se ha comprobado experimentalmente a ' + input.freq + ' Hz (sí a 2, 20, 40 y 50 Hz).');
      } else {
        notes.push('Regla comprobada a ' + input.freq + ' Hz: ' + SPEC.VALIDATED_FREQ[input.freq] + '.');
      }
      if (input.freq >= 800 && nOn > 2) warnings.push('En la caracterización, a 800 Hz o más no se pudieron encender más de dos áreas.');
      else if (input.freq >= 700 && nOn > 3) warnings.push('En la caracterización, a 700 Hz no se pudieron encender las cuatro áreas (hubo que apagar una).');
      else if (input.freq >= 130 && input.freq < 150 && nOn > 3) warnings.push('En la caracterización, a 130 Hz con cuatro áreas el programador no dejó configurar la estimulación.');
      if (input.freq >= 700 && Math.max(input.ampFirst, input.ampLast) > 6) warnings.push('En la caracterización, a 700 Hz o más hubo que bajar la amplitud a 6 mA o menos porque el equipo no daba más energía.');
      if (input.freq >= 1000 && Math.max(input.pwFirst, input.pwLast) > 60) warnings.push('En la caracterización, a 1000–1200 Hz hubo que reducir el ancho de pulso a 60 µs.');
    }

    return {
      ok: true, errors: [], warnings: warnings, notes: notes, areas: areas,
      achieved: best.achieved, error: best.error, hops: best.hops, cycle: cycle, period: period,
      sumIntermediate: best.sumIntermediate, hop: hop,
      alternatives: cands.filter(function (c) { return c !== best; })
    };
  }

  var api = { SPEC: SPEC, compute: compute, range: range, split: split, suggestPWFirst: suggestPWFirst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WWCalc = api;
})(this);
