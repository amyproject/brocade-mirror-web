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

**Hosting (Vercel or any static host):** deploy the repo root; `vercel.json` sends `/` to Brocade Mirror. The
pages load media by absolute path, so it is published here too: avatar clips (`me_video/`), background music
and credits (`music/`), art and backgrounds (`Baduanjin/Resources/`). Not included: music track 5 (no
licence for redistribution; hidden on hosted copies) and the classic page's instructor clips (`assets/`).

On a static host the AI features that need the local helper's secret keys (Ask via TypeSafe, voice commands,
live research, email accounts, donations) fall back or show that they need the helper; the offline Ask
matcher, voiceover, learning path and the Vapi AI instructor work without it.
