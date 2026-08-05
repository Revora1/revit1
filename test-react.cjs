const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let hookError = false;
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('hook call')) {
      console.log('PAGE ERROR LOG:', msg.text());
      hookError = true;
    }
  });
  page.on('pageerror', error => {
    if (error.message.includes('hook call') || error.message.includes('useState')) {
      console.log('PAGE ERROR:', error.message);
      hookError = true;
    }
  });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  await browser.close();
  if (hookError) process.exit(1);
})();
