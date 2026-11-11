/* 解说 + 语音教练 · Voiceover and voice coach (Brocade Mirror).
   Voiceover: English clips pre-generated with Deepgram Aura-2 (data-voice.js, tools/voice_content.py);
   Chinese uses the system voice (Deepgram has no Chinese voice). Each step's clip starts with the
   step; if it is still talking when the step ends, the video waits for it. A move's explanation
   plays the first time the move is opened with voiceover on; the full routine announces each move.
   Coach: hands-free listening; each utterance → local helper /api/stt (Deepgram nova-3) → a voice
   command (play, pause, slower, next move, 第三式, mirror, left view…) or a question for 问一问
   (TypeSafe Jev), answered aloud (English via /api/tts, Chinese via the system voice). The API keys
   stay in the helper (tools/ask_server.py); the microphone needs http://localhost (sh web/serve.sh). */
(function () {
  'use strict';
  var A = window.BDJApp, V = window.BDJ_VOICE;
  if (!A || !V) return;
  var h = A.h, icon = A.icon, t = A.t, S = A.S;
  var U = window.U || function (p) { return p; };
  var $ = function (id) { return document.getElementById(id); };
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  function zh() { return S.lang === 'zh'; }
  var KEY = 'bdj.voice.v1';
  var prefs = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  function savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { } }

  // ------------------------------------------------------------------ icons (added to the page sprite)
  var sprite = document.querySelector('svg symbol') && document.querySelector('svg symbol').parentNode;
  if (sprite) sprite.insertAdjacentHTML('beforeend',
    '<symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-voice" viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>');

  // ------------------------------------------------------------------ speaking (one voice at a time)
  var audio = new Audio(); audio.preload = 'auto';
  // speaking: {id, kind: 'step'|'name'|'intro'|'reply', sys (system voice), done, u, url, wd}
  var speaking = null;
  var recent = [];        // what we said lately, to recognise our own voice coming back through the mic
  var zhVoice = null;
  function pickZh() {
    if (!window.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices();
    zhVoice = vs.filter(function (v) { return /^zh[-_]CN/i.test(v.lang); })[0] || vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
    return zhVoice;
  }
  if (window.speechSynthesis) { pickZh(); speechSynthesis.onvoiceschanged = pickZh; }
  function useSystemZh() { return zh() && !!window.speechSynthesis; }
  // Safari lets an <audio> element play only after a tap: unlock ours on the first one, so voiceover
  // that is on from saved preferences can speak without another click.
  var unlocked = false;
  document.addEventListener('pointerdown', function () {
    if (unlocked || speaking) return; unlocked = true;
    var first = Object.keys(V.clips)[0]; if (!first) return;
    audio.muted = true; audio.src = U(V.path + first + '.mp3');
    var p = audio.play(); var undo = function () { audio.pause(); audio.muted = false; };
    if (p && p.then) p.then(undo, undo); else undo();
  }, true);

  function remember(text) {
    var now = Date.now();
    recent = recent.filter(function (r) { return now - r.at < 30000; }).slice(-3);
    recent.push({ text: text, at: now });
  }
  function words(s) { s = (s || '').toLowerCase(); return (s.match(/[a-z]{3,}/g) || []).concat(s.replace(/[^一-鿿]/g, '').split('')); }
  function isEcho(heard) {
    var w = words(heard); if (w.length < 3) return false;
    return recent.some(function (r) {
      var set = {}; words(r.text).forEach(function (x) { set[x] = 1; });
      var hit = w.filter(function (x) { return set[x]; }).length;
      return hit / w.length >= 0.6;
    });
  }

  // kinds: stop only speech of these kinds (default: anything)
  function stopSpeaking(kinds) {
    var s = speaking;
    if (!s || (kinds && kinds.indexOf(s.kind) < 0)) return;
    speaking = null; clearTimeout(s.wd);
    audio.onended = audio.onerror = null; try { audio.pause(); } catch (e) { }
    if (s.url) URL.revokeObjectURL(s.url);
    if (s.sys && window.speechSynthesis) speechSynthesis.cancel();
    A.duck(false); if (s.done) s.done(true);
  }
  // what: {clip: id, kind} (pre-generated voiceover) or {text, kind: 'reply'} (coach). done(cancelled)
  function speak(what, done) {
    stopSpeaking();
    var c = what.clip && V.clips[what.clip];
    var text = c ? (zh() ? c.zh : c.en) : what.text;
    var me = speaking = { id: what.clip || text, kind: what.kind || 'reply', done: done };
    remember(text);
    var finish = function () {
      if (speaking !== me) return;
      speaking = null; clearTimeout(me.wd);
      if (me.url) URL.revokeObjectURL(me.url);
      A.duck(false); if (done) done(false);
    };
    // watchdog: some browsers drop the end event (e.g. a garbage-collected utterance); never hang
    var est = c && c.dur && !zh() ? c.dur : text.length / (zh() ? 4 : 13);
    me.wd = setTimeout(finish, (est + 5) * 1000);
    A.duck(true);
    var sysVoice = function (lang) {
      if (speaking !== me) return;
      if (!window.speechSynthesis) { finish(); return; }
      var u = me.u = new SpeechSynthesisUtterance(text); me.sys = true;
      u.lang = lang; if (lang === 'zh-CN' && (zhVoice || pickZh())) u.voice = zhVoice;
      u.rate = lang === 'zh-CN' ? 0.95 : 1;
      u.onend = u.onerror = finish;
      speechSynthesis.speak(u);
    };
    if (zh()) { sysVoice('zh-CN'); return; }            // Deepgram has no Chinese voice
    if (c) { playUrl(U(V.path + what.clip + '.mp3'), finish); return; }
    var url = helper('/api/tts');
    if (!url) { sysVoice('en-US'); return; }
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { if (speaking !== me) return; me.url = URL.createObjectURL(b); playUrl(me.url, finish); })
      .catch(function () { sysVoice('en-US'); });
  }
  function playUrl(url, finish) {
    audio.onended = audio.onerror = finish;
    audio.muted = false; audio.src = url;
    var p = audio.play(); if (p && p.catch) p.catch(finish);
  }

  // ------------------------------------------------------------------ voiceover
  // One 100 ms tick drives it: narrate a step when playback enters it; if the previous step's narration
  // is still going at the boundary, pause and wait for it; a loop back in time says the step again.
  var vo = { on: !!prefs.voiceover, said: -9, key: '', waiting: false, introDone: {}, introPending: false, lastT: 0 };
  function v() { return A.master().video; }
  function narrate(i) {
    var full = A.isFull(), id = full ? 'm' + (i + 1) + '-name' : 'm' + S.move + '-s' + (i + 1);
    if (!V.clips[id]) return;
    vo.said = i;
    speak({ clip: id, kind: full ? 'name' : 'step' }, function (cancelled) {
      if (cancelled) { vo.waiting = false; return; }
      if (vo.waiting) { vo.waiting = false; A.play(); }   // the video waited at the next step: carry on
    });
  }
  function resetFor(key) {                              // the move or the mode changed
    vo.key = key; vo.said = -9; vo.waiting = false;
    stopSpeaking(['step', 'name']);                     // leave an explanation or a coach reply alone
    vo.introPending = vo.on && !A.isFull() && !vo.introDone[S.move];
    if (vo.introPending) {
      var n = S.move;
      setTimeout(function () {
        if (vo.on && !A.isFull() && S.move === n && !vo.introDone[n]) explain(n); else vo.introPending = false;
      }, 400);
    }
  }
  setInterval(function () {
    var key = A.isFull() ? 'full' : 'm' + S.move;
    if (key !== vo.key) resetFor(key);
    if (!vo.on || vo.introPending) return;
    var vid = v(); if (!vid || vid.readyState < 2 || vid.seeking) return;   // a new angle / grid is still loading
    var tm = vid.currentTime, playing = A.isPlaying();
    if (vo.waiting) {
      if (!playing) { vo.lastT = tm; return; }
      vo.waiting = false; stopSpeaking(['step']);       // the listener pressed play: don't make them wait
    }
    if (playing && tm + 0.3 < vo.lastT) vo.said = -9;   // a loop jumped back: say the step again
    vo.lastT = tm;
    if (!playing) return;
    var cur = A.segAt(tm);
    if (cur < 0 || cur === vo.said) return;
    if (speaking && speaking.kind === 'step' && vo.said >= 0 && cur === vo.said + 1) { vo.waiting = true; A.pause(); return; }
    if (speaking && (speaking.kind === 'intro' || speaking.kind === 'reply')) return;  // don't talk over them
    narrate(cur);
  }, 100);
  // explain the move (first time it's opened with voiceover on, and when asked); then carry on playing
  function explain(n) {
    n = n || S.move; vo.introPending = false;
    if (!V.clips['m' + n + '-intro']) return;
    vo.introDone[n] = true; vo.waiting = false; vo.said = -9;
    var resume = A.isPlaying();
    A.pause();
    speak({ clip: 'm' + n + '-intro', kind: 'intro' }, function (cancelled) { if (!cancelled && resume) A.play(); });
    track('voiceover_explain', { move: n });
  }

  function setVoiceover(on) {
    vo.on = on; prefs.voiceover = on; savePrefs();
    vo.said = -9; vo.waiting = false;
    if (!on) { vo.introPending = false; stopSpeaking(['step', 'name', 'intro']); }
    else if (!A.isFull() && !vo.introDone[S.move]) explain();
    renderVoBtn();
    track('voiceover_toggled', { on: on, lang: S.lang, voice: zh() ? 'system-zh' : V.voice });
  }
  var voLabel = h('span', {});
  var voBtn = h('button', { class: 'tog', id: 'btnVoice', 'aria-pressed': 'false', onclick: function () { setVoiceover(!vo.on); } }, [icon('i-voice'), voLabel]);
  function renderVoBtn() {
    voLabel.textContent = t('解说', 'Voiceover');
    voBtn.setAttribute('aria-pressed', vo.on ? 'true' : 'false');
    voBtn.classList.toggle('on', vo.on);
    voBtn.title = useSystemZh() ? '中文解说使用系统语音' : t('英文解说由 Deepgram 生成', 'Narration voiced by Deepgram Aura');
  }
  var toggles = document.querySelector('.toggles');
  if (toggles) toggles.appendChild(voBtn);
  renderVoBtn();

  // ------------------------------------------------------------------ coach: helper + microphone
  // The helper only serves pages it served itself (http://localhost:8765); from file:// there is none.
  var SERVED = /^https?:$/.test(location.protocol);
  function helper(p) { return SERVED ? p : null; }
  var co = { on: false, starting: false, stopping: false, stream: null, ctx: null, an: null, rec: null, talking: false, lastVoice: 0, startAt: 0, floor: 0.01, busy: false, timer: 0 };

  var bar, barState, barHeard, barReply;
  function buildBar() {
    barState = h('span', { class: 'coach-state' });
    barHeard = h('span', { class: 'coach-heard' });
    barReply = h('span', { class: 'coach-reply' });
    bar = h('div', { class: 'coach-bar', role: 'status', 'aria-live': 'polite', hidden: true }, [
      h('span', { class: 'coach-mic' }, [icon('i-mic')]),
      h('div', { class: 'coach-txt' }, [barState, barHeard, barReply]),
      h('button', { class: 'icon-btn', 'aria-label': t('停止语音教练', 'Stop voice coach'), onclick: function () { stopCoach(); } }, [icon('i-close')])
    ]);
    document.body.appendChild(bar);
  }
  function setBar(state, heard, reply) {
    if (!bar) buildBar();
    bar.hidden = false; bar.dataset.state = state;
    barState.textContent = {
      listening: t('正在听…', 'Listening…'), hearing: t('在听你说…', 'Hearing you…'), thinking: t('想一想…', 'Thinking…'),
      speaking: t('教练回答中', 'Coach speaking'), error: t('语音教练不可用', 'Voice coach unavailable')
    }[state] || '';
    if (heard !== undefined) barHeard.textContent = heard ? '“' + heard + '”' : state === 'error' ? '' : t('说“暂停”“慢一点”“下一式”，或直接提问', 'Say “pause”, “slower”, “next move”, or ask a question');
    if (reply !== undefined) barReply.textContent = reply || '';
  }

  function startCoach() {
    if (co.on || co.starting) return;
    if (!SERVED || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setBar('error', '', t('需要用 http://localhost:8765 打开页面（运行 sh web/serve.sh），浏览器才允许使用麦克风。', 'Open the page at http://localhost:8765 (run sh web/serve.sh) so the browser allows the microphone.'));
      return;
    }
    co.starting = true;
    fetch(helper('/api/ask')).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.voice) throw new Error('nokey');
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    }).then(function (stream) {
      if (!co.starting) { stream.getTracks().forEach(function (tr) { tr.stop(); }); return; }  // stopped while asking
      co.starting = false; co.on = true; co.stream = stream;
      var AC = window.AudioContext || window.webkitAudioContext;
      co.ctx = new AC(); co.an = co.ctx.createAnalyser(); co.an.fftSize = 1024;
      if (co.ctx.state === 'suspended' && co.ctx.resume) co.ctx.resume();
      co.ctx.createMediaStreamSource(stream).connect(co.an);
      syncPill();
      setBar('listening', '', '');
      newRecorder(); co.timer = setInterval(vad, 50);
      track('coach_started', { lang: S.lang });
      if (!prefs.coachHello) { prefs.coachHello = true; savePrefs(); co.busy = true; say(t('我在听。可以说暂停、慢一点、下一式，或者问我问题。', 'I’m listening. Say pause, slower or next move, or ask me a question.')); }
    }).catch(function (e) {
      co.starting = false;
      var why = e && e.message === 'nokey' ? t('助手没有 Deepgram key。', 'The helper has no Deepgram key.')
        : e && e.name === 'NotAllowedError' ? t('麦克风权限被拒绝。', 'Microphone permission was denied.')
        : t('连不上本地助手：运行 sh web/serve.sh 并用 http://localhost:8765 打开。', 'Can’t reach the local helper: run sh web/serve.sh and open http://localhost:8765.');
      setBar('error', '', why);
    });
  }
  function stopCoach() {
    co.starting = false;
    clearInterval(co.timer);
    co.on = false;                                      // recorders' onstop won't start new ones
    if (co.rec && co.rec.state !== 'inactive') { co.rec.sendIt = false; try { co.rec.stop(); } catch (e) { } }
    if (co.stream) co.stream.getTracks().forEach(function (tr) { tr.stop(); });
    if (co.ctx) try { co.ctx.close(); } catch (e) { }
    co.stream = co.ctx = co.rec = null; co.busy = false; co.stopping = false;
    stopSpeaking(['reply']);
    syncPill();
    if (bar) bar.hidden = true;
    track('coach_stopped', {});
  }
  function mime() {
    var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }
  // each recorder keeps its own chunks; a stop that is still pending blocks another restart
  function newRecorder() {
    if (!co.on) return;
    var m = mime(), rec = m ? new MediaRecorder(co.stream, { mimeType: m }) : new MediaRecorder(co.stream), chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      if (co.rec === rec) { co.rec = null; co.stopping = false; }
      var blob = new Blob(chunks, { type: rec.mimeType || m || 'audio/webm' });
      if (rec.sendIt && co.on && blob.size > 3000) transcribe(blob);
      if (!co.rec) newRecorder();
    };
    co.rec = rec; co.talking = false; co.startAt = performance.now();
    rec.start(250);
  }
  function restartRec(send) {
    if (co.stopping) return;
    var rec = co.rec;
    if (!rec || rec.state === 'inactive') { newRecorder(); return; }
    co.stopping = true; rec.sendIt = send;
    try { rec.stop(); } catch (e) { co.stopping = false; co.rec = null; newRecorder(); }
  }
  var buf = new Float32Array(1024);
  function vad() {
    if (!co.on || !co.an || co.stopping) return;
    var now = performance.now();
    // thinking, or the coach / an explanation / the system voice is talking: discard what the mic hears
    var selfTalk = speaking && (speaking.kind === 'reply' || speaking.kind === 'intro' || speaking.sys);
    if (co.busy || selfTalk) { if (co.talking || now - co.startAt > 1500) restartRec(false); return; }
    co.an.getFloatTimeDomainData(buf);
    var sum = 0; for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    var rms = Math.sqrt(sum / buf.length);
    if (!co.talking) co.floor = co.floor * 0.97 + Math.min(rms, 0.05) * 0.03;
    // step narration plays through the page (echo cancellation removes most of it): listen with a higher bar
    var loud = rms > Math.max(0.012, co.floor * 2.8) * (speaking ? 2.2 : 1);
    if (loud) { if (!co.talking) { co.talking = true; setBar('hearing'); } co.lastVoice = now; }
    if (co.talking && (now - co.lastVoice > 900 || now - co.startAt > 12000)) restartRec(true);
    else if (!co.talking && now - co.startAt > 8000) restartRec(false); // keep idle recordings short
  }
  function transcribe(blob) {
    co.busy = true; setBar('thinking');
    fetch(helper('/api/stt?lang=' + (zh() ? 'zh' : 'en')), { method: 'POST', headers: { 'Content-Type': (blob.type || 'audio/webm').split(';')[0] }, body: blob })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var q = (j.transcript || '').trim();
        if (!q || isEcho(q)) { co.busy = false; setBar('listening', ''); return; }   // silence, or our own narration
        setBar('thinking', q, '');
        handle(q);
      })
      .catch(function () { co.busy = false; setBar('listening', '', t('没听清，请再说一遍。', 'Didn’t catch that, please try again.')); });
  }
  function say(text, then) {
    co.busy = true;
    setBar('speaking', undefined, text);
    speak({ text: text, kind: 'reply' }, function () {
      co.busy = false;
      if (co.on) { restartRec(false); setBar('listening'); }   // drop anything recorded while we spoke
      if (then) then();
    });
  }

  // ------------------------------------------------------------------ commands
  var NUMS = { one: 1, first: 1, two: 2, second: 2, three: 3, third: 3, four: 4, fourth: 4, five: 5, fifth: 5, six: 6, sixth: 6, seven: 7, seventh: 7, eight: 8, eighth: 8,
    '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8 };
  var SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  function num(x) { return /^\d$/.test(x) ? +x : NUMS[x]; }
  function moveName(n) { var m = A.D.moves[n - 1]; return zh() ? '第' + m.seal + '式，' + m.nameZh : 'Move ' + n + ', ' + m.nameEn; }
  function speedTo(sp) { A.setSpeed(sp); return t('速度 ' + sp + ' 倍', 'Speed ' + sp + '×'); }
  function command(raw) {
    var q = raw.toLowerCase().replace(/[.,!?。，！？、]/g, ' ').replace(/\s+/g, ' ').trim();
    var qz = q.replace(/\s/g, ''), words = q.split(' ').length;
    var cjk = /[一-鿿]/.test(q);                       // judge by the words heard, not the UI language
    var short = cjk ? qz.length <= 6 : words <= 5, mid = cjk ? qz.length <= 6 : words <= 6;
    var m;
    if (/stop listening|stop (the )?coach|goodbye|退出|关闭教练|停止(聆)?听/.test(q)) return function () { say(t('好的，下次见。', 'Okay, see you next time.'), stopCoach); };
    if (/(voice ?over|narration|解说)/.test(q) && short) {
      var off = /\boff\b|关|停/.test(q);
      return function () { setVoiceover(!off); return off ? t('解说已关闭', 'Voiceover off') : null; };
    }
    if (short && /^(please )?(explain|describe)( (this|the) move)?$|^what is this move$|^(讲解|解释|介绍)(一下)?(这一?式|这个动作)?$/.test(q)) return function () {
      if (A.isFull()) { A.selectMode('move'); setTimeout(function () { explain(); }, 350); } else explain();
      return null;
    };
    if (mid && /full routine|whole routine|all eight|全套|整套/.test(q)) return function () { A.selectMode('full'); return t('全套跟练', 'Full routine'); };
    if (mid && (m = q.match(/(?:move|form|number|section|exercise)\s*(\d|one|two|three|four|five|six|seven|eight)\b/) || q.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|\d)(?:st|nd|rd|th)? (?:move|form)/) || qz.match(/第([1-8一二三四五六七八])[式节个]/))) {
      var n = num(m[1]);
      if (n >= 1 && n <= 8) return function () { if (A.isFull()) A.selectMode('move'); A.selectMove(n); return moveName(n); };
    }
    if (short && /^(next|next move|next one|go next|skip)$|下一式|下一个|下一节/.test(q)) return function () { if (A.isFull()) A.selectMode('move'); A.selectMove(Math.min(8, S.move + 1)); return moveName(S.move); };
    if (short && /^(previous|previous move|last move|go back)$|上一式|上一个/.test(q)) return function () { if (A.isFull()) A.selectMode('move'); A.selectMove(Math.max(1, S.move - 1)); return moveName(S.move); };
    if (short && /half speed|一半速度|半速/.test(q)) return function () { return speedTo(0.5); };
    if (short && /slower|slow down|slowly|慢一?点|放慢|慢些/.test(q)) return function () { var i = SPEEDS.indexOf(S.speed); return speedTo(SPEEDS[Math.max(0, (i < 0 ? 3 : i) - 1)]); };
    if (short && /faster|speed up|quicker|快一?点|加快|快些/.test(q)) return function () { var i = SPEEDS.indexOf(S.speed); return speedTo(SPEEDS[Math.min(SPEEDS.length - 1, (i < 0 ? 3 : i) + 1)]); };
    if (short && /normal speed|regular speed|full speed|正常速度|原速/.test(q)) return function () { return speedTo(1); };
    if (short && /^(again|repeat|restart|one more time)$|from the (top|start|beginning)|再来|重来|从头|重新/.test(q)) return function () { A.gotoSeg(A.isFull() ? Math.max(0, A.R.seg) : 0); A.play(); return t('从头开始', 'From the top'); };
    if (short && /^(mirror|mirror it|mirror mode|flip)$|镜像/.test(q)) return function () { A.toggleMirror(); return S.mirror ? t('镜像已开', 'Mirror on') : t('镜像已关', 'Mirror off'); };
    if (short && /(4|four) (angles|views)|all angles|^grid$|四视角|四个角度/.test(q)) return function () { if (!A.gridOn()) A.toggleGrid(); return t('四视角', 'Four angles'); };
    // camera angles only as a whole phrase: "my back hurts" or 左边膝盖疼 is a question, not a command
    m = q.match(/^(?:show (?:me )?|switch to |go to )?(?:the )?(front|left|right|back)(?: view| side| angle)?$/) || qz.match(/^(?:切换到|换到|看)?(正面|左侧|左边|右侧|右边|背面|后面)(?:视角|角度)?$/);
    if (m) {
      var a = { '正面': 'front', '左侧': 'left', '左边': 'left', '右侧': 'right', '右边': 'right', '背面': 'back', '后面': 'back' }[m[1]] || m[1];
      return function () { return A.setAngle(a) ? t({ front: '正面', left: '左侧', right: '右侧', back: '背面' }[a], a[0].toUpperCase() + a.slice(1) + ' view') : t('这个角度没有视频', 'That angle isn’t filmed for this move'); };
    }
    if (short && /^(play|start|go|resume|continue|begin|let'?s go|let'?s start)\b|开始|播放|继续/.test(q)) return function () { A.play(); return null; };
    if (short && /^(pause|stop|wait|hold on|hold it|hang on)\b|暂停|停一下|^停$|等一下/.test(q)) return function () { A.pause(); return null; };
    return null;
  }
  function handle(q) {
    var cmd = command(q);
    stopSpeaking(['step', 'name']); vo.waiting = false;          // the listener talked over the narration
    if (cmd) {
      track('coach_command', { lang: S.lang });
      var ack = cmd();
      if (ack) say(ack); else { co.busy = false; if (co.on) setBar('listening', undefined, ''); }
      return;
    }
    if (!window.BDJAsk) { say(t('问答功能没有加载。', 'The Q&A isn’t available.')); return; }
    track('coach_question', { lang: S.lang });
    A.pause();
    window.BDJAsk.query(q).then(function (d) {
      if (!d) { co.busy = false; setBar('listening'); return; }
      var parts = [], L = function (e) { return zh() ? e.a.zh : e.a.en; };
      var safeId = window.BDJ_ASK.safety;
      if (d.urgent) parts.push(L(window.BDJAsk.entry(safeId)));            // safety first
      if (d.entry && d.entry.id !== safeId && (d.kind === 'answer' || d.kind === 'closest')) {
        if (d.kind === 'closest') parts.push(t('我找到的最接近的答案是：', 'The closest answer I have:'));
        parts.push(L(d.entry));
      } else if (!d.urgent && !(d.entry && d.entry.id === safeId)) parts.push(d.message || '');
      else if (!d.urgent) parts.push(L(d.entry));
      say(parts.join(' '));
    }).catch(function () { say(t('出了点问题，请再问一次。', 'Something went wrong, please ask again.')); });
  }

  // header pill: Voice → AI instructor (Vapi, js/instructor.js) or voice commands (this file)
  var coachLabel = h('span', {});
  var coachBtn = h('button', { class: 'pill coach-pill', id: 'btnCoach', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-pressed': 'false', onclick: onPill }, [icon('i-mic'), coachLabel]);
  var menu = null;
  function insState() { return window.BDJInstructor ? window.BDJInstructor.state() : 'idle'; }
  function onPill(e) {
    if (e) e.stopPropagation();
    if (co.on || co.starting) { stopCoach(); return; }
    var st = insState();
    if (st === 'loading' || st === 'live' || st === 'speaking') { window.BDJInstructor.stop(); return; }
    if (!window.BDJInstructor) { startCoach(); return; }
    toggleMenu();
  }
  function toggleMenu(force) {
    var open = force !== undefined ? force : !(menu && !menu.hidden);
    if (!menu) {
      var item = function (title, sub, fn) {
        return h('button', { class: 'vm-item', role: 'menuitem', onclick: function () { toggleMenu(false); fn(); } }, [h('b', { text: title }), h('span', { text: sub })]);
      };
      menu = h('div', { class: 'voice-menu', role: 'menu', hidden: true }, [
        item(t('AI 老师 · 对话', 'AI instructor'), t('和实时 AI 老师对话，随时提问；也能帮你暂停、调速、换动作。', 'Talk with a live AI teacher while you practise; it can also pause, change speed or switch moves.'), function () { window.BDJInstructor.start(); }),
        item(t('语音指令', 'Voice commands'), t('说“暂停”“慢一点”“下一式”；问题用事先写好的答案回答。', 'Say “pause”, “slower”, “next move”; questions get the pre-written answers.'), startCoach)
      ]);
      document.body.appendChild(menu);
      document.addEventListener('click', function (ev) { if (menu && !menu.hidden && !menu.contains(ev.target)) toggleMenu(false); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && menu && !menu.hidden) toggleMenu(false); });
    }
    if (open) {
      var r = coachBtn.getBoundingClientRect();
      menu.style.top = (r.bottom + 8) + 'px';
      menu.style.left = Math.max(8, Math.min(window.innerWidth - 328, r.left + r.width / 2 - 160)) + 'px';
    }
    menu.hidden = !open; coachBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function syncPill() {
    var st = insState(), on = co.on || st === 'live' || st === 'speaking' || st === 'loading';
    coachBtn.classList.toggle('on', on); coachBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  window.BDJVoiceMenu = { sync: syncPill, open: function () { toggleMenu(true); } };
  function renderCoachBtn() { coachLabel.textContent = t('语音', 'Voice'); coachBtn.title = t('AI 老师（Vapi）或语音指令（Deepgram）', 'AI instructor (Vapi) or voice commands (Deepgram)'); if (menu) { menu.remove(); menu = null; } }
  var actions = document.querySelector('.top-actions');
  if (actions) actions.insertBefore(coachBtn, $('btnAsk') || $('btnTour') || actions.firstChild);
  renderCoachBtn();

  A.onLang.push(function () { stopSpeaking(['step', 'name', 'intro']); vo.said = -9; renderVoBtn(); renderCoachBtn(); if (bar) { bar.remove(); bar = null; if (co.on) setBar('listening', ''); } });
  window.BDJVoice = { state: function () { return { speaking: speaking && speaking.id, kind: speaking && speaking.kind, waiting: vo.waiting, seg: vo.said, on: vo.on, coach: co.on, src: audio.currentSrc.split('/').pop(), t: audio.currentTime }; }, speak: speak, stop: stopSpeaking, explain: explain, setVoiceover: setVoiceover, voiceover: function () { return vo.on; },
    command: function (q) { var c = command(q); return c ? c() : undefined; }, parse: function (q) { return !!command(q); }, handle: handle, startCoach: startCoach, stopCoach: stopCoach };
})();
