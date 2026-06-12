const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
  
  // Admin dashboard
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'admin_dashboard.png', fullPage: false });
  console.log('Dashboard captured');
  
  // Bookings
  await page.goto('http://localhost:3000/admin/bookings', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'admin_bookings.png', fullPage: false });
  console.log('Bookings captured');
  
  // Customers
  await page.goto('http://localhost:3000/admin/customers', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'admin_customers.png', fullPage: false });
  console.log('Customers captured');
  
  console.log('Done!');
  await browser.close();
})().catch(e => console.error(e.message));
