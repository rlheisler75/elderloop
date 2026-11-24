// Build version, set in vite.config.js: build date (Central time) + commit,
// e.g. "2026.11.24 (f42a0cd)". Shown in Help & Feedback and saved with each
// message (platform_feedback.app_version) so Super Admin knows which build it came from.
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'
