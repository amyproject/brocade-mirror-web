/* 云端 · Supabase (Brocade Mirror): accounts and cross-device progress.
   Config: D.site.supabase = { url, key } (the project URL and the PUBLISHABLE key, both public by design;
   the service-role key never goes in the page). Uses vendor/supabase.js (supabase-js 2, MIT).
   - Auth: email + password (verify / reset emails sent by Supabase, through Resend SMTP once set up),
     phone SMS codes (Supabase → Twilio Verify), Google (OAuth redirect), Apple (ID token from the popup).
     Which ones are switched on is read from the project (/auth/v1/settings), so a provider lights up
     here as soon as it's enabled in the Supabase dashboard; otherwise js/journey.js keeps its old path.
   - Sync: plan + progress go to public.progress (one row per user and site, row-level security; see
     web/supabase/schema.sql). On sign-in the cloud copy and this device are merged (practice time and
     counts take the larger value; levels and plan come from whichever side changed last), then kept
     in sync a couple of seconds after each change. Signed out, everything stays on this device. */
(function () {
  'use strict';
  var A = window.BDJApp, CFG = A && A.D.site && A.D.site.supabase;
  var off = { configured: false, enabled: function () { return false; } };
  window.BDJCloud = off;
  if (!A || !CFG || !CFG.url || !CFG.key || !window.supabase || !/^https?:$/.test(location.protocol)) return;
  var t = A.t;
  var track = function (e, p) { if (window.BDJTrack) window.BDJTrack(e, p); };
  var SITE = A.D.site.id || 'main';
  var RETURN = location.origin + location.pathname;            // where email links and OAuth come back to
  var NEXT_KEY = 'bdj.cloud.next', MARK_KEY = 'bdj.cloud.local.' + SITE;
  // what the URL says before supabase-js consumes it (email confirmation / recovery / errors)
  var hashIn = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  var landed = { type: hashIn.get('type'), error: hashIn.get('error_description') || hashIn.get('error') };

  var sb = window.supabase.createClient(CFG.url, CFG.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'bdj.sb.auth' }
  });
  var settings = null;
  var settingsReady = fetch(CFG.url + '/auth/v1/settings', { headers: { apikey: CFG.key } })
    .then(function (r) { return r.json(); }).then(function (j) { settings = j; return j; }).catch(function () { return null; });
  function enabled(m) { return !!(settings && settings.external && settings.external[m]); }

  // ------------------------------------------------------------------ profile
  function toProfile(u) {
    var md = u.user_metadata || {}, prov = (u.app_metadata && u.app_metadata.provider) || 'email';
    return {
      provider: prov, via: 'supabase', cloud: true, id: 'sb:' + u.id,
      name: md.full_name || md.name || '', email: u.email || md.email || '', phone: u.phone ? '+' + String(u.phone).replace(/^\+/, '') : '',
      picture: md.avatar_url || md.picture || '', verified: !!(u.email_confirmed_at || u.phone_confirmed_at || u.confirmed_at)
    };
  }
  function J() { return window.BDJJourney && window.BDJJourney.state(); }
  var uid = null;
  function adopt(user, ev) {
    var p = toProfile(user), cur = (J() || {}).profile;
    if (uid !== user.id) { uid = user.id; pull(); }   // first: pulling blocks the profile save below from counting as an edit
    if (window.BDJJourney && (!cur || cur.id !== p.id || cur.verified !== p.verified || cur.name !== p.name || cur.picture !== p.picture)) window.BDJJourney.setProfile(p);
    if (ev === 'SIGNED_IN') {
      var next = localStorage.getItem(NEXT_KEY);
      if (next) { localStorage.removeItem(NEXT_KEY); var st = J(); if (st && !st.done && window.BDJJourney) window.BDJJourney.open(next); }
    }
  }
  sb.auth.onAuthStateChange(function (ev, session) {
    setTimeout(function () {   // outside the callback: supabase-js holds a lock while it runs
      if (ev === 'PASSWORD_RECOVERY') {
        if (window.BDJJourney) window.BDJJourney.close();
        if (window.BDJAccount) window.BDJAccount.open('reset');
      }
      if (session && session.user) adopt(session.user, ev);
      else if (ev === 'SIGNED_OUT') uid = null;
    }, 0);
  });
  setTimeout(function () {
    if (!window.BDJAccount) return;
    if (landed.error) window.BDJAccount.banner(t('链接已失效或无效，请重新申请。', 'That link has expired or is invalid; please request a new one.') + ' (' + landed.error + ')', false);
    else if (landed.type === 'signup' || landed.type === 'email_change') { window.BDJAccount.banner(t('邮箱已验证，你已登录。', 'Email verified. You’re signed in.'), true); track('account_verified', { backend: 'supabase' }); }
  }, 900);

  // ------------------------------------------------------------------ errors → the codes js/account.js knows
  function code(e) {
    var c = (e && (e.code || e.error_code)) || '', m = String(e && e.message || '');
    if (c === 'user_already_exists' || /already registered/i.test(m)) return 'exists';
    if (c === 'invalid_credentials' || /invalid login/i.test(m)) return 'credentials';
    if (c === 'email_not_confirmed' || /not confirmed/i.test(m)) return 'unconfirmed';
    if (/rate_limit|rate limit|too many/i.test(c + m) || (e && e.status === 429)) return 'rate';
    if (c === 'weak_password' || /password/i.test(m)) return 'password';
    if (c === 'email_address_invalid' || /email/i.test(m) && /invalid/i.test(m)) return 'email';
    if (/otp_expired|expired|invalid.*(token|otp)/i.test(c + m)) return 'token';
    if (/phone/i.test(c + m)) return 'phone';
    return 'other';
  }
  function wrap(p) {
    return p.then(function (r) { if (r.error) { var c = code(r.error); return { ok: false, error: c, message: r.error.message }; } return { ok: true, data: r.data }; },
      function (e) { return { ok: false, error: 'net', message: String(e && e.message || e) }; });
  }

  // ------------------------------------------------------------------ sync (public.progress)
  var pulling = false, pushTimer = null, syncState = 'idle';
  function planOf(st) { var o = {}; ['goals', 'level', 'minutes', 'days', 'weeks', 'reminder', 'startedAt', 'done'].forEach(function (k) { if (st && st[k] !== undefined) o[k] = st[k]; }); return o; }
  function localMark() { return +localStorage.getItem(MARK_KEY) || 0; }
  function apply(doc, remoteAt) {
    var P = A.P, rp = doc.progress || {}, remoteNewer = remoteAt > localMark();
    ['count', 'days'].forEach(function (k) {
      P[k] = P[k] || {}; var src = rp[k] || {};
      for (var x in src) P[k][x] = Math.max(+P[k][x] || 0, +src[x] || 0);
    });
    P.level = P.level || {}; var lv = rp.level || {};
    for (var m in lv) if (remoteNewer || P.level[m] == null) P.level[m] = lv[m];
    var st = J();
    if (st && doc.plan && doc.plan.done && (remoteNewer || !st.done) && window.BDJJourney.applyPlan) window.BDJJourney.applyPlan(doc.plan);
    lastSig = sig();
    A.saveProg();
    A.renderAll();
  }
  function pull() {
    pulling = true; syncState = 'pulling';
    return sb.from('progress').select('data,updated_at').eq('site', SITE).maybeSingle().then(function (r) {
      if (r.error) { syncState = 'error'; pulling = false; console.warn('[cloud] sync unavailable:', r.error.message); return; }
      if (r.data && r.data.data) apply(r.data.data, Date.parse(r.data.updated_at) || 0);
      pulling = false; syncState = 'synced';
      push(0);
    }, function () { pulling = false; syncState = 'error'; });
  }
  function push(delay) {
    if (!uid || pulling || syncState === 'error') return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var now = new Date().toISOString();
      sb.from('progress').upsert({ user_id: uid, site: SITE, data: { v: 1, progress: A.P, plan: planOf(J()) }, updated_at: now }, { onConflict: 'user_id,site' })
        .then(function (r) { syncState = r.error ? 'error' : 'synced'; if (r.error) console.warn('[cloud] push failed:', r.error.message); });
    }, delay == null ? 2000 : delay);
  }
  // only plan / level edits count as "changed here last" (time and counts are merged by max anyway)
  function sig() { return JSON.stringify([planOf(J()), A.P.level || {}]); }
  var lastSig = sig();
  function changed() {
    if (pulling) return;
    var s = sig();
    if (s !== lastSig) { lastSig = s; try { localStorage.setItem(MARK_KEY, String(Date.now())); } catch (e) { } }
    push();
  }
  if (A.onProgress) A.onProgress.push(changed);

  // ------------------------------------------------------------------ nonce for Apple's ID token
  function nonce() {
    var raw = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (buf) {
      return { raw: raw, hashed: Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('') };
    });
  }

  window.BDJCloud = {
    configured: true, client: sb, ready: settingsReady, enabled: enabled, changed: changed, toProfile: toProfile,
    sync: function () { return syncState; },
    signUp: function (email, password, name, lang) {
      return wrap(sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: RETURN, data: { full_name: name || undefined, lang: lang } } }))
        .then(function (r) { if (r.ok) r.needsConfirm = !(r.data && r.data.session); return r; });
    },
    signIn: function (email, password) { return wrap(sb.auth.signInWithPassword({ email: email, password: password })); },
    forgot: function (email) { return wrap(sb.auth.resetPasswordForEmail(email, { redirectTo: RETURN })); },
    setPassword: function (password) { return wrap(sb.auth.updateUser({ password: password })); },
    resend: function (email) { return wrap(sb.auth.resend({ type: 'signup', email: email, options: { emailRedirectTo: RETURN } })); },
    signOut: function () { uid = null; return sb.auth.signOut().catch(function () { }); },
    phoneStart: function (phone) { return wrap(sb.auth.signInWithOtp({ phone: phone })); },
    phoneVerify: function (phone, token) {
      return wrap(sb.auth.verifyOtp({ phone: phone, token: token, type: 'sms' })).then(function (r) {
        if (!r.ok) throw new Error(r.message || r.error); return toProfile(r.data.user);
      });
    },
    oauth: function (provider, next) {   // leaves the page; comes back signed in (onAuthStateChange)
      try { localStorage.setItem(NEXT_KEY, next || 'goals'); } catch (e) { }
      return sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: RETURN } });
    },
    nonce: nonce,
    idToken: function (provider, token, rawNonce) {
      return wrap(sb.auth.signInWithIdToken({ provider: provider, token: token, nonce: rawNonce })).then(function (r) {
        if (!r.ok) throw new Error(r.message || r.error); return toProfile(r.data.user);
      });
    }
  };
})();
