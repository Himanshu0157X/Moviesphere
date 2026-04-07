import { expect, test } from '@playwright/test'

test('shows the authentication screen for signed-out users', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText(/MovieSphere access/i)).toBeVisible()
})
