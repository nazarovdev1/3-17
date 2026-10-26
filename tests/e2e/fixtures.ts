import { test as base } from '@playwright/test'

/** Outside Telegram the SDK has no host. Keep tests independent of CDN availability;
 * Telegram cases install their explicit WebApp mock before the application boots. */
export const test = base.extend<{ telegramScript: void }>({
  telegramScript: [
    async ({ page }, use) => {
      await page.route('https://telegram.org/js/telegram-web-app.js', (route) =>
        route.fulfill({ body: '', contentType: 'application/javascript' }),
      )
      await use()
    },
    { auto: true },
  ],
})
