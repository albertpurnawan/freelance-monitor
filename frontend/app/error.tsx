"use client"
import { useEffect } from 'react'
import { logFrontendError } from '@/lib/api'

export default function RootError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    logFrontendError(error.message, error.stack, { digest: error.digest || '' })
  }, [error])

  return (
    <div className="p-4">
      <h2 className="text-red-600 font-semibold">Something went wrong</h2>
      <pre className="text-sm whitespace-pre-wrap">{String(error?.message || 'Unknown error')}</pre>
      <button className="mt-2 border px-2 py-1" onClick={() => reset()}>Try again</button>
    </div>
  )
}

