// Drives the local app in a real Chromium (cached Playwright build) to capture
// crisp, deck-ready PNG screenshots of the working product.
//
//   node scripts/deck-shots.mjs [shot]
//
// shot ∈ search | booking | connect | session-student | session-tutor | recording | all
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Client } from 'pg';

const EXEC = path.join(
  os.homedir(),
  'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
);
const OUT = path.resolve('../slide-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3000';
const STUDENT = { email: 'edouard.taha@gmail.com', password: 'Baba$123' };
const TUTOR = { email: 'edouard.taha@icloud.com', password: 'Baba$123' };

const SHOWCASE_TUTOR = '9ecbab70-09e5-48ec-b9a9-ac34f928b02a'; // Edouard T.
const KAIS_STUDENT = '04b67ebc-9245-4026-a0d6-c33901238bca';   // Kais Jr
const MCV4U = '42c364df-446c-41b6-ae0f-d1b56257b94c';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hide the Next.js dev indicator / error toast so it never lands in a shot.
async function hideDevOverlay(page) {
  await page.addStyleTag({
    content: `nextjs-portal,[data-nextjs-toast],[data-next-badge-root],#__next-build-watcher{display:none!important;visibility:hidden!important;}`,
  }).catch(() => {});
}

// ── DB prep: keep live tutors "live" + ensure an in-progress session ──────────
function pgClient() {
  const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  const url = line.replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
  return new Client({ connectionString: url });
}

async function refreshPresence() {
  const c = pgClient();
  await c.connect();
  await c.query(
    `UPDATE public."Profiles" SET last_active_at=now()
       WHERE "isAvailableNow"=true AND role='tutor'`
  );
  await c.end();
}

async function liveTutorId() {
  const c = pgClient();
  await c.connect();
  // A live tutor who teaches MCV4U — for the booking bubble (Book + Connect now).
  const r = await c.query(
    `SELECT p.id FROM public."Profiles" p
       JOIN public."ProfilesOnSubjects" pos ON pos.profile_id=p.id AND pos.subject_id=$1
      WHERE p.role='tutor' AND p."isAvailableNow"=true AND p.email LIKE '%@learnpeers.dev'
      ORDER BY p.rating DESC NULLS LAST LIMIT 1`,
    [MCV4U]
  );
  await c.end();
  return r.rows[0]?.id;
}

async function ensureLiveSession() {
  const c = pgClient();
  await c.connect();
  // Reuse an existing in-progress session if present, else create one.
  const existing = await c.query(
    `SELECT id FROM public."Sessions"
      WHERE tutor_id=$1 AND student_id=$2 AND status='in_progress'
      ORDER BY created_at DESC LIMIT 1`,
    [SHOWCASE_TUTOR, KAIS_STUDENT]
  );
  let id;
  if (existing.rows[0]) {
    id = existing.rows[0].id;
  } else {
    const ins = await c.query(
      `INSERT INTO public."Sessions"
         (tutor_id, student_id, subject_id, status, topic, duration, amount, is_instant, started_at, date)
       VALUES ($1,$2,$3,'in_progress','Chain rule & related rates (MCV4U)',1,40,true, now(), now()::date)
       RETURNING id`,
      [SHOWCASE_TUTOR, KAIS_STUDENT, MCV4U]
    );
    id = ins.rows[0].id;
  }
  await c.end();
  return id;
}

async function login(context, { email, password }) {
  const page = await context.newPage();
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await Promise.all([
    page.waitForURL(/\/home\//, { timeout: 30000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  await page.waitForLoadState('networkidle').catch(() => {});
  return page;
}

async function newContext(browser) {
  return browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    permissions: ['camera', 'microphone'],
  });
}

async function shotSearch(browser) {
  await refreshPresence(); // live tutors show "Online" + instant-connect
  const ctx = await newContext(browser);
  const page = await login(ctx, STUDENT);
  await page.goto(`${BASE}/home/student/explore`, { waitUntil: 'domcontentloaded' });
  // Wait until tutor cards + the student's enrolled-course sections have loaded
  // (so we get the "Calculus and Vectors (MCV4U)" section, not skeletons).
  await page.locator('text=grade verified').first().waitFor({ timeout: 25000 }).catch(() => {});
  await page.locator('text=Calculus and Vectors').first().waitFor({ timeout: 25000 }).catch(() => {});
  await sleep(800);
  const input = page.locator('input[placeholder^="Search by course code"]');
  await input.fill('MCV4U');
  await sleep(1500);
  await page.locator('text=grade verified').first().waitFor({ timeout: 15000 }).catch(() => {});
  await hideDevOverlay(page);
  await page.screenshot({ path: path.join(OUT, '01-course-search.png') });
  console.log('✓ 01-course-search.png');
  await ctx.close();
}

async function shotBooking(browser) {
  await refreshPresence();
  const tid = await liveTutorId();
  console.log('  live tutor:', tid);
  const ctx = await newContext(browser);
  const page = await login(ctx, STUDENT);
  // Deep link auto-opens the booking bubble (calendar + Book + Connect now).
  await page.goto(`${BASE}/home/student/explore?tutor=${tid}`, { waitUntil: 'domcontentloaded' });
  await sleep(4000); // tutors load → bubble opens → calendar fetch
  // Select the first upcoming date that has open slots (emerald dot) so the
  // "Available Slots" grid is populated rather than empty.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.querySelector('span.bg-emerald-400')
    );
    if (btn) btn.click();
  });
  await sleep(1200);
  await hideDevOverlay(page);
  await page.screenshot({ path: path.join(OUT, '02-booking-connect.png') });
  console.log('✓ 02-booking-connect.png');
  await ctx.close();
}

async function waitForVideos(page, n, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const count = await page.evaluate(() => document.querySelectorAll('video').length);
    if (count >= n) return count;
    await sleep(800);
  }
  return page.evaluate(() => document.querySelectorAll('video').length);
}

async function drawWhiteboard(page) {
  // Sketch a calculus problem on the Excalidraw canvas so the session looks
  // like real tutoring. Double-click creates a text element at that point.
  try {
    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ timeout: 8000 });
    const box = await canvas.boundingBox();
    if (!box) return;
    // Left-center of the board, clear of the top toolbar and right-side cams.
    const x = box.x + box.width * 0.22;
    let y = box.y + box.height * 0.26;
    const lines = [
      "Find f '(x):",
      'f(x) = x³ − 6x² + 9x',
      "f '(x) = 3x² − 12x + 9",
      '= 3(x − 1)(x − 3)',
      'crit: x = 1, x = 3',
    ];
    for (const line of lines) {
      await page.mouse.dblclick(x, y);
      await sleep(250);
      await page.keyboard.type(line, { delay: 14 });
      await page.keyboard.press('Escape');
      await sleep(180);
      y += 46;
    }
    await page.keyboard.press('Escape');
    // Deselect so the Excalidraw properties panel disappears (click empty board).
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.82);
    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) { console.log('  draw skipped:', e.message); }
}

async function shotSession(browser) {
  const sessionId = await ensureLiveSession();
  console.log('  session:', sessionId);

  // Tutor joins first.
  const tctx = await newContext(browser);
  const tpage = await login(tctx, TUTOR);
  await tpage.goto(`${BASE}/home/session/${sessionId}`, { waitUntil: 'commit', timeout: 90000 });
  console.log('  tutor videos:', await waitForVideos(tpage, 1));

  // Student joins.
  const sctx = await newContext(browser);
  const spage = await login(sctx, STUDENT);
  await spage.goto(`${BASE}/home/session/${sessionId}`, { waitUntil: 'commit', timeout: 90000 });
  // Wait until the student sees both cams (own + tutor).
  console.log('  student videos:', await waitForVideos(spage, 2));
  await sleep(2500);

  // Draw on the student's own board (what we screenshot — no sync dependency).
  await drawWhiteboard(spage);
  await sleep(1500);
  await hideDevOverlay(spage);

  await spage.screenshot({ path: path.join(OUT, '03-live-session.png') });
  console.log('✓ 03-live-session.png (student view)');

  await sctx.close();
  await tctx.close();
}

async function shotRecording(browser) {
  const COMPLETED_SESSION = '2b111e89-7368-49b1-83ba-7ab40c8ee5c3';
  const ctx = await newContext(browser);
  const page = await login(ctx, STUDENT);
  await page.goto(`${BASE}/home/session/${COMPLETED_SESSION}/recording`, { waitUntil: 'commit', timeout: 90000 });
  // Wait for the transcript to render.
  await page.locator('text=Transcript').first().waitFor({ timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await hideDevOverlay(page);
  await page.screenshot({ path: path.join(OUT, '04-recording-transcript.png') });
  console.log('✓ 04-recording-transcript.png');
  await ctx.close();
}

const SHOTS = { search: shotSearch, booking: shotBooking, session: shotSession, recording: shotRecording };

async function main() {
  const which = process.argv[2] || 'search';
  const browser = await chromium.launch({
    executablePath: EXEC,
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    if (which === 'all') {
      for (const fn of Object.values(SHOTS)) await fn(browser);
    } else if (SHOTS[which]) {
      await SHOTS[which](browser);
    } else {
      console.error('Unknown shot:', which);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
