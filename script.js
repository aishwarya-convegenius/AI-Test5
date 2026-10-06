// Practice Bot engine. A small scripted chat — no live AI connection.
// Node IDs follow the SCENE_INTENT_OUTCOME pattern from the conversation
// flow spec (see each cluster's `id`), even though this build renders
// them as one exchange per slide rather than separate platform nodes.
// Nothing here is saved or sent anywhere until the learner downloads
// their own results.

var CLUSTERS = [
  {
    id: 'C1_DIAGNOSE_CONTEXT',
    lane: 'ITI',
    type: 'diagnose',
    scenario: 'You are a workshop instructor. Write a safety reminder. Format it as 3 points for the notice board.',
    question: 'What is missing from this request?',
    options: ['Context', 'Role', 'Task', 'Format'],
    correctIndex: 0,
    correctFeedback: 'Yes. The request does not say who it is for, or why they need it. Always add the context.',
    nudge: 'Not quite. Read it again. Check each part: who speaks, who it is for, what to make and how it should look.',
    reveal: 'The missing part was Context. The request does not say who it is for, or why.',
    help: 'Hint. Read the request out loud. Does it say who it is for, who speaks, what to make and how it should look?'
  },
  {
    id: 'C2_DIAGNOSE_ROLE',
    lane: 'Campus',
    type: 'diagnose',
    scenario: 'Our group project is due on Friday, which is a practice date. Write a reminder message about it. Format it as one short message.',
    question: 'What is missing from this request?',
    options: ['Context', 'Role', 'Task', 'Format'],
    correctIndex: 1,
    correctFeedback: 'Yes. The request does not say who the AI should act as.',
    nudge: 'Not quite. Read it again. Check each part: who speaks, who it is for, what to make and how it should look.',
    reveal: 'The missing part was Role. The request does not say who the AI should act as.',
    help: 'Hint. Read the request out loud. Does it say who it is for, who speaks, what to make and how it should look?'
  },
  {
    id: 'C3_MOVE_NARROW',
    lane: 'ITI',
    type: 'move',
    scenario: 'A trainee asked an AI tool for a safety reminder. The answer covered lathe safety, drill safety and fire safety. This was much more than the trainee needed.',
    question: 'Which move fixes this answer?',
    options: ['Narrow', 'Expand', 'Change register', 'Check it', 'Combine'],
    correctIndex: 0,
    correctFeedback: 'Yes. The answer covers too much. Say "Only tell me about ___" to narrow it.',
    nudge: 'Not quite. Look at the problem again. Is the answer too long, too short, in the wrong tone, not checked, or in two drafts?',
    reveal: 'The right move was Narrow. The answer covered too much, so ask for just one part.',
    help: 'Hint. Is the answer too long or too short? Is the tone wrong, is it unsure, or do you need the best of two drafts?'
  },
  {
    id: 'C4_MOVE_REGISTER',
    lane: 'Campus',
    type: 'move',
    scenario: 'A class representative asked an AI tool to write a submission reminder. The answer used difficult words. First-year students may not understand them.',
    question: 'Which move fixes this answer?',
    options: ['Narrow', 'Expand', 'Change register', 'Check it', 'Combine'],
    correctIndex: 2,
    correctFeedback: 'Yes. The words are too hard for the readers. Say "Say this simply for ___" to change the tone.',
    nudge: 'Not quite. Look at the problem again. Is the answer too long, too short, in the wrong tone, not checked, or in two drafts?',
    reveal: 'The right move was Change register. The words were too hard for the readers.',
    help: 'Hint. Is the answer too long or too short? Is the tone wrong, is it unsure, or do you need the best of two drafts?'
  },
  {
    id: 'C5_MOVE_CHECK',
    lane: 'ITI',
    type: 'move',
    scenario: 'An AI tool wrote a safety notice with the line "Fine: ₹500 for non-compliance". Nobody asked for a fine amount.',
    question: 'Which move fixes this answer?',
    options: ['Narrow', 'Expand', 'Change register', 'Check it', 'Combine'],
    correctIndex: 3,
    correctFeedback: 'Yes. Always ask "What might be wrong here?" AI should not invent rules, fines or dates that you did not give it.',
    nudge: 'Not quite. Look at the problem again. Is the answer too long, too short, in the wrong tone, not checked, or in two drafts?',
    reveal: 'The right move was Check it. AI should never invent a fine, rule or date that you did not give it.',
    help: 'Hint. Is the answer too long or too short? Is the tone wrong, is it unsure, or do you need the best of two drafts?'
  }
];

// ---------------------------------------------------------------------
// Slide engine (round 2). Every slide fits one screen; the chat never
// scrolls. Each drill is its own slide showing ONE exchange: the
// learner's previous reply (small line), the current bot turn and the
// reply options. The full transcript is kept in memory (state.transcript)
// and included in the download.
//
// Slide map: 0 Intro · 1 Welcome · 2..6 Drill 1..5 · 7 Recap · 8 Wrap-up
// ---------------------------------------------------------------------
var SLIDE_INTRO = 0;
var SLIDE_WELCOME = 1;
var SLIDE_FIRST_DRILL = 2;
var SLIDE_RECAP = SLIDE_FIRST_DRILL + CLUSTERS.length;   // 7
var SLIDE_WRAP = SLIDE_RECAP + 1;                         // 8
var TOTAL_SLIDES = SLIDE_WRAP + 1;                        // 9

document.addEventListener('DOMContentLoaded', function () {
  var chatWindow = document.getElementById('chat-window');
  var recapWindow = document.getElementById('recap-window');
  var chatTitle = document.getElementById('chat-title');
  var chatEyebrow = document.getElementById('chat-eyebrow');
  var chatBody = document.getElementById('chat-body');
  var chatTask = document.getElementById('chat-task-text');
  var backBtn = document.getElementById('back-btn');
  var nextBtn = document.getElementById('next-btn');
  var nextLabel = document.getElementById('next-label');
  var pageCount = document.getElementById('page-count');
  var dotsWrap = document.getElementById('progress-dots');

  var sections = {
    intro: document.getElementById('slide-intro'),
    chat: document.getElementById('slide-chat'),
    recap: document.getElementById('slide-recap'),
    wrap: document.getElementById('slide-wrap')
  };

  var state;
  var turns = {};          // slide index -> turn element (kept so Back can show it)
  var activeControls = null;
  var hintSlot = null;

  function freshState() {
    return {
      view: 0,             // slide on screen
      live: 0,             // furthest slide reached
      started: false,
      clusterIndex: -1,
      attempts: 0,
      chosen: [],
      resolved: false,     // current drill finished?
      results: [],
      transcript: []
    };
  }

  // ---------- progress dots ----------
  for (var d = 0; d < TOTAL_SLIDES; d++) {
    var dot = document.createElement('span');
    dot.className = 'progress-dot';
    dotsWrap.appendChild(dot);
  }
  var dots = dotsWrap.querySelectorAll('.progress-dot');

  // ---------- transcript ----------
  function log(who, text) { state.transcript.push({ who: who, text: text }); }

  // ---------- turn containers ----------
  function turnFor(v) {
    if (!turns[v]) {
      var t = document.createElement('div');
      t.className = 'turn';
      chatWindow.appendChild(t);
      turns[v] = t;
    }
    return turns[v];
  }
  var target = null;   // turn element messages are written into
  function newTurn(v) {
    target = turnFor(v);
    target.innerHTML = '';
    activeControls = null;
    hintSlot = null;
  }

  // Game 9 designer assets (Oct 2026): bot avatar, chip icons, result icons.
  var CHIP_ICONS = {
    'Role': 'icon-role', 'Context': 'icon-context', 'Task': 'icon-task', 'Format': 'icon-format',
    'Narrow': 'icon-move-1', 'Expand': 'icon-move-2', 'Change register': 'icon-move-3',
    'Check it': 'icon-move-4', 'Combine': 'icon-move-5'
  };
  function iconImg(name, cls) {
    var im = document.createElement('img');
    im.className = cls;
    im.src = 'assets/icons/' + name + '.webp';
    im.alt = '';
    im.setAttribute('aria-hidden', 'true');
    return im;
  }
  function botAvatar() {
    var im = document.createElement('img');
    im.className = 'g9-avatar';
    im.src = 'assets/logo-swiftchat-64.webp';
    im.alt = 'Practice bot';
    return im;
  }

  function addRow(side, bubbleEl) {
    var row = document.createElement('div');
    row.className = 'msg-row ' + side;
    if (side === 'bot') row.appendChild(botAvatar());
    row.appendChild(bubbleEl);
    target.appendChild(row);
    return row;
  }

  function addBot(text, extraClass) {
    var b = document.createElement('div');
    b.className = 'bubble bot' + (extraClass ? ' ' + extraClass : '');
    b.textContent = text;
    log('Bot', text);
    return addRow('bot', b);
  }

  function addScenario(text) {
    var b = document.createElement('div');
    b.className = 'bubble scenario';
    b.textContent = '“' + text + '”';
    log('Bot', '“' + text + '”');
    return addRow('bot', b);
  }

  // The learner's previous reply stays on screen as a small line.
  function addPrevReply(text) {
    var line = document.createElement('div');
    line.className = 'prev-reply';
    var who = document.createElement('span');
    who.className = 'prev-who';
    who.textContent = 'You';
    var said = document.createElement('span');
    said.className = 'bubble user';
    said.textContent = text;
    line.appendChild(who);
    line.appendChild(said);
    target.appendChild(line);
    log('You', text);
  }

  function addReveal(text) {
    var b = document.createElement('div');
    b.className = 'bubble reveal';
    var label = document.createElement('span');
    label.className = 'reveal-label';
    label.textContent = 'Here is the answer';
    b.appendChild(label);
    b.appendChild(document.createTextNode(text));
    log('Bot', 'Here is the answer: ' + text);
    return addRow('bot', b);
  }

  function addCorrectBubble(text) { addBot(text, 'correct'); }
  function addIncorrectBubble(text) { addBot(text, 'incorrect'); }

  function clearControls() {
    if (activeControls && activeControls.parentNode) activeControls.parentNode.removeChild(activeControls);
    activeControls = null;
  }

  function addQuickReplies(options, onPick) {
    clearControls();
    var wrap = document.createElement('div');
    wrap.className = 'quick-replies';
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qr-btn' + (opt.primary ? ' primary' : '');
      btn.textContent = opt.label;
      if (CHIP_ICONS[opt.label]) {
        btn.classList.add('g9-has-ic');
        btn.insertBefore(iconImg(CHIP_ICONS[opt.label], 'g9-chip-ic'), btn.firstChild);
      }
      btn.addEventListener('click', function () {
        clearControls();
        onPick(opt.label);
      });
      wrap.appendChild(btn);
    });
    target.appendChild(wrap);
    activeControls = wrap;
    return wrap;
  }

  function addMetaActions(cluster) {
    var row = document.createElement('div');
    row.className = 'chat-meta-actions';

    var helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.className = 'meta-btn';
    helpBtn.textContent = 'Need a hint?';
    helpBtn.addEventListener('click', function () {
      // One hint bubble per turn, placed above the options (no growing log).
      if (!hintSlot) {
        var b = document.createElement('div');
        b.className = 'bubble bot hint';
        hintSlot = document.createElement('div');
        hintSlot.className = 'msg-row bot';
        hintSlot.appendChild(botAvatar());
        hintSlot.appendChild(b);
        target.insertBefore(hintSlot, activeControls);
      }
      if (hintSlot.lastChild.textContent !== cluster.help) {
        hintSlot.lastChild.textContent = cluster.help;
        log('Bot', cluster.help);
      }
    });
    row.appendChild(helpBtn);

    var skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'meta-btn';
    skipBtn.textContent = 'Skip this one';
    skipBtn.addEventListener('click', function () {
      log('You', 'Skip this one');
      startSkip(cluster);
    });
    row.appendChild(skipBtn);

    target.appendChild(row);
    return row;
  }

  function askQuestion(cluster) {
    var wrap = addQuickReplies(
      cluster.options.map(function (o) { return { label: o }; }),
      function (label) { handleAnswer(cluster, label); }
    );
    // A wrong answer already tried cannot be picked again.
    Array.prototype.forEach.call(wrap.querySelectorAll('.qr-btn'), function (b) {
      if (state.chosen.indexOf(b.textContent.trim()) !== -1) {
        b.disabled = true;
        b.classList.add('tried');
        b.setAttribute('aria-label', b.textContent.trim() + ' (already tried)');
      }
    });
    addMetaActions(cluster);
  }
  function sfx(ok) { if (window.SAA_SFX) { if (ok) { SAA_SFX.correct(); } else { SAA_SFX.wrong(); } } }

  function handleAnswer(cluster, label) {
    state.attempts++;
    state.chosen.push(label);
    var correctLabel = cluster.options[cluster.correctIndex];

    newTurn(state.view);
    addPrevReply(label);

    if (label === correctLabel) {
      sfx(true);
      addCorrectBubble(cluster.correctFeedback);
      recordResult(cluster, state.attempts === 1 ? 'mastered' : 'reviewed');
      resolveDrill();
    } else if (state.attempts >= 2) {
      sfx(false);
      addIncorrectBubble('Not quite. That was your second try, so here is the answer.');
      addReveal(cluster.reveal);
      recordResult(cluster, 'reviewed');
      resolveDrill();
    } else {
      // Second try: nudge, the same request again (it was on screen before), and the options.
      sfx(false);
      addIncorrectBubble(cluster.nudge);
      if (cluster.scenario) addScenario(cluster.scenario);
      askQuestion(cluster);
    }
  }

  function startSkip(cluster) {
    newTurn(state.view);
    addBot('No problem. Why do you want to skip this one?');
    addQuickReplies(
      [{ label: 'I am not sure.' }, { label: 'I do not have time.' }, { label: 'I want to move on.' }],
      function (label) {
        newTurn(state.view);
        addPrevReply(label);
        addReveal(cluster.reveal);
        recordResult(cluster, 'skipped', label);
        resolveDrill();
      }
    );
  }

  function recordResult(cluster, outcome, skipReason) {
    state.results.push({
      id: cluster.id,
      lane: cluster.lane,
      question: cluster.question,
      scenario: cluster.scenario,
      chosen: state.chosen.slice(),
      outcome: outcome,
      skipReason: skipReason || ''
    });
  }

  // Drill finished: the feedback stays on screen; footer Next moves on.
  function resolveDrill() {
    state.resolved = true;
    render();
  }

  function startCluster(i) {
    if (i >= CLUSTERS.length) { finish(); return; }
    state.clusterIndex = i;
    state.attempts = 0;
    state.chosen = [];
    state.resolved = false;
    var v = SLIDE_FIRST_DRILL + i;
    state.view = v;
    state.live = v;

    var c = CLUSTERS[i];
    newTurn(v);
    // "Drill N of 5." is now the slide title (logged so the transcript keeps it).
    log('Bot', 'Drill ' + (i + 1) + ' of ' + CLUSTERS.length + '.');
    if (c.scenario) addScenario(c.scenario);
    addBot(c.question);
    askQuestion(c);
    render();
  }

  function finish() {
    recapWindow.innerHTML = '';
    target = recapWindow;
    var masteredCount = state.results.filter(function (r) { return r.outcome === 'mastered'; }).length;
    addBot(masteredCount >= 4 ? 'Nice work! You have finished all 5 drills.'
      : masteredCount >= 2 ? 'Good effort. You have finished all 5 drills.'
      : 'You have finished all 5 drills. Practise the ones that need review.');
    addBot('You got ' + masteredCount + ' of ' + CLUSTERS.length + ' right on your first try.');

    var card = document.createElement('div');
    card.className = 'recap-card';
    var list = document.createElement('ul');
    list.className = 'recap-list';
    state.results.forEach(function (r, idx) {
      var li = document.createElement('li');
      var left = document.createElement('span');
      left.textContent = 'Drill ' + (idx + 1) + ' · ' + r.lane;
      var right = document.createElement('span');
      right.className = 'recap-outcome ' + r.outcome;
      right.textContent = r.outcome === 'mastered' ? 'Mastered'
        : r.outcome === 'reviewed' ? 'Needs review'
        : 'Skipped';
      if (r.outcome !== 'skipped') {
        right.insertBefore(iconImg(r.outcome === 'mastered' ? 'icon-mastered' : 'icon-needs-review', 'g9-res-ic'), right.firstChild);
      }
      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });
    card.appendChild(list);
    recapWindow.appendChild(card);

    state.view = SLIDE_RECAP;
    state.live = SLIDE_RECAP;
    render();
  }

  function outcomeLabel(o) { return o === 'mastered' ? 'Mastered' : o === 'reviewed' ? 'Needs review' : 'Skipped'; }
  function downloadResults() {
    var stampKit = sections.wrap.querySelector('.saa-kit[data-kit="stamp"]');
    var dlMsg = document.getElementById('download-msg');
    if (stampKit && !stampKit.classList.contains('is-done')) {
      if (dlMsg) { dlMsg.textContent = 'Stamp each detail first. Then you can download your results.'; }
      Array.prototype.forEach.call(stampKit.querySelectorAll('.saa-row:not(.done)'), function (x) { x.classList.add('saa-nudge'); });
      setTimeout(function () { Array.prototype.forEach.call(stampKit.querySelectorAll('.saa-nudge'), function (x) { x.classList.remove('saa-nudge'); }); }, 2600);
      return;
    }
    if (dlMsg) { dlMsg.textContent = ''; }
    var lines = ['Practice Bot — Framing and Refining — my results', ''];
    state.results.forEach(function (r, idx) {
      lines.push('Drill ' + (idx + 1) + ' (' + r.lane + ')');
      if (r.scenario) lines.push('Scenario: ' + r.scenario);
      lines.push('Question: ' + r.question);
      lines.push('My answer(s): ' + (r.chosen.length ? r.chosen.join(' then ') : '(skipped)'));
      lines.push('Outcome: ' + outcomeLabel(r.outcome) + (r.skipReason ? ' (' + r.skipReason + ')' : ''));
      lines.push('');
    });
    var quickKit = sections.recap.querySelector('.saa-kit[data-kit="quick"]');
    if (quickKit) {
      var q = quickKit.querySelector('.saa-q');
      var tries = Array.prototype.filter.call(quickKit.querySelectorAll('.saa-k-opt'), function (o) { return o.classList.contains('wrong') || o.classList.contains('right'); });
      lines.push('Recap question: ' + (q ? q.textContent.trim() : ''));
      lines.push('My answer(s): ' + (tries.length ? tries.map(function (o) { return o.textContent.trim() + (o.classList.contains('right') ? ' (right)' : ' (not right)'); }).join(' then ') : '(not answered)'));
      lines.push('');
    }
    if (stampKit) {
      lines.push('Keep real details out of AI tools');
      Array.prototype.forEach.call(stampKit.querySelectorAll('.saa-row'), function (row) {
        var names = (stampKit.getAttribute('data-stamps') || 'Do not type|Safe to use').split('|');
        lines.push('- ' + row.textContent.trim() + ': ' + (names[+row.getAttribute('data-ans')] || ''));
      });
      lines.push('');
    }
    lines.push('Full conversation', '');
    state.transcript.forEach(function (m) { lines.push(m.who + ': ' + m.text); });
    var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'practice-bot-results.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function welcome() {
    newTurn(SLIDE_WELCOME);
    addBot('Hi! I am your practice bot for Framing and Refining.');
    addBot('I show you a short request or an AI answer. You tell me what is wrong, or which move fixes it.');
    addBot('You get 2 tries before I help.');
    addQuickReplies([{ label: 'Start', primary: true }], begin);
  }

  function begin() {
    if (state.started) return;
    state.started = true;
    log('You', 'Start');
    clearControls();
    startCluster(0);
  }

  function restart() {
    // A clean start: the kits (recap quiz, stamps) are reset by reloading the page.
    try { window.location.reload(); return; } catch (e) {}
    chatWindow.innerHTML = '';
    recapWindow.innerHTML = '';
    turns = {};
    state = freshState();
    welcome();
    state.view = SLIDE_WELCOME;
    state.live = SLIDE_WELCOME;
    render();
  }

  // ---------- navigation ----------
  function isDrill(v) { return v >= SLIDE_FIRST_DRILL && v < SLIDE_RECAP; }

  function canGoNext() {
    var v = state.view;
    if (v === SLIDE_WRAP) return false;
    if (v < state.live) return true;
    if (v === SLIDE_INTRO) return true;
    if (v === SLIDE_WELCOME) return true;          // same as tapping Start
    if (isDrill(v)) return state.resolved;
    if (v === SLIDE_RECAP) return true;
    return false;
  }

  function goNext() {
    if (!canGoNext()) return;
    var v = state.view;
    if (v < state.live) { state.view = v + 1; render(); return; }
    if (v === SLIDE_INTRO) { state.view = state.live = SLIDE_WELCOME; render(); return; }
    if (v === SLIDE_WELCOME) { begin(); return; }
    if (isDrill(v)) { startCluster(state.clusterIndex + 1); return; }
    if (v === SLIDE_RECAP) { state.view = state.live = SLIDE_WRAP; render(); return; }
  }

  function goBack() {
    if (state.view === 0) return;
    state.view--;
    render();
  }

  var lastView = -1;
  function render() {
    var v = state.view;
    if (v !== lastView) {
      lastView = v;
      var zones = document.querySelectorAll('.saa-scrollzone, #stage');
      Array.prototype.forEach.call(zones, function (z) { z.scrollTop = 0; });
    }
    sections.intro.classList.toggle('active', v === SLIDE_INTRO);
    sections.chat.classList.toggle('active', v === SLIDE_WELCOME || isDrill(v));
    sections.recap.classList.toggle('active', v === SLIDE_RECAP);
    sections.wrap.classList.toggle('active', v === SLIDE_WRAP);

    if (v === SLIDE_WELCOME || isDrill(v)) {
      Object.keys(turns).forEach(function (k) { turns[k].hidden = (+k !== v); });
      if (v === SLIDE_WELCOME) {
        chatEyebrow.textContent = 'Practice Bot';
        chatTitle.textContent = 'Meet your practice bot for this lesson.';
        chatBody.textContent = 'You practise two skills. You frame a clear request, and you refine an AI answer.';
        chatTask.textContent = state.started ? 'Tap Next to go to your drills.' : 'Tap Start to begin the first drill.';
      } else {
        var i = v - SLIDE_FIRST_DRILL;
        var c = CLUSTERS[i];
        var done = v < state.live || state.resolved;
        chatEyebrow.textContent = 'Drill ' + (i + 1) + ' of ' + CLUSTERS.length + ' · ' + c.lane;
        if (c.type === 'diagnose') {
          chatTitle.textContent = 'Find the part that is missing from the request.';
          chatTask.textContent = done ? 'Read the feedback, then tap Next.' : 'Tap the part that is missing.';
        } else {
          chatTitle.textContent = 'Choose the move that fixes the AI answer.';
          chatTask.textContent = done ? 'Read the feedback, then tap Next.' : 'Tap the move that fixes the answer.';
        }
        chatBody.textContent = 'You get 2 tries. Tap Need a hint if you are stuck.';
      }
    }

    dots.forEach(function (dt, i) {
      dt.classList.toggle('done', i < v);
      dt.classList.toggle('active', i === v);
    });
    pageCount.textContent = (v + 1) + ' / ' + TOTAL_SLIDES;

    backBtn.disabled = (v === 0);
    var can = canGoNext();
    nextBtn.disabled = !can;
    nextLabel.textContent = (v === SLIDE_WELCOME && !state.started) ? 'Start' : 'Next';
    // UI consistency (Oct 2026): the footer main button is always the one amber (in-card Start/Download are blue);
    // when Next is locked it is only dimmed.
    nextBtn.classList.remove('is-quiet');
  }

  backBtn.addEventListener('click', goBack);
  nextBtn.addEventListener('click', goNext);
  document.getElementById('download-btn').addEventListener('click', downloadResults);
  document.getElementById('restart-btn').addEventListener('click', restart);

  state = freshState();
  welcome();
  render();

  // Read-only hook for any recap/download tooling.
  window.getPracticeBotTranscript = function () { return state.transcript.slice(); };
});
