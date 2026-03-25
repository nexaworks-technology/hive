"use client";

import { SessionProvider } from '@/components/auth-provider'
import { ToastContainer } from '@/components/toast-notification'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ToastContainer />
    </SessionProvider>
  )
}
