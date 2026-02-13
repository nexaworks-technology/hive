"use client";

import { SessionProvider } from '@/components/auth-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
