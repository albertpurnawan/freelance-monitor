"use client"

import { useEffect, useState } from 'react'
import * as Toast from '@radix-ui/react-toast'

type ToastMsg = { id: number; message: string; duration: number; open: boolean }

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ message: string; duration?: number }>
      const message = ce.detail?.message || ''
      const dur = ce.detail?.duration ?? 3000
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, message, duration: dur, open: true }])
      setTimeout(() => {
        setToasts((prev) => prev.map(t => t.id === id ? { ...t, open: false } : t))
      }, dur)
    }
    window.addEventListener('app:toast', handler as any)
    return () => window.removeEventListener('app:toast', handler as any)
  }, [])

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map(t => (
        <Toast.Root
          key={t.id}
          open={t.open}
          onOpenChange={(open) => {
            if (!open) setToasts(prev => prev.filter(x => x.id !== t.id))
          }}
          className="bg-popover text-popover-foreground border shadow-md rounded-md px-4 py-3 text-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out"
        >
          <Toast.Title className="font-medium">{t.message}</Toast.Title>
          <Toast.Close className="absolute top-1 right-2 text-xs underline">Dismiss</Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[100vw] outline-none" />
    </Toast.Provider>
  )
}
