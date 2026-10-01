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
    scenario: 'You are a workshop instructor. Write a safety reminder. Format it as 3 points for the noticeboard.',
    question: "What's missing from this request?",
    options: ['Context', 'Role', 'Task', 'Format'],
    correctIndex: 0,
    correctFeedback: 'Correct — it never says who this is for, or why. Always add the context.',
    nudge: "Not quite. Look again — does it say who this is for, and why they need it?",
    reveal: "The missing part was Context. It doesn't say who this is for or why.",
    help: "Hint: read it out loud. Does it say who it's for, who's speaking, what to make, and how it should look?"
  },
  {
    id: 'C2_DIAGNOSE_ROLE',
    lane: 'Campus',
    type: 'diagnose',
    scenario: "For the group's project due Friday (practice date), write a reminder message. Format it as one short message.",
    question: "What's missing from this request?",
    options: ['Context', 'Role', 'Task', 'Format'],
    correctIndex: 1,
    correctFeedback: 'Correct — it never says who the AI should act as.',
    nudge: 'Not quite. Look again — does it say who the AI should act as?',
    reveal: "The missing part was Role. It doesn't say who the AI should act as.",
    help: "Hint: read it out loud. Does it say who it's for, who's speaking, what to make, and how it should look?"
  },
  {
    id: 'C3_MOVE_NARROW',
    lane: 'ITI',
    type: 'move',
    scenario: 'A trainee asked AI for a safety reminder. The answer covered lathe safety, drill safety and fire safety — much more than needed.',
    question: 'Which move fixes this?',
    options: ['Narrow', 'Expand', 'Change register', 'Check it', 'Combine'],
    correctIndex: 0,
    correctFeedback: 'Correct — say "Only tell me about ___" to narrow it down.',
    nudge: 'Not quite. Think about it: is the answer too long, too short, the wrong tone, unverified, or from two drafts?',
    reveal: 'The right move was Narrow. The answer covered too much — ask for just one part.',
    help: 'Hint: is the answer too long, too short, the wrong tone, unsure of itself, or does it need the best of two drafts?'
  },
  {
    id: 'C4_MOVE_REGISTER',
    lane: 'Campus',
    type: 'move',
    scenario: 'A class representative asked AI to write a submission reminder. The answer used difficult words that first-year students may not understand.',
    question: 'Which move fixes this?',
    options: ['Narrow', 'Expand', 'Change register', 'Check it', 'Combine'],
    correctIndex: 2,
    correctFeedback: 'Correct — say "Say this simply for ___" to change the tone.',
    nudge: 'Not quite. Think about it: is the answer too long, too short, the wrong tone, unverified, or from two drafts?',
    reveal: 'The right move was Change register. The words were too hard for the audience.',
    help: 'Hint: is the answer too long, too short, the wrong tone, unsure of itself, or does it need the best of two drafts?'
  },
  {
    id: 'C5_MOVE_CHECK',
    lane: 'ITI',
    type: 'move',
    scenario: 'AI wrote a safety notice that included "Fine: ₹500 for non-compliance" — but nobody asked for a fine amount.',
    question: 'Which move fixes this?',
    options: ['Narrow', 'Expand', 'Change register', 'Check it', 'Combine'],
    correctIndex: 3,
    correctFeedback: 'Correct — always ask "What might be wrong here?" AI should not invent rules, fines or dates you did not give it.',
    nudge: 'Not quite. Think about it: is the answer too long, too short, the wrong tone, unverified, or from two drafts?',
    reveal: "The right move was Check it. AI should never invent a fine, rule or date you didn't give it.",
    help: 'Hint: is the answer too long, too short, the wrong tone, unsure of itself, or does it need the best of two drafts?'
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

  function addRow(side, bubbleEl) {
    var row = document.createElement('div');
    row.className = 'msg-row ' + side;
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
    label.textContent = "Here's the answer";
    b.appendChild(label);
    b.appendChild(document.createTextNode(text));
    log('Bot', "Here's the answer: " + text);
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
        hintSlot.appendChild(b);
        target.insertBefore(hintSlot, activeControls);
      }
      hintSlot.firstChild.textContent = cluster.help;
      log('Bot', cluster.help);
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
    addQuickReplies(
      cluster.options.map(function (o) { return { label: o }; }),
      function (label) { handleAnswer(cluster, label); }
    );
    addMetaActions(cluster);
  }

  function handleAnswer(cluster, label) {
    state.attempts++;
    state.chosen.push(label);
    var correctLabel = cluster.options[cluster.correctIndex];

    newTurn(state.view);
    addPrevReply(label);

    if (label === correctLabel) {
      addCorrectBubble(cluster.correctFeedback);
      recordResult(cluster, state.attempts === 1 ? 'mastered' : 'reviewed');
      resolveDrill();
    } else if (state.attempts >= 2) {
      addIncorrectBubble(cluster.nudge);
      addReveal(cluster.reveal);
      recordResult(cluster, 'reviewed');
      resolveDrill();
    } else {
      // Second try: nudge, the same request again (it was on screen before), and the options.
      addIncorrectBubble(cluster.nudge);
      if (cluster.scenario) addScenario(cluster.scenario);
      askQuestion(cluster);
    }
  }

  function startSkip(cluster) {
    newTurn(state.view);
    addBot('No problem — why are you skipping?');
    addQuickReplies(
      [{ label: 'Not sure' }, { label: 'Short on time' }, { label: 'Prefer to move on' }],
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
    addBot("Nice work! You've completed all 5 drills.");
    var masteredCount = state.results.filter(function (r) { return r.outcome === 'mastered'; }).length;
    addBot(masteredCount + ' of ' + CLUSTERS.length + ' correct on your first try.');

    var card = document.createElement('div');
    card.className = 'recap-card';
    var list = document.createElement('ul');
    list.className = 'recap-list';
    state.results.forEach(function (r, idx) {
      var li = document.createElement('li');
      var left = document.createElement('span');
      left.textContent = 'Drill ' + (idx + 1) + ' (' + r.lane + ')';
      var right = document.createElement('span');
      right.className = 'recap-outcome ' + r.outcome;
      right.textContent = r.outcome === 'mastered' ? 'Mastered'
        : r.outcome === 'reviewed' ? 'Needs review'
        : 'Skipped';
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

  function downloadResults() {
    var lines = ['Practice Bot — Framing and Refining — my results', ''];
    state.results.forEach(function (r, idx) {
      lines.push('Drill ' + (idx + 1) + ' (' + r.lane + ')');
      if (r.scenario) lines.push('Scenario: ' + r.scenario);
      lines.push('Question: ' + r.question);
      lines.push('My answer(s): ' + (r.chosen.length ? r.chosen.join(' then ') : '(skipped)'));
      lines.push('Outcome: ' + r.outcome + (r.skipReason ? ' (' + r.skipReason + ')' : ''));
      lines.push('');
    });
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
    addBot("Hi! I'm your practice bot for Framing and Refining.");
    addBot("I'll show you short requests. You tell me what's wrong, or which move fixes it. You get 2 tries before I help.");
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

  function render() {
    var v = state.view;
    sections.intro.classList.toggle('active', v === SLIDE_INTRO);
    sections.chat.classList.toggle('active', v === SLIDE_WELCOME || isDrill(v));
    sections.recap.classList.toggle('active', v === SLIDE_RECAP);
    sections.wrap.classList.toggle('active', v === SLIDE_WRAP);

    if (v === SLIDE_WELCOME || isDrill(v)) {
      Object.keys(turns).forEach(function (k) { turns[k].hidden = (+k !== v); });
      if (v === SLIDE_WELCOME) {
        chatEyebrow.textContent = 'Practice Bot';
        chatTitle.textContent = 'Meet your practice bot';
      } else {
        var i = v - SLIDE_FIRST_DRILL;
        chatEyebrow.textContent = 'Practice Bot · ' + CLUSTERS[i].lane;
        chatTitle.textContent = 'Drill ' + (i + 1) + ' of ' + CLUSTERS.length;
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
    // One amber per slide: go quiet when the chat owns the primary (Start chip) or Next can't be used.
    var quiet = !can || (v === SLIDE_WELCOME && !state.started) || v === SLIDE_WRAP;
    nextBtn.classList.toggle('is-quiet', quiet);
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
