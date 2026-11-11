# 锦影 · Brocade Mirror — learn Baduanjin (web)

The web app lives in [`web/`](web/README.md): Brocade Mirror (`web/baduanjin-v2.html`), the classic Baduanjin
page (`web/index.html`) and Cloud Hands / Tai Chi (`web/taichi.html`). Plain HTML/JS, no build step.

```sh
sh web/serve.sh        # then open http://localhost:8765/web/baduanjin-v2.html
```

Features (Brocade Mirror): Ask chat (TypeSafe), voiceover and voice commands (Deepgram), AI instructor you
can talk to mid-workout (Vapi), learning path with reputable sources (Exa), email accounts and emails
(Resend), donations (Stripe, test mode without a key), PostHog analytics. Details in `web/README.md`.

**Secret keys are not in this repo.** The local helper reads them from `~/.config/brocade-mirror/`
(`typesafe.key`, `deepgram.key`, `exa.key`, `resend.key`, optional `stripe.key`).

**Media not included:** the pages also load background music (`../music/`), the classic page's instructor
clips (`../assets/`), art images (`../Baduanjin/Resources/`) and avatar videos (`../me_video/`) from folders
next to `web/`, which are not published here, so those won't play in a fresh clone.
