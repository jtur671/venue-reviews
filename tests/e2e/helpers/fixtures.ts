import { test as base, expect, type Page } from '@playwright/test';

type Diagnostics = {
  consoleErrors: Array<{ type: string; text: string }>;
  failedRequests: Array<{ url: string; method: string; status?: number }>;
};

export const test = base.extend<{ diagnostics: Diagnostics }>({
  diagnostics: async ({ page }, use, testInfo) => {
    const diagnostics: Diagnostics = {
      consoleErrors: [],
      failedRequests: [],
    };

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        diagnostics.consoleErrors.push({ type, text: msg.text() });
      }
    });

    page.on('requestfailed', (req) => {
      diagnostics.failedRequests.push({ url: req.url(), method: req.method() });
    });

    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400) {
        diagnostics.failedRequests.push({
          url: res.url(),
          method: res.request().method(),
          status,
        });
      }
    });

    await use(diagnostics);

    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('console-errors.json', {
        body: Buffer.from(JSON.stringify(diagnostics.consoleErrors, null, 2)),
        contentType: 'application/json',
      });
      await testInfo.attach('network-failures.json', {
        body: Buffer.from(JSON.stringify(diagnostics.failedRequests, null, 2)),
        contentType: 'application/json',
      });
    }
  },
});

export { expect };

export async function acceptNextConfirm(page: Page) {
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
}

