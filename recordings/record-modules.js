// Records a short video of every ElderLoop module.
//
//   node recordings/record-modules.js            # all modules
//   node recordings/record-modules.js chapel it  # only these (by name)
//
// Env:
//   ELDERLOOP_BASE_URL       default http://localhost:5173 (anything else needs ELDERLOOP_ALLOW_REMOTE=1)
//   ELDERLOOP_TEST_EMAIL     staff login; with ELDERLOOP_TEST_PASSWORD it is typed into the login form.
//   ELDERLOOP_TEST_PASSWORD  Without both, the public demo Org Admin is used via the app's one-click demo login.
//   ELDERLOOP_PAUSE_MS       how long each page stays on screen (default 4000)
//   FFMPEG_PATH              ffmpeg binary for the .mp4 step (default: ffmpeg on PATH)

import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR  = dirname(fileURLToPath(import.meta.url))
const BASE_URL = (process.env.ELDERLOOP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const PAUSE_MS = Number(process.env.ELDERLOOP_PAUSE_MS || 4000)
const VIEWPORT = { width: 1440, height: 900 }

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE_URL) && process.env.ELDERLOOP_ALLOW_REMOTE !== '1') {
  console.error(`Refusing to record against ${BASE_URL}. Set ELDERLOOP_ALLOW_REMOTE=1 to allow it.`)
  process.exit(1)
}

// Accounts. Demo accounts log in through /login?email=…&demo=1, which the app
// already offers publicly, so no password lives in this file.
const ACCOUNTS = {
  staff: process.env.ELDERLOOP_TEST_EMAIL && process.env.ELDERLOOP_TEST_PASSWORD
    ? { email: process.env.ELDERLOOP_TEST_EMAIL, password: process.env.ELDERLOOP_TEST_PASSWORD }
    : { email: 'demo.admin@elderloop.xyz', demo: true },
  family:   { email: 'demo.family@elderloop.xyz',   demo: true },
  resident: { email: 'demo.resident@elderloop.xyz', demo: true },
}

// Sidebar order (ALL_NAV in src/components/layout/Layout.jsx), then the extras.
const MODULES = [
  { name: 'dashboard',               path: '/app/dashboard' },
  { name: 'communication',           path: '/app/communication' },
  { name: 'residents',               path: '/app/directory' },
  { name: 'nursing-notes',           path: '/app/nursing' },
  { name: 'social-services',         path: '/app/social' },
  { name: 'family-messaging',        path: '/app/family' },
  { name: 'incident-reports',        path: '/app/incidents' },
  { name: 'surveys',                 path: '/app/surveys' },
  { name: 'activities',              path: '/app/activities' },
  { name: 'chapel',                  path: '/app/chapel' },
  { name: 'marketing',               path: '/app/marketing' },
  { name: 'maintenance',             path: '/app/maintenance' },
  { name: 'housekeeping',            path: '/app/housekeeping' },
  { name: 'property-mgmt',           path: '/app/property-management' },
  { name: 'meter-readings',          path: '/app/meters' },
  { name: 'central-supply',          path: '/app/central-supply' },
  { name: 'transportation',          path: '/app/transportation' },
  { name: 'security',                path: '/app/security' },
  { name: 'dietary',                 path: '/app/dietary' },
  { name: 'budgets',                 path: '/app/budgets' },
  { name: 'staff',                   path: '/app/staff' },
  { name: 'staff-directory',         path: '/app/directory-staff' },
  { name: 'scheduling',              path: '/app/scheduling' },
  { name: 'time-clock',              path: '/app/timeclock' },
  { name: 'it-technology',           path: '/app/it' },
  { name: 'administrator-dashboard', path: '/app/ceo' },
  { name: 'admin-panel',             path: '/app/admin' },
  { name: 'settings',                path: '/app/settings' },
  { name: 'family-portal',           path: '/family-portal', account: 'family' },
  { name: 'resident-portal',         path: '/resident',      account: 'resident' },
]

async function login(browser, account) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  if (account.demo) {
    await page.goto(`${BASE_URL}/login?email=${encodeURIComponent(account.email)}&demo=1`)
  } else {
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', account.email)
    await page.fill('input[type="password"]', account.password)
    await page.click('button[type="submit"]')
  }
  try {
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  } catch {
    const msg = await page.locator('.text-red-600, .text-red-500, [role="alert"]').first().textContent().catch(() => null)
    await context.close()
    throw new Error(`login failed for ${account.email}${msg ? `: ${msg.trim()}` : ''}`)
  }
  const state = await context.storageState()
  await context.close()
  return state
}

async function waitForPage(page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  // Route-level and data spinners
  await page.waitForFunction(() => !document.querySelector('.animate-spin'), null, { timeout: 15_000 }).catch(() => {})
}

async function record(browser, mod, storageState) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState,
    recordVideo: { dir: join(OUT_DIR, '.tmp'), size: VIEWPORT },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', err => errors.push(err.message))

  let failure = null
  try {
    await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await waitForPage(page)
    const landed = new URL(page.url()).pathname
    if (landed !== mod.path) failure = `redirected to ${landed} (module off or no access for this account)`
    else if (errors.length) failure = `page error: ${errors[0]}`
    await page.waitForTimeout(PAUSE_MS)
  } catch (err) {
    failure = err.message.split('\n')[0]
  }

  const video = page.video()
  await context.close()
  const file = join(OUT_DIR, `${mod.name}.webm`)
  await video.saveAs(file)
  await video.delete()
  return { file, failure }
}

function findFfmpeg() {
  const bin = process.env.FFMPEG_PATH || 'ffmpeg'
  const r = spawnSync(bin, ['-version'], { stdio: 'ignore' })
  return r.status === 0 ? bin : null
}

async function main() {
  const only = process.argv.slice(2)
  const modules = only.length ? MODULES.filter(m => only.includes(m.name)) : MODULES
  mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const sessions = {}
  const results = []

  for (const mod of modules) {
    const key = mod.account || 'staff'
    try {
      sessions[key] ??= await login(browser, ACCOUNTS[key])
    } catch (err) {
      results.push({ ...mod, failure: err.message })
      console.log(`✗ ${mod.name}: ${err.message}`)
      continue
    }
    const res = await record(browser, mod, sessions[key])
    results.push({ ...mod, ...res })
    console.log(`${res.failure ? '✗' : '✓'} ${mod.name} (${mod.path})${res.failure ? `: ${res.failure}` : ''}`)
  }
  await browser.close()

  const ffmpeg = findFfmpeg()
  if (!ffmpeg) {
    console.log('\nffmpeg not found; skipping .mp4 conversion.')
  } else {
    console.log('\nConverting to .mp4…')
    for (const r of results.filter(r => r.file && existsSync(r.file))) {
      const mp4 = r.file.replace(/\.webm$/, '.mp4')
      const c = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', r.file, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
      console.log(`${c.status === 0 ? '✓' : '✗'} ${mp4}`)
    }
  }

  const failed = results.filter(r => r.failure)
  console.log(`\n${results.length - failed.length}/${results.length} recorded cleanly → ${OUT_DIR}`)
  for (const f of failed) console.log(`  FAILED ${f.name}: ${f.failure}`)
  process.exitCode = failed.length ? 1 : 0
}

main()
