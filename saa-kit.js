/* ==========================================================================
   Swift AI Academy - interaction kit. Markup-driven: <div class="saa-kit" data-kit="..."> ... </div>
   Kits: reveal | quick | sort | order | spot | stamp | match | dial.   data-required on a kit = Next is locked until it is done.
   sort + data-style="deck": one card at a time (flick / drag / tap a box / arrow keys); same data, feedback and saa:done.
   match: link each item to its partner with a band (tap-tap / drag / keyboard); data-style="wire" = cable look;
   data-mode="pick" = one plug wired to the chosen option, the game checks it.
   dial: turn a knob to each position (drag / tap / arrow keys); a sample AI answer swaps live, the caption explains it.
   Every kit: works with tap and keyboard; sort and order also drag (mouse + touch); one-sentence feedback.
   ========================================================================== */
(function (win, doc) {
  'use strict';
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(tag, cls, txt) { var e = doc.createElement(tag); if (cls) { e.className = cls; } if (txt != null) { e.textContent = txt; } return e; }
  function shake(e) { e.classList.remove('saa-shake'); void e.offsetWidth; e.classList.add('saa-shake'); }
  function done(k) {
    if (k.classList.contains('is-done')) { return; }
    k.classList.add('is-done'); k.setAttribute('data-done', '1');
    try { k.dispatchEvent(new CustomEvent('saa:done', { bubbles: true })); } catch (e) {}
  }
  function why(k) { var w = $('.saa-k-why', k); if (!w) { w = el('p', 'saa-k-why'); w.setAttribute('aria-live', 'polite'); k.appendChild(w); } return w; }
  function say(k, text, ok, quiet) {
    var w = why(k); w.textContent = text || ''; w.className = 'saa-k-why' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
    /* a checked answer: right or wrong sound (explanations shown after checking stay quiet) */
    if (!quiet && text && win.SAA_SFX) { if (ok === true) { win.SAA_SFX.correct(); } else if (ok === false) { win.SAA_SFX.wrong(); } }
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- reveal: flip cards, or scratch cards (data-style="scratch") ---------- */
  function reveal(k) {
    var cards = $$('.saa-card', k), scratch = k.getAttribute('data-style') === 'scratch';
    var st = el('p', 'saa-k-status'); k.insertBefore(st, k.firstChild);
    function count() {
      var n = $$('.saa-card.open', k).length; st.textContent = n + ' of ' + cards.length + ' opened';
      if (n === cards.length) { done(k); }
    }
    cards.forEach(function (c) {
      var f = $('.saa-front', c), b = $('.saa-back', c);
      var inner = el('span', 'saa-card-in'); c.insertBefore(inner, f); inner.appendChild(f); inner.appendChild(b);
      c.setAttribute('aria-expanded', 'false');
      function open() { if (c.classList.contains('open')) { return; } c.classList.add('open'); c.setAttribute('aria-expanded', 'true'); count(); }
      if (scratch) {
        c.classList.add('scratch');
        var cv = doc.createElement('canvas'); c.appendChild(cv);
        var ctx = cv.getContext('2d'), drawing = false, moves = 0;
        function paint() {
          var r = c.getBoundingClientRect(); cv.width = Math.max(10, r.width); cv.height = Math.max(10, r.height);
          var g = ctx.createLinearGradient(0, 0, cv.width, cv.height); g.addColorStop(0, '#2B3A7A'); g.addColorStop(1, '#3C59F6');
          ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.fillStyle = '#F6F4EF'; ctx.font = '700 15px "Instrument Sans", sans-serif'; ctx.textBaseline = 'middle';
          ctx.fillText(f.textContent, 16, cv.height / 2 - 9);
          ctx.fillStyle = '#B8C4FF'; ctx.font = '700 11px "Instrument Sans", sans-serif'; ctx.fillText('SCRATCH OR TAP', 16, cv.height / 2 + 13);
        }
        function cleared() {
          var d = ctx.getImageData(0, 0, cv.width, cv.height).data, clear = 0, step = 40;
          for (var i = 3; i < d.length; i += 4 * step) { if (d[i] === 0) { clear++; } }
          return clear / (d.length / (4 * step));
        }
        function scratchAt(e) {
          var r = cv.getBoundingClientRect(); ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath(); ctx.arc(e.clientX - r.left, e.clientY - r.top, 22, 0, Math.PI * 2); ctx.fill();
          if (++moves % 6 === 0 && cleared() > 0.4) { open(); }
        }
        setTimeout(paint, 30); win.addEventListener('resize', function () { if (!c.classList.contains('open')) { paint(); } });
        var downAt = 0;
        cv.addEventListener('pointerdown', function (e) { drawing = true; downAt = Date.now(); moves = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) {} scratchAt(e); });
        cv.addEventListener('pointermove', function (e) { if (drawing) { scratchAt(e); e.preventDefault(); } });
        cv.addEventListener('pointerup', function () { drawing = false; if (moves < 3 && Date.now() - downAt < 400) { open(); } });
        c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      } else {
        c.addEventListener('click', open);
      }
    });
    count();
  }

  /* ---------- quick check: one question, instant feedback, try again ---------- */
  function quick(k) {
    var opts = $$('.saa-k-opt', k), w = $('.saa-k-why', k) || why(k);
    var right = w.getAttribute('data-right') || 'Yes, that is right.', wrong = w.getAttribute('data-wrong') || 'Not quite. Try again.';
    if (k.hasAttribute('data-shuffle')) { var box = opts[0].parentNode; shuffle(opts.slice()).forEach(function (o) { box.appendChild(o); }); }
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        if (k.classList.contains('is-done')) { return; }
        if (o.hasAttribute('data-ok')) {
          o.classList.add('right'); say(k, o.getAttribute('data-why') || right, true);
          opts.forEach(function (x) { x.disabled = true; }); done(k);
        } else {
          o.classList.add('wrong'); o.disabled = true; shake(o); say(k, o.getAttribute('data-why') || wrong, false);
        }
      });
    });
  }

  /* ---------- sort, data-style="deck": one card at a time (Flick to Sort). Flick / drag the top card to a box,
     or tap a box, or use the arrow keys (two boxes) / Enter on a box. Same data-bin / data-why / data-hint / data-done-text. ---------- */
  function sortDeck(k) {
    var pool = $('.saa-pool', k), bins = $$('.saa-bin', k), wrap = bins.length ? bins[0].parentNode : null;
    var reduce = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches), dragged = false;
    k.classList.add('saa-deck'); if (bins.length > 2) { k.classList.add('saa-deck-many'); }
    if (k.hasAttribute('data-shuffle')) { shuffle($$('.saa-chip', pool)).forEach(function (c) { pool.appendChild(c); }); }
    var total = $$('.saa-chip', pool).length;
    var st = el('p', 'saa-k-status'); st.setAttribute('aria-live', 'polite'); k.insertBefore(st, k.firstChild);
    if (wrap && wrap.parentNode === k) { k.insertBefore(pool, wrap); }   /* the card sits above the boxes */
    bins.forEach(function (b, i) {
      if (!$('.saa-bin-h', b)) { b.insertBefore(el('p', 'saa-bin-h', b.getAttribute('data-label') || ''), b.firstChild); }
      var lab = (b.getAttribute('data-label') || $('.saa-bin-h', b).textContent || '').trim();
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-label', lab);
      if (bins.length === 2) { var a = el('span', 'saa-bin-arr', i ? '→' : '←'); a.setAttribute('aria-hidden', 'true'); b.appendChild(a); }
      var n = el('span', 'saa-bin-n', '0'); n.setAttribute('aria-hidden', 'true'); b.appendChild(n);
    });
    function top() { return $('.saa-chip', pool); }
    function layout() {
      var cs = $$('.saa-chip', pool);
      cs.forEach(function (c, i) {
        c.classList.toggle('is-top', i === 0); c.classList.toggle('is-next', i === 1); c.classList.remove('is-drag');
        c.tabIndex = i === 0 ? 0 : -1; c.style.transform = '';
        if (i) { c.setAttribute('aria-hidden', 'true'); } else { c.removeAttribute('aria-hidden'); }
      });
      st.textContent = cs.length ? 'Card ' + (total - cs.length + 1) + ' of ' + total : total + ' of ' + total + ' sorted';
      bins.forEach(function (b) { $('.saa-bin-n', b).textContent = $$('.saa-chip', b).length; });
    }
    function arm(b) { bins.forEach(function (x) { x.classList.toggle('over', x === b); }); }
    function fly(c, b) {   /* a copy of the card flies into the box; the real card is already sorted */
      if (reduce) { return; }
      var g = el('div', 'saa-deck-ghost'); g.innerHTML = c.innerHTML; g.setAttribute('aria-hidden', 'true');
      var cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(), z = cr.width ? c.offsetWidth / cr.width : 1;
      var dx = (br.left + br.width / 2 - cr.left - cr.width / 2) * z, dy = (br.top + br.height / 2 - cr.top - cr.height / 2) * z;
      g.style.transform = c.style.transform || 'none'; pool.appendChild(g); void g.offsetWidth;
      g.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.25) rotate(' + (dx < 0 ? -10 : 10) + 'deg)'; g.style.opacity = '0';
      setTimeout(function () { if (g.parentNode) { g.parentNode.removeChild(g); } }, 450);
    }
    function drop(b) {
      var c = top(); arm(null);
      if (!c || k.classList.contains('is-done')) { return; }
      if (c.getAttribute('data-bin') === b.getAttribute('data-bin')) {
        var hadFocus = doc.activeElement === c;
        fly(c, b);
        c.disabled = true; c.classList.remove('is-top', 'is-next', 'is-drag'); c.removeAttribute('aria-hidden'); c.removeAttribute('tabindex'); c.style.transform = '';
        b.appendChild(c); b.classList.remove('saa-bin-hit'); void b.offsetWidth; b.classList.add('saa-bin-hit');
        say(k, c.getAttribute('data-why') || 'Yes, that is right.', true);
        layout();
        if (!top()) { say(k, k.getAttribute('data-done-text') || 'All sorted. Well done.', true); done(k); }
        else if (hadFocus) { try { top().focus({ preventScroll: true }); } catch (x) { top().focus(); } }
      } else {
        c.classList.remove('is-drag'); c.style.transform = ''; shake(b); shake(c);
        say(k, c.getAttribute('data-hint') || 'Not that one. Read it again and try the other box.', false);
      }
    }
    function binAt(x, y) { var e = doc.elementFromPoint(x, y); return e && e.closest ? e.closest('.saa-bin') : null; }
    /* drag / flick the top card. touch-action:pan-y keeps vertical page scroll on phones */
    pool.addEventListener('pointerdown', function (e) {
      var c = top();
      if (!c || e.target.closest('.saa-chip') !== c || k.classList.contains('is-done') || (e.pointerType === 'mouse' && e.button !== 0)) { return; }
      var sx = e.clientX, sy = e.clientY, moved = false, over = null, w = c.getBoundingClientRect().width || 300;
      var z = c.offsetWidth / w || 1, thr = Math.min(110, w * 0.3);
      try { c.setPointerCapture(e.pointerId); } catch (x) {}
      function pick(ev) {
        var dx = ev.clientX - sx, b = binAt(ev.clientX, ev.clientY);
        if (!b && bins.length === 2 && Math.abs(dx) > thr) { b = bins[dx < 0 ? 0 : 1]; }
        return b;
      }
      function mv(ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 8) { return; }
        if (!moved) { moved = true; c.classList.add('is-drag'); }
        c.style.transform = 'translate(' + dx * z + 'px,' + dy * z + 'px) rotate(' + (dx * z / 22) + 'deg)';
        over = pick(ev); arm(over);
        ev.preventDefault();
      }
      function end(ev, cancel) {
        c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', cn); c.removeEventListener('lostpointercapture', cn);
        if (!moved) { return; }
        dragged = true; setTimeout(function () { dragged = false; }, 80);
        var b = !cancel && ev ? pick(ev) : null;
        if (b) { drop(b); } else { arm(null); c.classList.remove('is-drag'); c.style.transform = ''; }
      }
      function up(ev) { end(ev, false); } function cn() { end(null, true); }
      c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', cn); c.addEventListener('lostpointercapture', cn);
    });
    /* tapping the card itself points to the boxes */
    pool.addEventListener('click', function (e) {
      if (dragged || !e.target.closest('.saa-chip')) { return; }
      bins.forEach(function (b) { b.classList.add('saa-nudge'); });
      setTimeout(function () { bins.forEach(function (b) { b.classList.remove('saa-nudge'); }); }, 1300);
    });
    bins.forEach(function (b) {
      b.addEventListener('click', function () { drop(b); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(b); } });
    });
    k.addEventListener('keydown', function (e) {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || k.classList.contains('is-done')) { return; }
      var t = e.target; if (!(t === top() || bins.indexOf(t) >= 0)) { return; }
      e.preventDefault();
      if (bins.length === 2) { drop(bins[e.key === 'ArrowLeft' ? 0 : 1]); return; }
      var i = bins.indexOf(t), j = i < 0 ? (e.key === 'ArrowLeft' ? 0 : bins.length - 1) : Math.max(0, Math.min(bins.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)));
      bins[j].focus();
    });
    layout();
  }

  /* ---------- sort: tap a chip then a box, or drag it (mouse + touch) ---------- */
  function sort(k) {
    if (k.getAttribute('data-style') === 'deck') { sortDeck(k); return; }
    var pool = $('.saa-pool', k), bins = $$('.saa-bin', k), sel = null, dragged = false;
    if (k.hasAttribute('data-shuffle')) { shuffle($$('.saa-chip', pool)).forEach(function (c) { pool.appendChild(c); }); }
    bins.forEach(function (b) { if (!$('.saa-bin-h', b)) { var h = el('p', 'saa-bin-h', b.getAttribute('data-label') || ''); b.insertBefore(h, b.firstChild); } });
    function pick(c) {
      if (sel) { sel.setAttribute('aria-pressed', 'false'); }
      sel = sel === c ? null : c; if (sel) { sel.setAttribute('aria-pressed', 'true'); }
      k.classList.toggle('armed', !!sel);
    }
    function drop(b, c) {
      c = c || sel; if (!c) { say(k, 'Tap an item first.', null); return; }
      if (c.getAttribute('data-bin') === b.getAttribute('data-bin')) {
        c.setAttribute('aria-pressed', 'false'); c.disabled = true; b.appendChild(c); sel = null; k.classList.remove('armed');
        say(k, c.getAttribute('data-why') || 'Yes, that is right.', true);
        if (!$('.saa-chip', pool)) { say(k, k.getAttribute('data-done-text') || 'All sorted. Well done.', true); done(k); }
      } else {
        shake(b); say(k, c.getAttribute('data-hint') || 'Not that one. Read it again and try the other box.', false);
        c.setAttribute('aria-pressed', 'false'); sel = null; k.classList.remove('armed');
      }
    }
    function binAt(x, y) { var e = doc.elementFromPoint(x, y); return e && e.closest ? e.closest('.saa-bin') : null; }
    $$('.saa-chip', pool).forEach(function (c) {
      c.addEventListener('click', function () { if (dragged) { dragged = false; return; } pick(c); });
      c.addEventListener('pointerdown', function (e) {
        if (c.disabled || (e.pointerType === 'mouse' && e.button !== 0)) { return; }
        var sx = e.clientX, sy = e.clientY, g = null, over = null, moved = false, id = e.pointerId;
        try { c.setPointerCapture(id); } catch (x) {}
        function mv(ev) {
          if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 8) { return; }
          if (!moved) { moved = true; g = el('div', 'saa-ghost-chip', c.textContent); g.style.width = c.offsetWidth + 'px'; doc.body.appendChild(g); c.style.opacity = '.35'; }
          g.style.transform = 'translate(' + (ev.clientX - g.offsetWidth / 2) + 'px,' + (ev.clientY - g.offsetHeight / 2) + 'px) rotate(-2deg)';
          var b = binAt(ev.clientX, ev.clientY); if (over !== b) { if (over) { over.classList.remove('over'); } over = b; if (over) { over.classList.add('over'); } }
          ev.preventDefault();
        }
        function end(ev, cancel) {
          c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', cn); c.removeEventListener('lostpointercapture', cn);
          if (over) { over.classList.remove('over'); }
          if (g && g.parentNode) { g.parentNode.removeChild(g); } c.style.opacity = '';
          if (!moved) { return; }
          dragged = true; setTimeout(function () { dragged = false; }, 80);
          var b = !cancel && ev ? binAt(ev.clientX, ev.clientY) : null; if (b) { drop(b, c); }
        }
        function up(ev) { end(ev, false); } function cn() { end(null, true); }
        c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', cn); c.addEventListener('lostpointercapture', cn);
      });
    });
    bins.forEach(function (b) { b.addEventListener('click', function (e) { if (e.target.closest('.saa-chip') && e.target.closest('.saa-bin')) { return; } drop(b); }); });
  }

  /* ---------- order (domino chain): drag, or tap two to swap, or use the arrows; then check ---------- */
  function order(k) {
    var list = $('.saa-steps', k), items = $$('li', list), btn = $('.saa-k-check', k);
    if (!btn) { btn = el('button', 'saa-k-check', 'Check the order'); btn.type = 'button'; list.parentNode.insertBefore(btn, list.nextSibling); }
    var w = why(k), right = w.getAttribute('data-right') || 'Yes. That is the right order.', wrong = w.getAttribute('data-wrong') || 'Not yet. The red steps are in the wrong place.';
    items.forEach(function (li) {
      li.setAttribute('tabindex', '0');
      var mvb = el('span', 'saa-mv');
      var u = el('button', '', '↑'), d = el('button', '', '↓'); u.type = d.type = 'button';
      u.setAttribute('aria-label', 'Move up'); d.setAttribute('aria-label', 'Move down');
      u.addEventListener('click', function (e) { e.stopPropagation(); var p = li.previousElementSibling; if (p) { list.insertBefore(li, p); clear(); try { u.focus(); } catch (x) {} } });   /* keep focus on the moved step */
      d.addEventListener('click', function (e) { e.stopPropagation(); var n = li.nextElementSibling; if (n) { list.insertBefore(n, li); clear(); try { d.focus(); } catch (x) {} } });
      mvb.appendChild(u); mvb.appendChild(d); li.appendChild(mvb);
    });
    do { shuffle(items).forEach(function (li) { list.appendChild(li); }); } while (items.length > 1 && isRight());
    function isRight() { return $$('li', list).every(function (li, i) { return +li.getAttribute('data-n') === i + 1; }); }
    function clear() { $$('li', list).forEach(function (li) { li.classList.remove('good', 'off'); }); say(k, '', null); }
    var picked = null;
    list.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (!li || e.target.closest('.saa-mv') || k.classList.contains('is-done')) { return; }
      if (!picked) { picked = li; li.classList.add('picked'); return; }
      if (picked !== li) { var a = picked.nextElementSibling === li ? li : null; var ph = el('li'); list.insertBefore(ph, li); list.insertBefore(li, picked); list.insertBefore(picked, ph); list.removeChild(ph); clear(); }
      picked.classList.remove('picked'); picked = null;
    });
    /* drag to reorder */
    list.addEventListener('pointerdown', function (e) {
      var li = e.target.closest('li'); if (!li || e.target.closest('.saa-mv') || k.classList.contains('is-done') || (e.pointerType === 'mouse' && e.button !== 0)) { return; }
      var sy = e.clientY, moved = false, id = e.pointerId;
      function mv(ev) {
        if (!moved && Math.abs(ev.clientY - sy) < 8) { return; }
        if (!moved) { moved = true; li.classList.add('dragging'); if (picked) { picked.classList.remove('picked'); picked = null; } }
        var after = $$('li', list).filter(function (x) { return x !== li; }).filter(function (x) { var r = x.getBoundingClientRect(); return ev.clientY > r.top + r.height / 2; }).pop();
        if (after) { list.insertBefore(li, after.nextSibling); } else { list.insertBefore(li, list.firstChild); }
        ev.preventDefault();
      }
      function up() { doc.removeEventListener('pointermove', mv); doc.removeEventListener('pointerup', up); doc.removeEventListener('pointercancel', up); li.classList.remove('dragging'); if (moved) { clear(); li.addEventListener('click', function s(ev) { ev.stopPropagation(); li.removeEventListener('click', s, true); }, true); } }
      doc.addEventListener('pointermove', mv); doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', up);
    });
    btn.addEventListener('click', function () {
      var ok = true;
      $$('li', list).forEach(function (li, i) { var g = +li.getAttribute('data-n') === i + 1; li.classList.toggle('good', g); li.classList.toggle('off', !g); if (!g) { ok = false; shake(li); } });
      if (ok) {
        $$('li', list).forEach(function (li, i) { li.style.animationDelay = (i * 0.12) + 's'; });
        k.classList.add('toppled'); say(k, right, true); btn.disabled = true; done(k);
      } else { say(k, wrong, false); }
    });
  }

  /* ---------- spot (detective): tap the parts that need checking, then check ---------- */
  function spot(k) {
    var parts = $$('.saa-s', k), btn = $('.saa-k-check', k);
    if (!btn) { btn = el('button', 'saa-k-check', 'Check my choices'); btn.type = 'button'; k.appendChild(btn); }
    why(k);
    btn.disabled = true;
    parts.forEach(function (s) {
      s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0'); s.setAttribute('aria-pressed', 'false');
      function tog() {
        if (k.classList.contains('checked')) { var f = s.hasAttribute('data-ok'), on = s.classList.contains('on'); say(k, (f ? (on ? 'You found this. ' : 'You missed this. ') : (on ? 'This part was fine. ' : 'Fine. ')) + (s.getAttribute('data-why') || ''), f && on ? true : f ? false : null, true); return; }
        s.classList.toggle('on'); s.setAttribute('aria-pressed', s.classList.contains('on') ? 'true' : 'false');
        btn.disabled = !$('.saa-s.on', k);
      }
      s.addEventListener('click', tog);
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    });
    btn.addEventListener('click', function () {
      if (k.classList.contains('checked')) {   /* Try again */
        k.classList.remove('checked'); parts.forEach(function (s) { s.classList.remove('on', 'hit', 'miss', 'false'); s.setAttribute('aria-pressed', 'false'); });
        btn.textContent = 'Check my choices'; btn.disabled = true; say(k, '', null); return;
      }
      var need = parts.filter(function (s) { return s.hasAttribute('data-ok'); }), found = 0;
      parts.forEach(function (s) { var f = s.hasAttribute('data-ok'), on = s.classList.contains('on'); s.classList.add(f ? (on ? 'hit' : 'miss') : (on ? 'false' : 'ok')); if (f && on) { found++; } });
      k.classList.add('checked');
      var all = found === need.length;
      say(k, 'You found ' + found + ' of ' + need.length + '. ' + (all ? (k.getAttribute('data-done-text') || 'Well done.') : 'Tap any coloured part to see why, or try again.'), all);
      if (all) { btn.style.display = 'none'; done(k); } else { btn.textContent = 'Try again'; }   /* Next unlocks only when every part is found */
    });
  }

  /* ---------- stamp: stamp each statement with the right verdict ---------- */
  function stamp(k) {
    var labels = (k.getAttribute('data-stamps') || 'Check it|Looks fine').split('|');
    var rows = $$('.saa-row', k);
    rows.forEach(function (r) {
      if (!$('.saa-row-t', r)) { var t = el('span', 'saa-row-t'); while (r.firstChild) { t.appendChild(r.firstChild); } r.appendChild(t); }
      var box = el('span', 'saa-stamps'), ink = el('span', 'saa-ink', labels[+r.getAttribute('data-ans')] || '');
      labels.forEach(function (lab, i) {
        var b = el('button', 'saa-stamp-btn', lab); b.type = 'button';
        b.addEventListener('click', function () {
          if (+r.getAttribute('data-ans') === i) {
            r.classList.add('done'); say(k, r.getAttribute('data-why') || 'Yes.', true);
            if (rows.every(function (x) { return x.classList.contains('done'); })) { say(k, k.getAttribute('data-done-text') || 'All stamped. Well done.', true); done(k); }
          } else { shake(r); say(k, r.getAttribute('data-hint') || 'Not quite. Read it again.', false); }
        });
        box.appendChild(b);
      });
      r.appendChild(box); r.appendChild(ink);
    });
  }

  /* ---------- match (Band Connect; data-style="wire" = Cause Circuit cable): link each left item to its partner.
     Tap an item, then its partner (either side first) - or drag a band from one to the other - or Tab + Enter.
     .saa-m-item and .saa-m-target share a data-pair. Right: the band stays, data-why shows. Wrong: the band snaps
     back, data-hint (default "Not quite. Try again.") shows. All linked: data-done-text (if set), is-done, saa:done.
     data-mode="pick": one plug and several .saa-m-target - a link only SELECTS (the target's own click handler runs);
     the game checks it. The wire turns green / red when the game gives the target is-right / is-wrong. ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function match(k) {
    var pickMode = k.getAttribute('data-mode') === 'pick';
    var reduce = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var board = pickMode ? k : ($('.saa-m-board', k) || k);
    var items = pickMode ? [] : $$('.saa-m-item', k), targets = $$('.saa-m-target', k);
    var sel = null, dragged = false, links = [], plug = null, pickWire = null, st = null;
    k.classList.add('saa-match'); if (pickMode) { k.classList.add('saa-m-pick'); }
    if (k.getAttribute('data-style') === 'wire') { k.classList.add('saa-m-wire'); }
    var svg = doc.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'saa-m-lines'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    board.insertBefore(svg, board.firstChild);
    function mkLink(cls) {
      var g = doc.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'saa-m-link ' + (cls || ''));
      ['saa-m-case', 'saa-m-core'].forEach(function (c) { var p = doc.createElementNS(SVGNS, 'path'); p.setAttribute('class', c); g.appendChild(p); });
      svg.appendChild(g); return g;
    }
    function setD(g, d) { if (g.firstChild.getAttribute('d') !== d) { g.firstChild.setAttribute('d', d); g.lastChild.setAttribute('d', d); } }
    function cls(g, c) { var v = 'saa-m-link ' + c; if (g.getAttribute('class') !== v) { g.setAttribute('class', v); } }
    function drop(g) { if (g && g.parentNode) { g.parentNode.removeChild(g); } }
    /* points are in the board's own (unzoomed) px, so lines stay on the dots at any --z */
    function frame() { var r = board.getBoundingClientRect(); return { r: r, z: r.width ? board.offsetWidth / r.width : 1 }; }
    function at(e, f) { var d = $('.saa-m-dot', e) || e, r = d.getBoundingClientRect(); f = f || frame(); return { x: (r.left + r.width / 2 - f.r.left) * f.z, y: (r.top + r.height / 2 - f.r.top) * f.z }; }
    function ptr(ev, f) { f = f || frame(); return { x: (ev.clientX - f.r.left) * f.z, y: (ev.clientY - f.r.top) * f.z }; }
    function n1(v) { return Math.round(v * 10) / 10; }
    function curve(a, b) { var s = b.x >= a.x ? 1 : -1, dx = Math.max(24, Math.abs(b.x - a.x) / 2) * s;
      return 'M' + n1(a.x) + ' ' + n1(a.y) + ' C' + n1(a.x + dx) + ' ' + n1(a.y) + ' ' + n1(b.x - dx) + ' ' + n1(b.y) + ' ' + n1(b.x) + ' ' + n1(b.y); }
    function band(a, b) { return 'M' + n1(a.x) + ' ' + n1(a.y) + ' Q' + n1((a.x + b.x) / 2) + ' ' + n1((a.y + b.y) / 2 + 18) + ' ' + n1(b.x) + ' ' + n1(b.y); }
    function elbow(a, b) {   /* pick mode: down the gutter, then a rounded turn into the socket */
      var r = Math.max(0, Math.min(10, b.x - a.x, Math.abs(b.y - a.y))), s = b.y >= a.y ? 1 : -1;
      if (r < 2) { return curve(a, b); }
      return 'M' + n1(a.x) + ' ' + n1(a.y) + ' L' + n1(a.x) + ' ' + n1(b.y - r * s) + ' Q' + n1(a.x) + ' ' + n1(b.y) + ' ' + n1(a.x + r) + ' ' + n1(b.y) + ' L' + n1(b.x) + ' ' + n1(b.y);
    }
    function stacked() { return !pickMode && getComputedStyle(board).getPropertyValue('--m-stack').trim() === '1'; }
    function addDot(e, first) { if ($('.saa-m-dot', e)) { return; } var d = el('span', 'saa-m-dot'); d.setAttribute('aria-hidden', 'true'); if (first) { e.insertBefore(d, e.firstChild); } else { e.appendChild(d); } }
    /* the snap-back: the loose end slides back to where the drag (or tap) started, then the band is gone */
    function snapBack(g, from, to) {
      if (reduce || !g) { drop(g); return; }
      var t0 = 0;
      function step(ts) {
        if (!g.parentNode) { return; }
        if (!t0) { t0 = ts; }
        var t = Math.min(1, (ts - t0) / 280), e = 1 - Math.pow(1 - t, 3);
        setD(g, band(from, { x: to.x + (from.x - to.x) * e, y: to.y + (from.y - to.y) * e }));
        if (t < 1) { win.requestAnimationFrame(step); } else { drop(g); }
      }
      setTimeout(function () { win.requestAnimationFrame(step); }, 160);
    }

    if (pickMode) {
      plug = el('span', 'saa-m-plug'); plug.setAttribute('aria-hidden', 'true'); k.appendChild(plug);
      pickWire = mkLink('is-on'); pickWire.style.display = 'none';
      targets.forEach(function (t) { addDot(t, true); });
      sel = targets.filter(function (t) { return t.getAttribute('aria-checked') === 'true' || t.getAttribute('aria-pressed') === 'true' || t.classList.contains('is-selected'); })[0] || null;
      targets.forEach(function (t) { t.addEventListener('click', function () { sel = t; redraw(); }); });
      /* the game marks the checked answer: recolour the wire (only the targets are watched, never the svg) */
      if (win.MutationObserver) { var mo = new MutationObserver(function () { redraw(); }); targets.forEach(function (t) { mo.observe(t, { attributes: true, attributeFilter: ['class', 'aria-checked'] }); }); }
    } else {
      if (k.hasAttribute('data-shuffle') && targets.length > 1) {   /* no target may sit straight across from its own item */
        var box = targets[0].parentNode, order = targets.slice();
        for (var tries = 0; tries < 60; tries++) {
          shuffle(order);
          if (order.every(function (t, i) { return !items[i] || items[i].getAttribute('data-pair') !== t.getAttribute('data-pair'); })) { break; }
        }
        order.forEach(function (t) { box.appendChild(t); }); targets = order;
      }
      st = el('p', 'saa-k-status'); st.setAttribute('aria-live', 'polite'); k.insertBefore(st, k.firstChild);
      items.forEach(function (e) { addDot(e, false); e.setAttribute('aria-pressed', 'false'); });
      targets.forEach(function (e) { addDot(e, true); e.setAttribute('aria-pressed', 'false'); });
      why(k);
    }
    function count() { if (st) { st.textContent = links.length + ' of ' + items.length + ' matched'; } }
    function redraw() {
      var f = frame();
      if (pickMode) {
        targets.forEach(function (t) { t.classList.toggle('saa-m-on', t === sel); });
        k.classList.toggle('has-link', !!sel);
        if (!sel || !sel.isConnected) { pickWire.style.display = 'none'; return; }
        var c = sel.className, state = /(^|\s)(is-)?right(\s|$)/.test(c) ? 'is-ok' : /(^|\s)(is-)?wrong(\s|$)/.test(c) ? 'is-bad' : 'is-on';
        cls(pickWire, state); k.setAttribute('data-wire', state.slice(3)); pickWire.style.display = '';
        var a = at(plug, f), b = at(sel, f); setD(pickWire, b.x - a.x >= 30 ? curve(a, b) : elbow(a, b));   /* plug beside the options: a curve; plug above them: down the gutter */
        return;
      }
      links.forEach(function (L) { setD(L.g, curve(at(L.it, f), at(L.tg, f))); });
    }
    function setSel(e) {
      if (sel) { sel.classList.remove('is-picked'); sel.setAttribute('aria-pressed', 'false'); }
      sel = e && e !== sel ? e : null;
      if (sel) { sel.classList.add('is-picked'); sel.setAttribute('aria-pressed', 'true'); }
      k.classList.toggle('armed', !!sel);
      k.classList.toggle('arm-to', !!sel && items.indexOf(sel) >= 0);
      k.classList.toggle('arm-from', !!sel && items.indexOf(sel) < 0);
    }
    function link(it, tg, g) {
      var hadFocus = doc.activeElement === it || doc.activeElement === tg, n = links.length + 1;
      [it, tg].forEach(function (x) {
        x.classList.remove('is-picked'); x.classList.add('is-linked'); x.disabled = true; x.setAttribute('aria-pressed', 'true');
        var b = el('span', 'saa-m-n', String(n)); b.setAttribute('aria-hidden', 'true'); x.appendChild(b);
      });
      g = g || mkLink(''); cls(g, 'is-ok'); links.push({ it: it, tg: tg, g: g }); redraw();
      say(k, it.getAttribute('data-why') || tg.getAttribute('data-why') || 'Yes, that is right.', true);
      count();
      var next = items.filter(function (x) { return !x.disabled; })[0];
      if (!next) { var dt = k.getAttribute('data-done-text'); if (dt) { say(k, dt, true); } done(k); }
      else if (hadFocus) { try { next.focus({ preventScroll: true }); } catch (x) { next.focus(); } }
    }
    function miss(it, tg, g, from) {
      from = from || it; var to = from === it ? tg : it, f = frame();
      shake(it); shake(tg);
      say(k, it.getAttribute('data-hint') || tg.getAttribute('data-hint') || 'Not quite. Try again.', false);
      if (stacked()) { drop(g); return; }
      g = g || mkLink(''); cls(g, 'is-bad'); var a = at(from, f), b = at(to, f); setD(g, band(a, b)); snapBack(g, a, b);
    }
    function judge(it, tg, g, from) { if (it.getAttribute('data-pair') === tg.getAttribute('data-pair')) { link(it, tg, g); } else { miss(it, tg, g, from); } }
    function tap(e) {
      if (k.classList.contains('is-done') || e.disabled) { return; }
      var isItem = items.indexOf(e) >= 0;
      if (sel && (items.indexOf(sel) >= 0) !== isItem) { var s = sel; setSel(null); if (isItem) { judge(e, s, null, s); } else { judge(s, e, null, s); } }
      else { setSel(e); }
    }
    if (!pickMode) {
      items.concat(targets).forEach(function (e) { e.addEventListener('click', function () { if (dragged) { return; } tap(e); }); });
      k.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) { setSel(null); } });
    }
    /* drag a band (pairs: from either side; pick: from the plug). Phones with the stacked layout: tap only */
    board.addEventListener('pointerdown', function (e) {
      if (k.classList.contains('is-done') || (e.pointerType === 'mouse' && e.button !== 0) || stacked()) { return; }
      var src = e.target.closest && e.target.closest(pickMode ? '.saa-m-plug' : '.saa-m-item, .saa-m-target');
      if (!src || !board.contains(src) || src.disabled) { return; }
      var fromItem = items.indexOf(src) >= 0, want = pickMode || fromItem ? targets : items;
      var sx = e.clientX, sy = e.clientY, moved = false, g = null, over = null, id = e.pointerId;
      try { src.setPointerCapture(id); } catch (x) {}
      function hit(ev) {
        var h = doc.elementFromPoint(ev.clientX, ev.clientY), t = null;
        for (var n = h; n && n !== doc.body; n = n.parentElement) { if (want.indexOf(n) >= 0) { t = n; break; } }
        return t && !t.disabled ? t : null;
      }
      function mv(ev) {
        if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 8) { return; }
        if (!moved) { moved = true; g = mkLink('is-live'); src.classList.add('is-src'); if (!pickMode) { setSel(null); } }
        var f = frame(); setD(g, band(at(src, f), ptr(ev, f)));
        var o = hit(ev); if (o !== over) { if (over) { over.classList.remove('over'); } over = o; if (over) { over.classList.add('over'); } }
        ev.preventDefault();
      }
      function end(ev, cancel) {
        src.removeEventListener('pointermove', mv); src.removeEventListener('pointerup', up); src.removeEventListener('pointercancel', cn); src.removeEventListener('lostpointercapture', cn);
        src.classList.remove('is-src'); if (over) { over.classList.remove('over'); }
        if (!moved) { return; }
        dragged = true; setTimeout(function () { dragged = false; }, 80);
        var t = !cancel && ev ? hit(ev) : null;
        if (pickMode) { drop(g); if (t) { t.click(); } return; }
        if (t) { if (fromItem) { judge(src, t, g, src); } else { judge(t, src, g, src); } }
        else if (ev && g) { var f = frame(); cls(g, 'is-live'); snapBack(g, at(src, f), ptr(ev, f)); } else { drop(g); }
      }
      function up(ev) { end(ev, false); } function cn() { end(null, true); }
      src.addEventListener('pointermove', mv); src.addEventListener('pointerup', up); src.addEventListener('pointercancel', cn); src.addEventListener('lostpointercapture', cn);
    });
    /* lines follow the layout: resize, zoom (--z), fonts, and the screen becoming visible */
    var rq = 0; function later() { win.cancelAnimationFrame(rq); rq = win.requestAnimationFrame(redraw); }
    win.addEventListener('resize', later);
    if (win.ResizeObserver) { new ResizeObserver(later).observe(board); }
    if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(later); }
    count(); redraw();
  }

  /* ---------- dial (Pressure Gauge / Volume Knob): turn a knob to each position; a sample AI answer swaps live.
     Each .saa-dial-stop = one position: .saa-d-name (label, may hold an icon), .saa-d-you (what you type, optional),
     .saa-d-ans (the AI answer), data-why = the caption, shown in .saa-k-why (so it gets a narrated clip).
     data-start on one stop = the position shown first (the original answer); it does not count as a try.
     Drag the knob (it turns), tap the knob (next position), tap a label, or arrow keys on the knob (role=slider).
     Done when every position has been tried: is-done + one saa:done. No right or wrong. ---------- */
  function dial(k) {
    var stops = $$('.saa-dial-stop', k); if (!stops.length) { return; }
    var n = stops.length, reduce = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var first = stops.filter(function (s) { return s.hasAttribute('data-start'); })[0], cur = -1, rot = 0, seen = [];
    var A = (k.getAttribute('data-angles') || '').split(',').map(parseFloat).filter(function (x) { return !isNaN(x); });
    if (A.length !== n) { A = n === 2 ? [-90, 90] : n === 3 ? [-90, 0, 90] : n === 4 ? [-45, 45, 135, 225] : stops.map(function (s, i) { return -120 + 240 * i / (n - 1); }); }
    k.classList.add('saa-dial', 'saa-d-n' + (n <= 4 ? n : 'x'));
    var st = el('p', 'saa-k-status'); st.setAttribute('aria-live', 'polite'); k.insertBefore(st, k.firstChild);
    var ctl = el('div', 'saa-d-ctl'), chat = el('div', 'saa-d-chat'), w = why(k);
    k.insertBefore(ctl, st.nextSibling); k.insertBefore(chat, ctl.nextSibling); if (w.parentNode === k) { k.appendChild(w); }
    w.setAttribute('aria-live', 'polite');
    var knob = el('div', 'saa-d-knob'), face = el('span', 'saa-d-face'), ring = el('span', 'saa-d-ring');
    ring.setAttribute('aria-hidden', 'true'); face.setAttribute('aria-hidden', 'true'); face.appendChild(el('span', 'saa-d-notch'));
    knob.appendChild(ring); knob.appendChild(face);
    knob.setAttribute('role', 'slider'); knob.setAttribute('tabindex', '0');
    knob.setAttribute('aria-label', k.getAttribute('data-label') || 'Dial'); knob.setAttribute('aria-valuemin', '1'); knob.setAttribute('aria-valuemax', String(n));
    var ticks = [], btns = stops.map(function (s, i) {
      var nm = $('.saa-d-name', s), b = el('button', 'saa-d-pos'); b.type = 'button'; b.setAttribute('data-pos', i); b.style.setProperty('--i', i);
      if (nm) { while (nm.firstChild) { b.appendChild(nm.firstChild); } nm.parentNode.removeChild(nm); } else { b.textContent = s.getAttribute('data-label') || String(i + 1); }
      var tw = doc.createTreeWalker(b, NodeFilter.SHOW_TEXT, null), tx = [], tn; while ((tn = tw.nextNode())) { if (tn.nodeValue.trim()) { tx.push(tn.nodeValue.trim()); } }
      s.setAttribute('data-label', s.getAttribute('data-label') || tx.join(' '));
      b.setAttribute('aria-pressed', 'false');
      var t = el('span', 'saa-d-tick'); t.style.transform = 'rotate(' + A[i] + 'deg)'; ring.appendChild(t); ticks.push(t);
      ctl.appendChild(b); chat.appendChild(s);
      var you = $('.saa-d-you', s), ans = $('.saa-d-ans', s);
      if (you) { you.setAttribute('data-who', k.getAttribute('data-you') || 'You'); }
      if (ans) { ans.setAttribute('data-who', k.getAttribute('data-ai') || 'AI tool'); }
      return b;
    });
    ctl.insertBefore(knob, ctl.firstChild);   /* first in tab order: the slider, then the labels */
    var track = first ? stops.map(function (s, i) { return s === first ? -1 : i; }).filter(function (i) { return i >= 0; }) : stops.map(function (s, i) { return i; });
    function count() {
      var c = track.filter(function (i) { return seen[i]; }).length;
      st.textContent = c + ' of ' + track.length + ' tried';
      if (c === track.length) { done(k); }
    }
    function turnTo(a) { rot = rot + ((((a - rot) % 360) + 540) % 360 - 180); face.style.transform = 'rotate(' + rot + 'deg)'; }
    function show(i) {   /* the chat swaps to position i (also while dragging) */
      stops.forEach(function (s, j) { s.classList.toggle('is-on', j === i); if (j === i) { s.removeAttribute('aria-hidden'); } else { s.setAttribute('aria-hidden', 'true'); } });
      btns.forEach(function (b, j) { b.classList.toggle('is-on', j === i); b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      ticks.forEach(function (t, j) { t.classList.toggle('is-on', j === i); });
      knob.setAttribute('aria-valuenow', String(i + 1)); knob.setAttribute('aria-valuetext', stops[i].getAttribute('data-label'));
    }
    function set(i, quiet) {   /* settle on position i: count the try, show its caption */
      i = Math.max(0, Math.min(n - 1, i)); show(i); turnTo(A[i]);
      if (i !== cur || quiet) { say(k, stops[i].getAttribute('data-why') || '', null); }
      cur = i;
      if (!quiet) { seen[i] = true; btns[i].classList.add('is-seen'); }
      count();
    }
    function nearest(a) { var best = 0, bd = 999; A.forEach(function (x, i) { var d = Math.abs((((a - x) % 360) + 540) % 360 - 180); if (d < bd) { bd = d; best = i; } }); return best; }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { set(i); }); });
    knob.addEventListener('keydown', function (e) {
      var i = cur, K = e.key;
      if (K === 'ArrowRight' || K === 'ArrowUp' || K === 'PageUp') { i = cur + 1; } else if (K === 'ArrowLeft' || K === 'ArrowDown' || K === 'PageDown') { i = cur - 1; }
      else if (K === 'Home') { i = 0; } else if (K === 'End') { i = n - 1; } else if (K === 'Enter' || K === ' ') { i = (cur + 1) % n; } else { return; }
      e.preventDefault(); set(i);
    });
    /* drag: the knob turns with the pointer and snaps to the nearest position; a tap moves on one position */
    knob.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      var r = knob.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, sx = e.clientX, sy = e.clientY, moved = false, at = cur;
      try { knob.setPointerCapture(e.pointerId); } catch (x) {}
      function ang(ev) { return Math.atan2(ev.clientX - cx, cy - ev.clientY) * 180 / Math.PI; }
      function mv(ev) {
        if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 6) { return; }
        if (!moved) { moved = true; k.classList.add('is-turning'); }
        var a = ang(ev); turnTo(a); var i = nearest(a); if (i !== at) { at = i; show(i); }
        ev.preventDefault();
      }
      function end(ev, cancel) {
        knob.removeEventListener('pointermove', mv); knob.removeEventListener('pointerup', up); knob.removeEventListener('pointercancel', cn); knob.removeEventListener('lostpointercapture', cn);
        k.classList.remove('is-turning');
        if (!moved) { if (!cancel) { set((cur + 1) % n); } return; }
        set(cancel ? cur : at);
      }
      function up(ev) { end(ev, false); } function cn() { end(null, true); }
      knob.addEventListener('pointermove', mv); knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', cn); knob.addEventListener('lostpointercapture', cn);
    });
    if (reduce) { k.classList.add('saa-d-still'); }
    if (first) { btns[stops.indexOf(first)].classList.add('is-start'); }
    set(first ? stops.indexOf(first) : 0, !!first);
  }

  var KITS = { reveal: reveal, quick: quick, sort: sort, order: order, spot: spot, stamp: stamp, match: match, dial: dial };
  function init(root) {
    $$('.saa-kit[data-kit]', root).forEach(function (k) {
      if (k.getAttribute('data-ready')) { return; }
      var f = KITS[k.getAttribute('data-kit')]; if (!f) { return; }
      k.setAttribute('data-ready', '1');
      try { f(k); } catch (e) { if (win.console) { console.error('saa-kit', e); } }
    });
  }

  /* ---------- lock Next while the visible screen has an unfinished required kit ---------- */
  var NAV = '#primary, #deck-next, #navNext, #nav-next, #nextBtn, #next, .btn-next, .nav-btn.primary, .nav-circle.primary, footer .btn-primary, .foot .btn-primary';
  function vis(e) {
    if (!e || e.offsetParent === null) { return false; }
    /* slides that are hidden by opacity / visibility / aria-hidden (Deck games) do not count */
    for (var n = e; n && n !== doc.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.opacity === '0' || n.getAttribute('aria-hidden') === 'true') { return false; }
    }
    return true;
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(NAV); if (!b) { return; }
    var open = $$('.saa-kit[data-required]:not(.is-done)').filter(vis)[0];
    if (!open) { return; }
    e.preventDefault(); e.stopImmediatePropagation();
    shake(open);
    $$('.saa-card:not(.open), .saa-k-opt:not(:disabled), .saa-pool .saa-chip, .saa-steps > li, .saa-s, .saa-row:not(.done), .saa-m-item:not(:disabled), .saa-d-pos:not(.is-seen):not(.is-start)', open).slice(0, 8).forEach(function (x) { x.classList.add('saa-nudge'); });
    setTimeout(function () { $$('.saa-nudge', open).forEach(function (x) { x.classList.remove('saa-nudge'); }); }, 2600);
  }, true);
  doc.addEventListener('saa:done', function () { $$('.saa-nudge').forEach(function (x) { x.classList.remove('saa-nudge'); }); paintLock(); });
  /* a locked Next looks locked (dimmed, aria-disabled) but can still be pressed, so the activity can show what is left */
  function paintLock() {
    /* kits that are not done, or anything a game marks with data-saa-locked (its own input gates) */
    var open = $$('.saa-kit[data-required]:not(.is-done), [data-saa-locked]').filter(vis).length > 0;
    $$(NAV).forEach(function (b) {
      var on = open && vis(b);
      if (b.classList.contains('saa-locked') !== on) { b.classList.toggle('saa-locked', on); if (on) { b.setAttribute('aria-disabled', 'true'); } else if (!b.disabled) { b.removeAttribute('aria-disabled'); } }
    });
  }
  setInterval(paintLock, 400);

  win.SAAKit = { init: init };
  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', function () { init(); }); } else { init(); }
  var mt = 0;
  if (win.MutationObserver) { new MutationObserver(function () { clearTimeout(mt); mt = setTimeout(function () { init(); }, 60); }).observe(doc.documentElement, { childList: true, subtree: true }); }
})(window, document);
