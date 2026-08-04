const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const html = await page.content();
  console.log("HTML LENGTH:", html.length);
  console.log("BODY INNERHTML:", await page.evaluate(() => document.body.innerHTML));
  await browser.close();
})();
