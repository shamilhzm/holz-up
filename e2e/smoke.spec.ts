import { expect, test, type Page } from '@playwright/test'

const SHOTS = process.env.SHOTS_DIR
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

async function canvasIsDrawn(page: Page) {
  // Sample the WebGL canvas: a rendered scene has many distinct colours.
  return page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement
    const tmp = document.createElement('canvas')
    tmp.width = 64
    tmp.height = 64
    const ctx = tmp.getContext('2d')!
    ctx.drawImage(c, 0, 0, 64, 64)
    const d = ctx.getImageData(0, 0, 64, 64).data
    const colours = new Set<number>()
    for (let i = 0; i < d.length; i += 4) colours.add((d[i] >> 3) * 1024 + (d[i + 1] >> 3) * 32 + (d[i + 2] >> 3))
    return colours.size
  })
}

type Holz = { getState: () => Record<string, any> }
const store = (page: Page, fn: (s: Record<string, any>) => unknown) =>
  page.evaluate((src) => new Function('s', `return (${src})(s)`)((window as unknown as { holz: Holz }).holz.getState()), fn.toString())

test('plan, buy, saw, assemble, tune and test the desk', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/?debug')
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForTimeout(2000)
  expect(await canvasIsDrawn(page)).toBeGreaterThan(40)
  await expect(page.locator('[data-check="effort"]')).toHaveAttribute('data-status', 'ok')
  await shot(page, '1-plan')

  // Store: buy the wood
  await page.getByRole('button', { name: /DIY store/ }).click()
  await page.getByRole('button', { name: /Buy everything/ }).click()
  await page.getByRole('button', { name: 'To the workshop' }).click()
  await expect(page.getByText('Now cutting')).toBeVisible()

  // Saw one part for real: aim half a kerf onto the waste side, then stroke.
  await page.mouse.move(900, 420)
  const offset = async () => Number((await page.locator('svg.loupe').getAttribute('aria-label'))!.match(/Blade ([+-]?[\d.]+)/)![1])
  const n = Math.round(((await offset()) - 0.5) / 0.1)
  for (let i = 0; i < Math.abs(n); i++) await page.keyboard.press(n > 0 ? 'ArrowUp' : 'ArrowDown')
  expect(await offset()).toBeCloseTo(0.5, 1)
  await page.mouse.down()
  for (let i = 0; i < 6; i++) await page.mouse.move(i % 2 ? 850 : 1150, 420, { steps: 4 })
  await shot(page, '2-sawing')
  for (let i = 0; i < 6; i++) await page.mouse.move(i % 2 ? 850 : 1150, 420, { steps: 4 })
  await page.mouse.up()
  await expect(page.getByTestId('cut-result')).toContainText('Spot on', { timeout: 15_000 })

  // The store's panel saw cuts the rest of this step; then assemble.
  await page.getByRole('button', { name: /panel saw/ }).click()
  await expect(page.locator('.grab').first()).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, '3-assemble')

  // Drag a part onto its glowing slot.
  const box = (await page.locator('.grab').first().boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.down()
  let snapped = false
  for (let y = 250; y < 820 && !snapped; y += 55) {
    for (let x = 470; x < 1380 && !snapped; x += 60) {
      await page.mouse.move(x, y)
      snapped = await page.getByTestId('snap').isVisible()
    }
  }
  expect(snapped).toBe(true)
  await page.mouse.up()
  expect(await store(page, (s) => Object.keys(s.build.placed).length)).toBeGreaterThan(0)

  // Fast-forward to the counterweight step, then tune it by hand.
  await fastForward(page, 'tune')
  await expect(page.getByTestId('tune-force')).toBeVisible()
  for (let i = 0; i < 30; i++) {
    const [l, r] = await store(page, (s) => s.build.cobbles) as [number, number]
    const force = Number((await page.getByTestId('tune-force').innerText()).replace(' kg', ''))
    if (force <= 5 && Math.abs(l - r) <= 1) break
    await page.getByRole('button', { name: l <= r ? 'Add a cobble Left' : 'Add a cobble Right' }).click()
  }
  await page.getByRole('button', { name: 'It floats: done' }).click()
  await page.waitForTimeout(800)
  await shot(page, '4-tuned')

  await fastForward(page, 'done')
  await expect(page.getByText('The desk stands.')).toBeVisible()
  await page.waitForTimeout(1500)
  await shot(page, '5-done')

  // Acceptance test uses your build
  await page.getByRole('button', { name: 'On to the acceptance test' }).click()
  await expect(page.getByText(/Testing the desk you built/)).toBeVisible()
  await page.getByRole('button', { name: 'Squeeze the handle' }).click()
  await page.getByRole('button', { name: '▲ up' }).click()
  await expect(page.getByTestId('switch-msg')).toContainText('Gliding up')
  await page.getByRole('button', { name: 'Let go of the handle' }).click()
  await expect(page.getByTestId('switch-msg')).toContainText('Locked at')

  await page.reload()
  await expect(page.locator('[data-chapter="test"]')).toBeVisible()
  expect(errors).toEqual([])
})

/** Complete build steps through the store's own actions until the workshop reaches `until`. */
async function fastForward(page: Page, until: 'tune' | 'done') {
  await page.evaluate(async (target) => {
    const s = () => (window as unknown as { holz: Holz }).holz.getState()
    for (let guard = 0; guard < 800; guard++) {
      const el = document.querySelector('[data-mode]')
      if (!el || el.getAttribute('data-mode') === target) return
      const [kind, key] = (el.getAttribute('data-next') ?? '').split('|')
      if (kind === 'cut') s().recordCut(key, 0.2)
      else if (kind === 'place') s().place(key)
      else if (kind === 'tune') s().setTuned(true)
      else if (kind === 'glue') s().glue(key)
      else return
      await new Promise((r) => setTimeout(r, 0))
    }
  }, until)
}

test('works on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForTimeout(2000)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await shot(page, '6-phone')
})
