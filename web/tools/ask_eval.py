#!/usr/bin/env python3
"""Check the Ask chat end to end against a running ask_server.py (live TypeSafe calls).

    python3 web/tools/ask_eval.py            # prints one line per case and a pass count

Each case lists the acceptable answer ids (any of them in the top 1 passes), or a flag that must
fire: 'none' (covered < 0.3 or off topic), 'urgent' (urgent > 0.5).
"""
import json, sys, urllib.request

URL = 'http://127.0.0.1:8765/api/ask'
CASES = [
  ('What are the benefits of Baduanjin?', 0, None, ['b-overview']),
  ('八段锦有什么好处', 0, None, ['b-overview']),
  ('I have bad knees, can I still do this?', 0, None, ['mod-knees']),
  ('膝盖疼可以练吗', 0, None, ['mod-knees']),
  ('Can I do it in a wheelchair?', 0, None, ['mod-seated']),
  ('我有高血压，要注意什么', 0, None, ['mod-bp-heart']),
  ('I am 5 months pregnant', 0, None, ['mod-pregnancy']),
  ('How should I breathe?', 0, None, ['k-breathing']),
  ('能饭后马上练吗', 0, None, ['k-when']),
  ('Will this help me lose belly fat?', 0, None, ['b-weight']),
  ('How long before I see results?', 0, None, ['b-timeline']),
  ('I can not reach my toes', 0, None, ['mod-toes', 'm6-adapt']),
  ('What is this move good for?', 3, None, ['m3-benefit']),
  ('这一式怎么简化？', 5, None, ['m5-adapt']),
  ('common mistakes in drawing the bow', 0, None, ['m2-technique']),
  ('Is there real science behind it?', 0, None, ['b-evidence']),
  ('What does heart fire mean?', 0, None, ['b-names', 'm5-benefit']),
  ('What about doing it sitting down?', 0, [{'q': 'I have bad knees', 'id': 'mod-knees'}], ['mod-seated']),
  ('I only have 5 minutes in the morning', 0, None, ['mod-short']),
  ('How is it different from tai chi?', 0, None, ['k-vs-taichi']),
  ('What is the capital of France?', 0, None, 'none'),
  ('Recommend a good sushi restaurant', 0, None, 'none'),
  ('I have chest pain right now after practising', 0, None, 'urgent'),
  ('练完突然胸口很痛，喘不上气', 0, None, 'urgent'),
  ('What is the capital of France?', 0, [{'q': '练完突然胸口很痛', 'id': 'k-stop'}], 'none'),
  ('How should I breathe?', 0, [{'q': 'I have chest pain right now', 'id': 'k-stop'}], ['k-breathing']),
  ('and for my back?', 0, [{'q': 'I have bad knees', 'id': 'mod-knees'}], ['mod-back']),
  ('My muscles are a bit sore the next day, is that normal?', 0, None, ['k-pain']),
]


def ask(q, move, history):
    body = json.dumps({'q': q, 'lang': 'en', 'move': move, 'history': history or []}).encode()
    req = urllib.request.Request(URL, data=body, headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req, timeout=40).read())


ok = 0
for q, move, hist, want in CASES:
    r = ask(q, move, hist)
    top = r['top'][0]
    calm = r['urgent'] <= 0.5          # only the urgent cases may raise the safety flag
    if want == 'none':
        good = (r['covered'] < 0.3 or r['on_topic'] < 0.3) and calm
    elif want == 'urgent':
        good = r['urgent'] > 0.5
    else:
        good = top['id'] in want and calm
    ok += good
    print('%s %-52s top=%-14s p=%.2f cov=%.2f urg=%.2f topic=%.2f %dms' % (
        'PASS' if good else 'FAIL', q[:52], top['id'], top['p'], r['covered'], r['urgent'], r['on_topic'], r['ms']))
print('%d / %d passed' % (ok, len(CASES)))
sys.exit(0 if ok == len(CASES) else 1)
