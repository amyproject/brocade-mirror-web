/* 问一问 · Ask: a Baduanjin Q&A chat (Brocade Mirror).
   Every answer is a pre-written entry in data-ask.js (window.BDJ_ASK, from tools/ask_content.py).
   Typed questions go to the local helper (tools/ask_server.py → TypeSafe Jev), which picks the
   entry that fits and flags urgent symptoms or questions nothing covers. Jev never writes text.
   Without the helper (file:// with no server running, offline), a simple keyword match picks
   the entry instead, and the panel says so. Chips with a known entry skip the network. */
(function () {
  'use strict';
  var A = window.BDJApp, LIB = window.BDJ_ASK;
  if (!A || !LIB || !LIB.entries) return;
  var h = A.h, icon = A.icon, t = A.t;
  var E = {}; LIB.entries.forEach(function (e) { E[e.id] = e; });
  var track = function (ev, p) { if (window.BDJTrack) window.BDJTrack(ev, p); };
  function zh() { return A.S.lang === 'zh'; }
  function L(o) { return o ? (zh() ? o.zh : o.en) : ''; }
  var $ = function (id) { return document.getElementById(id); };

  // The helper only answers pages it served (http://localhost:8765). From file:// (incl. the one-file
  // build) it refuses on purpose, so those pages use the offline matcher straight away.
  var SERVED = /^https?:$/.test(location.protocol);
  var ENDPOINT = SERVED ? '/api/ask' : null;
  var mode = 'checking';     // 'jev' | 'offline' | 'checking'
  var history = [];          // last turns {q, id}, sent so "what about seated?" resolves
  var busy = false, panel = null, log = null, input = null, statusEl = null;

  var CAT = {
    benefits: { zh: '功效', en: 'Benefits' },
    modify: { zh: '调整与简化', en: 'Modifications' },
    caution: { zh: '注意事项', en: 'Keep in mind' }
  };

  // ------------------------------------------------------------------ helper status
  var reprobe = 0;
  function probe() {
    if (!window.fetch || !ENDPOINT) { setMode('offline', SERVED ? '' : 'file'); return; }
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 2500);
    fetch(ENDPOINT, { method: 'GET', signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); setMode(j && j.configured ? 'jev' : 'offline', j && !j.configured ? 'nokey' : ''); })
      .catch(function () { clearTimeout(timer); setMode('offline'); });
  }
  var modeWhy = '';
  function setMode(m, why) { mode = m; modeWhy = why || ''; renderStatus(); }
  function renderStatus() {
    if (!statusEl) return;
    statusEl.className = 'ask-status ' + mode;
    statusEl.textContent = mode === 'jev' ? t('AI 匹配 · TypeSafe Jev', 'AI matching · TypeSafe Jev')
      : mode === 'checking' ? t('正在连接…', 'Connecting…')
      : modeWhy === 'nokey' ? t('离线匹配（助手未配置 API key）', 'Offline matching (helper has no API key)')
      : modeWhy === 'file' ? t('离线匹配 · 用 sh web/serve.sh 打开 localhost 启用 AI', 'Offline matching · open via sh web/serve.sh (localhost) for AI')
      : t('离线匹配 · 运行 sh web/serve.sh 启用 AI', 'Offline matching · run sh web/serve.sh for AI');
    statusEl.title = mode === 'jev' ? t('由 TypeSafe Jev 从事先写好的答案中挑选', 'TypeSafe Jev picks from pre-written answers')
      : t('本地关键词匹配，无需联网', 'Keyword matching on this device, no network needed');
  }

  // ------------------------------------------------------------------ offline keyword match
  var STOP = (' a an and are as at be can do does for from how i if in is it its me my of on or should so the this to what when which who why will with you your about' +
    ' while during still also just have has had been being there their they them than then would could really want need like did doing done very much many any some more most other get got').split(' ');
  var ZH_FUNC = /[可以吗呢吧啊么什怎样有没能还练要的了是我你他她它这那个和与或也都就很太会该应把被让给对在从到为着过得地些点下多少不]/;
  function stem(w) {
    w = w.replace(/^practis/, 'practic');
    if (/ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3);
    else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
    else if (/[^s]s$/.test(w)) w = w.slice(0, -1);
    return w.replace(/e$/, '');                      // knees / knee → kne, muscles → muscl
  }
  // term → count (capped at 3); Chinese as character pairs without grammatical characters
  function terms(s, out, wt) {
    s = (s || '').toLowerCase(); out = out || {}; wt = wt || 1;
    var add = function (k) { out[k] = Math.min(3, (out[k] || 0) + wt); };
    (s.match(/[a-z]{3,}/g) || []).forEach(function (w) { if (STOP.indexOf(w) < 0) add(stem(w)); });
    s.split(/[^一-鿿]+/).forEach(function (run) {
      for (var i = 0; i < run.length - 1; i++) { var bg = run.substr(i, 2); if (!ZH_FUNC.test(bg)) add(bg); }
    });
    return out;
  }
  // IDF over the library: words in nearly every entry (baduanjin, practice, 八段锦) count for little.
  // The answer text is indexed too, at a lower weight, for words only the answer uses (sore, wheelchair…).
  var IDX = null, IDF = null;
  function buildIndex() {
    IDX = LIB.entries.map(function (e) {
      var t = terms([e.desc, e.q.zh, e.q.en].join(' '));
      terms(e.a.en + ' ' + e.a.zh, t, 0.4);
      return { id: e.id, t: t };
    });
    var df = {}; IDX.forEach(function (x) { for (var k in x.t) df[k] = (df[k] || 0) + 1; });
    IDF = {}; for (var k in df) IDF[k] = Math.log(IDX.length / df[k]);
  }
  function localMatch(q, move) {
    if (!IDX) buildIndex();
    var qt = terms(q), keys = Object.keys(qt).filter(function (k) { return IDF[k] > 0.7; }), thisMove = /this move|这一式|这个动作|这式/i.test(q);
    var scored = IDX.map(function (x) {
      var s = 0, d = 0;
      keys.forEach(function (k) { if (x.t[k]) { s += IDF[k] * Math.min(x.t[k], 2); if (IDF[k] >= 2.2) d += IDF[k]; } });
      if (thisMove && E[x.id].move === move) { s += 2; d += 2.5; }
      return { id: x.id, s: s, d: d };
    }).sort(function (a, b) { return b.s - a.s; });
    var best = scored[0].s, second = scored[1].s;
    // confident only when a distinctive word (in ≤ ~6 entries) matched and it isn't a tie
    var clear = scored[0].d >= 2.5 && best >= 3 && best - second >= 0.8;
    return { source: 'local', top: scored.slice(0, 3).map(function (x) { return { id: x.id, p: best ? Math.min(0.95, x.s / (best + 1.5)) : 0 }; }),
      covered: clear ? 0.8 : best >= 2 ? 0.45 : 0.05, urgent: /chest pain|faint|can.?t breathe|胸痛|胸口.*痛|晕倒|喘不上气/i.test(q) ? 0.9 : 0, on_topic: best >= 2 ? 0.9 : 0.4 };
  }

  // ------------------------------------------------------------------ asking
  // Resolve a question to a decision; render it in the chat (built lazily, even while hidden).
  // Returns a promise of {entry, kind: 'answer'|'closest'|'none'|'offtopic', urgent, message, res}.
  function ask(q) {
    q = (q || '').trim();
    if (!q || busy) return Promise.resolve(null);
    if (!panel) build();
    addUser(q);
    var move = A.isFull() ? 0 : A.S.move;
    var thinking = addThinking();
    busy = true; syncSend();
    var got = (mode !== 'jev' || !window.fetch || !ENDPOINT)
      ? new Promise(function (ok) { setTimeout(function () { ok(localMatch(q, move)); }, 250); })
      : fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: q, lang: A.S.lang, move: move, history: history.slice(-2) }) })
          .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .catch(function () {                       // fall back for this question only; check the helper again soon
            clearTimeout(reprobe); reprobe = setTimeout(probe, 30000);
            var r = localMatch(q, move); r.fallback = true; return r;
          });
    return got.then(function (res) {
      busy = false; syncSend();
      thinking.remove();
      return answer(q, res);
    });
  }

  function answer(q, res) {
    var top = res.top || [], first = top[0] && E[top[0].id];
    var offTopic = res.on_topic < 0.3, none = !first || res.covered < 0.3 || offTopic;
    var urgent = res.urgent > 0.5;
    track('ask_question', { source: res.source, answer: none ? null : first.id, urgent: urgent,
      covered: res.covered >= 0.7 ? 'yes' : res.covered >= 0.3 ? 'maybe' : 'no', on_topic: !offTopic });
    if (urgent) addAnswer(E[LIB.safety], { kind: 'urgent', res: res });
    if (none) {
      var msg = offTopic
        ? t('我只能回答八段锦练习相关的问题，比如功效、动作怎么调整、练习时要注意什么。', 'I can only help with Baduanjin practice: its benefits, how to adapt the moves, and what to keep in mind.')
        : t('这个问题我还没有准备好的答案。可以试试下面的话题，或者请教老师、医生。', 'I don’t have a prepared answer for that yet. Try one of these topics, or ask a teacher or doctor.');
      if (!urgent) addBot(msg, ['b-overview', 'mod-seated', 'k-breathing']);
      return { entry: urgent ? E[LIB.safety] : null, kind: offTopic ? 'offtopic' : 'none', urgent: urgent, message: msg, res: res };
    }
    history.push({ q: q, id: first.id });
    if (history.length > 4) history.shift();
    if (urgent && first.id === LIB.safety) return { entry: first, kind: 'answer', urgent: true, res: res };
    var unsure = (top[0].p < 0.5 || res.covered < 0.5);
    var rel = top.slice(1).filter(function (x) { return x.p >= (unsure ? 0.05 : 0.02) && E[x.id] && x.id !== LIB.safety; }).map(function (x) { return x.id; });
    addAnswer(first, { kind: unsure ? 'closest' : 'answer', res: res, related: rel });
    return { entry: first, kind: unsure ? 'closest' : 'answer', urgent: urgent, safety: urgent ? E[LIB.safety] : null, res: res };
  }

  // ------------------------------------------------------------------ rendering
  function scrollDown() { requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; }); }
  function addUser(q) { log.appendChild(h('div', { class: 'ask-msg user' }, [h('div', { class: 'ask-bubble', text: q })])); scrollDown(); }
  function addThinking() { var n = h('div', { class: 'ask-msg bot thinking', 'aria-label': t('正在查找', 'Looking') }, [h('div', { class: 'ask-bubble' }, [h('i'), h('i'), h('i')])]); log.appendChild(n); scrollDown(); return n; }
  function chip(id) {
    var e = E[id];
    return h('button', { class: 'ask-chip', text: L(e.q), onclick: function () { showEntry(e); } });
  }
  function showEntry(e) {
    if (busy) return;
    addUser(L(e.q));
    track('ask_question', { source: 'chip', answer: e.id });
    addAnswer(e, { kind: 'answer', res: { source: 'library' }, related: relatedOf(e) });
    history.push({ q: e.q.en, id: e.id });
  }
  function relatedOf(e) {
    if (e.move) return ['m' + e.move + '-benefit', 'm' + e.move + '-technique', 'm' + e.move + '-adapt'].filter(function (x) { return x !== e.id; });
    // the next two entries in the same category, wrapping around
    var same = LIB.entries.filter(function (x) { return x.cat === e.cat && !x.move; }).map(function (x) { return x.id; });
    var i = same.indexOf(e.id);
    return [same[(i + 1) % same.length], same[(i + 2) % same.length]].filter(function (x) { return x !== e.id; });
  }
  function addBot(text, chips) {
    log.appendChild(h('div', { class: 'ask-msg bot' }, [h('div', { class: 'ask-card' }, [
      h('p', { class: 'ask-text', text: text }),
      chips && chips.length ? h('div', { class: 'ask-chips' }, chips.map(chip)) : null
    ])]));
    scrollDown();
  }
  function sources(id) {
    var R = window.BDJ_REFS, list = R && R.byEntry && R.byEntry[id];
    if (!list || !list.length) return null;
    return h('details', { class: 'ask-refs' }, [h('summary', { text: t('参考来源', 'Sources') + ' (' + Math.min(2, list.length) + ')' }),
      h('ul', {}, list.slice(0, 2).map(function (r) {
        return h('li', {}, [h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', text: r.title }), h('span', { text: ' · ' + r.site + (r.year ? ' ' + r.year : '') })]);
      }))]);
  }
  function moveName(n) { var m = A.D.moves[n - 1]; return m ? (zh() ? '第' + m.seal + '式 ' + m.nameZh : 'Move ' + n + ' · ' + m.nameEn) : ''; }
  function addAnswer(e, o) {
    var res = o.res || {}, k = o.kind;
    var src = res.source === 'jev' ? t('AI 匹配', 'Matched by AI') + (res.top ? ' · ' + Math.round(res.top[0].p * 100) + '%' : '')
      : res.source === 'local' ? t('离线匹配', 'Offline match') : t('答案库', 'Answer library');
    var head = k === 'urgent' ? h('div', { class: 'ask-flag urgent', text: t('先注意安全', 'Safety first') })
      : k === 'closest' ? h('div', { class: 'ask-flag', text: t('最接近的答案', 'Closest answer I have') }) : null;
    var card = h('div', { class: 'ask-card' + (k === 'urgent' ? ' urgent' : '') }, [
      head,
      h('div', { class: 'ask-q', text: L(e.q) }),
      h('p', { class: 'ask-text', text: L(e.a) }),
      e.move ? h('button', { class: 'ask-watch', onclick: function () { if (A.isFull()) A.selectMode('move'); A.selectMove(e.move); track('ask_watch_move', { move: e.move }); if (window.matchMedia('(max-width: 980px)').matches) close(); } },
        [h('span', { text: t('看动作：', 'Watch ') + moveName(e.move) }), icon('i-arrow')]) : null,
      h('div', { class: 'ask-meta' }, [h('span', { class: 'ask-src ' + (res.source || ''), text: src })]),
      sources(e.id),
      o.related && o.related.length ? h('div', { class: 'ask-rel' }, [h('span', { class: 'ask-rel-k', text: t('相关问题', 'Related') })].concat(o.related.slice(0, 3).map(chip))) : null
    ]);
    log.appendChild(h('div', { class: 'ask-msg bot' }, [card]));
    scrollDown();
  }
  function syncSend() { var b = $('askSend'); if (b) b.disabled = busy || !input.value.trim(); }

  function intro() {
    log.innerHTML = '';
    var m = A.isFull() ? 0 : A.S.move;
    var groups = Object.keys(CAT).map(function (c) {
      return h('div', { class: 'ask-group' }, [h('div', { class: 'ask-group-k', text: L(CAT[c]) }), h('div', { class: 'ask-chips' }, LIB.starters[c].map(chip))]);
    });
    if (m) groups.push(h('div', { class: 'ask-group' }, [h('div', { class: 'ask-group-k', text: t('当前动作 · ', 'This move · ') + moveName(m) }),
      h('div', { class: 'ask-chips' }, ['benefit', 'technique', 'adapt'].map(function (x) { return chip('m' + m + '-' + x); }))]));
    log.appendChild(h('div', { class: 'ask-msg bot' }, [h('div', { class: 'ask-card intro' }, [
      h('p', { class: 'ask-text', text: t('你好！可以问我八段锦的功效、动作怎么调整（膝盖、腰、坐姿、孕期……），以及练习时要注意什么。所有答案都是事先写好的，不会临场生成。',
        'Hi! Ask me about Baduanjin: its benefits, how to adapt the moves (knees, back, seated, pregnancy…), and what to keep in mind while practising. Every answer is written in advance; nothing is made up on the spot.') })
    ].concat(groups))]));
  }

  // ------------------------------------------------------------------ panel
  function build() {
    statusEl = h('span', { class: 'ask-status' });
    log = h('div', { class: 'ask-log', role: 'log', 'aria-live': 'polite' });
    input = h('textarea', { id: 'askInput', rows: '1', maxlength: '500', placeholder: t('例如：膝盖不好能练吗？', 'e.g. Can I practise with bad knees?') });
    input.addEventListener('input', function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; syncSend(); });
    input.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); submit(); } if (ev.key === 'Escape') close(); });
    panel = h('aside', { class: 'ask-panel', id: 'askPanel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'askTitle', hidden: true }, [
      h('div', { class: 'ask-head' }, [
        h('span', { class: 'seal sm ask-seal', text: '问' }),
        h('div', { class: 'ask-titles' }, [h('h2', { id: 'askTitle', text: t('问一问 · 八段锦助手', 'Ask · Baduanjin helper') }), statusEl]),
        h('button', { class: 'icon-btn', 'aria-label': t('清空对话', 'New chat'), title: t('清空对话', 'New chat'), onclick: function () { history = []; intro(); } }, [icon('i-loop')]),
        h('button', { class: 'icon-btn', 'aria-label': t('关闭', 'Close'), onclick: close }, [icon('i-close')])
      ]),
      log,
      h('form', { class: 'ask-form', onsubmit: function (ev) { ev.preventDefault(); submit(); } }, [
        input,
        h('button', { class: 'ask-send', id: 'askSend', type: 'submit', 'aria-label': t('发送', 'Send'), disabled: true }, [icon('i-arrow')])
      ]),
      h('p', { class: 'ask-disclaimer', text: t('一般练习建议，不是医疗建议。有疾病或不适请咨询医生。', 'General practice guidance, not medical advice. See a doctor about health conditions or symptoms.') })
    ]);
    document.body.appendChild(panel);
    renderStatus();
    intro();
  }
  function submit() { var q = input.value; input.value = ''; input.style.height = 'auto'; ask(q); syncSend(); }
  function open() {
    if (!panel) build();
    panel.hidden = false; document.body.classList.add('ask-open');
    btn.setAttribute('aria-expanded', 'true');
    if (mode !== 'jev') { setMode('checking'); probe(); }
    track('ask_opened', {});
    setTimeout(function () { if (!window.matchMedia('(pointer: coarse)').matches) input.focus(); }, 50);
  }
  function close() { if (!panel) return; panel.hidden = true; document.body.classList.remove('ask-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  function toggle() { if (panel && !panel.hidden) close(); else open(); }

  // header button (before the Tour pill)
  var label = h('span', { text: t('问一问', 'Ask') });
  var btn = h('button', { class: 'pill ask-pill', id: 'btnAsk', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: toggle }, [
    h('span', { class: 'ask-dot', text: '问' }), label]);
  var actions = document.querySelector('.top-actions');
  if (actions) actions.insertBefore(btn, $('btnTour') || actions.firstChild);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && panel && !panel.hidden) close(); });

  A.onLang.push(function () {
    label.textContent = t('问一问', 'Ask');
    if (!panel) return;
    history = [];                                    // the transcript is rebuilt, so drop its context too
    var open_ = !panel.hidden; panel.remove(); panel = null; build();
    if (open_) { panel.hidden = false; }
  });
  if (mode === 'checking') probe();
  window.BDJAsk = { open: open, close: close, ask: function (q) { open(); return ask(q); }, query: ask, entry: function (id) { return E[id]; },
    isOpen: function () { return !!panel && !panel.hidden; }, mode: function () { return mode; }, local: localMatch, endpoint: ENDPOINT };
})();
