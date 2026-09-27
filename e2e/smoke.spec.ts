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

test('walk through all six chapters', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForTimeout(2500)
  expect(await canvasIsDrawn(page)).toBeGreaterThan(40)
  await shot(page, '1-brief')

  // 1 Brief: body height changes the suggested heights
  await page.getByLabel('Your body height').fill('190')
  await expect(page.getByText('Sitting 78 cm')).toBeVisible()

  // 2 Design: checks respond to parameters
  await page.getByRole('button', { name: 'Next →' }).click()
  await expect(page.locator('[data-chapter="design"]')).toBeVisible()
  await expect(page.locator('[data-check="effort"]')).toHaveAttribute('data-status', 'ok')
  await page.locator('.seg button', { hasText: 'None' }).click()
  await expect(page.locator('[data-check="effort"]')).toHaveAttribute('data-status', 'fail')
  await page.locator('.seg button', { hasText: 'Granite' }).click()
  await page.getByRole('button', { name: 'Stand' }).click()
  await page.getByRole('button', { name: 'Cutaway' }).click()
  await page.waitForTimeout(1500)
  await shot(page, '2-design-stand-cutaway')
  await page.getByRole('button', { name: 'Cutaway' }).click()

  // 3 Material: prices add up
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByLabel('Price of Wood glue D3').fill('9.5')
  await expect(page.getByTestId('total')).toContainText('9,50')
  await shot(page, '3-material')

  // 4 Documents: all three tabs render SVG
  await page.getByRole('button', { name: 'Next →' }).click()
  for (const tab of ['Cutting plan', 'Drawings', 'Bill of materials']) {
    await page.getByRole('tab', { name: new RegExp(tab) }).click()
    if (tab !== 'Bill of materials') await expect(page.locator('.panel svg').first()).toBeVisible()
    if (tab === 'Drawings') await shot(page, '4-drawings')
    if (tab === 'Cutting plan') await shot(page, '4-cutting')
  }

  // 5 Build plan: focusing a step, ticking it off
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByText('3. Laminate the columns').click()
  await page.getByLabel('Done: Laminate the columns').check()
  await expect(page.getByText('1 of 9 steps done')).toBeVisible()
  await page.waitForTimeout(800)
  await shot(page, '5-build')

  // 6 Test: locked until squeezed, snaps to a detent, jams when dry
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('button', { name: '▲ up' }).click()
  await expect(page.getByTestId('switch-msg')).toContainText('locked')
  await page.getByRole('button', { name: 'Squeeze the handle' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '▼ down' }).click()
  await expect(page.getByTestId('switch-msg')).toContainText('Gliding down')
  await page.getByRole('button', { name: 'Let go of the handle' }).click()
  await expect(page.getByTestId('switch-msg')).toContainText('Locked at')
  await page.getByRole('button', { name: /Guides waxed/ }).click()
  await page.getByRole('button', { name: 'Squeeze the handle' }).click()
  await page.getByRole('button', { name: '▲ up' }).click()
  await expect(page.getByTestId('switch-msg')).toContainText('jams')
  await page.waitForTimeout(1200)
  await shot(page, '6-test')

  // Progress survives a reload
  await page.reload()
  await expect(page.locator('[data-chapter="test"]')).toBeVisible()

  expect(errors).toEqual([])
})

test('works on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForTimeout(2000)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await shot(page, '7-phone')
})
