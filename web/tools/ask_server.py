#!/usr/bin/env python3
"""Local server for the apps, the 问一问 · Ask chat (TypeSafe Jev) and the voice coach (Deepgram).

    python3 web/tools/ask_server.py        (or: sh web/serve.sh)
    open http://localhost:8765/web/baduanjin-v2.html

* Serves baduanjin_app/ like `python3 -m http.server` (so Chrome/Firefox get the WebGL key).
* POST /api/ask {q, lang, move, history} asks Jev which vetted answer in content/ask.json fits.
  Jev only chooses; it never writes text. The browser never sees the API key, and it can only
  send a question: the request to TypeSafe is built here from the answer library, so the key
  can't be used for anything else.
* API key: $TYPESAFE_API_KEY, else ~/.config/brocade-mirror/typesafe.key (keep it out of this
  folder: everything in baduanjin_app/ can end up in the one-file builds).
* POST /api/stt (raw audio, ?lang=en|zh) -> Deepgram nova-3 transcript; POST /api/tts {text}
  -> Deepgram Aura-2 English speech (mp3, cached in ~/.cache/brocade-mirror/tts). Deepgram key:
  $DEEPGRAM_API_KEY, else ~/.config/brocade-mirror/deepgram.key. Audio is not stored.
* Listens on 127.0.0.1 only and answers only pages it served itself (Origin and Host must be
  localhost/127.0.0.1 on this port). Pages opened from file:// (incl. the one-file build) can't use it:
  allowing Origin "null" would let any website spend the keys (sandboxed iframes send "null"), so those
  pages use the offline answer matcher and the built-in voiceover clips instead.
"""
import hashlib, json, os, re, sys, tempfile, time, threading, urllib.parse, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))          # baduanjin_app/
LIB_PATH = os.path.join(HERE, '..', 'content', 'ask.json')
ME_VIDEO = os.path.abspath(os.path.join(ROOT, '..', 'me_video'))   # taichi/me_video
PORT = int(os.environ.get('PORT', '8765'))
API = os.environ.get('TYPESAFE_API_URL', 'https://api.typesafe.ai/v1/systemone')
MODEL = os.environ.get('TYPESAFE_MODEL', 'jev-latest')
KEY_FILE = os.path.expanduser('~/.config/brocade-mirror/typesafe.key')
DG_KEY_FILE = os.path.expanduser('~/.config/brocade-mirror/deepgram.key')
DG_VOICE = os.environ.get('DEEPGRAM_VOICE', 'aura-2-athena-en')
TTS_CACHE = os.path.expanduser('~/.cache/brocade-mirror/tts')
MAX_AUDIO = 6 * 1024 * 1024
AUDIO_TYPES = re.compile(r'^audio/(webm|ogg|mp4|mpeg|wav|x-wav|aac|x-m4a)(;.*)?$')
HOSTS_OK = {'localhost:%d' % PORT, '127.0.0.1:%d' % PORT}
ORIGINS_OK = {'http://' + h for h in HOSTS_OK}
TTS_CACHE_MAX = 300   # files (~10–20 MB); oldest are removed first
MAX_Q = 500
RATE = (60, 60.0)  # at most 60 calls a minute (ask + speech) (protects the key's quota)


def api_key():
    k = os.environ.get('TYPESAFE_API_KEY', '').strip()
    if not k and os.path.exists(KEY_FILE):
        k = open(KEY_FILE, encoding='utf-8').read().strip()
    return k


sys.path.insert(0, HERE)
import exa_content  # noqa: E402  (shares the reputable-domain list and result cleaning)
import accounts  # noqa: E402  (email accounts, Resend email, donations)


def exa_key():
    k = os.environ.get('EXA_API_KEY', '').strip()
    p = os.path.expanduser('~/.config/brocade-mirror/exa.key')
    if not k and os.path.exists(p):
        k = open(p, encoding='utf-8').read().strip()
    return k


def dg_key():
    k = os.environ.get('DEEPGRAM_API_KEY', '').strip()
    if not k and os.path.exists(DG_KEY_FILE):
        k = open(DG_KEY_FILE, encoding='utf-8').read().strip()
    return k


def dg(url, data, ctype, key, timeout=30):
    req = urllib.request.Request(url, data=data, method='POST', headers={'Authorization': 'Token ' + key, 'Content-Type': ctype})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


_lib = {'mtime': 0, 'data': None}
def library():
    m = os.path.getmtime(LIB_PATH)
    if m != _lib['mtime']:
        _lib['data'], _lib['mtime'] = json.load(open(LIB_PATH, encoding='utf-8')), m
    return _lib['data']


def build_request(q, move, history, lib):
    by_id = {e['id']: e for e in lib['entries']}
    catalog = {e['id']: '%s. Example: "%s"' % (e['desc'], e['q']['en']) for e in lib['entries']}
    state = {'user_question': q, 'answer_library': catalog}
    if history:
        state['conversation_so_far'] = [{'asked': h['q'][:MAX_Q], 'answered_with': by_id[h['id']]['desc']}
                                        for h in history if h.get('id') in by_id][-2:]
    mv = next((m for m in lib['entries'] if m.get('move') == move), None)
    if mv:
        state['move_on_screen'] = 'Move %d (%s)' % (move, mv['desc'].split(':')[0].split(' ', 2)[2])
    return {
        'model': MODEL,
        'state': state,
        'questions': {
            'answer': {
                'type': 'choice',
                'instructions': 'Which entry in answer_library best answers user_question? The question may be in Chinese or English. '
                                'Use conversation_so_far and move_on_screen only to resolve references such as "this move", '
                                '"what about seated?" or "and for knees?".',
                'criteria': {e['id']: e['desc'] for e in lib['entries']},
            },
            'covered': {
                'type': 'noul',
                'instructions': 'Judging user_question alone (ignore conversation_so_far unless user_question is a short follow-up such as "what about seated?"): at least one entry in answer_library directly answers it.',
                'criteria': {'true': 'An entry addresses what the user asked about (topic, move, or health condition).',
                             'false': 'The question is about something none of the entries cover.'},
            },
            'urgent': {
                'type': 'noul',
                'instructions': 'In user_question itself (not conversation_so_far), the user describes symptoms happening now or very recently that may need urgent medical attention.',
                'criteria': {'true': 'Chest pain or tightness, fainting, severe shortness of breath, sudden numbness or weakness, '
                                     'severe dizziness, or a fall or injury during practice.',
                             'false': 'General questions about health conditions, precautions, mild stretch or muscle soreness.'},
            },
            'on_topic': {
                'type': 'noul',
                'instructions': 'user_question itself (ignore conversation_so_far) is about Baduanjin, qigong, tai chi, exercise, the body or health, or using this practice app.',
            },
        },
    }


def ask_jev(body, key):
    req = urllib.request.Request(API, data=json.dumps(body).encode('utf-8'), method='POST', headers={
        'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'brocade-mirror-ask/1'})
    for attempt in range(3):  # 429 / 529: back off and retry, as the docs ask
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 529) and attempt < 2:
                time.sleep(float(e.headers.get('retry-after') or 0) or (0.6 * 2 ** attempt))
                continue
            raise


_hits, _hits_lock = [], threading.Lock()
def rate_ok():
    now = time.time()
    with _hits_lock:
        while _hits and now - _hits[0] > RATE[1]:
            _hits.pop(0)
        if len(_hits) >= RATE[0]:
            return False
        _hits.append(now)
        return True


def prune_tts_cache():
    try:
        files = sorted((os.path.getmtime(os.path.join(TTS_CACHE, f)), f) for f in os.listdir(TTS_CACHE) if f.endswith('.mp3'))
        for _, f in files[:max(0, len(files) - TTS_CACHE_MAX)]:
            os.remove(os.path.join(TTS_CACHE, f))
    except OSError:
        pass


class H(SimpleHTTPRequestHandler):
    timeout = 20  # a slow or stuck client can't hold a thread forever

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def host_ok(self):
        # DNS rebinding: a hostile name that resolves to 127.0.0.1 still sends its own Host header
        if self.headers.get('Host', '') in HOSTS_OK:
            return True
        self.send_error(421, 'Misdirected request')
        return False

    def origin_ok(self):
        o = self.headers.get('Origin')
        return o is None or o in ORIGINS_OK

    def clen(self, limit):
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            return -1
        return n if 0 < n <= limit else -1

    def json_body(self, limit):
        if not (self.headers.get('Content-Type') or '').lower().startswith('application/json'):
            return None, (415, 'type')
        n = self.clen(limit)
        if n < 0:
            return None, (413, 'size')
        try:
            return json.loads(self.rfile.read(n)), None
        except Exception:
            return None, (400, 'bad request')

    def static_ok(self):
        path = urllib.parse.unquote(self.path.split('?')[0].split('#')[0])
        return not any(p.startswith('.') for p in path.split('/') if p)

    def translate_path(self, path):
        # The avatar clips live next to baduanjin_app/ (taichi/me_video); pages reach them as ../../me_video/.
        clean = urllib.parse.unquote(path.split('?')[0].split('#')[0])
        if clean.startswith('/me_video/'):
            rel = os.path.normpath(clean[len('/me_video/'):]).lstrip('/')
            if rel.startswith('..'):
                return os.path.join(ROOT, '__nope__')
            return os.path.join(ME_VIDEO, rel)
        return super().translate_path(path)

    def list_directory(self, path):  # no directory listings
        self.send_error(404)
        return None

    def log_message(self, fmt, *args):  # keep questions out of the log; paths only
        sys.stderr.write('%s %s\n' % (self.log_date_time_string(), fmt % args))

    def cors(self):
        o = self.headers.get('Origin')
        if o in ORIGINS_OK:  # localhost vs 127.0.0.1 count as different origins
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Vary', 'Origin')

    def reply(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):
        if not self.host_ok():
            return
        if not self.origin_ok():
            return self.send_error(403)
        self.send_response(204)
        self.cors()
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '600')
        self.end_headers()

    def do_GET(self):
        if not self.host_ok():
            return
        route = self.path.split('?')[0]
        if route == '/api/ask':
            return self.reply(200, {'ok': True, 'configured': bool(api_key()), 'model': MODEL, 'voice': bool(dg_key()),
                                    'accounts': True, 'donations': accounts.donation_mode()})
        qs = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        if route == '/api/auth/verify':
            return self.redirect(accounts.verify((qs.get('token') or [''])[0], accounts.public_url(PORT)))
        if route == '/api/auth/me':
            u = self.user()
            return self.reply(200, {'user': accounts.public_user(u)}) if u else self.reply(401, {'error': 'auth'})
        if route == '/api/donate/return':
            return self.redirect(accounts.donate_return((qs.get('session_id') or [''])[0]))
        if not self.static_ok():
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if not self.host_ok():
            return
        if not self.static_ok():
            return self.send_error(404)
        return super().do_HEAD()

    def do_POST(self):
        route = self.path.split('?')[0]
        if not self.host_ok():
            return
        if not self.origin_ok():
            return self.reply(403, {'error': 'origin'})
        if route == '/api/stt':
            return self.stt()
        if route == '/api/tts':
            return self.tts()
        if route == '/api/refs':
            return self.refs()
        if route.startswith('/api/auth/') or route == '/api/donate/start':
            return self.account(route)
        if route != '/api/ask':
            return self.send_error(404)
        inp, err = self.json_body(8192)
        if err:
            return self.reply(err[0], {'error': err[1]})
        try:
            q = str(inp.get('q', '')).strip()[:MAX_Q]
            move = int(inp.get('move') or 0)
            history = [h for h in (inp.get('history') or []) if isinstance(h, dict)][-2:]
        except Exception:
            return self.reply(400, {'error': 'bad request'})
        if not q:
            return self.reply(400, {'error': 'empty'})
        key = api_key()
        if not key:
            return self.reply(503, {'error': 'no_key'})
        if not rate_ok():
            return self.reply(429, {'error': 'rate'})
        lib = library()
        t0 = time.time()
        try:
            res = ask_jev(build_request(q, move, history, lib), key)
            a = res['answers']
            probs = a['answer']['probabilities']
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode('utf-8', 'replace')
            sys.stderr.write('typesafe %s: %s\n' % (e.code, detail))
            return self.reply(502, {'error': 'typesafe', 'status': e.code})
        except Exception as e:
            sys.stderr.write('typesafe error: %r\n' % e)
            return self.reply(502, {'error': 'unreachable'})
        top = sorted(probs.items(), key=lambda kv: -kv[1])[:3]
        return self.reply(200, {
            'source': 'jev', 'model': res.get('model'), 'ms': int((time.time() - t0) * 1000),
            'top': [{'id': k, 'p': round(v, 3)} for k, v in top],
            'confidence': round(a['answer'].get('confidence', 0), 3),
            'covered': round(a['covered']['noul'], 3),
            'urgent': round(a['urgent']['noul'], 3),
            'on_topic': round(a['on_topic']['noul'], 3),
        })


    # ---------------------------------------------------------------- voice (Deepgram)
    def stt(self):
        key, n = dg_key(), self.clen(MAX_AUDIO)
        ctype = (self.headers.get('Content-Type') or '').lower()
        if not key:
            return self.reply(503, {'error': 'no_key'})
        if n < 0:
            return self.reply(413, {'error': 'size'})
        if not AUDIO_TYPES.match(ctype):
            return self.reply(415, {'error': 'type'})
        if not rate_ok():
            return self.reply(429, {'error': 'rate'})
        audio = self.rfile.read(n)
        lang = 'zh-CN' if 'lang=zh' in self.path else 'en'
        url = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=' + lang
        try:
            d = json.loads(dg(url, audio, ctype.split(';')[0], key))
            alt = d['results']['channels'][0]['alternatives'][0]
            return self.reply(200, {'transcript': alt.get('transcript', ''), 'confidence': round(alt.get('confidence', 0), 3), 'lang': lang})
        except urllib.error.HTTPError as e:
            sys.stderr.write('deepgram stt %s: %s\n' % (e.code, e.read()[:200]))
            return self.reply(502, {'error': 'deepgram', 'status': e.code})
        except Exception as e:
            sys.stderr.write('deepgram stt error: %r\n' % e)
            return self.reply(502, {'error': 'unreachable'})

    def tts(self):
        key = dg_key()
        if not key:
            return self.reply(503, {'error': 'no_key'})
        inp, err = self.json_body(8192)
        if err:
            return self.reply(err[0], {'error': err[1]})
        text = str(inp.get('text', '')).strip()[:1500] if isinstance(inp, dict) else ''
        if not text:
            return self.reply(400, {'error': 'empty'})
        os.makedirs(TTS_CACHE, exist_ok=True)
        path = os.path.join(TTS_CACHE, hashlib.sha1((DG_VOICE + text).encode()).hexdigest() + '.mp3')
        if not os.path.exists(path):
            if not rate_ok():
                return self.reply(429, {'error': 'rate'})
            try:
                data = dg('https://api.deepgram.com/v1/speak?model=%s&encoding=mp3' % DG_VOICE,
                          json.dumps({'text': text}).encode(), 'application/json', key, 60)
            except Exception as e:
                sys.stderr.write('deepgram tts error: %r\n' % e)
                return self.reply(502, {'error': 'deepgram'})
            fd, tmp = tempfile.mkstemp(dir=TTS_CACHE, suffix='.part')
            with os.fdopen(fd, 'wb') as f:
                f.write(data)
            os.replace(tmp, path)
            prune_tts_cache()
        data = open(path, 'rb').read()
        self.send_response(200)
        self.cors()
        self.send_header('Content-Type', 'audio/mpeg')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'private, max-age=86400')
        self.end_headers()
        self.wfile.write(data)


    # ---------------------------------------------------------------- accounts, email, donations
    def redirect(self, page):
        self.send_response(302)
        self.send_header('Location', page)
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def bearer(self):
        a = self.headers.get('Authorization', '')
        return a[7:].strip() if a.startswith('Bearer ') else ''

    def user(self):
        tok = self.bearer()
        return accounts.session_user(tok) if tok else None

    def account(self, route):
        inp, err = self.json_body(4096)
        if err:
            return self.reply(err[0], {'error': err[1]})
        if not isinstance(inp, dict):
            return self.reply(400, {'error': 'bad request'})
        if not rate_ok():
            return self.reply(429, {'error': 'rate'})
        base = accounts.public_url(PORT)
        if route == '/api/auth/signup':
            code, out = accounts.signup(inp, base)
        elif route == '/api/auth/login':
            code, out = accounts.login(inp)
        elif route == '/api/auth/logout':
            code, out = accounts.logout(self.bearer())
        elif route == '/api/auth/forgot':
            code, out = accounts.forgot(inp, base)
        elif route == '/api/auth/reset':
            code, out = accounts.reset(inp)
        elif route == '/api/auth/resend':
            u = self.user()
            code, out = accounts.resend_verification(u['id'], base) if u else (401, {'error': 'auth'})
        elif route == '/api/donate/start':
            code, out = accounts.donate_start(inp, base, self.user())
        else:
            return self.send_error(404)
        return self.reply(code, out)

    # ---------------------------------------------------------------- live references (Exa)
    def refs(self):
        key = exa_key()
        if not key:
            return self.reply(503, {'error': 'no_key'})
        inp, err = self.json_body(2048)
        if err:
            return self.reply(err[0], {'error': err[1]})
        if not isinstance(inp, dict):
            return self.reply(400, {'error': 'bad request'})
        clip = lambda v: re.sub(r'[^\w\s/-]', ' ', str(v or ''))[:120]
        level = clip(inp.get('level')) or 'beginner'
        q = 'Baduanjin qigong for %s practitioners %s %s easier variations safety' % (level, clip(inp.get('goals')), clip(inp.get('adapt')))
        if not rate_ok():
            return self.reply(429, {'error': 'rate'})
        try:
            d = exa_content.search(' '.join(q.split()), 'practical guidance for this learner', key, n=8)
        except Exception as e:
            sys.stderr.write('exa error: %r\n' % e)
            return self.reply(502, {'error': 'exa'})
        out = [exa_content.clean(r) for r in d.get('results', []) if r.get('title') and not exa_content.SKIP_URLS.search(r['url'])][:5]
        return self.reply(200, {'results': out})


if __name__ == '__main__':
    library()
    print('Serving %s on http://localhost:%d/web/  (Ask: %s, key %s; voice: Deepgram key %s)' % (
        ROOT, PORT, MODEL, 'found' if api_key() else 'MISSING: set TYPESAFE_API_KEY or ' + KEY_FILE,
        'found' if dg_key() else 'MISSING: set DEEPGRAM_API_KEY or ' + DG_KEY_FILE))
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
