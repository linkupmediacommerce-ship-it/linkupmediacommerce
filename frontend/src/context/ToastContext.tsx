import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'info' | 'success' | 'error'
type ToastItem = { id: number; message: string; type: ToastType }

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let idCounter = 0

const COLORS: Record<ToastType, string> = {
  info: 'bg-neutral-900',
  success: 'bg-green-600',
  error: 'bg-red-600'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idCounter
    setItems((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 items-end">
        {items.map((t) => (
          <div
            key={t.id}
            className={`fade-in text-white text-sm px-4 py-3 rounded-lg shadow-lg ${COLORS[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
