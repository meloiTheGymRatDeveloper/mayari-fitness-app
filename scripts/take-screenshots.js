const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const BASE_URL = 'http://localhost:8081';
const OUT_DIR = path.join(__dirname, '..', 'tablet-screenshots');
const WIDTH = 1080;
const HEIGHT = 1920;

function waitForEnter(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function shot(page, name) {
  await sleep(2500);
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log('  Saved:', filePath);
}

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.innerText?.trim() === t && e.offsetParent !== null);
    if (el) el.click();
  }, text);
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [`--window-size=${WIDTH},${HEIGHT}`, '--window-position=0,0'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  console.log('Opening app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 60000 });

  // Try to click "Log in" link on splash screen
  try {
    await page.waitForSelector('text/Log in', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      const el = all.find(e => e.innerText?.trim() === 'Log in' && e.offsetParent !== null);
      if (el) el.click();
    });
    await sleep(2000);
  } catch (e) {}

  // Try navigating directly to login
  await page.goto(`${BASE_URL}/(auth)/login`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await sleep(2000);

  console.log('\n==============================================');
  console.log('Browser is open. Please TYPE YOUR EMAIL & PASSWORD');
  console.log('in the browser window and tap Log In.');
  console.log('==============================================');
  await waitForEnter('Press ENTER here once you are logged in and see the Home screen: ');

  // 1. Home
  console.log('\n[1/6] Home screen...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await shot(page, '1-Home');

  // 2. Workout
  console.log('[2/6] Workout screen...');
  await page.goto(`${BASE_URL}/(tabs)/workout`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await shot(page, '2-Workout');

  // 3. Logging Options (+ modal)
  console.log('[3/6] Logging Options...');
  await page.goto(`${BASE_URL}/(tabs)/nutrition/log`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await shot(page, '3-Logging-Options');

  // 4. Connect to Strava
  console.log('[4/6] Strava connection...');
  await page.goto(`${BASE_URL}/(tabs)/workout/cycling`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await shot(page, '4-Strava');

  // 5. Workout suggestion / Coach plan
  console.log('[5/6] Workout suggestion...');
  await page.goto(`${BASE_URL}/(tabs)/coach`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await shot(page, '5-Coach');

  // 6. Nutrition / Food search
  console.log('[6/6] Food search / Nutrition...');
  await page.goto(`${BASE_URL}/(tabs)/nutrition`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await shot(page, '6-Nutrition');

  console.log('\nWeb screenshots done!');
  console.log('Now resizing phone screenshots for native screens...');
  await browser.close();
})();
