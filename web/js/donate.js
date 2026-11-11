/* 支持锦影 · Donate (Brocade Mirror). Amount → the local helper (/api/donate/start):
   with a Stripe key configured it returns a Stripe Checkout page (card, Apple Pay…); Stripe sends the
   donor back to /api/donate/return, the helper confirms the payment and emails the receipt (Resend).
   Without a Stripe key the helper runs in TEST MODE: the donation is recorded as a test and a receipt
   marked TEST is emailed; no money moves, and the dialog says so. */
(function () {
  'use strict';
  var A = window.BDJApp;
  if (!A) return;
  var h = A.h, icon = A.icon, t = A.t, S = A.S;
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  var SERVED = /^https?:$/.test(location.protocol);
  var PRESETS = [3, 5, 10, 25, 50];
  var modal = null, amount = 10, mode = null;

  function profile() { var J = window.BDJJourney && window.BDJJourney.state(); return (J && J.profile) || {}; }
  function checkMode() {
    if (!SERVED) { mode = 'offline'; return Promise.resolve(); }
    return fetch('/api/ask').then(function (r) { return r.json(); }).then(function (j) { mode = j.donations || 'test'; }).catch(function () { mode = 'offline'; });
  }
  function open(from) {
    if (!modal) {
      modal = h('div', { class: 'modal don-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('支持锦影', 'Support Brocade Mirror') });
      modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
      document.body.appendChild(modal);
    }
    modal.hidden = false;
    track('donation_opened', { from: from || 'unknown' });
    checkMode().then(render);
  }
  function close() { if (modal) modal.hidden = true; }

  function render(done) {
    modal.innerHTML = '';
    var card = h('div', { class: 'modal-card don-card' });
    card.appendChild(h('button', { class: 'icon-btn modal-x', 'aria-label': t('关闭', 'Close'), onclick: close }, [icon('i-close')]));
    card.appendChild(h('span', { class: 'don-seal', text: '谢' }));
    if (done) {
      card.appendChild(h('h2', { text: t('谢谢你的支持！', 'Thank you!') }));
      card.appendChild(h('p', { class: 'don-sub', text: done.mode === 'test'
        ? t('这是测试捐赠：没有扣款。', 'This was a test donation: no money was charged.') + (done.receiptSent ? t('测试收据已发到你的邮箱。', ' A test receipt is on its way to your inbox.') : '')
        : t('付款成功，收据已发到你的邮箱。', 'Payment received. Your receipt is on its way.') }));
      card.appendChild(h('p', { class: 'don-fine', text: t('收据编号 ', 'Receipt ') + done.id }));
      card.appendChild(h('button', { class: 'onb-btn', text: t('继续练习', 'Back to practice'), onclick: close }));
      modal.appendChild(card); return;
    }
    card.appendChild(h('h2', { text: t('支持锦影', 'Support Brocade Mirror') }));
    card.appendChild(h('p', { class: 'don-sub', text: t('锦影免费、无广告。你的支持用于新的动作视频、音乐授权和服务器费用。', 'Brocade Mirror is free and ad-free. Your support pays for new move videos, music licences and hosting.') }));
    if (mode === 'offline') {
      card.appendChild(h('p', { class: 'acc-msg', text: t('捐赠需要本地助手：运行 sh web/serve.sh，再打开 http://localhost:8765/web/baduanjin-v2.html。', 'Donations need the local helper: run sh web/serve.sh, then open http://localhost:8765/web/baduanjin-v2.html.') }));
      modal.appendChild(card); return;
    }
    if (mode === 'test') card.appendChild(h('p', { class: 'don-test', text: t('测试模式：还没有接入付款服务，不会扣款，只会发一封标注“测试”的收据。', 'Test mode: no payment provider is connected yet, so nothing is charged; you’ll get a receipt marked TEST.') }));
    var custom = h('input', { class: 'acc-in don-custom', type: 'number', min: '1', max: '1000', step: '1', placeholder: t('其他金额', 'Other'), 'aria-label': t('其他金额（美元）', 'Other amount (USD)') });
    var chips = h('div', { class: 'don-amts', role: 'radiogroup' }, PRESETS.map(function (v) {
      return h('button', { class: 'don-amt' + (amount === v ? ' on' : ''), role: 'radio', 'aria-checked': amount === v, text: '$' + v, onclick: function () { amount = v; custom.value = ''; render(); } });
    }).concat([custom]));
    custom.oninput = function () { var v = parseFloat(custom.value); if (v > 0) { amount = v; chips.querySelectorAll('.don-amt').forEach(function (b) { b.classList.remove('on'); }); go.textContent = label(); } };
    card.appendChild(chips);
    var p = profile();
    var name = h('input', { class: 'acc-in', type: 'text', placeholder: t('称呼（可选）', 'Name (optional)'), value: p.name || '', autocomplete: 'name' });
    var email = h('input', { class: 'acc-in', type: 'email', placeholder: t('邮箱（用于收据）', 'Email (for your receipt)'), value: p.email || '', autocomplete: 'email' });
    var note = h('textarea', { class: 'acc-in don-note', rows: '2', maxlength: '300', placeholder: t('留言（可选）', 'Message (optional)') });
    [name, email, note].forEach(function (x) { card.appendChild(x); });
    var msg = h('p', { class: 'acc-msg', role: 'alert' });
    function label() { return (mode === 'test' ? t('测试捐赠 ', 'Test donation ') : t('捐赠 ', 'Donate ')) + '$' + (+amount).toFixed(amount % 1 ? 2 : 0); }
    var go = h('button', { class: 'onb-btn don-go', text: label(), onclick: function () {
      msg.textContent = ''; go.disabled = true;
      track('donation_started', { amount: +amount, mode: mode });
      var hd = { 'Content-Type': 'application/json' };
      var tok = window.BDJAccount && window.BDJAccount.token(); if (tok) hd.Authorization = 'Bearer ' + tok;
      fetch('/api/donate/start', { method: 'POST', headers: hd, body: JSON.stringify({ amount: +amount, name: name.value, email: email.value, message: note.value, lang: S.lang }) })
        .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); })
        .then(function (j) {
          go.disabled = false;
          if (j._status !== 200) { msg.textContent = j.error === 'amount' ? t('金额需在 $1–$1000 之间', 'Choose between $1 and $1000') : j.error === 'email' ? t('邮箱格式不对', 'That email doesn’t look right') : t('出了点问题，请稍后再试', 'Something went wrong; please try again'); return; }
          if (j.mode === 'stripe' && j.url) { location.href = j.url; return; }
          track('donation_completed', { amount: +amount, mode: j.mode });
          render(j);
        })
        .catch(function () { go.disabled = false; msg.textContent = t('连不上本地助手', 'Can’t reach the local helper'); });
    } });
    card.appendChild(go); card.appendChild(msg);
    card.appendChild(h('p', { class: 'don-fine', text: mode === 'stripe' ? t('通过 Stripe 安全付款，锦影不会接触你的卡号。', 'Paid securely through Stripe; Brocade Mirror never sees your card.') : t('接入 Stripe 后即可真实付款（见 web/README.md）。', 'Real payments start once a Stripe key is added (see web/README.md).') }));
    modal.appendChild(card);
  }

  // back from Stripe
  var q = new URLSearchParams(location.search);
  if (q.get('donated')) {
    var id = q.get('donated');
    try { var u = new URL(location.href); u.searchParams.delete('donated'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) { }
    setTimeout(function () { track('donation_completed', { mode: 'stripe' }); open('return'); render({ id: id, mode: 'stripe' }); }, 700);
  }
  window.BDJDonate = { open: open, close: close };
})();
