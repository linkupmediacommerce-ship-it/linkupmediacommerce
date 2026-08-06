type BadgeVariant = 'confirmed' | 'cancelled' | 'admin'

const STYLES: Record<BadgeVariant, string> = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
  admin: 'bg-amber-100 text-amber-700'
}

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STYLES[variant]}`}>
      {children}
    </span>
  )
}
