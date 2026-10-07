// Builds the branded Supabase Auth email templates (Authentication → Emails in the
// Supabase dashboard). Run: node supabase/templates/build-auth-emails.mjs
// Writes one .html file per template plus preview.html (copy buttons + live preview).
// Same look as the emails ElderLoop sends itself (send-password-reset, create-user).
// Variables in {{ }} are filled in by Supabase (Go templates) — keep them exactly.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const LOGO = 'https://www.elderloop.xyz/icon-192.png'

const button = (label) => `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr>
            <td style="border-radius:10px;background:#0c90e1;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">${label}</a>
            </td>
          </tr></table>
          <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 4px;">Button not working? Copy this link into your browser:</p>
          <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0;word-break:break-all;">{{ .ConfirmationURL }}</p>`

const code = `
          <div style="margin:28px 0;padding:16px 0;background:#f1f5f9;border-radius:10px;text-align:center;">
            <span style="font-family:Consolas,Menlo,monospace;font-size:30px;letter-spacing:8px;font-weight:700;color:#0c2340;">{{ .Token }}</span>
          </div>`

const page = (title, body, footnote) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
        <tr><td style="padding:32px 28px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td><img src="${LOGO}" width="28" height="28" alt="ElderLoop" style="display:block;border-radius:8px;" /></td>
            <td style="padding-left:10px;"><span style="font-size:18px;font-weight:700;color:#0c2340;">ElderLoop</span></td>
          </tr></table>
          <h2 style="color:#1e3a5f;font-size:22px;margin:0 0 12px;">${title}</h2>
${body}
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:24px 0 0;">${footnote}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;margin:0;">ElderLoop &middot; Loopware Solutions LLC &middot; <a href="https://www.elderloop.xyz" style="color:#94a3b8;">elderloop.xyz</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`

const p = (text) => `          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">${text}</p>`

const templates = [
  {
    file: 'confirm-signup.html', name: 'Confirm sign up',
    subject: 'Confirm your ElderLoop account',
    html: page('Confirm your email',
      p('Welcome to ElderLoop! Confirm that <strong>{{ .Email }}</strong> is your email address to finish setting up your account.') + button('Confirm Email'),
      'If you didn’t create an ElderLoop account, you can ignore this email.'),
  },
  {
    file: 'invite-user.html', name: 'Invite user',
    subject: 'You’ve been invited to ElderLoop',
    html: page('You’re invited to ElderLoop',
      p('Your community has set up an ElderLoop account for you. ElderLoop brings your community’s work orders, dining, care team updates, and messages into one place.') +
      p('Click below to accept the invitation and choose your password.') + button('Accept Invitation'),
      'This invitation link can be used once. If you weren’t expecting it, you can ignore this email.'),
  },
  {
    file: 'magic-link.html', name: 'Magic link',
    subject: 'Your ElderLoop sign-in link',
    html: page('Sign in to ElderLoop',
      p('Click below to sign in. This link works once and expires soon.') + button('Sign In') +
      p('Or enter this code:') + code,
      'If you didn’t try to sign in, you can ignore this email — nobody can get in without this link or code.'),
  },
  {
    file: 'change-email.html', name: 'Change email address',
    subject: 'Confirm your new ElderLoop email address',
    html: page('Confirm your new email',
      p('Someone asked to change the email address on your ElderLoop account from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.') +
      p('Click below to confirm the change.') + button('Confirm New Email'),
      'If you didn’t ask for this, don’t click the link, and tell your community’s administrator.'),
  },
  {
    file: 'reset-password.html', name: 'Reset password',
    subject: 'Reset your ElderLoop password',
    html: page('Reset your password',
      p('We received a request to reset the password for your ElderLoop account. Click below to choose a new one.') + button('Reset Password'),
      'This link expires in 1 hour. If you didn’t request this, you can ignore this email — your password will stay the same.'),
  },
  {
    file: 'reauthentication.html', name: 'Reauthentication',
    subject: 'Your ElderLoop verification code',
    html: page('Confirm it’s you',
      p('Enter this code in ElderLoop to confirm a change to your account:') + code,
      'If you didn’t ask for this code, someone may know your password. Change it and tell your community’s administrator.'),
  },
]

for (const t of templates) writeFileSync(join(here, t.file), t.html)

// Preview page: what each email looks like, with copy buttons for the subject and HTML.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const sample = (s) => s
  .replaceAll('{{ .ConfirmationURL }}', 'https://www.elderloop.xyz/example-link')
  .replaceAll('{{ .Email }}', 'jane.smith@example.com')
  .replaceAll('{{ .NewEmail }}', 'jane.new@example.com')
  .replaceAll('{{ .Token }}', '123456')

const cards = templates.map((t, i) => `
  <section>
    <h2>${i + 1}. ${t.name}</h2>
    <div class="row"><span class="label">Subject</span><code id="s${i}">${esc(t.subject)}</code>
      <button onclick="copy('s${i}', this)">Copy subject</button></div>
    <div class="row"><span class="label">Body</span><span class="hint">${t.file}</span>
      <button onclick="copy('h${i}', this)">Copy HTML</button></div>
    <textarea id="h${i}" hidden>${esc(t.html)}</textarea>
    <iframe srcdoc="${esc(sample(t.html))}" title="${t.name} preview"></iframe>
  </section>`).join('\n')

writeFileSync(join(here, 'preview.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>ElderLoop sign-in emails</title>
<style>
  body{font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#0f172a}
  main{max-width:760px;margin:0 auto} h1{font-size:22px} p.lead{color:#475569}
  section{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin:18px 0}
  h2{font-size:17px;margin:0 0 10px} .row{display:flex;align-items:center;gap:10px;margin:6px 0;flex-wrap:wrap}
  .label{font-size:12px;font-weight:600;color:#64748b;width:56px} .hint{color:#94a3b8;font-size:13px}
  code{background:#f1f5f9;padding:3px 8px;border-radius:6px}
  button{margin-left:auto;border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:13px}
  button.done{background:#dcfce7;border-color:#86efac}
  iframe{width:100%;height:520px;border:1px solid #e2e8f0;border-radius:10px;margin-top:10px;background:#f8fafc}
</style></head>
<body><main>
  <h1>ElderLoop sign-in emails</h1>
  <p class="lead">Supabase dashboard &rarr; Authentication &rarr; Emails. For each template: paste the subject, switch the body to the HTML/source view, replace everything with the copied HTML, and save. Previews use sample names and links.</p>
${cards}
</main>
<script>
  function copy(id, btn) {
    const el = document.getElementById(id)
    const text = el.tagName === 'TEXTAREA' ? el.value : el.textContent
    navigator.clipboard.writeText(text).then(() => {
      const old = btn.textContent; btn.textContent = 'Copied'; btn.classList.add('done')
      setTimeout(() => { btn.textContent = old; btn.classList.remove('done') }, 1500)
    })
  }
</script>
</body></html>
`)

console.log(`Wrote ${templates.length} templates and preview.html`)
