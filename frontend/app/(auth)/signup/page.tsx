"use client";

import { FormEvent, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toastManager } from '@/components/toast-notification'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)


  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const trimmedEmail = email.trim()

    try {
      const res = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      const payload = await res.json().catch(() => ({}))
      setLoading(false)

      if (!res.ok) {
        toastManager.notify({ title: 'Signup failed', message: payload.error || 'Could not create account', type: 'error' })
        return
      }

      toastManager.notify({ title: 'Verify your email', message: 'We sent a 6-digit code to your inbox.', type: 'success' })
      router.replace(`/verify?email=${encodeURIComponent(trimmedEmail)}&redirect=${encodeURIComponent(redirectTo)}`)
    } catch (err) {
      console.error('[signup] unexpected error', err)
      setLoading(false)
      toastManager.notify({ title: 'Signup failed', message: 'Could not reach the server', type: 'error' })
    }
  }

  return (
    <Card className="w-full max-w-md p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Create your Hive account</h1>
        <p className="text-sm text-muted-foreground">Use the credentials you want to sign in with</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        Already have an account?{' '}
        <button
          type="button"
          className="text-primary underline"
          onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)}
        >
          Sign in
        </button>
      </p>
    </Card>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Suspense fallback={
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </Card>
      }>
        <SignupContent />
      </Suspense>
    </div>
  )
}
