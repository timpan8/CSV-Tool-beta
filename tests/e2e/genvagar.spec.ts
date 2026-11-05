import { expect, test, type Page } from '@playwright/test'

/**
 * Genvägarna kommer ur kommandoregistret.
 *
 * Det som står i en meny eller i paletten är samma sträng som tangent-
 * hanteraren matchar mot, så en genväg som visas är alltid en genväg som
 * fungerar. Ctrl+X är fallet som avslöjade motsatsen: cellmenyn skrev det,
 * ingen lyssnade.
 */
async function oppnaExempel(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Öppna exempelfil' }).click()
  await page.getByRole('button', { name: 'Öppna filen' }).click()
  await expect(page.locator('.statusrad')).toContainText('16 rader')
}

const cell = (page: Page, text: string) => page.getByRole('gridcell', { name: text, exact: true })

test('Ctrl+X klipper ut markeringen, och Ctrl+Z tar tillbaka den', async ({ page }) => {
  await oppnaExempel(page)
  await cell(page, 'Kiruna').click()
  await page.keyboard.press('Control+x')
  await expect(cell(page, 'Kiruna')).toHaveCount(0)
  await expect(page.locator('.toast').last()).toContainText('Klippte ut')

  await page.keyboard.press('Control+z')
  await expect(cell(page, 'Kiruna')).toBeVisible()
})

test('Ctrl+A markerar allt, och Delete tömmer markeringen', async ({ page }) => {
  await oppnaExempel(page)
  await cell(page, 'Kiruna').click()
  await page.keyboard.press('Control+a')
  await expect(page.locator('.statusrad')).toContainText('128 markerade')

  await page.keyboard.press('Delete')
  await expect(cell(page, 'Kiruna')).toHaveCount(0)
  await expect(cell(page, 'Malmö')).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(cell(page, 'Kiruna')).toBeVisible()
})

test('genvägarna i cellmenyn och paletten är de som tangentbordet kör', async ({ page }) => {
  await oppnaExempel(page)
  await cell(page, 'Kiruna').click({ button: 'right' })
  const klippUt = page.getByRole('menuitem', { name: 'Klipp ut' })
  await expect(klippUt).toBeVisible()
  await expect(klippUt).toContainText('Ctrl+X')
  await expect(page.getByRole('menuitem', { name: 'Klistra in som ny fil' })).toContainText(
    'Ctrl+Skift+V',
  )
  await page.keyboard.press('Escape')

  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Vad vill du göra?').fill('Klipp ut')
  await expect(page.locator('.palett__post').first()).toContainText('Ctrl+X')
  await page.keyboard.press('Escape')
})

test('Ctrl+Z i ett textfält i en panel ångrar fortfarande, men Ctrl+A markerar i fältet', async ({
  page,
}) => {
  await oppnaExempel(page)
  await cell(page, 'Kiruna').click()
  await page.keyboard.press('Delete')
  await expect(cell(page, 'Kiruna')).toHaveCount(0)

  await page.keyboard.press('Control+f')
  const falt = page.getByLabel('Sök i tabellen')
  await falt.fill('abc')
  await expect(falt).toBeFocused()
  // Ctrl+A i fältet markerar texten i fältet, inte tabellen.
  await page.keyboard.press('Control+a')
  await expect(page.locator('.statusrad')).not.toContainText('128 markerade')
  // Ctrl+Z går förbi fältet till historiken.
  await page.keyboard.press('Control+z')
  await expect(cell(page, 'Kiruna')).toBeVisible()
})
