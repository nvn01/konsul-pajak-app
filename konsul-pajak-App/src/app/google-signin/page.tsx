'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

export default function GoogleSignInPopup() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/chat'
  const signInStarted = useRef(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session && !signInStarted.current) {
      signInStarted.current = true
      void signIn('google', {
        callbackUrl,
        prompt: 'select_account',
      })
    }

    if (session) {
      const opener = window.opener as (Window & typeof globalThis) | null
      if (opener && typeof opener.postMessage === 'function') {
        opener.postMessage(
          { type: 'NEXTAUTH_SIGNIN_SUCCESS', callbackUrl },
          window.location.origin
        )
      }
      window.close()
    }
  }, [session, status, callbackUrl])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white text-sm text-muted-foreground">
      Menghubungkan ke Google...
    </div>
  )
}

