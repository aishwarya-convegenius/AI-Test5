/* Swift AI Academy - activity frame upgrade layer (families B/C and one-offs). Loaded AFTER script.js. */
(function (win, doc) {
  'use strict';
  var root = doc.documentElement;

  /* 1. proportional scale: designed for ~980x640, grows with the window up to 1.7x, never below 1x.
        It then backs off in small steps until the current page fits, and re-checks on every page change. */
  var Z = 1, fitT = 0;
  function setZ(z) { Z = z; root.style.setProperty('--z', z.toFixed(3)); }
  function activePage() {
    var all = doc.querySelectorAll('section.page, section.slide, .step');
    for (var i = 0; i < all.length; i++) { if (all[i].offsetParent !== null) { return all[i]; } }
    return null;
  }
  function overflows() {
    var els = [activePage(), doc.querySelector('.stage'), doc.querySelector('.app')];
    return els.some(function (e) { return e && e.scrollHeight - e.clientHeight > 2; });
  }
  function fit() {
    var w = win.innerWidth, h = win.innerHeight;
    var z = w <= 700 ? 1 : Math.max(1, Math.min(w / 980, h / 640, 1.7));
    setZ(z);
    var guard = 0;
    while (z > 1 && overflows() && guard++ < 30) { z = Math.max(1, z - 0.04); setZ(z); }
  }
  /* 1a. phones: the screen height is fixed, so the area between header and footer scrolls
         (the header and the Back / Next footer stay in place, like an app) */
  function cl(e, c, on) { if (e.classList.contains(c) !== on) { e.classList.toggle(c, on); } }
  function phoneScroll() {
    var app = doc.querySelector('.app'), pg = activePage(), on = win.innerWidth <= 700;
    var zone = null, path = [];
    if (on && app && pg && app.contains(pg)) {
      zone = pg;
      while (zone.parentElement && zone.parentElement !== app) { path.push(zone); zone = zone.parentElement; }
      if (zone.parentElement !== app) { zone = null; path = []; }
    }
    Array.prototype.forEach.call(doc.querySelectorAll('.saa-scrollzone'), function (e) { if (e !== zone) { cl(e, 'saa-scrollzone', false); } });
    Array.prototype.forEach.call(doc.querySelectorAll('.saa-scrollpath'), function (e) { if (path.indexOf(e) < 0) { cl(e, 'saa-scrollpath', false); } });
    if (zone) { cl(zone, 'saa-scrollzone', true); path.forEach(function (e) { cl(e, 'saa-scrollpath', true); }); }
    if (app) { cl(app, 'saa-phone', !!zone); }
  }
  function soon() { clearTimeout(fitT); fitT = setTimeout(function () { fit(); phoneScroll(); }, 60); }
  fit();
  win.addEventListener('resize', soon);
  if (win.MutationObserver) {
    new MutationObserver(soon).observe(doc.body, { attributes: true, attributeFilter: ['class', 'hidden'], subtree: true, childList: true });
  }
  if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(fit); }

  /* 1b. left / right: heading and intro on the LEFT, the activity on the RIGHT */
  var LEADTAG = /^(P|H1|H2|H3|H4|HEADER|SMALL|SPAN)$/;
  var LEADCLS = /(^|\s)(kicker|eyebrow|saa-eyebrow|lede|title|sub|subtitle|meta|head|intro|tagline|code|page-title|page-sub)(\s|$)/;
  var BLOCKCLS = /(panel|grid|card|callout|list|chip|frame|chat|tile|row|box|strip|stepper|tabs|track)/;
  function kids(e) { return Array.prototype.filter.call(e.children, function (k) { return !/^(SCRIPT|STYLE|TEMPLATE)$/.test(k.tagName); }); }
  function interactive(e) { return e.matches('button, a[href], input, select, textarea') || !!e.querySelector('button, a[href], input, select, textarea, [role=button]'); }
  function leadish(e) {
    if (interactive(e)) { return false; }
    var c = (e.className && e.className.baseVal === undefined) ? e.className : '';
    if (BLOCKCLS.test(c) && !LEADCLS.test(c)) { return false; }
    return LEADTAG.test(e.tagName) || LEADCLS.test(c) || (e.tagName === 'DIV' && /head/.test(c));
  }
  function hasHeading(e) { return e.matches('h1, h2, h3, .title') || !!e.querySelector('h1, h2, h3, .title'); }
  function splitPage(pg) {
    if (!pg || pg.getAttribute('data-saa-split')) { return; }
    pg.setAttribute('data-saa-split', 'no');
    var c = pg;
    for (var d = 0; d < 3; d++) {
      var k1 = kids(c);
      if (k1.length === 1 && k1[0].tagName === 'DIV' && !/(frame|chat|phone)/.test(k1[0].className)) { c = k1[0]; } else { break; }
    }
    var ks = kids(c);
    if (ks.length < 2) { return; }
    /* never turn the page element itself into a grid (that would override the game's show/hide) */
    if (c === pg) {
      var inner = doc.createElement('div');
      inner.className = 'saa-inner';
      pg.insertBefore(inner, ks[0]);
      ks.forEach(function (e) { inner.appendChild(e); });
      c = inner;
    }
    var lead = [];
    for (var i = 0; i < ks.length && leadish(ks[i]); i++) { lead.push(ks[i]); }
    if (!lead.length || lead.length === ks.length || !lead.some(hasHeading)) { return; }
    var leadText = lead.map(function (e) { return e.textContent; }).join(' ').length;
    if (leadText > 700) { return; }
    var L = doc.createElement('div'), W = doc.createElement('div');
    L.className = 'saa-lead'; W.className = 'saa-work';
    c.insertBefore(L, lead[0]);
    lead.forEach(function (e) { L.appendChild(e); });
    ks.slice(lead.length).forEach(function (e) { W.appendChild(e); });
    c.appendChild(W);
    c.classList.add('saa-split');
    pg.setAttribute('data-saa-split', 'yes');
    /* anything the game adds to this container later goes to the right-hand side */
    if (win.MutationObserver) {
      new MutationObserver(function (ms) {
        ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && n !== L && n !== W && n.parentNode === c) { W.appendChild(n); } }); });
      }).observe(c, { childList: true });
    }
  }
  function splitAll() { Array.prototype.forEach.call(doc.querySelectorAll('section.page, section.slide'), splitPage); }
  splitAll();
  phoneScroll();
  fit();

  /* 2. idle nudge: after 5 s with no activity glow the primary action, or the unanswered options */
  var idleT = 0;
  function visible(e) { return e && e.offsetParent !== null; }
  function targets() {
    var page = doc.querySelector('.page.active, .slide.active, .slide.show, section.active') || doc.body;
    var prim = doc.querySelector('.nav-btn.primary, .btn-primary, button.primary, #primary, .cta');
    var locked = prim && (prim.disabled || prim.getAttribute('aria-disabled') === 'true' || prim.classList.contains('saa-locked'));
    if (prim && !locked && visible(prim)) { return [prim]; }   /* never glow a locked Next */
    var opts = Array.prototype.slice.call(page.querySelectorAll('.opt:not(.picked):not(.locked):not([disabled]), .choice:not(.picked), textarea, input[type=text]'));
    return opts.filter(function (e) { return visible(e) && !e.value; }).slice(0, 8);
  }
  function clearNudge() { Array.prototype.forEach.call(doc.querySelectorAll('.saa-nudge'), function (e) { e.classList.remove('saa-nudge'); }); }
  function arm() { clearTimeout(idleT); clearNudge(); idleT = setTimeout(function () { targets().forEach(function (e) { e.classList.add('saa-nudge'); }); }, 5000); }
  ['pointerdown', 'keydown', 'input', 'touchstart', 'wheel', 'click'].forEach(function (ev) { doc.addEventListener(ev, arm, true); });
  arm();
})(window, document);

/* ==========================================================================
   COMMON (all games): start screen, "Your task" line, one-amber guard
   ========================================================================== */
(function (win, doc) {
  'use strict';
  function txt(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function visible(e) { return !!(e && e.offsetParent !== null && e.getBoundingClientRect().width > 2); }
  function amber(e) { var cs = getComputedStyle(e); return /243, 171, 49|255, 193, 104|251, 176, 52/.test(cs.backgroundImage + ' ' + cs.backgroundColor); }
  function pages() { return win.Deck ? win.Deck.slides : Array.prototype.slice.call(doc.querySelectorAll('section.page, section.slide, .step')); }
  function current() {
    if (win.Deck) { return win.Deck.current(); }
    return pages().filter(visible)[0] || doc.querySelector('.app');
  }
  var NAV = '#primary, #deck-next, #navNext, #nav-next, #nextBtn, .btn-next, .nav-btn.primary, .nav-circle.primary, footer .btn-primary, .foot .btn-primary, .slide-footer .primary, .nav .primary';
  function isNav(b) { return b.matches(NAV); }

  /* ---- 1. start screen ---- */
  function buildStart() {
    if (doc.getElementById('start') || doc.getElementById('saa-start')) { return; }
    var cover = pages()[0] || doc.querySelector('.app');
    if (!cover) { return; }
    var h = cover.querySelector('h1, h2, .title');
    var title = txt(h) || (doc.title || '').split(/\s[—·|-]\s/)[0].trim();
    if (!title) { return; }
    var ebEl = cover.querySelector('.kicker, .eyebrow, .saa-eyebrow, .q-kicker');
    var eb = txt(ebEl).replace(/\s*·\s*/g, ' · ');
    var tag = '';
    var ps = cover.querySelectorAll('.lede, .sub, p');
    for (var i = 0; i < ps.length; i++) { var t = txt(ps[i]); if (t.length > 20 && t !== title && t !== eb && !/^AAI-|^PC |Swift AI Academy$/.test(t)) { tag = t; break; } }
    if (tag.length > 170) { tag = tag.slice(0, 167).replace(/\s+\S*$/, '') + '…'; }
    var logo = doc.querySelector('.brand img, img[src*="logo"], .brand-mark');
    var o = doc.createElement('div');
    o.className = 'saa-start'; o.id = 'saa-start';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'saa-start-title');
    o.innerHTML = '<div class="saa-in"><div class="saa-brand"></div>' +
      '<div class="saa-mid">' + (eb ? '<span class="saa-eb"></span>' : '') + '<h1 id="saa-start-title"></h1>' + (tag ? '<p class="saa-tag"></p>' : '') +
      '<button type="button" class="saa-go">Start <svg viewBox="0 0 24 24" fill="none" stroke="#241300" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div></div>';
    var brand = o.querySelector('.saa-brand');
    if (logo) { var l = logo.cloneNode(true); l.removeAttribute('id'); brand.appendChild(l); }
    var bs = doc.createElement('span'); bs.textContent = 'SWIFT AI ACADEMY'; brand.appendChild(bs);
    if (eb) { o.querySelector('.saa-eb').textContent = eb; }
    o.querySelector('h1').textContent = title;
    if (tag) { o.querySelector('.saa-tag').textContent = tag; }
    doc.body.appendChild(o);
    var app = doc.querySelector('.app, #app, .wrap');
    if (app) { app.setAttribute('inert', ''); }
    var go = o.querySelector('.saa-go');
    setTimeout(function () { try { go.focus(); } catch (e) {} }, 50);
    go.addEventListener('click', function () {
      if (app) { app.removeAttribute('inert'); }
      o.classList.add('gone');
      setTimeout(function () { o.style.display = 'none'; }, 550);
      /* skip the cover it replaces: plain cover -> press Next; cover with a single start button -> press it;
         a cover with other choices or links stays so nothing is lost */
      var first = pages()[0];
      if (first && !visible(first)) { return; }                 /* already past the cover */
      /* a first screen with real content (lists, a template, an activity, a long text) is not a cover: show it */
      if (first && (first.querySelector('ul, ol, table, .saa-kit, textarea, input') || (first.innerText || '').replace(/\s+/g, ' ').length > 320)) { return; }
      var scope = first || doc.querySelector('.app') || doc.body;
      var inCover = Array.prototype.filter.call(scope.querySelectorAll('button, a[href], input, select, textarea, [data-go], [role=button]'), function (e) {
        return visible(e) && !e.matches(NAV) && !e.closest('header, .top, .topbar, .saa-top, .foot, footer, .nav, .deck-nav, .slide-footer, .page-footer') && !/back|close|outline|help/i.test((e.id || '') + ' ' + (e.className || '') + ' ' + (e.getAttribute('aria-label') || ''));
      });
      var nav = Array.prototype.filter.call(doc.querySelectorAll(NAV), function (b) { return visible(b) && !b.disabled && !(first && first.contains(b)); })[0];
      if (!inCover.length && nav) { nav.click(); }
      else if (inCover.length === 1 && inCover[0].tagName === 'BUTTON' && amber(inCover[0])) { inCover[0].click(); }
    });
  }

  /* ---- 2. "Your task": style the screen's own instruction line ---- */
  var VERBS = /^(tap|choose|pick|select|fill|type|write|match|sort|drag|copy|paste|mark|find|click|rewrite|put|spot|compare|decide|tick|label|order|rate)\b/i;
  function taskLine(page) {
    if (!page || page.querySelector('.saa-do, .do')) { return; }
    var controls = page.querySelector('input, textarea, select, .opt, .chip, [role=button], button:not(.nav-btn):not(#primary):not(#back):not(.nav-circle)');
    if (!controls) { return; }
    var c = Array.prototype.filter.call(page.querySelectorAll('p, .sub, .lede, .hint, .instr, .instruction, .q-meta'), function (e) {
      var t = txt(e);
      return t.length > 8 && t.length <= 180 && VERBS.test(t) && !/[\[\]·]/.test(t) && e.querySelectorAll('div, p, ul, ol, button, input').length === 0 &&
        !e.matches('.kicker, .eyebrow, .saa-eyebrow, .title') &&
        !e.closest('.callout, .note, .privacy-strip, .never-panel, .stop-rule, .pause-line, button, label, .doc, .opt, .bubble, .msg, .chat, .saa-start, [class*=prompt], [class*=acc-], .accordion, details, blockquote, .example, .sample, .quote');
    });
    if (!c.length) { return; }
    var e = c[0];
    if (!e.classList.contains('saa-do')) { e.classList.add('saa-do'); }
    if (!/^your task/i.test(txt(e))) { var b = doc.createElement('b'); b.className = 'saa-do-label'; b.textContent = 'Your task.'; e.insertBefore(b, e.firstChild); e.insertBefore(doc.createTextNode(' '), b.nextSibling); }
  }

  /* ---- 3. one amber action per screen ---- */
  function amberGuard() {
    var btns = Array.prototype.filter.call(doc.querySelectorAll('button'), function (b) { return visible(b) && !b.closest('#saa-start'); });
    var inPage = btns.filter(function (b) { return !isNav(b) && !b.disabled && amber(b); });
    btns.filter(isNav).forEach(function (n) { if (n.classList.contains('saa-demote') !== inPage.length > 0) { n.classList.toggle('saa-demote', inPage.length > 0); } });
  }

  /* ---- 4. one progress indicator: read the game's own count, draw the standard bar ---- */
  var FOOTS = 'footer, .deck-foot, .nav-row, .foot, .slide-footer, .chat-footer';
  var SRC = '#deck-count, .deck-count, #pageNum, #pageCount, .page-count, #counter, .counter, .count, #stepCount, .step-count';
  var HOME = '.deck-progress, .footer-progress, .bar-mid, .page-meta, .foot-left, .progress-wrap';
  function progress() {
    var feet = doc.querySelectorAll(FOOTS);
    for (var i = 0; i < feet.length; i++) {
      var f = feet[i];
      var src = Array.prototype.filter.call(f.querySelectorAll(SRC), function (e) { return /(\d+)\s*(\/|of)\s*(\d+)/i.test(e.textContent); })[0];
      if (!src) { continue; }
      var m = src.textContent.match(/(\d+)\s*(?:\/|of)\s*(\d+)/i), n = +m[1], tot = +m[2];
      var pr = f.querySelector('.saa-prog');
      if (!pr) {
        pr = doc.createElement('div'); pr.className = 'saa-prog'; pr.setAttribute('aria-hidden', 'true');
        pr.innerHTML = '<span class="saa-prog-bar"><span class="saa-prog-fill"></span></span><span class="saa-prog-n"></span>';
        var home = f.querySelector(HOME);
        if (home) { home.appendChild(pr); } else { src.parentNode.insertBefore(pr, src); }
      }
      var lab = n + ' / ' + tot;
      var nEl = pr.querySelector('.saa-prog-n');
      if (nEl.textContent !== lab) { nEl.textContent = lab; }
      var w = tot ? Math.round(n / tot * 100) + '%' : '0%';
      var fill = pr.querySelector('.saa-prog-fill');
      if (fill.style.width !== w) { fill.style.width = w; }
    }
  }

  var t = 0;
  function refresh() { clearTimeout(t); t = setTimeout(function () { taskLine(current()); amberGuard(); progress(); }, 80); }
  function init() {
    buildStart();
    pages().forEach(taskLine);
    refresh();
    if (win.MutationObserver) { new MutationObserver(refresh).observe(doc.body, { attributes: true, attributeFilter: ['class', 'disabled', 'hidden'], subtree: true, childList: true }); }
    doc.addEventListener('click', refresh, true);
  }
  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); } else { init(); }
})(window, document);

/* ==========================================================================
   STAFF CODES: master-sheet codes are for the programmes team, never for learners.
   Any short line or tag that shows one (AAI-E-…, PC 4.1–4.5, Mapped PC, Schema, Element 4 …) is hidden.
   ========================================================================== */
(function (win, doc) {
  'use strict';
  var CODE = /AAI-E-MC\d|\bPC\s*\d+\.\d|Mapped:?\s*PC|Schema:|Non-compensatory|·\s*Element\s+\d|\bMC1\s*\/\s*\d/;
  var CODES = /AAI-E-MC\d[-A-Z0-9]*|\bPC:?\s*\d+\.\d+(\s*(–|-|to)\s*\d+\.\d+)?|Mapped:?\s*(PC:?)?|Schema:|Non-compensatory:?\s*(Yes|No)?|\bElement\s+\d\b|\bMC1\s*\/\s*\d+(\.\d+)?/g;
  var STAFF = /\b(English|Gujarati|Hindi|Mandatory( step)?|Not counted|Gates the unit|Swift AI Academy|Lab|Yes|No|and|to)\b/gi;
  function txt(e) { return (e.textContent || '').replace(/\s+/g, ' ').trim(); }
  function metaOnly(s) { return s.replace(CODES, '').replace(STAFF, '').replace(/[^A-Za-zऀ-૿]/g, '').length < 3; }
  function hide() {
    var w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null), t, marks = [], strip = [];
    while ((t = w.nextNode())) {
      if (!CODE.test(t.nodeValue)) { continue; }
      var e = t.parentElement;
      if (!e || e.closest('script, style, .saa-staff, [data-saa-keep]')) { continue; }
      if (!metaOnly(txt(e))) { strip.push(t); continue; }        /* a code inside a real sentence: take out just the code */
      var box = e;                                                 /* the whole line is codes and staff labels: hide it */
      while (box.parentElement && box.parentElement !== doc.body && metaOnly(txt(box.parentElement))) { box = box.parentElement; }
      marks.push(box);
    }
    marks.forEach(function (b) { b.classList.add('saa-staff'); });
    strip.forEach(function (n) {
      n.nodeValue = n.nodeValue.replace(CODES, '').replace(/(\s*·\s*){2,}/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').replace(/\(\s*\)/g, '');
    });
  }
  var t = 0;
  function soon() { clearTimeout(t); t = setTimeout(hide, 80); }
  function init() {
    hide();
    if (win.MutationObserver) { new MutationObserver(soon).observe(doc.body, { childList: true, subtree: true, characterData: true }); }
  }
  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); } else { init(); }
})(window, document);

/* ==========================================================================
   SKIN: make every dark game look like game 1 (header, card, type, footer)
   ========================================================================== */
(function (win, doc) {
  'use strict';
  function lum(c) { var m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < 0.2)) { return null; } return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255; }
  function isDark() {
    var els = [doc.querySelector('.app'), doc.body, doc.documentElement];
    for (var i = 0; i < els.length; i++) { if (!els[i]) { continue; } var l = lum(getComputedStyle(els[i]).backgroundColor); if (l !== null) { return l < 0.4; } }
    return true;   /* a background image (gradient) with no colour: the dark frame */
  }
  function txt(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function visible(e) { return !!(e && e.offsetParent !== null && e.getBoundingClientRect().width > 2); }
  var SECTIONS = { 1: 'First Contact', 2: 'Framing and Refining', 3: 'Check Before You Use' };
  function pages() { return win.Deck ? win.Deck.slides : Array.prototype.slice.call(doc.querySelectorAll('section.page, section.slide, .step')); }

  function header() {
    var h = doc.querySelector('.saa-header, header.top');
    if (!h || h.querySelector('.saa-hd-brand')) { return; }
    /* title = the game's own title (as on the start screen); eyebrow = the section name, like "FIRST CONTACT" */
    var startH = doc.getElementById('saa-start-title');
    var cover = pages()[0];
    var dt = (doc.title || '').replace(/\s*[—·|-]\s*Swift AI Academy\s*$/i, '').trim();
    var title = dt || txt(startH) || txt(cover && cover.querySelector('h1, h2, .title'));
    var meta = txt(doc.querySelector('.top-meta'));
    var eb = meta.indexOf('·') > -1 ? meta.split('·').pop().trim() : '';
    if (!eb) { var m = (doc.body.textContent.match(/AAI-E-MC1-S0(\d)/) || [])[1]; eb = SECTIONS[m] || ''; }
    var logo = h.querySelector('.saa-brand img, .brand .brand-mark, img[src*="logo"]');
    var brand = doc.createElement('div'); brand.className = 'saa-hd-brand';
    if (logo) { var l = logo.cloneNode(true); l.removeAttribute('id'); brand.appendChild(l); }
    brand.insertAdjacentHTML('beforeend', '<span class="saa-wm"><span class="n">Swift AI</span><span class="s">Academy</span></span>');
    var ttl = doc.createElement('div'); ttl.className = 'saa-hd-ttl';
    ttl.innerHTML = (eb ? '<p class="saa-hd-eb"></p>' : '') + '<p class="saa-hd-h"></p>';
    if (eb) { ttl.querySelector('.saa-hd-eb').textContent = eb; }
    ttl.querySelector('.saa-hd-h').textContent = title;
    h.insertBefore(ttl, h.firstChild); h.insertBefore(brand, ttl);
  }

  /* which page is current, read from the GAME's own markers (never from visibility, which our own CSS changes) */
  function currentPage(list) {
    var marks = ['active', 'show', 'is-active', 'current', 'on'];
    for (var i = 0; i < marks.length; i++) {
      var withMark = list.filter(function (p) { return p.classList.contains(marks[i]); });
      if (withMark.length) { return withMark[0]; }
    }
    var shown = list.filter(function (p) { return !p.hasAttribute('hidden') && getComputedStyle(p).display !== 'none'; });
    return shown.length === 1 ? shown[0] : (shown[0] || null);
  }
  function cl(e, c, on) { if (on === undefined) { on = true; } if (e.classList.contains(c) !== !!on) { e.classList.toggle(c, !!on); } }
  function surfaces() {
    var list = pages();
    var cur = win.Deck ? null : currentPage(list);
    /* persistent card around all pages (Reading S02, Request Builder) */
    Array.prototype.forEach.call(doc.querySelectorAll('.app > main.saa-card, .app > main.card'), function (m) { cl(m, 'saa-surface'); });
    list.forEach(function (p) {
      var isCur = p === cur;
      cl(p, 'saa-cur', isCur);
      if (p.closest('.saa-surface') && !p.classList.contains('saa-surface')) { return; }
      var c = Array.prototype.filter.call(p.children, function (k) { return k.classList.contains('card'); })[0];
      if (c) { cl(c, 'saa-surface'); return; }
      /* a page with no card of its own becomes the card - but only while it is the current page */
      var pageSurface = isCur && !p.querySelector('.chat, .phone-frame-outer, .chat-card') && !win.Deck;
      cl(p, 'saa-surface', pageSurface);
    });
  }

  function navButtons() {
    Array.prototype.forEach.call(doc.querySelectorAll('footer button, .deck-foot button, .nav-row button, .foot button, .slide-footer button'), function (b) {
      var t = (b.innerText || b.textContent || '').trim();
      if (!t || b.classList.contains('nav-circle')) { return; }
      cl(b, 'saa-navtxt');
      var back = /back|previous|prev/i.test(t + ' ' + b.id + ' ' + b.className.replace(/saa-\S+/g, '')) && !/primary/.test(b.className);
      cl(b, 'saa-back', back);
      /* the row that holds the nav buttons: Back left, Next right */
      var row = b.parentElement;
      while (row && getComputedStyle(row).display === 'contents') { row = row.parentElement; }
      if (row && !row.matches('footer.bar, .slide-footer')) { cl(row, 'saa-navrow'); }
    });
  }

  /* light / dark switch: only for games that declare both themes (<html data-saa-themes data-theme="dark">).
     The game's CSS styles html[data-theme="dark"] and html[data-theme="light"]; the choice is remembered. */
  var root = doc.documentElement, THEMED = root.hasAttribute('data-saa-themes');
  function store(v) { try { if (v) { localStorage.setItem('saa-theme', v); } return localStorage.getItem('saa-theme'); } catch (e) { return null; } }
  if (THEMED) { var pref = store(); if (pref === 'light' || pref === 'dark') { root.setAttribute('data-theme', pref); } }
  var ICON_SUN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  function themeButton() {
    var h = doc.querySelector('.saa-header') || doc.querySelector('header.top') || doc.querySelector('header, .topbar');
    if (!h || h.querySelector('.saa-theme-b')) { return; }
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'saa-vo-b icon saa-theme-b';
    function paint() {
      var dark = root.getAttribute('data-theme') !== 'light';
      b.innerHTML = dark ? ICON_SUN : ICON_MOON;
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.title = dark ? 'Light mode' : 'Dark mode';
    }
    b.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next); store(next);
      cl(root, 'saa-skin', next === 'dark'); paint();
      win.dispatchEvent(new CustomEvent('saa:theme', { detail: next }));
    });
    paint();
    var vo = h.querySelector('.saa-vo');
    if (vo) { vo.appendChild(b); } else { h.appendChild(b); }   /* narration builds its group later and takes the switch in */
  }

  /* a Back button whose label and icon were both hidden on phones gets its word back */
  function backLabels() {
    Array.prototype.forEach.call(doc.querySelectorAll('button.saa-back'), function (b) {
      var blank = b.offsetWidth > 0 && !(b.innerText || '').trim();
      cl(b, 'saa-back-blank', blank); if (blank && !b.getAttribute('aria-label')) { b.setAttribute('aria-label', 'Back'); }
    });
  }
  /* vertical centring that overflows would push the heading above the top, out of reach: centre only when it fits */
  function safeCentre() {
    /* walk up from every visible heading: any box that centres it vertically does so only while it fits */
    Array.prototype.forEach.call(doc.querySelectorAll('h1, h2, h3, .saa-lead, .saa-work'), function (h) {
      if (!h.offsetParent) { return; }
      for (var e = h.parentElement; e && e !== doc.body; e = e.parentElement) {
        var cs = getComputedStyle(e);
        if (/flex/.test(cs.display) && /column/.test(cs.flexDirection) && cs.justifyContent === 'center') { e.style.setProperty('justify-content', 'safe center', 'important'); }
        else if (/grid/.test(cs.display) && cs.alignContent === 'center') { e.style.setProperty('align-content', 'safe center', 'important'); }
        else if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection) && cs.alignItems === 'center' && e.scrollHeight > e.clientHeight + 2) { e.style.setProperty('align-items', 'safe center', 'important'); }
      }
    });
  }
  var t = 0;
  function apply() { clearTimeout(t); t = setTimeout(function () { backLabels(); safeCentre(); surfaces(); navButtons(); if (THEMED) { themeButton(); } }, 40); }
  function init() {
    if (THEMED) { themeButton(); }
    if (!THEMED && !isDark()) { return; }
    if (!THEMED || root.getAttribute('data-theme') !== 'light') { root.classList.add('saa-skin'); }
    header(); surfaces(); navButtons(); backLabels(); safeCentre();
    win.addEventListener('resize', function () { backLabels(); });
    if (win.MutationObserver) { new MutationObserver(apply).observe(doc.body, { attributes: true, attributeFilter: ['class', 'hidden'], subtree: true, childList: true }); }
  }
  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); }); } else { setTimeout(init, 0); }
})(window, document);
/* ==========================================================================
   NARRATION (all games, same as game 1): one Narakeet clip (voice Sheela) per
   screen for the left-column text, autoplay after Start, Pause / Replay and a
   sound on-off button in the header, word highlight, spoken kit feedback.
   Clips are named by a hash of the exact text they say (audio/vo/<key>.mp3),
   so a screen whose text changed simply stays silent until it is regenerated.
   Manifest: audio/vo/vo.js -> window.SAA_VO_CLIPS = { key: { segs: [[s,e],...] } }
   ========================================================================== */
(function (win, doc) {
  'use strict';
  if (doc.getElementById('narration')) { return; }               /* game 1 has its own player */

  /* ---- the text that is spoken: same walk for generation and for the highlight ---- */
  var SKIP = 'button, input, select, textarea, label, svg, code, script, style, .saa-kit, .saa-work, [aria-hidden="true"], ' +
    '.kicker, .eyebrow, .saa-eyebrow, .q-kicker, .hero-kicker, .tag, .chip, .pill, .badge, .sr-only, .visually-hidden, ' +
    'nav, .app > header, body > header, header.top, header.saa-header, .saa-header, footer, .saa-prog, .saa-vo-skip, .topbar, .schema, .code, .mono, .pc-meta, .meta, .meta-foot, .card-meta, .topbar-sub, ' +
    '[class*="badge"], [class*="mandatory"], [class*="flag"], .saa-start, ' +
    /* live status lines and chats change while you play: they are not narration */
    '[aria-live], [role="status"], [role="log"], .chat, .chat-card, .phone-frame-outer, .result-placeholder';
  /* module codes and mapping lines are for staff, never read aloud */
  var META = /\bAAI-E-|Schema:|Mapped PC|Non-compensatory|\bPC \d\.\d|Mandatory\s*·|^\s*Swift AI Academy\.?\s*$/;
  /* games that build their screens in script (chats, one-stage labs) mark them:
     data-saa-page = a screen, data-saa-lead = the text to read on it, data-saa-say = chat lines that ARE read */
  var CTRL = 'button, input, select, textarea, svg, [aria-hidden="true"], .sr-only, .visually-hidden';
  function pages() {
    var marked = doc.querySelectorAll('[data-saa-page]');
    if (marked.length) { return Array.prototype.slice.call(marked); }
    return win.Deck ? win.Deck.slides : Array.prototype.slice.call(doc.querySelectorAll('section.page, section.slide, .step'));
  }
  function shown(e) { return !!(e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'); }
  function current() {
    if (win.Deck && !doc.querySelector('[data-saa-page]')) { return win.Deck.current(); }
    return pages().filter(function (p) { return shown(p) && p.getBoundingClientRect().width > 2; })[0] || null;
  }
  function leadOf(page) {
    if (!page) { return null; }
    var l = page.querySelector('[data-saa-lead]') || page.querySelector('.saa-lead') || (win.Deck && page.querySelector('.head'));
    if (l && shown(l)) { return l; }
    /* a screen with no split (cover, wrap-up): read the whole screen; activities and labels are skipped */
    return page;
  }
  /* the sentence a word belongs to = its nearest box on screen (a label pill and its value are two sentences) */
  function blockOf(el, root) {
    for (var e = el; e && e !== root; e = e.parentElement) {
      var d = getComputedStyle(e).display;
      if (d !== 'inline' && d !== 'contents') { return e; }
      var p = e.parentElement;
      if (p && /flex|grid/.test(getComputedStyle(p).display)) { return e; }
    }
    return root;
  }
  var RCTRL = CTRL + ', summary, .saa-vo-skip, .saa-k-status, .saa-k-why, [aria-live], [role="status"]';
  function nodes(root, reveal) {
    var out = [], w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), t;
    while ((t = w.nextNode())) {
      var par = t.parentElement;
      if (reveal) {
        var rc = par && par.closest(RCTRL);   /* controls INSIDE the opened part only: the card itself is often a button */
        if (!t.nodeValue.trim() || !par || (rc && rc !== root && root.contains(rc))) { continue; }
        out.push({ node: t, block: blockOf(par, root) }); continue;
      }
      var say = par && par.closest('[data-saa-say]');
      var skip = say && root.contains(say) ? par.closest(CTRL) : par && par.closest(SKIP);
      if (!t.nodeValue.trim() || !par || skip || !shown(par)) { continue; }
      var blk = blockOf(par, root);
      if (blk && META.test(blk.textContent)) { continue; }
      out.push({ node: t, block: blk });
    }
    return out;
  }
  /* words: [{node, start, end, block}] */
  function words(root, reveal) {
    var ws = [];
    nodes(root, reveal).forEach(function (o) {
      var re = /\S+/g, m, v = o.node.nodeValue;
      while ((m = re.exec(v))) { ws.push({ node: o.node, start: m.index, end: m.index + m[0].length, block: o.block, text: m[0] }); }
    });
    /* a full stop or comma left on its own (after a highlighted or linked phrase) belongs to the word before it */
    ws.forEach(function (x, k) {
      var p = ws[k - 1];
      if (p && p.block === x.block && /^[.?!,;:]+["”’)]?$/.test(x.text) && /[\wÀ-￿]/.test(p.text)) { p.text += x.text; }
    });
    /* a "·" or "|" separator is not a word */
    return ws.filter(function (x) { return /[\wÀ-￿]/.test(x.text) && !/^[·|•–—\-]+$/.test(x.text); });
  }
  function textOf(ws) {
    var parts = [], cur = [];
    ws.forEach(function (x, k) {
      cur.push(x.text);
      var last = k === ws.length - 1 || ws[k + 1].block !== x.block;
      if (last) {
        var s = cur.join(' ').replace(/\s+/g, ' ').trim();
        if (s) { s = s.replace(/[:;,]$/, ''); if (!/[.?!]["”’)]?$/.test(s)) { s += '.'; } parts.push(s); }
        cur = [];
      }
    });
    return parts.join(' ');
  }
  /* FNV-1a over UTF-16 code units - tools/vo/hash.py does the same */
  function key(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'v' + ('0000000' + h.toString(16)).slice(-8);
  }
  function screenInfo(page) {
    var root = leadOf(page); if (!root) { return null; }
    var ws = words(root); if (!ws.length) { return null; }
    var t = textOf(ws);
    return { root: root, words: ws, text: t, key: key(t) };
  }
  var FB = '.saa-k-why';
  /* what is read when a learner opens something: a kit card's back, an expandable section, or any panel a game marks */
  var REVEAL = '.saa-card .saa-back, details, [data-saa-say-open], [aria-expanded]:not(.saa-card):not([role="tab"]):not([aria-controls]) + *';
  function panelOf(btn) {                                       /* an accordion: the panel the button opens */
    var id = btn.getAttribute('aria-controls');
    return id ? doc.getElementById(id) : btn.nextElementSibling;
  }
  function revealText(el) {
    var ws = words(el, true); if (!ws.length) { return ''; }
    var t = textOf(ws); return t.length > 700 ? '' : t;          /* long tables and records are read by the learner, not aloud */
  }
  function fbTexts() {   /* every fixed kit message on every screen, for generation */
    var out = {};
    if (!doc.querySelector('.saa-kit, ' + REVEAL)) { return out; }
    function add(s) { s = (s || '').replace(/\s+/g, ' ').trim(); if (s.length > 2) { out[key(s)] = s; } }
    Array.prototype.forEach.call(doc.querySelectorAll('.saa-kit [data-why], .saa-kit [data-hint], .saa-kit[data-done-text], .saa-kit [data-right], .saa-kit [data-wrong]'), function (e) {
      ['data-why', 'data-hint', 'data-done-text', 'data-right', 'data-wrong'].forEach(function (a) { add(e.getAttribute(a)); });
    });
    Array.prototype.forEach.call(doc.querySelectorAll(REVEAL), function (e) { var t = revealText(e); if (t) { out[key(t)] = t; } });
    Array.prototype.forEach.call(doc.querySelectorAll('[aria-expanded][aria-controls]:not(.saa-card)'), function (b) { var pn = panelOf(b), t = pn && revealText(pn); if (t) { out[key(t)] = t; } });
    ['Yes, that is right.', 'Not quite. Try again.', 'All sorted. Well done.', 'Not that one. Read it again and try the other box.',
      'Yes. That is the right order.', 'Not yet. The red steps are in the wrong place.', 'All stamped. Well done.', 'Not quite. Read it again.', 'Yes.'].forEach(add);
    return out;
  }
  var seen = {};
  var reveals = {};
  win.SAA_VO = { pages: pages, current: current, info: screenInfo, key: key, fbTexts: fbTexts, seen: seen, reveals: reveals, revealText: revealText,
    playing: function () { return !!((audio && !audio.paused && !audio.ended) || (fb && !fb.paused && !fb.ended)); } };

  /* ---- player ---- */
  var CLIPS = null, audio = new Audio(), fb = new Audio(), started = false, auto = true, cur = null, timeline = null, raf = 0, lastWord = -2;
  audio.preload = 'auto';
  var HL = win.CSS && CSS.highlights && win.Highlight;
  var hiOn = HL ? new Highlight() : null, hiTodo = HL ? new Highlight() : null;
  if (HL) { CSS.highlights.set('saa-vo-on', hiOn); CSS.highlights.set('saa-vo-todo', hiTodo); }

  var ICON_PLAY = '<svg class="i-play" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg class="i-pause" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var ICON_ON = '<svg class="i-on" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  var ICON_OFF = '<svg class="i-off" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  var box, listen, voice;
  function controls() {
    if (box) { return; }
    var head = doc.querySelector('.saa-header') || doc.querySelector('header.top') || doc.querySelector('header, .topbar');
    if (!head) { return; }
    box = doc.createElement('div'); box.className = 'saa-vo';
    box.innerHTML = '<button type="button" class="saa-vo-b saa-vo-listen" aria-label="Play narration">' + ICON_PLAY + ICON_PAUSE + '<span>Replay</span></button>' +
      '<button type="button" class="saa-vo-b icon saa-vo-voice" aria-pressed="true" aria-label="Auto-narration on. Tap to turn off">' + ICON_ON + ICON_OFF + '</button>';
    listen = box.firstChild; voice = box.lastChild;
    var right = head.querySelector('.saa-header-actions, .topbar-tools, .top-actions, .header-actions, .actions');
    var th = head.querySelector('.saa-theme-b');   /* the light/dark switch joins the narration group, same spacing */
    if (th && th.parentNode) { th.parentNode.insertBefore(box, th); box.appendChild(th); }
    else if (right && right.parentNode === head) { head.insertBefore(box, right); } else { head.appendChild(box); }
    listen.addEventListener('click', function () {
      started = true; stopFb();
      if (!cur || !cur.clip) { return; }
      if (audio.paused) { if (audio.ended) { audio.currentTime = 0; } play(); } else { audio.pause(); }
    });
    voice.addEventListener('click', function () {
      auto = !auto;
      voice.setAttribute('aria-pressed', auto ? 'true' : 'false');
      voice.setAttribute('aria-label', auto ? 'Auto-narration on. Tap to turn off' : 'Auto-narration off. Tap to turn on');
      if (!auto) { audio.pause(); stopFb(); }
    });
  }
  function label(t) { if (listen) { listen.querySelector('span').textContent = t; } }
  audio.addEventListener('play', function () { if (listen) { listen.classList.add('playing'); listen.setAttribute('aria-label', 'Pause narration'); } label('Pause'); });
  audio.addEventListener('pause', function () { if (listen) { listen.classList.remove('playing'); listen.setAttribute('aria-label', 'Play narration'); } label(audio.ended || audio.currentTime < 0.05 ? 'Replay' : 'Resume'); cancelAnimationFrame(raf); });
  audio.addEventListener('ended', function () { label('Replay'); clearHi(); try { win.dispatchEvent(new CustomEvent('saa:vo-ended', { detail: cur && cur.key })); } catch (e) {} });
  audio.addEventListener('playing', function () { startHi(); });
  function play() { var p = audio.play(); if (p && p.catch) { p.catch(function () { label('Replay'); }); } }

  /* ---- highlight (CSS Custom Highlight API: no DOM changes) ---- */
  function range(w) { var r = doc.createRange(); try { r.setStart(w.node, w.start); r.setEnd(w.node, w.end); } catch (e) { return null; } return r; }
  function clearHi() { cancelAnimationFrame(raf); lastWord = -2; if (HL) { hiOn.clear(); hiTodo.clear(); } }
  function buildTimeline(ws, segs, dur) {
    var wt = ws.map(function (o) { return o.text.replace(/[^\w’']/g, '').length + 1 + (/[,;]$/.test(o.text) ? 2 : 0); });
    var groups = [], g = [];
    ws.forEach(function (o, k) {
      g.push(k);
      var last = k === ws.length - 1 || ws[k + 1].block !== o.block;
      if (/[.?!]["”’)]?$/.test(o.text) || last) { groups.push(g); g = []; }
    });
    if (!segs || segs.length !== groups.length) {
      var tot = 0; wt.forEach(function (x) { tot += x; });
      var span = Math.max(0.5, dur - 0.4), acc = 0;
      segs = groups.map(function (gr) { var mine = 0; gr.forEach(function (k) { mine += wt[k]; }); var s = [0.15 + span * acc / tot, 0.15 + span * (acc + mine) / tot]; acc += mine; return s; });
    }
    var starts = new Array(ws.length);
    groups.forEach(function (gr, gi) {
      var seg = segs[gi], total = 0, a = 0;
      gr.forEach(function (k) { total += wt[k]; });
      gr.forEach(function (k) { starts[k] = seg[0] + (seg[1] - seg[0]) * a / total; a += wt[k]; });
    });
    return starts;
  }
  function tick() {
    if (!timeline || audio.paused || !cur) { return; }
    var t = audio.currentTime, c = -1;
    for (var k = 0; k < timeline.length; k++) { if (timeline[k] <= t) { c = k; } else { break; } }
    if (c !== lastWord) {
      lastWord = c;
      hiOn.clear(); hiTodo.clear();
      cur.words.forEach(function (w, k) { if (k >= c) { var r = range(w); if (r) { (k === c ? hiOn : hiTodo).add(r); } } });
    }
    raf = requestAnimationFrame(tick);
  }
  function startHi() {
    if (!HL || !cur || !cur.clip || !isFinite(audio.duration)) { return; }
    timeline = buildTimeline(cur.words, cur.clip.segs, audio.duration);
    lastWord = -2; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }

  /* ---- spoken feedback for the kits ---- */
  function stopFb() { fb.pause(); }
  function feedback(el) {
    var s = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!s || !started || !auto || !CLIPS) { return; }
    if (Date.now() - revealAt < 600) { return; }               /* the card's own text is being read */
    var k = key(s); if (!CLIPS[k]) { return; }
    audio.pause(); clearHi(); fb.pause(); fb.src = 'audio/vo/' + k + '.mp3';
    var p = fb.play(); if (p && p.catch) { p.catch(function () {}); }
  }

  var lastTap = 0, revealAt = 0;
  function sayOpened(el) {
    if (Date.now() - lastTap > 1500) { return; }                 /* only what the learner opened, not what a game shows by itself */
    var s = revealText(el); if (!s) { return; }
    var k = key(s); reveals[k] = s;
    if (!started || !auto || !CLIPS || !CLIPS[k]) { return; }
    revealAt = Date.now(); audio.pause(); clearHi(); fb.pause(); fb.src = 'audio/vo/' + k + '.mp3';
    var p = fb.play(); if (p && p.catch) { p.catch(function () {}); }
  }
  function opened(m) {
    var e = m.target; if (e.nodeType !== 1) { return null; }
    var old = m.oldValue || '';
    if (m.attributeName === 'class' && e.classList.contains('saa-card') && e.classList.contains('open') && !/(^|\s)open(\s|$)/.test(old)) { return e.querySelector('.saa-back'); }
    if (m.attributeName === 'open' && e.tagName === 'DETAILS' && e.open) { return e; }
    if (m.attributeName === 'aria-expanded' && old === 'false' && e.getAttribute('aria-expanded') === 'true' && !e.classList.contains('saa-card') && e.getAttribute('role') !== 'tab') { return panelOf(e); }
    if (e.hasAttribute('data-saa-say-open') && shown(e) && (m.attributeName === 'hidden' ? old !== null : true) && !e.__saaShown) { return e; }
    return null;
  }

  /* ---- follow the game: a new screen (or new text on the same screen) loads its clip ---- */
  function sync() {
    var page = current(), info = page ? screenInfo(page) : null;
    if (info && cur && info.key === cur.key) {
      /* the same words, maybe redrawn by the game after a tap: keep reading, just follow the new text for the highlight */
      if (page !== cur.page || info.root !== cur.root) { cur.page = page; cur.root = info.root; cur.words = info.words; if (!audio.paused) { startHi(); } }
      return;
    }
    /* new screen or new question -> read it; same question with new state (answer checked, lane switched) -> wait for Replay.
       A screen the game redrew in place (the old one is gone from the page) is the same screen, not a new one. */
    var moved = cur && page !== cur.page && cur.page && doc.contains(cur.page);
    var fresh = !info || !cur || moved || first(info.text) !== first(cur.text);
    audio.pause(); clearHi(); if (fresh) { stopFb(); }
    if (!info) { cur = null; if (box) { box.classList.add('none'); } return; }
    info.page = page; info.clip = CLIPS && CLIPS[info.key] || null; cur = info;
    seen[info.key] = info.text;
    if (box) { box.classList.toggle('none', !info.clip); }
    label('Replay');
    if (!info.clip) { audio.removeAttribute('src'); return; }
    audio.src = 'audio/vo/' + info.key + '.mp3';
    if (started && auto && fresh) { play(); }
  }
  function first(t) { return (t || '').split(/(?<=[.?!])\s/).slice(0, 2).join(' '); }
  var t = 0;
  function later() { clearTimeout(t); t = setTimeout(sync, 160); }

  function init() {
    controls();
    if (doc.getElementById('saa-start') || doc.getElementById('start')) {
      doc.addEventListener('click', function (e) {
        if (!started && e.target.closest && e.target.closest('.saa-go, #startBtn, .start-btn')) { started = true; setTimeout(sync, 650); setTimeout(function () { if (cur && cur.clip && audio.paused && auto) { play(); } }, 700); }
      }, true);
    }
    /* any tap is a user gesture: from then on clips may autoplay */
    doc.addEventListener('pointerdown', function () { lastTap = Date.now(); if (!started && !doc.getElementById('saa-start')) { started = true; } }, true);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { lastTap = Date.now(); } }, true);
    if (win.MutationObserver) {
      new MutationObserver(function (ms) {
        for (var j = 0; j < ms.length; j++) {
          if (ms[j].type === 'attributes') { var o = opened(ms[j]); if (o) { sayOpened(o); break; } }
        }
        Array.prototype.forEach.call(doc.querySelectorAll('[data-saa-say-open]'), function (e) { e.__saaShown = shown(e); });
        for (var i = 0; i < ms.length; i++) {
          var tg = ms[i].target.nodeType === 1 ? ms[i].target : ms[i].target.parentElement;
          if (tg && tg.closest && tg.closest(FB) && ms[i].type !== 'attributes') { feedback(tg.closest(FB)); break; }
        }
        later();
      }).observe(doc.body, { attributes: true, attributeFilter: ['class', 'hidden', 'style', 'open', 'aria-expanded'], attributeOldValue: true, subtree: true, childList: true, characterData: true });
    }
    later();
  }
  function load() {
    var s = doc.createElement('script'); s.src = 'audio/vo/vo.js';
    s.onload = function () { CLIPS = win.SAA_VO_CLIPS || {}; cur = null; later(); };
    s.onerror = function () { CLIPS = {}; if (box) { box.classList.add('none'); } };
    doc.head.appendChild(s);
  }
  function boot() { load(); setTimeout(init, 60); }
  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})(window, document);

/* ==========================================================================
   SOUND EFFECTS (all games): a soft click on taps, a gentle rising chime for a
   right answer, a soft low fall for a wrong one. Made with Web Audio (no files).
   They follow the header sound button: when narration sound is off, effects are off.
   A right / wrong sound plays only when a game marks an answer within a moment of
   the learner's own tap, never on page load or when an answered screen is shown again.
   ========================================================================== */
(function (win, doc) {
  'use strict';
  if (win.SAA_SFX) { return; }
  var AC = win.AudioContext || win.webkitAudioContext;
  if (!AC) { return; }
  var ctx = null, master = null, lastTap = 0, lastTapBack = false, lastFx = 0;

  function on() {
    var v = doc.querySelector('.saa-vo-voice, #voice');
    return !(v && v.getAttribute('aria-pressed') === 'false');
  }
  function ready() {
    if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') { ctx.resume(); }
    return ctx;
  }
  /* one soft note: sine body + a quiet octave, quick attack, smooth decay */
  function note(freq, at, len, vol, type, lp) {
    var t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain(), out = g;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    if (lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); out = f; }
    out.connect(master);
    o.start(t); o.stop(t + len + 0.05);
  }
  var SFX = {
    click: function () {
      if (!on() || !ready()) { return; }
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1250, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.045);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.08);
    },
    correct: function () {
      if (!on() || !ready() || Date.now() - lastFx < 350) { return; }
      lastFx = Date.now();
      note(880.00, 0, 0.32, 0.11); note(1760.0, 0, 0.18, 0.02);        /* A5 */
      note(1318.5, 0.09, 0.45, 0.11); note(2637.0, 0.09, 0.22, 0.018); /* E6 */
    },
    wrong: function () {
      if (!on() || !ready() || Date.now() - lastFx < 350) { return; }
      lastFx = Date.now();
      note(329.63, 0, 0.20, 0.10, 'triangle', 1400);    /* E4 */
      note(261.63, 0.12, 0.30, 0.10, 'triangle', 1100); /* C4 */
    }
  };
  win.SAA_SFX = SFX;

  /* taps on things you can press */
  var TAP = 'button, a[href], [role="button"], [role="radio"], [role="checkbox"], [role="tab"], [role="option"], input[type="checkbox"], input[type="radio"], label, select, summary, .saa-chip, .opt, .choice, .saa-m-item, .saa-m-target, .saa-d-pos';
  doc.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest(TAP);
    lastTap = Date.now();
    lastTapBack = !!(el && (/^\s*(Back|Previous)\s*$/i.test(el.textContent || '') || el.classList.contains('saa-back')));
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') { return; }
    if (el.closest('.saa-vo, .saa-theme-b, #listen, #voice')) { ready(); return; }  /* narration buttons: no click over the voice */
    SFX.click();
  }, true);
  doc.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { lastTap = Date.now(); lastTapBack = false; } }, true);

  /* right / wrong: a game or kit marks an answer just after the learner acted */
  var RIGHT = /(^|\s)(right|correct|is-correct|is-right|is-ok|good|hit|saa-bin-hit|pass|success|saa-match)(\s|$)/;
  var WRONG = /(^|\s)(wrong|incorrect|is-incorrect|is-wrong|is-bad|bad|miss|fail)(\s|$)/;   /* a shake is a nudge, not an answer: kits play their own wrong sound */
  function judge(el, old) {
    var now = (el.getAttribute && el.getAttribute('class')) || '';
    if (el.closest && el.closest('.saa-vo, header, nav.saa-navrow, footer')) { return 0; }
    if (el.classList && el.classList.contains('saa-kit')) { return 0; }   /* the whole activity shakes when Next is pressed too early: a nudge, not a wrong answer */
    var gainedR = RIGHT.test(now) && !RIGHT.test(old || ''), gainedW = WRONG.test(now) && !WRONG.test(old || '');
    return gainedW ? -1 : (gainedR ? 1 : 0);
  }
  function play(v) {
    if (!v) { return; }
    if (v < 0) { SFX.wrong(); } else { SFX.correct(); }   /* the 350ms guard lives in correct()/wrong(), so direct calls from games are guarded too */
  }
  if (win.MutationObserver) {
    new MutationObserver(function (ms) {
      if (Date.now() - lastTap > 1500) { return; }
      var v = 0;
      ms.forEach(function (m) {
        if (m.type === 'attributes') { var r = judge(m.target, m.oldValue); if (r < 0) { v = -1; } else if (r > 0 && v === 0) { v = 1; } }
        else if (!lastTapBack) {   /* a feedback bubble or answer drawn fresh by the game (chat games) */
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1 || !n.getAttribute) { return; }
            var c = n.getAttribute('class') || '';
            if (/(^|\s)(fb|feedback|msg|bubble|result|verdict)/.test(c) || n.matches('[role="status"], [aria-live]')) {
              if (WRONG.test(c)) { v = -1; } else if (RIGHT.test(c) && v === 0) { v = 1; }
            }
          });
        }
      });
      play(v);
    }).observe(doc.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true, childList: true });
  }
})(window, document);
