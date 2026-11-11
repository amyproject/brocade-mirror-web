#!/usr/bin/env python3
"""Build one self-contained HTML file with everything inside: code, styles, content,
images, all videos and all music.

    python3 web/tools/build-standalone.py          # from baduanjin_app/
    -> baduanjin_app/Baduanjin-standalone.html
    python3 web/tools/build-standalone.py taichi   # Cloud Hands, videos from ../me_video
    -> baduanjin_app/TaiChi-standalone.html
    python3 web/tools/build-standalone.py v2       # Brocade Mirror, videos from ../me_video (qipao 2)
    -> baduanjin_app/BrocadeMirror-standalone.html

Images are inlined as data URIs. Each video / music file is stored as base64 in its own
<script type="application/octet-stream"> block and decoded into a Blob URL the first time
the app asks for it (then the base64 text is dropped to free memory). Blob URLs count as
same-origin, so the WebGL background key works in every browser, even from file://.
"""
import base64
import json
import os
import re
import sys

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT = os.path.dirname(WEB)

MIME = {".mp4": "video/mp4", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".png": "image/png"}

# app.js prefixes (relative to web/) -> folders on disk; small images are inlined, media is lazy.
SHARED = {
    "../music/tracks/": ("music/tracks", "big"),
    "../Baduanjin/Resources/Backgrounds/": ("Baduanjin/Resources/Backgrounds", "img"),
    "../Baduanjin/Resources/Art/": ("Baduanjin/Resources/Art", "img"),
    "../Baduanjin/Resources/Thumbs/": ("Baduanjin/Resources/Thumbs", "img"),
    "../music/pictures/": ("music/pictures", "img"),
    "content/avatars/": ("web/content/avatars", "img"),
}
SITES = {
    "baduanjin": {
        "html": "index.html", "data": "data.js", "out": "Baduanjin-standalone.html",
        "prefixes": {"../assets/": ("assets", "big"), **SHARED},
    },
    "taichi": {
        "html": "taichi.html", "data": "data-taichi.js", "out": "TaiChi-standalone.html",
        "prefixes": {"../../me_video/taichi-red-uniform/": ("../me_video/taichi-red-uniform", "big", True),
                     "../../me_video/taichi-qipao/": ("../me_video/taichi-qipao", "big", True),
                     "content/taichi/thumbs/": ("web/content/taichi/thumbs", "img"), **SHARED},
    },
    "v2": {
        "html": "baduanjin-v2.html", "data": "data-v2.js", "out": "BrocadeMirror-standalone.html",
        "prefixes": {"../../me_video/baduanjin-qipao 2/": ("../me_video/baduanjin-qipao 2", "big", True),
                     "content/v2/": ("web/content/v2", "big"),
                     "content/v2/thumbs/": ("web/content/v2/thumbs", "img"),
                     "content/voice/en/": ("web/content/voice/en", "big"), **SHARED},
        "skip": r"full-uniform-|thumb_uniform_|v2_uniform",  # retired red-uniform set
    },
}
SKIP = {"grid-4angles.mp4"}  # pre-rendered grids; the app syncs the 4 angle clips itself


def read(rel):
    with open(os.path.join(WEB, rel), encoding="utf-8") as f:
        return f.read()


def patch_app(js):
    """Route every media URL through U() (the embedded-file resolver)."""
    swaps = [
        ("return PATH.video + videoFile(angle) + '.mp4';", "return U(PATH.video + videoFile(angle) + '.mp4');"),
        ("return fr.src + fullSuffix(fr, angle) + '.mp4';", "return U(fr.src + fullSuffix(fr, angle) + '.mp4');"),
        ("return o.avatar || thumbSrc(", "return (o.avatar && U(o.avatar)) || thumbSrc("),
        ("return PATH.thumb + 'thumb_' + thumbKey(outfit) + '_' + id + '.jpg';",
         "return U(PATH.thumb + 'thumb_' + thumbKey(outfit) + '_' + id + '.jpg');"),
        ("PATH.bg + b.file", "U(PATH.bg + b.file)"),
        ("PATH.pic + ins.picture", "U(PATH.pic + ins.picture)"),
        ("PATH.art + ins.icon", "U(PATH.art + ins.icon)"),
        ("PATH.track + tr.file", "U(PATH.track + tr.file)"),
    ]
    for old, new in swaps:
        if old not in js:
            sys.exit(f"app.js changed; cannot find: {old}")
        js = js.replace(old, new)
    leftover = [m.group(0) for m in re.finditer(r"(?<!U\()PATH\.\w+ \+", js)]
    if leftover:
        sys.exit(f"unwrapped PATH uses remain: {leftover}")
    return js


def files(d, recursive):
    """Media files in d (and its subfolders if recursive), as paths relative to d."""
    for base, dirs, names in os.walk(d):
        dirs[:] = sorted(dirs) if recursive else []
        for name in sorted(names):
            if os.path.splitext(name)[1].lower() in MIME and name not in SKIP:
                yield os.path.relpath(os.path.join(base, name), d)


def main():
    site = SITES[sys.argv[1] if len(sys.argv) > 1 else "baduanjin"]
    out = os.path.join(ROOT, site["out"])
    html = read(site["html"])
    css = read("css/style.css")

    images, big_blocks, big_map = {}, [], {}
    total = 0
    for prefix, (folder, kind, *rec) in site["prefixes"].items():
        d = os.path.normpath(os.path.join(ROOT, folder))
        for name in files(d, bool(rec and rec[0])):
            if site.get("skip") and re.search(site["skip"], name):
                continue
            ext = os.path.splitext(name)[1].lower()
            with open(os.path.join(d, name), "rb") as f:
                raw = f.read()
            total += len(raw)
            b64 = base64.b64encode(raw).decode("ascii")
            key = prefix + name
            if kind == "img":
                images[key] = f"data:{MIME[ext]};base64,{b64}"
            else:
                bid = f"bdjf{len(big_blocks)}"
                big_map[key] = [bid, MIME[ext]]
                big_blocks.append(f'<script type="application/octet-stream" id="{bid}">{b64}</script>')

    resolver = """
(function () {
  var IMG = %s, BIG = %s, CACHE = {};
  // Resolve an app-relative media path to an embedded data/blob URL.
  window.U = function (p) {
    if (CACHE[p]) return CACHE[p];
    if (IMG[p]) return IMG[p];
    var e = BIG[p];
    if (!e) return p;
    var el = document.getElementById(e[0]);
    var bin = atob(el.textContent), n = bin.length, bytes = new Uint8Array(n);
    for (var i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
    el.textContent = '';
    return (CACHE[p] = URL.createObjectURL(new Blob([bytes], { type: e[1] })));
  };
})();
""" % (json.dumps(images), json.dumps(big_map))

    def sub_once(pattern, repl, text):
        new, n = re.subn(pattern, lambda _m: repl, text, count=1)
        if n != 1:
            sys.exit(f"index.html changed; cannot find {pattern}")
        return new

    html = sub_once(r'<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}\n</style>", html)
    # Every <script src> is inlined in order (app.js gets its media URLs routed through U());
    # the media blocks and the resolver go in front of the first one.
    srcs = re.findall(r'<script src="([^"]+)"></script>', html)
    if not srcs or srcs[0] != site["data"]:
        sys.exit("expected the page's first script to be " + site["data"])
    def inline(m):
        name = m.group(1)
        code = patch_app(read(name)) if name == "js/app.js" else read(name)
        code = code.replace("</script", "<\\/script")
        head = ("\n".join(big_blocks) + f"\n<script>\n{resolver}\n</script>\n") if name == srcs[0] else ""
        return f"{head}<script>\n{code}\n</script>"
    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    if re.search(r'<script src=|<link rel="stylesheet" href=', html):
        sys.exit("an external script/stylesheet reference remains")

    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {out}: {os.path.getsize(out) / 1e6:.0f} MB "
          f"({len(images)} images, {len(big_blocks)} videos/tracks, {total / 1e6:.0f} MB of media)")


if __name__ == "__main__":
    main()
