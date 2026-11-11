/* 锦影 · journey: onboarding (sign-in, goals, level, time, reminders, benefits, features, plan),
   the "My progress" view (practice chart, streak, plan, reminders) and practice reminders.
   On when D.site.journey is set. Plan + profile live in localStorage (bdj.journey.v1.<site>).
   Sign-in providers are configured in D.site.auth; without config (or from file://) each button
   saves a profile on this device only and says so. */
(function () {
  'use strict';
  var A = window.BDJApp;
  if (!A || !A.D.site || !A.D.site.journey) return;
  var D = A.D, SITE = D.site, JD = D.journey || {}, AUTH = SITE.auth || {};
  var KEY = 'bdj.journey.v1.' + (SITE.id || 'main');
  var h = A.h, icon = A.icon, t = A.t;
  var $ = function (id) { return document.getElementById(id); };
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  function zh() { return A.S.lang === 'zh'; }
  function L(o) { return o ? (zh() ? o.zh : o.en) : ''; }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(J)); } catch (e) { } if (window.BDJCloud && window.BDJCloud.changed) window.BDJCloud.changed(); }

  var J = read();
  var forced = /[?&#]onboarding\b/.test(location.search + location.hash);
  window.BDJ_NO_TOUR = true; // js/tour.js runs after this file; the plan step and the Tour button offer it instead
  function plan() {
    return {
      goals: J.goals || [], level: J.level || 'new', minutes: J.minutes || 10, days: J.days || 5, weeks: J.weeks || 4,
      reminder: J.reminder || { on: false, time: '07:30', days: defaultDays(J.days || 5) }
    };
  }
  function defaultDays(n) { return n >= 7 ? [1, 2, 3, 4, 5, 6, 7] : n >= 5 ? [1, 2, 3, 4, 5] : [1, 3, 5]; }
  function levelOf(id) { return (JD.levels || []).filter(function (l) { return l.id === id; })[0] || (JD.levels || [])[0] || { weeks: 4 }; }
  var WD = { zh: ['一', '二', '三', '四', '五', '六', '日'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  function wd(i) { return zh() ? '周' + WD.zh[i - 1] : WD.en[i - 1]; }

  // ---------------------------------------------------------------- practice data (P.days: seconds per local day)
  function daysBack(n) {
    var out = [], d = new Date();
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i); out.push({ date: x, key: A.dayKey(x), min: (A.P.days[A.dayKey(x)] || 0) / 60 }); }
    return out;
  }
  function streak() {
    var d = new Date(), n = 0, i = 0;
    if (!((A.P.days[A.dayKey(d)] || 0) >= 60)) i = 1; // today not yet: count from yesterday
    for (; i < 400; i++) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i); if ((A.P.days[A.dayKey(x)] || 0) >= 60) n++; else break; }
    return n;
  }
  function weekMinutes() {
    var d = new Date(), dow = (d.getDay() + 6) % 7, s = 0;
    for (var i = 0; i <= dow; i++) s += (A.P.days[A.dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i))] || 0) / 60;
    return s;
  }
  function mastered() { var n = 0; D.moves.forEach(function (m) { if ((A.P.level[m.id] || 0) === 3) n++; }); return n; }
  function totalMinutes() { var s = 0; for (var k in A.P.days) s += A.P.days[k]; return s / 60; }

  // ---------------------------------------------------------------- charts (SVG, single series, hover tooltips)
  // Bars ≤ 24 px with a 4 px rounded data end, hairline grid, labels in text colours, one tooltip layer.
  function svg(tag, attrs, kids) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function barPath(x, y, w, hgt, r) {
    if (hgt <= 0) return '';
    r = Math.min(r, w / 2, hgt);
    return 'M' + x + ',' + (y + hgt) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + hgt) + 'Z';
  }
  function niceMax(v) {
    if (v <= 5) return 5;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p, steps = [1, 1.2, 1.6, 2, 3, 4, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (n <= steps[i]) return steps[i] * p;
    return 10 * p;
  }
  function fmtMin(m) { return m > 0 && m < 1 ? '<1' : String(Math.round(m)); }
  // rows: [{label, sub, value, tip, accent}], opts: {height, goal, goalLabel, unit, endLabel}
  function barChart(rows, opts) {
    var W = opts.width || 560, H = opts.height || 190, padL = 34, padR = 12, padT = 18, padB = opts.sub ? 40 : 24;
    var max = niceMax(Math.max(opts.goal || 0, 1, Math.max.apply(null, rows.map(function (r) { return r.value; }))) * 1.08);
    var plotW = W - padL - padR, plotH = H - padT - padB, slot = plotW / rows.length, bw = Math.min(24, slot * 0.62);
    var y = function (v) { return padT + plotH - v / max * plotH; };
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'jc-svg', role: 'img', 'aria-label': opts.title || '' });
    if (max % 2) max += 1; // keep the middle tick a whole number
    [0, max / 2, max].forEach(function (v) {
      root.appendChild(svg('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: 'jc-grid' }));
      var tx = svg('text', { x: padL - 6, y: y(v) + 4, class: 'jc-tick', 'text-anchor': 'end' }); tx.textContent = Math.round(v); root.appendChild(tx);
    });
    var wrap = h('div', { class: 'jc' }), tip = h('div', { class: 'jc-tip', hidden: true });
    rows.forEach(function (r, i) {
      var x = padL + slot * i + (slot - bw) / 2, top = y(r.value);
      var g = svg('g', { class: 'jc-bar' + (r.accent ? ' accent' : '') + (r.value <= 0 ? ' zero' : '') });
      g.appendChild(svg('path', { d: barPath(x, top, bw, padT + plotH - top, 4) }));
      if (r.value <= 0) g.appendChild(svg('line', { x1: x, x2: x + bw, y1: padT + plotH - 0.5, y2: padT + plotH - 0.5, class: 'jc-zero' }));
      var hit = svg('rect', { x: padL + slot * i, y: padT, width: slot, height: plotH + padB, class: 'jc-hit' });
      g.appendChild(hit);
      if (r.label) { var lb = svg('text', { x: x + bw / 2, y: H - padB + 16, class: 'jc-x' + (r.accent ? ' strong' : ''), 'text-anchor': 'middle' }); lb.textContent = r.label; g.appendChild(lb); }
      if (r.sub) { var sb = svg('text', { x: x + bw / 2, y: H - padB + 31, class: 'jc-x sub', 'text-anchor': 'middle' }); sb.textContent = r.sub; g.appendChild(sb); }
      if (i === rows.length - 1 && opts.endLabel) { var el = svg('text', { x: x + bw / 2, y: top - 6, class: 'jc-end', 'text-anchor': 'middle' }); el.textContent = opts.endLabel; g.appendChild(el); }
      var show = function () {
        tip.textContent = r.tip; tip.hidden = false;
        var bb = root.getBoundingClientRect(), k = bb.width / W;
        tip.style.left = ((x + bw / 2) * k) + 'px'; tip.style.top = (top * k) + 'px';
        g.classList.add('hover');
      };
      var hide = function () { tip.hidden = true; g.classList.remove('hover'); };
      hit.addEventListener('pointerenter', show); hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', show); hit.addEventListener('blur', hide); hit.setAttribute('tabindex', '0');
      root.appendChild(g);
    });
    if (opts.goal) {
      root.appendChild(svg('line', { x1: padL, x2: W - padR, y1: y(opts.goal), y2: y(opts.goal), class: 'jc-goal' }));
      var gl = svg('text', { x: W - padR, y: y(opts.goal) - 5, class: 'jc-goal-t', 'text-anchor': 'end' }); gl.textContent = opts.goalLabel || ''; root.appendChild(gl);
    }
    wrap.appendChild(root); wrap.appendChild(tip);
    // table view for screen readers / exact numbers
    var tb = h('table', { class: 'jc-table' }, [h('caption', { text: opts.title || '' })]);
    rows.forEach(function (r) { tb.appendChild(h('tr', {}, [h('th', { text: r.tableLabel || r.label || '' }), h('td', { text: r.tip })])); });
    var det = h('details', { class: 'jc-details' }, [h('summary', { text: t('表格', 'Table view') }), tb]);
    wrap.appendChild(det);
    return wrap;
  }

  function planRows(p) {
    var lv = levelOf(p.level), weekly = p.minutes * p.days, rows = [];
    for (var w = 1; w <= p.weeks; w++) {
      var moves = Math.min(8, Math.ceil(8 * w / lv.weeks)), cum = weekly * w;
      rows.push({
        label: zh() ? '第' + w + '周' : 'W' + w, tableLabel: zh() ? '第 ' + w + ' 周' : 'Week ' + w,
        sub: moves >= 8 ? (zh() ? '八式 ✓' : '8 ✓') : (zh() ? moves + ' 式' : moves + ' moves'),
        value: cum, accent: w === 1,
        tip: zh() ? '第 ' + w + ' 周：累计 ' + cum + ' 分钟 · 学会 ' + moves + ' 式' : 'Week ' + w + ': ' + cum + ' min in total · ' + moves + ' of 8 moves learned'
      });
    }
    return rows;
  }
  function planChart(p) {
    var rows = planRows(p), total = rows[rows.length - 1].value;
    return h('figure', { class: 'jc-fig' }, [
      h('figcaption', {}, [h('b', { text: t('你的计划会这样累积', 'How your plan adds up') }),
        h('span', { text: t('累计练习分钟 · 每周学会的招式', 'Cumulative practice minutes · moves learned by each week') })]),
      barChart(rows, { title: t('计划：累计练习分钟', 'Plan: cumulative practice minutes'), width: 380, height: 230, sub: true, endLabel: total + (zh() ? ' 分钟' : ' min') })
    ]);
  }
  function dailyChart(p) {
    var days = daysBack(14);
    var rows = days.map(function (d, i) {
      var today = i === days.length - 1, m = Math.round(d.min * 10) / 10;
      return {
        label: today ? t('今天', 'Today') : (i % 2 === 1 ? String(d.date.getDate()) : ''), tableLabel: (d.date.getMonth() + 1) + '/' + d.date.getDate(),
        value: d.min, accent: today,
        tip: (d.date.getMonth() + 1) + '/' + d.date.getDate() + ' · ' + fmtMin(m) + (zh() ? ' 分钟' : ' min')
      };
    });
    return h('figure', { class: 'jc-fig' }, [
      h('figcaption', {}, [h('b', { text: t('最近 14 天', 'Last 14 days') }), h('span', { text: t('每天练习分钟', 'Minutes practised per day') })]),
      barChart(rows, { title: t('最近 14 天每天练习分钟', 'Minutes practised per day, last 14 days'), width: 690, height: 190, goal: p.minutes, goalLabel: t('每日目标 ' + p.minutes + ' 分钟', 'Daily goal ' + p.minutes + ' min') })
    ]);
  }

  // ---------------------------------------------------------------- sign-in
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = function () { res(); }; s.onerror = function () { rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function decodeJwt(tok) {
    try { var b = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch (e) { return {}; }
  }
  var secure = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var SDK = {
    google: 'https://accounts.google.com/gsi/client',
    apple: 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
  };
  function cloud(m) { return !!(window.BDJCloud && window.BDJCloud.enabled(m)); }
  function errText(e) { return e && (e.message || e.error || e.type) ? String(e.message || e.error || e.type) : String(e); }
  var Auth = {
    preload: function () {
      ['google', 'apple'].forEach(function (m) { if (Auth.ready(m)) loadScript(SDK[m]).then(function () { Auth[m + 'Loaded'] = true; }, function () { }); });
    },
    ready: function (m) {
      if (!secure) return false;
      if (m === 'google') return !!AUTH.googleClientId || cloud('google');
      if (m === 'apple') return !!(AUTH.apple && AUTH.apple.clientId && AUTH.apple.redirectURI);
      if (m === 'phone') return !!AUTH.firebase || cloud('phone');
      return false;
    },
    google: function () {
      // Supabase Google provider on: full redirect sign-in (account + synced progress); comes back signed in.
      if (cloud('google')) return window.BDJCloud.oauth('google', 'goals').then(function () { return new Promise(function () { }); });
      // Called from the click: if the SDK is already loaded the popup opens inside the gesture.
      var go = function () {
        return new Promise(function (res, rej) {
          var c = window.google.accounts.oauth2.initTokenClient({
            client_id: AUTH.googleClientId, scope: 'openid email profile',
            callback: function (r) {
              if (r.error) return rej(new Error(r.error));
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })
                .then(function (x) { if (!x.ok) throw new Error('userinfo ' + x.status); return x.json(); })
                .then(function (u) { res({ provider: 'google', id: 'google:' + u.sub, name: u.name, email: u.email, picture: u.picture, verified: true }); }, rej);
            },
            error_callback: function (e) { rej(new Error(e && e.type || 'google')); }
          });
          c.requestAccessToken();
        });
      };
      return Auth.googleLoaded ? go() : loadScript(SDK.google).then(go);
    },
    apple: function () {
      var useCloud = cloud('apple'), nc = null;
      var go = function () {
        window.AppleID.auth.init({ clientId: AUTH.apple.clientId, scope: 'name email', redirectURI: AUTH.apple.redirectURI, usePopup: true, nonce: nc ? nc.hashed : undefined });
        return window.AppleID.auth.signIn();
      };
      // Supabase Apple provider on: hand Apple's ID token to Supabase (needs a nonce made before the popup).
      var start = useCloud ? window.BDJCloud.nonce().then(function (x) { nc = x; }) : Promise.resolve();
      return start.then(function () { return Auth.appleLoaded ? go() : loadScript(SDK.apple).then(go); }).then(function (r) {
        var tok = r.authorization && r.authorization.id_token || '', p = decodeJwt(tok), n = r.user && r.user.name;
        var name = n ? ((n.firstName || '') + ' ' + (n.lastName || '')).trim() : '';
        if (useCloud) return window.BDJCloud.idToken('apple', tok, nc.raw).then(function (cp) { if (!cp.name && name) cp.name = name; return cp; });
        return { provider: 'apple', id: 'apple:' + p.sub, email: p.email || (r.user && r.user.email), name: name, verified: true };
      });
    },
    phoneSend: function (number) {
      if (cloud('phone')) {   // Supabase → Twilio Verify
        Auth.phoneNumber = number;
        return window.BDJCloud.phoneStart(number).then(function (r) { if (!r.ok) throw new Error(r.message || r.error); });
      }
      var v = 'https://www.gstatic.com/firebasejs/10.12.2/';
      return loadScript(v + 'firebase-app-compat.js').then(function () { return loadScript(v + 'firebase-auth-compat.js'); }).then(function () {
        var fb = window.firebase;
        if (!fb.apps.length) fb.initializeApp(AUTH.firebase);
        if (Auth.verifier) { try { Auth.verifier.clear(); } catch (e) { } }
        Auth.verifier = new fb.auth.RecaptchaVerifier('onbRecaptcha', { size: 'invisible' });
        return fb.auth().signInWithPhoneNumber(number, Auth.verifier);
      }).then(function (cr) { Auth.confirmation = cr; }, function (e) { if (Auth.verifier) { try { Auth.verifier.clear(); } catch (x) { } Auth.verifier = null; } throw e; });
    },
    phoneConfirm: function (code) {
      if (cloud('phone')) return window.BDJCloud.phoneVerify(Auth.phoneNumber, code);
      return Auth.confirmation.confirm(code).then(function (res) {
        return { provider: 'phone', id: 'phone:' + res.user.uid, phone: res.user.phoneNumber, verified: true };
      });
    }
  };
  function anonId() { if (!J.anon) { J.anon = 'local-' + Math.random().toString(36).slice(2, 10); save(); } return J.anon; }
  function setProfile(p) {
    J.profile = p; p.at = new Date().toISOString(); save();
    if (p.verified) window.BDJTrack && window.BDJTrack.identify(p.id, { name: p.name, email: p.email, sign_in: p.provider });
    track('sign_in_completed', { method: p.via || p.provider, verified: !!p.verified });
    renderMeBtn();
  }

  // ---------------------------------------------------------------- onboarding
  var STEPS = ['welcome', 'goals', 'level', 'time', 'remind', 'benefits', 'features', 'plan'];
  var ob = null, idx = 0, draft = null, sideVideo = null, demoTimers = [];

  function openOnboarding(at) {
    if (ob) return;
    draft = plan(); draft.goals = draft.goals.slice(); draft.reminder = JSON.parse(JSON.stringify(draft.reminder));
    ob = h('div', { class: 'onb no-first-gesture', id: 'onb', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('开始', 'Get started') });
    ob.addEventListener('pointerdown', kickAll);
    document.body.appendChild(ob); document.body.classList.add('onb-open');
    if (A.isPlaying()) A.pause();
    idx = Math.max(0, STEPS.indexOf(at || 'welcome')); renderStep.last = null;
    track('onboarding_started', { at: STEPS[idx], again: !!J.done });
    renderStep();
  }
  function closeOnboarding() {
    if (!ob) return;
    clearDemos(); ob.remove(); ob = null; sideVideo = null; document.body.classList.remove('onb-open');
  }
  function finish(next) {
    var p = draft;
    J.goals = p.goals; J.level = p.level; J.minutes = p.minutes; J.days = p.days; J.weeks = p.weeks; J.reminder = p.reminder;
    var wasDone = !!J.done;
    if (!J.done) J.startedAt = A.dayKey();
    J.done = true; save();
    if (!J.profile) setProfile({ provider: 'local', id: anonId(), verified: false, via: 'guest' });
    track(wasDone ? 'plan_updated' : 'onboarding_completed', { goals: p.goals, level: p.level, daily_minutes: p.minutes, days_per_week: p.days, plan_weeks: p.weeks, reminder: p.reminder.on ? p.reminder.time : null, next: next });
    if (window.BDJTrack) window.BDJTrack.set({ goals: p.goals, level: p.level, daily_minutes: p.minutes, days_per_week: p.days, plan_weeks: p.weeks, reminder_on: !!p.reminder.on });
    closeOnboarding(); scheduleReminder(); renderMeBtn();
    if (next === 'tour' && window.BDJTour) setTimeout(window.BDJTour.start, 300);
    else if (next === 'start' && !wasDone) { var rec = 1; for (var k = 1; k <= 8; k++) if ((A.P.level[k] || 0) < 3) { rec = k; break; } A.selectMove(rec); }
    if (A.S.track && !A.musicOn()) A.musicPlay();
  }
  function go(i) { idx = Math.max(0, Math.min(STEPS.length - 1, i)); renderStep(); }

  function clearDemos() { demoTimers.forEach(function (x) { clearInterval(x); clearTimeout(x); }); demoTimers = []; }
  function video(id, angle, cls, rate) {
    var v = h('video', { class: cls || '', muted: true, loop: true, playsinline: true, autoplay: true, preload: 'auto' });
    v.muted = true; v.setAttribute('muted', ''); v.src = A.clipUrl(id, angle);
    if (rate) { v.defaultPlaybackRate = rate; v.playbackRate = rate; }
    // start once it is in the page (WebKit ignores play() on a detached element)
    var kick = function () { if (v.paused && v.isConnected && ob) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); } };
    v.addEventListener('canplay', kick); requestAnimationFrame(kick); setTimeout(kick, 400);
    return v;
  }
  // Where autoplay is refused until a gesture (Low Power Mode, strict settings), the first tap starts the demos.
  function kickAll() { if (ob) ob.querySelectorAll('video').forEach(function (v) { if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); } }); }
  function chipBtn(on, kids, onclick, cls) { return h('button', { class: 'onb-chip' + (cls ? ' ' + cls : '') + (on ? ' on' : ''), 'aria-pressed': !!on, onclick: onclick }, kids); }

  function renderStep() {
    if (!ob) return;
    clearDemos();
    var step = STEPS[idx];
    if (renderStep.last !== step) { renderStep.last = step; track('onboarding_step_viewed', { step: step, index: idx }); }
    ob.innerHTML = '';
    var card = h('div', { class: 'onb-card step-' + step });
    // top bar: seal, progress, language, skip
    var dots = h('div', { class: 'onb-dots', 'aria-hidden': 'true' });
    STEPS.forEach(function (_, k) { dots.appendChild(h('i', { class: k < idx ? 'past' : k === idx ? 'now' : '' })); });
    card.appendChild(h('div', { class: 'onb-top' }, [
      h('span', { class: 'seal-logo', text: SITE.logo || '锦影' }), dots,
      h('button', { class: 'onb-lang', onclick: function () { A.setLang(zh() ? 'en' : 'zh'); } }, [h('b', { text: zh() ? 'EN' : '中文' })]),
      J.done ? h('button', { class: 'onb-skip', text: t('关闭', 'Close'), onclick: function () { track('onboarding_closed', { at: step }); closeOnboarding(); } })
        : idx > 0 ? h('button', { class: 'onb-skip', text: t('跳过', 'Skip'), onclick: function () { track('onboarding_skipped', { at: step }); finish('skip'); } }) : null
    ]));
    var main = h('div', { class: 'onb-main' }), side = h('div', { class: 'onb-side' });
    var body = h('div', { class: 'onb-body' }, [main, side]);
    card.appendChild(body);
    var nav = h('div', { class: 'onb-nav' });
    var back = idx > 0 ? h('button', { class: 'onb-back', onclick: function () { go(idx - 1); } }, [h('span', { text: '‹ ' + t('上一步', 'Back') })]) : h('span');
    var hint = h('span', { class: 'onb-hint' });
    var next = h('button', { class: 'onb-next', onclick: function () { go(idx + 1); } }, [h('span', { text: t('继续', 'Continue') }), icon('i-arrow')]);
    nav.appendChild(back); nav.appendChild(hint); nav.appendChild(next);
    card.appendChild(nav);
    ob.appendChild(card);
    STEP[step](main, side, next, hint, nav);
  }

  function heading(main, k, title, sub) {
    if (k) main.appendChild(h('div', { class: 'onb-k', text: k }));
    if (title) main.appendChild(h('h2', { class: 'onb-h', text: title }));
    if (sub) main.appendChild(h('p', { class: 'onb-p', text: sub }));
  }
  function mirrorSide(side, caption) {
    // the slim qipao model, cycling through the eight moves
    var m = 1, v = video(1, 'front', 'onb-mirror-v');
    v.loop = false;
    v.addEventListener('ended', function () { m = m % 8 + 1; v.src = A.clipUrl(m, 'front'); var p = v.play(); if (p && p.catch) p.catch(function () { }); cap.textContent = D.moves[m - 1].seal + ' · ' + L({ zh: D.moves[m - 1].nameZh, en: D.moves[m - 1].nameEn }); });
    var cap = h('span', { class: 'onb-mirror-cap', text: D.moves[0].seal + ' · ' + L({ zh: D.moves[0].nameZh, en: D.moves[0].nameEn }) });
    side.appendChild(h('div', { class: 'onb-mirror' }, [v, cap, caption ? h('span', { class: 'onb-mirror-tag', text: caption }) : null]));
    sideVideo = v;
  }

  var STEP = {
    welcome: function (main, side, next, hint, nav) {
      nav.classList.add('bare'); next.hidden = true;
      main.appendChild(h('div', { class: 'onb-brand' }, [h('h1', { text: zh() ? '锦影' : 'Brocade Mirror' }), h('span', { text: t('八段锦 · 跟着自己的身影学', 'Baduanjin, learned from your own avatar') })]));
      main.appendChild(h('p', { class: 'onb-lede', text: t('八式古法养生功，四个角度、慢放、呼吸提示，配上古筝琵琶。每天十分钟，一式一式学到位。',
        'Eight classic qigong movements with four camera angles, slow motion, breathing cues and guzheng or pipa in the background. Ten minutes a day, one move at a time.') }));
      Auth.preload();
      var box = h('div', { class: 'onb-signin' });
      var note = h('div', { class: 'onb-note', hidden: true });
      function unavailable(m, why) {
        track('sign_in_unavailable', { method: m, reason: why });
        var name = m === 'google' ? 'Google' : m === 'apple' ? 'Apple' : t('手机号', 'Phone');
        var need = m === 'phone' ? t('短信验证需要接入 Firebase 手机号登录', 'SMS codes need Firebase phone sign-in to be set up')
          : m === 'google' ? t('需要 Google OAuth 客户端 ID', 'it needs a Google OAuth client ID') : t('需要 Apple Services ID 和回调地址', 'it needs an Apple Services ID and redirect URL');
        note.innerHTML = '';
        note.appendChild(h('b', { text: t(name + ' 登录还没接通', name + ' sign-in isn’t connected yet') }));
        note.appendChild(h('span', { text: zh()
          ? need + (secure ? '' : '，并且页面要从 https 网址打开（现在是本地文件）') + '。你可以先在本机继续，计划和进度都保存在这台设备上。'
          : need + (secure ? '' : ', and the page has to be opened from an https address (this is a local file)') + '. You can continue now; your plan and progress are saved on this device.' }));
        note.appendChild(h('button', { class: 'onb-btn ghost', text: t('在本机继续', 'Continue on this device'), onclick: function () {
          if (!(J.profile && J.profile.verified)) setProfile({ provider: 'local', id: anonId(), verified: false, via: m, phone: m === 'phone' ? box.dataset.phone : undefined });
          go(1);
        } }));
        note.hidden = false;
      }
      function attempt(m, fn) {
        track('sign_in_clicked', { method: m });
        if (!Auth.ready(m)) return unavailable(m, secure ? 'not_configured' : 'insecure_origin');
        box.classList.add('busy');
        fn().then(function (p) { box.classList.remove('busy'); setProfile(p); go(1); }, function (e) {
          box.classList.remove('busy'); track('sign_in_failed', { method: m, error: errText(e) });
          note.innerHTML = ''; note.appendChild(h('b', { text: t('登录没有完成', 'Sign-in didn’t finish') })); note.appendChild(h('span', { text: errText(e) })); note.hidden = false;
        });
      }
      var appleSvg = '<svg viewBox="0 0 24 24" class="ic"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.6-4zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>';
      var gSvg = '<svg viewBox="0 0 24 24" class="ic"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8C4 20.6 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2.2C1.4 8.5 1 10.2 1 12s.4 3.5 1.2 5l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.4 2.2 15 1 12 1 7.7 1 4 3.4 2.2 7l3.6 2.8c.9-2.6 3.3-4.4 6.2-4.4z"/></svg>';
      var btnApple = h('button', { class: 'onb-auth apple', onclick: function () { attempt('apple', Auth.apple); } }, [h('span', { class: 'auth-ic' }), h('span', { text: t('通过 Apple 登录', 'Continue with Apple') })]);
      btnApple.firstChild.innerHTML = appleSvg;
      var btnGoogle = h('button', { class: 'onb-auth google', onclick: function () { attempt('google', Auth.google); } }, [h('span', { class: 'auth-ic' }), h('span', { text: t('通过 Google 登录', 'Continue with Google') })]);
      btnGoogle.firstChild.innerHTML = gSvg;
      // phone: country code + number, then the SMS code
      var cc = h('select', { class: 'onb-cc', 'aria-label': t('国家或地区区号', 'Country code') });
      [['+86', '中国大陆', 'China'], ['+1', '美国/加拿大', 'US / Canada'], ['+852', '中国香港', 'Hong Kong'], ['+853', '中国澳门', 'Macau'], ['+886', '中国台湾', 'Taiwan'],
       ['+65', '新加坡', 'Singapore'], ['+60', '马来西亚', 'Malaysia'], ['+81', '日本', 'Japan'], ['+82', '韩国', 'Korea'], ['+44', '英国', 'UK'], ['+61', '澳大利亚', 'Australia']].forEach(function (c) {
        cc.appendChild(h('option', { value: c[0], text: c[0] + ' ' + (zh() ? c[1] : c[2]) }));
      });
      if (!zh()) cc.value = '+1';
      var num = h('input', { class: 'onb-num', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', placeholder: t('手机号', 'Phone number') });
      var code = h('input', { class: 'onb-num code', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: t('6 位验证码', '6-digit code'), hidden: true });
      var send = h('button', { class: 'onb-btn', text: t('获取验证码', 'Send code') });
      var phoneRow = h('div', { class: 'onb-phone', hidden: true }, [h('div', { class: 'onb-phone-row' }, [cc, num]), code, send, h('div', { id: 'onbRecaptcha' })]);
      send.onclick = function () {
        var full = cc.value + num.value.replace(/[^\d]/g, '');
        if (!code.hidden) { // confirm step
          box.classList.add('busy');
          Auth.phoneConfirm(code.value.trim()).then(function (p) { box.classList.remove('busy'); setProfile(p); go(1); }, function (e) {
            box.classList.remove('busy'); note.innerHTML = ''; note.appendChild(h('b', { text: t('验证码不对', 'That code didn’t work') })); note.appendChild(h('span', { text: errText(e) })); note.hidden = false;
          });
          return;
        }
        if (num.value.replace(/[^\d]/g, '').length < 6) { num.focus(); num.classList.add('bad'); return; }
        num.classList.remove('bad'); box.dataset.phone = full;
        track('sign_in_clicked', { method: 'phone', step: 'send_code' });
        if (!Auth.ready('phone')) return unavailable('phone', secure ? 'not_configured' : 'insecure_origin');
        box.classList.add('busy');
        Auth.phoneSend(full).then(function () { box.classList.remove('busy'); code.hidden = false; code.focus(); send.textContent = t('验证并登录', 'Verify and sign in'); }, function (e) {
          box.classList.remove('busy'); note.innerHTML = ''; note.appendChild(h('b', { text: t('验证码没有发出', 'Couldn’t send the code') })); note.appendChild(h('span', { text: errText(e) })); note.hidden = false;
        });
      };
      var btnPhone = h('button', { class: 'onb-auth phone', onclick: function () { phoneRow.hidden = !phoneRow.hidden; btnPhone.classList.toggle('open', !phoneRow.hidden); if (!phoneRow.hidden) num.focus(); } },
        [h('span', { class: 'auth-ic' }, [h('span', { class: 'ph-glyph', text: '☎' })]), h('span', { text: t('用手机号登录', 'Continue with phone number') })]);
      var btnEmail = window.BDJAccount ? h('button', { class: 'onb-auth email', onclick: function () { track('sign_in_clicked', { method: 'email' }); window.BDJAccount.open('signup', function () { go(1); }); } },
        [h('span', { class: 'auth-ic' }, [h('span', { class: 'ph-glyph', text: '✉' })]), h('span', { text: t('用邮箱登录 / 注册', 'Continue with email') })]) : null;
      box.appendChild(btnApple); box.appendChild(btnGoogle); box.appendChild(btnPhone); box.appendChild(phoneRow); if (btnEmail) box.appendChild(btnEmail); box.appendChild(note);
      main.appendChild(box);
      main.appendChild(h('button', { class: 'onb-guest', onclick: function () { track('sign_in_clicked', { method: 'guest' }); if (!J.profile) setProfile({ provider: 'local', id: anonId(), verified: false, via: 'guest' }); go(1); } },
        [h('span', { text: t('先不登录，直接开始', 'Not now — start without an account') }), icon('i-arrow')]));
      main.appendChild(h('p', { class: 'onb-fine', text: t('登录后可以在不同设备同步计划和进度（需要接入账号服务）。不登录也能用全部功能，数据保存在本机。',
        'Signing in lets your plan and progress follow you across devices (once an account service is connected). Everything works without an account; data stays on this device.') }));
      if (J.profile) {
        main.appendChild(h('p', { class: 'onb-fine signed', text: t('当前：', 'Signed in: ') + profileLabel(J.profile) }));
      }
      mirrorSide(side, t('你的数字形象 · 深红旗袍', 'Your avatar · deep-red qipao'));
    },

    goals: function (main, side, next, hint) {
      heading(main, t('第 1 步 · 目标', 'Step 1 · Your why'), t('你为什么想学八段锦？', 'Why do you want to learn Baduanjin?'), t('可以多选，我们按你的目标安排重点。', 'Pick as many as you like — the plan leans toward them.'));
      var grid = h('div', { class: 'onb-grid goals' });
      function upd() { next.disabled = !draft.goals.length; hint.textContent = draft.goals.length ? '' : t('至少选一个', 'Pick at least one'); }
      (JD.goals || []).forEach(function (g) {
        var b = chipBtn(draft.goals.indexOf(g.id) >= 0, [h('span', { class: 'oc-ic', text: g.icon }), h('span', { text: L(g) })], function () {
          var i = draft.goals.indexOf(g.id); if (i >= 0) draft.goals.splice(i, 1); else draft.goals.push(g.id);
          b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', i < 0); upd();
          track('onboarding_answer', { question: 'goals', value: draft.goals.slice() });
        }, 'big');
        grid.appendChild(b);
      });
      main.appendChild(grid); upd();
      mirrorSide(side);
    },

    level: function (main, side, next, hint) {
      heading(main, t('第 2 步 · 基础', 'Step 2 · Your level'), t('你现在的水平？', 'Where are you starting from?'), t('决定每周学几式、慢放多少。', 'This sets how many moves a week and how slow to start.'));
      var list = h('div', { class: 'onb-list' });
      (JD.levels || []).forEach(function (lv) {
        list.appendChild(h('button', { class: 'onb-opt' + (draft.level === lv.id ? ' on' : ''), 'aria-pressed': draft.level === lv.id, onclick: function () {
          draft.level = lv.id; track('onboarding_answer', { question: 'level', value: lv.id });
          list.querySelectorAll('.onb-opt').forEach(function (x) { x.classList.toggle('on', x === this); x.setAttribute('aria-pressed', x === this); }, this);
          if (lv.id === 'new') A.setSpeed && A.setSpeed(0.75);
        } }, [h('b', { text: L(lv) }), h('span', { text: zh() ? lv.noteZh : lv.noteEn }),
          h('i', { text: zh() ? '约 ' + lv.weeks + ' 周学会八式' : 'about ' + lv.weeks + ' weeks to learn all eight' })]));
      });
      main.appendChild(list);
      mirrorSide(side);
    },

    time: function (main, side) {
      heading(main, t('第 3 步 · 时间', 'Step 3 · Your time'), t('想怎么安排练习？', 'How much time do you want to give it?'), t('一遍完整的八段锦约 80 秒，十分钟够学新动作再跟练几遍。', 'One full round takes about 80 seconds — ten minutes is enough to learn a new move and follow a few rounds.'));
      function row(label, opts, key, fmt) {
        var r = h('div', { class: 'onb-row' }, [h('div', { class: 'onb-row-k', text: label })]), chips = h('div', { class: 'onb-chips' });
        opts.forEach(function (v) {
          chips.appendChild(chipBtn(draft[key] === v, [h('span', { text: fmt(v) })], function () {
            draft[key] = v; if (key === 'days') draft.reminder.days = defaultDays(v);
            track('onboarding_answer', { question: key, value: v }); renderStep();
          }));
        });
        r.appendChild(chips); main.appendChild(r);
      }
      row(t('每天', 'Each day'), JD.minutes || [5, 10, 15, 20], 'minutes', function (v) { return v + (zh() ? ' 分钟' : ' min'); });
      row(t('每周', 'Days a week'), JD.daysPerWeek || [3, 5, 7], 'days', function (v) { return zh() ? v + ' 天' : v + ' days'; });
      row(t('计划', 'Plan length'), JD.planWeeks || [2, 4, 8], 'weeks', function (v) { return zh() ? v + ' 周' : v + ' weeks'; });
      // side: the week at a glance + totals
      var wk = h('div', { class: 'onb-week' });
      var on = defaultDays(draft.days);
      for (var d = 1; d <= 7; d++) wk.appendChild(h('div', { class: 'ow-day' + (on.indexOf(d) >= 0 ? ' on' : '') }, [h('span', { text: zh() ? WD.zh[d - 1] : WD.en[d - 1].slice(0, 2) }), h('i')]));
      var weekly = draft.minutes * draft.days;
      side.appendChild(h('div', { class: 'onb-glance' }, [
        h('div', { class: 'og-k', text: t('你的一周', 'Your week') }), wk,
        h('div', { class: 'og-figs' }, [
          h('div', {}, [h('b', { text: String(weekly) }), h('span', { text: t('分钟 / 周', 'min a week') })]),
          h('div', {}, [h('b', { text: String(weekly * draft.weeks) }), h('span', { text: t('分钟 · 整个计划', 'min over the plan') })]),
          h('div', {}, [h('b', { text: String(Math.round(draft.minutes * 60 * 0.45 / 80) || 1) }), h('span', { text: t('遍全套 / 天', 'full rounds a day') })])
        ])
      ]));
    },

    remind: function (main, side) {
      var r = draft.reminder;
      heading(main, t('第 4 步 · 提醒', 'Step 4 · Reminders'), t('要不要提醒你练习？', 'Should we remind you to practise?'), t('固定时间练，最容易坚持。', 'A fixed time is the easiest way to keep going.'));
      var sw = h('button', { class: 'onb-switch' + (r.on ? ' on' : ''), role: 'switch', 'aria-checked': r.on, onclick: function () {
        r.on = !r.on; track('onboarding_answer', { question: 'reminder', value: r.on }); if (r.on) askPermission(); renderStep();
      } }, [h('i'), h('span', { text: r.on ? t('提醒我', 'Remind me') : t('不用提醒', 'No reminders') })]);
      main.appendChild(sw);
      if (r.on) {
        var time = h('input', { type: 'time', class: 'onb-time', value: r.time, onchange: function (e) { r.time = e.target.value || '07:30'; renderSide(); } });
        var presets = h('div', { class: 'onb-chips' });
        [['07:00', t('清晨', 'Early')], ['07:30', t('早饭前', 'Before breakfast')], ['12:30', t('午休', 'Lunch break')], ['21:30', t('睡前', 'Before bed')]].forEach(function (p) {
          presets.appendChild(chipBtn(r.time === p[0], [h('b', { text: p[0] }), h('span', { text: ' ' + p[1] })], function () { r.time = p[0]; renderStep(); }));
        });
        main.appendChild(h('div', { class: 'onb-row' }, [h('div', { class: 'onb-row-k', text: t('时间', 'Time') }), h('div', { class: 'onb-chips' }, [time]), presets]));
        var days = h('div', { class: 'onb-chips days' });
        for (var d = 1; d <= 7; d++) (function (d) {
          days.appendChild(chipBtn(r.days.indexOf(d) >= 0, [h('span', { text: zh() ? WD.zh[d - 1] : WD.en[d - 1] })], function () {
            var i = r.days.indexOf(d); if (i >= 0) { if (r.days.length === 1) return; r.days.splice(i, 1); } else r.days.push(d); r.days.sort(); renderStep();
          }, 'day'));
        })(d);
        main.appendChild(h('div', { class: 'onb-row' }, [h('div', { class: 'onb-row-k', text: t('哪几天', 'Days') }), days]));
        var perm = permState();
        main.appendChild(h('div', { class: 'onb-perm' }, [
          h('span', { class: 'perm-state ' + perm, text: perm === 'granted' ? t('✓ 已允许通知', '✓ Notifications allowed') : perm === 'denied' ? t('通知被浏览器拦截了，可以用日历提醒', 'The browser blocked notifications — use a calendar reminder instead') : perm === 'unsupported' ? t('这个浏览器不支持通知，可以用日历提醒', 'This browser can’t show notifications — use a calendar reminder') : t('浏览器会问你是否允许通知', 'Your browser will ask to allow notifications') }),
          perm === 'default' ? h('button', { class: 'onb-btn ghost', text: t('允许通知', 'Allow notifications'), onclick: function () { askPermission(renderStep); } }) : null,
          h('button', { class: 'onb-btn ghost', text: t('添加到日历', 'Add to calendar'), onclick: function () { downloadIcs(draft); } })
        ]));
        main.appendChild(h('p', { class: 'onb-fine', text: t('网页提醒在锦影打开时弹出；日历提醒即使关掉网页也会准时响。', 'Browser reminders pop up while Brocade Mirror is open; a calendar reminder rings even when it’s closed.') }));
      }
      function renderSide() {
        side.innerHTML = '';
        var dayTxt = r.days.length === 7 ? t('每天', 'Every day') : r.days.map(wd).join(zh() ? '、' : ', ');
        side.appendChild(h('div', { class: 'onb-phone-mock' + (r.on ? '' : ' off') }, [
          h('div', { class: 'pm-time', text: r.on ? r.time : '—' }), h('div', { class: 'pm-date', text: r.on ? dayTxt : t('不提醒', 'No reminders') }),
          h('div', { class: 'pm-note' }, [
            h('div', { class: 'pm-head' }, [h('span', { class: 'seal-logo xs', text: SITE.logo || '锦影' }), h('b', { text: zh() ? '锦影' : 'Brocade Mirror' }), h('i', { text: t('现在', 'now') })]),
            h('b', { text: t('该练八段锦了 🌿', 'Time for Baduanjin 🌿') }),
            h('span', { text: t('今天 ' + draft.minutes + ' 分钟 · 从第 ' + nextMove() + ' 式开始', draft.minutes + ' minutes today · start with move ' + nextMove()) })
          ])
        ]));
      }
      renderSide();
    },

    benefits: function (main, side) {
      heading(main, t('练习的好处', 'Why it’s worth it'), t('坚持练，会看到变化', 'What steady practice can change'), null);
      var mine = (JD.goals || []).filter(function (g) { return draft.goals.indexOf(g.id) >= 0; });
      if (mine.length) main.appendChild(h('div', { class: 'onb-mygoals' }, mine.map(function (g) { return h('span', { class: 'onb-tag', text: g.icon + ' ' + L(g) }); })));
      main.appendChild(h('p', { class: 'onb-p', text: L(JD.benefits) }));
      var list = (JD.testimonials || []).slice().sort(function (a, b) { return (draft.goals.indexOf(b.goal) >= 0) - (draft.goals.indexOf(a.goal) >= 0); });
      var quotes = h('div', { class: 'onb-quotes' });
      list.forEach(function (q) {
        quotes.appendChild(h('blockquote', { class: 'onb-quote' }, [
          h('p', { text: '“' + L(q) + '”' }),
          h('footer', {}, [h('b', { text: L(q.name) }), h('span', { text: t('练了 ' + q.weeks + ' 周', q.weeks + ' weeks in') }), q.sample ? h('i', { class: 'sample', text: t('示例', 'Sample') }) : null])
        ]));
      });
      main.appendChild(quotes);
      if (list.some(function (q) { return q.sample; })) main.appendChild(h('p', { class: 'onb-fine', text: t('“示例”为示意文字，不是真实用户的评价。', '“Sample” quotes are illustrative, not reviews from real users.') }));
      side.appendChild(planChart(draft));
    },

    features: function (main, side) {
      side.remove();
      heading(main, t('功能', 'Features'), t('锦影能帮你做什么', 'What Brocade Mirror does for you'), null);
      var g = h('div', { class: 'onb-feats' });
      function feat(cls, title, text, visual) { g.appendChild(h('div', { class: 'onb-feat ' + cls }, [h('div', { class: 'of-vis' }, [visual]), h('b', { text: title }), h('span', { text: text })])); }
      // four angles
      var quad = h('div', { class: 'of-quad' });
      ['front', 'right', 'back', 'left'].forEach(function (a) { quad.appendChild(h('div', { class: 'of-q' }, [video(2, a), h('i', { text: t({ front: '正面', right: '右侧', back: '背面', left: '左侧' }[a], a[0].toUpperCase() + a.slice(1)) })])); });
      feat('angles', t('四个角度同步看', 'Four angles in sync'), t('正、背、左、右一起播放，看清每个细节。', 'Front, back, left and right play together, so nothing is hidden.'), quad);
      // speed
      var sv = video(3, 'front', '', 0.5), badge = h('span', { class: 'of-badge', text: '0.5×' });
      var rates = [0.5, 0.25, 1, 0.75], ri = 0;
      demoTimers.push(setInterval(function () { ri = (ri + 1) % rates.length; sv.playbackRate = rates[ri]; badge.textContent = rates[ri] + '×'; }, 2600));
      feat('speed', t('随心调速', 'Any speed you need'), t('0.25× 到 2×，声音不变调；还能逐帧、单步循环。', '0.25× to 2× without pitch change, plus frame-by-frame and step loops.'), h('div', { class: 'of-one' }, [sv, badge]));
      // backgrounds behind the cut-out figure
      var bgs = D.backgrounds.filter(function (b) { return b.file; }), bi = 0;
      var scene = h('div', { class: 'of-scene' }, [h('img', { class: 'of-fig', alt: '', src: A.avatarUrl() })]);
      var bgName = h('span', { class: 'of-badge' });
      function showBg() { var b = bgs[bi % bgs.length]; scene.style.backgroundImage = 'url("' + A.bgUrl(b) + '")'; bgName.textContent = L(b); bi++; }
      showBg(); demoTimers.push(setInterval(showBg, 1800));
      scene.appendChild(bgName);
      feat('scene', t('换背景', 'Change the scene'), t('竹林、月夜、宫墙、荷塘……人物实时抠像放进画里。', 'Bamboo, moonlit night, palace wall, lotus pond — the figure is cut out live.'), scene);
      // music: tap an instrument to hear it
      var ins = h('div', { class: 'of-ins' });
      (D.music.instruments || []).forEach(function (x) {
        var first = A.tracksOf(x.id)[0]; if (!first) return;
        ins.appendChild(h('button', { class: 'of-in' + (A.S.track === first.id && A.musicOn() ? ' on' : ''), onclick: function () {
          A.selectTrack(first.id); track('feature_demo', { feature: 'music', instrument: x.id });
          ins.querySelectorAll('.of-in').forEach(function (b) { b.classList.toggle('on', b === this); }, this);
        } }, [h('span', { class: 'of-in-pic' }, [x.picture ? h('img', { alt: '', src: A.picUrl(x) }) : h('span', { class: 'md-glyph', text: '合' })]), h('span', { text: L(x) })]));
      });
      feat('music', t('古典配乐', 'Traditional music'), t('古筝、琵琶、笛箫、二胡。点一下试听。', 'Guzheng, pipa, dizi and xiao, erhu. Tap one to listen.'), ins);
      // outfits (when there are several) — otherwise mirror & zoom
      if (D.outfits.length > 1) {
        var outs = h('div', { class: 'of-outfits' }, D.outfits.map(function (o) { return h('img', { alt: '', src: A.avatarUrl(o) }); }));
        feat('outfit', t('换服装', 'Change the outfit'), t('同一个人，不同服装，随时切换。', 'The same person in different outfits, switch any time.'), outs);
      } else {
        var mv = video(5, 'front', 'of-mirror');
        feat('mirror', t('镜像 · 放大细节', 'Mirror and zoom'), t('镜像后左右和你一致；一键放大手部、步型。', 'Mirror so left and right match you; one tap to zoom on hands or stance.'), h('div', { class: 'of-one zoom' }, [mv, h('span', { class: 'of-badge', text: t('镜像 · 手部', 'Mirror · Hands') })]));
      }
      // breathing cue
      var ring = h('div', { class: 'of-breath' }, [h('div', { class: 'of-br-core' }), h('b', { text: '吸' }), h('span', { text: t('吸气', 'Inhale') })]);
      var ph = 0;
      demoTimers.push(setInterval(function () { ph = (ph + 1) % 3; ring.dataset.phase = ['in', 'out', 'hold'][ph]; ring.querySelector('b').textContent = ['吸', '呼', '停'][ph]; ring.querySelector('span').textContent = zh() ? ['吸气', '呼气', '稍停'][ph] : ['Inhale', 'Exhale', 'Hold'][ph]; }, 2000));
      ring.dataset.phase = 'in';
      feat('breath', t('呼吸提示', 'Breathing cues'), t('圆圈变大吸气、变小呼气，跟着视频速度走。', 'The ring grows as you inhale and shrinks as you exhale, at the video’s speed.'), h('div', { class: 'of-breath-wrap' }, [ring]));
      main.appendChild(g);
    },

    plan: function (main, side, next, hint, nav) {
      var p = draft, lv = levelOf(p.level);
      var nm = J.profile && J.profile.name;
      heading(main, t('最后一步', 'All set'), nm ? t(nm + '，这是你的计划', nm + ', here’s your plan') : t('这是你的计划', 'Here’s your plan'), null);
      var goals = (JD.goals || []).filter(function (g) { return p.goals.indexOf(g.id) >= 0; });
      main.appendChild(h('ul', { class: 'onb-summary' }, [
        h('li', {}, [h('b', { text: t('目标', 'Goals') }), h('span', { text: goals.length ? goals.map(L).join(zh() ? '、' : ', ') : '—' })]),
        h('li', {}, [h('b', { text: t('基础', 'Level') }), h('span', { text: L(lv) })]),
        h('li', {}, [h('b', { text: t('节奏', 'Rhythm') }), h('span', { text: zh() ? '每天 ' + p.minutes + ' 分钟 · 每周 ' + p.days + ' 天 · ' + p.weeks + ' 周' : p.minutes + ' min a day · ' + p.days + ' days a week · ' + p.weeks + ' weeks' })]),
        h('li', {}, [h('b', { text: t('提醒', 'Reminder') }), h('span', { text: p.reminder.on ? p.reminder.time + ' · ' + (p.reminder.days.length === 7 ? t('每天', 'every day') : p.reminder.days.map(wd).join(zh() ? '、' : ', ')) : t('不提醒', 'Off') })])
      ]));
      // first week, day by day
      var target = Math.min(8, Math.ceil(8 / lv.weeks)), rounds = Math.max(1, Math.round(p.minutes * 60 * 0.45 / 80)), days = defaultDays(p.days);
      var wk = h('ol', { class: 'onb-firstweek' }), learned = 0;
      days.forEach(function (d, k) {
        var n = Math.ceil((k + 1) * target / days.length) - Math.ceil(k * target / days.length);
        var seals = D.moves.slice(learned, learned + n).map(function (m) { return m.seal; }).join(' ');
        var rev = D.moves.slice(Math.max(0, learned - 2), learned).map(function (m) { return m.seal; }).join(' ');
        wk.appendChild(h('li', {}, [h('b', { text: wd(d) }), h('span', { text: n
          ? t('学 ' + seals + (rev ? ' · 复习 ' + rev : '') + ' · 跟练全套 ×' + rounds, 'Learn ' + seals + (rev ? ' · review ' + rev : '') + ' · full round ×' + rounds)
          : t('复习 ' + rev + ' · 慢放抠细节 · 跟练全套 ×' + rounds, 'Review ' + rev + ' · slow-motion details · full round ×' + rounds) })]));
        learned += n;
      });
      main.appendChild(h('div', { class: 'onb-row-k', text: t('第一周', 'Week one') }));
      main.appendChild(wk);
      nav.querySelector('.onb-next').remove();
      nav.appendChild(h('button', { class: 'onb-btn ghost', text: t('先看 1 分钟引导', 'Take the 1-minute tour'), onclick: function () { finish('tour'); } }));
      nav.appendChild(h('button', { class: 'onb-next', onclick: function () { finish('start'); } }, [h('span', { text: t('开始第 ' + nextMove() + ' 式', 'Start move ' + nextMove()) }), icon('i-arrow')]));
      side.appendChild(planChart(p));
    }
  };
  function nextMove() { for (var k = 1; k <= 8; k++) if ((A.P.level[k] || 0) < 3) return k; return 1; }
  function profileLabel(p) {
    if (!p) return '';
    var who = p.name || p.email || p.phone || '';
    if (p.provider === 'email' && !p.verified) return t('邮箱（待验证）', 'Email (not verified yet)') + (who ? ' · ' + who : '');
    if (!p.verified) return t('本机账户', 'This device') + (who ? ' · ' + who : '');
    return ({ google: 'Google', apple: 'Apple', phone: t('手机号', 'Phone'), email: t('邮箱', 'Email') }[p.provider] || p.provider) + (who ? ' · ' + who : '');
  }

  // ---------------------------------------------------------------- reminders
  function permState() { if (!('Notification' in window)) return 'unsupported'; return Notification.permission; }
  function askPermission(done) {
    if (permState() !== 'default') { if (done) done(); return; }
    try {
      var p = Notification.requestPermission(function (r) { track('notification_permission', { result: r }); if (done) done(); });
      if (p && p.then) p.then(function () { }, function () { });
    } catch (e) { if (done) done(); }
  }
  var remT = 0, remAt = 0;
  function nextReminder(r) {
    var hm = (r.time || '07:30').split(':'), now = new Date();
    for (var i = 0; i < 8; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, +hm[0], +hm[1], 0);
      var dow = (d.getDay() + 6) % 7 + 1;
      if (d > now && r.days.indexOf(dow) >= 0) return d;
    }
    return null;
  }
  function scheduleReminder() {
    clearTimeout(remT);
    var r = J.reminder; remAt = 0; if (!r || !r.on || !r.days || !r.days.length) return;
    var at = nextReminder(r); if (!at) return;
    remAt = +at;
    remT = setTimeout(checkReminder, Math.min(at - new Date(), 2147483000));
  }
  // Timers pause while the computer sleeps, so the due time is also checked every 30 s and on wake.
  function checkReminder() {
    if (!remAt || Date.now() < remAt) return;
    var late = Date.now() - remAt; remAt = 0;
    if (late < 3 * 3600e3) fireReminder(); // skip reminders more than 3 h stale (e.g. laptop closed all morning)
    scheduleReminder();
  }
  setInterval(checkReminder, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkReminder(); });
  function fireReminder() {
    var p = plan(), title = t('该练八段锦了 🌿', 'Time for Baduanjin 🌿'), body = t('今天 ' + p.minutes + ' 分钟 · 从第 ' + nextMove() + ' 式开始', p.minutes + ' minutes today · start with move ' + nextMove());
    track('reminder_fired', { permission: permState() });
    if (permState() === 'granted') { try { var n = new Notification(title, { body: body, tag: 'bdj-reminder' }); n.onclick = function () { window.focus(); n.close(); }; } catch (e) { } }
    toast(title, body);
  }
  function toast(title, body) {
    var old = $('jToast'); if (old) old.remove();
    var el = h('div', { class: 'j-toast', id: 'jToast', role: 'status' }, [
      h('span', { class: 'seal-logo xs', text: SITE.logo || '锦影' }),
      h('div', {}, [h('b', { text: title }), h('span', { text: body })]),
      h('button', { class: 'onb-btn', text: t('开始', 'Start'), onclick: function () { el.remove(); A.selectMove(nextMove()); A.play(); } }),
      h('button', { class: 'j-toast-x', 'aria-label': t('关闭', 'Close'), text: '×', onclick: function () { el.remove(); } })
    ]);
    document.body.appendChild(el);
  }
  function downloadIcs(p) {
    var r = p.reminder, hm = r.time.split(':'), d = new Date(), BY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    var start = nextReminder({ time: r.time, days: r.days }) || new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, +hm[0], +hm[1]);
    function f(x) { return x.getFullYear() + ('0' + (x.getMonth() + 1)).slice(-2) + ('0' + x.getDate()).slice(-2) + 'T' + ('0' + x.getHours()).slice(-2) + ('0' + x.getMinutes()).slice(-2) + '00'; }
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var title = zh() ? '八段锦 · 锦影练习（' + p.minutes + ' 分钟）' : 'Baduanjin practice · Brocade Mirror (' + p.minutes + ' min)';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Brocade Mirror//Baduanjin//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:bdj-' + Date.now() + '@brocade-mirror', 'DTSTAMP:' + stamp, 'DTSTART:' + f(start), 'DURATION:PT' + p.minutes + 'M',
      'RRULE:FREQ=WEEKLY;BYDAY=' + r.days.map(function (x) { return BY[x - 1]; }).join(','),
      'SUMMARY:' + title, 'DESCRIPTION:' + (zh() ? '打开锦影，跟着自己的身影练八段锦。' : 'Open Brocade Mirror and practise with your avatar.'),
      'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + title, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), a = h('a', { href: url, download: 'baduanjin-reminder.ics' });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    track('calendar_downloaded', { time: r.time, days: r.days.length });
  }

  // ---------------------------------------------------------------- "My progress"
  var meBtn = null;
  function renderMeBtn() {
    var bar = document.querySelector('.top-actions'); if (!bar) return;
    if (!meBtn) { meBtn = h('button', { class: 'pill me-pill', id: 'btnMe', onclick: openMe }); bar.insertBefore(meBtn, bar.firstChild); }
    meBtn.innerHTML = '';
    var p = J.profile, init = p && (p.name || p.email || '').trim() ? (p.name || p.email).trim()[0].toUpperCase() : '';
    var av = h('span', { class: 'me-av' + (p && p.picture ? ' pic' : '') });
    if (p && p.picture) av.appendChild(h('img', { alt: '', src: p.picture, referrerpolicy: 'no-referrer' })); else av.textContent = init || '锦';
    meBtn.appendChild(av);
    var today = Math.round((A.P.days[A.dayKey()] || 0) / 60), goal = plan().minutes;
    meBtn.appendChild(h('span', { class: 'me-txt', text: t('我的进度', 'My progress') }));
    meBtn.appendChild(h('span', { class: 'me-min', text: today + '/' + goal + (zh() ? ' 分' : ' min') }));
    meBtn.title = t('我的进度 · 计划 · 提醒', 'My progress · plan · reminders');
  }
  var me = null;
  function openMe() {
    track('progress_opened', {});
    if (A.saveProg) A.saveProg();
    if (!me) {
      me = h('div', { class: 'modal me-modal', id: 'meModal', role: 'dialog', 'aria-modal': 'true' });
      me.addEventListener('click', function (e) { if (e.target === me) closeMe(); });
      document.body.appendChild(me);
    }
    renderMe(); me.hidden = false;
  }
  function closeMe() { if (me) me.hidden = true; }
  function renderMe() {
    if (!me) return;
    var p = plan(), prof = J.profile;
    me.innerHTML = '';
    var card = h('div', { class: 'modal-card me-card' });
    card.appendChild(h('button', { class: 'icon-btn modal-x', 'aria-label': t('关闭', 'Close'), onclick: closeMe }, [icon('i-close')]));
    // who
    var who = h('div', { class: 'me-who' }, [
      h('span', { class: 'me-av lg' + (prof && prof.picture ? ' pic' : '') }, prof && prof.picture ? [h('img', { alt: '', src: prof.picture, referrerpolicy: 'no-referrer' })] : [document.createTextNode(prof && (prof.name || prof.email) ? (prof.name || prof.email)[0].toUpperCase() : '锦')]),
      h('div', {}, [h('h2', { text: prof && prof.name ? prof.name : t('我的进度', 'My progress') }), h('span', { class: 'me-prov', text: prof ? profileLabel(prof) : t('未登录', 'Not signed in') })]),
      h('div', { class: 'me-acts' }, [
        prof && prof.provider === 'email' && !prof.verified && !prof.cloud ? h('button', { class: 'onb-btn ghost', text: t('重发验证邮件', 'Resend verification email'), onclick: function (e) { var b = e.currentTarget; b.disabled = true; window.BDJAccount.resend().then(function (j) { b.textContent = j.ok ? t('已发送，请查收', 'Sent; check your inbox') : t('发送失败', 'Couldn’t send'); }, function () { b.disabled = false; }); } }) : null,
        prof && (prof.verified || prof.provider === 'email') ? h('button', { class: 'onb-btn ghost', text: t('退出登录', 'Sign out'), onclick: function () { track('sign_out', { method: prof.provider }); if (prof.cloud && window.BDJCloud && window.BDJCloud.signOut) window.BDJCloud.signOut(); else if (prof.provider === 'email' && window.BDJAccount) window.BDJAccount.signOut(); J.profile = null; save(); if (window.BDJTrack) window.BDJTrack.reset(); renderMe(); renderMeBtn(); } })
          : h('button', { class: 'onb-btn', text: t('登录 / 注册', 'Sign in'), onclick: function () { closeMe(); openOnboarding('welcome'); } })
      ])
    ]);
    card.appendChild(who);
    // stat tiles
    var today = (A.P.days[A.dayKey()] || 0) / 60, wkMin = weekMinutes(), wkGoal = p.minutes * p.days, st = streak();
    function tile(k, v, unit, meter, sub) {
      return h('div', { class: 'me-tile' }, [h('span', { class: 'mt-k', text: k }), h('b', { class: 'mt-v' }, [document.createTextNode(v), h('small', { text: unit })]),
        meter != null ? h('div', { class: 'mt-meter' }, [h('i', { style: 'width:' + Math.min(100, meter * 100).toFixed(0) + '%' })]) : null, sub ? h('span', { class: 'mt-sub', text: sub }) : null]);
    }
    card.appendChild(h('div', { class: 'me-tiles' }, [
      tile(t('今天', 'Today'), fmtMin(today), zh() ? ' / ' + p.minutes + ' 分钟' : ' / ' + p.minutes + ' min', today / p.minutes),
      tile(t('本周', 'This week'), fmtMin(wkMin), zh() ? ' / ' + wkGoal + ' 分钟' : ' / ' + wkGoal + ' min', wkMin / wkGoal),
      tile(t('连续', 'Streak'), String(st), zh() ? ' 天' : (st === 1 ? ' day' : ' days'), null, t('累计 ' + Math.round(totalMinutes()) + ' 分钟', Math.round(totalMinutes()) + ' min in total')),
      tile(t('已掌握', 'Mastered'), String(mastered()), ' / 8', mastered() / 8)
    ]));
    card.appendChild(dailyChart(p));
    // mastery by move
    var ms = h('div', { class: 'me-moves' });
    D.moves.forEach(function (m) {
      var lv = A.P.level[m.id] || 0;
      ms.appendChild(h('button', { class: 'me-move lvl' + lv, title: m.nameZh + ' · ' + m.nameEn, onclick: function () { closeMe(); A.selectMove(m.id); } }, [
        h('span', { class: 'seal sm', text: m.seal }), h('span', { class: 'lvl-dots', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')]),
        h('span', { class: 'mm-n', text: t('练 ' + (A.P.count[m.id] || 0) + ' 遍', (A.P.count[m.id] || 0) + '×') })
      ]));
    });
    card.appendChild(h('h3', { text: t('八式进度', 'The eight moves') }));
    card.appendChild(ms);
    // plan + projection
    card.appendChild(h('h3', { text: t('我的计划', 'My plan') }));
    var goals = (JD.goals || []).filter(function (g) { return p.goals.indexOf(g.id) >= 0; });
    card.appendChild(h('div', { class: 'me-plan' }, [
      h('div', { class: 'onb-mygoals' }, goals.map(function (g) { return h('span', { class: 'onb-tag', text: g.icon + ' ' + L(g) }); }).concat([h('span', { class: 'onb-tag plain', text: L(levelOf(p.level)) }),
        h('span', { class: 'onb-tag plain', text: zh() ? '每天 ' + p.minutes + ' 分钟 · 每周 ' + p.days + ' 天 · ' + p.weeks + ' 周' : p.minutes + ' min · ' + p.days + ' days/week · ' + p.weeks + ' weeks' })])),
      h('button', { class: 'onb-btn ghost', text: t('修改计划', 'Edit plan'), onclick: function () { closeMe(); openOnboarding('goals'); } })
    ]));
    if (J.startedAt) {
      var started = new Date(J.startedAt + 'T00:00:00'), wk = Math.max(1, Math.min(p.weeks, Math.floor((new Date() - started) / 6048e5) + 1));
      card.appendChild(h('p', { class: 'onb-fine', text: t('计划第 ' + wk + ' / ' + p.weeks + ' 周 · 开始于 ' + J.startedAt, 'Week ' + wk + ' of ' + p.weeks + ' · started ' + J.startedAt) }));
    }
    // personalized learning path (js/path.js)
    if (window.BDJPath) {
      card.appendChild(h('h3', { text: t('我的学习路径', 'My learning path') }));
      card.appendChild(window.BDJPath.render(p, renderMe));
    }
    // reminders
    card.appendChild(h('h3', { text: t('练习提醒', 'Practice reminders') }));
    var r = p.reminder;
    var remRow = h('div', { class: 'me-rem' }, [
      h('button', { class: 'onb-switch' + (r.on ? ' on' : ''), role: 'switch', 'aria-checked': r.on, onclick: function () { r.on = !r.on; J.reminder = r; save(); if (r.on) askPermission(renderMe); scheduleReminder(); track('reminder_set', { on: r.on, time: r.time }); renderMe(); } },
        [h('i'), h('span', { text: r.on ? t('已开启', 'On') : t('已关闭', 'Off') })]),
      r.on ? h('input', { type: 'time', class: 'onb-time', value: r.time, onchange: function (e) { r.time = e.target.value || r.time; J.reminder = r; save(); scheduleReminder(); track('reminder_set', { on: true, time: r.time }); } }) : null,
      r.on ? h('span', { class: 'me-rem-days', text: r.days.length === 7 ? t('每天', 'Every day') : r.days.map(wd).join(zh() ? '、' : ', ') }) : null,
      r.on ? h('button', { class: 'onb-btn ghost', text: t('添加到日历', 'Add to calendar'), onclick: function () { downloadIcs(p); } }) : null,
      r.on && permState() === 'default' ? h('button', { class: 'onb-btn ghost', text: t('允许通知', 'Allow notifications'), onclick: function () { askPermission(renderMe); } }) : null
    ]);
    card.appendChild(remRow);
    // support (js/donate.js)
    if (window.BDJDonate) {
      card.appendChild(h('h3', { text: t('支持锦影', 'Support Brocade Mirror') }));
      card.appendChild(h('div', { class: 'me-don' }, [
        h('p', { text: t('锦影免费、无广告。喜欢的话，可以请我们喝杯茶。', 'Brocade Mirror is free and ad-free. If it helps you, you can chip in.') }),
        h('button', { class: 'onb-btn', text: t('捐赠', 'Donate'), onclick: function () { window.BDJDonate.open('progress'); } })
      ]));
    }
    card.appendChild(h('div', { class: 'me-foot' }, [
      h('button', { class: 'onb-guest', onclick: function () { closeMe(); openOnboarding('features'); } }, [h('span', { text: t('再看一遍功能介绍', 'See the feature tour again') }), icon('i-arrow')])
    ]));
    me.appendChild(card);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (ob && J.done) closeOnboarding(); else if (me && !me.hidden) closeMe();
  });

  // ---------------------------------------------------------------- boot
  A.onLang.push(function () { renderMeBtn(); if (ob) renderStep(); if (me && !me.hidden) renderMe(); });
  setInterval(renderMeBtn, 30000);
  renderMeBtn(); scheduleReminder();
  window.BDJJourney = { open: openOnboarding, close: closeOnboarding, openProgress: openMe, state: function () { return J; }, fireReminder: fireReminder, setProfile: function (p) { setProfile(p); if (me && !me.hidden) renderMe(); },
    applyPlan: function (pl) { ['goals', 'level', 'minutes', 'days', 'weeks', 'reminder', 'startedAt', 'done'].forEach(function (k) { if (pl[k] !== undefined) J[k] = pl[k]; }); save(); scheduleReminder(); renderMeBtn(); if (me && !me.hidden) renderMe(); if (ob && J.done) closeOnboarding(); } };
  if (!J.done || forced) setTimeout(function () { openOnboarding('welcome'); }, 300);
})();
