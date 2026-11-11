/* 锦程 · interactive walkthrough — spotlights one control at a time and waits for you to try it. */
(function () {
  'use strict';
  var A = window.BDJApp;
  if (!A) return;
  var DONE_KEY = 'bdj.web.tourDone.v1' + (A.site.id ? '.' + A.site.id : '');
  var $ = function (id) { return document.getElementById(id); };
  var q = function (sel) { return document.querySelector(sel); };
  var t = A.t;

  // Each step: target (element getter), text, optional setup, and an optional `done` check —
  // steps with a check wait until you actually do the thing, then advance on their own.
  var start0 = {};
  var STEPS = [
    { center: true, setup: function () { A.closeDrawer(); },
      title: function () { return t('欢迎来到' + A.site.zh, 'Welcome to ' + A.site.en); },
      body: function () { return t('一分钟，跟着提示动手试一试：调速度、跟呼吸、换角度、放大细节，再换上喜欢的服装、背景和音乐。', 'In one minute you’ll try everything yourself: speed, breathing, angles, zoom — then pick an outfit, background and music.'); },
      next: function () { return t('开始引导', 'Start the tour'); } },

    { target: function () { return $('moveStrip'); }, setup: function () { if (A.isFull()) A.selectMode('move'); },
      title: function () { return t('学习路径：从第一式到第八式', 'Your path: move 1 to move 8'); },
      body: function () { return t('依次学完八式。红章是当前这一式，“下一式”提示你接下来学什么；学会后标记为“已掌握”，路径会连起来。', 'Learn the eight moves in order. The red seal is where you are, “Up next” shows what comes after, and marking a move “Mastered” fills in the path.'); } },

    { target: function () { return $('btnPlay'); }, pad: 10,
      title: function () { return t('播放', 'Play'); },
      body: function () { return t('点红色按钮开始播放（也可以点画面或按空格）。', 'Press the red button to play (or tap the video, or press Space).'); },
      done: function () { return A.isPlaying(); } },

    { target: function () { return q('.cluster.speed'); },
      setup: function () { start0.speed = A.S.speed; },
      title: function () { return t('慢下来看清细节', 'Slow it down'); },
      body: function () { return t('把速度滑块拖到 0.5× 左右。初学先慢，熟练后再回到 1×。', 'Drag the speed slider down to about 0.5×. Learn slowly first, then build back up to 1×.'); },
      done: function () { return A.S.speed <= 0.6; } },

    { target: function () { return $('ovBreath').hidden ? $('stage') : $('ovBreath'); }, pad: 12,
      setup: function () { if (!A.S.cues) $('btnCues').click(); if (!A.isPlaying()) A.play(); },
      title: function () { return t('跟着圆圈呼吸', 'Breathe with the circle'); },
      body: function () { return t('圆圈变大时吸气，变小时呼气，金色时稍停。时间轴的颜色也表示呼吸。', 'Inhale as the circle grows, exhale as it shrinks, pause when it turns gold. The timeline colours show the breath too.'); } },

    { target: function () { return q('.steps.seekable') || q('.tab-body'); },
      setup: function () { if (A.S.tab !== 'steps') { A.S.tab = 'steps'; A.renderAll(); } start0.click = A.R.stepClickedAt || 0; },
      title: function () { return t('分解步骤', 'Step by step'); },
      body: function () { return t('点任意一步跳到那里；点右边的 ↻ 只循环这一步，反复练到熟。', 'Tap any step to jump to it; tap ↻ on the right to loop just that step until it feels natural.'); },
      done: function () { return (A.R.stepClickedAt || 0) > start0.click; } },

    { target: function () { return $('angleGroup'); },
      setup: function () { var o0 = A.D.outfits[0].id; if (A.S.outfit !== o0) A.selectOutfit(o0); start0.angle = A.S.angle; },
      title: function () { return t('换个角度看', 'Change the angle'); },
      body: function () { return t('点“左侧”“右侧”或“背面”，从不同方向看动作。划线的角度没有拍摄。', 'Tap Left, Right or Back to see the move from another side. Struck-through angles weren’t filmed.'); },
      done: function () { return A.S.angle !== start0.angle || A.gridOn(); } },

    { target: function () { return q('.grid-btn'); }, pad: 8,
      title: function () { return t('四视角同步', 'All four angles at once'); },
      body: function () { return t('打开“四视角”：四个角度同步播放，中间是呼吸提示，红框标出这一步最值得看的角度。', 'Turn on “4 angles”: all views play in sync, the breathing cue sits in the middle, and a red frame marks the best view for the current step.'); },
      done: function () { return A.gridOn(); } },

    { target: function () { return $('stage'); }, setup: function () { if (!A.isPlaying()) A.play(); },
      title: function () { return t('看懂四视角提示', 'Reading the 4-angle cues'); },
      body: function () { return t('每个画面下方写着该角度要看什么；红框会随着步骤移动。看完点“下一步”。', 'Each view says what to watch from that side; the red frame moves with the steps. Press Next when you’re ready.'); } },

    { target: function () { return q('.cluster.zoom'); },
      setup: function () { if (A.gridOn()) A.toggleGrid(); },
      title: function () { return t('放大细节', 'Zoom in on details'); },
      body: function () { return t('点一个部位（如“手掌”“马步”）放大；放大后可以拖动画面，双击复位。', 'Tap a body part (like Hands or Stance) to zoom; drag the video to pan, double-click to reset.'); },
      done: function () { return A.R.zoom.s > 1.2; } },

    { target: function () { return $('scAvatars'); }, pad: 8, only: function () { return A.D.outfits.length > 1; },
      setup: function () { A.setFocus({ x: 0.5, y: 0.5, scale: 1 }, -1); if (A.drawerOpen()) A.closeDrawer(); start0.outfit = A.S.outfit; },
      title: function () { return t('换服装（形象）', 'Change the outfit'); },
      body: function () { var o = A.D.outfits; return t('点右上角的形象，在“' + o[0].zh + '”和“' + o[1].zh + '”之间切换，看看哪套更适合你。', 'Tap an avatar to switch between “' + o[0].en + '” and “' + o[1].en + '” — pick the look you like.'); },
      done: function () { return A.S.outfit !== start0.outfit; } },

    { target: function () { return $('scBgs'); }, pad: 8, setup: function () { start0.bg = A.S.bg; },
      title: function () { return t('换视频背景', 'Change the background'); },
      body: function () { return t('点一个小圆图标换山水：竹林、月夜、宫墙……人物会实时抠像放到新背景上。', 'Tap a round icon to change the scene — bamboo, moonlit night, palace wall… The figure is cut out live onto it.'); },
      done: function () { return A.S.bg !== start0.bg; } },

    { target: function () { return $('musicDock'); }, pad: 6, setup: function () { start0.music = A.musicOn(); },
      title: function () { return t('配一曲古乐', 'Add traditional music'); },
      body: function () { return t('默认是古筝《高山流水》。点乐器图标换琵琶、笛箫、二胡，或点播放键开关音乐。', 'The default is “High Mountain, Flowing Water” on guzheng. Tap an instrument for pipa, dizi or erhu, or the play button to turn music on and off.'); },
      done: function () { return A.musicOn() !== start0.music; } },

    { target: function () { return $('btnScene'); }, pad: 6,
      title: function () { return t('更多选项', 'More options'); },
      body: function () { return t('全部曲目、背景说明和服装介绍都在“布景 · 音乐 · 服装”里。', 'Every track, background and outfit, with notes, lives in Scene · Music · Outfit.'); },
      done: function () { return A.drawerOpen(); } },

    { center: true, setup: function () { A.closeDrawer(); },
      title: function () { return t('都学会了！', 'You’re all set!'); },
      body: function () { return t('从第一式开始，一式一式学到位。随时可点右上角“引导”再看一遍。', 'Start with move 1 and work through to move 8. Press “Tour” at the top any time to see this again.'); },
      next: function () { return t('从第一式开始', 'Start move 1'); },
      finish: function () { var o0 = A.D.outfits[0].id; if (A.S.outfit !== o0) A.selectOutfit(o0); A.selectMove(1); } }
  ];

  STEPS = STEPS.filter(function (s) { return !s.only || s.only(); });
  var root = $('tour'), spot = $('tourSpot'), card = $('tourCard');
  var dims = { top: q('.t-top'), left: q('.t-left'), right: q('.t-right'), bottom: q('.t-bottom') };
  var idx = -1, raf = 0, doneAt = 0, wasDone = false;

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function start() {
    A.R.tourOn = true;
    root.hidden = false;
    document.body.classList.add('touring');
    go(0);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function end(completed) {
    var s = STEPS[idx];
    A.R.tourOn = false;
    root.hidden = true;
    document.body.classList.remove('touring');
    cancelAnimationFrame(raf);
    try { localStorage.setItem(DONE_KEY, '1'); } catch (e) { }
    if (completed && s && s.finish) s.finish();
    else A.closeDrawer();
  }
  function go(i) {
    idx = Math.max(0, Math.min(STEPS.length - 1, i));
    var s = STEPS[idx];
    wasDone = false; doneAt = 0;
    if (s.setup) s.setup();
    var el = s.target && s.target();
    if (el && el.scrollIntoView) {
      var r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    render();
  }
  function render() {
    var s = STEPS[idx], done = s.done && s.done();
    card.innerHTML = '';
    card.className = 'tour-card' + (s.center ? ' center' : '') + (done ? ' is-done' : '');
    card.dataset.logo = A.site.logo;
    var top = h('div', 'tc-top');
    top.appendChild(h('span', 'tc-count', (idx + 1) + ' / ' + STEPS.length));
    var dots = h('span', 'tc-dots');
    STEPS.forEach(function (_, k) { dots.appendChild(h('i', k < idx ? 'past' : k === idx ? 'now' : '')); });
    top.appendChild(dots);
    var x = h('button', 'tc-x', '×'); x.setAttribute('aria-label', t('关闭引导', 'Close tour')); x.onclick = function () { end(false); };
    top.appendChild(x);
    card.appendChild(top);
    card.appendChild(h('h3', 'tc-title', s.title()));
    card.appendChild(h('p', 'tc-body', s.body()));
    if (s.done) {
      var task = h('div', 'tc-task' + (done ? ' ok' : ''));
      task.appendChild(h('span', 'tc-task-ic', done ? '✓' : '●'));
      task.appendChild(h('span', '', done ? t('做得好！', 'Nice — you did it!') : t('试一试：完成上面的操作', 'Your turn: try it now')));
      card.appendChild(task);
    }
    var nav = h('div', 'tc-nav');
    if (idx > 0 && !s.center) { var back = h('button', 'tc-btn ghost', t('上一步', 'Back')); back.onclick = function () { go(idx - 1); }; nav.appendChild(back); }
    if (!s.center || idx === 0) { var skip = h('button', 'tc-btn ghost', idx === 0 ? t('以后再说', 'Maybe later') : t('跳过引导', 'Skip tour')); skip.onclick = function () { end(false); }; nav.appendChild(skip); }
    var nextLabel = s.next ? s.next() : (s.done && !done ? t('跳过这步', 'Skip this step') : t('下一步', 'Next'));
    var nx = h('button', 'tc-btn' + (s.done && !done ? ' soft' : ''), nextLabel);
    nx.onclick = function () { if (idx === STEPS.length - 1) end(true); else go(idx + 1); };
    nav.appendChild(nx);
    card.appendChild(nav);
    setTimeout(function () { try { nx.focus({ preventScroll: true }); } catch (e) { } }, 30);
  }

  // Follow the target every frame (layout shifts, drawer slides, scrolling) and watch for completion.
  function loop() {
    var s = STEPS[idx];
    if (s) {
      var el = !s.center && s.target && s.target();
      var r = el ? el.getBoundingClientRect() : null;
      if (r && r.width && r.height) place(r, s.pad || 6); else place(null);
      if (s.done) {
        var d = !!s.done();
        if (d && !wasDone) { wasDone = true; doneAt = performance.now(); render(); }
        if (!d && wasDone) { wasDone = false; render(); }
        if (wasDone && performance.now() - doneAt > 1100 && idx < STEPS.length - 1) go(idx + 1);
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function place(r, pad) {
    var W = innerWidth, H = innerHeight;
    if (!r) {
      dims.top.style.cssText = 'left:0;top:0;width:100%;height:100%';
      dims.left.style.cssText = dims.right.style.cssText = dims.bottom.style.cssText = 'display:none';
      spot.style.display = 'none';
      card.style.left = card.style.top = '';
      return;
    }
    var x0 = Math.max(0, r.left - pad), y0 = Math.max(0, r.top - pad), x1 = Math.min(W, r.right + pad), y1 = Math.min(H, r.bottom + pad);
    dims.top.style.cssText = 'left:0;top:0;width:100%;height:' + y0 + 'px';
    dims.bottom.style.cssText = 'left:0;top:' + y1 + 'px;width:100%;height:' + Math.max(0, H - y1) + 'px';
    dims.left.style.cssText = 'left:0;top:' + y0 + 'px;width:' + x0 + 'px;height:' + (y1 - y0) + 'px';
    dims.right.style.cssText = 'left:' + x1 + 'px;top:' + y0 + 'px;width:' + Math.max(0, W - x1) + 'px;height:' + (y1 - y0) + 'px';
    spot.style.display = 'block';
    spot.style.cssText += ';left:' + x0 + 'px;top:' + y0 + 'px;width:' + (x1 - x0) + 'px;height:' + (y1 - y0) + 'px';
    // Card: below the target if there's room, else above, else beside; phones dock it at the bottom.
    var cw = card.offsetWidth || 340, ch = card.offsetHeight || 200, gap = 14, left, top;
    if (W < 640) { card.style.left = ''; card.style.top = ''; return; }
    if (y1 + gap + ch < H - 8) top = y1 + gap;
    else if (y0 - gap - ch > 8) top = y0 - gap - ch;
    else top = Math.max(8, Math.min(H - ch - 8, (y0 + y1) / 2 - ch / 2));
    left = (x0 + x1) / 2 - cw / 2;
    if (top > y0 - ch && top < y1 && (x1 + gap + cw < W)) left = x1 + gap;
    else if (top > y0 - ch && top < y1 && (x0 - gap - cw > 0)) left = x0 - gap - cw;
    card.style.left = Math.max(10, Math.min(W - cw - 10, left)) + 'px';
    card.style.top = Math.max(10, top) + 'px';
  }

  document.addEventListener('keydown', function (e) {
    if (!A.R.tourOn) return;
    var range = e.target && e.target.type === 'range';
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(false); }
    else if (e.key === 'ArrowRight' && !range) { e.preventDefault(); e.stopImmediatePropagation(); if (idx < STEPS.length - 1) go(idx + 1); else end(true); }
    else if (e.key === 'ArrowLeft' && !range) { e.preventDefault(); e.stopImmediatePropagation(); go(idx - 1); }
  }, true);

  window.BDJTour = { start: start, end: end, go: go, steps: STEPS.length };

  // First visit: offer the tour once the page has settled.
  var seen = false; try { seen = localStorage.getItem(DONE_KEY) === '1'; } catch (e) { }
  if (!seen && !window.BDJ_NO_TOUR) setTimeout(start, 900);
})();
