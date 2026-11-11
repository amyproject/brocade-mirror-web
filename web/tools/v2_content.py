#!/usr/bin/env python3
"""Source of the v2 Baduanjin site (web/baduanjin-v2.html): your own avatar doing the eight
Baduanjin moves in the qipao, from taichi/me_video/"baduanjin-qipao 2" (the 2026-11-08
consistent-prompt redo). Writes web/content/v2.json and web/data-v2.js.

Move text (steps, key points, mistakes, angle tips…) is shared with the main site's moves.json;
only the step times differ. They are seconds within the 10 s front clip, read off contact sheets
at 0.5 s, so treat them as ±0.5 s. The full routine exists for every angle: each angle's 8 clips
joined by tools/make_v2_media.swift (web/content/v2/full-qipao-<angle>.mp4), 10 s per move.

The red-uniform set (me_video/v2/baduanjin-uniform) was dropped on 2026-11-09: that avatar build
reads heavier than the qipao model. Its step cuts are kept below in case a slimmer re-render
comes back.

`site.journey` turns on onboarding, sign-in, reminders and the progress view (js/journey.js).
`site.auth` holds the sign-in provider config; leave a value empty and that button saves a
profile on this device only (see web/README.md, "Sign-in")."""
import copy, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
BDJ = json.load(open(os.path.join(WEB, "..", "Baduanjin", "Resources", "moves.json"), encoding="utf-8"))

SLUGS = ["01-two-hands-hold-up-the-heavens", "02-drawing-the-bow", "03-single-arm-lift", "04-looking-backward",
         "05-swaying-head-and-tail", "06-two-hands-hold-the-feet", "07-clenching-fists-and-glaring", "08-bouncing-on-the-toes"]
# step boundaries per move: [s1 end, s2 end, s3 end] (each move has 4 steps over 0–10 s)
CUTS = {
    "qipao": [[1.5, 3.5, 5], [1.5, 3.5, 7.5], [1, 3.5, 5], [1, 4.5, 6], [1, 3.5, 8], [1.5, 2.5, 6.5], [1, 3, 5], [2, 3.5, 5]],
}
RETIRED_CUTS = {  # not shipped; see docstring
    "uniform": [[2, 4.5, 6.5], [1.5, 5, 8], [1, 4.5, 6.5], [1.5, 4, 5.5], [1.5, 5, 8.5], [1, 2.5, 6.5], [1, 3.5, 5], [2, 4.5, 6.5]],
}
ALL = ["front", "left", "right", "back"]

def spans(cuts):
    b = [0] + cuts + [10]
    return [[b[i], b[i + 1]] for i in range(4)]

moves = []
for i, src in enumerate(BDJ["moves"]):
    m = copy.deepcopy(src)
    m["slug"] = SLUGS[i]
    m["angles"] = ALL
    m["quad"] = None
    m["thumbTime"] = 0
    sp = {k: spans(v[i]) for k, v in CUTS.items()}
    assert len(m["steps"]) == 4, m["nameEn"]
    for j, st in enumerate(m["steps"]):
        st["t"] = {k: sp[k][j] for k in sp}
        st["start"], st["end"] = sp["qipao"][j]
    moves.append(m)

# Onboarding content (js/journey.js). Testimonials are SAMPLE copy until real quotes are collected:
# `sample: True` makes the page label them as examples.
JOURNEY = {
  "goals": [
    {"id": "stress", "icon": "🌿", "zh": "放松减压", "en": "Relieve stress"},
    {"id": "sleep", "icon": "🌙", "zh": "睡得更好", "en": "Sleep better"},
    {"id": "flex", "icon": "🎋", "zh": "柔韧与体态", "en": "Flexibility & posture"},
    {"id": "balance", "icon": "⛰️", "zh": "平衡与腿力", "en": "Balance & leg strength"},
    {"id": "back", "icon": "🪷", "zh": "舒缓肩颈腰背", "en": "Ease neck, shoulders & back"},
    {"id": "energy", "icon": "☀️", "zh": "精神饱满", "en": "More energy"},
    {"id": "culture", "icon": "🏮", "zh": "了解传统文化", "en": "Explore the tradition"},
  ],
  "levels": [
    {"id": "new", "zh": "零基础", "en": "Brand new", "noteZh": "从没练过八段锦", "noteEn": "Never tried Baduanjin", "weeks": 4},
    {"id": "some", "zh": "学过一点", "en": "Tried it a few times", "noteZh": "记得几个动作，不太熟", "noteEn": "Know a few moves, not fluent", "weeks": 3},
    {"id": "regular", "zh": "经常练", "en": "Practise regularly", "noteZh": "能完整跟下来", "noteEn": "Can follow the whole set", "weeks": 2},
    {"id": "refine", "zh": "想精进", "en": "Refining details", "noteZh": "抠细节、呼吸和角度", "noteEn": "Polishing breath, angles and form", "weeks": 2},
  ],
  "minutes": [5, 10, 15, 20],
  "daysPerWeek": [3, 5, 7],
  "planWeeks": [2, 4, 8],
  "benefits": {
    "zh": "关于八段锦的研究综述（多为 8–24 周、每周数次的练习）报告了睡眠质量、情绪、平衡和柔韧性方面的改善。效果因人而异，它不能代替医疗。",
    "en": "Research reviews of Baduanjin (mostly 8–24 week programmes, several sessions a week) report improvements in sleep quality, mood, balance and flexibility. Results vary from person to person, and it is not a medical treatment."
  },
  "testimonials": [
    {"sample": True, "name": {"zh": "林女士 · 52 岁", "en": "Lin, 52"}, "weeks": 6, "goal": "sleep",
     "zh": "每天睡前跟着练十分钟，入睡快多了。四个角度看得很清楚，不用猜动作。",
     "en": "Ten minutes before bed, every night. I fall asleep faster now, and the four angles mean I never have to guess a move."},
    {"sample": True, "name": {"zh": "陈先生 · 38 岁", "en": "Chen, 38"}, "weeks": 4, "goal": "back",
     "zh": "久坐写代码，肩颈一直僵。放慢到 0.5 倍一步一步学，现在午休练一遍就松了。",
     "en": "I code all day and my shoulders were always stiff. Learning at 0.5× step by step, one round at lunch now loosens everything."},
    {"sample": True, "name": {"zh": "王阿姨 · 67 岁", "en": "Wang, 67"}, "weeks": 8, "goal": "balance",
     "zh": "配上古筝曲子，像在山里练功。站得比以前稳了，踮脚也不晃。",
     "en": "With the guzheng playing it feels like practising in the mountains. I stand steadier than before, even on my toes."},
  ],
}

# Sign-in providers. Empty value = that button saves a local profile instead (and says so).
#   googleClientId  OAuth 2.0 Web client ID (Google Cloud console); page must be served from an authorised https origin
#   apple           Sign in with Apple Services ID + redirect URI registered for the same domain
#   firebase        Firebase web config with Phone auth enabled (SMS code + invisible reCAPTCHA)
#   googleIOSClientId  OAuth client ID of type iOS (the iPhone app signs in through the system web sheet)
# Supabase (js/cloud.js): accounts (email, phone via Twilio, Google, Apple) + cross-device progress.
# The project URL and the PUBLISHABLE key are public by design; never put the service-role / secret key here.
SUPABASE = {"url": "https://pdiornnmqwashlrwqfiv.supabase.co", "key": "sb_publishable_dwYZhWYrJ_ZCI6muj1oDHQ_rpljeGml"}
AUTH = {"googleClientId": "344045409884-kd3as4a4nir8gcsth4rimqok4utrotu3.apps.googleusercontent.com", "googleIOSClientId": "", "apple": {"clientId": "com.amyli.baduanjin.web", "redirectURI": "https://brocade-mirror-web.vercel.app/web/baduanjin-v2.html"}, "firebase": None}

# PostHog product analytics (js/analytics.js). Project API key of "Default project" (US Cloud, id 723614):
# a public write-only key, safe in a web page. Never put a personal key (phx_…) here.
# Vapi (AI voice instructor, js/instructor.js): the PUBLIC key, made for browsers (it can only start web
# calls). Restrict it to your domains in the Vapi dashboard once the site is hosted. Never put the private key here.
VAPI = {"publicKey": "d12c2475-b611-4e2a-af06-d243f59ed5d0", "model": "claude-haiku-5-5"}

POSTHOG = {"key": "phc_udp6ouNaER4oYaYXjKgcePdUkCFkWcMW59uxWcBRk9KJ", "host": "https://us.i.posthog.com"}

chapters = [i * 10 for i in range(8)]
data = {
  "version": 1,
  "site": {
    "id": "v2", "logo": "锦影",
    "title": {"zh": "锦影 · 跟着自己学八段锦", "en": "Brocade Mirror · Learn Baduanjin"},
    "paths": {"video": "../../me_video/", "thumb": "content/v2/thumbs/"},
    "journey": True,
    "auth": AUTH,
    "supabase": SUPABASE,
    "posthog": POSTHOG,
    "vapi": VAPI,
    "strings": {
      "zh": {"appTitle": "锦影", "appSub": "八段锦 · 跟着自己的身影学", "fullTitle": "全套八段锦",
             "fullSub": "八式连贯，一遍约 1 分 20 秒", "allDoneK": "八式都学完了",
             "about": "锦影（Brocade Mirror）· 视频：你的数字形象，深红旗袍，八式每式 10 秒、四个角度；全套由每个角度的八段视频连成，四个角度都可看，一遍 80 秒。"},
      "en": {"appTitle": "Brocade Mirror", "appSub": "Baduanjin, learned from your own avatar", "fullTitle": "The complete Baduanjin",
             "fullSub": "All eight movements back to back — 80 seconds a round", "allDoneK": "You’ve studied all eight",
             "about": "Brocade Mirror (锦影). Footage: your own avatar in a deep-red qipao — 10 s per move from 4 angles. The full routine joins the eight clips for each angle, so all four angles work there too (80 s a round)."}
    }
  },
  "fullRoutine": {
    "qipao": {"src": "content/v2/full-qipao", "angles": ALL, "chapters": chapters, "duration": 80}
  },
  "moves": moves,
  "outfits": [
    {"id": "qipao", "avatar": "content/avatars/v2_qipao.png", "movesDir": "baduanjin-qipao 2/moves", "thumb": "qipao", "timed": True, "multiAngle": True,
     "zh": "旗袍", "en": "Qipao", "noteZh": "深红旗袍 · 四个角度", "noteEn": "Deep-red cheongsam · 4 camera angles"}
  ],
  "journey": JOURNEY,
  "backgrounds": BDJ["backgrounds"],
  "music": BDJ["music"],
}
out = os.path.join(WEB, "content", "v2.json")
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
with open(os.path.join(WEB, "data-v2.js"), "w", encoding="utf-8") as f:
    f.write("/* GENERATED by web/tools/v2_content.py. Do not edit by hand. */\nwindow.BDJ = ")
    json.dump(data, f, ensure_ascii=False)
    f.write(";\n")
print("wrote", out, "and data-v2.js")

# The iPhone app (Baduanjin.xcodeproj) reads the same content: Resources/brocade.json, plus the qipao
# thumbnails and the avatar cut-out (Xcode's synchronized group bundles everything under Baduanjin/).
import shutil
IOS = os.path.join(WEB, "..", "Baduanjin", "Resources")
ios = copy.deepcopy(data)
for k, fr in ios["fullRoutine"].items():  # the app looks routines up by file name in the bundle
    fr["file"] = os.path.basename(fr["src"])
json.dump(ios, open(os.path.join(IOS, "brocade.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
dst = os.path.join(IOS, "Brocade"); os.makedirs(dst, exist_ok=True)
for i in range(1, 9):
    shutil.copy2(os.path.join(WEB, "content", "v2", "thumbs", "thumb_qipao_%d.jpg" % i), dst)
shutil.copy2(os.path.join(WEB, "content", "avatars", "v2_qipao.png"), dst)
print("wrote", os.path.join(IOS, "brocade.json"), "and Resources/Brocade/")
