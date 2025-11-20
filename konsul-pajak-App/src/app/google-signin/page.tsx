'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

export default function GoogleSignInPopup() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/chat'
  const signInStarted = useRef(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session && !signInStarted.current) {
      signInStarted.current = true
      const popupReturnUrl = window.location.href
      void signIn('google', {
        callbackUrl: popupReturnUrl,
        prompt: 'select_account',
      })
    }

    if (session) {
      const opener = window.opener as (Window & typeof globalThis) | null
      if (opener && typeof opener.postMessage === 'function') {
        opener.postMessage(
          { type: 'NEXTAUTH_SIGNIN_SUCCESS', callbackUrl: redirectTo },
          window.location.origin
        )
      }
      window.close()
      setTimeout(() => {
        if (!window.closed) {
          window.location.href = redirectTo
        }
      }, 300)
    }
  }, [session, status, redirectTo])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white text-sm text-muted-foreground">
      Menghubungkan ke Google...
    </div>
  )
}

