import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Try logging in
  await page.fill('#email', 'tonyang11552883@gmail.com');
  await page.fill('#password', 'password123'); // or just anything to trigger submit
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000); // wait for 3s
  await browser.close();
})();
