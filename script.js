// Practice Bot engine. A small scripted chat — no live AI connection.
// Node IDs follow the SCENE_INTENT_OUTCOME pattern from the conversation
// flow spec (see each cluster's `id`), even though this build renders
// them as one continuous chat rather than separate platform nodes.
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

document.addEventListener('DOMContentLoaded', function () {
  var chatWindow = document.getElementById('chat-window');
  var dots = document.querySelectorAll('.progress-dot');

  var state = { clusterIndex: -1, attempts: 0, chosen: [], results: [] };

  function scrollDown() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function setDot(i, cls) {
    if (dots[i]) {
      dots[i].classList.remove('active', 'done');
      dots[i].classList.add(cls);
    }
  }

  function addRow(side, bubbleEl) {
    var row = document.createElement('div');
    row.className = 'msg-row ' + side;
    row.appendChild(bubbleEl);
    chatWindow.appendChild(row);
    scrollDown();
    return row;
  }

  function addBot(text, extraClass) {
    var b = document.createElement('div');
    b.className = 'bubble bot' + (extraClass ? ' ' + extraClass : '');
    b.textContent = text;
    return addRow('bot', b);
  }

  function addScenario(text) {
    var b = document.createElement('div');
    b.className = 'bubble scenario';
    b.textContent = '“' + text + '”';
    return addRow('bot', b);
  }

  function addUser(text) {
    var b = document.createElement('div');
    b.className = 'bubble user';
    b.textContent = text;
    return addRow('user', b);
  }

  function addReveal(text) {
    var b = document.createElement('div');
    b.className = 'bubble reveal';
    var label = document.createElement('span');
    label.className = 'reveal-label';
    label.textContent = "Here's the answer";
    b.appendChild(label);
    b.appendChild(document.createTextNode(text));
    return addRow('bot', b);
  }

  var activeControls = null;

  function clearControls() {
    if (activeControls && activeControls.parentNode) {
      activeControls.parentNode.removeChild(activeControls);
    }
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
    chatWindow.appendChild(wrap);
    activeControls = wrap;
    scrollDown();
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
      addBot(cluster.help);
    });
    row.appendChild(helpBtn);

    var skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'meta-btn';
    skipBtn.textContent = 'Skip this one';
    skipBtn.addEventListener('click', function () {
      row.remove();
      clearControls();
      startSkip(cluster);
    });
    row.appendChild(skipBtn);

    chatWindow.appendChild(row);
    scrollDown();
    return row;
  }

  var metaRow = null;

  function askQuestion(cluster) {
    addQuickReplies(
      cluster.options.map(function (o) { return { label: o }; }),
      function (label) {
        if (metaRow) { metaRow.remove(); metaRow = null; }
        addUser(label);
        handleAnswer(cluster, label);
      }
    );
    metaRow = addMetaActions(cluster);
  }

  function handleAnswer(cluster, label) {
    state.attempts++;
    state.chosen.push(label);
    var correctLabel = cluster.options[cluster.correctIndex];

    if (label === correctLabel) {
      addCorrectBubble(cluster.correctFeedback);
      recordResult(cluster, state.attempts === 1 ? 'mastered' : 'reviewed');
      advance();
    } else if (state.attempts >= 2) {
      addIncorrectBubble(cluster.nudge);
      addReveal(cluster.reveal);
      recordResult(cluster, 'reviewed');
      advance();
    } else {
      addIncorrectBubble(cluster.nudge);
      askQuestion(cluster);
    }
  }

  function addIncorrectBubble(text) {
    var b = document.createElement('div');
    b.className = 'bubble incorrect';
    b.textContent = text;
    addRow('bot', b);
  }

  function addCorrectBubble(text) {
    var b = document.createElement('div');
    b.className = 'bubble correct';
    b.textContent = text;
    addRow('bot', b);
  }

  function startSkip(cluster) {
    addBot('No problem — why are you skipping?');
    addQuickReplies(
      [{ label: 'Not sure' }, { label: 'Short on time' }, { label: 'Prefer to move on' }],
      function (label) {
        addUser(label);
        addReveal(cluster.reveal);
        recordResult(cluster, 'skipped', label);
        advance();
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

  function advance() {
    setDot(state.clusterIndex + 1, 'done');
    startCluster(state.clusterIndex + 1);
  }

  function startCluster(i) {
    if (i >= CLUSTERS.length) { finish(); return; }
    state.clusterIndex = i;
    state.attempts = 0;
    state.chosen = [];
    setDot(i + 1, 'active');

    var c = CLUSTERS[i];
    addBot('Drill ' + (i + 1) + ' of ' + CLUSTERS.length + '.');
    if (c.scenario) addScenario(c.scenario);
    addBot(c.question);
    askQuestion(c);
  }

  function finish() {
    setDot(6, 'active');
    addBot("Nice work! You've completed all 5 drills.");

    var masteredCount = state.results.filter(function (r) { return r.outcome === 'mastered'; }).length;
    addBot(masteredCount + ' of ' + CLUSTERS.length + ' correct on your first try.');

    var card = document.createElement('div');
    card.className = 'recap-card';

    var heading = document.createElement('p');
    heading.style.margin = '0 0 6px';
    heading.style.fontWeight = '700';
    heading.style.fontSize = '13.5px';
    heading.textContent = 'Your recap';
    card.appendChild(heading);

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
    chatWindow.appendChild(card);

    var stopRule = document.createElement('div');
    stopRule.className = 'stop-rule';
    stopRule.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A6B00" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg><div><span class="label">Reminder</span><p>Never type real names, marks, phone numbers or ID numbers into an AI tool. Use made-up details for practice.</p></div>';
    chatWindow.appendChild(stopRule);

    var downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-download';
    downloadBtn.textContent = 'Download my results';
    downloadBtn.addEventListener('click', downloadResults);
    chatWindow.appendChild(downloadBtn);

    var restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.className = 'btn-restart';
    restartBtn.textContent = 'Start over';
    restartBtn.addEventListener('click', restart);
    chatWindow.appendChild(restartBtn);

    scrollDown();
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

  function restart() {
    chatWindow.innerHTML = '';
    state = { clusterIndex: -1, attempts: 0, chosen: [], results: [] };
    dots.forEach(function (d, i) { d.classList.remove('active', 'done'); if (i === 0) d.classList.add('active'); });
    init();
  }

  function init() {
    addBot("Hi! I'm your practice bot for Framing and Refining.");
    addBot("I'll show you short requests. You tell me what's wrong, or which move fixes it. You get 2 tries before I help.");
    addQuickReplies([{ label: 'Start', primary: true }], function () {
      startCluster(0);
    });
  }

  init();
});
