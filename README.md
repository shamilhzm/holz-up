# Holz-Up

A cozy carpentry companion. You design, plan and (if you like) really build an all-wood
sit-stand desk that one person can adjust with one hand. It follows the real workflow
taught in the German Tischler apprenticeship: *Informieren → Planen → Entscheiden →
Durchführen → Kontrollieren → Bewerten*.

## The desk

Two solid end panels (*Wangen*) each hide a laminated pine column and weight boxes filled
with granite cobbles on linen cords. That's the sash-window / counterbalanced-Smith-machine
principle: the top floats. Squeeze the beech handle under the front edge, glide the top,
let go, and a gravity pawl drops into a beech detent rack every 25 mm. No metal hardware;
everything is buyable at a local DIY store.

## What's in the app

1. **Brief**: body height → suggested sitting/standing heights.
2. **Design**: parametric 3D desk with live engineering checks (reach, drawer-jam friction,
   one-hand effort, ballast fit, tip-over, wobble, knee space, detent strength, pinch gap).
3. **Material & cost**: shopping list in standard store sizes with your own prices.
4. **Documents**: bill of materials, cutting plan, dimensioned drawings (printable).
5. **Build plan**: ordered steps with tools, safety notes and Lernfeld tags.
6. **Acceptance test**: squeeze-glide-release, then try it without ballast or wax.

The engineering thresholds are workshop rules of thumb, not a certified calculation.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # model unit tests
npm run e2e      # Playwright walkthrough (needs Chromium)
```

Code map: `src/model` (pure TypeScript design model, checks, cut list, shopping list),
`src/scene` (three.js / React Three Fiber, procedural wood shader), `src/ui` (chapters),
`src/content` (mentor text, build steps, EN/DE glossary).
