"""Email accounts, transactional email (Resend) and donations for the local helper (ask_server.py).

Accounts: email + password (scrypt). Sign-up sends a verification link; verifying sends the welcome
email; "forgot password" sends a one-hour reset link. Tokens are random and only their SHA-256 is
stored. Data lives in ~/.local/share/brocade-mirror/ (never inside baduanjin_app/).

Email: Resend (https://resend.com). Key: $RESEND_API_KEY or ~/.config/brocade-mirror/resend.key.
Sender: $RESEND_FROM (default "Brocade Mirror <onboarding@resend.dev>"). Until a domain is verified in
Resend, its shared sender only delivers to the Resend account's own address; other recipients fail,
and the helper then prints the link in its terminal so you can still test. $RESEND_TEST_TO sends every
email to one inbox instead (e.g. delivered@resend.dev, Resend's test address).

Donations: Stripe Checkout when $STRIPE_SECRET_KEY (or ~/.config/brocade-mirror/stripe.key) is set;
otherwise TEST MODE: the donation is recorded as a test and a receipt marked TEST is sent; no money moves.
Links in emails use $PUBLIC_URL (default http://localhost:8765), so they only open on this computer
until the helper is hosted.
"""
import hashlib, hmac, html, json, os, re, secrets, sys, threading, time, urllib.error, urllib.parse, urllib.request

DATA = os.environ.get('BDJ_DATA_DIR') or os.path.expanduser('~/.local/share/brocade-mirror')  # BDJ_DATA_DIR: tests
CONF = os.path.expanduser('~/.config/brocade-mirror')
_lock = threading.Lock()
EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,255}\.[A-Za-z]{2,}$')
PAGE = '/web/baduanjin-v2.html'


def _key(env, name):
    k = os.environ.get(env, '').strip()
    p = os.path.join(CONF, name)
    if not k and os.path.exists(p):
        k = open(p, encoding='utf-8').read().strip()
    return k


def public_url(port):
    return os.environ.get('PUBLIC_URL', 'http://localhost:%d' % port).rstrip('/')


# ------------------------------------------------------------------ storage
def _load(name):
    p = os.path.join(DATA, name)
    try:
        return json.load(open(p, encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def _save(name, obj):
    os.makedirs(DATA, mode=0o700, exist_ok=True)
    p = os.path.join(DATA, name)
    tmp = p + '.%d.tmp' % os.getpid()
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.chmod(tmp, 0o600)
    os.replace(tmp, p)


def _h(token):
    return hashlib.sha256(token.encode()).hexdigest()


def hash_pw(pw):
    salt = os.urandom(16)
    d = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return 'scrypt$%s$%s' % (salt.hex(), d.hex())


def check_pw(pw, stored):
    try:
        _, salt, d = stored.split('$')
        got = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=2 ** 14, r=8, p=1, dklen=32)
        return hmac.compare_digest(got.hex(), d)
    except Exception:
        return False


def public_user(u):
    return {'id': u['id'], 'email': u['email'], 'name': u.get('name', ''), 'verified': bool(u.get('verified')), 'lang': u.get('lang', 'en')}


# ------------------------------------------------------------------ email (Resend)
def _wrap(lang, title, body_html, button=None, foot=''):
    btn = ''
    if button:
        btn = ('<p style="margin:26px 0"><a href="%s" style="display:inline-block;background:#B7362B;color:#FBF1E6;text-decoration:none;'
               'padding:12px 22px;border-radius:999px;font:600 15px -apple-system,Segoe UI,sans-serif">%s</a></p>'
               '<p style="font-size:12px;color:#887E73;word-break:break-all">%s %s</p>') % (
            html.escape(button[0]), html.escape(button[1]), '如果按钮无法打开，请复制此链接：' if lang == 'zh' else 'If the button doesn’t work, copy this link:', html.escape(button[0]))
    return ('<!doctype html><html><body style="margin:0;background:#F5F0E6;padding:28px 12px">'
            '<div style="max-width:520px;margin:0 auto;background:#FBF8F2;border:1px solid rgba(30,26,22,.11);border-radius:18px;padding:30px 28px;'
            'font:15px/1.65 -apple-system,Segoe UI,PingFang SC,sans-serif;color:#1E1A16">'
            '<div style="display:inline-block;background:#B7362B;color:#FBF1E6;font:600 15px Songti SC,serif;padding:6px 7px;border-radius:5px;letter-spacing:2px">锦影</div>'
            '<h1 style="font:600 22px/1.3 Songti SC,Georgia,serif;margin:18px 0 10px">%s</h1>%s%s'
            '<p style="font-size:12px;color:#887E73;margin-top:28px;border-top:1px solid rgba(30,26,22,.11);padding-top:14px">%s</p>'
            '</div></body></html>') % (html.escape(title), body_html, btn, foot or ('锦影 · 八段锦，跟着自己的身影学' if lang == 'zh' else 'Brocade Mirror · Baduanjin, learned from your own avatar'))


def render(kind, lang, d):
    zh = lang == 'zh'
    name = html.escape(d.get('name') or ('练习者' if zh else 'there'))
    if kind == 'verify':
        subj = '请验证你的邮箱 · 锦影' if zh else 'Verify your email for Brocade Mirror'
        body = ('<p>%s，你好！</p><p>点击下方按钮验证邮箱，完成注册。链接 24 小时内有效。</p>' % name) if zh else \
               ('<p>Hi %s,</p><p>Confirm your email to finish creating your Brocade Mirror account. The link works for 24 hours.</p>' % name)
        return subj, _wrap(lang, subj, body, (d['link'], '验证邮箱' if zh else 'Verify email'),
                           '如果不是你本人注册，请忽略这封邮件。' if zh else 'If you didn’t sign up, you can ignore this email.')
    if kind == 'welcome':
        subj = '欢迎来到锦影 · 八段锦' if zh else 'Welcome to Brocade Mirror'
        body = ('<p>%s，欢迎！你的账号已经验证。</p><p>开始的小建议：</p><ul><li>每次学一式，速度调到 0.5–0.75×，打开“镜像”和“解说”。</li>'
                '<li>每天 10 分钟胜过周末一小时。</li><li>有问题就点“问一问”，或者打开“语音”和 AI 老师对话。</li></ul>' % name) if zh else \
               ('<p>Welcome, %s! Your account is verified.</p><p>A few tips to start:</p><ul><li>Learn one move at a time at 0.5–0.75×, with Mirror and Voiceover on.</li>'
                '<li>Ten minutes a day beats an hour at the weekend.</li><li>Questions? Tap Ask, or open Voice to talk with the AI instructor.</li></ul>' % name)
        return subj, _wrap(lang, subj, body, (d['link'], '开始练习' if zh else 'Start practising'))
    if kind == 'reset':
        subj = '重置你的密码 · 锦影' if zh else 'Reset your Brocade Mirror password'
        body = ('<p>%s，你好！</p><p>我们收到了重置密码的请求。点击下方按钮设置新密码，链接 1 小时内有效。</p>' % name) if zh else \
               ('<p>Hi %s,</p><p>We received a request to reset your password. Choose a new one with the button below; the link works for 1 hour.</p>' % name)
        return subj, _wrap(lang, subj, body, (d['link'], '设置新密码' if zh else 'Choose a new password'),
                           '如果不是你本人操作，请忽略这封邮件，密码不会改变。' if zh else 'If you didn’t ask for this, ignore this email; your password won’t change.')
    if kind == 'receipt':
        test = d.get('mode') == 'test'
        amt = '%s %.2f' % (d['currency'].upper(), d['amount_cents'] / 100)
        subj = (('[测试] ' if zh else '[TEST] ') if test else '') + ('捐赠收据 · 锦影' if zh else 'Your donation receipt · Brocade Mirror')
        rows = [('收据编号' if zh else 'Receipt', d['id']), ('日期' if zh else 'Date', d['date']), ('金额' if zh else 'Amount', amt),
                ('付款方式' if zh else 'Payment', ('测试模式（未扣款）' if zh else 'Test mode (no charge)') if test else 'Stripe')]
        table = '<table style="width:100%;border-collapse:collapse;margin:14px 0">' + ''.join(
            '<tr><td style="padding:7px 0;color:#887E73;border-bottom:1px solid rgba(30,26,22,.08)">%s</td><td style="padding:7px 0;text-align:right;border-bottom:1px solid rgba(30,26,22,.08)">%s</td></tr>'
            % (html.escape(k), html.escape(str(v))) for k, v in rows) + '</table>'
        body = (('<p>%s，谢谢你的支持！</p>' % name) if zh else ('<p>Thank you, %s!</p>' % name)) + table + (
            ('<p style="color:#B7362B"><b>这是测试收据：没有发生真实付款。</b></p>' if zh else '<p style="color:#B7362B"><b>This is a test receipt: no real payment was made.</b></p>') if test else
            ('<p>请保留这封邮件作为付款记录。</p>' if zh else '<p>Please keep this email for your records.</p>'))
        if d.get('message'):
            body += '<p style="color:#4A433B;font-style:italic">“%s”</p>' % html.escape(d['message'])
        return subj, _wrap(lang, subj, body)
    raise ValueError(kind)


def _text(html_s):
    s = re.sub(r'<(br|/p|/li|/tr|/h1)[^>]*>', '\n', html_s)
    s = re.sub(r'<li[^>]*>', '• ', s)
    s = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>([^<]*)</a>', r'\2: \1', s)
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    return re.sub(r'\n\s*\n+', '\n\n', s).strip()


def send_email(kind, to, lang, data):
    """Returns (ok, detail). Never raises."""
    key = _key('RESEND_API_KEY', 'resend.key')
    subj, body = render(kind, lang, data)
    if not key:
        return False, 'no_key'
    rcpt = os.environ.get('RESEND_TEST_TO') or to
    if os.environ.get('BDJ_LOG_LINKS') and data.get('link'):  # tests: print the link the email carries
        sys.stderr.write('[link] %s %s\n' % (kind, data['link']))
    payload = {'from': os.environ.get('RESEND_FROM', 'Brocade Mirror <onboarding@resend.dev>'), 'to': [rcpt], 'subject': subj,
               'html': body, 'text': _text(body), 'tags': [{'name': 'kind', 'value': kind}]}
    req = urllib.request.Request('https://api.resend.com/emails', data=json.dumps(payload).encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'brocade-mirror/1'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return True, json.loads(r.read()).get('id')
    except urllib.error.HTTPError as e:
        detail = e.read()[:300].decode('utf-8', 'replace')
        sys.stderr.write('resend %s (%s to %s): %s\n' % (e.code, kind, rcpt, detail))
        if data.get('link'):  # local testing without a verified domain
            sys.stderr.write('  -> link for %s: %s\n' % (rcpt, data['link']))
        return False, 'resend_%d' % e.code
    except Exception as e:
        sys.stderr.write('resend error: %r\n' % e)
        return False, 'unreachable'


# ------------------------------------------------------------------ accounts
VERIFY_TTL, RESET_TTL, SESSION_TTL = 24 * 3600, 3600, 30 * 24 * 3600


def _token(db, kind, uid, ttl):
    tok = secrets.token_urlsafe(32)
    db.setdefault('tokens', {})[_h(tok)] = {'kind': kind, 'uid': uid, 'exp': time.time() + ttl}
    return tok


def _take(db, kind, tok, consume=True):
    rec = db.get('tokens', {}).get(_h(tok or ''))
    if not rec or rec['kind'] != kind or rec['exp'] < time.time():
        return None
    if consume:
        del db['tokens'][_h(tok)]
    return rec['uid']


def _gc(db):
    now = time.time()
    db['tokens'] = {k: v for k, v in db.get('tokens', {}).items() if v['exp'] > now}


def _by_email(db, email):
    return next((u for u in db.get('users', {}).values() if u['email'] == email), None)


def signup(inp, base):
    email = str(inp.get('email', '')).strip().lower()
    pw, name, lang = str(inp.get('password', '')), str(inp.get('name', '')).strip()[:60], 'zh' if inp.get('lang') == 'zh' else 'en'
    if not EMAIL_RE.match(email):
        return 400, {'error': 'email'}
    if len(pw) < 8 or len(pw) > 200:
        return 400, {'error': 'password'}
    with _lock:
        db = _load('accounts.json'); _gc(db)
        if _by_email(db, email):
            return 409, {'error': 'exists'}
        uid = 'u_' + secrets.token_hex(8)
        db.setdefault('users', {})[uid] = {'id': uid, 'email': email, 'name': name, 'lang': lang, 'pw': hash_pw(pw), 'verified': False, 'created': int(time.time())}
        vt = _token(db, 'verify', uid, VERIFY_TTL)
        st = _token(db, 'session', uid, SESSION_TTL)
        _save('accounts.json', db)
        user = public_user(db['users'][uid])
    ok, detail = send_email('verify', email, lang, {'name': name, 'link': '%s/api/auth/verify?token=%s' % (base, vt)})
    return 200, {'user': user, 'token': st, 'emailSent': ok, 'emailDetail': None if ok else detail}


def resend_verification(uid, base):
    with _lock:
        db = _load('accounts.json'); _gc(db)
        u = db.get('users', {}).get(uid)
        if not u:
            return 401, {'error': 'auth'}
        if u.get('verified'):
            return 200, {'already': True}
        vt = _token(db, 'verify', uid, VERIFY_TTL)
        _save('accounts.json', db)
    ok, detail = send_email('verify', u['email'], u.get('lang', 'en'), {'name': u.get('name'), 'link': '%s/api/auth/verify?token=%s' % (base, vt)})
    return 200, {'emailSent': ok, 'emailDetail': None if ok else detail}


def verify(tok, base):
    """Returns the page to redirect to."""
    with _lock:
        db = _load('accounts.json'); _gc(db)
        uid = _take(db, 'verify', tok)
        if not uid or uid not in db.get('users', {}):
            _save('accounts.json', db)
            return PAGE + '?verified=expired'
        u = db['users'][uid]
        first = not u.get('verified')
        u['verified'] = True
        _save('accounts.json', db)
    if first:
        send_email('welcome', u['email'], u.get('lang', 'en'), {'name': u.get('name'), 'link': base + PAGE})
    return PAGE + '?verified=1'


def login(inp):
    email = str(inp.get('email', '')).strip().lower()
    pw = str(inp.get('password', ''))
    with _lock:
        db = _load('accounts.json'); _gc(db)
        u = _by_email(db, email)
        if not u or not check_pw(pw, u['pw']):
            return 401, {'error': 'credentials'}
        st = _token(db, 'session', u['id'], SESSION_TTL)
        _save('accounts.json', db)
        return 200, {'user': public_user(u), 'token': st}


def session_user(tok):
    with _lock:
        db = _load('accounts.json')
        uid = _take(db, 'session', tok, consume=False)
        u = uid and db.get('users', {}).get(uid)
        return u or None


def logout(tok):
    with _lock:
        db = _load('accounts.json')
        db.get('tokens', {}).pop(_h(tok or ''), None)
        _save('accounts.json', db)
    return 200, {'ok': True}


def forgot(inp, base):
    email = str(inp.get('email', '')).strip().lower()
    with _lock:
        db = _load('accounts.json'); _gc(db)
        u = _by_email(db, email) if EMAIL_RE.match(email) else None
        if u:
            rt = _token(db, 'reset', u['id'], RESET_TTL)
            _save('accounts.json', db)
    if u:
        send_email('reset', u['email'], u.get('lang', 'en'), {'name': u.get('name'), 'link': '%s%s?reset=%s' % (base, PAGE, rt)})
    return 200, {'ok': True}  # same answer either way: don't reveal who has an account


def reset(inp):
    pw = str(inp.get('password', ''))
    if len(pw) < 8 or len(pw) > 200:
        return 400, {'error': 'password'}
    with _lock:
        db = _load('accounts.json'); _gc(db)
        uid = _take(db, 'reset', str(inp.get('token', '')))
        if not uid or uid not in db.get('users', {}):
            _save('accounts.json', db)
            return 400, {'error': 'token'}
        u = db['users'][uid]
        u['pw'] = hash_pw(pw)
        u['verified'] = True  # they proved they own the inbox
        db['tokens'] = {k: v for k, v in db['tokens'].items() if not (v['uid'] == uid and v['kind'] == 'session')}  # sign out everywhere
        st = _token(db, 'session', uid, SESSION_TTL)
        _save('accounts.json', db)
        return 200, {'user': public_user(u), 'token': st}


# ------------------------------------------------------------------ donations
def stripe_key():
    return _key('STRIPE_SECRET_KEY', 'stripe.key')


def donation_mode():
    return 'stripe' if stripe_key() else 'test'


def _stripe(method, path, form=None):
    data = urllib.parse.urlencode(form).encode() if form else None
    req = urllib.request.Request('https://api.stripe.com/v1/' + path, data=data, method=method,
                                 headers={'Authorization': 'Bearer ' + stripe_key(), 'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def _record(rec):
    with _lock:
        db = _load('donations.json')
        db.setdefault('donations', {})[rec['id']] = rec
        _save('donations.json', db)


def donate_start(inp, base, user):
    try:
        cents = int(round(float(inp.get('amount', 0)) * 100))
    except (TypeError, ValueError):
        return 400, {'error': 'amount'}
    if cents < 100 or cents > 100000:
        return 400, {'error': 'amount'}
    currency = 'usd'
    email = str(inp.get('email') or (user and user['email']) or '').strip().lower()
    name = str(inp.get('name') or (user and user.get('name')) or '').strip()[:60]
    msg = str(inp.get('message', '')).strip()[:300]
    lang = 'zh' if inp.get('lang') == 'zh' else 'en'
    if email and not EMAIL_RE.match(email):
        return 400, {'error': 'email'}
    did = 'BM-' + time.strftime('%Y%m%d') + '-' + secrets.token_hex(3).upper()
    rec = {'id': did, 'amount_cents': cents, 'currency': currency, 'email': email, 'name': name, 'message': msg, 'lang': lang,
           'uid': user and user['id'], 'created': int(time.time()), 'date': time.strftime('%Y-%m-%d')}
    if donation_mode() == 'stripe':
        form = {'mode': 'payment', 'submit_type': 'donate', 'line_items[0][quantity]': '1',
                'line_items[0][price_data][currency]': currency, 'line_items[0][price_data][unit_amount]': str(cents),
                'line_items[0][price_data][product_data][name]': 'Donation to Brocade Mirror' if lang == 'en' else '支持锦影',
                'success_url': base + '/api/donate/return?session_id={CHECKOUT_SESSION_ID}', 'cancel_url': base + PAGE + '?donate=cancel',
                'metadata[donation_id]': did, 'client_reference_id': did}
        if email:
            form['customer_email'] = email
        try:
            sess = _stripe('POST', 'checkout/sessions', form)
        except urllib.error.HTTPError as e:
            sys.stderr.write('stripe %s: %s\n' % (e.code, e.read()[:300]))
            return 502, {'error': 'stripe'}
        rec.update({'mode': 'stripe', 'status': 'pending', 'session': sess['id']})
        _record(rec)
        return 200, {'mode': 'stripe', 'url': sess['url'], 'id': did}
    rec.update({'mode': 'test', 'status': 'test'})
    _record(rec)
    sent = send_email('receipt', email, lang, rec)[0] if email else False
    return 200, {'mode': 'test', 'id': did, 'receiptSent': sent}


def donate_return(session_id):
    """Stripe redirect back: confirm with Stripe, mark paid, send the receipt. Returns the page to redirect to."""
    try:
        sess = _stripe('GET', 'checkout/sessions/' + urllib.parse.quote(session_id, safe=''))
    except Exception as e:
        sys.stderr.write('stripe return error: %r\n' % e)
        return PAGE + '?donate=error'
    did = (sess.get('metadata') or {}).get('donation_id') or sess.get('client_reference_id')
    with _lock:
        db = _load('donations.json')
        rec = db.get('donations', {}).get(did)
        if not rec or sess.get('payment_status') != 'paid':
            return PAGE + '?donate=unpaid'
        first = rec.get('status') != 'paid'
        rec['status'] = 'paid'
        rec['email'] = rec.get('email') or ((sess.get('customer_details') or {}).get('email') or '')
        _save('donations.json', db)
    if first and rec.get('email'):
        send_email('receipt', rec['email'], rec.get('lang', 'en'), rec)
    return PAGE + '?donated=' + urllib.parse.quote(did)
