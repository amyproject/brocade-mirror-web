/*
 * Background replacement for the white-studio Baduanjin footage.
 *
 * Two interchangeable back-ends, chosen per page at runtime:
 *
 *  - "gl"  : WebGL shader key. Used when the page is allowed to read video pixels
 *            (Safari/WebKit on file://, or any browser when served over http).
 *            Soft saturation + luminance key, vertical "closing" in the floor zone
 *            so white shoes on a white floor are not erased, a 1-px edge choke,
 *            and un-mixing of the white backdrop out of the edge pixels (spill).
 *
 *  - "svg" : CSS filter:url(#bdjKey) on the <video> itself. Used when WebGL refuses
 *            the video as cross-origin (Chrome / Firefox on file:// treat every
 *            file as its own origin, so canvas/WebGL pixel access is blocked).
 *            SVG filters never expose pixels to script, so they are allowed.
 *            Same idea built from feColorMatrix / feComponentTransfer /
 *            feMorphology primitives; no spill un-mixing.
 *
 * MediaPipe segmentation was evaluated and not used: on file:// Chrome blocks both
 * the ES-module/wasm loading and the pixel reads it needs, and on this clean
 * footage a colour key gives crisper edges than the 256x256 lite pose mask.
 */
(function () {
  'use strict';

  // Key parameters (normalised 0..1 sRGB). Tuned on frames from all clip families.
  var K = {
    s0: 0.045, s1: 0.11,   // saturation ramp: below s0 = backdrop, above s1 = person
    l0: 0.60, l1: 0.80,    // luminance ramp: darker than l0 = person (hair, shadows of folds)
    // stricter ramps on the floor, where the glossy studio floor reflects the red suit
    fs0: 0.08, fs1: 0.16, fl0: 0.55, fl1: 0.72,
    zone0: 0.62, zone1: 0.72, // floor zone (fraction of frame height) where shoe-fill applies
    up: 0.07, down: 0.03,  // shoe-fill: suit above within 7 %, tan shoe sole below within 3 % of height
    bg: 0.91               // backdrop grey used to un-mix edge pixels
  };

  var VS = [
    'attribute vec2 p;',
    'varying vec2 uv;',
    'void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.0,1.0); }'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'varying vec2 uv;',
    'uniform sampler2D t;',
    'uniform vec2 px;',
    'uniform vec4 k;',      // s0 s1 l0 l1
    'uniform vec4 kf;',     // floor-zone s0 s1 l0 l1
    'uniform vec4 z;',      // zone0 zone1 up down
    'uniform float bgL;',
    'uniform float on;',    // 0 = passthrough (original)
    'uniform float ck;',    // edge choke radius in texels (1 sharp clips, 2 soft low-bitrate clips)
    'float rawA(vec2 q){',
    '  vec4 kk = mix(k, kf, smoothstep(z.x, z.y, q.y));',
    '  vec3 c = texture2D(t, q).rgb;',
    '  float mx = max(c.r, max(c.g, c.b));',
    '  float mn = min(c.r, min(c.g, c.b));',
    '  float L = dot(c, vec3(0.299, 0.587, 0.114));',
    '  return clamp(smoothstep(kk.x, kk.y, mx - mn) + (1.0 - smoothstep(kk.z, kk.w, L)), 0.0, 1.0);',
    '}',
    // tan/brown shoe sole (also matches skin, harmless here): orange hue, G/R 0.45..0.95, B <= G
    'float soleA(vec2 q){',
    '  vec3 c = texture2D(t, q).rgb;',
    '  float s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));',
    '  float gr = c.g / max(c.r, 0.001);',
    '  return smoothstep(0.10, 0.2, s) * smoothstep(0.45, 0.58, gr) * (1.0 - smoothstep(0.92, 1.0, gr)) * smoothstep(-0.02, 0.03, c.g - c.b)',
    '       * (1.0 - smoothstep(0.66, 0.74, dot(c, vec3(0.299, 0.587, 0.114))))',  // soles are mid-dark; red/white chroma fringes are light
    '       * smoothstep(0.78, 0.84, q.y);',   // soles live near the bottom; keeps hands (skin) out
    '}',
    'void main(){',
    '  vec3 c = texture2D(t, uv).rgb;',
    '  if (on < 0.5) { gl_FragColor = vec4(c, 1.0); return; }',
    '  float a = rawA(uv);',
    '  vec2 e = px * ck;',
    '  float n = min(min(rawA(uv + vec2(e.x, 0.0)), rawA(uv - vec2(e.x, 0.0))),',
    '                min(rawA(uv + vec2(0.0, e.y)), rawA(uv - vec2(0.0, e.y))));',
    '  float n2 = min(min(rawA(uv + vec2(2.0 * e.x, 0.0)), rawA(uv - vec2(2.0 * e.x, 0.0))),',
    '                 min(rawA(uv + vec2(0.0, 2.0 * e.y)), rawA(uv - vec2(0.0, 2.0 * e.y))));',
    '  float ac = min(a, n);',
    // light, near-white pixels on the silhouette edge are backdrop halo: drop them
    '  ac *= 1.0 - (1.0 - n2) * smoothstep(0.72, 0.92, dot(c, vec3(0.299, 0.587, 0.114)));',
    '  float zone = smoothstep(z.x, z.y, uv.y);',
    '  if (zone > 0.0 && a < 0.98) {',
    '    float up = 0.0; float dn = 0.0;',
    '    for (int i = 1; i <= 8; i++) {',
    '      float f = float(i) / 8.0;',
    '      up = max(up, rawA(uv - vec2(0.0, f * z.z)));',
    '      dn = max(dn, soleA(uv + vec2(0.0, f * z.w)));',
    '    }',
    '    ac = max(ac, min(up, dn) * zone);',
    '  }',
    '  vec3 B = vec3(bgL);',
    '  vec3 F = clamp((c - (1.0 - ac) * B) / max(ac, 0.001), 0.0, 1.0);',
    '  gl_FragColor = vec4(F * ac, ac);',   // premultiplied
    '}'
  ].join('\n');

  // ---------- capability probe (once per page) ----------
  var probed = null;
  function probeGL(video) {
    // Returns true if WebGL may read this video's pixels.
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 2;
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return false;
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      var ok = gl.getError() === gl.NO_ERROR;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return ok;
    } catch (e) {
      return false; // SecurityError on file:// in Chrome/Firefox
    }
  }

  // ---------- SVG filter (built once, shared by all stages) ----------
  var svgReady = false;
  function ensureSvgFilter() {
    if (svgReady) return;
    svgReady = true;
    var zoneSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="100" preserveAspectRatio="none">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="' + K.zone0 + '" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset="' + K.zone1 + '" stop-color="#fff" stop-opacity="1"/></linearGradient></defs>' +
      '<rect width="10" height="100" fill="url(#g)"/></svg>';
    var zoneHref = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(zoneSvg);
    var zone2Href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(zoneSvg.replace('offset="' + K.zone0 + '"', 'offset="0.78"').replace('offset="' + K.zone1 + '"', 'offset="0.84"'));
    var f = function (n) { return (+n).toFixed(4); };
    function rowSat(s0, s1) { var a = 1 / (8 * (s1 - s0)), b = -8 * s0 * a; return [f(a), f(a), f(a), 0, f(b)].join(' '); }
    function rowDark(l0, l1) { var d = 1 / (l1 - l0); return [f(-0.299 * d), f(-0.587 * d), f(-0.114 * d), 0, f(l1 * d)].join(' '); }
    var rs2 = rowSat(0.10, 0.2);
    function chain(tag, s0, s1, l0, l1) {
      var rs = rowSat(s0, s1), rd = rowDark(l0, l1);
      return '<feColorMatrix in="ad" type="matrix" values="' + rs + ' ' + rs + ' ' + rs + ' 0 0 0 0 1" result="sat' + tag + '"/>' +
        '<feColorMatrix in="SourceGraphic" type="matrix" values="' + rd + ' ' + rd + ' ' + rd + ' 0 0 0 0 1" result="dark' + tag + '"/>' +
        '<feComposite in="sat' + tag + '" in2="dark' + tag + '" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="score' + tag + '"/>' +
        '<feComponentTransfer in="score' + tag + '" result="soft' + tag + '"><feFuncR type="table" tableValues="0 0.104 0.352 0.648 0.896 1"/></feComponentTransfer>' +
        '<feColorMatrix in="soft' + tag + '" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="m' + tag + '"/>';
    }
    var html =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false">' +
      '<filter id="bdjKey" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="112%">' +
      // |R-G|, |G-B|, |B-R| amplified x4 (sum = 8 * saturation)
      '<feColorMatrix in="SourceGraphic" type="matrix" values="2 -2 0 0 0.5  0 2 -2 0 0.5  -2 0 2 0 0.5  0 0 0 0 1" result="d"/>' +
      '<feComponentTransfer in="d" result="ad"><feFuncR type="table" tableValues="1 0 1"/><feFuncG type="table" tableValues="1 0 1"/><feFuncB type="table" tableValues="1 0 1"/></feComponentTransfer>' +
      chain('W', K.s0, K.s1, K.l0, K.l1) + chain('F', K.fs0, K.fs1, K.fl0, K.fl1) +
      '<feImage id="bdjZone" href="' + zoneHref + '" xlink:href="' + zoneHref + '" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="zone"/>' +
      '<feComposite in="mW" in2="zone" operator="out" result="mWz"/>' +
      '<feComposite in="mF" in2="zone" operator="in" result="mFz"/>' +
      '<feComposite in="mWz" in2="mFz" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="m"/>' +
      '<feMorphology in="m" operator="erode" radius="0.8" result="choke"/>' +
      // shoe sole mask: sat ramp x (G-0.5R) x (0.95R-G) x (G-B), each clipped to 0..1
      '<feColorMatrix in="ad" type="matrix" values="' + rs2 + ' ' + rs2 + ' ' + rs2 + ' 0 0 0 0 1" result="ss"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="-6 12 0 0 0  11.4 -12 0 0 0  0 20 -20 0 0.4  0 0 0 0 1" result="hue"/>' +
      '<feColorMatrix in="hue" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="h1"/>' +
      '<feColorMatrix in="hue" type="matrix" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 0 1" result="h2"/>' +
      '<feColorMatrix in="hue" type="matrix" values="0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  0 0 0 0 1" result="h3"/>' +
      '<feComposite in="h1" in2="h2" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="h12"/>' +
      '<feComposite in="h12" in2="h3" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="h123"/>' +
      '<feComposite in="h123" in2="ss" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="h1234"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="' + rowDark(0.66, 0.74) + ' ' + rowDark(0.66, 0.74) + ' ' + rowDark(0.66, 0.74) + ' 0 0 0 0 1" result="soleL"/>' +
      '<feComposite in="h1234" in2="soleL" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="soleRGB"/>' +
      '<feColorMatrix in="soleRGB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="sole0"/>' +
      '<feImage id="bdjZone2" href="' + zone2Href + '" xlink:href="' + zone2Href + '" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="zone2"/>' +
      '<feComposite in="sole0" in2="zone2" operator="in" result="sole"/>' +
      // suit within 2*ru above  AND  sole within 2*rd below  AND  floor zone
      '<feMorphology id="bdjUpD" in="m" operator="dilate" radius="0 12" result="upd"/>' +
      '<feOffset id="bdjUpO" in="upd" dx="0" dy="12" result="up"/>' +
      '<feMorphology id="bdjDnD" in="sole" operator="dilate" radius="0 5" result="dnd"/>' +
      '<feOffset id="bdjDnO" in="dnd" dx="0" dy="-5" result="dn"/>' +
      '<feComposite in="up" in2="dn" operator="in" result="updn"/>' +
      '<feComposite in="updn" in2="zone" operator="in" result="feet"/>' +
      '<feMerge result="mask"><feMergeNode in="choke"/><feMergeNode in="feet"/></feMerge>' +
      '<feGaussianBlur in="mask" stdDeviation="0.6" result="maskb"/>' +
      '<feComposite in="SourceGraphic" in2="maskb" operator="in"/>' +
      '</filter></svg>';
    var holder = document.createElement('div');
    holder.innerHTML = html;
    document.body.appendChild(holder.firstChild);
  }
  // Shoe-fill radius is in CSS px of the displayed video, so it tracks its height.
  // The floor-zone image is sized in CSS px to the displayed video (all keyed videos on
  // screen share one size: either the single view or the equal grid tiles).
  var lastCloseR = -1, lastZone = '';
  function updateSvgClose(displayH, displayW) {
    var z = document.getElementById('bdjZone'), key = Math.round(displayW) + 'x' + Math.round(displayH);
    if (z && displayW && key !== lastZone) {
      lastZone = key;
      ['bdjZone', 'bdjZone2'].forEach(function (id) { var el = document.getElementById(id); if (el) { el.setAttribute('width', Math.round(displayW)); el.setAttribute('height', Math.round(displayH)); } });
    }
    var ru = Math.max(3, Math.round(displayH * K.up / 2)), rd = Math.max(2, Math.round(displayH * K.down / 2));
    if (ru === lastCloseR) return;
    lastCloseR = ru;
    var set = function (id, a, v) { var el = document.getElementById(id); if (el) el.setAttribute(a, v); };
    set('bdjUpD', 'radius', '0 ' + ru); set('bdjUpO', 'dy', ru);
    set('bdjDnD', 'radius', '0 ' + rd); set('bdjDnO', 'dy', -rd);
  }

  // ---------- per-stage compositor ----------
  function Compositor(video, canvas) {
    this.video = video;
    this.canvas = canvas;
    this.enabled = false;  // background replacement on/off
    this.mode = null;      // 'gl' | 'svg'
    this.gl = null;
    this.lastT = -1;
    this.dirty = true;
    var self = this;
    ['seeked', 'loadeddata', 'play'].forEach(function (ev) {
      video.addEventListener(ev, function () { self.dirty = true; });
    });
    video.addEventListener('loadeddata', function () { self.decide(); });
  }

  Compositor.prototype.decide = function () {
    if (this.video.readyState < 2) return;
    if (probed === null) probed = probeGL(this.video) ? 'gl' : 'svg';
    this.mode = probed;
    if (this.mode === 'gl' && !this.gl && !this.initGL()) { this.mode = probed = 'svg'; }
    if (this.mode === 'svg') { ensureSvgFilter(); if (this.dispH) updateSvgClose(this.dispH, this.dispW); }
    this.apply();
  };

  Compositor.prototype.initGL = function () {
    var gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!gl) return false;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('shader', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.u = {
      px: gl.getUniformLocation(pr, 'px'), k: gl.getUniformLocation(pr, 'k'), z: gl.getUniformLocation(pr, 'z'),
      bgL: gl.getUniformLocation(pr, 'bgL'), on: gl.getUniformLocation(pr, 'on'), ck: gl.getUniformLocation(pr, 'ck')
    };
    gl.uniform4f(this.u.k, K.s0, K.s1, K.l0, K.l1);
    gl.uniform4f(gl.getUniformLocation(pr, 'kf'), K.fs0, K.fs1, K.fl0, K.fl1);
    gl.uniform4f(this.u.z, K.zone0, K.zone1, K.up, K.down);
    gl.uniform1f(this.u.bgL, K.bg);
    gl.uniform1i(gl.getUniformLocation(pr, 't'), 0);
    this.gl = gl;
    return true;
  };

  Compositor.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    this.dirty = true;
    this.apply();
  };

  // Show the right element for the current mode.
  Compositor.prototype.apply = function () {
    var v = this.video, c = this.canvas;
    // BDJ_FORCE_CANVAS: verification hook — route "Original" through the GL canvas too
    // (passthrough), because the offscreen screenshot tool cannot capture <video> layers.
    var useGL = this.mode === 'gl' && (this.enabled || window.BDJ_FORCE_CANVAS);
    var useSvg = this.enabled && this.mode === 'svg';
    v.style.filter = useSvg ? 'url(#bdjKey)' : '';
    v.style.webkitFilter = useSvg ? 'url(#bdjKey)' : '';
    v.style.opacity = useGL ? '0' : ''; // not visibility:hidden — WebKit pauses muted videos it deems invisible
    c.style.display = useGL ? 'block' : 'none';
    this.dirty = true;
  };

  Compositor.prototype.layout = function (displayH, displayW) {
    this.dispH = displayH; this.dispW = displayW;
    if (this.mode === 'svg') updateSvgClose(displayH, displayW);
  };

  // Called from the app's animation loop.
  Compositor.prototype.tick = function () {
    if (!(this.enabled || window.BDJ_FORCE_CANVAS) || this.mode !== 'gl' || !this.gl) return;
    var v = this.video;
    if (v.readyState < 2) return;
    var t = v.currentTime;
    if (!this.dirty && t === this.lastT) return;
    this.lastT = t; this.dirty = false;
    var gl = this.gl, w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    } catch (e) {
      // Became tainted (should not happen) — fall back permanently.
      probed = this.mode = 'svg'; ensureSvgFilter(); this.apply(); return;
    }
    gl.uniform2f(this.u.px, 1 / w, 1 / h);
    gl.uniform1f(this.u.on, this.enabled ? 1 : 0);
    // Low-bitrate / downscaled sources have softer edges: choke a little more.
    gl.uniform1f(this.u.ck, v.videoWidth * v.videoHeight < 1.1e6 && /full-|gym-/.test(v.currentSrc) ? 1.8 : 1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  Compositor.ensureSvgFilter = ensureSvgFilter;
  Compositor.updateSvgClose = updateSvgClose;
  window.BDJCompositor = Compositor;
  window.BDJKeyParams = K;
})();
