# Evolution Lab v0.4.0 video design system

## Brand system

- Canvas: 1920×1080, 30fps, 16:9.
- Primary ink: `#24332C`; decision green: `#2F684B`; soft mint: `#EAF2EC`; warm paper: `#F8F6F1`; line: `#D8E2DC`; caution: `#9A602D`.
- Typeface: Microsoft YaHei / PingFang SC / Noto Sans CJK / sans-serif.
- Headline: 72–92px, 800 weight, no more than three lines.
- Body: 30–38px, 1.45 line-height. Labels: 18–22px uppercase or compact Chinese.
- Screenshots are real captures of the public fixed demo. They remain inside framed browser cards; no invented product UI.

## Motion system

- Calm enterprise pacing. Scene entrance 0.6–0.9s; crossfade exit 0.5–0.7s.
- Screenshot movement is limited to 1.00–1.06 scale over a full scene.
- Text enters with 24–36px vertical translation and opacity; no spring, bounce, neon, particles or random motion.
- Timeline is deterministic, paused and registered as `window.__timelines`.
- Hard captions stay in the bottom safe zone, 32px, with high contrast and no more than two lines.

## Composition structure

- 180s: 12 scenes covering decision problem, public/local boundary, Evidence, AIProposal, scenario universe, Validation, deterministic Gate, human Decision, engineering proof, trial boundary and close.
- 60s: 8 scenes containing the same truth boundary in compressed form.
- Audio: locally generated low-volume ambient bed. Chinese TTS was attempted with the only bundled Mandarin voice, but the local phonemizer lacked `zh`; final deliverables use hard captions and no synthetic narration.
- No network fetch, iframe, real Provider response, customer material or private database appears in a composition.
