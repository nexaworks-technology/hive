"use client";

import { FormEvent, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toastManager } from '@/components/toast-notification'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const notice = searchParams.get('notice')
  const noticeEmail = searchParams.get('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toastManager.notify({ title: 'Login failed', message: error.message, type: 'error' })
      return
    }
    toastManager.notify({ title: 'Welcome back', message: 'Signed in successfully', type: 'success' })
    router.replace(redirectTo)
  }

  return (
    <Card className="w-full max-w-md p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Sign in to Hive</h1>
        <p className="text-sm text-muted-foreground">Use your Supabase credentials</p>
      </div>
      {notice === 'confirm' && (
        <div className="rounded-md border border-border bg-secondary/60 p-3 text-sm text-foreground">
          We emailed a confirmation link{noticeEmail ? ` to ${noticeEmail}` : ''}. Click it to activate your account, then sign in here.
        </div>
      )}
      {notice === 'verified' && (
        <div className="rounded-md border border-border bg-secondary/60 p-3 text-sm text-foreground">
          Email verified{noticeEmail ? ` for ${noticeEmail}` : ''}. You can sign in now.
        </div>
      )}
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
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        No account?{' '}
        <button
          type="button"
          className="text-primary underline"
          onClick={() => router.push(`/signup?redirect=${encodeURIComponent(redirectTo)}`)}
        >
          Create one
        </button>
      </p>
    </Card>
  )
}

export default function LoginPage() {
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
        <LoginContent />
      </Suspense>
    </div>
  )
}
