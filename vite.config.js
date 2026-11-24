import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// App version shown in Help & Feedback and saved with each message: the build date
// (Central time) plus the commit, e.g. "2026.11.24 (f42a0cd)". Vercel provides the
// commit; a local build reads it from git. The dev server adds "dev".
function appVersion(command) {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA || ''
  if (!sha) {
    try { sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { sha = '' }
  }
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).replaceAll('-', '.')
  const parts = [date, sha ? `(${sha.slice(0, 7)})` : null, command === 'serve' ? 'dev' : null]
  return parts.filter(Boolean).join(' ')
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion(command)),
  },
}))
