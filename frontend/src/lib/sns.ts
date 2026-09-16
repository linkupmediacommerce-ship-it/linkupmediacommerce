// Mirrors src/utils/sns.ts on the backend: SNS accounts without a real email get a
// synthetic placeholder (kakao_<id>@no-email.all4run.local) stored in the DB so the
// NOT NULL email column stays satisfied. Anywhere we display an email to a human,
// detect the placeholder and show "-" instead.
const PLACEHOLDER_EMAIL_DOMAIN = 'no-email.all4run.local'

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
}

export function displayEmail(email: string | null | undefined): string {
  return email && !isPlaceholderEmail(email) ? email : '-'
}
