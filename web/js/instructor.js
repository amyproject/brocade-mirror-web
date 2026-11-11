/* AI 老师 · AI instructor (Brocade Mirror): a live voice conversation through Vapi.
   Ask anything out loud while you practise ("is my stance too low?", "what should I feel in move 3?"),
   in English or Chinese (follows the UI language). It is briefed with the eight moves (steps, key
   points, mistakes, cautions), the 问一问 answer library and safety rules, and knows which move and
   step you're on. It can also drive the player: pause / play / restart, speed, go to a move, camera
   view, mirror. Model: Claude (claude-haiku-5-5) via Vapi; voices: Deepgram Aura-2 Athena (English),
   Azure Xiaoxiao (Chinese); transcription: Deepgram.
   Uses the Vapi PUBLIC key from data (site.vapi.publicKey), which can only start web calls. The SDK
   (vendor/vapi.js) loads on first use. Needs the microphone, so open the page via http://localhost. */
(function () {
  'use strict';
  var A = window.BDJApp, CFG = A && A.D.site && A.D.site.vapi;
  if (!A || !CFG || !CFG.publicKey) return;
  var h = A.h, icon = A.icon, t = A.t, S = A.S, D = A.D;
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  function zh() { return S.lang === 'zh'; }

  var vapi = null, state = 'idle', startedAt = 0, lines = [], card = null, ui = {}, ctxTimer = 0, lastCtx = '';

  // ------------------------------------------------------------------ briefing
  function L(o, k) { return zh() ? (o[k + 'Zh'] || o[k + 'En']) : (o[k + 'En'] || o[k + 'Zh']); }
  function txt(o) { return o ? (zh() ? o.zh : o.en) : ''; }
  function moveBrief(m) {
    var out = ['## ' + (zh() ? '第' + m.seal + '式 ' : 'Move ' + m.id + ': ') + L(m, 'name') + (zh() ? '（' + m.nameEn + '）' : ' (' + m.nameZh + ')')];
    out.push(L(m, 'subtitle'));
    out.push((zh() ? '功效：' : 'Benefits: ') + L(m, 'benefits'));
    out.push((zh() ? '呼吸：' : 'Breathing: ') + L(m, 'breathing') + ' ' + L(m, 'reps'));
    (m.steps || []).forEach(function (s, i) { out.push((zh() ? '步骤' : 'Step ') + (i + 1) + ' [' + s.breath + ']: ' + txt(s)); });
    (m.keyPoints || []).forEach(function (k) { out.push((zh() ? '要领：' : 'Key point: ') + txt(k)); });
    (m.mistakes || []).forEach(function (x) { out.push((zh() ? '易错：' : 'Mistake: ') + txt(x) + ' → ' + (zh() ? x.fixZh : x.fixEn)); });
    if (m.caution) out.push((zh() ? '注意：' : 'Caution: ') + txt(m.caution));
    return out.join('\n');
  }
  function libraryBrief() {
    var lib = window.BDJ_ASK; if (!lib) return '';
    return lib.entries.filter(function (e) { return !e.move; }).map(function (e) { return 'Q: ' + txt(e.q) + '\nA: ' + txt(e.a); }).join('\n\n');
  }
  function planBrief() {
    var J = window.BDJJourney && window.BDJJourney.state && window.BDJJourney.state();
    if (!J || !J.level) return '';
    return 'Learner plan: level ' + J.level + (J.goals && J.goals.length ? ', goals ' + J.goals.join(', ') : '') + ', ' + (J.minutes || 10) + ' min/day, ' + (J.days || 5) + ' days/week.';
  }
  function where() {
    if (A.isFull()) return 'The learner is following the full routine (all eight moves, ~80 s per round), at ' + S.speed + '× speed.';
    var m = D.moves[S.move - 1], i = A.R.seg;
    return 'The learner is on move ' + m.id + ' (' + m.nameEn + ' / ' + m.nameZh + ')' + (i >= 0 ? ', step ' + (i + 1) + ' of ' + m.steps.length : '') +
      ', camera ' + (A.gridOn() ? 'four angles' : S.angle) + (S.mirror ? ', mirrored' : '') + ', ' + S.speed + '× speed, video ' + (A.isPlaying() ? 'playing' : 'paused') + '.';
  }
  function systemPrompt() {
    var lang = zh() ? 'Speak Mandarin Chinese (简体中文) unless the learner switches to English.' : 'Speak English unless the learner switches to Chinese.';
    return [
      'You are a calm, warm Baduanjin (八段锦, Eight Brocades) instructor inside the Brocade Mirror practice app. The learner is practising right now and talks to you hands-free, so ' +
      'keep every reply short and spoken: one to three sentences, no lists, no markdown, no emojis. ' + lang +
      ' In English, call the practice "the Eight Brocades" (the voice mispronounces "Baduanjin"; if you must say it, write "Bah-dwahn-jin"), and name moves by their English names.',
      'Teach from the reference below (the eight moves and the answer library). Give practical cues the learner can apply immediately (stance, breath, where to look, what to feel). ' +
      'If something is not covered, say so briefly and give only general, conservative guidance.',
      'Safety: you are not a doctor and must not diagnose or promise health effects. If the learner reports chest pain, faintness, severe shortness of breath, sudden numbness or weakness, ' +
      'severe dizziness, or an injury, tell them to stop, sit down and seek medical help (emergency services if severe), and do not continue coaching. For pregnancy, heart or blood-pressure ' +
      'conditions, recent surgery, osteoporosis or joint replacements, suggest the gentler variation from the reference and checking with their doctor. Never encourage pushing through pain.',
      'You can control the practice video with the tools: control_playback (play, pause, restart), set_speed (0.25 to 2), go_to_move (1 to 8, or 0 for the full routine), set_view ' +
      '(front, left, right, back, grid) and toggle_mirror. Use them when the learner asks ("slow it down", "show me the side view", "next move"), then confirm in a few words.',
      planBrief(),
      'Current state: ' + where() + ' Updates arrive as system messages while you talk.',
      '# Reference: the eight moves',
      D.moves.map(moveBrief).join('\n\n'),
      '# Reference: answer library (pre-written, use as the basis for health and practice questions)',
      libraryBrief()
    ].filter(Boolean).join('\n\n');
  }
  var TOOLS = [
    { type: 'function', async: true, function: { name: 'control_playback', description: 'Play, pause or restart the practice video.', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['play', 'pause', 'restart'] } }, required: ['action'] } } },
    { type: 'function', async: true, function: { name: 'set_speed', description: 'Set the playback speed (0.25 slow motion to 2 double speed, 1 normal).', parameters: { type: 'object', properties: { speed: { type: 'number' } }, required: ['speed'] } } },
    { type: 'function', async: true, function: { name: 'go_to_move', description: 'Open one of the eight moves (1-8), or 0 for the full routine.', parameters: { type: 'object', properties: { move: { type: 'integer' } }, required: ['move'] } } },
    { type: 'function', async: true, function: { name: 'set_view', description: 'Change the camera view of the avatar.', parameters: { type: 'object', properties: { view: { type: 'string', enum: ['front', 'left', 'right', 'back', 'grid'] } }, required: ['view'] } } },
    { type: 'function', async: true, function: { name: 'toggle_mirror', description: 'Mirror the video left-right so it matches the learner facing the screen.', parameters: { type: 'object', properties: {} } } }
  ];
  function assistant() {
    return {
      name: 'Brocade Mirror instructor',
      firstMessage: zh() ? '你好，我是你的八段锦老师。练的时候有任何问题，直接问我就好。' : 'Hi, I’m your Eight Brocades instructor. Ask me anything while you practise.',
      model: { provider: 'anthropic', model: CFG.model || 'claude-haiku-5-5', temperature: 0.4, maxTokens: 300,
        messages: [{ role: 'system', content: systemPrompt() }], tools: TOOLS },
      voice: zh() ? { provider: 'azure', voiceId: 'zh-CN-XiaoxiaoNeural' } : { provider: 'deepgram', voiceId: 'athena', model: 'aura-2' },
      transcriber: zh() ? { provider: 'deepgram', model: 'nova-2', language: 'zh-CN' } : { provider: 'deepgram', model: 'nova-3', language: 'en' },
      maxDurationSeconds: 1200,
      silenceTimeoutSeconds: 180,
      backgroundSound: 'off',
      clientMessages: ['conversation-update', 'tool-calls', 'speech-update', 'status-update'],
      serverMessages: []
    };
  }

  // ------------------------------------------------------------------ tools → player
  function runTool(name, args) {
    track('instructor_tool', { tool: name });
    switch (name) {
      case 'control_playback':
        if (args.action === 'pause') A.pause();
        else if (args.action === 'restart') { A.gotoSeg(A.isFull() ? Math.max(0, A.R.seg) : 0); A.play(); }
        else A.play();
        break;
      case 'set_speed': A.setSpeed(Math.max(0.25, Math.min(2, +args.speed || 1))); break;
      case 'go_to_move':
        var n = +args.move;
        if (n === 0) A.selectMode('full');
        else if (n >= 1 && n <= 8) { if (A.isFull()) A.selectMode('move'); A.selectMove(n); }
        break;
      case 'set_view':
        if (args.view === 'grid') { if (!A.gridOn()) A.toggleGrid(); }
        else A.setAngle(args.view);
        break;
      case 'toggle_mirror': A.toggleMirror(); break;
    }
  }
  function onMessage(msg) {
    if (!msg) return;
    if (msg.type === 'tool-calls' && msg.toolCallList) {
      msg.toolCallList.forEach(function (c) {
        var f = c.function || {}, args = f.arguments;
        if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }
        runTool(f.name, args || {});
      });
    } else if (msg.type === 'conversation-update' && msg.conversation) {
      // the turns as the model wrote them (a transcript of its own audio garbles names like Baduanjin)
      lines = msg.conversation.filter(function (m) { return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim(); })
        .slice(-6).map(function (m) { return { who: m.role === 'assistant' ? 'ai' : 'me', text: m.content.trim() }; });
      renderLines();
    }
  }

  // ------------------------------------------------------------------ UI
  function buildCard() {
    ui.state = h('span', { class: 'ins-state' });
    ui.log = h('div', { class: 'ins-log', 'aria-live': 'polite' });
    ui.mute = h('button', { class: 'ins-btn', onclick: function () { if (!vapi) return; var m = !vapi.isMuted(); vapi.setMuted(m); ui.mute.classList.toggle('on', m); ui.mute.textContent = m ? t('取消静音', 'Unmute') : t('静音', 'Mute'); } }, [t('静音', 'Mute')]);
    card = h('div', { class: 'ins-card', role: 'dialog', 'aria-label': t('AI 老师', 'AI instructor'), hidden: true }, [
      h('div', { class: 'ins-head' }, [
        h('span', { class: 'ins-orb' }, [h('i'), h('i'), h('i')]),
        h('div', { class: 'ins-titles' }, [h('b', { text: t('AI 老师', 'AI instructor') }), ui.state]),
        ui.mute,
        h('button', { class: 'ins-btn end', onclick: stop }, [t('结束', 'End')])
      ]),
      ui.log,
      h('p', { class: 'ins-note', text: t('由 Vapi + Claude 实时生成，可能出错；不是医疗建议。', 'Live AI (Vapi + Claude): it can make mistakes, and it isn’t medical advice.') })
    ]);
    document.body.appendChild(card);
  }
  function setState(s, why) {
    state = s;
    if (!card) buildCard();
    card.hidden = s === 'idle';
    card.dataset.state = s;
    ui.state.textContent = ({ loading: t('正在连接…', 'Connecting…'), live: t('在听', 'Listening'), speaking: t('老师在说', 'Speaking'),
      error: why || t('连接失败', 'Couldn’t connect') })[s] || '';
    if (window.BDJVoiceMenu) window.BDJVoiceMenu.sync();
  }
  function renderLines() {
    if (!ui.log) return;
    ui.log.innerHTML = '';
    lines.forEach(function (l) { ui.log.appendChild(h('p', { class: 'ins-line ' + l.who, text: l.text })); });
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  // ------------------------------------------------------------------ call lifecycle
  function loadSdk() {
    if (window.Vapi) return Promise.resolve();
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = 'vendor/vapi.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }
  function start() {
    if (state === 'loading' || state === 'live' || state === 'speaking') return;
    if (!/^https?:$/.test(location.protocol) || !navigator.mediaDevices) {
      setState('error', t('请用 http://localhost:8765 打开（sh web/serve.sh），浏览器才允许使用麦克风。', 'Open the page at http://localhost:8765 (sh web/serve.sh) so the browser allows the microphone.'));
      return;
    }
    if (window.BDJVoice) { window.BDJVoice.stopCoach(); window.BDJVoice.stop(); }   // one voice at a time
    lines = []; if (ui.log) ui.log.innerHTML = '';
    setState('loading');
    loadSdk().then(function () {
      vapi = new window.Vapi(CFG.publicKey);
      vapi.on('call-start', function () { startedAt = Date.now(); setState('live'); A.duck(true); track('instructor_started', { lang: S.lang }); });
      vapi.on('speech-start', function () { setState('speaking'); });
      vapi.on('speech-end', function () { if (state !== 'idle') setState('live'); });
      vapi.on('message', onMessage);
      vapi.on('call-end', function () { ended(); });
      vapi.on('error', function (e) {
        var m = (e && (e.errorMsg || (e.error && (e.error.message || e.error.msg)) || e.message)) || '';
        console.warn('vapi error', m || e);
        if (state === 'loading') setState('error', t('连接失败：', 'Couldn’t connect: ') + String(m).slice(0, 120));
      });
      return vapi.start(assistant());
    }).catch(function (e) {
      setState('error', t('连接失败：', 'Couldn’t connect: ') + String((e && e.message) || e).slice(0, 120));
    });
    // keep the instructor told where the learner is
    clearInterval(ctxTimer);
    ctxTimer = setInterval(function () {
      if (!vapi || (state !== 'live' && state !== 'speaking')) return;
      var w = A.isFull() ? 'full|' + S.speed : S.move + '|' + S.angle + '|' + S.speed + '|' + S.mirror + '|' + A.gridOn();
      if (w === lastCtx) return;
      if (lastCtx) vapi.send({ type: 'add-message', message: { role: 'system', content: 'State update: ' + where() } });
      lastCtx = w;
    }, 1500);
  }
  function ended() {
    clearInterval(ctxTimer); lastCtx = '';
    if (startedAt) track('instructor_ended', { seconds: Math.round((Date.now() - startedAt) / 1000) });
    startedAt = 0; vapi = null; A.duck(false);
    setState('idle');
  }
  function stop() { if (vapi) { try { vapi.stop(); } catch (e) { } } ended(); }

  A.onLang.push(function () { if (state === 'live' || state === 'speaking') { stop(); } if (card) { card.remove(); card = null; ui = {}; } });
  window.BDJInstructor = { start: start, stop: stop, state: function () { return state; }, prompt: systemPrompt, assistant: assistant, runTool: runTool };
})();
