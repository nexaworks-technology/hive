"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toastManager } from '@/components/toast-notification';

const STORAGE_KEY = 'hive-google-oauth';
const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

type Tokens = {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
};

type Slot = {
  isoStart: string;
  isoEnd: string;
  label: string;
};

const loadTokens = (): Tokens | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
};

const saveTokens = (tokens: Tokens) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

export function GoogleCalendarConnect() {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    setTokens(loadTokens());
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as any;
      if (data?.type === 'hive-google-tokens' && data?.tokens) {
        setTokens(data.tokens as Tokens);
        saveTokens(data.tokens as Tokens);
        toastManager.notify({ title: 'Google connected', message: 'Calendar access saved', type: 'success' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const connected = useMemo(() => Boolean(tokens?.access_token || tokens?.refresh_token), [tokens]);

  const connect = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/google/auth-url`);
      const payload = await res.json();
      if (!payload?.url) throw new Error('Missing auth URL');
      window.open(payload.url, 'hive-google-consent', 'width=480,height=640');
    } catch (err) {
      toastManager.notify({ title: 'Connect failed', message: err instanceof Error ? err.message : 'Could not open Google consent', type: 'error' });
    }
  };

  const fetchSlots = async () => {
    if (!connected || !tokens) {
      toastManager.notify({ title: 'Connect Google first', message: 'Authorize Google Calendar to fetch slots.', type: 'info' });
      return;
    }
    setLoadingSlots(true);
    try {
      const res = await fetch(`${apiBaseUrl}/google/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          maxSlots: 4,
          days: 5,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to fetch availability');
      if (payload?.tokens) {
        setTokens(payload.tokens);
        saveTokens(payload.tokens);
      }
      setSlots(payload.slots || []);
    } catch (err) {
      toastManager.notify({ title: 'Availability error', message: err instanceof Error ? err.message : 'Could not load slots', type: 'error' });
    } finally {
      setLoadingSlots(false);
    }
  };

  const bookSlot = async (slot: Slot) => {
    if (!tokens) return;
    setBookingId(slot.isoStart);
    try {
      const res = await fetch(`${apiBaseUrl}/google/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          startIso: slot.isoStart,
          endIso: slot.isoEnd,
          summary: 'Hive meeting',
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Booking failed');
      toastManager.notify({ title: 'Booked', message: payload?.meetLink || 'Event created', type: 'success' });
    } catch (err) {
      toastManager.notify({ title: 'Booking error', message: err instanceof Error ? err.message : 'Could not book slot', type: 'error' });
    } finally {
      setBookingId(null);
    }
  };

  return (
    <Card className="p-4 border-border bg-secondary/50 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Google Calendar</p>
          <p className="text-xs text-muted-foreground">Mon–Sat, 1–8pm IST slots from your calendar</p>
        </div>
        <Button size="sm" variant={connected ? 'outline' : 'default'} onClick={connect}>
          {connected ? 'Reconnect Google' : 'Connect Google'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={fetchSlots} disabled={!connected || loadingSlots} className="gap-2">
          {loadingSlots ? 'Loading slots...' : 'Fetch availability'}
        </Button>
      </div>

      {slots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {slots.map((slot) => (
            <Card key={slot.isoStart} className="p-3 border-border bg-card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                <p className="text-xs text-muted-foreground">Meet link will auto-generate</p>
              </div>
              <Button size="sm" onClick={() => bookSlot(slot)} disabled={bookingId === slot.isoStart}>
                {bookingId === slot.isoStart ? 'Booking...' : 'Book'}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No slots loaded yet.</p>
      )}
    </Card>
  );
}
