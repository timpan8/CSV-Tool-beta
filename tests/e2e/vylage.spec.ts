import { expect, test, type Page } from '@playwright/test'

/**
 * En vy i taget.
 *
 * Vyerna över rutnätet — slå ihop, jämför, kombinera, pivot, översikt och
 * verkstaden — delar ett enda läge. Att öppna en ersätter den som var uppe,
 * och Escape stänger alltid den man ser. Förut hade varje vy sin egen flagga,
 * och paletten kunde öppna en ovanpå en annan: då visades den nya medan
 * Escape stängde den gamla, osynliga, först.
 */
async function oppnaParet(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Öppna två filer att slå ihop' }).click()
  await page.getByRole('button', { name: 'Öppna filen' }).click()
  await page.getByRole('button', { name: 'Öppna filen' }).click()
  await expect(page.locator('.flik')).toHaveCount(2)
}

async function viaPaletten(page: Page, kommando: string) {
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Vad vill du göra?').fill(kommando)
  await page.keyboard.press('Enter')
}

test('Jämför öppnad från paletten ovanpå Slå ihop ersätter den, och Escape stänger Jämför', async ({
  page,
}) => {
  await oppnaParet(page)
  await page.getByRole('button', { name: 'Flera filer ▾' }).click()
  await page.getByRole('menuitem', { name: 'Slå ihop…' }).click()
  await expect(page.locator('.slaihop')).toBeVisible()

  await viaPaletten(page, 'Jämför med')
  await expect(page.locator('.jamfor')).toBeVisible()
  await expect(page.locator('.slaihop')).toHaveCount(0)

  // Ett Escape: tillbaka till rutnätet, inte till en dold Slå ihop.
  await page.keyboard.press('Escape')
  await expect(page.locator('.jamfor')).toHaveCount(0)
  await expect(page.locator('.slaihop')).toHaveCount(0)
  await expect(page.locator('.statusrad')).toBeVisible()
})

test('pivot, översikt och kombinera byter av varandra utan att stapla', async ({ page }) => {
  await oppnaParet(page)
  await page.getByRole('button', { name: 'Pivot' }).click()
  await expect(page.locator('.pivot')).toBeVisible()

  await viaPaletten(page, 'Kolumnöversikt')
  await expect(page.locator('.oversikt')).toBeVisible()
  await expect(page.locator('.pivot')).toHaveCount(0)

  await viaPaletten(page, 'Kombinera filer')
  await expect(page.locator('.kombinera')).toBeVisible()
  await expect(page.locator('.oversikt')).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(page.locator('.kombinera')).toHaveCount(0)
  await expect(page.locator('.statusrad')).toBeVisible()
})
