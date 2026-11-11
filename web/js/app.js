/* 八段锦 · Baduanjin — web learning app (vanilla JS, works from file://). */
(function () {
  'use strict';

  var D = window.BDJ;
  if (!D) { document.body.innerHTML = '<p style="padding:2rem">data.js missing — run <code>sh web/tools/build-data.sh</code>.</p>'; return; }

  var PATH = {
    video: '../assets/',
    bg: '../Baduanjin/Resources/Backgrounds/',
    art: '../Baduanjin/Resources/Art/',
    thumb: '../Baduanjin/Resources/Thumbs/',
    track: '../music/tracks/',
    pic: '../music/pictures/'
  };
  // The one-file build defines window.U (embedded media → blob/data URL); on disk paths are used as-is.
  var U = window.U || function (p) { return p; };
  var SITE = D.site || {};
  if (SITE.paths) for (var pk in SITE.paths) PATH[pk] = SITE.paths[pk];
  var ANGLES = ['front', 'left', 'right', 'back'];

  // Fallback colours so the scene looks right even if an image is missing.
  var BG_FALLBACK = {
    studio: 'linear-gradient(#ececec, #e4e4e4 72%, #ebebeb 72%, #f1f1f1)',
    ricepaper: 'radial-gradient(circle at 70% 20%, #f8f1e2, #eadfc8)',
    mountains: 'linear-gradient(#eef0ee, #c9cec9 70%, #9aa39c)',
    bamboo: 'linear-gradient(#e9efe4, #b8c9a8)',
    moon: 'radial-gradient(circle at 70% 25%, #3a4a6b, #141c2e 70%)',
    palace: 'linear-gradient(#a7c2d6 0 14%, #c8a24a 14% 17%, #9c2f25 17% 92%, #b9b2a4 92%)',
    lotus: 'linear-gradient(#dfe9e0, #8fb39b)',
    clouds: 'linear-gradient(#dfe6ee, #f4f1ea 60%, #e6e0d6)'
  };

  // ---------------------------------------------------------------- strings
  var T = {
    zh: {
      avatarK: '形象', bgK: '背景',
      appTitle: '锦程', appSub: '八段锦 · 一式一式学到位', modeMove: '单式精学', modeFull: '全套跟练',
      pathTitle: '学习路径', pathPos: '第 {n} / 8 式', pathFull: '全套 · 第 {n} 式', recommended: '推荐', ofEight: '共八式',
      prevMove: '上一式', nextUpK: '学完这一式？继续下一式', nextUpBtn: '下一式', markNext: '标记为“已掌握”并继续',
      allDoneK: '八式都学完了', allDoneBtn: '进入全套跟练', repNudge: '已练 {n} 遍，可以进入下一式了', goNext: '下一式', stay: '再练练',
      bestView: '此步看这里', tourBtn: '引导', replayTour: '开始互动引导',
      tourSub: '一分钟带你学会：调速度、跟呼吸、换角度、看四视角、放大细节，以及更换服装、背景和音乐。',
      mdNone: '选一种乐器播放', mdOpen: '更多曲目',
      scene: '布景 · 音乐 · 服装', speed: '速度', mirror: '镜像', videoSound: '原声', zoom: '放大', clear: '清除', reset: '复位',
      loopClip: '整段循环', loopStep: '单步循环', loopChapter: '本式循环', loopAB: 'A–B 循环', loopOff: '不循环',
      stepPause: '逐步停', cues: '提示', outfit: '服装', background: '背景', music: '音乐',
      front: '正面', left: '左侧', right: '右侧', back: '背面', grid: '四视角', fullBody: '全身',
      angleMissing: '此角度暂无视频', modernFrontOnly: '运动装仅有正面视频', fullFrontOnly: '全套视频仅有正面',
      tabSteps: '分解', tabPoints: '要领', tabMistakes: '易错', tabBenefits: '功效',
      breathing: '呼吸', reps: '遍数', caution: '注意', fix: '纠正',
      in: '吸', out: '呼', hold: '停', inL: '吸气', outL: '呼气', holdL: '屏息稍停',
      progress: '掌握程度', levels: ['未学', '初学', '练习中', '已掌握'],
      practiced: '已练 {n} 遍', masteredCount: '已掌握 {n} / 8',
      stepsNoSeek: '运动装视频为 75 秒多遍连续跟练，分解步骤仅作文字参考，不能点击跳转。切换到红色练功服可逐步学习。',
      tapStep: '点击步骤跳转；点 ↻ 单步循环反复练。',
      loopThis: '循环此步', step: '第 {n} 步', stepDone: '第 {n} 步完成 · 按空格或 ▶ 继续',
      chapters: '八式章节', fullTitle: '全套八段锦', fullSub: '从第一式到第八式，连贯跟练约 10 分钟',
      nowPracticing: '正在练习', studyThis: '单式精学 →', keyPointsShort: '本式要领',
      bgNoteGL: '背景替换：在本机实时抠像（WebGL）。白鞋与地面颜色相近处可能略有瑕疵。',
      bgNoteSVG: '背景替换：在本机实时抠像（SVG 滤镜模式）。白鞋与地面颜色相近处可能略有瑕疵。',
      bgNoteOff: '“原片”为未经处理的原始视频。',
      silence: '静音', playMusic: '播放音乐', pauseMusic: '暂停音乐', playAll: '连续播放', loopsOne: '单曲循环',
      nowPlaying: '正在播放', chooseTrack: '选择一首曲目', credits: '音乐来源与致谢',
      loading: '加载中…', videoError: '视频无法加载：{f}',
      helpTitle: '使用说明', shortcuts: '键盘快捷键',
      help: [
        ['空格', '播放 / 暂停'], ['← →', '上一步 / 下一步（全套：上一式 / 下一式）'], ['[ ]', '减速 / 加速'], ['=', '恢复 1× 速度'],
        [', .', '逐帧后退 / 前进（暂停时）'], ['L', '切换循环方式'], ['P', '逐步停顿'], ['M', '镜像'], ['Z', '切换放大部位'],
        ['G', '四视角同步'], ['N', '下一式'], ['A / B', '设置循环起点 / 终点'], ['C', '显示 / 隐藏字幕与呼吸提示'], ['1–8', '选择第几式'], ['F', '全屏'], ['?', '本说明']
      ],
      tips: [
        '先用 0.5× 慢速看清每一步，再逐渐加快到 1×。',
        '开启“镜像”后，面对屏幕跟练时左右与你一致。',
        '打开“逐步停”，每一步结束会自动暂停，方便对照模仿。',
        '时间轴的颜色表示呼吸：青色为吸，米色为呼，金色为停。',
        '在视频上拖动可平移放大后的画面，双击复位。'
      ],
      about: '锦程（Brocade Path）· 视频：红色练功服单式（10 秒，多角度）与运动装跟练（75 秒）。内容与 iOS 版共享同一份数据。'
    },
    en: {
      avatarK: 'Avatar', bgK: 'Background',
      appTitle: 'Brocade Path', appSub: 'Learn Baduanjin, one move at a time', modeMove: 'Learn a move', modeFull: 'Full routine',
      pathTitle: 'Learning path', pathPos: 'Move {n} of 8', pathFull: 'Full routine · move {n}', recommended: 'Suggested', ofEight: 'of 8',
      prevMove: 'Previous move', nextUpK: 'Finished this one? Keep going', nextUpBtn: 'Next move', markNext: 'Mark as mastered and continue',
      allDoneK: 'You’ve studied all eight', allDoneBtn: 'Try the full routine', repNudge: 'Practised {n}× — ready for the next move?', goNext: 'Next move', stay: 'Keep practising',
      bestView: 'Best view for this step', tourBtn: 'Tour', replayTour: 'Start the interactive tour',
      tourSub: 'A one-minute guided tour: speed, breathing, angles, the 4-angle view, zoom — and changing outfit, background and music.',
      mdNone: 'Tap an instrument to play', mdOpen: 'More tracks',
      scene: 'Scene · Music · Outfit', speed: 'Speed', mirror: 'Mirror', videoSound: 'Video audio', zoom: 'Zoom', clear: 'Clear', reset: 'Reset',
      loopClip: 'Loop clip', loopStep: 'Loop step', loopChapter: 'Loop move', loopAB: 'A–B loop', loopOff: 'No loop',
      stepPause: 'Step pause', cues: 'Cues', outfit: 'Outfit', background: 'Background', music: 'Music',
      front: 'Front', left: 'Left', right: 'Right', back: 'Back', grid: '4 angles', fullBody: 'Full body',
      angleMissing: 'No footage from this angle', modernFrontOnly: 'Sportswear is filmed from the front only', fullFrontOnly: 'The full routine is filmed from the front only',
      tabSteps: 'Steps', tabPoints: 'Key points', tabMistakes: 'Mistakes', tabBenefits: 'Benefits',
      breathing: 'Breathing', reps: 'Reps', caution: 'Caution', fix: 'Fix',
      in: 'In', out: 'Out', hold: 'Hold', inL: 'Inhale', outL: 'Exhale', holdL: 'Pause',
      progress: 'Your progress', levels: ['Not started', 'Learning', 'Practising', 'Mastered'],
      practiced: 'Practised {n}×', masteredCount: '{n} of 8 mastered',
      stepsNoSeek: 'The sportswear clip is a 75-second follow-along with several reps, so these steps are text only (no jumping). Switch to the red training suit to study step by step.',
      tapStep: 'Tap a step to jump to it; tap ↻ to drill it on a loop.',
      loopThis: 'Loop this step', step: 'Step {n}', stepDone: 'Step {n} done · press Space or ▶ to continue',
      chapters: 'The eight movements', fullTitle: 'The complete Baduanjin', fullSub: 'All eight movements in one flowing ~10 minute session',
      nowPracticing: 'Now practising', studyThis: 'Study this move →', keyPointsShort: 'Key points',
      bgNoteGL: 'Background replacement runs live on your device (WebGL key). White shoes on the white floor may show small artefacts.',
      bgNoteSVG: 'Background replacement runs live on your device (SVG filter mode). White shoes on the white floor may show small artefacts.',
      bgNoteOff: '“Original” shows the untouched studio footage.',
      silence: 'Silence', playMusic: 'Play music', pauseMusic: 'Pause music', playAll: 'Play all', loopsOne: 'Loops this track',
      nowPlaying: 'Now playing', chooseTrack: 'Choose a track', credits: 'Music credits',
      loading: 'Loading…', videoError: 'Video could not be loaded: {f}',
      helpTitle: 'How to use', shortcuts: 'Keyboard shortcuts',
      help: [
        ['Space', 'Play / pause'], ['← →', 'Previous / next step (full routine: movement)'], ['[ ]', 'Slower / faster'], ['=', 'Back to 1× speed'],
        [', .', 'Frame back / forward (while paused)'], ['L', 'Cycle loop mode'], ['P', 'Pause after each step'], ['M', 'Mirror'], ['Z', 'Cycle zoom focus'],
        ['G', 'Synchronised 4-angle grid'], ['N', 'Next movement'], ['A / B', 'Set loop start / end'], ['C', 'Show / hide caption & breathing cue'], ['1–8', 'Choose a movement'], ['F', 'Fullscreen'], ['?', 'This help']
      ],
      tips: [
        'Watch each step at 0.5× first, then build up to 1×.',
        'Turn on Mirror so left and right match you when you follow along facing the screen.',
        'Step pause stops at the end of every step so you can copy the posture.',
        'Timeline colours show the breath: celadon = inhale, sand = exhale, gold = hold.',
        'Drag on the video to pan when zoomed; double-click to reset.'
      ],
      about: 'Brocade Path (锦程). Footage: red training suit single moves (10 s, several camera angles) and sportswear follow-along (75 s). Content is shared with the iOS app.'
    }
  };

  if (SITE.strings) ['zh', 'en'].forEach(function (l) { var o = SITE.strings[l] || {}; for (var k in o) T[l][k] = o[k]; });

  // ---------------------------------------------------------------- state
  var SITE_SUFFIX = SITE.id ? '.' + SITE.id : '';
  var PREF_KEY = 'bdj.web.prefs.v1' + SITE_SUFFIX, PROG_KEY = 'bdj.web.progress.v1' + SITE_SUFFIX;
  function readJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  var S = Object.assign({
    lang: (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en',
    mode: 'move', move: 1, outfit: D.outfits[0].id, angle: 'front', grid: false,
    speed: 1, mirror: false, videoSound: false, cues: true, stepPause: false,
    loop: 'clip', bg: 'studio', inst: 'guzheng', track: null, volume: 0.6, playAll: false, tab: 'steps'
  }, readJSON(PREF_KEY, {}));
  // The data's first outfit is the default until the visitor picks one (first visits save S, outfit included).
  if (!S.outfitPicked || !D.outfits.some(function (o) { return o.id === S.outfit; })) S.outfit = D.outfits[0].id;
  // Default music is 高山流水 (applied once, so a later choice of silence sticks).
  if (!S.musicDefault && D.music && (D.music.tracks || []).some(function (x) { return x.id === 'gaoshan'; })) {
    S.track = 'gaoshan'; S.inst = 'guzheng'; S.musicDefault = 1; writeJSON(PREF_KEY, S);
  }
  var P = Object.assign({ level: {}, count: {}, days: {} }, readJSON(PROG_KEY, {}));
  if (!P.days) P.days = {};
  var R = { // runtime-only
    ab: { a: null, b: null }, zoom: { s: 1, cx: 0.5, cy: 0.5, focus: -1 },
    seg: -1, lastT: 0, stepPaused: null, scrubbing: false, musicOn: false, seekGuard: 0
  };
  function savePrefs() { writeJSON(PREF_KEY, S); }
  var progListeners = [];  // js/cloud.js syncs progress across devices
  function saveProg() { writeJSON(PROG_KEY, P); progListeners.forEach(function (f) { try { f(); } catch (e) { } }); }
  // Product analytics (js/analytics.js → PostHog); a no-op when the site has no key.
  var booted = false;
  function track(ev, props) { if (booted && window.BDJTrack) window.BDJTrack(ev, props); }

  // ---------------------------------------------------------------- helpers
  function $(id) { return document.getElementById(id); }
  function t(k, n) { var s = T[S.lang][k]; if (s == null) s = T.en[k]; return typeof s === 'string' && n != null ? s.replace('{n}', n) : s; }
  function L(o, base) { return o[base + (S.lang === 'zh' ? 'Zh' : 'En')]; }
  function txt(o) { return S.lang === 'zh' ? o.zh : o.en; }
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function icon(id) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic'); var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s; }
  function fmt(sec, dec) {
    if (!isFinite(sec)) sec = 0;
    var m = Math.floor(sec / 60), s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + (dec ? s.toFixed(1) : Math.floor(s));
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function move() { return D.moves[S.move - 1]; }
  function isFull() { return S.mode === 'full'; }
  function outfitById(id) { return D.outfits.filter(function (o) { return o.id === id; })[0] || D.outfits[0]; }
  function outfitTimed() { var o = outfitById(S.outfit); return o.timed != null ? o.timed : o.id === 'traditional'; }
  function outfitMulti() { var o = outfitById(S.outfit); return o.multiAngle != null ? o.multiAngle : o.id === 'traditional'; }
  // move.angles is a list (Baduanjin) or a per-outfit map (Tai Chi).
  function moveAngles(m) { var a = (m || move()).angles; return Array.isArray(a) ? a : (a[S.outfit] || ['front']); }
  function stepsSeekable() { return !isFull() && outfitTimed(); }
  // Angles of the full routine: sites that ship a joined routine per angle list them in fullRoutine.<outfit>.angles.
  function fullAngles() { var fr = D.fullRoutine[S.outfit]; return fr && fr.src && fr.angles ? fr.angles : ['front']; }
  function fullSuffix(fr, angle) { return fr.angles ? '-' + (fr.angles.indexOf(angle) >= 0 ? angle : 'front') : ''; }
  function availableAngles() { return isFull() ? fullAngles() : !outfitMulti() ? ['front'] : moveAngles(); }
  function gridAngles() { return isFull() ? fullAngles() : outfitMulti() ? moveAngles() : ['front']; }
  function gridOn() { return S.grid && gridAngles().length > 1; }
  function videoFile(angle) {
    if (isFull()) return D.fullRoutine[S.outfit].file;
    var o = outfitById(S.outfit), md = o.movesDir || (o.dir && o.dir + '/moves');
    if (md) return md + '/' + move().slug + '/' + angle; // me_video folder layout
    if (S.outfit === 'modern') return 'gym-form' + S.move;
    return 'red-form' + S.move + (angle === 'front' ? '' : '-' + angle);
  }
  function videoSrc(angle) {
    var fr = isFull() && D.fullRoutine[S.outfit];
    if (fr && fr.src) return fr.src + fullSuffix(fr, angle) + '.mp4'; // routine built for this site, relative to web/
    return PATH.video + videoFile(angle) + '.mp4';
  }
  function thumbKey(outfit) { var o = outfitById(outfit || S.outfit); return o.thumb || (o.id === 'modern' ? 'gym' : 'red'); }
  function thumbSrc(id, outfit) { return PATH.thumb + 'thumb_' + thumbKey(outfit) + '_' + id + '.jpg'; }
  // Tracks with no licence for public redistribution are only on this Mac; hide them on a hosted copy.
  var LOCAL_ONLY_TRACKS = ['05-bamboo-flute-guzheng-zen-long.mp3'], _music = null;
  function music() {
    if (_music) return _music;
    if (!(D.music && D.music.tracks)) return { instruments: [], tracks: [] };
    var local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if (local) return (_music = D.music);
    var m = {}; for (var k in D.music) m[k] = D.music[k];
    m.tracks = D.music.tracks.filter(function (x) { return LOCAL_ONLY_TRACKS.indexOf(x.file) < 0; });
    return (_music = m);
  }

  // Segments: steps (red single move) or chapters (full routine).
  function segments() {
    if (isFull()) {
      var fr = D.fullRoutine[S.outfit], ch = fr.chapters;
      return ch.map(function (s, i) { return { start: s, end: i + 1 < ch.length ? ch[i + 1] : fr.duration, chapter: i + 1 }; });
    }
    if (outfitTimed()) return stepsOf(move());
    return [];
  }
  var stepCache = {};
  function stepsOf(m) {
    var key = m.id + '|' + S.outfit;
    if (!stepCache[key]) stepCache[key] = m.steps.map(function (st) {
      if (!st.t) return st;
      var r = st.t[S.outfit] || st.t[Object.keys(st.t)[0]], c = {};
      for (var k in st) c[k] = st[k];
      c.start = r[0]; c.end = r[1];
      return c;
    });
    return stepCache[key];
  }
  function segAt(tm) {
    var sg = segments();
    for (var i = 0; i < sg.length; i++) if (tm >= sg[i].start && tm < sg[i].end) return i;
    return sg.length && tm >= sg[sg.length - 1].end - 0.001 ? sg.length - 1 : -1;
  }

  // ---------------------------------------------------------------- tiles (video + bg + compositor)
  function Tile(container, angle, withLabel) {
    this.angle = angle;
    this.el = h('div', { class: 'tile' });
    this.bg = h('div', { class: 'tile-bg' });
    this.zoomer = h('div', { class: 'zoomer' });
    this.person = h('div', { class: 'person' });
    this.video = h('video', { playsinline: true, 'webkit-playsinline': true, preload: 'auto', muted: true, disablepictureinpicture: true });
    this.video.muted = true;
    this.canvas = h('canvas', { class: 'keyed' });
    this.person.appendChild(this.video); this.person.appendChild(this.canvas);
    this.zoomer.appendChild(this.person);
    this.el.appendChild(this.bg); this.el.appendChild(this.zoomer);
    if (withLabel) {
      this.label = h('span', { class: 'tile-label' }); this.tip = h('span', { class: 'tile-tip' });
      this.el.appendChild(h('div', { class: 'tile-cap' }, [this.label, this.tip]));
      this.best = h('div', { class: 'tile-best' }, [h('span', { class: 'tb-dot' }), h('span', { class: 'tb-txt' })]);
      this.el.appendChild(this.best);
    }
    this.missing = h('div', { class: 'tile-missing', hidden: true });
    this.el.appendChild(this.missing);
    container.appendChild(this.el);
    this.comp = new window.BDJCompositor(this.video, this.canvas);
    this.rect = { left: 0, top: 0, w: 1, h: 1, W: 1, H: 1 };
    var self = this;
    this.video.addEventListener('loadedmetadata', function () {
      self.layout();
      self.video.defaultPlaybackRate = S.speed; self.video.playbackRate = S.speed;
      if (self.pendingTime != null) { try { self.video.currentTime = Math.min(self.pendingTime, Math.max(0, self.video.duration - 0.05)); } catch (e) { } self.pendingTime = null; }
      if (self.pendingPlay) { self.pendingPlay = false; playVideo(self.video); }
    });
    this.video.addEventListener('error', function () { if (self.src && self === master()) showMsg(t('videoError').replace('{f}', self.src.split('/').pop())); });
  }
  Tile.prototype.setSrc = function (src, time, play) {
    this.missing.hidden = true; this.el.classList.remove('is-missing');
    if (this.src === src) { if (time != null) seekVideo(this.video, time); if (play) playVideo(this.video); return; }
    this.src = src; this.pendingTime = time; this.pendingPlay = !!play;
    this.video.src = src;
    this.video.load();
  };
  Tile.prototype.setMissing = function (text) {
    this.src = null; this.video.removeAttribute('src'); this.video.load();
    this.missing.textContent = text; this.missing.hidden = false; this.el.classList.add('is-missing');
  };
  Tile.prototype.layout = function () {
    var W = this.el.clientWidth || 1, H = this.el.clientHeight || 1;
    var vw = this.video.videoWidth || 944, vh = this.video.videoHeight || 960;
    var s = Math.min(W / vw, H / vh), w = vw * s, hh = vh * s;
    var r = this.rect = { left: (W - w) / 2, top: (H - hh) / 2, w: w, h: hh, W: W, H: H };
    var ps = this.person.style;
    ps.left = r.left + 'px'; ps.top = r.top + 'px'; ps.width = w + 'px'; ps.height = hh + 'px';
    if (!this.el.closest('[hidden]')) this.comp.layout(hh, w);
    this.applyView();
  };
  Tile.prototype.applyView = function () {
    var r = this.rect, z = R.zoom, s = z.s;
    this.person.style.transform = S.mirror ? 'scaleX(-1)' : '';
    if (s <= 1.001) { this.zoomer.style.transform = ''; return; }
    var cx = S.mirror ? 1 - z.cx : z.cx;
    var px = r.left + cx * r.w, py = r.top + z.cy * r.h;
    var tx = clamp(r.W / 2 - s * px, r.W - s * r.W, 0), ty = clamp(r.H / 2 - s * py, r.H - s * r.H, 0);
    this.zoomer.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s + ')';
  };
  Tile.prototype.applyBg = function () {
    var b = D.backgrounds.filter(function (x) { return x.id === S.bg; })[0] || D.backgrounds[0];
    var fb = BG_FALLBACK[b.id] || BG_FALLBACK.studio;
    this.bg.style.backgroundImage = b.file && bgOK[b.id] !== false ? 'url("' + PATH.bg + b.file + '"), ' + fb : fb;
    this.comp.setEnabled(!!b.file);
  };

  function playVideo(v) { var p = v.play(); if (p && p.catch) p.catch(function () { }); }
  function seekVideo(v, tm) {
    if (v.readyState < 1) return;
    try { v.currentTime = clamp(tm, 0, Math.max(0, (v.duration || tm) - 0.02)); } catch (e) { }
  }

  var single = new Tile($('singleView'), 'front', false);
  var gridTiles = ANGLES.map(function (a) { return new Tile($('gridView'), a, true); });
  function master() { return gridOn() ? gridTiles.filter(function (x) { return x.src; })[0] || single : single; }
  function activeTiles() { return gridOn() ? gridTiles : [single]; }

  // ---------------------------------------------------------------- background availability probe
  var bgOK = {};
  D.backgrounds.forEach(function (b) {
    if (!b.file) return;
    var im = new Image();
    im.onload = function () { bgOK[b.id] = true; };
    im.onerror = function () { bgOK[b.id] = false; if (S.bg === b.id) applyBgAll(); renderBgList(); };
    im.src = PATH.bg + b.file;
  });
  function applyBgAll() {
    single.applyBg(); gridTiles.forEach(function (x) { x.applyBg(); });
    var b = S.bg !== 'studio';
    $('stage').classList.toggle('keyed-bg', b);
  }

  // ---------------------------------------------------------------- loading sources
  function loadSources(opts) {
    opts = opts || {};
    var m = master(), wasPlaying = opts.play != null ? opts.play : (m.video && !m.video.paused);
    var keep = opts.keepTime ? m.video.currentTime || 0 : (opts.time != null ? opts.time : 0);
    hideMsg();
    var g = gridOn();
    $('singleView').hidden = g; $('gridView').hidden = !g;
    if (g) {
      single.video.pause();
      var av = gridAngles();
      gridTiles.forEach(function (tile) {
        tile.label.textContent = t(tile.angle);
        if (av.indexOf(tile.angle) >= 0) tile.setSrc(videoSrc(tile.angle), keep, wasPlaying);
        else tile.setMissing(t('angleMissing'));
      });
    } else {
      gridTiles.forEach(function (tile) { tile.video.pause(); });
      if (availableAngles().indexOf(S.angle) < 0) S.angle = 'front';
      single.setSrc(videoSrc(S.angle), keep, wasPlaying);
    }
    applyAudio();
    single.video.loop = gridTiles[0].video.loop = false; // looping handled in tick for precise control
    R.seg = -2; R.stepPaused = null;
    requestAnimationFrame(layoutAll);
  }
  function layoutAll() { single.layout(); gridTiles.forEach(function (x) { x.layout(); }); }

  function applyAudio() {
    var m = master();
    [single].concat(gridTiles).forEach(function (x) { x.video.muted = !(S.videoSound && x === m); });
  }

  // ---------------------------------------------------------------- transport
  function isPlaying() { var v = master().video; return !v.paused && !v.ended; }
  function play() {
    var m = master();
    if (R.stepPaused != null) R.stepPaused = null;
    if (m.video.ended || (!isFull() && m.video.currentTime >= (m.video.duration || 1e9) - 0.05)) seekVideo(m.video, 0);
    playVideo(m.video);
    if (S.track && !R.musicOn) musicPlay();
  }
  function pause() { activeTiles().forEach(function (x) { x.video.pause(); }); }
  function togglePlay() { if (isPlaying()) pause(); else play(); }
  function seek(tm) {
    R.seekGuard = 2; R.stepPaused = null;
    var m = master(); seekVideo(m.video, tm);
    if (gridOn()) gridTiles.forEach(function (x) { if (x !== m && x.src) seekVideo(x.video, tm); });
  }
  function gotoSeg(i) {
    var sg = segments();
    if (!sg.length) return;
    i = clamp(i, 0, sg.length - 1);
    seek(sg[i].start + 0.001);
  }
  function stepBy(dir) {
    var sg = segments(), m = master().video, tm = m.currentTime;
    if (!sg.length) { seek(clamp(tm + dir * 5, 0, m.duration || 0)); return; }
    var i = segAt(tm);
    if (dir < 0 && i >= 0 && tm - sg[i].start > 0.6 && !isPlaying()) { gotoSeg(i); return; }
    if (dir < 0 && i >= 0 && tm - sg[i].start > 1.2) { gotoSeg(i); return; }
    gotoSeg((i < 0 ? 0 : i) + dir);
  }
  function frameStep(dir) { pause(); var v = master().video; seek(clamp(v.currentTime + dir / 24, 0, v.duration || 0)); }
  function setSpeed(v) {
    S.speed = clamp(Math.round(v * 100) / 100, 0.25, 2);
    [single].concat(gridTiles).forEach(function (x) { x.video.defaultPlaybackRate = S.speed; x.video.playbackRate = S.speed; });
    $('speed').value = S.speed; $('speedOut').textContent = S.speed.toFixed(2) + '×';
    var pct = (S.speed - 0.25) / 1.75 * 100;
    $('speed').style.setProperty('--fill', pct + '%');
    savePrefs(); renderChips();
    if (booted) { clearTimeout(R.speedT); R.speedT = setTimeout(function () { track('speed_changed', { speed: S.speed }); }, 800); }
  }

  // loop modes per context
  function loopModes() {
    if (isFull()) return ['off', 'chapter'];
    if (stepsSeekable()) return ['clip', 'step', 'off'];
    return ['clip', 'off'];
  }
  function loopMode() {
    if (R.ab.a != null && R.ab.b != null) return 'ab';
    var ms = loopModes();
    return ms.indexOf(S.loop) >= 0 ? S.loop : ms[0];
  }
  function cycleLoop() {
    clearAB(true);
    var ms = loopModes(), i = ms.indexOf(loopMode());
    S.loop = ms[(i + 1) % ms.length]; savePrefs(); renderLoop();
  }
  function setLoop(m) { clearAB(true); S.loop = m; savePrefs(); renderLoop(); }
  function clearAB(silent) { R.ab.a = R.ab.b = null; if (!silent) renderLoop(); renderAB(); }

  // ---------------------------------------------------------------- the frame loop
  function tick() {
    var m = master(), v = m.video, tm = v.currentTime || 0, dur = v.duration || 0;
    var playing = !v.paused && !v.ended;

    var sg = segments(), lm = loopMode(), i = segAt(tm);
    // After a user seek the "current" step is wherever we landed, not the step we left.
    if ((R.seekGuard > 0 || v.seeking) && i !== R.seg) { R.seg = i; onSegChange(); }
    if (R.seekGuard > 0) R.seekGuard--;

    if (playing && dur) {
      if (lm === 'ab') {
        var a = Math.min(R.ab.a, R.ab.b), b = Math.max(R.ab.a, R.ab.b);
        if (tm >= b - 0.02 || tm < a - 0.3) { seek(a); tm = a; }
      } else if ((lm === 'step' || lm === 'chapter') && R.seg >= 0 && sg[R.seg]) {
        var cur = sg[R.seg];
        if (tm >= cur.end - 0.03 || tm < cur.start - 0.3) { seek(cur.start + 0.001); tm = cur.start; i = R.seg; countRep(); }
      } else if (tm >= dur - 0.06 || v.ended) {
        if (lm === 'clip') { seek(0); tm = 0; i = 0; countRep(); playVideo(v); }
      }
      // pause after each step
      if (S.stepPause && sg.length && R.seekGuard === 0 && R.seg >= 0 && i !== R.seg && lm !== 'step' && lm !== 'chapter') {
        var done = R.seg;
        if (i === done + 1 || (i === 0 && done === sg.length - 1)) {
          pause(); seek(sg[done].end - 0.02); tm = sg[done].end - 0.02; i = done; R.stepPaused = done;
        }
      }
    } else if (v.ended && lm === 'clip' && !isFull()) {
      seek(0); playVideo(v); countRep();
    }

    if (gridOn()) syncFollowers(m, playing);
    trackPractice(playing);
    if (i !== R.seg) { R.seg = i; onSegChange(); }
    R.lastT = tm;

    updateTimeline(tm, dur);
    updateCues(tm, i);
    updateSegBar(tm, i);
    updatePausedOverlay(playing);
    activeTiles().forEach(function (x) { x.comp.tick(); });
    requestAnimationFrame(tick);
  }

  // Practice time: real seconds of playback per local day (P.days['2026-11-09'] = seconds), saved every ~5 s.
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var practiceT = 0, practiceUnsaved = 0;
  function trackPractice(playing) {
    var now = performance.now(), dt = practiceT ? (now - practiceT) / 1000 : 0;
    practiceT = now;
    if (!playing || document.hidden || dt <= 0 || dt > 1) { endSession(); return; }
    var k = dayKey(); P.days[k] = (P.days[k] || 0) + dt; practiceUnsaved += dt; sessionSec += dt;
    if (practiceUnsaved > 5) { practiceUnsaved = 0; saveProg(); }
  }
  var sessionSec = 0;
  function endSession() {
    if (sessionSec >= 10) track('practice_session', { seconds: Math.round(sessionSec), move: isFull() ? null : S.move, mode: S.mode, speed: S.speed, grid: gridOn(), angle: S.angle, background: S.bg, music: R.musicOn ? S.track : null, today_minutes: Math.round((P.days[dayKey()] || 0) / 60) });
    sessionSec = 0;
  }
  window.addEventListener('pagehide', function () { endSession(); if (practiceUnsaved) saveProg(); });

  function syncFollowers(m, playing) {
    var mt = m.video.currentTime;
    gridTiles.forEach(function (x) {
      if (x === m || !x.src || x.video.readyState < 1) return;
      var fv = x.video;
      if (fv.playbackRate !== m.video.playbackRate) fv.playbackRate = m.video.playbackRate;
      if (playing) {
        if (fv.paused) playVideo(fv);
        if (Math.abs(fv.currentTime - mt) > 0.15) seekVideo(fv, mt);
      } else {
        if (!fv.paused) fv.pause();
        if (Math.abs(fv.currentTime - mt) > 0.04 && !fv.seeking) seekVideo(fv, mt);
      }
    });
  }

  var lastRepAt = 0;
  function countRep() {
    var now = performance.now();
    if (now - lastRepAt < 1500 || isFull()) return;
    lastRepAt = now;
    P.count[S.move] = (P.count[S.move] || 0) + 1; saveProg();
    var el = document.querySelector('.practice-count'); if (el) el.textContent = t('practiced', P.count[S.move]);
    if (P.count[S.move] % 3 === 0 && S.move < 8 && !R.tourOn) showNudge(P.count[S.move]);
  }
  function showNudge(n) {
    var ov = $('ovNext'), nx = D.moves[S.move];
    ov.innerHTML = '';
    ov.appendChild(h('span', { class: 'nx-txt', text: t('repNudge', n) }));
    ov.appendChild(h('button', { class: 'nx-go', onclick: function (e) { e.stopPropagation(); ov.hidden = true; selectMove(nx.id); } }, [
      h('span', { class: 'seal xs', text: nx.seal }), h('span', { text: t('goNext') }), icon('i-arrow')
    ]));
    ov.appendChild(h('button', { class: 'nx-stay', text: t('stay'), onclick: function (e) { e.stopPropagation(); ov.hidden = true; } }));
    ov.hidden = false;
    clearTimeout(R.nudgeT); R.nudgeT = setTimeout(function () { ov.hidden = true; }, 9000);
  }

  // ---------------------------------------------------------------- UI updates
  function updateTimeline(tm, dur) {
    var pct = dur ? clamp(tm / dur, 0, 1) * 100 : 0;
    $('tlFill').style.width = pct + '%';
    $('tlHead').style.left = pct + '%';
    $('timeNow').textContent = fmt(tm, dur && dur < 60);
    $('timeDur').textContent = fmt(dur, false);
    if (R.tlDur !== dur) { R.tlDur = dur; renderTimeline(); }
  }

  var BREATH_SCALE = { in: [0.55, 1], out: [1, 0.55], hold: [1, 1] };
  function updateCues(tm, i) {
    var show = S.cues && stepsSeekable() && i >= 0, inGrid = gridOn();
    var br = $('ovBreath'), hub = $('ovHub'), cap = $('ovCaption');
    br.hidden = !show || inGrid; hub.hidden = !show || !inGrid;
    cap.hidden = !(S.cues && i >= 0 && (stepsSeekable() || isFull()));
    $('gridView').classList.toggle('cues', show && inGrid);
    if (!show) return;
    var st = segments()[i];
    var p = clamp((tm - st.start) / (st.end - st.start), 0, 1);
    var e = p * p * (3 - 2 * p);
    var sc = BREATH_SCALE[st.breath] || BREATH_SCALE.hold;
    var k = sc[0] + (sc[1] - sc[0]) * e;
    var el = inGrid ? hub : br;
    el.style.setProperty('--b', k.toFixed(3));
    el.style.setProperty('--p', (p * 100).toFixed(1));
    el.dataset.phase = st.breath;
    var sub = $('breathSub'), arc = !inGrid && br.querySelector('.ba-fill');
    if (arc) arc.style.strokeDashoffset = (100 - p * 100).toFixed(1);
    if (sub && !inGrid) {
      var left = Math.max(0, Math.ceil((st.end - tm) / (S.speed || 1) - 0.05));
      var s2 = left + (S.lang === 'zh' ? ' 秒 · 第 ' + (i + 1) + '/' + segments().length + ' 步' : ' s · step ' + (i + 1) + '/' + segments().length);
      if (sub.textContent !== s2) sub.textContent = s2;
    }
  }
  function updateSegBar(tm, i) {
    if (i < 0) return;
    var st = segments()[i]; if (!st) return;
    var bar = document.querySelector('[data-seg="' + i + '"] .step-bar i');
    if (bar) bar.style.width = (clamp((tm - st.start) / (st.end - st.start), 0, 1) * 100).toFixed(1) + '%';
  }

  function onSegChange() {
    var i = R.seg, sg = segments();
    if (window.BDJApp && booted) window.BDJApp.onSeg.forEach(function (f) { try { f(i); } catch (e) { } }); // js/voice.js
    // step list highlight
    document.querySelectorAll('[data-seg]').forEach(function (el) { el.classList.toggle('active', +el.dataset.seg === i); });
    document.querySelectorAll('.tl-seg').forEach(function (el, j) { el.classList.toggle('active', j === i); });
    var cap = $('ovCaption'), now = $('stepNow'), bar = $('capBar');
    bar.innerHTML = '';
    bar.classList.toggle('empty', i < 0 || !sg[i] || (!stepsSeekable() && !isFull()));
    if (i < 0 || !sg[i] || !stepsSeekable()) updateGridTips(null);
    if (i < 0 || !sg[i]) { cap.textContent = ''; now.textContent = ''; renderCapIdle(); return; }
    if (isFull()) {
      var mv = D.moves[i];
      cap.innerHTML = '';
      cap.appendChild(h('span', { class: 'cap-seal', text: mv.seal }));
      cap.appendChild(h('span', { text: txt({ zh: mv.nameZh, en: mv.nameEn }) }));
      now.textContent = mv.seal + ' · ' + txt({ zh: mv.nameZh, en: mv.nameEn });
      bar.appendChild(h('span', { class: 'cap-seal', text: mv.seal }));
      bar.appendChild(h('span', { class: 'cap-text', text: txt({ zh: mv.nameZh, en: mv.nameEn }) + '  ·  ' + L(mv, 'breathing') }));
      // panel + strip follow the routine
      document.querySelectorAll('.strip-btn').forEach(function (b) { b.classList.toggle('current', +b.dataset.move === i + 1); });
      var pp = document.querySelector('.path-pos'); if (pp) pp.textContent = t('pathFull', i + 1);
      renderFullNow(i);
      renderFocus(i + 1);
    } else {
      var st = sg[i];
      cap.innerHTML = '';
      cap.appendChild(h('span', { class: 'cap-n', text: String(i + 1) }));
      cap.appendChild(h('span', { text: txt(st) }));
      var bk = $('breathZh'), be = $('breathEn');
      bk.textContent = T.zh[st.breath]; be.textContent = S.lang === 'zh' ? T.zh[st.breath + 'L'] : T.en[st.breath + 'L'];
      $('hubZh').textContent = T.zh[st.breath];
      $('hubStep').textContent = (S.lang === 'zh' ? '' : T.en[st.breath + 'L'] + ' · ') + (i + 1) + ' / ' + sg.length;
      updateGridTips(st);
      now.textContent = t('step', i + 1) + ' · ' + (S.lang === 'zh' ? T.zh[st.breath + 'L'] : T.en[st.breath + 'L']);
      bar.appendChild(h('span', { class: 'cap-n', text: String(i + 1) }));
      bar.appendChild(h('span', { class: 'breath-tag ' + st.breath, text: T.zh[st.breath] + (S.lang === 'en' ? ' · ' + T.en[st.breath + 'L'] : '') }));
      bar.appendChild(h('span', { class: 'cap-text', text: txt(st) }));
    }
  }

  // Which grid tile best shows the current step (falls back to the mirror side, then front).
  function bestAngle(a) {
    var av = gridAngles();
    if (av.indexOf(a) >= 0) return a;
    var alt = a === 'left' ? 'right' : a === 'right' ? 'left' : null;
    return alt && av.indexOf(alt) >= 0 ? alt : 'front';
  }
  function updateGridTips(st) {
    var m = isFull() ? D.moves[R.seg] || move() : move(), best = st && st.best ? bestAngle(st.best) : null, tips = m.angleTips || {};
    gridTiles.forEach(function (tile) {
      if (!tile.tip) return;
      var ok = !!tile.src;
      tile.tip.textContent = ok && tips[tile.angle] ? txt(tips[tile.angle]) : '';
      tile.best.querySelector('.tb-txt').textContent = t('bestView');
      tile.el.classList.toggle('best', !!(gridOn() && S.cues && ok && best === tile.angle));
    });
  }

  // Caption bar when there is no timed step (sportswear clips): show the breathing rule instead.
  function renderCapIdle() {
    var bar = $('capBar');
    if (!isFull() && !stepsSeekable()) {
      bar.classList.remove('empty');
      bar.appendChild(h('span', { class: 'cap-seal', text: move().seal }));
      bar.appendChild(h('span', { class: 'cap-text', text: L(move(), 'breathing') + '  ·  ' + L(move(), 'reps') }));
    }
  }

  function updatePausedOverlay(playing) {
    var ov = $('ovPaused');
    if (playing) R.everPlayed = true;
    // Keep the paused frame clear for studying the posture: the big button only shows
    // before the first play, or with the "step done" hint.
    var show = !playing && !R.scrubbing && master().video.readyState >= 2 && (!R.everPlayed || R.stepPaused != null);
    if (ov.hidden === !show && R.lastPauseHint === R.stepPaused && R.lastPlaying === playing) return;
    R.lastPlaying = playing;
    ov.hidden = !show;
    R.lastPauseHint = R.stepPaused;
    $('pauseHint').textContent = R.stepPaused != null ? t('stepDone', R.stepPaused + 1) : '';
    var use = $('btnPlay').querySelector('use');
    use.setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('btnPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function showMsg(s) { var m = $('ovMsg'); m.textContent = s; m.hidden = false; }
  function hideMsg() { $('ovMsg').hidden = true; }

  // ---------------------------------------------------------------- renderers
  function renderStatic() {
    document.documentElement.lang = S.lang === 'zh' ? 'zh-Hans' : 'en';
    document.body.classList.toggle('lang-en', S.lang === 'en');
    document.title = SITE.title ? (S.lang === 'zh' ? SITE.title.zh : SITE.title.en) : (S.lang === 'zh' ? '锦程 · 八段锦一式一式学' : 'Brocade Path · Learn Baduanjin');
    var logo = document.querySelector('.seal-logo'); if (logo && SITE.logo) logo.textContent = SITE.logo;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { var v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('.mode-btn').forEach(function (b) { var on = b.dataset.mode === S.mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('btnLang').classList.toggle('is-en', S.lang === 'en');
    $('btnLang').title = S.lang === 'zh' ? 'Switch to English' : '切换到中文';
  }

  function renderAll() {
    renderStatic(); renderSceneCard(); renderStrip(); renderPanel(); renderAngles(); renderFocus(); renderTimeline(); renderLoop(); renderToggles();
    renderTitle(); renderChips(); renderDrawer(); R.seg = -2; // force caption/highlight refresh
  }

  // First move (in order) that isn't mastered yet — the suggested next step on the path.
  function recommendedMove() { for (var k = 1; k <= 8; k++) if ((P.level[k] || 0) < 3) return k; return 8; }
  function renderStrip() {
    var el = $('moveStrip'); el.innerHTML = '';
    var mastered = 0; D.moves.forEach(function (m) { if ((P.level[m.id] || 0) === 3) mastered++; });
    var cur = isFull() ? (R.seg >= 0 ? R.seg + 1 : 1) : S.move, rec = recommendedMove();
    var run = 0; while (run < 8 && (P.level[run + 1] || 0) === 3) run++;
    el.appendChild(h('div', { class: 'path-head' }, [
      h('span', { class: 'path-title', text: t('pathTitle') }),
      h('span', { class: 'path-pos', text: isFull() ? t('pathFull', cur) : t('pathPos', cur) }),
      h('span', { class: 'path-count', text: t('masteredCount', mastered) })
    ]));
    var row = h('div', { class: 'path' }, [h('div', { class: 'path-line', 'aria-hidden': 'true' }, [h('i', { style: 'width:' + (Math.max(0, run - 1) / 7 * 100) + '%' })])]);
    D.moves.forEach(function (m) {
      var lvl = P.level[m.id] || 0, isRec = !isFull() && m.id === rec && m.id !== cur;
      row.appendChild(h('button', {
        class: 'strip-btn lvl' + lvl + (m.id === cur ? ' current' : '') + (isRec ? ' rec' : '') + (lvl === 3 ? ' done' : ''),
        'data-move': m.id, role: 'tab', title: m.nameZh + ' · ' + m.nameEn,
        onclick: function () { if (isFull()) gotoSeg(m.id - 1); else selectMove(m.id); }
      }, [
        h('span', { class: 'node-n', text: String(m.id) }),
        h('span', { class: 'seal sm', text: m.seal }, lvl === 3 ? [h('span', { class: 'node-check' }, [icon('i-check')])] : []),
        h('span', { class: 'lvl-dots', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')]),
        isRec ? h('span', { class: 'rec-tag', text: t('recommended') }) : null
      ]));
    });
    el.appendChild(row);
  }

  function renderTitle() {
    var el = $('ovTitle'); el.innerHTML = '';
    if (isFull()) {
      el.appendChild(h('span', { class: 'ov-name', text: t('fullTitle') }));
      if (!gridOn() && fullAngles().length > 1) el.appendChild(h('span', { class: 'ov-angle', text: t(S.angle) }));
    } else {
      var m = move();
      el.appendChild(h('span', { class: 'seal xs', text: m.seal }));
      el.appendChild(h('span', { class: 'ov-name', text: S.lang === 'zh' ? m.nameZh : m.nameEn }));
      if (!gridOn()) el.appendChild(h('span', { class: 'ov-angle', text: t(S.angle) }));
    }
  }

  function renderChips() {
    var el = $('ovChips'); el.innerHTML = '';
    if (S.speed !== 1) el.appendChild(h('span', { class: 'ov-chip', text: S.speed.toFixed(2).replace(/0$/, '') + '×' }));
    if (S.mirror) el.appendChild(h('span', { class: 'ov-chip', text: t('mirror') }));
    var lm = loopMode();
    if (lm === 'step' || lm === 'chapter' || lm === 'ab') el.appendChild(h('span', { class: 'ov-chip red', text: t(lm === 'ab' ? 'loopAB' : lm === 'step' ? 'loopStep' : 'loopChapter') }));
  }

  function renderPanel() {
    var el = $('panel'); el.innerHTML = '';
    el.appendChild(h('div', { class: 'cloud-deco', 'aria-hidden': 'true' }, [icon('i-cloud')]));
    if (isFull()) return renderFullPanel(el);
    var m = move();
    var head = h('div', { class: 'p-head' }, [
      h('div', { class: 'seal lg', text: m.seal }),
      h('div', { class: 'p-titles' }, [
        h('div', { class: 'p-kicker', text: (S.lang === 'zh' ? '第' + m.seal + '式 · ' + t('ofEight') : 'Movement ' + m.id + ' ' + t('ofEight')) }),
        h('h2', { class: 'p-name', text: S.lang === 'zh' ? m.nameZh : m.nameEn }),
        h('div', { class: 'p-alt', text: S.lang === 'zh' ? m.nameEn : m.nameZh }),
        h('p', { class: 'p-sub', text: S.lang === 'zh' ? m.subtitleZh : m.subtitleEn })
      ])
    ]);
    el.appendChild(head);

    // progress
    var lvl = P.level[m.id] || 0;
    var levels = t('levels');
    var prog = h('div', { class: 'p-progress' }, [
      h('span', { class: 'lbl', text: t('progress') }),
      h('div', { class: 'seg-ctl', role: 'radiogroup', 'aria-label': t('progress') }, levels.map(function (name, k) {
        return h('button', { class: k === lvl ? 'on' : '', role: 'radio', 'aria-checked': k === lvl, text: name, onclick: function () { P.level[m.id] = k; saveProg(); renderPanel(); renderStrip(); } });
      })),
      h('span', { class: 'practice-count', text: t('practiced', P.count[m.id] || 0) })
    ]);
    el.appendChild(prog);

    // tabs
    var tabs = [['steps', 'tabSteps'], ['points', 'tabPoints'], ['mistakes', 'tabMistakes'], ['benefits', 'tabBenefits']];
    var tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(function (tb) {
      return h('button', { class: 'tab' + (S.tab === tb[0] ? ' on' : ''), role: 'tab', 'aria-selected': S.tab === tb[0], text: t(tb[1]), onclick: function () { S.tab = tb[0]; savePrefs(); renderPanel(); } });
    }));
    el.appendChild(tabBar);
    var body = h('div', { class: 'tab-body' });
    el.appendChild(body);

    if (S.tab === 'steps') {
      body.appendChild(h('div', { class: 'meta-row' }, [
        h('div', { class: 'meta' }, [h('b', { text: t('breathing') }), h('span', { text: L(m, 'breathing') })]),
        h('div', { class: 'meta' }, [h('b', { text: t('reps') }), h('span', { text: L(m, 'reps') })])
      ]));
      var seek = stepsSeekable();
      body.appendChild(h('p', { class: 'hint', text: seek ? t('tapStep') : t('stepsNoSeek') }));
      var ol = h('ol', { class: 'steps' + (seek ? ' seekable' : '') });
      stepsOf(m).forEach(function (st, i) {
        var li = h('li', { 'data-seg': seek ? i : null, class: 'step', tabindex: seek ? 0 : null }, [
          h('span', { class: 'step-n', text: String(i + 1) }),
          h('div', { class: 'step-body' }, [
            h('div', { class: 'step-top' }, [
              h('span', { class: 'breath-tag ' + st.breath, text: T.zh[st.breath] + (S.lang === 'en' ? ' · ' + T.en[st.breath + 'L'] : '') }),
              seek ? h('span', { class: 'step-time', text: st.start.toFixed(1) + '–' + st.end.toFixed(1) + 's' }) : null
            ]),
            h('p', { text: txt(st) }),
            h('div', { class: 'step-bar' }, [h('i')])
          ]),
          seek ? h('button', { class: 'step-loop', title: t('loopThis'), 'aria-label': t('loopThis'), onclick: function (e) { e.stopPropagation(); R.stepClickedAt = performance.now(); setLoop('step'); gotoSeg(i); play(); } }, [icon('i-loop')]) : null
        ]);
        if (seek) {
          li.addEventListener('click', function () { R.stepClickedAt = performance.now(); gotoSeg(i); if (!isPlaying() && !S.stepPause) play(); });
          li.addEventListener('keydown', function (e) { if (e.key === 'Enter') { gotoSeg(i); play(); } });
        }
        ol.appendChild(li);
      });
      body.appendChild(ol);
    } else if (S.tab === 'points') {
      body.appendChild(h('ul', { class: 'points' }, m.keyPoints.map(function (k) { return h('li', { text: txt(k) }); })));
    } else if (S.tab === 'mistakes') {
      body.appendChild(h('ul', { class: 'mistakes' }, m.mistakes.map(function (k) {
        return h('li', {}, [h('p', { class: 'wrong', text: txt(k) }), h('p', { class: 'fix' }, [h('b', { text: t('fix') }), document.createTextNode(S.lang === 'zh' ? k.fixZh : k.fixEn)])]);
      })));
    } else {
      body.appendChild(h('p', { class: 'benefit', text: L(m, 'benefits') }));
      body.appendChild(h('div', { class: 'meta' }, [h('b', { text: t('breathing') }), h('span', { text: L(m, 'breathing') })]));
      if (m.caution) body.appendChild(h('div', { class: 'caution' }, [h('b', { text: t('caution') }), h('span', { text: txt(m.caution) })]));
    }
    el.appendChild(renderNextUp(m));
    R.seg = -2; // force highlight refresh
  }

  function moveName(m) { return S.lang === 'zh' ? m.nameZh : m.nameEn; }
  function renderNextUp(m) {
    var box = h('div', { class: 'next-up', id: 'nextUp' });
    if (m.id < 8) {
      var n = D.moves[m.id];
      box.appendChild(h('div', { class: 'nu-k', text: t('nextUpK') }));
      box.appendChild(h('button', { class: 'nu-card', onclick: function () { selectMove(n.id); } }, [
        h('img', { class: 'nu-thumb', alt: '', src: thumbSrc(n.id) }),
        h('span', { class: 'nu-txt' }, [
          h('span', { class: 'nu-small', text: t('nextUpBtn') + ' · ' + (S.lang === 'zh' ? '第' + n.seal + '式' : 'Move ' + n.id) }),
          h('b', { text: moveName(n) })
        ]),
        icon('i-arrow')
      ]));
    } else {
      box.appendChild(h('div', { class: 'nu-k', text: t('allDoneK') }));
      box.appendChild(h('button', { class: 'nu-card', onclick: function () { selectMode('full'); } }, [
        h('span', { class: 'seal sm', text: '全' }),
        h('span', { class: 'nu-txt' }, [h('span', { class: 'nu-small', text: t('fullSub') }), h('b', { text: t('allDoneBtn') })]),
        icon('i-arrow')
      ]));
    }
    var links = h('div', { class: 'nu-links' });
    if (m.id > 1) links.appendChild(h('button', { class: 'link-btn quiet', text: '← ' + t('prevMove'), onclick: function () { selectMove(m.id - 1); } }));
    if ((P.level[m.id] || 0) < 3) links.appendChild(h('button', { class: 'link-btn', text: t('markNext'), onclick: function () {
      P.level[m.id] = 3; saveProg();
      if (m.id < 8) selectMove(m.id + 1); else { renderStrip(); renderPanel(); }
    } }));
    box.appendChild(links);
    return box;
  }

  function renderFullPanel(el) {
    el.appendChild(h('div', { class: 'p-head full' }, [
      h('div', { class: 'seal lg', text: '全' }),
      h('div', { class: 'p-titles' }, [
        h('div', { class: 'p-kicker', text: S.lang === 'zh' ? '一气呵成' : 'One continuous flow' }),
        h('h2', { class: 'p-name', text: t('fullTitle') }),
        h('p', { class: 'p-sub', text: t('fullSub') })
      ])
    ]));
    el.appendChild(h('h3', { class: 'sec-title', text: t('chapters') }));
    var sg = segments();
    var list = h('ol', { class: 'chapters' });
    D.moves.forEach(function (m, i) {
      var img = h('img', { class: 'ch-thumb', alt: '', loading: 'lazy', src: thumbSrc(m.id) });
      img.onerror = function () { img.replaceWith(h('div', { class: 'ch-thumb ph' }, [h('span', { class: 'seal sm', text: m.seal })])); };
      list.appendChild(h('li', { class: 'chapter step', 'data-seg': i, tabindex: 0, onclick: function () { gotoSeg(i); if (!isPlaying()) play(); } }, [
        img,
        h('div', { class: 'ch-body' }, [
          h('div', { class: 'ch-top' }, [h('span', { class: 'seal xs', text: m.seal }), h('span', { class: 'step-time', text: fmt(sg[i].start) })]),
          h('div', { class: 'ch-name', text: S.lang === 'zh' ? m.nameZh : m.nameEn }),
          h('div', { class: 'ch-alt', text: S.lang === 'zh' ? m.nameEn : m.nameZh }),
          h('div', { class: 'step-bar' }, [h('i')])
        ])
      ]));
    });
    el.appendChild(list);
    el.appendChild(h('div', { class: 'full-now', id: 'fullNow' }));
    R.seg = -2;
  }

  function renderFullNow(i) {
    var box = $('fullNow'); if (!box) return;
    var m = D.moves[i]; box.innerHTML = '';
    box.appendChild(h('div', { class: 'p-kicker', text: t('nowPracticing') + ' · ' + m.seal }));
    box.appendChild(h('div', { class: 'fn-name', text: S.lang === 'zh' ? m.nameZh : m.nameEn }));
    box.appendChild(h('ul', { class: 'points compact' }, m.keyPoints.slice(0, 2).map(function (k) { return h('li', { text: txt(k) }); }).concat([
      h('li', { class: 'breath-li', text: L(m, 'breathing') })
    ])));
    box.appendChild(h('button', { class: 'link-btn', text: t('studyThis'), onclick: function () { S.mode = 'move'; selectMove(m.id, true); } }));
  }

  function renderAngles() {
    var el = $('angleGroup'); el.innerHTML = '';
    var av = availableAngles();
    ANGLES.forEach(function (a) {
      var ok = av.indexOf(a) >= 0;
      var why = ok ? '' : (isFull() ? (fullAngles().length > 1 ? t('angleMissing') : t('fullFrontOnly')) : !outfitMulti() ? t('modernFrontOnly') : t('angleMissing'));
      el.appendChild(h('button', {
        class: 'seg-btn' + (!gridOn() && S.angle === a ? ' on' : ''), disabled: !ok, title: why || t(a), 'aria-pressed': !gridOn() && S.angle === a,
        onclick: function () { S.angle = a; S.grid = false; savePrefs(); loadSources({ keepTime: true }); renderAngles(); renderTitle(); track('angle_changed', { angle: a, move: S.move, mode: S.mode }); }
      }, [h('span', { text: t(a) })]));
    });
    var gOk = gridAngles().length > 1;
    el.appendChild(h('button', {
      class: 'seg-btn grid-btn' + (gridOn() ? ' on' : ''), disabled: !gOk, title: gOk ? t('grid') : (isFull() ? t('fullFrontOnly') : t('modernFrontOnly')), 'aria-pressed': gridOn(),
      onclick: function () { toggleGrid(); }
    }, [icon('i-grid'), h('span', { text: t('grid') })]));
  }
  function toggleGrid() {
    if (gridAngles().length < 2) return;
    S.grid = !gridOn(); savePrefs(); track('grid_toggled', { on: S.grid, mode: S.mode });
    loadSources({ keepTime: true }); renderAngles(); renderTitle();
  }

  function renderFocus(moveId) {
    var el = $('focusChips'); el.innerHTML = '';
    var m = D.moves[(moveId || (isFull() ? (R.seg >= 0 ? R.seg + 1 : 1) : S.move)) - 1];
    var presets = [{ zh: '全身', en: 'Full body', x: 0.5, y: 0.5, scale: 1 }].concat((m.focus || []).filter(function (f) { return f.scale > 1.001; }));
    presets.forEach(function (f, k) {
      el.appendChild(h('button', { class: 'chip' + (R.zoom.focus === k - 1 || (k === 0 && R.zoom.s <= 1.001) ? ' on' : ''), text: txt(f), onclick: function () { setFocus(f, k - 1); } }));
    });
    R.focusPresets = presets;
  }
  function setFocus(f, idx) {
    R.zoom = { s: f.scale, cx: f.x, cy: f.y, focus: f.scale <= 1 ? -1 : idx };
    applyZoom();
  }
  function setZoomScale(s) { R.zoom.s = clamp(s, 1, 3); R.zoom.focus = -2; if (R.zoom.s <= 1.001) { R.zoom.cx = 0.5; R.zoom.cy = 0.5; } applyZoom(); }
  function applyZoom() {
    single.applyView(); gridTiles.forEach(function (x) { x.applyView(); });
    $('zoom').value = R.zoom.s;
    $('zoom').style.setProperty('--fill', ((R.zoom.s - 1) / 2 * 100) + '%');
    var zl = $('ovZoom');
    zl.hidden = R.zoom.s <= 1.001;
    var name = R.zoom.focus >= 0 && R.focusPresets ? txt(R.focusPresets[R.zoom.focus + 1]) : '';
    $('zoomLabel').textContent = R.zoom.s.toFixed(1) + '×' + (name ? ' · ' + name : '');
    $('stage').classList.toggle('zoomed', R.zoom.s > 1.001);
    document.querySelectorAll('#focusChips .chip').forEach(function (c, k) { c.classList.toggle('on', (k === 0 && R.zoom.s <= 1.001) || (R.zoom.focus === k - 1 && R.zoom.s > 1.001)); });
  }

  function renderTimeline() {
    var el = $('tlSegs'); el.innerHTML = '';
    var sg = segments(), dur = master().video.duration || (isFull() ? D.fullRoutine[S.outfit].duration : (S.outfit === 'modern' ? 75 : 10));
    $('timeline').classList.toggle('has-segs', sg.length > 0);
    sg.forEach(function (s, i) {
      var label = isFull() ? D.moves[i].seal : String(i + 1);
      el.appendChild(h('div', {
        class: 'tl-seg ' + (s.breath || 'chapter'), style: 'left:' + (s.start / dur * 100) + '%;width:' + ((s.end - s.start) / dur * 100) + '%',
        title: isFull() ? D.moves[i].nameZh : t('step', i + 1)
      }, [h('span', { text: label })]));
    });
    renderAB();
  }
  function renderAB() {
    var el = $('tlAB'), dur = master().video.duration || 1;
    var a = R.ab.a, b = R.ab.b;
    $('btnA').classList.toggle('on', a != null); $('btnB').classList.toggle('on', b != null);
    $('btnA').textContent = a != null ? 'A ' + fmt(a, true) : 'A';
    $('btnB').textContent = b != null ? 'B ' + fmt(b, true) : 'B';
    if (a == null) { el.hidden = true; return; }
    var lo = b == null ? a : Math.min(a, b), hi = b == null ? a : Math.max(a, b);
    el.hidden = false; el.style.left = (lo / dur * 100) + '%'; el.style.width = Math.max(0.4, (hi - lo) / dur * 100) + '%';
    el.classList.toggle('open', b == null);
  }

  function renderLoop() {
    var lm = loopMode(), b = $('btnLoop');
    var key = { clip: 'loopClip', step: 'loopStep', chapter: 'loopChapter', ab: 'loopAB', off: 'loopOff' }[lm];
    $('loopLabel').textContent = t(key);
    b.setAttribute('aria-pressed', lm !== 'off');
    b.classList.toggle('strong', lm === 'step' || lm === 'chapter' || lm === 'ab');
    renderChips();
  }

  function renderToggles() {
    $('btnMirror').setAttribute('aria-pressed', S.mirror);
    $('btnSound').setAttribute('aria-pressed', S.videoSound);
    $('btnStepPause').setAttribute('aria-pressed', S.stepPause);
    $('btnStepPause').disabled = !segments().length;
    $('btnPrev').title = isFull() ? '' : '';
    var cuesBtn = $('btnCues'); if (cuesBtn) cuesBtn.setAttribute('aria-pressed', S.cues);
  }

  // ---------------------------------------------------------------- drawer (scene)
  function renderDrawer() { renderOutfits(); renderBgList(); renderMusic(); }

  function renderOutfits() {
    var el = $('outfitList'); el.innerHTML = '';
    el.parentNode.hidden = D.outfits.length < 2;
    D.outfits.forEach(function (o) {
      var img = h('img', { alt: '', src: thumbSrc(isFull() ? 1 : S.move, o.id), loading: 'lazy' });
      img.onerror = function () { img.replaceWith(h('div', { class: 'thumb-ph ' + o.id })); };
      el.appendChild(h('button', { class: 'outfit' + (S.outfit === o.id ? ' on' : ''), 'aria-pressed': S.outfit === o.id, onclick: function () { selectOutfit(o.id); } }, [
        h('div', { class: 'outfit-img' }, [img]),
        h('div', { class: 'outfit-txt' }, [h('b', { text: txt(o) }), h('span', { text: S.lang === 'zh' ? o.noteZh : o.noteEn })])
      ]));
    });
  }

  // Main-page avatar + background picker (the drawer has the same choices with notes).
  function avatarSrc(o) { return o.avatar || thumbSrc(isFull() ? 1 : S.move, o.id); }
  function renderSceneCard() {
    var av = $('scAvatars'), bgs = $('scBgs'); if (!av) return;
    $('sceneCard').classList.toggle('one-outfit', D.outfits.length < 2);
    av.innerHTML = '';
    D.outfits.forEach(function (o) {
      var on = S.outfit === o.id;
      av.appendChild(h('button', { class: 'sc-avatar' + (on ? ' on' : '') + (o.avatar ? ' cut' : ''), 'aria-pressed': on, title: txt(o), onclick: function () { selectOutfit(o.id); } }, [
        h('span', { class: 'sc-fig' }, [h('img', { alt: '', src: avatarSrc(o) })]),
        h('span', { class: 'sc-name', text: txt(o) })
      ]));
    });
    bgs.innerHTML = '';
    D.backgrounds.forEach(function (b) {
      var fb = BG_FALLBACK[b.id] || BG_FALLBACK.studio, on = S.bg === b.id;
      var style = 'background-image:' + (b.file && bgOK[b.id] !== false ? 'url("' + PATH.bg + b.file + '"),' : '') + fb;
      bgs.appendChild(h('button', { class: 'sc-sw' + (on ? ' on' : '') + (b.file ? '' : ' original'), 'aria-pressed': on, title: txt(b), 'aria-label': txt(b), style: style,
        onclick: function () { setBg(b.id); } }, b.file ? [] : [h('span', { class: 'sw-figure', 'aria-hidden': 'true' })]));
    });
    var cur = D.backgrounds.filter(function (b) { return b.id === S.bg; })[0];
    $('scBgName').textContent = cur ? txt(cur) : '';
  }

  function renderBgList() {
    renderSceneCard();
    var el = $('bgList'); if (!el) return; el.innerHTML = '';
    D.backgrounds.forEach(function (b) {
      var fb = BG_FALLBACK[b.id] || BG_FALLBACK.studio;
      var style = 'background-image:' + (b.file && bgOK[b.id] !== false ? 'url("' + PATH.bg + b.file + '"),' : '') + fb;
      el.appendChild(h('button', { class: 'bg-sw' + (S.bg === b.id ? ' on' : '') + (b.file ? '' : ' original'), 'aria-pressed': S.bg === b.id, onclick: function () { setBg(b.id); } }, [
        h('span', { class: 'sw', style: style }, b.file ? [] : [h('span', { class: 'sw-figure', 'aria-hidden': 'true' })]),
        h('span', { class: 'sw-name', text: txt(b) })
      ]));
    });
    var c = single.comp.mode;
    $('bgNote').textContent = S.bg === 'studio' ? t('bgNoteOff') : (c === 'svg' ? t('bgNoteSVG') : t('bgNoteGL'));
  }

  function setBg(id) { S.bg = id; savePrefs(); applyBgAll(); renderBgList(); track('background_changed', { background: id }); }

  function instById(id) { return music().instruments.filter(function (x) { return x.id === id; })[0]; }
  function trackById(id) { return music().tracks.filter(function (x) { return x.id === id; })[0]; }
  function tracksOf(inst) { return music().tracks.filter(function (x) { return x.instrument === inst; }); }

  function renderMusic() {
    var el = $('instList'); el.innerHTML = '';
    var mu = music();
    el.appendChild(h('button', { class: 'inst silence' + (!S.track ? ' on' : ''), onclick: function () { selectTrack(null); } }, [
      h('div', { class: 'inst-pic ph' }, [h('span', { class: 'silence-mark', text: '静' })]),
      h('div', { class: 'inst-txt' }, [h('b', { text: t('silence') })])
    ]));
    mu.instruments.forEach(function (ins) {
      var pic;
      if (ins.picture) {
        pic = h('div', { class: 'inst-pic' }, [h('img', { alt: '', src: PATH.pic + ins.picture, loading: 'lazy' })]);
      } else {
        pic = h('div', { class: 'inst-pic icon' }, [h('img', { alt: '', src: PATH.art + ins.icon, loading: 'lazy' })]);
      }
      var playingHere = S.track && trackById(S.track) && trackById(S.track).instrument === ins.id;
      el.appendChild(h('button', { class: 'inst' + (S.inst === ins.id ? ' on' : '') + (playingHere ? ' playing' : ''), 'aria-pressed': S.inst === ins.id, onclick: function () { S.inst = ins.id; savePrefs(); renderMusic(); } }, [
        pic, h('div', { class: 'inst-txt' }, [h('b', { text: txt(ins) }), h('span', { text: S.lang === 'zh' ? ins.descZh : ins.descEn })]),
        playingHere ? h('span', { class: 'eq', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')]) : null
      ]));
    });
    var tl = $('trackList'); tl.innerHTML = '';
    tracksOf(S.inst).forEach(function (tr) {
      var on = S.track === tr.id;
      tl.appendChild(h('button', { class: 'track' + (on ? ' on' : '') + (on && R.musicOn ? ' playing' : ''), onclick: function () { if (on) { R.musicOn ? musicPause() : musicPlay(); } else selectTrack(tr.id); } }, [
        h('span', { class: 'tr-play' }, [icon(on && R.musicOn ? 'i-pause' : 'i-play')]),
        h('span', { class: 'tr-txt' }, [h('b', { text: S.lang === 'zh' ? '《' + tr.zh + '》' : tr.en }), h('span', { text: (S.lang === 'zh' ? tr.noteZh : tr.noteEn) })]),
        h('span', { class: 'tr-dur', text: fmt(tr.duration) })
      ]));
    });
    $('btnPlayAll').setAttribute('aria-pressed', S.playAll);
    $('btnMusicPlay').disabled = !S.track;
    $('btnMusicPlay').querySelector('use').setAttribute('href', R.musicOn ? '#i-pause' : '#i-play');
    $('musicPlayLabel').textContent = R.musicOn ? t('pauseMusic') : t('playMusic');
    $('volume').value = S.volume;
    $('volume').style.setProperty('--fill', (S.volume * 100) + '%');
    renderDock(); renderSceneMusic();
    var tr = S.track && trackById(S.track);
    $('nowPlaying').textContent = tr ? t('nowPlaying') + (S.lang === 'zh' ? '：' : ': ') + (S.lang === 'zh' ? '《' + tr.zh + '》' : tr.en) + ' · ' + (S.playAll ? t('playAll') : t('loopsOne')) + ' — ' + tr.credit : t('chooseTrack');
  }

  function renderDock() {
    var box = $('mdInsts'); if (!box) return; box.innerHTML = '';
    var cur = S.track && trackById(S.track);
    music().instruments.forEach(function (ins) {
      var on = !!(cur && cur.instrument === ins.id);
      var face = ins.id === 'ensemble' ? h('span', { class: 'md-glyph', text: '合' }) : h('img', { alt: '', src: PATH.art + ins.icon });
      box.appendChild(h('button', {
        class: 'md-inst' + (on ? ' on' : '') + (on && R.musicOn ? ' playing' : ''), title: txt(ins), 'aria-label': txt(ins), 'aria-pressed': on,
        onclick: function () {
          if (on) { if (R.musicOn) musicPause(); else musicPlay(); return; }
          var first = tracksOf(ins.id)[0]; if (!first) return;
          S.inst = ins.id; selectTrack(first.id);
        }
      }, [face, h('span', { class: 'md-label', text: S.lang === 'zh' ? ins.zh : ins.en })]));
    });
    $('mdPlay').querySelector('use').setAttribute('href', R.musicOn ? '#i-pause' : '#i-play');
    $('mdPlay').setAttribute('aria-label', R.musicOn ? t('pauseMusic') : t('playMusic'));
    $('mdPlay').classList.toggle('on', R.musicOn);
    var now = $('mdNow'); now.innerHTML = '';
    if (cur) {
      var ins = instById(cur.instrument);
      now.appendChild(h('span', { class: 'md-k', text: (ins ? txt(ins) : '') + (R.musicOn ? '' : ' · ' + t('playMusic')) }));
      now.appendChild(h('b', { text: S.lang === 'zh' ? '《' + cur.zh + '》' : cur.en }));
    } else {
      now.appendChild(h('span', { class: 'md-k', text: t('music') }));
      now.appendChild(h('b', { text: t('mdNone') }));
    }
    now.title = t('mdOpen');
  }

  // Music on the main page (scene card): instrument photos, play/pause, the instrument's tracks, volume.
  function renderSceneMusic() {
    var box = $('scInsts'); if (!box) return; box.innerHTML = '';
    var cur = S.track && trackById(S.track), shown = cur ? cur.instrument : S.inst;
    music().instruments.forEach(function (ins) {
      var on = shown === ins.id, live = !!(cur && cur.instrument === ins.id && R.musicOn);
      var face = ins.picture ? h('img', { alt: '', src: PATH.pic + ins.picture }) : ins.id === 'ensemble' ? h('span', { class: 'md-glyph', text: '合' }) : h('img', { alt: '', src: PATH.art + ins.icon });
      box.appendChild(h('button', {
        class: 'sc-inst' + (on ? ' on' : '') + (live ? ' playing' : ''), 'aria-pressed': on, title: txt(ins),
        onclick: function () {
          if (cur && cur.instrument === ins.id) { if (R.musicOn) musicPause(); else musicPlay(); return; }
          var first = tracksOf(ins.id)[0]; if (!first) return;
          S.inst = ins.id; selectTrack(first.id);
        }
      }, [h('span', { class: 'sc-inst-pic' }, [face]), h('span', { class: 'sc-inst-name', text: S.lang === 'zh' ? ins.zh : ins.en })]));
    });
    var pb = $('scMuPlay');
    pb.querySelector('use').setAttribute('href', R.musicOn ? '#i-pause' : '#i-play');
    pb.setAttribute('aria-label', R.musicOn ? t('pauseMusic') : t('playMusic'));
    pb.classList.toggle('on', R.musicOn);
    pb.classList.toggle('waiting', !!S.track && !R.musicOn);
    $('scMuName').textContent = cur ? (S.lang === 'zh' ? '《' + cur.zh + '》' : cur.en) + (R.musicOn ? '' : ' · ' + t('playMusic')) : t('silence');
    var tl = $('scTracks'); tl.innerHTML = '';
    tracksOf(shown).forEach(function (tr) {
      var on = S.track === tr.id;
      tl.appendChild(h('button', { class: 'sc-track' + (on ? ' on' : '') + (on && R.musicOn ? ' playing' : ''), title: tr.credit || '',
        onclick: function () { if (on) { R.musicOn ? musicPause() : musicPlay(); } else selectTrack(tr.id); } }, [
        icon(on && R.musicOn ? 'i-pause' : 'i-play'), h('span', { text: S.lang === 'zh' ? tr.zh : tr.en })
      ]));
    });
    tl.appendChild(h('button', { class: 'sc-track ghost' + (!S.track ? ' on' : ''), onclick: function () { selectTrack(null); } }, [h('span', { text: t('silence') })]));
    var vol = $('scVol'); vol.value = S.volume; vol.style.setProperty('--fill', (S.volume * 100) + '%');
  }

  // ---------------------------------------------------------------- music
  var audio = $('music'); var fadeRAF = 0, fadeDone = null;
  function fadeTo(target, ms, done) {
    cancelAnimationFrame(fadeRAF);
    // an interrupted fade still does its follow-up (e.g. start the next track), so ducking can't cancel it
    var prev = fadeDone; fadeDone = null; if (prev) prev();
    cancelAnimationFrame(fadeRAF);
    fadeDone = done || null;
    var from = audio.volume, t0 = performance.now();
    (function step(now) {
      var p = clamp((now - t0) / ms, 0, 1);
      audio.volume = clamp(from + (target - from) * p, 0, 1);
      if (p < 1) fadeRAF = requestAnimationFrame(step);
      else { var d = fadeDone; fadeDone = null; if (d) d(); }
    })(t0);
  }
  function selectTrack(id) {
    track('music_track_selected', { track: id || 'silence', instrument: id && trackById(id) ? trackById(id).instrument : null });
    S.track = id; savePrefs();
    if (!id) { musicPause(); renderMusic(); return; }
    var tr = trackById(id);
    var start = function () {
      audio.src = PATH.track + tr.file;
      audio.loop = !S.playAll;
      audio.volume = 0;
      R.musicOn = true;
      var p = audio.play(); if (p && p.catch) p.catch(function () { R.musicOn = false; renderMusic(); });
      fadeTo(S.volume, 1200);
      renderMusic();
    };
    if (R.musicOn && !audio.paused) fadeTo(0, 500, start); else start();
  }
  function musicPlay() {
    var tr = S.track && trackById(S.track); if (!tr) return;
    if (!audio.src || audio.src.indexOf(encodeURI(tr.file)) < 0 && audio.src.indexOf(tr.file) < 0 && audio.src !== U(PATH.track + tr.file)) { selectTrack(tr.id); return; }
    audio.loop = !S.playAll; audio.volume = 0; R.musicOn = true;
    var p = audio.play(); if (p && p.catch) p.catch(function () { R.musicOn = false; renderMusic(); });
    fadeTo(S.volume, 900); renderMusic();
  }
  function musicPause() {
    R.musicOn = false;
    fadeTo(0, 600, function () { audio.pause(); });
    renderMusic();
  }
  audio.addEventListener('ended', function () {
    if (!S.playAll) return;
    var cur = trackById(S.track), list = tracksOf(cur ? cur.instrument : S.inst);
    var i = list.indexOf(cur);
    var nx = list[(i + 1) % list.length];
    if (nx) selectTrack(nx.id);
  });
  audio.addEventListener('error', function () { if (S.track) { R.musicOn = false; renderMusic(); } });

  // ---------------------------------------------------------------- selections
  function selectMove(id, fromFull) {
    track('move_selected', { move: id, from: fromFull ? 'full_routine' : S.mode });
    var wasFull = isFull();
    S.move = id; S.mode = 'move'; savePrefs();
    clearAB(true); $('ovNext').hidden = true;
    R.zoom = { s: 1, cx: 0.5, cy: 0.5, focus: -1 };
    renderAll();
    loadSources({ time: 0, play: fromFull || wasFull ? true : undefined });
    applyZoom();
  }
  function selectMode(mode) {
    if (S.mode === mode) return;
    S.mode = mode; savePrefs(); clearAB(true); track('mode_changed', { mode: mode });
    R.zoom = { s: 1, cx: 0.5, cy: 0.5, focus: -1 };
    renderAll(); loadSources({ time: 0, play: false }); applyZoom();
  }
  function selectOutfit(id) {
    if (S.outfit === id) return;
    var m = master().video, tm = m.currentTime || 0, playing = !m.paused;
    // Map position between outfits: full routine by chapter; single moves restart.
    var time = 0;
    if (isFull()) {
      var a = D.fullRoutine[S.outfit], b = D.fullRoutine[id];
      var i = segAt(tm); if (i < 0) i = 0;
      var segA = [a.chapters[i], a.chapters[i + 1] || a.duration], segB = [b.chapters[i], b.chapters[i + 1] || b.duration];
      time = segB[0] + (tm - segA[0]) / (segA[1] - segA[0]) * (segB[1] - segB[0]);
    }
    S.outfit = id; S.outfitPicked = 1; savePrefs(); clearAB(true);
    if (outfitById(id).multiAngle === false || id === 'modern') S.grid = false;
    renderAll(); loadSources({ time: time, play: playing });
  }

  // ---------------------------------------------------------------- events
  // Browsers allow sound only after a gesture, so the default track starts on the first tap or key
  // anywhere — unless that tap is itself a music control, which then decides.
  function firstGesture(e) {
    document.removeEventListener('pointerdown', firstGesture, true);
    document.removeEventListener('keydown', firstGesture, true);
    if (e.target.closest && e.target.closest('#musicDock, #instList, #trackList, #btnMusicPlay, .no-first-gesture')) return;
    if (S.track && !R.musicOn) musicPlay();
  }
  document.addEventListener('pointerdown', firstGesture, true);
  document.addEventListener('keydown', firstGesture, true);
  $('btnPlay').addEventListener('click', togglePlay);
  $('bigPlay').addEventListener('click', function (e) { e.stopPropagation(); play(); });
  $('btnPrev').addEventListener('click', function () { stepBy(-1); });
  $('btnNext').addEventListener('click', function () { stepBy(1); });
  $('speed').addEventListener('input', function (e) { setSpeed(+e.target.value); });
  $('zoom').addEventListener('input', function (e) { setZoomScale(+e.target.value); });
  $('zoomReset').addEventListener('click', function (e) { e.stopPropagation(); setFocus({ x: 0.5, y: 0.5, scale: 1 }, -1); });
  $('btnLoop').addEventListener('click', cycleLoop);
  $('btnMirror').addEventListener('click', function () { S.mirror = !S.mirror; savePrefs(); applyZoom(); renderToggles(); renderChips(); track('mirror_toggled', { on: S.mirror }); });
  $('btnSound').addEventListener('click', function () { S.videoSound = !S.videoSound; savePrefs(); applyAudio(); renderToggles(); });
  $('btnStepPause').addEventListener('click', function () { S.stepPause = !S.stepPause; savePrefs(); renderToggles(); });
  $('btnFull').addEventListener('click', toggleFullscreen);
  $('btnA').addEventListener('click', function () { R.ab.a = master().video.currentTime; if (R.ab.b != null && Math.abs(R.ab.b - R.ab.a) < 0.2) R.ab.b = null; renderAB(); renderLoop(); });
  $('btnB').addEventListener('click', function () {
    var tm = master().video.currentTime;
    if (R.ab.a == null) R.ab.a = 0;
    if (Math.abs(tm - R.ab.a) < 0.2) return;
    R.ab.b = tm; renderAB(); renderLoop(); seek(Math.min(R.ab.a, R.ab.b));
  });
  $('btnABClear').addEventListener('click', function () { clearAB(); });
  document.querySelectorAll('.mode-btn').forEach(function (b) { b.addEventListener('click', function () { selectMode(b.dataset.mode); }); });
  $('btnLang').addEventListener('click', function () { S.lang = S.lang === 'zh' ? 'en' : 'zh'; savePrefs(); renderAll(); onSegChange(); applyZoom(); if (window.BDJApp) window.BDJApp.onLang.forEach(function (f) { f(); }); gridTiles.forEach(function (x) { if (x.label) x.label.textContent = t(x.angle); if (!x.missing.hidden) x.missing.textContent = t('angleMissing'); }); });

  $('btnCues').addEventListener('click', function () { S.cues = !S.cues; savePrefs(); renderToggles(); });

  // drawer
  function openDrawer() { $('drawer').hidden = false; $('scrim').hidden = false; setTimeout(function () { document.body.classList.add('drawer-open'); }, 20); renderDrawer(); $('drawerClose').focus(); }
  function closeDrawer() { document.body.classList.remove('drawer-open'); setTimeout(function () { $('drawer').hidden = true; $('scrim').hidden = true; }, 260); }
  $('btnScene').addEventListener('click', openDrawer);
  $('drawerClose').addEventListener('click', closeDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  function onVolume(e) { S.volume = +e.target.value; savePrefs(); if (R.musicOn) { cancelAnimationFrame(fadeRAF); audio.volume = S.volume; } e.target.style.setProperty('--fill', (S.volume * 100) + '%'); }
  $('volume').addEventListener('input', onVolume);
  if ($('scVol')) $('scVol').addEventListener('input', onVolume);
  $('btnPlayAll').addEventListener('click', function () { S.playAll = !S.playAll; audio.loop = !S.playAll; savePrefs(); renderMusic(); });
  $('btnMusicPlay').addEventListener('click', function () { if (R.musicOn) musicPause(); else musicPlay(); });
  function toggleMusic() {
    if (R.musicOn) musicPause();
    else if (S.track) musicPlay();
    else { var first = tracksOf('guzheng')[0] || music().tracks[0]; if (first) { S.inst = first.instrument; selectTrack(first.id); } }
  }
  if ($('mdPlay')) $('mdPlay').addEventListener('click', toggleMusic);
  if ($('scMuPlay')) $('scMuPlay').addEventListener('click', toggleMusic);
  if ($('mdNow')) $('mdNow').addEventListener('click', function () {
    openDrawer();
    setTimeout(function () { var m = $('instList'); if (m) m.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 320);
  });
  $('btnTour').addEventListener('click', function () { if (window.BDJTour) window.BDJTour.start(); });

  // help
  function renderHelp() {
    var b = $('helpBody'); b.innerHTML = '';
    b.appendChild(h('h2', { text: t('helpTitle') }));
    b.appendChild(h('button', { class: 'tour-cta', onclick: function () { $('helpModal').hidden = true; if (window.BDJTour) window.BDJTour.start(); } }, [
      icon('i-tour'), h('span', { class: 'tc-txt' }, [h('b', { text: t('replayTour') }), h('span', { text: t('tourSub') })])
    ]));
    b.appendChild(h('ul', { class: 'tips' }, t('tips').map(function (x) { return h('li', { text: x }); })));
    b.appendChild(h('h3', { text: t('shortcuts') }));
    b.appendChild(h('dl', { class: 'keys' }, [].concat.apply([], t('help').map(function (r) { return [h('dt', {}, r[0].split(' ').map(function (k) { return h('kbd', { text: k }); })), h('dd', { text: r[1] })]; }))));
    b.appendChild(h('h3', { text: t('credits') }));
    var seen = {};
    b.appendChild(h('ul', { class: 'credits' }, music().tracks.map(function (tr) {
      return h('li', {}, [h('b', { text: (S.lang === 'zh' ? '《' + tr.zh + '》' : tr.en) }), document.createTextNode(' — ' + tr.credit)]);
    })));
    b.appendChild(h('p', { class: 'fine', text: t('about') }));
  }
  $('btnHelp').addEventListener('click', function () { renderHelp(); $('helpModal').hidden = false; $('helpClose').focus(); });
  $('helpClose').addEventListener('click', function () { $('helpModal').hidden = true; });
  $('helpModal').addEventListener('click', function (e) { if (e.target === $('helpModal')) $('helpModal').hidden = true; });

  // fullscreen
  function toggleFullscreen() {
    var el = document.querySelector('.stage-wrap');
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (el.requestFullscreen) el.requestFullscreen().catch(function () { });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(layoutAll, 60); }); });

  // timeline scrubbing
  (function () {
    var tl = $('timeline'), wasPlaying = false;
    function tAt(e) { var r = tl.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * (master().video.duration || 0); }
    tl.addEventListener('pointerdown', function (e) {
      R.scrubbing = true; wasPlaying = isPlaying(); pause();
      tl.setPointerCapture(e.pointerId); seek(tAt(e)); tl.classList.add('scrub');
    });
    tl.addEventListener('pointermove', function (e) { if (R.scrubbing) seek(tAt(e)); });
    function end() { if (!R.scrubbing) return; R.scrubbing = false; tl.classList.remove('scrub'); if (wasPlaying) play(); }
    tl.addEventListener('pointerup', end); tl.addEventListener('pointercancel', end);
    tl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); var v = master().video; seek(clamp(v.currentTime + (e.key === 'ArrowLeft' ? -1 : 1) * (isFull() ? 5 : 0.5), 0, v.duration || 0)); }
    });
  })();

  // stage: click = play/pause, drag = pan when zoomed, dblclick = reset zoom, ctrl/pinch wheel = zoom
  (function () {
    var st = $('stage'), down = null;
    st.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      down = { x: e.clientX, y: e.clientY, cx: R.zoom.cx, cy: R.zoom.cy, moved: false };
      st.setPointerCapture(e.pointerId);
    });
    st.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) down.moved = true;
      if (down.moved && R.zoom.s > 1.001) {
        var r = single.rect; if (gridOn()) r = gridTiles[0].rect;
        R.zoom.cx = clamp(down.cx + (S.mirror ? 1 : -1) * dx / (R.zoom.s * r.w), 0, 1);
        R.zoom.cy = clamp(down.cy - dy / (R.zoom.s * r.h), 0, 1);
        R.zoom.focus = -2; applyZoom();
      }
    });
    st.addEventListener('pointerup', function () { if (down && !down.moved) togglePlay(); down = null; });
    st.addEventListener('pointercancel', function () { down = null; });
    st.addEventListener('dblclick', function (e) { if (e.target.closest('button')) return; setFocus({ x: 0.5, y: 0.5, scale: 1 }, -1); togglePlay(); });
    st.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
      e.preventDefault();
      setZoomScale(R.zoom.s * Math.exp(-e.deltaY * 0.01));
    }, { passive: false });
  })();

  // keyboard
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.body.classList.contains('onb-open') || (e.target.closest && e.target.closest('.onb, .me-modal'))) return; // overlays (js/journey.js) own the keys
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') { if (!$('helpModal').hidden) $('helpModal').hidden = true; else if (!$('drawer').hidden) closeDrawer(); return; }
    if (tag === 'input' && e.target.type !== 'range') return;
    if (tag === 'textarea' || tag === 'select') return;
    var k = e.key;
    if (k === ' ' || k === 'k') { if (tag === 'button' && k === ' ') { e.preventDefault(); } e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); stepBy(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); stepBy(1); }
    else if (k === '[') setSpeed(S.speed - 0.1);
    else if (k === ']') setSpeed(S.speed + 0.1);
    else if (k === '=') setSpeed(1);
    else if (k === ',') frameStep(-1);
    else if (k === '.') frameStep(1);
    else if (k === 'l' || k === 'L') cycleLoop();
    else if (k === 'p' || k === 'P') $('btnStepPause').click();
    else if (k === 'm' || k === 'M') $('btnMirror').click();
    else if (k === 'c' || k === 'C') $('btnCues').click();
    else if (k === 'g' || k === 'G') toggleGrid();
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'a' || k === 'A') $('btnA').click();
    else if (k === 'b' || k === 'B') $('btnB').click();
    else if (k === 'z' || k === 'Z') {
      var ps = R.focusPresets || []; if (!ps.length) return;
      var next = (R.zoom.s <= 1.001 ? 0 : R.zoom.focus + 1) + 1; if (next >= ps.length) next = 0;
      setFocus(ps[next], next - 1);
    }
    else if (k === '?' || k === '/') $('btnHelp').click();
    else if ((k === 'n' || k === 'N') && !isFull() && S.move < 8) selectMove(S.move + 1);
    else if (/^[1-8]$/.test(k)) { if (isFull()) gotoSeg(+k - 1); else selectMove(+k); }
  });

  window.addEventListener('resize', function () { clearTimeout(R.rz); R.rz = setTimeout(layoutAll, 60); });

  // When the compositor decides its mode, refresh the background note.
  single.video.addEventListener('loadeddata', function () { setTimeout(function () { renderBgList(); }, 0); });

  // ---------------------------------------------------------------- boot
  renderAll();
  setSpeed(S.speed);
  applyBgAll();
  loadSources({ time: 0, play: false });
  applyZoom();
  requestAnimationFrame(tick);
  booted = true;
  // Load the music now so it is ready; try to start it (browsers that block sound wait for the first tap).
  (function () {
    var tr0 = S.track && trackById(S.track); if (!tr0) return;
    audio.preload = 'auto'; audio.src = U(PATH.track + tr0.file); audio.loop = !S.playAll;
    audio.volume = 0; var p = audio.play(); if (p && p.then) p.then(function () { R.musicOn = true; fadeTo(S.volume, 1500); renderMusic(); }, function () { });
  })();

  // API for the interactive walkthrough (js/tour.js)
  window.BDJApp = {
    S: S, R: R, P: P, D: D, t: function (zh, en) { return S.lang === 'zh' ? zh : en; },
    site: { id: SITE.id || '', logo: SITE.logo || '锦程', zh: T.zh.appTitle, en: T.en.appTitle }, outfitById: outfitById,
    isPlaying: isPlaying, play: play, pause: pause, gridOn: gridOn, loopMode: loopMode, isFull: isFull,
    stepsSeekable: stepsSeekable, openDrawer: openDrawer, closeDrawer: closeDrawer, selectMove: selectMove,
    selectMode: selectMode, selectOutfit: selectOutfit, setSpeed: setSpeed, toggleGrid: toggleGrid,
    setFocus: setFocus, master: master, drawerOpen: function () { return !$('drawer').hidden; },
    musicOn: function () { return R.musicOn; }, renderAll: function () { renderAll(); onSegChange(); applyZoom(); },
    // for js/journey.js (onboarding, progress)
    saveProg: saveProg, onProgress: progListeners, dayKey: dayKey, selectTrack: selectTrack, musicPlay: musicPlay, musicPause: musicPause, trackById: trackById, tracksOf: tracksOf,
    setBg: setBg, setLang: function (l) { if (S.lang !== l) $('btnLang').click(); },
    clipUrl: function (id, angle) { var o = D.outfits[0], md = o.movesDir || (o.dir && o.dir + '/moves'); return U(PATH.video + md + '/' + D.moves[id - 1].slug + '/' + (angle || 'front') + '.mp4'); },
    bgUrl: function (bg) { return bg.file ? U(PATH.bg + bg.file) : ''; }, picUrl: function (x) { return x.picture ? U(PATH.pic + x.picture) : U(PATH.art + x.icon); },
    avatarUrl: function (o) { return U((o || D.outfits[0]).avatar || ''); }, thumbUrl: function (id) { return U(PATH.thumb + 'thumb_' + thumbKey() + '_' + id + '.jpg'); },
    onLang: [], h: h, icon: icon,
    // for js/voice.js (voiceover + voice coach)
    onSeg: [], segments: segments, segAt: segAt, gotoSeg: gotoSeg, availableAngles: availableAngles,
    setAngle: function (a) { if (availableAngles().indexOf(a) < 0) return false; S.angle = a; S.grid = false; savePrefs(); loadSources({ keepTime: true }); renderAngles(); renderTitle(); return true; },
    toggleMirror: function () { $('btnMirror').click(); },
    duck: function (on) { if (R.musicOn) fadeTo(on ? S.volume * 0.25 : S.volume, on ? 250 : 700); }
  };

  // test hook (used by tools/ verification scripts; harmless otherwise)
  window.__bdj = {
    S: S, R: R, P: P, master: master, single: single, gridTiles: gridTiles, play: play, pause: pause, seek: seek,
    setSpeed: setSpeed, selectMove: selectMove, selectMode: selectMode, selectOutfit: selectOutfit, toggleGrid: toggleGrid,
    setBg: function (id) { S.bg = id; applyBgAll(); renderBgList(); }, setFocus: setFocus, openDrawer: openDrawer, closeDrawer: closeDrawer,
    setLang: function (l) { if (S.lang !== l) $('btnLang').click(); }, selectTrack: selectTrack
  };
})();
