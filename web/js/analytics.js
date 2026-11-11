/* Product analytics → PostHog, with no external script (works from file:// and in the one-file build).
   Config: D.site.posthog = { key: 'phc_…' (project API key — public, safe in a web page), host }.
   Never put a personal API key (phx_…) here: it grants account access.
   API: BDJTrack(event, props) · BDJTrack.identify(userId, personProps) · BDJTrack.set(personProps) · BDJTrack.reset() */
(function () {
  'use strict';
  var D = window.BDJ || {}, SITE = D.site || {}, CFG = SITE.posthog;
  var noop = function () { }; noop.identify = noop.set = noop.reset = noop.flush = noop;
  if (!CFG || !CFG.key || /^phx_/.test(CFG.key) || !window.fetch) { window.BDJTrack = noop; return; }

  var HOST = (CFG.host || 'https://us.i.posthog.com').replace(/\/$/, '');
  var KEY = 'bdj.ph.' + (SITE.id || 'main');
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
  var st = load();
  if (!st.anon) { st.anon = uuid(); save(); }
  var session = uuid(), queue = [], timer = 0;

  // file:// URLs carry the local folder path; report only the file name.
  function pageUrl() { return location.protocol === 'file:' ? 'file:///' + location.pathname.split('/').pop() : location.href; }
  function base() {
    var S = window.BDJApp && window.BDJApp.S;
    return {
      distinct_id: st.user || st.anon, $session_id: session, $lib: 'brocade-mirror-web', $lib_version: '1',
      $current_url: pageUrl(), $host: location.host || 'file', $pathname: location.protocol === 'file:' ? '/' + location.pathname.split('/').pop() : location.pathname,
      $screen_width: screen.width, $screen_height: screen.height, $viewport_width: innerWidth, $viewport_height: innerHeight,
      $browser_language: navigator.language, site: SITE.id || 'main', standalone: !!window.U, lang: S ? S.lang : undefined
    };
  }
  function send(batch, beacon) {
    if (!batch.length) return;
    var body = JSON.stringify({ api_key: CFG.key, batch: batch });
    // text/plain keeps it a "simple" request: no CORS preflight, so it also works from file://.
    try { fetch(HOST + '/batch/', { method: 'POST', body: body, keepalive: !!beacon && body.length < 60000, headers: { 'Content-Type': 'text/plain' } }).catch(noop); } catch (e) { }
  }
  function flush(beacon) { clearTimeout(timer); timer = 0; var b = queue; queue = []; send(b, beacon); }
  function capture(event, props) {
    var p = base(); for (var k in props || {}) p[k] = props[k];
    queue.push({ event: event, properties: p, timestamp: new Date().toISOString(), uuid: uuid() });
    if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 2500);
  }

  var track = function (event, props) { capture(event, props); };
  track.identify = function (userId, person) {
    if (!userId) return;
    var anon = st.anon;
    if (st.user !== userId) { st.user = userId; save(); }
    capture('$identify', { $anon_distinct_id: anon, $set: person || {} });
  };
  track.set = function (person) { capture('$set', { $set: person || {} }); };
  track.reset = function () { st = { anon: uuid() }; save(); };
  track.flush = flush;
  window.BDJTrack = track;

  addEventListener('pagehide', function () { flush(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(true); });
  capture('$pageview', { $title: document.title });
})();
