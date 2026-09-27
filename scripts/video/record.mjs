// Records a walkthrough of Holz-Up frame by frame.
//
// The page clock is frozen and advanced one video frame at a time, so animations stay smooth
// however slowly the (software) renderer runs. Frames where nothing changes are hard links.
// Each scene goes to <out>/scenes/<name>/ (frames + its own timeline), so one scene can be
// re-recorded alone; <out>/timeline.json then stitches all recorded scenes in order.
//
// Usage: node scripts/video/record.mjs [outDir] [scene …]   (needs `vite preview` on :4175)
import { chromium } from '@playwright/test'
import { existsSync, linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] ?? 'video-out'
const ONLY = process.argv.slice(3)
const URL = process.env.HOLZ_URL ?? 'http://localhost:4175/'
const FPS = 24
const W = 1600
const H = 900
const FRAME_MS = Math.round(1000 / FPS)

// The scene being recorded: its frame folder, its timeline and the frame counter within it.
let FRAMES
let timeline
let frame = 0

// Where captions sit: centred over the part of the screen the panels leave free.
const POS = {
  clean: { cx: 800, bottom: 70, maxW: 900 },
  plan: { cx: 840, bottom: 100, maxW: 760 },
  workshop: { cx: 1013, bottom: 60, maxW: 900 },
  shop: { cx: 1320, bottom: 60, maxW: 500 },
}

const CSS = `
  *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  body.cine-clean .topbar, body.cine-clean .panel, body.cine-clean .checks, body.cine-clean .dock{display:none!important}
  #cine-cursor{position:fixed;left:0;top:0;width:30px;height:30px;pointer-events:none;z-index:2147483647;will-change:transform}
  #cine-cursor svg{filter:drop-shadow(0 2px 3px rgba(40,25,10,.45));transition:none}
  #cine-ripple{position:fixed;left:0;top:0;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;
    border:3px solid rgba(214,146,70,.95);background:rgba(214,146,70,.18);pointer-events:none;z-index:2147483646;opacity:0}
`
const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.6 L11.7 14.2 L18 14.2 Z" fill="#fffaf1" stroke="#2b2118" stroke-width="1.4" stroke-linejoin="round"/></svg>`

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const pad = (n) => String(n).padStart(5, '0')

class Rec {
  constructor(page, cdp) {
    this.page = page
    this.cdp = cdp
    this.last = null
    this.cursor = { x: 1100, y: 520, visible: true, pressed: false }
    this.ripple = null
  }

  // ----- frames -----
  async shot() {
    const r = await this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true })
    const file = join(FRAMES, `${pad(frame)}.jpg`)
    writeFileSync(file, Buffer.from(r.data, 'base64'))
    this.last = file
    frame++
  }
  /** Advance the clock one frame at a time, capturing each; `each(i)` runs before a frame. */
  async step(n = 1, each) {
    for (let i = 0; i < n; i++) {
      if (each) await each(i)
      await this.syncCursor()
      await this.page.clock.fastForward(FRAME_MS)
      await this.shot()
    }
  }
  /** Repeat the last frame (nothing moves). */
  hold(n) {
    for (let i = 0; i < n; i++) {
      linkSync(this.last, join(FRAMES, `${pad(frame)}.jpg`))
      frame++
    }
  }
  /** Let the app run without recording (camera glides, compiles). */
  async settle(ms) {
    for (let t = 0; t < ms; t += FRAME_MS) await this.page.clock.fastForward(FRAME_MS)
  }

  // ----- timeline -----
  cue(type, value = 1) {
    timeline.cues.push({ frame, type, value })
  }
  /** Show a caption; it replaces any caption still on screen. */
  caption(kicker, text, seconds, pos = POS.plan) {
    for (const c of timeline.captions) if (c.end > frame) c.end = frame
    timeline.captions.push({ start: frame, end: frame + Math.round(seconds * FPS), kicker, text, ...pos })
  }
  /** Keep running until the current caption has been on screen for its full time. */
  async read(still = false) {
    const c = timeline.captions.at(-1)
    const left = c ? c.end - frame : 0
    if (left <= 0) return
    if (still) this.hold(left)
    else await this.step(left)
  }
  card(kind, seconds) {
    timeline.cards.push({ kind, start: frame, end: frame + Math.round(seconds * FPS) })
  }

  // ----- cursor -----
  async syncCursor() {
    const c = this.cursor
    let rp = null
    if (this.ripple) {
      const t = this.ripple.t / 10
      rp = { x: this.ripple.x, y: this.ripple.y, s: 0.35 + t * 1.1, o: Math.max(0, 0.95 * (1 - t)) }
      this.ripple.t++
      if (this.ripple.t > 10) this.ripple = null
    }
    await this.page.evaluate(({ c, rp }) => {
      const el = document.getElementById('cine-cursor')
      el.style.display = c.visible ? 'block' : 'none'
      el.style.transform = `translate(${c.x - 4}px, ${c.y - 3}px) scale(${c.pressed ? 0.88 : 1})`
      const r = document.getElementById('cine-ripple')
      if (rp) {
        r.style.opacity = rp.o
        r.style.transform = `translate(${rp.x}px, ${rp.y}px) scale(${rp.s})`
      } else r.style.opacity = 0
    }, { c, rp })
  }
  /** Glide the cursor (and the real mouse) to x, y. */
  async move(x, y, frames) {
    const { x: x0, y: y0 } = this.cursor
    const n = frames ?? Math.round(Math.min(22, Math.max(8, Math.hypot(x - x0, y - y0) / 45)))
    await this.step(n, async (i) => {
      const t = ease((i + 1) / n)
      this.cursor.x = x0 + (x - x0) * t
      this.cursor.y = y0 + (y - y0) * t
      await this.page.mouse.move(this.cursor.x, this.cursor.y)
    })
  }
  async clickAt(x, y, after = 6) {
    await this.move(x, y)
    await this.page.mouse.down()
    this.cursor.pressed = true
    this.ripple = { x, y, t: 0 }
    this.cue('click')
    await this.step(2)
    await this.page.mouse.up()
    this.cursor.pressed = false
    await this.page.waitForTimeout(30)
    await this.step(after)
  }
  async center(locator) {
    const b = await locator.boundingBox()
    if (!b) throw new Error(`not visible: ${locator}`)
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }
  async click(locator, after = 6) {
    // Panels scroll under a sticky footer: bring a target near the edges to the middle first.
    await locator.evaluate((el) => {
      let sc = el.parentElement
      while (sc && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
      if (!sc) return
      const b = el.getBoundingClientRect()
      const r = sc.getBoundingClientRect()
      if (b.top < r.top + 20 || b.bottom > r.bottom - 90) el.scrollIntoView({ block: 'center' })
    })
    const p = await this.center(locator)
    await this.clickAt(p.x, p.y, after)
  }

  // ----- app -----
  store(fn, arg) {
    return this.page.evaluate(({ src, arg }) => new Function('s', 'arg', `return (${src})(s, arg)`)(window.holz.getState(), arg), { src: fn.toString(), arg })
  }
  /** Screen position of a world point (metres). */
  toScreen(p) {
    return this.page.evaluate((p) => {
      const t = window.holzThree()
      const v = t.camera.position.clone().set(...p).project(t.camera)
      const r = t.gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }, p)
  }
  /** Screen position of a named object (parts are named by id). */
  objectScreen(name) {
    return this.page.evaluate((name) => {
      const t = window.holzThree()
      const o = t.scene.getObjectByName(name)
      if (!o) return null
      const v = o.getWorldPosition(t.camera.position.clone()).project(t.camera)
      const r = t.gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }, name)
  }
  /** Take over the camera (the app's own camera glides pause). */
  cam(pos, look, clean = false) {
    return this.page.evaluate(({ pos, look, clean }) => {
      window.holzCinema = true
      const t = window.holzThree()
      if (clean) t.camera.clearViewOffset()
      t.camera.position.set(...pos)
      t.controls.target.set(...look)
      t.controls.update()
      t.camera.updateProjectionMatrix()
      t.invalidate()
    }, { pos, look, clean })
  }
  release() {
    return this.page.evaluate(() => { window.holzCinema = false; window.holzThree().invalidate() })
  }
  orbitAt(look, radius, height, az) {
    return [look[0] + Math.sin(az) * radius, look[1] + height, look[2] + Math.cos(az) * radius]
  }
  clean(on) {
    return this.page.evaluate((on) => document.body.classList.toggle('cine-clean', on), on)
  }
  /** Drive the build with the store's own actions until the workshop reaches `mode`. */
  async buildUntil(mode, each) {
    for (let guard = 0; guard < 600; guard++) {
      const next = await this.page.evaluate(() => {
        const el = document.querySelector('[data-mode]')
        return el ? [el.getAttribute('data-mode'), el.getAttribute('data-next')] : null
      })
      if (!next || next[0] === mode || !next[1]) return
      const [kind, key] = next[1].split('|')
      if (kind === 'place' && each) await each(key)
      else await this.store((s, a) => {
        const [k, key] = a
        if (k === 'cut') s.recordCut(key, Math.round((Math.random() * 0.8 - 0.4) * 10) / 10)
        else if (k === 'place') s.place(key)
        else if (k === 'glue') s.glue(key)
        else if (k === 'tune') s.setTuned(true)
      }, [kind, key])
      await this.page.waitForTimeout(5)
    }
  }
}

async function open(browser, setup) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  await page.clock.install({ time: new Date('2026-09-27T09:30:00Z') })
  await page.goto(`${URL}?debug`)
  await page.waitForTimeout(400)
  await page.clock.runFor(800)
  await page.addStyleTag({ content: CSS })
  await page.evaluate((svg) => {
    const c = document.createElement('div')
    c.id = 'cine-cursor'
    c.innerHTML = svg
    const r = document.createElement('div')
    r.id = 'cine-ripple'
    document.body.append(r, c)
    window.holz.getState().setMuted(true)
  }, CURSOR_SVG)
  // Softer, cheaper shadows for the software renderer.
  await page.evaluate(() => {
    const t = window.holzThree()
    t.scene.traverse((o) => {
      if (o.isDirectionalLight) {
        o.shadow.mapSize.set(1024, 1024)
        o.shadow.map?.dispose()
        o.shadow.map = null
      }
    })
  })
  const cdp = await ctx.newCDPSession(page)
  const r = new Rec(page, cdp)
  if (setup) await setup(r)
  await r.settle(1500)
  return { ctx, r }
}

const scenes = {
  async intro(r) {
    await r.clean(true)
    r.cursor.visible = false
    await r.store((s) => s.setHeight(s.params.sitHeight))
    r.card('title', 3.2)
    await r.step(1, () => r.cam(r.orbitAt([0, 0.52, 0], 3.2, 0.95, 0.95), [0, 0.52, 0], true))
    const n = 190
    await r.step(n, async (i) => {
      if (i === 60) await r.store((s) => s.setHeight(1070))
      if (i === 60) r.cue('slide', 1)
      if (i === 78) r.caption('Holz-Up', 'A solid-wood desk that one person moves from sitting to standing, with one hand.', 4.5, POS.clean)
      await r.cam(r.orbitAt([0, 0.52, 0], 3.2, 0.95, 0.95 - (i / n) * 0.55), [0, 0.52, 0], true)
    })
  },

  async plan(r) {
    r.caption('Drafting table · Zeichentisch', 'Enter your height and the whole design adapts: heights, pedestals, parts.', 3.8)
    const slider = r.page.getByLabel('Your body height')
    const b = await slider.boundingBox()
    const at = (cm) => b.x + 8 + ((cm - 145) / 60) * (b.width - 16)
    await r.move(at(175), b.y + b.height / 2, 14)
    await r.page.mouse.down()
    r.cursor.pressed = true
    r.cue('click')
    await r.step(22, async (i) => {
      r.cursor.x = at(175 + (13 * ease((i + 1) / 22)))
      await r.page.mouse.move(r.cursor.x, r.cursor.y)
    })
    await r.page.mouse.up()
    r.cursor.pressed = false
    await r.step(14)
    await r.read()
    r.caption('Drafting table · Zeichentisch', 'Sitting ↔ standing: the top rides on two hidden wooden columns.', 3.5)
    await r.click(r.page.getByRole('button', { name: 'Show standing' }), 2)
    r.cue('slide', 1)
    await r.step(34)
    r.hold(20)
  },

  async mechanism(r) {
    // Full screen, cut open: the right pedestal from its open side.
    await r.clean(true)
    r.cursor.visible = false
    await r.store((s) => s.setCutaway(true))
    const look = [0.48, 0.6, -0.05]
    r.caption('Inside a pedestal · Im Korpus', 'A laminated column slides in a waxed guide. Cobblestones on a cord balance the top, like a sash window.', 6, POS.clean)
    const n = 260
    await r.step(n, async (i) => {
      const t = ease(i / n)
      if (i === 146) r.caption('Inside a pedestal · Im Korpus', 'The top rises, the stones sink. A wooden catch locks it every 25 mm.', 4, POS.clean)
      if (i === 150) { await r.store((s) => s.setHeight(1070)); r.cue('slide', 1) }
      if (i === 215) { await r.store((s) => s.setHeight(s.params.sitHeight)); r.cue('slide', 1) }
      await r.cam([2.3 - t * 0.18, 1.06 - t * 0.04, 0.92 - t * 0.44], look, true)
    })
  },

  async checks(r) {
    await r.page.evaluate(() => {
      const sum = [...document.querySelectorAll('summary')].find((x) => x.textContent.includes('Balance & sliding'))
      sum.parentElement.open = true
      sum.scrollIntoView({ block: 'center' })
    })
    await r.step(2)
    r.caption('Live checks · Prüfungen', 'Every change is checked, with the reason. Take the stones out and one hand is no longer enough.', 5.5)
    await r.click(r.page.locator('.seg button', { hasText: 'None' }), 30)
    await r.click(r.page.locator('.seg button', { hasText: 'Granite' }), 26)
  },

  async shop(r) {
    r.caption('DIY store · Baumarkt', 'A shopping list in standard sizes for your local store.', 3.6, POS.shop)
    await r.click(r.page.getByRole('button', { name: /DIY store/ }), 18)
    await r.click(r.page.getByRole('button', { name: /Buy everything/ }), 30)
  },

  async saw(r) {
    await r.click(r.page.getByRole('button', { name: 'To the workshop' }), 2)
    r.caption('Workshop · Werkstatt', 'Every part is sawn by hand, one assembly step at a time.', 3.6, POS.workshop)
    await r.step(34)
    // Aim: the pointer sets the blade; glide onto the pencil line, half a kerf (0.5 mm) onto the waste side…
    const aim = await r.toScreen([0.07, 0.64, 0.1005])
    await r.move(aim.x, aim.y, 20)
    await r.read(true)
    r.caption('Workshop · Werkstatt', 'Aim half a saw kerf onto the waste side of the pencil line. The loupe reads to 0.1 mm.', 5, POS.workshop)
    // …then fine-tune with the arrow keys, 0.1 mm a press.
    const offset = async () => Number((await r.page.locator('svg.loupe').getAttribute('aria-label')).match(/Blade ([+-]?[\d.]+)/)[1])
    for (let k = 0; k < 60; k++) {
      const o = await offset()
      if (Math.abs(o - 0.5) < 0.05) break
      await r.page.keyboard.press(o > 0.5 ? 'ArrowUp' : 'ArrowDown')
      await r.step(2)
    }
    console.log(`  blade at ${await offset()} mm`)
    await r.step(4)
    await r.read(true)
    r.caption('Workshop · Werkstatt', 'Hold and stroke. Wobbly first strokes steer the cut; your accuracy follows the part.', 4.8, POS.workshop)
    await r.page.mouse.down()
    r.cursor.pressed = true
    const cx = r.cursor.x
    let done = false
    for (let i = 0; i < 200 && !done; i++) {
      await r.step(1, async () => {
        const x = cx + Math.sin((i / 13) * Math.PI) * 100
        r.cue('saw', Math.abs(x - r.cursor.x))
        r.cursor.x = x
        await r.page.mouse.move(r.cursor.x, r.cursor.y)
      })
      const w = await r.page.locator('[aria-label="Cut progress"] i').getAttribute('style')
      done = /width: 100%/.test(w ?? '')
    }
    await r.page.mouse.up()
    r.cursor.pressed = false
    r.cue('knock', 0.9)
    await r.step(30)
    r.cue('ding')
    await r.step(20)
    r.hold(14)
  },

  async assemble(r) {
    r.caption('Assembly · Montage', 'Drag each part onto its glowing outline. It snaps into place.', 3.8, POS.workshop)
    await r.click(r.page.getByRole('button', { name: /panel saw/ }), 2)
    await r.step(40)
    const grab = async () => {
      const card = r.page.locator('.grab').first()
      const from = await r.center(card)
      const next = await r.page.locator('[data-next]').getAttribute('data-next')
      await r.move(from.x, from.y, 16)
      const slot = await r.objectScreen(next.split('|')[1])
      await r.page.mouse.down()
      r.cursor.pressed = true
      r.cue('click')
      const { x: x0, y: y0 } = r.cursor
      await r.step(26, async (i) => {
        const t = ease((i + 1) / 26)
        r.cursor.x = x0 + (slot.x - x0) * t
        r.cursor.y = y0 + (slot.y - y0) * t - Math.sin(t * Math.PI) * 60
        await r.page.mouse.move(r.cursor.x, r.cursor.y)
      })
      await r.step(5)
      await r.page.mouse.up()
      r.cursor.pressed = false
      r.cue('knock', 0.7)
      await r.page.waitForTimeout(30)
      await r.step(10)
    }
    await grab()
    await r.click(r.page.getByRole('button', { name: /Place the other/ }), 4)
    r.cue('knock', 0.5)
    await r.step(8)
    await grab()
    r.caption('Assembly · Montage', 'Glue and clamp, then on to the next step.', 3, POS.workshop)
    await r.click(r.page.getByRole('button', { name: 'Glue & clamp' }), 2)
    r.cue('clamp')
    await r.step(30)
  },

  async timelapse(r) {
    r.cursor.visible = false
    r.caption('Step by step · Schritt für Schritt', 'Pedestal boxes with finger joints, guides, pulleys and weight boxes.', 4.6, POS.workshop)
    const look = [0, 0.36, 0]
    let i = 0
    await r.step(1, () => r.cam(r.orbitAt(look, 2.6, 1.05, 0.7), look))
    await r.buildUntil('tune', async (id) => {
      await r.store((s, id) => s.place(id), id)
      if (i % 3 === 0) r.cue('knock', 0.35)
      await r.step(2, () => r.cam(r.orbitAt(look, 2.6, 1.05, 0.7 - (i++ / 60) * 0.5), look))
    })
    await r.step(10)
  },

  async tune(r) {
    r.caption('Balance · Austarieren', 'Load cobblestones until the top floats. The meter shows the hand force.', 4.6, POS.workshop)
    await r.step(30)
    for (let k = 0; k < 24; k++) {
      const [left, right] = await r.store((s) => s.build.cobbles)
      const force = Number((await r.page.getByTestId('tune-force').innerText()).replace(' kg', ''))
      if (force <= 5 && Math.abs(left - right) <= 1) break
      await r.click(r.page.getByRole('button', { name: left <= right ? 'Add a cobble Left' : 'Add a cobble Right' }), 3)
      r.cue('stone')
    }
    await r.step(6)
    r.cue('ding')
    r.caption('Balance · Austarieren', 'It floats: one hand moves the top.', 2.6, POS.workshop)
    await r.step(24)
    const done = await r.center(r.page.getByRole('button', { name: 'It floats: done' }))
    await r.move(done.x, done.y)
    await r.read()
    // Moving on switches to the next step's saw: end the scene on the press.
    await r.clickAt(done.x, done.y, 0)
  },

  async finish(r) {
    r.cursor.visible = false
    r.caption('Step by step · Schritt für Schritt', 'Columns, pedestal tops, drawers, the top…', 3.2, POS.workshop)
    const look = [0, 0.42, 0]
    let i = 0
    await r.step(1, () => r.cam(r.orbitAt(look, 2.7, 1.1, 0.2), look))
    await r.buildUntil('done', async (id) => {
      await r.store((s, id) => s.place(id), id)
      if (i % 3 === 0) r.cue('knock', 0.35)
      await r.step(2, () => r.cam(r.orbitAt(look, 2.7, 1.1, 0.2 + (i++ / 60) * 0.5), look))
    })
    await r.read()
    r.cue('ding')
    r.caption('The desk stands · Der Tisch steht', 'Built from parts you cut yourself.', 2.8, POS.workshop)
    await r.step(40, async (k) => r.cam(r.orbitAt(look, 2.7, 1.1, 0.2 + (i / 60) * 0.5 + k * 0.004), look))
  },

  async test(r) {
    r.caption('Acceptance test · Abnahme', 'Squeeze the handle, glide, let go: it drops into the next notch.', 4.2)
    await r.click(r.page.getByRole('button', { name: 'Squeeze the handle' }), 4)
    const up = r.page.getByRole('button', { name: '▲ up' })
    for (let k = 0; k < 6; k++) {
      await r.click(up, 3)
      r.cue('slide', 0.4)
    }
    await r.step(14)
    await r.click(r.page.getByRole('button', { name: 'Let go of the handle' }), 4)
    r.cue('knock', 0.6)
    await r.step(20)
    r.caption('Acceptance test · Abnahme', 'Now take the stones out… and it becomes a lift you cannot do with one hand.', 4.8)
    await r.click(r.page.getByRole('button', { name: /Cobblestones in/ }), 8)
    await r.click(r.page.getByRole('button', { name: 'Squeeze the handle' }), 4)
    await r.click(up, 30)
    r.hold(20)
  },

  async clipboard(r) {
    r.caption('Clipboard · Unterlagen', 'Parts list, cutting plan and dimensioned drawings, to build it for real.', 4.4)
    await r.click(r.page.getByRole('button', { name: 'Clipboard' }), 2)
    // The dialog sits in the top layer: move the cursor in with it.
    await r.page.evaluate(() => document.querySelector('dialog[open]').append(document.getElementById('cine-ripple'), document.getElementById('cine-cursor')))
    await r.step(16)
    await r.click(r.page.getByRole('tab', { name: /Cutting plan/ }), 26)
    await r.click(r.page.getByRole('tab', { name: /Drawings/ }), 30)
    r.hold(12)
  },

  async outro(r) {
    await r.clean(true)
    r.cursor.visible = false
    const look = [0, 0.62, 0]
    r.card('end', 4.4)
    const n = 120
    await r.step(n, (i) => r.cam(r.orbitAt(look, 3.0, 0.8, 0.3 + (i / n) * 0.4), look, true))
  },
}

/** Starting state for each scene, reached with the same store actions the UI uses. */
async function built(r, { station, until = 'done' }) {
  await r.store((s) => { s.buy(); s.setStation(2) })
  await r.page.waitForTimeout(50)
  await r.buildUntil('tune')
  if (until === 'done' || until === 'tuned') {
    await balance(r)
    if (until === 'done') await r.buildUntil('done')
  }
  if (station !== undefined) await r.store((s, i) => s.setStation(i), station)
}

/** Load the stone count that makes the top float, reading the meter like a player would. */
async function balance(r) {
  let best = { kg: Infinity, n: 0 }
  for (let n = 6; n <= 18; n++) {
    await r.store((s, n) => { s.setCobbles(0, n); s.setCobbles(1, n) }, n)
    const kg = Number((await r.page.getByTestId('tune-force').innerText()).replace(' kg', ''))
    if (kg < best.kg) best = { kg, n }
  }
  await r.store((s, n) => { s.setCobbles(0, n); s.setCobbles(1, n); s.setTuned(true) }, best.n)
}

const plan = [
  ['intro', null],
  ['plan', null],
  ['mechanism', null],
  ['checks', null],
  ['shop', null],
  ['saw', async (r) => r.store((s) => { s.buy(); s.setStation(1) })],
  ['assemble', async (r) => {
    await r.store((s) => { s.buy(); s.setStation(2) })
    await r.page.waitForTimeout(50)
    const key = await r.page.locator('[data-next]').getAttribute('data-next')
    await r.store((s, k) => s.recordCut(k, 0), key.split('|')[1])
  }],
  ['timelapse', async (r) => {
    await r.store((s) => { s.buy(); s.setStation(2) })
    await r.page.waitForTimeout(50)
    // Finish the plinth step first.
    for (let k = 0; k < 40; k++) {
      const n = await r.page.locator('[data-next]').getAttribute('data-next')
      if (!/^(cut|place|glue)\|/.test(n) || (await r.page.locator('.track li[data-state="done"]').count()) >= 1) break
      const [kind, key] = n.split('|')
      await r.store((s, a) => { if (a[0] === 'cut') s.recordCut(a[1], 0.2); if (a[0] === 'place') s.place(a[1]); if (a[0] === 'glue') s.glue(a[1]) }, [kind, key])
      await r.page.waitForTimeout(5)
    }
  }],
  ['tune', async (r) => {
    await built(r, { until: 'tune' })
    await r.store((s) => { s.setCobbles(0, 6); s.setCobbles(1, 6) })
  }],
  ['finish', async (r) => built(r, { until: 'tuned' })],
  ['test', async (r) => built(r, { station: 3 })],
  ['clipboard', async (r) => built(r, { station: 3 })],
  ['outro', async (r) => {
    await built(r, { station: 0 })
    await r.store((s) => s.setHeight(1070))
  }],
]

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
// Every scene gets a fresh page and reaches its starting state through the store.
for (const [name, setup] of plan) {
  if (ONLY.length && !ONLY.includes(name)) continue
  const dir = join(OUT, 'scenes', name)
  rmSync(dir, { recursive: true, force: true })
  FRAMES = join(dir, 'frames')
  mkdirSync(FRAMES, { recursive: true })
  timeline = { frames: 0, captions: [], cards: [], cues: [] }
  frame = 0
  const t0 = Date.now()
  try {
    const { r } = await open(browser, setup)
    await scenes[name](r)
    await r.read() // the last caption stays up for its full time
    timeline.frames = frame
    writeFileSync(join(dir, 'timeline.json'), JSON.stringify(timeline, null, 1))
    console.log(`${name}: ${frame} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  } catch (e) {
    // Keep going; the scene is left out of the timeline until it is recorded again.
    console.error(`${name} FAILED at frame ${frame}: ${e.message}`)
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(dir, 'failed.png') })
  }
  for (const c of browser.contexts()) await c.close()
}
await browser.close()

// Stitch the recorded scenes, in order, into one timeline.
const all = { fps: FPS, width: W, height: H, frames: 0, scenes: [], captions: [], cards: [], cues: [] }
for (const [name] of plan) {
  const file = join(OUT, 'scenes', name, 'timeline.json')
  if (!existsSync(file)) continue
  const s = JSON.parse(readFileSync(file, 'utf8'))
  const at = all.frames
  all.scenes.push({ name, start: at, end: at + s.frames })
  for (const c of s.captions) all.captions.push({ ...c, start: at + c.start, end: at + c.end })
  for (const c of s.cards) all.cards.push({ ...c, start: at + c.start, end: at + c.end })
  for (const c of s.cues) all.cues.push({ ...c, frame: at + c.frame })
  all.frames += s.frames
}
writeFileSync(join(OUT, 'timeline.json'), JSON.stringify(all, null, 1))
console.log(`timeline: ${all.scenes.length} scenes, ${all.frames} frames (${(all.frames / FPS).toFixed(1)} s)`)
