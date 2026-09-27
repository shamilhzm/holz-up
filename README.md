# Holz-Up

A cozy woodworking game. You plan, buy, saw and assemble real furniture in your browser, one
part at a time. The first project is an all-wood sit-stand desk that one person adjusts with
one hand. The game follows the workflow taught in the German Tischler apprenticeship:
*Informieren → Planen → Entscheiden → Durchführen → Kontrollieren → Bewerten*.

## Play

1. **Drafting table**: set your body height and shape the desk; live engineering checks tell
   you, with reasons, whether it still works.
2. **DIY store**: a shopping list in standard store sizes; type in prices, then buy the wood.
3. **Workshop**: seven assembly steps. For each one you
   - **saw** every part type on the workbench: aim the blade half a kerf onto the waste side
     (the loupe reads to 0.1 mm), then stroke left–right. Wobbly first strokes steer the cut.
     Your error travels with the part: short parts leave gaps, long ones must be planed;
   - **assemble**: drag parts from the tray onto their glowing spots, then glue and clamp;
   - **balance** the counterweights cobble by cobble until the top floats.
4. **Acceptance test**: squeeze the handle, glide, let go. Then pull the cobbles or the wax
   and feel why they matter.

The **Clipboard** holds the bill of materials, cutting plan, dimensioned drawings and a
checklist for building it for real. The **Glossary** pairs every trade term in English and
German.

## The desk

A floating top between two drawer pedestals with finger-jointed corners. The back half of
each pedestal hides a laminated column in a waxed guide and a box of granite cobbles on a
linen cord over a beech pulley (the sash-window / counterbalanced-Smith-machine principle).
Gravity pawls drop into a beech detent rack every 25 mm. No metal hardware; everything is
buyable at a local DIY store. Engineering thresholds are workshop rules of thumb, not a
certified calculation.

## Develop

```sh
npm install
npm run dev              # http://localhost:5173
npm test                 # model and game-logic unit tests
npm run e2e              # Playwright playthrough (needs Chromium)
npm run build:artifact   # single-file build for the claude.ai viewer
```

### Walkthrough video

`scripts/video` records a narrated walkthrough from the real game. Each frame is captured
with the page clock frozen, so animations stay smooth on a slow software renderer. Captions,
title cards and synthesized workshop sounds are added afterwards. The Python steps need
`numpy`, `pillow` and `imageio-ffmpeg`.

```sh
npm run build && npx vite preview --port 4175 &
node scripts/video/record.mjs video-out        # all scenes, or name some to re-record them
node scripts/video/cards.mjs video-out         # captions and cards as PNGs
python scripts/video/sound.py video-out        # soundtrack
python scripts/video/make.py video-out         # -> video-out/holz-up.mp4
```

Code map: `src/model` (parametric desk, checks, cut list, shopping list), `src/game` (cut
jobs, kerf and fit rules, build progress, sounds), `src/scene` (three.js / React Three Fiber:
room, workbench, assembly, procedural wood shader), `src/ui` (stations and HUD),
`src/content` (mentor text, real-world steps, EN/DE glossary).
