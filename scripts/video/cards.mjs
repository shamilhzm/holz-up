// Renders the captions and title/end cards of a recorded timeline as transparent PNGs.
// Usage: node scripts/video/cards.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] ?? 'video-out'
const tl = JSON.parse(readFileSync(join(OUT, 'timeline.json'), 'utf8'))
const DIR = join(OUT, 'cards')
mkdirSync(DIR, { recursive: true })

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Figtree:wght@500;600&display=swap'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>
  html,body{margin:0;width:${tl.width}px;height:${tl.height}px;background:transparent;overflow:hidden}
  .serif{font-family:Fraunces,'Bitstream Charter',Georgia,serif}
  .sans{font-family:Figtree,'Liberation Sans',sans-serif}
  .cap{position:absolute;transform:translateX(-50%);box-sizing:border-box;background:rgba(34,26,19,.88);color:#fbf6ec;
    border-radius:16px;padding:13px 24px 16px;box-shadow:0 12px 34px rgba(20,12,5,.32);width:max-content}
  .cap .k{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#e4ad69;margin-bottom:5px}
  .cap .t{font-family:Figtree,'Liberation Sans',sans-serif;font-weight:500;font-size:25px;line-height:1.3;text-wrap:balance}
  .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(246,238,225,.97) 0%,rgba(246,238,225,.9) 40%,rgba(246,238,225,0) 72%)}
  .title{position:absolute;left:0;right:0;top:96px;text-align:center;color:#2b2118}
  .title .kick{font-family:Figtree,sans-serif;font-weight:600;font-size:18px;letter-spacing:.32em;text-transform:uppercase;color:#a8692f}
  .title h1{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:150px;line-height:1;margin:14px 0 10px;letter-spacing:-.01em}
  .title h1 span{color:#c98d4c}
  .title .tag{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:500;font-size:34px;color:#5b4632}
  .end{position:absolute;left:0;right:0;top:70px;text-align:center;color:#2b2118}
  .end h2{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:92px;margin:0;line-height:1}
  .end h2 span{color:#c98d4c}
  .end p{font-family:Figtree,sans-serif;font-weight:500;font-size:26px;margin:16px 0 0;color:#4a3a2a}
  .end .tag{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:30px;color:#a8692f;margin-top:10px}
</style></head><body>${body}</body></html>`

const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: tl.width, height: tl.height } })

async function render(html, file) {
  await p.setContent(page(html), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: join(DIR, file), omitBackground: true })
}

const manifest = { captions: [], cards: [] }
for (const [i, c] of tl.captions.entries()) {
  const file = `caption-${i}.png`
  await render(
    `<div class="cap" style="left:${c.cx}px;bottom:${c.bottom}px;max-width:${c.maxW}px"><div class="k">${esc(c.kicker)}</div><div class="t">${esc(c.text)}</div></div>`,
    file,
  )
  manifest.captions.push({ ...c, file })
}
for (const [i, c] of tl.cards.entries()) {
  const file = `card-${i}.png`
  const html =
    c.kind === 'title'
      ? `<div class="veil"></div><div class="title"><div class="kick">A cozy woodworking game</div><h1>Holz<span>-</span>Up</h1><div class="tag">Plan it · buy it · saw it · build it</div></div>`
      : `<div class="veil"></div><div class="end"><h2>Holz<span>-</span>Up</h2><p>Project one: a solid-wood desk that one person moves with one hand.</p><div class="tag">Every plan in the game is one you can really build.</div></div>`
  await render(html, file)
  manifest.cards.push({ ...c, file })
}
writeFileSync(join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 1))
await browser.close()
console.log(`rendered ${manifest.captions.length} captions, ${manifest.cards.length} cards`)
