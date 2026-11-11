/* 邮箱账号 · Email accounts (Brocade Mirror): sign up, sign in, verify, forgot / reset password.
   Talks to the local helper (tools/ask_server.py → tools/accounts.py), which sends the emails with
   Resend: verification at sign-up, welcome once verified, password reset, donation receipts.
   The session token lives in localStorage; the profile is handed to js/journey.js (setProfile),
   so My progress, PostHog identify and the rest of the app see a normal signed-in user.
   Needs the page served by the helper (sh web/serve.sh → http://localhost:8765). */
(function () {
  'use strict';
  var A = window.BDJApp;
  if (!A) return;
  var h = A.h, icon = A.icon, t = A.t, S = A.S;
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  var SERVED = /^https?:$/.test(location.protocol);
  function CL() { return window.BDJCloud && window.BDJCloud.configured ? window.BDJCloud : null; }  // Supabase (js/cloud.js) when set up
  var KEY = 'bdj.account.v1';
  var acct = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  function saveAcct() { try { localStorage.setItem(KEY, JSON.stringify(acct)); } catch (e) { } }

  function api(path, body) {
    var hd = { 'Content-Type': 'application/json' };
    if (acct.token) hd.Authorization = 'Bearer ' + acct.token;
    return fetch(path, body ? { method: 'POST', headers: hd, body: JSON.stringify(body) } : { headers: hd })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  function toProfile(u) { return { provider: 'email', via: 'email', id: u.id, email: u.email, name: u.name || u.email.split('@')[0], verified: !!u.verified }; }
  function signedIn(j, how) {
    acct.token = j.token; saveAcct();
    if (window.BDJJourney && window.BDJJourney.setProfile) window.BDJJourney.setProfile(toProfile(j.user));
    track(how, { verified: !!j.user.verified });
  }

  // ------------------------------------------------------------------ modal
  var modal = null, view = 'signup', onDone = null, resetToken = null;
  var ERR = {
    email: ['邮箱格式不对', 'That email doesn’t look right'], password: ['密码至少 8 位', 'Use at least 8 characters'],
    exists: ['这个邮箱已经注册，请直接登录', 'That email already has an account; sign in instead'],
    credentials: ['邮箱或密码不对', 'Email or password is incorrect'], token: ['链接已失效，请重新申请', 'This link has expired; request a new one'],
    rate: ['操作太频繁，请稍后再试', 'Too many tries; wait a moment'], net: ['连不上本地助手（sh web/serve.sh）', 'Can’t reach the local helper (sh web/serve.sh)'],
    unconfirmed: ['这个邮箱还没验证，请先点击验证邮件里的链接', 'Please verify your email first (check your inbox for the link)'],
    cloudnet: ['连不上账号服务，请检查网络', 'Can’t reach the account service; check your connection']
  };
  function err(code) { var e = ERR[code] || ['出了点问题', 'Something went wrong']; return t(e[0], e[1]); }
  function field(type, ph, auto) { return h('input', { class: 'acc-in', type: type, placeholder: ph, autocomplete: auto, required: true }); }

  function open(v, done) {
    view = v || 'signup'; onDone = done || null;
    if (!modal) {
      modal = h('div', { class: 'modal acc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('邮箱账号', 'Email account') });
      modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
      document.body.appendChild(modal);
    }
    modal.hidden = false; render();
    track('account_opened', { view: view });
  }
  function close() { if (modal) modal.hidden = true; }

  function render() {
    modal.innerHTML = '';
    var card = h('div', { class: 'modal-card acc-card' });
    card.appendChild(h('button', { class: 'icon-btn modal-x', 'aria-label': t('关闭', 'Close'), onclick: close }, [icon('i-close')]));
    if (!SERVED && !CL()) {
      card.appendChild(h('h2', { text: t('邮箱账号', 'Email account') }));
      card.appendChild(h('p', { class: 'acc-msg', text: t('邮箱注册需要本地助手：运行 sh web/serve.sh，再打开 http://localhost:8765/web/baduanjin-v2.html。', 'Email accounts need the local helper: run sh web/serve.sh, then open http://localhost:8765/web/baduanjin-v2.html.') }));
      modal.appendChild(card); return;
    }
    var msg = h('p', { class: 'acc-msg', role: 'alert' });
    var form = h('form', { class: 'acc-form', novalidate: true });
    var btn = h('button', { class: 'onb-btn acc-go', type: 'submit' });
    var busy = function (on) { btn.disabled = on; };
    if (view === 'signup' || view === 'signin') {
      card.appendChild(h('h2', { text: view === 'signup' ? t('用邮箱注册', 'Sign up with email') : t('邮箱登录', 'Sign in with email') }));
      card.appendChild(h('div', { class: 'acc-tabs', role: 'tablist' }, [['signup', t('注册', 'Create account')], ['signin', t('登录', 'Sign in')]].map(function (x) {
        return h('button', { class: 'acc-tab' + (view === x[0] ? ' on' : ''), role: 'tab', 'aria-selected': view === x[0], text: x[1], onclick: function () { view = x[0]; render(); } });
      })));
      var name = view === 'signup' ? field('text', t('称呼（可选）', 'Name (optional)'), 'name') : null;
      if (name) name.required = false;
      var email = field('email', t('邮箱', 'Email'), 'email');
      var pw = field('password', t('密码（至少 8 位）', 'Password (8+ characters)'), view === 'signup' ? 'new-password' : 'current-password');
      [name, email, pw].forEach(function (x) { if (x) form.appendChild(x); });
      btn.textContent = view === 'signup' ? t('注册并发送验证邮件', 'Create account') : t('登录', 'Sign in');
      form.appendChild(btn); form.appendChild(msg);
      if (view === 'signin') form.appendChild(h('button', { type: 'button', class: 'acc-link', text: t('忘记密码？', 'Forgot password?'), onclick: function () { view = 'forgot'; render(); } }));
      form.onsubmit = function (e) {
        e.preventDefault(); msg.textContent = ''; busy(true);
        if (CL()) {
          var signup = view === 'signup';
          (signup ? CL().signUp(email.value.trim(), pw.value, name && name.value.trim(), S.lang) : CL().signIn(email.value.trim(), pw.value)).then(function (r) {
            busy(false);
            if (!r.ok) {
              msg.textContent = err(r.error === 'net' ? 'cloudnet' : r.error === 'other' ? null : r.error) + (r.error === 'other' && r.message ? ' (' + r.message + ')' : '');
              if (r.error === 'unconfirmed') msg.appendChild(h('button', { type: 'button', class: 'acc-link', text: t(' 重发验证邮件', ' Resend the email'), onclick: function () { CL().resend(email.value.trim()); msg.textContent = t('已重新发送。', 'Sent again.'); } }));
              return;
            }
            track(signup ? 'account_signup' : 'account_signin', { backend: 'supabase' });
            if (signup && r.needsConfirm) { view = 'check'; acctEmail = email.value.trim(); emailSent = true; render(); return; }
            var prof = CL().toProfile(r.data.user);
            if (window.BDJJourney) window.BDJJourney.setProfile(prof);
            close(); if (onDone) onDone(prof);
          });
          return;
        }
        var body = { email: email.value, password: pw.value, lang: S.lang };
        if (name) body.name = name.value;
        api(view === 'signup' ? '/api/auth/signup' : '/api/auth/login', body).then(function (j) {
          busy(false);
          if (j._status !== 200) { msg.textContent = err(j.error); return; }
          signedIn(j, view === 'signup' ? 'account_signup' : 'account_signin');
          if (view === 'signup') { view = 'check'; acctEmail = j.user.email; emailSent = j.emailSent; render(); }
          else { close(); if (onDone) onDone(toProfile(j.user)); }
        }).catch(function () { busy(false); msg.textContent = err('net'); });
      };
    } else if (view === 'check') {
      card.appendChild(h('h2', { text: t('请查收验证邮件', 'Check your inbox') }));
      card.appendChild(h('p', { class: 'acc-msg ok', text: emailSent
        ? t('验证邮件已发送到 ' + acctEmail + '。点击邮件里的链接完成验证，之后会收到欢迎邮件。', 'We sent a verification link to ' + acctEmail + '. Open it to verify; a welcome email follows.')
        : t('账号已创建，但验证邮件没有发出（发件域名还没在 Resend 验证）。链接已打印在本地助手的终端里。', 'Your account is created, but the verification email couldn’t be sent (the sender domain isn’t verified in Resend yet). The link is printed in the helper’s terminal.') }));
      if (CL()) {
        card.appendChild(h('p', { class: 'acc-sub', text: t('验证后会自动登录，计划和进度会同步到你的账号。没收到？看看垃圾邮件，或者', 'You’ll be signed in when you open it, and your plan and progress will sync to your account. Nothing yet? Check spam, or') }, [
          h('button', { type: 'button', class: 'acc-link', text: t('重新发送', 'resend it'), onclick: function (e) { var b = e.currentTarget; CL().resend(acctEmail).then(function (r) { b.textContent = r.ok ? t('已重新发送', 'sent again') : err(r.error); }); } })]));
        card.appendChild(h('button', { class: 'onb-btn', text: t('先继续', 'Continue for now'), onclick: function () { close(); if (onDone) onDone(null); } }));
      } else
      card.appendChild(h('button', { class: 'onb-btn', text: t('继续', 'Continue'), onclick: function () { close(); if (onDone && acct.token) api('/api/auth/me').then(function (j) { if (j.user) onDone(toProfile(j.user)); }); } }));
    } else if (view === 'forgot') {
      card.appendChild(h('h2', { text: t('找回密码', 'Reset your password') }));
      card.appendChild(h('p', { class: 'acc-sub', text: t('输入注册邮箱，我们会发送重置链接（1 小时内有效）。', 'Enter your email and we’ll send a reset link (valid for 1 hour).') }));
      var em = field('email', t('邮箱', 'Email'), 'email');
      btn.textContent = t('发送重置链接', 'Send reset link');
      form.appendChild(em); form.appendChild(btn); form.appendChild(msg);
      form.appendChild(h('button', { type: 'button', class: 'acc-link', text: t('返回登录', 'Back to sign in'), onclick: function () { view = 'signin'; render(); } }));
      form.onsubmit = function (e) {
        e.preventDefault(); busy(true);
        if (CL()) {
          CL().forgot(em.value.trim()).then(function (r) {
            busy(false);
            if (!r.ok && r.error !== 'other') { msg.textContent = err(r.error === 'net' ? 'cloudnet' : r.error); return; }
            msg.className = 'acc-msg ok';
            msg.textContent = t('如果这个邮箱有账号，重置链接已经发出。', 'If that email has an account, a reset link is on its way.');
            track('password_reset_requested', { backend: 'supabase' });
          });
          return;
        }
        api('/api/auth/forgot', { email: em.value }).then(function (j) {
          busy(false);
          if (j._status !== 200) { msg.textContent = err(j.error); return; }
          msg.className = 'acc-msg ok';
          msg.textContent = t('如果这个邮箱有账号，重置链接已经发出。', 'If that email has an account, a reset link is on its way.');
          track('password_reset_requested', {});
        }).catch(function () { busy(false); msg.textContent = err('net'); });
      };
    } else if (view === 'reset') {
      card.appendChild(h('h2', { text: t('设置新密码', 'Choose a new password') }));
      var p1 = field('password', t('新密码（至少 8 位）', 'New password (8+ characters)'), 'new-password');
      btn.textContent = t('保存并登录', 'Save and sign in');
      form.appendChild(p1); form.appendChild(btn); form.appendChild(msg);
      form.onsubmit = function (e) {
        e.preventDefault(); busy(true);
        if (CL()) {
          CL().setPassword(p1.value).then(function (r) {
            busy(false);
            if (!r.ok) { msg.textContent = err(r.error === 'net' ? 'cloudnet' : r.error); return; }
            track('password_reset_completed', { backend: 'supabase' });
            view = 'done'; render();
          });
          return;
        }
        api('/api/auth/reset', { token: resetToken, password: p1.value }).then(function (j) {
          busy(false);
          if (j._status !== 200) { msg.textContent = err(j.error); return; }
          signedIn(j, 'password_reset_completed');
          view = 'done'; render();
        }).catch(function () { busy(false); msg.textContent = err('net'); });
      };
    } else if (view === 'done') {
      card.appendChild(h('h2', { text: t('密码已更新', 'Password updated') }));
      card.appendChild(h('p', { class: 'acc-msg ok', text: CL() ? t('密码已更新，你已登录。', 'Your password is updated and you’re signed in.') : t('你已登录。其他设备上的登录已退出。', 'You’re signed in. Other sessions were signed out.') }));
      card.appendChild(h('button', { class: 'onb-btn', text: t('开始练习', 'Start practising'), onclick: close }));
    }
    if (view !== 'check' && view !== 'done') card.appendChild(form);
    modal.appendChild(card);
    var first = card.querySelector('input'); if (first) setTimeout(function () { first.focus(); }, 30);
  }
  var acctEmail = '', emailSent = false;

  // ------------------------------------------------------------------ banner for links that land on the page
  function banner(text, ok) {
    var b = h('div', { class: 'acc-banner' + (ok ? ' ok' : ''), role: 'status' }, [h('span', { text: text }), h('button', { class: 'icon-btn', 'aria-label': t('关闭', 'Close'), onclick: function () { b.remove(); } }, [icon('i-close')])]);
    document.body.appendChild(b);
    setTimeout(function () { if (b.parentNode) b.remove(); }, 9000);
  }
  function cleanUrl(param) {
    try { var u = new URL(location.href); u.searchParams.delete(param); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } catch (e) { }
  }
  function refresh() {
    if (!SERVED || !acct.token || CL()) return;
    api('/api/auth/me').then(function (j) {
      if (j._status === 401) { acct.token = null; saveAcct(); return; }
      if (j.user && window.BDJJourney && window.BDJJourney.setProfile) {
        var cur = window.BDJJourney.state().profile;
        if (!cur || cur.provider !== 'email' || cur.verified !== j.user.verified) window.BDJJourney.setProfile(toProfile(j.user));
      }
    }).catch(function () { });
  }
  var q = new URLSearchParams(location.search);
  if (q.get('verified')) {
    var good = q.get('verified') === '1';
    setTimeout(function () {
      banner(good ? t('邮箱已验证，欢迎邮件已发出。', 'Email verified. We’ve sent you a welcome email.') : t('验证链接已失效，请在“我的进度”里重新发送。', 'That verification link has expired; resend it from My progress.'), good);
      if (good) track('account_verified', {});
    }, 600);
    cleanUrl('verified');
  }
  if (q.get('reset')) {
    resetToken = q.get('reset'); cleanUrl('reset');
    setTimeout(function () { if (window.BDJJourney) window.BDJJourney.close(); open('reset'); }, 700);
  }
  setTimeout(refresh, 400);

  window.BDJAccount = {
    open: open, close: close, token: function () { return acct.token; },
    resend: function () { return api('/api/auth/resend', {}); },
    signOut: function () { if (CL()) { CL().signOut(); return; } if (acct.token && SERVED) api('/api/auth/logout', {}).catch(function () { }); acct.token = null; saveAcct(); },
    banner: banner, api: api
  };
})();
