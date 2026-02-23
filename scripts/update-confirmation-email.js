#!/usr/bin/env node
/**
 * Updates the Supabase confirmation email template to a more descriptive version.
 *
 * Requires in .env or environment:
 *   - SUPABASE_ACCESS_TOKEN: Get from https://supabase.com/dashboard/account/tokens (account-level, not project key)
 *   - SUPABASE_URL or SUPABASE_PROJECT_REF: Used to resolve project ref
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Load .env if present
const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].replace(/^["']|["']$/g, '').trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF || (() => {
  const url = process.env.SUPABASE_URL
  if (url) {
    const m = url.match(/https:\/\/([^.]+)\.supabase\.co/)
    if (m) return m[1]
  }
  return null
})()

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Get it from https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}
if (!projectRef) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_URL (with project ref in it)')
  process.exit(1)
}

const subject = 'Confirm your FlagOS account'
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your FlagOS account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to FlagOS</h1>
  <p>Thanks for signing up. FlagOS is your platform for designing flag football plays, building playbooks, managing your roster, and simulating plays.</p>
  <p>To get started, confirm your email address by clicking the button below:</p>
  <p style="margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Confirm my email</a>
  </p>
  <p style="font-size: 14px; color: #64748b;">If the button doesn’t work, copy and paste this link into your browser:</p>
  <p style="font-size: 13px; word-break: break-all; color: #64748b;">{{ .ConfirmationURL }}</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="font-size: 13px; color: #94a3b8;">If you didn’t create a FlagOS account, you can safely ignore this email.</p>
</body>
</html>`

const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`
const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mailer_subjects_confirmation: subject,
    mailer_templates_confirmation_content: html,
  }),
})

if (!res.ok) {
  const text = await res.text()
  console.error('Update failed:', res.status, res.statusText, text)
  process.exit(1)
}

console.log('Confirmation email template updated successfully.')