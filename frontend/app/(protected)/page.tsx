'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth-provider';

function RedirectToInbound() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/inbound');
  }, [router]);
  return null;
}

export default function RootPage() {
  return (
    <RequireAuth>
      <RedirectToInbound />
    </RequireAuth>
  );
}
