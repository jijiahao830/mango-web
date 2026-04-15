const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/test2.html', { waitUntil: 'networkidle0' });
  const imgSrc = await page.evaluate(() => document.querySelector('img').src);
  console.log("Image src:", imgSrc);
  await browser.close();
})();
