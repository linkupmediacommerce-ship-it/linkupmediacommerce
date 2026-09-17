// Normalizes any phone number input (with/without dashes, spaces, country code)
// into a single consistent display format: 000-0000-0000.
//
// Reservation contact numbers can arrive in all kinds of shapes depending on how
// the account was created (manual entry, SNS profile, legacy data, +82 country
// code, etc.), so we strip everything down to digits and re-insert dashes based
// on length rather than trusting whatever separators were originally typed.
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'

  let digits = phone.replace(/\D/g, '')
  if (!digits) return '-'

  // Normalize a leading country code (+82 10-... -> 010-...).
  if (digits.startsWith('82') && digits.length > 10) {
    digits = `0${digits.slice(2)}`
  }

  // Standard 11-digit mobile number (010/011 etc.): 3-4-4.
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }
  // 10 digits: Seoul landline (02 + 4 + 4) vs. older mobile/other area codes (3 + 3 + 4).
  if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3')
    }
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  }
  // 9 digits: Seoul landline without area-code padding (02 + 3 + 4).
  if (digits.length === 9 && digits.startsWith('02')) {
    return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3')
  }

  // Anything else (too short/long/garbled) - can't confidently guess the split,
  // so surface the digits as-is rather than showing a misleading format.
  return digits
}
