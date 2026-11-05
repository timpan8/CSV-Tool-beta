import { expect, test, type Page } from '@playwright/test'

/**
 * En behållare för verktygen, med en regel för tangenterna.
 *
 * Enter kör den primära knappen när fokus ligger i ytan; Escape stänger
 * den översta ytan var fokus än ligger, men lämnar först ett textfält; en
 * dialog tar fokus till sitt första fält och lämnar tillbaka det när den
 * stängs. Förut hade panelen och dialogen var sin lyssnare med olika regler,
 * och inget verktyg gick att köra med Enter.
 */
async function oppnaExempel(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Öppna exempelfil' }).click()
  await page.getByRole('button', { name: 'Öppna filen' }).click()
  await expect(page.locator('.statusrad')).toContainText('16 rader')
}

async function oppnaDatum(page: Page) {
  await page.getByRole('button', { name: 'Meny för kolumnen Registrerad' }).click()
  await page.getByRole('menuitem', { name: /^Datum…/ }).first().click()
  await expect(page.locator('.verktyg')).toBeVisible()
}

test('Enter i panelen tillämpar, och fokus går tillbaka till rutnätet', async ({ page }) => {
  await oppnaExempel(page)
  await page.getByRole('gridcell', { name: '2026-08-26', exact: true }).click()
  await oppnaDatum(page)

  // Enter i ett textfält betyder "kör", som i ett formulär. Namnfältet för
  // den nya kolumnen är ett sådant.
  await page.getByRole('checkbox', { name: /Lägg resultatet i en ny kolumn/ }).check()
  const namn = page.getByLabel('Namn på den nya kolumnen')
  await namn.fill('Datum ren')
  await page.keyboard.press('Enter')
  await expect(page.locator('.verktyg')).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: /Datum ren/ })).toBeVisible()
  await expect(page.getByRole('grid')).toBeFocused()
})

test('Escape i ett textfält lämnar fältet först, nästa stänger panelen', async ({ page }) => {
  await oppnaExempel(page)
  await oppnaDatum(page)
  const nyKolumn = page.getByRole('checkbox', { name: /Lägg resultatet i en ny kolumn/ })
  await nyKolumn.check()
  const namn = page.getByLabel('Namn på den nya kolumnen')
  await namn.fill('Datum ren')
  await expect(namn).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(namn).not.toBeFocused()
  await expect(page.locator('.verktyg')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.verktyg')).toHaveCount(0)
})

test('Escape stänger panelen även när fokus ligger i rutnätet', async ({ page }) => {
  await oppnaExempel(page)
  await oppnaDatum(page)
  await page.getByRole('gridcell', { name: 'Malmö', exact: true }).first().click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.verktyg')).toHaveCount(0)
})

test('en dialog tar fokus till första fältet, håller tabb-cykeln, och lämnar tillbaka fokus', async ({
  page,
}) => {
  await oppnaExempel(page)
  const knapp = page.getByRole('button', { name: 'Exportera' })
  await knapp.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Första fokuserbara i kroppen är formatvalet — inte ✕-knappen i rubriken.
  await expect(dialog.getByRole('radio').first()).toBeFocused()

  // Tabb från sista knappen går runt till dialogens första, inte ut på sidan.
  await dialog.getByRole('button', { name: 'Ladda ner' }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Stäng' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(knapp).toBeFocused()
})

test('en dialog ovanpå en panel tar Escape själv', async ({ page }) => {
  await oppnaExempel(page)
  await page.getByRole('button', { name: 'Filter' }).click()
  await expect(page.locator('.verktyg')).toBeVisible()
  await page.getByRole('button', { name: 'Exportera' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Panelen står kvar: bara den översta ytan stängdes.
  await expect(page.locator('.verktyg')).toBeVisible()
})

test('foten står i samma ordning i alla verktyg', async ({ page }) => {
  await oppnaExempel(page)
  await page.getByRole('button', { name: 'Sortera', exact: true }).click()
  const fot = page.locator('.verktyg__fot')
  // Destruktiv till vänster, Stäng till höger. Ingen primär: sorteringen verkar direkt.
  await expect(fot.locator('.knapp').first()).toHaveText('Ta bort sorteringen')
  await expect(fot.locator('.knapp').first()).toHaveClass(/knapp--fara/)
  await expect(fot.locator('.knapp').last()).toHaveText('Stäng')
  await expect(fot.locator('.knapp--primar')).toHaveCount(0)
})
