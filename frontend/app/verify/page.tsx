"use client";

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toastManager } from '@/components/toast-notification'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const redirectTo = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const qEmail = searchParams.get('email')
    const qCode = searchParams.get('code')
    if (qEmail) setEmail(qEmail)
    if (qCode) setCode(qCode)
  }, [searchParams])

  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      setLoading(false)

      if (!res.ok) {
        toastManager.notify({ title: 'Verification failed', message: payload.error || 'Invalid or expired code', type: 'error' })
        return
      }

      toastManager.notify({ title: 'Email verified', message: 'You can sign in now.', type: 'success' })
      router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}&notice=verified&email=${encodeURIComponent(email)}`)
    } catch (err) {
      console.error('[verify] unexpected error', err)
      setLoading(false)
      toastManager.notify({ title: 'Verification failed', message: 'Could not reach the server', type: 'error' })
    }
  }

  const onResend = async () => {
    if (!email.trim()) {
      toastManager.notify({ title: 'Add your email', message: 'Enter your signup email before resending.', type: 'error' })
      return
    }
    setResending(true)
    try {
      const res = await fetch(`${apiBaseUrl}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      setResending(false)

      if (!res.ok) {
        toastManager.notify({ title: 'Resend failed', message: payload.error || 'Could not resend code', type: 'error' })
        return
      }

      toastManager.notify({ title: 'Code sent', message: 'Check your inbox for a new code.', type: 'success' })
    } catch (err) {
      console.error('[verify][resend] unexpected error', err)
      setResending(false)
      toastManager.notify({ title: 'Resend failed', message: 'Could not reach the server', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Verify your email</h1>
          <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent to your inbox</p>
        </div>
        <form className="space-y-4" onSubmit={onVerify}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="123456"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify and continue'}
          </Button>
        </form>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Didn’t get the code?</span>
          <Button variant="ghost" size="sm" onClick={onResend} disabled={resending}>
            {resending ? 'Sending…' : 'Resend code'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
