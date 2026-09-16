// Helpers for SNS accounts that must satisfy the existing NOT NULL email/password_hash
// columns (see migrations/0006_sns_login.sql for why we didn't make them nullable).
//
// - buildPlaceholderEmail(): a synthetic, clearly-fake email stored for SNS users who
//   didn't grant (or don't have) a real email. Recognizable by isPlaceholderEmail() so
//   the UI can show "-" instead of the fake address.
// - generateOpaquePassword() + hashPassword(): a random password that's hashed and
//   stored to satisfy NOT NULL, then thrown away — nobody (including the account owner)
//   ever knows it, so password-based login can never succeed for this account, which
//   is exactly what we want for an SNS-only account.

const PLACEHOLDER_EMAIL_DOMAIN = 'no-email.all4run.local'

export function buildPlaceholderEmail(provider: string, providerUserId: string): string {
  return `${provider}_${providerUserId}@${PLACEHOLDER_EMAIL_DOMAIN}`
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
}

export function generateOpaquePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
